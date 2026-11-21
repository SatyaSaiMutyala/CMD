// Do not disturb: the setting, its routes, and the reminder keeping quiet.
// Real server, real socket, in-memory MongoDB.
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
const Notification = require('../src/models/Notification');
const { runReminder } = require('../src/services/reminder');
const { isQuiet, dndOf } = require('../src/services/quiet');
const { devicesFor } = require('../src/services/push');

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
const dnd = (body) => call('PUT', '/api/settings/dnd', { headers: authed(), body });
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
// 03:30 UTC is 09:00 in India
const india = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(2026, 10, 21, h, m) - 330 * 60 * 1000);
};

before(async () => {
  mongo = await MongoMemoryServer.create();
  const server = await start({ port: 0, mongoUri: mongo.getUri(), reminder: false });
  base = `http://localhost:${server.address().port}`;
  await User.create({ name: 'Test CMD', email: 'cmd@example.com', password_hash: await bcrypt.hash('correct-horse', 4) });
  token = (await call('POST', '/api/auth/login', { body: { email: 'cmd@example.com', password: 'correct-horse' } })).json.token;
});

after(async () => {
  sockets.forEach((s) => s.close());
  await stop();
  await mongo.stop();
});

test('quiet hours are read on the person\'s own clock, and may run past midnight', () => {
  const night = { daily: true, from: '22:00', to: '07:00', tz: 'Asia/Kolkata' };
  assert.equal(isQuiet(night, india('21:59')), false);
  assert.equal(isQuiet(night, india('22:00')), true);
  assert.equal(isQuiet(night, india('23:45')), true);
  assert.equal(isQuiet(night, india('03:00')), true);
  assert.equal(isQuiet(night, india('06:59')), true);
  assert.equal(isQuiet(night, india('07:00')), false);
  assert.equal(isQuiet(night, india('13:00')), false);

  // the same moment is the afternoon somewhere else
  assert.equal(isQuiet({ ...night, tz: 'America/New_York' }, india('23:45')), false);

  // an afternoon rest, inside one day
  const rest = { daily: true, from: '13:00', to: '15:30', tz: 'Asia/Kolkata' };
  assert.equal(isQuiet(rest, india('12:59')), false);
  assert.equal(isQuiet(rest, india('14:00')), true);
  assert.equal(isQuiet(rest, india('15:30')), false);

  // switched off, or no hours at all
  assert.equal(isQuiet({ ...night, daily: false }, india('23:45')), false);
  assert.equal(isQuiet({ daily: true, from: '09:00', to: '09:00' }, india('09:00')), false);
  // "do not disturb" now: quiet whatever the clock says
  assert.equal(isQuiet({ on: true }, india('13:00')), true);
  // nothing stored yet
  assert.equal(isQuiet(undefined), false);
  assert.deepEqual(dndOf(undefined), { on: false, daily: false, from: '22:00', to: '07:00', tz: 'Asia/Kolkata' });
});

test('the setting starts off, with ten at night to seven in the morning ready to switch on', async () => {
  assert.equal((await call('GET', '/api/settings')).status, 401);
  const res = await call('GET', '/api/settings', { headers: authed() });
  assert.equal(res.status, 200);
  assert.deepEqual(res.json.dnd, { on: false, daily: false, from: '22:00', to: '07:00', tz: 'Asia/Kolkata' });
  assert.equal(res.json.quiet, false);
});

test('only what is sent is changed, a bad time is refused, and other devices are told', async () => {
  const { events } = await connect();

  const hours = await dnd({ daily: true, from: '21:30', to: '06:15', tz: 'Asia/Kolkata' });
  assert.equal(hours.status, 200);
  assert.deepEqual(hours.json.dnd, { on: false, daily: true, from: '21:30', to: '06:15', tz: 'Asia/Kolkata' });

  // one switch on its own leaves the hours as they were
  const now = await dnd({ on: true });
  assert.deepEqual(now.json.dnd, { on: true, daily: true, from: '21:30', to: '06:15', tz: 'Asia/Kolkata' });
  assert.equal(now.json.quiet, true);

  for (const bad of [{ from: '25:00' }, { to: '7am' }, { from: '9:5' }, { tz: 'Mars/Olympus' }]) {
    const res = await dnd(bad);
    assert.equal(res.status, 400, JSON.stringify(bad));
  }
  assert.equal((await call('GET', '/api/settings', { headers: authed() })).json.dnd.from, '21:30');

  await settle();
  assert.equal(events.filter((e) => e.name === 'hub:settings').length, 2);
  await dnd({ on: false, daily: false });
});

test('in do not disturb the reminder is not sent, not shown and not logged; a new approval still is', async () => {
  // something is waiting
  await call('POST', '/api/hooks/ledgertrace/changed', {
    headers: { 'x-api-key': 'lt-test-key' },
    body: { pending: { pay: 4, total: 4 }, changes: [] },
  });
  await Device.create({ user: (await User.findOne())._id, platform: 'android', token: 'fcm-1' });
  const { events } = await connect();
  const reminders = () => Notification.countDocuments({ kind: 'reminder' });

  const loud = await runReminder();
  assert.equal(loud.sockets > 0, true);
  await settle();
  assert.equal(events.filter((e) => e.name === 'hub:reminder').length, 1);
  assert.equal(await reminders(), 1);

  await dnd({ on: true });
  events.length = 0;
  const held = await runReminder();
  assert.deepEqual(held, { sockets: 0, pushed: 0, quiet: true });
  await settle();
  assert.equal(events.some((e) => e.name === 'hub:reminder'), false);
  assert.equal(await reminders(), 1);

  // a new approval is not a reminder: it still arrives
  const arrived = await call('POST', '/api/hooks/ledgertrace/changed', {
    headers: { 'x-api-key': 'lt-test-key' },
    body: { pending: { pay: 5, total: 5 }, changes: [{ ref: 'INS-1', party: 'ACME', amount_text: '₹100', from: null, to: 'pay' }] },
  });
  assert.equal(arrived.json.notified.arrivals, 1);
  await settle();
  assert.ok(events.some((e) => e.name === 'hub:arrival'));

  // switched off again: the reminder is back
  await dnd({ on: false });
  assert.equal((await runReminder()).sockets > 0, true);
  assert.equal(await reminders(), 2);
});

test('how often the reminder comes is the CMD\'s to set, counted from midnight on their clock', async () => {
  const { isDue, reminderMinutesOf } = require('../src/services/quiet');
  const me = (minutes) => ({ reminder_minutes: minutes, dnd: { tz: 'Asia/Kolkata' } });
  // nothing set: the server's own 15 minutes
  assert.equal(reminderMinutesOf({}), 15);
  assert.deepEqual(['10:00', '10:15', '10:20', '10:30'].map((t) => isDue({}, india(t))), [true, true, false, true]);
  // every half hour, every two hours, every 45 minutes
  assert.deepEqual(['10:00', '10:15', '10:30'].map((t) => isDue(me(30), india(t))), [true, false, true]);
  assert.deepEqual(['10:00', '11:00', '12:00'].map((t) => isDue(me(120), india(t))), [true, false, true]);
  assert.deepEqual(['00:45', '01:00', '01:30'].map((t) => isDue(me(45), india(t))), [true, false, true]);

  const start = await call('GET', '/api/settings', { headers: authed() });
  assert.deepEqual(start.json.reminder, { minutes: 15, min: 5, max: 1440 });

  const set = await call('PUT', '/api/settings/reminder', { headers: authed(), body: { minutes: 30 } });
  assert.equal(set.status, 200);
  assert.equal(set.json.reminder.minutes, 30);
  for (const bad of [{ minutes: 2 }, { minutes: 5000 }, { minutes: 12.5 }, { minutes: 'soon' }, {}]) {
    assert.equal((await call('PUT', '/api/settings/reminder', { headers: authed(), body: bad })).status, 400, JSON.stringify(bad));
  }

  // the clock's own check: only on the half hours now (something is pending)
  const reminders = () => Notification.countDocuments({ kind: 'reminder' });
  const before = await reminders();
  assert.equal(await runReminder(india('10:15')), null);
  assert.equal(await reminders(), before);
  const sent = await runReminder(india('10:30'));
  assert.equal(sent.sockets >= 0 && sent.pushed >= 0, true);
  assert.equal(await reminders(), before + 1);

  // quiet hours still win over a reminder that is due
  await dnd({ daily: true, from: '22:00', to: '07:00', tz: 'Asia/Kolkata' });
  assert.equal(await runReminder(india('23:30')), null);
  assert.equal(await reminders(), before + 1);
  await dnd({ daily: false });
  await call('PUT', '/api/settings/reminder', { headers: authed(), body: { minutes: 15 } });
});

test('a quiet person\'s devices are passed over for the reminder only', async () => {
  const devices = await Device.find().lean();
  const quiet = new Set([String(devices[0].user)]);
  assert.equal(devicesFor('reminder', devices).length, 1);
  assert.equal(devicesFor('reminder', devices, quiet).length, 0);
  assert.equal(devicesFor('arrival', devices, quiet).length, 1);
});
