// End-to-end checks against a real server, a real socket and an in-memory MongoDB.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.HOOK_KEY_LEDGERTRACE = 'lt-test-key';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { io } = require('socket.io-client');
const { start, stop } = require('../src/server');
const User = require('../src/models/User');
const Device = require('../src/models/Device');
const { runReminder, msToNextSlot } = require('../src/services/reminder');

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
const hook = (body, key = 'lt-test-key', software = 'ledgertrace') =>
  call('POST', `/api/hooks/${software}/changed`, { body, headers: { 'x-api-key': key } });

// Connect a socket and subscribe with `jwt`; resolves once the server has had time to answer.
const connect = (jwt) =>
  new Promise((resolve) => {
    const sock = io(`${base}/hub`, { path: '/socket.io', transports: ['websocket'] });
    sockets.push(sock);
    const events = [];
    sock.onAny((name, payload) => events.push({ name, payload }));
    sock.on('connect', () => {
      sock.emit('hub:subscribe', { token: jwt });
      setTimeout(() => resolve({ sock, events }), 300);
    });
  });
const settle = () => new Promise((r) => setTimeout(r, 300));

before(async () => {
  mongo = await MongoMemoryServer.create();
  const server = await start({ port: 0, mongoUri: mongo.getUri(), reminder: false });
  base = `http://localhost:${server.address().port}`;
  await User.create({ name: 'Test CMD', email: 'cmd@example.com', password_hash: await bcrypt.hash('correct-horse', 4) });
});

after(async () => {
  sockets.forEach((s) => s.close());
  await stop();
  await mongo.stop();
});

test('login rejects a wrong password and accepts the right one', async () => {
  const bad = await call('POST', '/api/auth/login', { body: { email: 'cmd@example.com', password: 'nope' } });
  assert.equal(bad.status, 401);
  const unknown = await call('POST', '/api/auth/login', { body: { email: 'who@example.com', password: 'nope' } });
  assert.equal(unknown.json.message, bad.json.message, 'same message for unknown user and wrong password');

  const good = await call('POST', '/api/auth/login', { body: { email: ' CMD@example.com ', password: 'correct-horse' } });
  assert.equal(good.status, 200);
  assert.equal(good.json.user.name, 'Test CMD');
  assert.equal(good.json.user.password_hash, undefined);
  token = good.json.token;

  const me = await call('GET', '/api/auth/me', { headers: authed() });
  assert.equal(me.json.user.email, 'cmd@example.com');
});

test('protected routes refuse a missing or bad token', async () => {
  assert.equal((await call('GET', '/api/pending')).status, 401);
  assert.equal((await call('GET', '/api/pending', { headers: { authorization: 'Bearer junk' } })).status, 401);
});

test('webhook refuses a wrong key, an unknown source and a source with no key set', async () => {
  assert.equal((await hook({ event: 'new' }, 'wrong')).status, 401);
  assert.equal((await hook({ event: 'new' }, 'lt-test-key', 'nosuch')).status, 401);
  assert.equal((await hook({ event: 'new' }, '', 'aims')).status, 401);
  assert.equal((await hook({ event: 'bogus' })).status, 400);
});

test('a "new" webhook reaches a subscribed app as a nudge and an arrival; an unsubscribed socket hears nothing', async () => {
  const app = await connect(token);
  const stranger = await connect('not-a-token');
  assert.ok(app.events.some((e) => e.name === 'hub:subscribed'));

  const res = await hook({
    event: 'new',
    stage: 'pay',
    pending: 10,
    item: { ref: 'ADS-2026-1317', party: 'ARKA BIO SOLUTIONS', amount: '₹41,706' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.json.notified.sockets, 1);
  await settle();

  const changed = app.events.find((e) => e.name === 'hub:changed');
  assert.deepEqual({ software: changed.payload.software, stage: changed.payload.stage }, { software: 'ledgertrace', stage: 'pay' });
  const arrival = app.events.find((e) => e.name === 'hub:arrival');
  assert.equal(arrival.payload.title, 'New approval · ₹41,706');
  assert.equal(arrival.payload.body, 'ARKA BIO SOLUTIONS · LedgerTrace · Pay Approval');
  assert.equal(stranger.events.length, 0);

  const pending = await call('GET', '/api/pending', { headers: authed() });
  assert.equal(pending.json.total, 10);
  assert.equal(pending.json.bySoftware.find((s) => s.software === 'ledgertrace').pending, 10);
  assert.equal(pending.json.bySoftware.find((s) => s.software === 'aims').pending, null);

  const log = await call('GET', '/api/notifications', { headers: authed() });
  assert.equal(log.json.items[0].ref, 'ADS-2026-1317');
});

test('an "updated" webhook only nudges: no arrival, no log entry', async () => {
  const app = await connect(token);
  await hook({ event: 'updated', stage: 'pay', pending: 9 });
  await settle();
  assert.ok(app.events.some((e) => e.name === 'hub:changed'));
  assert.ok(!app.events.some((e) => e.name === 'hub:arrival'));
  const log = await call('GET', '/api/notifications', { headers: authed() });
  assert.equal(log.json.items.filter((n) => n.kind === 'arrival').length, 1);
});

test('the reminder fires while something is pending and stays quiet when nothing is', async () => {
  const app = await connect(token);
  const sent = await runReminder();
  await settle();
  assert.equal(sent.sockets >= 1, true);
  const reminder = app.events.find((e) => e.name === 'hub:reminder');
  assert.equal(reminder.payload.total, 9);

  await hook({ event: 'removed', pending: 0 });
  assert.equal(await runReminder(), null);
});

test('reminders are aligned to the quarter hour', () => {
  const at = (h, m, s = 0) => Date.UTC(2026, 10, 19, h, m, s);
  assert.equal(msToNextSlot(15, at(10, 7)), 8 * 60 * 1000);
  assert.equal(msToNextSlot(15, at(10, 14, 30)), 30 * 1000);
  assert.equal(msToNextSlot(15, at(10, 15)), 15 * 60 * 1000);
});

test('a device can be registered once, updated, and removed', async () => {
  const bad = await call('POST', '/api/devices', { headers: authed(), body: { platform: 'android' } });
  assert.equal(bad.status, 400);
  await call('POST', '/api/devices', { headers: authed(), body: { platform: 'android', token: 'fcm-abc' } });
  await call('POST', '/api/devices', { headers: authed(), body: { platform: 'android', token: 'fcm-abc' } });
  await call('POST', '/api/devices', {
    headers: authed(),
    body: { platform: 'web', subscription: { endpoint: 'https://push.example/1', keys: { p256dh: 'x', auth: 'y' } } },
  });
  assert.equal(await Device.countDocuments(), 2);

  // The reminder switch is per device: off on the phone, still on in the browser
  const { devicesFor } = require('../src/services/push');
  const names = async (kind) => devicesFor(kind, await Device.find().lean()).map((d) => d.platform).sort();
  assert.deepEqual(await names('reminder'), ['android', 'web'], 'on by default');
  await call('POST', '/api/devices', { headers: authed(), body: { platform: 'android', token: 'fcm-abc', reminders: false } });
  assert.deepEqual(await names('reminder'), ['web']);
  assert.deepEqual(await names('arrival'), ['android', 'web'], 'new approvals still reach it');
  // Registering again without saying keeps the choice (a token refresh must not switch it back on)
  await call('POST', '/api/devices', { headers: authed(), body: { platform: 'android', token: 'fcm-abc' } });
  assert.deepEqual(await names('reminder'), ['web']);
  await call('POST', '/api/devices', { headers: authed(), body: { platform: 'android', token: 'fcm-abc', reminders: true } });
  assert.deepEqual(await names('reminder'), ['android', 'web']);

  await call('DELETE', '/api/devices', { headers: authed(), body: { token: 'fcm-abc' } });
  assert.equal(await Device.countDocuments(), 1);
});

test('a deactivated account loses access at once, including on the socket', async () => {
  await User.updateOne({ email: 'cmd@example.com' }, { is_active: false });
  assert.equal((await call('GET', '/api/pending', { headers: authed() })).status, 401);
  const app = await connect(token);
  assert.ok(!app.events.some((e) => e.name === 'hub:subscribed'));
  await User.updateOne({ email: 'cmd@example.com' }, { is_active: true });
});

test('notifications come a page at a time, and can be marked read and removed from the list', async () => {
  const Notification = require('../src/models/Notification');
  await Notification.deleteMany({});
  const t0 = Date.now() - 60000;
  for (let i = 0; i < 5; i += 1) {
    await Notification.create({ kind: 'arrival', software: 'ledgertrace', title: `New approval ${i}`, created_at: new Date(t0 + i * 1000) });
  }
  const list = (query = '') => call('GET', `/api/notifications${query}`, { headers: authed() });
  assert.equal((await call('GET', '/api/notifications')).status, 401);

  // Two pages of two, then the last one
  const one = (await list('?limit=2')).json;
  assert.deepEqual(one.items.map((n) => n.title), ['New approval 4', 'New approval 3']);
  assert.equal(one.has_more, true);
  assert.equal(one.unread, 5);
  assert.equal(one.items[0].read, false);
  const two = (await list(`?limit=2&before=${encodeURIComponent(one.items[1].at)}`)).json;
  assert.deepEqual(two.items.map((n) => n.title), ['New approval 2', 'New approval 1']);
  const three = (await list(`?limit=2&before=${encodeURIComponent(two.items[1].at)}`)).json;
  assert.deepEqual(three.items.map((n) => n.title), ['New approval 0']);
  assert.equal(three.has_more, false);

  // One read, then all of them
  await call('POST', `/api/notifications/${one.items[0].id}/read`, { headers: authed() });
  assert.equal((await list()).json.unread, 4);
  assert.equal((await call('POST', '/api/notifications/read-all', { headers: authed() })).json.changed, 4);
  const read = (await list()).json;
  assert.equal(read.unread, 0);
  assert.equal(read.items.every((n) => n.read), true);

  // One removed, then all: gone from the list, still in the database
  assert.equal((await call('DELETE', '/api/notifications/not-an-id', { headers: authed() })).status, 404);
  await call('DELETE', `/api/notifications/${one.items[0].id}`, { headers: authed() });
  assert.deepEqual((await list()).json.items.map((n) => n.title).includes('New approval 4'), false);
  assert.equal((await list()).json.items.length, 4);
  assert.equal((await call('DELETE', '/api/notifications', { headers: authed() })).json.changed, 4);
  assert.equal((await list()).json.items.length, 0);
  assert.equal(await Notification.countDocuments({}), 5);
});
