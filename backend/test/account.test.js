// The CMD's account (change password) and the saved decision history.
// Real server, in-memory MongoDB and a stand-in for LedgerTrace.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const http = require('node:http');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { start, stop } = require('../src/server');
const env = require('../src/config/env');
const User = require('../src/models/User');

let mongo;
let base;
let lt;

const call = async (method, path, { body, token } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
};
const login = (password, email = 'cmd@example.com') => call('POST', '/api/auth/login', { body: { email, password } });
// Tokens carry whole seconds: step past one so "issued before the change" is unambiguous
const tick = () => new Promise((r) => setTimeout(r, 1100));

before(async () => {
  mongo = await MongoMemoryServer.create();
  const server = await start({ port: 0, mongoUri: mongo.getUri(), reminder: false });
  base = `http://localhost:${server.address().port}`;
  await User.create({ name: 'Test CMD', email: 'cmd@example.com', password_hash: await bcrypt.hash('first-password', 4) });

  // LedgerTrace stand-in: answers an approve, a send-back and a move-all
  lt = http.createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      const send = (json) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, pending: { total: 5 }, ...json }));
      };
      if (req.url.endsWith('/INS-9/approve/')) {
        return send({ invoice: 'INS-9', vendor: 'ACME LABS', amount_text: '₹9,000', from: { key: 'rel' }, to: { key: '', name: 'Paid · Tally Entry' } });
      }
      if (req.url.endsWith('/approve/')) {
        return send({ invoice: 'INS-1', vendor: 'ACME LABS', amount_text: '₹1,000', from: { key: 'pay' }, to: { key: 'rel' } });
      }
      if (req.url.endsWith('/sendback/')) {
        return send({ invoice: 'INS-2', vendor: 'BETA TRADERS', amount_text: '₹2,000', from: { key: 'pay' }, to: { key: '', name: 'Release Queue' } });
      }
      return send({
        from: { key: 'pay' },
        to: { key: 'rel' },
        moved: ['INS-3', 'INS-4'],
        moved_items: [
          { code: 'INS-3', vendor: 'GAMMA', amount_text: '₹3,000' },
          { code: 'INS-4', vendor: 'DELTA', amount_text: '₹4,000' },
        ],
      });
    });
  });
  await new Promise((r) => lt.listen(0, '127.0.0.1', r));
  env.ledgertrace.url = `http://127.0.0.1:${lt.address().port}`;
  env.ledgertrace.key = 'k';
});

after(async () => {
  lt.close();
  await stop();
  await mongo.stop();
});

test('every decision made through the hub is saved and listed newest first', async () => {
  const { token } = (await login('first-password')).json;
  const act = (path, body) => call('POST', `/api/software/ledgertrace/${path}`, { token, body });
  await act('items/INS-1/approve', { stage: 6 });
  await act('items/INS-2/sendback', { stage: 6, reason: 'Hold till month end' });
  await act('items/INS-9/approve', { stage: 7 });
  await act('stages/6/approve-all', {});

  assert.equal((await call('GET', '/api/decisions')).status, 401);
  const { items } = (await call('GET', '/api/decisions', { token })).json;
  assert.deepEqual(
    items.map((d) => [d.ref, d.verb, d.party, d.amount]).sort(),
    [
      ['INS-1', 'Approved', 'ACME LABS', '₹1,000'],
      ['INS-2', 'Sent back', 'BETA TRADERS', '₹2,000'],
      ['INS-3', 'Moved', 'GAMMA', '₹3,000'],
      ['INS-4', 'Moved', 'DELTA', '₹4,000'],
      ['INS-9', 'Released', 'ACME LABS', '₹9,000'],
    ],
  );
  assert.equal(items.find((d) => d.ref === 'INS-2').reason, 'Hold till month end');
  assert.ok(new Date(items[0].at) >= new Date(items.at(-1).at), 'newest first');
  assert.equal(items.every((d) => d.software === 'ledgertrace'), true);
});

test('changing the password needs the current one, and signs other devices out', async () => {
  const phone = (await login('first-password')).json.token;
  const laptop = (await login('first-password')).json.token;
  await tick();

  const change = (body) => call('POST', '/api/auth/change-password', { token: laptop, body });
  assert.equal((await change({ current: 'wrong', next: 'second-password' })).status, 400);
  assert.match((await change({ current: 'first-password', next: 'short' })).json.message, /at least 8/);
  assert.equal((await change({ current: 'first-password', next: 'first-password' })).status, 400);
  assert.equal((await call('POST', '/api/auth/change-password', { body: { current: 'first-password', next: 'second-password' } })).status, 401);

  const done = await change({ current: 'first-password', next: 'second-password' });
  assert.equal(done.status, 200);
  assert.equal((await call('GET', '/api/auth/me', { token: done.json.token })).status, 200, 'this device stays signed in');
  assert.equal((await call('GET', '/api/auth/me', { token: phone })).status, 401, 'the other device is signed out');
  assert.equal((await call('GET', '/api/auth/me', { token: laptop })).status, 401, 'so is the old token of this one');
  assert.equal((await login('first-password')).status, 401);
  assert.equal((await login('second-password')).status, 200);

  // The website sends only the new password: being signed in is enough
  const web = done.json.token;
  const webChange = (body) => call('POST', '/api/auth/change-password', { token: web, body });
  assert.match((await webChange({ next: 'short' })).json.message, /at least 8/);
  assert.equal((await webChange({ next: 'second-password' })).status, 400, 'the same password again is refused');
  await tick();
  const again = await webChange({ next: 'second-password-b' });
  assert.equal(again.status, 200);
  assert.equal((await login('second-password-b')).status, 200);
});
