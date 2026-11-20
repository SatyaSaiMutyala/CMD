// eDOS: the message it sends us when a request is sent for approval, and the
// routes the apps call. Real server, real socket, in-memory MongoDB, and a
// stand-in for eDOS.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.HOOK_KEY_EDOS = 'edos-hook-key';

const http = require('node:http');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { io } = require('socket.io-client');
const { start, stop } = require('../src/server');
const env = require('../src/config/env');
const User = require('../src/models/User');

let mongo;
let base;
let token;
const sockets = [];

const call = async (method, path, { body, headers } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
};
const authed = () => ({ authorization: `Bearer ${token}` });
const hook = (body, key = 'edos-hook-key') =>
  call('POST', '/api/hooks/edos/changed', { body, headers: { 'x-api-key': key } });
const connect = () =>
  new Promise((resolve) => {
    const sock = io(`${base}/hub`, { path: '/socket.io', transports: ['websocket'] });
    sockets.push(sock);
    const events = [];
    sock.onAny((name, payload) => events.push({ name, payload }));
    sock.on('connect', () => {
      sock.emit('hub:subscribe', { token });
      setTimeout(() => resolve({ sock, events }), 300);
    });
  });
const settle = () => new Promise((r) => setTimeout(r, 300));

// A stand-in for eDOS's /api/cmdhub/*: answers in its formats and records
// what it was sent.
const CARD = {
  id: 41, stage: 1, code: 'PR781', name: 'Culture and Sensitivity (Aerobic)', action: 'create',
  note: 'Addition of sample type Pus Swab.', by: 'Asha', at: '2026-11-20T10:00:00+05:30',
  mrp_text: '₹1,100', change_count: 3, variants: 0, attachments: 1, missing_test: false,
};
const fake = { calls: [], server: null };
const startFake = () =>
  new Promise((resolve) => {
    fake.server = http.createServer((req, res) => {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        const body = raw ? JSON.parse(raw) : null;
        fake.calls.push({ method: req.method, url: req.url, key: req.headers['x-api-key'], body });
        const send = (status, json) => {
          res.writeHead(status, { 'content-type': 'application/json' });
          res.end(JSON.stringify(json));
        };
        if (req.headers['x-api-key'] !== 'edos-api-key') return send(401, { ok: false, error: 'Invalid API key.' });
        if (req.url === '/api/cmdhub/pending') {
          return send(200, {
            ok: true,
            pending: { req: 1, total: 1 },
            stages: [{ key: 'req', stage: 1, name: 'Test Approval', count: 1, items: [CARD] }],
          });
        }
        if (req.url === '/api/cmdhub/requests/41') {
          return send(200, { ok: true, request: { ...CARD, changes: [{ field: 'MRP', from: '', to: '₹1,100' }], documents: [] } });
        }
        if (req.url === '/api/cmdhub/requests/41/file/a-7') {
          res.writeHead(200, { 'content-type': 'application/pdf', 'content-disposition': 'inline; filename="method.pdf"' });
          return res.end('%PDF-1.4 the file');
        }
        if (req.url === '/api/cmdhub/requests/41/approve' || req.url === '/api/cmdhub/requests/41/reject') {
          const approve = req.url.endsWith('/approve');
          return send(200, {
            ok: true, ref: 'PR781', party: CARD.name, amount_text: '₹1,100',
            from: { key: 'req', name: 'Test Approval' }, to: { key: '', name: approve ? 'Approved' : 'Rejected' },
            message: approve ? 'Approved. The test is live in the catalogue.' : 'Rejected.',
            pending: { req: 0, total: 0 },
          });
        }
        if (req.url === '/api/cmdhub/requests/42/approve') {
          return send(409, { ok: false, error: 'BC900 was already rejected.', code: 'moved' });
        }
        return send(404, { ok: false, error: 'That request no longer exists.' });
      });
    });
    fake.server.listen(0, '127.0.0.1', resolve);
  });

before(async () => {
  mongo = await MongoMemoryServer.create();
  const server = await start({ port: 0, mongoUri: mongo.getUri(), reminder: false });
  base = `http://localhost:${server.address().port}`;
  await User.create({ name: 'Test CMD', email: 'cmd@example.com', password_hash: await bcrypt.hash('correct-horse', 4) });
  token = (await call('POST', '/api/auth/login', { body: { email: 'cmd@example.com', password: 'correct-horse' } })).json.token;
  await startFake();
});

after(async () => {
  sockets.forEach((s) => s.close());
  fake.server.close();
  await stop();
  await mongo.stop();
});

test('until eDOS is set up here, its routes say so instead of failing', async () => {
  env.edos.url = '';
  env.edos.key = '';
  const res = await call('GET', '/api/software/edos/pending', { headers: authed() });
  assert.equal(res.status, 503);
  assert.match(res.json.message, /eDOS is not connected/);
  assert.equal((await call('GET', '/api/software/edos/pending')).status, 401);
});

test('the queue and one request are forwarded with the server\'s key', async () => {
  env.edos.url = `http://127.0.0.1:${fake.server.address().port}/`;
  env.edos.key = 'edos-api-key';

  const list = await call('GET', '/api/software/edos/pending', { headers: authed() });
  assert.equal(list.status, 200);
  assert.deepEqual(list.json.pending, { req: 1, total: 1 });
  assert.equal(list.json.stages[0].items[0].code, 'PR781');
  assert.equal(fake.calls.at(-1).key, 'edos-api-key');
  assert.equal(fake.calls.at(-1).url, '/api/cmdhub/pending');

  const one = await call('GET', '/api/software/edos/items/41', { headers: authed() });
  assert.equal(one.json.request.changes[0].field, 'MRP');
});

test('approve and reject go through under the CMD\'s name and land in the history', async () => {
  const ok = await call('POST', '/api/software/edos/items/41/approve', { headers: authed(), body: { stage: 1 } });
  assert.equal(ok.status, 200);
  assert.deepEqual(fake.calls.at(-1), {
    method: 'POST', url: '/api/cmdhub/requests/41/approve', key: 'edos-api-key',
    body: { stage: 1, by: 'Test CMD' },
  });

  const no = await call('POST', '/api/software/edos/items/41/reject', {
    headers: authed(), body: { stage: 1, reason: 'Wrong sample type.' },
  });
  assert.equal(no.status, 200);
  assert.equal(fake.calls.at(-1).body.reason, 'Wrong sample type.');

  const { items } = (await call('GET', '/api/decisions', { headers: authed() })).json;
  const mine = items.filter((d) => d.software === 'edos').map((d) => [d.ref, d.verb, d.party, d.amount, d.reason]);
  assert.deepEqual(mine.sort(), [
    ['PR781', 'Approved', 'Culture and Sensitivity (Aerobic)', '₹1,100', ''],
    ['PR781', 'Rejected', 'Culture and Sensitivity (Aerobic)', '₹1,100', 'Wrong sample type.'],
  ]);
});

test('eDOS has no send back and no approve all, and a refusal keeps its words', async () => {
  const back = await call('POST', '/api/software/edos/items/41/sendback', { headers: authed(), body: { stage: 1 } });
  assert.equal(back.status, 400);
  assert.match(back.json.message, /approve, reject/);

  const all = await call('POST', '/api/software/edos/stages/1/approve-all', { headers: authed(), body: {} });
  assert.equal(all.status, 400);
  assert.match(all.json.message, /one item at a time/);

  const moved = await call('POST', '/api/software/edos/items/42/approve', { headers: authed(), body: { stage: 1 } });
  assert.equal(moved.status, 409);
  assert.equal(moved.json.message, 'BC900 was already rejected.');
  assert.equal(moved.json.code, 'moved');
});

test('an attached file opens through a short-lived link', async () => {
  const link = await call('POST', '/api/software/edos/items/41/files/a-7/link', { headers: authed(), body: {} });
  assert.equal(link.status, 200);
  const res = await fetch(link.json.url.replace(/^https?:\/\/[^/]+/, base));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/pdf');
  assert.equal(await res.text(), '%PDF-1.4 the file');
  assert.equal(fake.calls.at(-1).url, '/api/cmdhub/requests/41/file/a-7');
});

test('a request sent for approval reaches an open app at once; a decision only refreshes it', async () => {
  const { events } = await connect();
  assert.equal((await hook({}, 'wrong')).status, 401);

  const arrived = await hook({
    software: 'edos',
    pending: { req: 2, total: 2 },
    changes: [{ ref: 'PR781', party: 'Culture and Sensitivity (Aerobic)', amount_text: '₹1,100', from: null, to: 'req' }],
  });
  assert.equal(arrived.status, 200);
  assert.equal(arrived.json.notified.arrivals, 1);
  await settle();

  const arrival = events.find((e) => e.name === 'hub:arrival');
  assert.ok(arrival, 'the app is told a new approval arrived');
  assert.equal(arrival.payload.software, 'edos');
  assert.equal(arrival.payload.title, 'New approval · ₹1,100');
  assert.equal(arrival.payload.body, 'Culture and Sensitivity (Aerobic) · eDOS · Test Approval');
  assert.ok(events.some((e) => e.name === 'hub:changed' && e.payload.software === 'edos'));

  // Somebody decided it: lists refresh, nobody is rung
  events.length = 0;
  const left = await hook({ pending: { req: 1, total: 1 }, changes: [{ ref: 'PR781', from: 'req', to: null }] });
  assert.equal(left.json.notified.arrivals, 0);
  await settle();
  assert.ok(events.some((e) => e.name === 'hub:changed'));
  assert.equal(events.some((e) => e.name === 'hub:arrival'), false);

  const { bySoftware } = (await call('GET', '/api/pending', { headers: authed() })).json;
  assert.equal(bySoftware.find((s) => s.software === 'edos').pending, 1);
});

test('one shared pair of keys serves every project; a project\'s own key wins where set', async () => {
  const { hookKey } = require('../src/config/sources');
  const fresh = () => {
    delete require.cache[require.resolve('../src/config/env')];
    return require('../src/config/env');
  };
  const kept = { ...process.env };
  try {
    // Only the shared pair set
    // Emptied, not removed: reloading the settings re-reads this computer's
    // .env, which must not put its own values back
    process.env.HOOK_KEY_EDOS = '';
    process.env.HOOK_KEY_LEDGERTRACE = '';
    process.env.EDOS_API_KEY = '';
    process.env.LEDGERTRACE_API_KEY = '';
    process.env.HUB_API_KEY = 'shared-api';
    process.env.HUB_WEBHOOK_KEY = 'shared-hook';
    assert.equal(fresh().edos.key, 'shared-api');
    assert.equal(fresh().ledgertrace.key, 'shared-api');
    assert.equal(hookKey('edos'), 'shared-hook');
    assert.equal(hookKey('ledgertrace'), 'shared-hook');
    assert.equal((await hook({ changes: [] }, 'shared-hook')).status, 200);
    assert.equal((await hook({ changes: [] }, 'edos-hook-key')).status, 401);

    // One project given keys of its own
    process.env.EDOS_API_KEY = 'edos-own-api';
    process.env.HOOK_KEY_EDOS = 'edos-own-hook';
    assert.equal(fresh().edos.key, 'edos-own-api');
    assert.equal(fresh().ledgertrace.key, 'shared-api');
    assert.equal(hookKey('edos'), 'edos-own-hook');
    assert.equal(hookKey('ledgertrace'), 'shared-hook');
    assert.equal((await hook({ changes: [] }, 'shared-hook')).status, 401);
  } finally {
    Object.keys(process.env).forEach((k) => { if (!(k in kept)) delete process.env[k]; });
    Object.assign(process.env, kept);
    fresh();
  }
});
