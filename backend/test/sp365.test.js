// Sales Pulse 365: the message it sends us when a contract reaches Pending
// Approval or a pricing request is submitted, and the routes the apps call.
// Real server, real socket, in-memory MongoDB, and a stand-in for Sales Pulse.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.HOOK_KEY_SP365 = 'sp-hook-key';

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
const hook = (body, key = 'sp-hook-key') =>
  call('POST', '/api/hooks/sp365/changed', { body, headers: { 'x-api-key': key } });
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

// A stand-in for Sales Pulse's /api/cmdhub/*: answers in its formats and
// records what it was sent.
const CONTRACT = {
  id: 'c-7', stage: 'contract', kind: 'contract', ref: 'TL/SP/2026/0007', name: 'SUNRISE DIAGNOSTICS',
  title: 'Lab Services Agreement', type: 'Service agreement', signed: 1, signatories: 1,
  at: '2026-11-20T10:00:00+05:30', amount_text: '₹5,00,000', needs_selfie: true,
};
const QUOTE = {
  id: 'q-42', stage: 'quote', kind: 'quote', ref: 'PRQ-2026-0042', name: 'SUNRISE DIAGNOSTICS', code: 'TS0042PP',
  type: 'Test', variant: 'Test rate card', by: 'Asha Rao', at: '2026-11-20T00:00:00+05:30', line_count: 2,
  amount_text: '₹1,20,000',
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
        if (req.headers['x-api-key'] !== 'sp-api-key') return send(401, { ok: false, error: 'Invalid API key.' });
        if (req.url === '/api/cmdhub/pending') {
          return send(200, {
            ok: true,
            pending: { contract: 1, quote: 1, total: 2 },
            stages: [
              { key: 'contract', name: 'Pending Approval', count: 1, items: [CONTRACT] },
              { key: 'quote', name: 'Price Quote Approval', count: 1, items: [QUOTE] },
            ],
          });
        }
        if (req.url === '/api/cmdhub/items/q-42') {
          return send(200, { ok: true, item: { ...QUOTE, stage_name: 'Price Quote Approval', facts: [], lines: ['CBC · asked ₹180'], documents: [] } });
        }
        if (req.url === '/api/cmdhub/items/c-7/file/contract') {
          res.writeHead(200, { 'content-type': 'application/pdf', 'content-disposition': 'inline; filename="Contract_7.pdf"' });
          return res.end('%PDF-1.4 the contract');
        }
        const done = (verb, ref, party, amount, from) => send(200, {
          ok: true, ref, party, amount_text: amount, verb, from, to: { key: '', name: verb },
          message: `${verb} ${ref}.`, pending: { contract: 1, quote: 0, total: 1 },
        });
        if (req.url === '/api/cmdhub/items/q-42/approve') {
          return done('Approved', 'PRQ-2026-0042', 'SUNRISE DIAGNOSTICS', '₹1,20,000', { key: 'quote', name: 'Price Quote Approval' });
        }
        if (req.url === '/api/cmdhub/items/q-42/reject') {
          return done('Rejected', 'PRQ-2026-0042', 'SUNRISE DIAGNOSTICS', '₹1,20,000', { key: 'quote', name: 'Price Quote Approval' });
        }
        if (req.url === '/api/cmdhub/items/c-7/sendback') {
          return done('Sent back', 'TL/SP/2026/0007', 'SUNRISE DIAGNOSTICS', '₹5,00,000', { key: 'contract', name: 'Pending Approval' });
        }
        if (req.url === '/api/cmdhub/items/c-7/approve' && body && body.photo) {
          return done('Approved', 'TL/SP/2026/0007', 'SUNRISE DIAGNOSTICS', '₹5,00,000', { key: 'contract', name: 'Pending Approval' });
        }
        if (req.url === '/api/cmdhub/items/c-7/approve') {
          return send(422, {
            ok: false, code: 'selfie_required',
            error: 'Approving a contract signs it as Party One, and that needs your live selfie. Approve it in Sales Pulse, or send it back from here.',
          });
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

test('until Sales Pulse is set up here, its routes say so instead of failing', async () => {
  env.sp365.url = '';
  env.sp365.key = '';
  const res = await call('GET', '/api/software/sp365/pending', { headers: authed() });
  assert.equal(res.status, 503);
  assert.match(res.json.message, /Sales Pulse is not connected/);
});

test('both queues and one item are forwarded with the server\'s key', async () => {
  env.sp365.url = `http://127.0.0.1:${fake.server.address().port}/`;
  env.sp365.key = 'sp-api-key';

  const list = await call('GET', '/api/software/sp365/pending', { headers: authed() });
  assert.equal(list.status, 200);
  assert.deepEqual(list.json.pending, { contract: 1, quote: 1, total: 2 });
  assert.equal(list.json.stages[0].items[0].ref, 'TL/SP/2026/0007');
  assert.equal(list.json.stages[1].items[0].ref, 'PRQ-2026-0042');
  assert.equal(fake.calls.at(-1).key, 'sp-api-key');

  const one = await call('GET', '/api/software/sp365/items/q-42', { headers: authed() });
  assert.equal(one.json.item.lines[0], 'CBC · asked ₹180');
});

test('a pricing request is approved or rejected, a contract sent back, and all land in the history', async () => {
  const ok = await call('POST', '/api/software/sp365/items/q-42/approve', { headers: authed(), body: { stage: 'quote' } });
  assert.equal(ok.status, 200);
  assert.deepEqual(fake.calls.at(-1), {
    method: 'POST', url: '/api/cmdhub/items/q-42/approve', key: 'sp-api-key',
    body: { stage: 'quote', by: 'Test CMD' },
  });

  const no = await call('POST', '/api/software/sp365/items/q-42/reject', {
    headers: authed(), body: { stage: 'quote', reason: 'Below floor price.' },
  });
  assert.equal(no.status, 200);
  assert.equal(fake.calls.at(-1).body.reason, 'Below floor price.');

  const back = await call('POST', '/api/software/sp365/items/c-7/sendback', {
    headers: authed(), body: { stage: 'contract', reason: 'Credit limit is wrong.' },
  });
  assert.equal(back.status, 200);

  const { items } = (await call('GET', '/api/decisions', { headers: authed() })).json;
  const mine = items.filter((d) => d.software === 'sp365').map((d) => [d.ref, d.verb, d.amount, d.reason]);
  assert.deepEqual(mine.sort(), [
    ['PRQ-2026-0042', 'Approved', '₹1,20,000', ''],
    ['PRQ-2026-0042', 'Rejected', '₹1,20,000', 'Below floor price.'],
    ['TL/SP/2026/0007', 'Sent back', '₹5,00,000', 'Credit limit is wrong.'],
  ]);
});

test('approving a contract needs a selfie: the refusal reaches the app in Sales Pulse\'s words', async () => {
  const res = await call('POST', '/api/software/sp365/items/c-7/approve', { headers: authed(), body: { stage: 'contract' } });
  assert.equal(res.status, 422);
  assert.equal(res.json.code, 'selfie_required');
  assert.match(res.json.message, /needs your live selfie/);

  const all = await call('POST', '/api/software/sp365/stages/quote/approve-all', { headers: authed(), body: {} });
  assert.equal(all.status, 400);
});

test('with the selfie taken in the app, the contract is approved and signed', async () => {
  // a real photo is far past the size every other request is held to
  const photo = `data:image/jpeg;base64,${'A'.repeat(400 * 1024)}`;
  const ok = await call('POST', '/api/software/sp365/items/c-7/approve', {
    headers: authed(), body: { stage: 'contract', reason: 'Good to go.', photo },
  });
  assert.equal(ok.status, 200);
  assert.equal(fake.calls.at(-1).body.photo, photo);
  assert.equal(fake.calls.at(-1).body.reason, 'Good to go.');

  // the hub keeps the decision, never the photo
  const { items } = (await call('GET', '/api/decisions', { headers: authed() })).json;
  const mine = items.find((d) => d.software === 'sp365' && d.ref === 'TL/SP/2026/0007' && d.verb === 'Approved');
  assert.ok(mine);
  assert.equal(JSON.stringify(mine).includes('base64'), false);

  // not an image: refused here, before it reaches Sales Pulse
  const sent = fake.calls.length;
  const bad = await call('POST', '/api/software/sp365/items/c-7/approve', {
    headers: authed(), body: { stage: 'contract', photo: 'data:text/html;base64,PGI+' },
  });
  assert.equal(bad.status, 400);
  assert.match(bad.json.message, /Take the selfie again/);
  assert.equal(fake.calls.length, sent);

  // and nothing else may send a large body
  const big = await call('POST', '/api/auth/login', { body: { email: 'x', password: 'y'.repeat(300 * 1024) } });
  assert.equal(big.status, 413);
});

test('the contract opens as a PDF through a short-lived link', async () => {
  const link = await call('POST', '/api/software/sp365/items/c-7/files/contract/link', { headers: authed(), body: {} });
  assert.equal(link.status, 200);
  const res = await fetch(link.json.url.replace(/^https?:\/\/[^/]+/, base));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/pdf');
  assert.equal(await res.text(), '%PDF-1.4 the contract');
});

test('something entering a queue reaches an open app at once; a decision only refreshes it', async () => {
  const { events } = await connect();
  assert.equal((await hook({}, 'wrong')).status, 401);

  const arrived = await hook({
    software: 'sp365',
    pending: { contract: 1, quote: 2, total: 3 },
    changes: [{ ref: 'PRQ-2026-0043', party: 'APEX LABS', amount_text: '₹80,000', from: null, to: 'quote' }],
  });
  assert.equal(arrived.status, 200);
  assert.equal(arrived.json.notified.arrivals, 1);
  await settle();

  const arrival = events.find((e) => e.name === 'hub:arrival');
  assert.ok(arrival, 'the app is told a new approval arrived');
  assert.equal(arrival.payload.title, 'New approval · ₹80,000');
  assert.equal(arrival.payload.body, 'APEX LABS · Sales Pulse 365 · Price Quote Approval');

  events.length = 0;
  const left = await hook({ pending: { contract: 1, quote: 1, total: 2 }, changes: [{ ref: 'PRQ-2026-0043', from: 'quote', to: null }] });
  assert.equal(left.json.notified.arrivals, 0);
  await settle();
  assert.ok(events.some((e) => e.name === 'hub:changed'));
  assert.equal(events.some((e) => e.name === 'hub:arrival'), false);

  const { bySoftware } = (await call('GET', '/api/pending', { headers: authed() })).json;
  assert.equal(bySoftware.find((s) => s.software === 'sp365').pending, 2);
});
