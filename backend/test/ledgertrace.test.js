// LedgerTrace: the message format it sends us, and the routes the apps call.
// Real server, real socket, in-memory MongoDB, and a stand-in for LedgerTrace.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.HOOK_KEY_LEDGERTRACE = 'lt-test-key';
process.env.LEDGERTRACE_API_URL = '';
process.env.LEDGERTRACE_API_KEY = '';

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
const hook = (body) =>
  call('POST', '/api/hooks/ledgertrace/changed', { body, headers: { 'x-api-key': 'lt-test-key' } });
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

// A stand-in for LedgerTrace's /api/cmdhub/*: answers in its formats and
// records what it was sent.
const fakeLt = { calls: [], server: null, moved: false };
const startFakeLt = () =>
  new Promise((resolve) => {
    fakeLt.server = http.createServer((req, res) => {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        const body = raw ? JSON.parse(raw) : null;
        fakeLt.calls.push({ method: req.method, url: req.url, key: req.headers['x-api-key'], body });
        const send = (status, json) => {
          res.writeHead(status, { 'content-type': 'application/json' });
          res.end(JSON.stringify(json));
        };
        if (req.headers['x-api-key'] !== 'hub-to-lt-key') return send(401, { ok: false, error: 'Invalid API key.' });
        const pending = { inv: 0, pay: 21, rel: 1, total: 22 };
        if (req.url === '/api/cmdhub/pending/') {
          return send(200, { ok: true, pending, stages: [{ key: 'pay', stage: 6, count: 21, items: [{ code: 'INS-1' }] }] });
        }
        if (req.url === '/api/cmdhub/invoice/INS-1/') return send(200, { ok: true, invoice: { code: 'INS-1', vendor: 'ACME' } });
        if (req.url === '/api/cmdhub/invoice/NOPE/') return send(404, { ok: false, error: 'NOPE is not on file.' });
        if (req.url === '/api/cmdhub/invoice/INS-1/file/l-invoice-0/') {
          res.writeHead(200, { 'content-type': 'application/pdf', 'content-disposition': 'inline; filename="bill.pdf"' });
          return res.end(Buffer.from('%PDF-1.4 the bill'));
        }
        if (req.url === '/api/cmdhub/invoice/INS-1/file/a-9/') return send(404, { ok: false, error: 'No such AIMS document for this invoice.' });
        if (req.url === '/api/cmdhub/invoice/INS-1/approve/') {
          if (fakeLt.moved) {
            return send(409, {
              ok: false,
              error: 'INS-1 has already moved — it is now at Payment Release.',
              code: 'moved',
              now: { stage: 7, key: 'rel' },
            });
          }
          fakeLt.moved = true;
          return send(200, { ok: true, action: 'approve', invoice: 'INS-1', from: { stage: 6, key: 'pay' }, to: { stage: 7, key: 'rel' }, pending });
        }
        if (req.url === '/api/cmdhub/stage/6/approve-all/') {
          return send(200, {
            ok: true,
            action: 'approve_all',
            from: { stage: 6, key: 'pay' },
            moved: ['INS-2'],
            skipped: [],
            pending: { inv: 0, pay: 20, rel: 2, total: 22 },
          });
        }
        return send(404, { ok: false, error: 'no such route' });
      });
    });
    fakeLt.server.listen(0, '127.0.0.1', () => resolve(fakeLt.server.address().port));
  });

before(async () => {
  mongo = await MongoMemoryServer.create();
  const server = await start({ port: 0, mongoUri: mongo.getUri(), reminder: false });
  base = `http://localhost:${server.address().port}`;
  await User.create({ name: 'Test CMD', email: 'cmd@example.com', password_hash: await bcrypt.hash('correct-horse', 4) });
  token = (await call('POST', '/api/auth/login', { body: { email: 'cmd@example.com', password: 'correct-horse' } })).json.token;
});

after(async () => {
  sockets.forEach((s) => s.close());
  if (fakeLt.server) fakeLt.server.close();
  await stop();
  await mongo.stop();
});

test("something sent up to the CMD is announced once; the CMD's own moves are silent", async () => {
  const app = await connect();

  // Business Head sends one to CMD Pay Approval: from outside (null) into "pay".
  const arrived = await hook({
    pending: { inv: 0, pay: 22, rel: 0, total: 22 },
    changes: [{ ref: 'INS-2026-1140', party: 'TRANSASIA BIO-MEDICALS LTD', amount_text: '₹7,662', from: null, to: 'pay' }],
  });
  assert.equal(arrived.json.notified.arrivals, 1);
  await settle();
  const arrival = app.events.find((e) => e.name === 'hub:arrival');
  assert.equal(arrival.payload.title, 'New approval · ₹7,662');
  assert.equal(arrival.payload.body, 'TRANSASIA BIO-MEDICALS LTD · LedgerTrace · Pay Approval');
  assert.equal(arrival.payload.ref, 'INS-2026-1140');
  assert.equal((await call('GET', '/api/pending', { headers: authed() })).json.total, 22);

  // The CMD approves it (pay -> rel) and then releases it (rel -> out): refresh only.
  app.events.length = 0;
  const moved = await hook({ pending: { total: 22 }, changes: [{ ref: 'INS-2026-1140', from: 'pay', to: 'rel' }] });
  const left = await hook({ pending: { total: 21 }, changes: [{ ref: 'INS-2026-1140', from: 'rel', to: null }] });
  assert.equal(moved.json.notified.arrivals + left.json.notified.arrivals, 0);
  await settle();
  assert.ok(!app.events.some((e) => e.name === 'hub:arrival'));
  assert.deepEqual(
    app.events.filter((e) => e.name === 'hub:changed').map((e) => e.payload.stage),
    ['pay', 'rel', 'rel'],
  );
  assert.equal((await call('GET', '/api/pending', { headers: authed() })).json.total, 21);
});

test('several sent up together make one notification, not one each', async () => {
  const app = await connect();
  const batch = await hook({
    pending: { total: 24 },
    changes: ['A', 'B', 'C'].map((ref) => ({ ref, party: 'X', amount_text: '₹1', from: null, to: 'pay' })),
  });
  assert.equal(batch.json.notified.arrivals, 3);
  await settle();
  const arrivals = app.events.filter((e) => e.name === 'hub:arrival');
  assert.equal(arrivals.length, 1);
  assert.equal(arrivals[0].payload.title, '3 new approvals');
  assert.equal(arrivals[0].payload.body, 'LedgerTrace · Pay Approval');
});

test('the routes need a login, and say so when the connection is not set up', async () => {
  assert.equal((await call('GET', '/api/software/ledgertrace/pending')).status, 401);
  assert.equal((await call('GET', '/api/software/nosuch/pending', { headers: authed() })).status, 404);
  assert.equal((await call('GET', '/api/software/ledgertrace/pending', { headers: authed() })).status, 503);
});

test("the routes forward with the server's key and the CMD's name, and pass refusals back", async () => {
  env.ledgertrace.url = `http://127.0.0.1:${await startFakeLt()}`;
  env.ledgertrace.key = 'hub-to-lt-key';
  const app = await connect();

  const list = await call('GET', '/api/software/ledgertrace/pending', { headers: authed() });
  assert.equal(list.status, 200);
  assert.equal(list.json.stages[0].items[0].code, 'INS-1');
  assert.equal((await call('GET', '/api/pending', { headers: authed() })).json.total, 22, 'our count follows LedgerTrace');

  assert.equal((await call('GET', '/api/software/ledgertrace/items/INS-1', { headers: authed() })).json.invoice.vendor, 'ACME');
  const missing = await call('GET', '/api/software/ledgertrace/items/NOPE', { headers: authed() });
  assert.deepEqual([missing.status, missing.json.message], [404, 'NOPE is not on file.']);

  const ok = await call('POST', '/api/software/ledgertrace/items/INS-1/approve', {
    headers: authed(),
    body: { stage: 6, by: 'Somebody Else' },
  });
  assert.equal(ok.status, 200);
  const sent = fakeLt.calls.at(-1);
  assert.equal(sent.key, 'hub-to-lt-key');
  assert.deepEqual(sent.body, { stage: 6, by: 'Test CMD' }, 'the name comes from the login, never from the app');
  await settle();
  assert.ok(app.events.some((e) => e.name === 'hub:changed' && e.payload.stage === 'pay'));

  const again = await call('POST', '/api/software/ledgertrace/items/INS-1/approve', { headers: authed(), body: { stage: 6 } });
  assert.equal(again.status, 409);
  assert.equal(again.json.code, 'moved');
  assert.equal(again.json.now.key, 'rel');

  const bogus = await call('POST', '/api/software/ledgertrace/items/INS-1/remove', { headers: authed(), body: { stage: 6 } });
  assert.equal(bogus.status, 400);
  assert.ok(!fakeLt.calls.some((c) => c.url.includes('/remove/')), 'an unknown action never reaches LedgerTrace');

  const all = await call('POST', '/api/software/ledgertrace/stages/6/approve-all', { headers: authed(), body: { codes: ['INS-2'] } });
  assert.deepEqual(all.json.moved, ['INS-2']);
  assert.deepEqual(fakeLt.calls.at(-1).body, { codes: ['INS-2'], by: 'Test CMD' });
});

test('a document opens through a short-lived link, and that link is good for nothing else', async () => {
  const link = (doc) => call('POST', `/api/software/ledgertrace/items/INS-1/files/${doc}/link`, { headers: authed() });
  assert.equal((await call('POST', '/api/software/ledgertrace/items/INS-1/files/l-invoice-0/link')).status, 401);

  const made = await link('l-invoice-0');
  assert.equal(made.status, 200);
  assert.match(made.json.url, /^http:\/\/localhost:\d+\/api\/files\/[\w.-]+$/);
  assert.equal(made.json.expires_in, 120);

  // No login header at all: the link carries what is needed
  const opened = await fetch(made.json.url);
  assert.equal(opened.status, 200);
  assert.equal(opened.headers.get('content-type'), 'application/pdf');
  assert.match(opened.headers.get('content-disposition'), /inline; filename="bill.pdf"/);
  assert.equal(await opened.text(), '%PDF-1.4 the bill');
  assert.equal(fakeLt.calls.at(-1).key, 'hub-to-lt-key', 'fetched from LedgerTrace with the server key');

  // The link's token is not a login …
  const fileToken = made.json.url.split('/').pop();
  assert.equal((await call('GET', '/api/pending', { headers: { authorization: `Bearer ${fileToken}` } })).status, 401);
  // … and a login token is not a link
  assert.equal((await fetch(`${base}/api/files/${token}`)).status, 401);
  assert.equal((await fetch(`${base}/api/files/not-a-token`)).status, 401);

  // A document LedgerTrace does not have is passed back as it said it
  const missing = await fetch((await link('a-9')).json.url);
  assert.equal(missing.status, 404);
  assert.equal(await missing.text(), 'No such AIMS document for this invoice.');
});

test('our own key being wrong, or LedgerTrace being down, is reported as a connection problem', async () => {
  env.ledgertrace.key = 'wrong';
  const refused = await call('GET', '/api/software/ledgertrace/pending', { headers: authed() });
  assert.equal(refused.status, 502);
  assert.match(refused.json.message, /administrator/);
  env.ledgertrace.url = 'http://127.0.0.1:1';
  const down = await call('GET', '/api/software/ledgertrace/pending', { headers: authed() });
  assert.equal(down.status, 502);
  assert.match(down.json.message, /could not be reached/);
});
