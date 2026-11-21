// AIMS: the message it sends us when something enters the CMD's approval
// queue, and the routes the apps call. Real server, real socket, in-memory
// MongoDB, and a stand-in for AIMS.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.HOOK_KEY_AIMS = 'aims-hook-key';

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
const hook = (body, key = 'aims-hook-key') =>
  call('POST', '/api/hooks/aims/changed', { body, headers: { 'x-api-key': key } });
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

// A stand-in for AIMS's /api/cmdhub/*: answers in its formats and records
// what it was sent. An item's id is opaque and URL-safe, as AIMS makes it.
const PO = 'YXBwclR4bnxQTy8yNi0yNy8wMDAwMQ';
const GONE = 'YXBwclR4bnxQTy8yNi0yNy8wMDAwMg';
const CARD = {
  id: PO, stage: 'approve', queue: 'doc', kind: 'PO — purchase order', ref: 'PO/26-27/00001',
  name: 'ACME DIAGNOSTICS', detail: '1 lines · IGST', by: 'Sita', date: '20 Nov 26', urgent: false,
  amount_text: '₹1,20,000', approve_label: 'Approve',
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
        if (req.headers['x-api-key'] !== 'aims-api-key') return send(401, { ok: false, error: 'Invalid or missing API key.' });
        if (req.url === '/api/cmdhub/pending/') {
          return send(200, {
            ok: true,
            pending: { master: 0, indent: 0, doc: 1, adj: 0, total: 1 },
            stages: [
              { key: 'master', name: 'Master Approval', count: 0, items: [] },
              { key: 'indent', name: 'Indent Approval', count: 0, items: [] },
              { key: 'doc', name: 'Document Approval', count: 1, items: [CARD] },
              { key: 'adj', name: 'Adjustment Approval', count: 0, items: [] },
            ],
          });
        }
        if (req.url === `/api/cmdhub/item/?id=${PO}`) {
          return send(200, {
            ok: true,
            item: { ...CARD, stage_name: 'Document Approval', facts: [{ label: 'Vendor', value: 'ACME DIAGNOSTICS' }], lines: [], notes: '', activity: [] },
          });
        }
        if (req.url === '/api/cmdhub/act/' && body && body.id === PO) {
          if (body.action === 'reject' && !body.reason) {
            return send(400, { ok: false, error: 'Give a reason for the rejection.', code: 'reason_required' });
          }
          const approve = body.action === 'approve';
          return send(200, {
            ok: true, ref: 'PO/26-27/00001', party: 'ACME DIAGNOSTICS', amount_text: '₹1,20,000',
            verb: approve ? 'Approved' : 'Rejected',
            from: { key: 'doc', name: 'Document Approval' }, to: { key: '', name: approve ? 'Approved' : 'Rejected' },
            message: approve ? 'Approved PO/26-27/00001.' : 'Rejected PO/26-27/00001.',
            pending: { master: 0, indent: 0, doc: 0, adj: 0, total: 0 },
          });
        }
        if (req.url === '/api/cmdhub/act/' && body && body.id === GONE) {
          return send(409, { ok: false, error: 'PO/26-27/00002 was already actioned.', code: 'moved' });
        }
        return send(404, { ok: false, error: 'That item no longer exists.' });
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

test('until AIMS is set up here, its routes say so instead of failing', async () => {
  env.aims.url = '';
  env.aims.key = '';
  const res = await call('GET', '/api/software/aims/pending', { headers: authed() });
  assert.equal(res.status, 503);
  assert.match(res.json.message, /AIMS is not connected/);
  assert.equal((await call('GET', '/api/software/aims/pending')).status, 401);
});

test('the queues and one item are forwarded with the server\'s key', async () => {
  env.aims.url = `http://127.0.0.1:${fake.server.address().port}/`;
  env.aims.key = 'aims-api-key';

  const list = await call('GET', '/api/software/aims/pending', { headers: authed() });
  assert.equal(list.status, 200);
  assert.equal(list.json.pending.total, 1);
  assert.equal(list.json.stages[2].items[0].ref, 'PO/26-27/00001');
  assert.equal(fake.calls.at(-1).key, 'aims-api-key');
  assert.equal(fake.calls.at(-1).url, '/api/cmdhub/pending/');

  // the id goes to AIMS in the query string, never in the path
  const one = await call('GET', `/api/software/aims/items/${PO}`, { headers: authed() });
  assert.equal(one.status, 200);
  assert.equal(one.json.item.facts[0].value, 'ACME DIAGNOSTICS');
  assert.equal(fake.calls.at(-1).url, `/api/cmdhub/item/?id=${PO}`);

  const { bySoftware } = (await call('GET', '/api/pending', { headers: authed() })).json;
  assert.equal(bySoftware.find((s) => s.software === 'aims').pending, 1);
});

test('approve and reject go through under the CMD\'s name and land in the history', async () => {
  const ok = await call('POST', `/api/software/aims/items/${PO}/approve`, { headers: authed(), body: { stage: 'approve' } });
  assert.equal(ok.status, 200);
  assert.deepEqual(fake.calls.at(-1), {
    method: 'POST', url: '/api/cmdhub/act/', key: 'aims-api-key',
    body: { id: PO, action: 'approve', stage: 'approve', by: 'Test CMD' },
  });

  const no = await call('POST', `/api/software/aims/items/${PO}/reject`, {
    headers: authed(), body: { stage: 'approve', reason: 'Rate is above the quotation.' },
  });
  assert.equal(no.status, 200);
  assert.equal(fake.calls.at(-1).body.reason, 'Rate is above the quotation.');

  const { items } = (await call('GET', '/api/decisions', { headers: authed() })).json;
  const mine = items.filter((d) => d.software === 'aims').map((d) => [d.ref, d.verb, d.party, d.amount, d.reason]);
  assert.deepEqual(mine.sort(), [
    ['PO/26-27/00001', 'Approved', 'ACME DIAGNOSTICS', '₹1,20,000', ''],
    ['PO/26-27/00001', 'Rejected', 'ACME DIAGNOSTICS', '₹1,20,000', 'Rate is above the quotation.'],
  ]);
});

test('AIMS has no send back and no approve all, and a refusal keeps its words', async () => {
  const back = await call('POST', `/api/software/aims/items/${PO}/sendback`, { headers: authed(), body: { stage: 'approve' } });
  assert.equal(back.status, 400);
  assert.match(back.json.message, /approve, reject/);

  const all = await call('POST', '/api/software/aims/stages/doc/approve-all', { headers: authed(), body: {} });
  assert.equal(all.status, 400);
  assert.match(all.json.message, /one item at a time/);

  const moved = await call('POST', `/api/software/aims/items/${GONE}/approve`, { headers: authed(), body: { stage: 'approve' } });
  assert.equal(moved.status, 409);
  assert.equal(moved.json.message, 'PO/26-27/00002 was already actioned.');
  assert.equal(moved.json.code, 'moved');
});

test('something entering the CMD\'s queue reaches an open app at once; a decision only refreshes it', async () => {
  const { events } = await connect();
  assert.equal((await hook({}, 'wrong')).status, 401);

  const arrived = await hook({
    software: 'aims',
    pending: { master: 0, indent: 0, doc: 2, adj: 0, total: 2 },
    changes: [{ ref: 'PO/26-27/00003', party: 'ACME DIAGNOSTICS', amount_text: '₹45,000', from: null, to: 'doc' }],
  });
  assert.equal(arrived.status, 200);
  assert.equal(arrived.json.notified.arrivals, 1);
  await settle();

  const arrival = events.find((e) => e.name === 'hub:arrival');
  assert.ok(arrival, 'the app is told a new approval arrived');
  assert.equal(arrival.payload.software, 'aims');
  assert.equal(arrival.payload.title, 'New approval · ₹45,000');
  assert.equal(arrival.payload.body, 'ACME DIAGNOSTICS · AIMS · Document Approval');
  assert.ok(events.some((e) => e.name === 'hub:changed' && e.payload.software === 'aims'));

  // Somebody decided it: lists refresh, nobody is rung
  events.length = 0;
  const left = await hook({ pending: { doc: 1, total: 1 }, changes: [{ ref: 'PO/26-27/00003', from: 'doc', to: null }] });
  assert.equal(left.json.notified.arrivals, 0);
  await settle();
  assert.ok(events.some((e) => e.name === 'hub:changed'));
  assert.equal(events.some((e) => e.name === 'hub:arrival'), false);

  const { bySoftware } = (await call('GET', '/api/pending', { headers: authed() })).json;
  assert.equal(bySoftware.find((s) => s.software === 'aims').pending, 1);
});
