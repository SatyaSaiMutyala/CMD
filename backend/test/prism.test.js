// Trust Prism: the message it sends us when an asset is sent for approval, and
// the routes the apps call — including its files, which the browser fetches
// straight from Trust Prism's storage. Real server, real socket, in-memory
// MongoDB, and a stand-in for Trust Prism.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.HOOK_KEY_PRISM = 'prism-hook-key';

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
const hook = (body, key = 'prism-hook-key') =>
  call('POST', '/api/hooks/prism/changed', { body, headers: { 'x-api-key': key } });
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

// A stand-in for Trust Prism's /api/cmdhub/*: answers in its formats and
// records what it was sent.
const ID = '6b013f9fb759e728085b66ee';
const CARD = {
  id: ID, stage: 'review', name: 'Diwali hoarding', path: 'Demand Generation / Out-of-Home / Hoarding',
  type: 'Hoarding', dist: 'Public', status: 'In review', version: 1, revisions: 2, comments: 1, by: 'Asha',
  date: '2026-11-20', expiry: null, file: { name: 'kit.zip', ext: 'ZIP', size: '1.5 MB', kind: 'zip' }, flags: [], thumb: null,
};
const STORAGE = 'https://prism-test.s3.ap-south-1.amazonaws.com/masters/hero.pdf?X-Amz-Signature=abc';
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
        if (req.headers['x-api-key'] !== 'prism-api-key') return send(401, { ok: false, error: 'Invalid API key.' });
        if (req.url === '/api/cmdhub/pending') {
          return send(200, {
            ok: true,
            pending: { draft: 3, review: 1, total: 1 },
            stages: [
              { key: 'draft', name: 'Version Tracker', count: 3, items: [] },
              { key: 'review', name: 'Approval', count: 1, items: [CARD] },
            ],
          });
        }
        if (req.url === `/api/cmdhub/items/${ID}`) {
          return send(200, {
            ok: true,
            item: {
              ...CARD, stage_name: 'Approval', facts: [{ label: 'Distribution', value: 'Public' }],
              preview: { kind: 'zip', url: null, poster: null },
              documents: [{ id: 'master', name: 'kit.zip', group: 'Current file', size: '1.5 MB', kind: 'zip' }],
              activity: [],
            },
          });
        }
        if (req.url.startsWith(`/api/cmdhub/items/${ID}/file-url?doc=v1r1`)) {
          return send(200, { ok: true, url: STORAGE + (req.url.includes('download=1') ? '&save=1' : ''), kind: 'pdf', name: 'hero.pdf' });
        }
        if (req.url === `/api/cmdhub/items/${ID}/zip?doc=master`) {
          return send(200, {
            ok: true, count: 2, truncated: false,
            entries: [
              { name: 'brand/readme.txt', size: 93, size_text: '93 B', encrypted: false, opens: 'text' },
              { name: 'brand/source.ai', size: 7, size_text: '7 B', encrypted: false, opens: null },
            ],
          });
        }
        if (req.url === `/api/cmdhub/items/${ID}/zip-file?doc=master&path=${encodeURIComponent('brand/readme.txt')}`) {
          res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'content-disposition': 'inline; filename="readme.txt"' });
          return res.end('Use the primary logo on white.');
        }
        const m = new RegExp(`^/api/cmdhub/items/${ID}/(approve|sendback|reject)$`).exec(req.url);
        if (m) {
          const verb = { approve: 'Approved', sendback: 'Sent back', reject: 'Commented' }[m[1]];
          return send(200, {
            ok: true, ref: 'Diwali hoarding', party: 'Hoarding', amount_text: '', verb,
            from: { key: 'review', name: 'Approval' }, to: { key: '', name: verb },
            message: `${verb}: Diwali hoarding.`, pending: { draft: 3, review: 0, total: 0 },
          });
        }
        return send(404, { ok: false, error: 'That asset no longer exists.' });
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

const openLink = async (docId) => {
  const link = await call('POST', `/api/software/prism/items/${ID}/files/${encodeURIComponent(docId)}/link`, { headers: authed(), body: {} });
  assert.equal(link.status, 200);
  return fetch(link.json.url.replace(/^https?:\/\/[^/]+/, base), { redirect: 'manual' });
};

test('until Trust Prism is set up here, its routes say so instead of failing', async () => {
  env.prism.url = '';
  env.prism.key = '';
  const res = await call('GET', '/api/software/prism/pending', { headers: authed() });
  assert.equal(res.status, 503);
  assert.match(res.json.message, /Trust Prism is not connected/);
});

test('the tabs and one asset are forwarded; the reminder counts only what waits for a decision', async () => {
  env.prism.url = `http://127.0.0.1:${fake.server.address().port}/`;
  env.prism.key = 'prism-api-key';

  const list = await call('GET', '/api/software/prism/pending', { headers: authed() });
  assert.equal(list.status, 200);
  assert.equal(list.json.stages[1].items[0].name, 'Diwali hoarding');
  assert.equal(fake.calls.at(-1).key, 'prism-api-key');

  // three drafts in the Version Tracker are shown, not counted as waiting
  const { bySoftware } = (await call('GET', '/api/pending', { headers: authed() })).json;
  assert.equal(bySoftware.find((s) => s.software === 'prism').pending, 1);

  const one = await call('GET', `/api/software/prism/items/${ID}`, { headers: authed() });
  assert.equal(one.json.item.preview.kind, 'zip');
});

test('a file opens straight from Trust Prism\'s storage: the link sends the browser there', async () => {
  const res = await openLink('v1r1');
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), STORAGE);

  // asked for as a download
  const saved = await openLink('v1r1!save');
  assert.equal(saved.headers.get('location'), `${STORAGE}&save=1`);
  assert.match(fake.calls.at(-1).url, /download=1/);
});

test('a zip is looked inside, and one file out of it is passed through', async () => {
  const inside = await call('GET', `/api/software/prism/items/${ID}/files/master/contents`, { headers: authed() });
  assert.equal(inside.status, 200);
  assert.deepEqual(inside.json.entries.map((e) => [e.name, e.opens]), [['brand/readme.txt', 'text'], ['brand/source.ai', null]]);

  const entry = `zip~master~${Buffer.from('brand/readme.txt').toString('base64url')}`;
  const res = await openLink(entry);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/plain/);
  assert.equal(await res.text(), 'Use the primary logo on white.');

  // a source with no archives says so
  const none = await call('GET', '/api/software/edos/items/41/files/a-7/contents', { headers: authed() });
  assert.equal(none.status, 400);
});

test('approve, send back and feedback go through under the CMD\'s name and land in the history', async () => {
  const ok = await call('POST', `/api/software/prism/items/${ID}/approve`, { headers: authed(), body: { stage: 'review' } });
  assert.equal(ok.status, 200);
  assert.deepEqual(fake.calls.at(-1), {
    method: 'POST', url: `/api/cmdhub/items/${ID}/approve`, key: 'prism-api-key',
    body: { stage: 'review', by: 'Test CMD' },
  });
  await call('POST', `/api/software/prism/items/${ID}/sendback`, { headers: authed(), body: { stage: 'review', reason: 'Logo is too small.' } });
  await call('POST', `/api/software/prism/items/${ID}/reject`, { headers: authed(), body: { stage: 'draft', reason: 'Use the new tagline.' } });

  const { items } = (await call('GET', '/api/decisions', { headers: authed() })).json;
  const mine = items.filter((d) => d.software === 'prism').map((d) => [d.ref, d.verb, d.party, d.reason]);
  assert.deepEqual(mine.sort(), [
    ['Diwali hoarding', 'Approved', 'Hoarding', ''],
    ['Diwali hoarding', 'Commented', 'Hoarding', 'Use the new tagline.'],
    ['Diwali hoarding', 'Sent back', 'Hoarding', 'Logo is too small.'],
  ]);
});

test('an asset sent for approval rings; an upload landing in the Version Tracker only refreshes', async () => {
  const { events } = await connect();

  const quiet = await hook({
    software: 'prism', pending: { draft: 4, review: 0, total: 0 },
    changes: [{ ref: 'New leaflet', party: 'Leaflet', from: null, to: 'draft', silent: true }],
  });
  assert.equal(quiet.status, 200);
  assert.equal(quiet.json.notified.arrivals, 0);
  await settle();
  assert.ok(events.some((e) => e.name === 'hub:changed' && e.payload.software === 'prism'));
  assert.equal(events.some((e) => e.name === 'hub:arrival'), false);

  events.length = 0;
  const arrived = await hook({
    software: 'prism', pending: { draft: 3, review: 1, total: 1 },
    changes: [{ ref: 'New leaflet', party: 'Leaflet', amount_text: '', from: null, to: 'review' }],
  });
  assert.equal(arrived.json.notified.arrivals, 1);
  await settle();
  const arrival = events.find((e) => e.name === 'hub:arrival');
  assert.ok(arrival, 'the app is told a new approval arrived');
  assert.equal(arrival.payload.title, 'New approval');
  assert.equal(arrival.payload.body, 'Leaflet · Trust Prism · Approval');
});
