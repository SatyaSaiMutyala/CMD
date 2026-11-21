// A view-only sign-in (the one given to an app store's reviewers): it sees
// what the CMD sees and can decide nothing. Real server, in-memory MongoDB,
// and a stand-in for LedgerTrace that counts what reaches it.
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
const Notification = require('../src/models/Notification');

let mongo;
let base;
let cmd;
let reviewer;
const source = { calls: [], server: null };

const call = async (method, path, { body, token } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
};
const signIn = async (email) => (await call('POST', '/api/auth/login', { body: { email, password: 'correct-horse' } })).json;

before(async () => {
  mongo = await MongoMemoryServer.create();
  const server = await start({ port: 0, mongoUri: mongo.getUri(), reminder: false });
  base = `http://localhost:${server.address().port}`;
  const password_hash = await bcrypt.hash('correct-horse', 4);
  await User.create({ name: 'The CMD', email: 'cmd@example.com', password_hash });
  await User.create({ name: 'Store Reviewer', email: 'review@example.com', password_hash, view_only: true });
  cmd = (await signIn('cmd@example.com')).token;
  reviewer = (await signIn('review@example.com')).token;

  // LedgerTrace, as far as the hub can tell
  source.server = http.createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      source.calls.push(`${req.method} ${req.url}`);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        ok: true, pending: { inv: 0, pay: 2, rel: 0, total: 2 }, stages: [], invoice: 'INS-1', vendor: 'ACME',
        amount_text: '₹100', from: { key: 'pay', name: 'Pay Approval' }, to: { key: 'rel', name: 'Payment Release' }, moved: ['INS-1', 'INS-2'],
      }));
    });
  });
  await new Promise((r) => source.server.listen(0, '127.0.0.1', r));
  env.ledgertrace.url = `http://127.0.0.1:${source.server.address().port}`;
  env.ledgertrace.key = 'lt-key';
});

after(async () => {
  source.server.close();
  await stop();
  await mongo.stop();
});

test('the apps are told an account is view-only when it signs in', async () => {
  assert.equal((await signIn('review@example.com')).user.view_only, true);
  assert.equal((await signIn('cmd@example.com')).user.view_only, false);
  assert.equal((await call('GET', '/api/auth/me', { token: reviewer })).json.user.view_only, true);
});

test('a view-only account sees everything the CMD sees', async () => {
  for (const path of ['/api/software/ledgertrace/pending', '/api/software/ledgertrace/items/INS-1', '/api/pending',
    '/api/notifications', '/api/decisions', '/api/settings']) {
    assert.equal((await call('GET', path, { token: reviewer })).status, 200, path);
  }
});

test('every decision from a view-only account is refused, and nothing reaches the source', async () => {
  source.calls.length = 0;
  for (const path of [
    '/api/software/ledgertrace/items/INS-1/approve',
    '/api/software/ledgertrace/items/INS-1/sendback',
    '/api/software/ledgertrace/items/INS-1/reject',
    '/api/software/ledgertrace/stages/6/approve-all',
  ]) {
    const res = await call('POST', path, { token: reviewer, body: { stage: 6, reason: 'x' } });
    assert.equal(res.status, 403, path);
    assert.equal(res.json.code, 'view_only');
    assert.match(res.json.message, /view-only account/);
  }
  assert.deepEqual(source.calls, []);
  assert.equal((await call('GET', '/api/decisions', { token: reviewer })).json.items.length, 0);

  // the CMD is not affected: the same press goes through
  const ok = await call('POST', '/api/software/ledgertrace/stages/6/approve-all', { token: cmd, body: {} });
  assert.equal(ok.status, 200);
  assert.deepEqual(source.calls, ['POST /api/cmdhub/stage/6/approve-all/']);
});

test('it cannot empty the shared notifications list or change its own password', async () => {
  const note = await Notification.create({ kind: 'arrival', software: 'ledgertrace', title: 'New approval', body: 'ACME' });
  for (const [method, path] of [
    ['POST', '/api/notifications/read-all'], ['POST', `/api/notifications/${note._id}/read`],
    ['DELETE', `/api/notifications/${note._id}`], ['DELETE', '/api/notifications'],
  ]) {
    assert.equal((await call(method, path, { token: reviewer })).status, 403, `${method} ${path}`);
  }
  const list = (await call('GET', '/api/notifications', { token: cmd })).json;
  assert.equal(list.items.length, 1);
  assert.equal(list.unread, 1);

  const pw = await call('POST', '/api/auth/change-password', { token: reviewer, body: { next: 'another-long-password' } });
  assert.equal(pw.status, 403);
  // the sign-in it was given still works
  assert.ok((await signIn('review@example.com')).token);

  // its own alert settings are its own to set
  assert.equal((await call('PUT', '/api/settings/dnd', { token: reviewer, body: { on: true } })).status, 200);
});
