/**
 * @format
 */

import React from 'react';
import { TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import { api } from '../src/store/api';
import { sessionSet } from '../src/store/authSlice';
import { changePassword } from '../src/store/authThunks';
import { makeStore } from '../src/store/store';

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);
// The phone's push service and sound player are native: stand-ins here
jest.mock('@react-native-firebase/messaging', () => ({
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  },
  getMessaging: () => ({}),
  requestPermission: jest.fn(async () => 1),
  hasPermission: jest.fn(async () => 1),
  registerDeviceForRemoteMessages: jest.fn(async () => {}),
  getToken: jest.fn(async () => 'fcm-token-1'),
  onTokenRefresh: jest.fn(() => () => {}),
  onNotificationOpenedApp: jest.fn(() => () => {}),
  getInitialNotification: jest.fn(async () => null),
  setBackgroundMessageHandler: jest.fn(),
}));
jest.mock('react-native-sound', () => {
  const Sound = jest.fn(function Sound(file, base, done) {
    this.play = jest.fn();
    this.stop = jest.fn(cb => cb && cb());
    if (done) done(null);
  });
  Sound.setCategory = jest.fn();
  Sound.MAIN_BUNDLE = 'MAIN_BUNDLE';
  return Sound;
});
// No live socket in tests: the server pushes nothing
jest.mock('socket.io-client', () => ({
  io: () => ({
    on: jest.fn(),
    emit: jest.fn(),
    removeAllListeners: jest.fn(),
    close: jest.fn(),
  }),
}));

// Every store the app or a test creates is remembered, so its cached data
// (and the timers RTK Query keeps for it) can be dropped after each test
const mockStores = [];
jest.mock('../src/store/store', () => {
  const actual = jest.requireActual('../src/store/store');
  return {
    makeStore: () => {
      const store = actual.makeStore();
      mockStores.push(store);
      return store;
    },
  };
});

const { act } = ReactTestRenderer;

/* What LedgerTrace's pending list looks like once it has passed through the hub backend */
const card = more => ({
  code: 'INS-2026-1140',
  stage: 6,
  vendor: 'TRANSASIA BIO-MEDICALS LTD',
  category: 'REAGENT',
  process: 'STANDARD',
  amount_text: '₹7,662',
  invoice_total_text: '₹7,662',
  payable_now_text: '₹7,662',
  balance_text: '',
  part_label: '',
  tags: ['NO TDS'],
  pill: '⏱ Auto-moved on plan date 14 Nov 26',
  due_text: 'in 2d',
  due_state: 'soon',
  actions: [
    { k: 'approve', label: 'Approve ₹7,662' },
    { k: 'sendback', label: 'Send back' },
  ],
  ...more,
});
const PENDING = {
  ok: true,
  pending: { inv: 0, pay: 2, rel: 0, total: 2 },
  stages: [
    { key: 'inv', stage: 3, count: 0, items: [] },
    {
      key: 'pay',
      stage: 6,
      count: 2,
      value_text: '₹28,515',
      items: [
        card(),
        card({
          code: 'ADS-2026-1317',
          vendor: 'ARKA BIO SOLUTIONS',
          process: 'ADVANCE',
          invoice_total_text: '₹62,559',
          balance_text: '₹41,706',
          payable_now_text: '₹41,706',
          due_text: '4d overdue',
          due_state: 'over',
          actions: [{ k: 'approve', label: 'Approve ₹41,706' }],
        }),
      ],
    },
    { key: 'rel', stage: 7, count: 0, items: [] },
  ],
};
const USER = { id: 'u1', name: 'Venkata', email: 'cmd@example.com' };

/* A stand-in for the hub backend. RTK Query calls fetch with a Request. */
const calls = [];
const answer = (status, json) =>
  new Response(JSON.stringify(json), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const respond = (path, body) => {
  if (path === '/api/auth/login') {
    return body.password === 'right-password'
      ? answer(200, { token: 'jwt-1', user: { ...USER, email: body.email } })
      : answer(401, { message: 'Wrong email or password.' });
  }
  if (path === '/api/auth/me') return answer(200, { user: USER });
  if (path === '/api/auth/change-password') {
    return body.current === 'right-password'
      ? answer(200, { token: 'jwt-2', user: USER })
      : answer(400, { message: 'Your current password is not right.' });
  }
  if (path.startsWith('/api/decisions')) {
    return answer(200, {
      items: [
        {
          software: 'ledgertrace',
          ref: 'INS-2026-1112',
          party: 'GANGADHAR MICROSCOPE',
          amount: '₹2,100',
          verb: 'Sent back',
          reason: 'Hold',
          at: '2026-11-19T10:00:00.000Z',
        },
      ],
    });
  }
  if (path === '/api/software/ledgertrace/items/INS-2026-1140') {
    return answer(200, {
      ok: true,
      invoice: {
        code: 'INS-2026-1140',
        vendor: 'TRANSASIA BIO-MEDICALS LTD',
        stage_name: 'CMD Pay Approval',
        supplier_ref: 'HRT2627V-13967',
        po: 'PO/26-27/00269',
        inv_date: '2026-10-14',
        due_date: '2026-11-21',
        due_text: 'in 2d',
        taxable_text: '₹7,297',
        gst_label: 'GST (5%)',
        gst_text: '₹365',
        invoice_total_text: '₹7,662',
        net_payable_text: '₹7,662',
        paid_text: '₹0',
        payable_now_text: '₹7,662',
        tds: [],
        category: 'REAGENT',
        source: 'AIMS',
        notes: 'Reagents for the analyser',
        documents: [
          {
            id: 'a-0',
            name: 'grn-scan.pdf',
            group: 'Supplier invoice',
            source: 'AIMS',
          },
        ],
        documents_note: '',
        activity: [
          {
            at: '14 Nov 2026 09:00',
            who: 'LedgerTrace',
            msg: 'Moved to CMD Pay Approval',
          },
        ],
      },
    });
  }
  if (path.endsWith('/files/a-0/link')) {
    return answer(200, {
      url: 'http://localhost:5050/api/files/tok',
      expires_in: 120,
    });
  }
  if (path === '/api/software/ledgertrace/pending') {
    return answer(200, PENDING);
  }
  if (path.endsWith('/approve') && body.stage === 7) {
    return answer(409, {
      message:
        'INS-2026-1140 has already moved — it is now at Payment Release.',
      code: 'moved',
    });
  }
  return answer(200, { ok: true, moved: ['INS-2026-1140'], skipped: [] });
};
beforeEach(() => {
  calls.length = 0;
  global.fetch = jest.fn(async (input, init) => {
    const request =
      typeof input === 'string' ? new Request(input, init) : input;
    const path = request.url.replace(/^https?:\/\/[^/]+/, '');
    const text = await request.clone().text();
    const body = text ? JSON.parse(text) : null;
    calls.push({
      method: request.method,
      path,
      body,
      auth: request.headers.get('Authorization'),
    });
    return respond(path, body);
  });
});

afterEach(async () => {
  const { api: hubApi } = require('../src/store/api');
  mockStores
    .splice(0)
    .forEach(store => store.dispatch(hubApi.util.resetApiState()));
  await new Promise(resolve => setTimeout(resolve, 20));
});

const textOf = node =>
  typeof node === 'string'
    ? node
    : Array.isArray(node)
    ? node.map(textOf).join('')
    : node
    ? textOf(node.children)
    : '';

// Lets requests, store updates and re-renders finish
const settle = () =>
  act(async () => {
    for (let i = 0; i < 12; i += 1) {
      await new Promise(resolve => setTimeout(resolve, 5));
    }
  });

const start = async () => {
  let app;
  await act(async () => {
    app = ReactTestRenderer.create(<App />);
  });
  await settle();
  return app;
};

const signIn = async (app, email, password) => {
  const [emailInput, passwordInput] = app.root.findAllByType(TextInput);
  await act(async () => {
    emailInput.props.onChangeText(email);
    passwordInput.props.onChangeText(password);
  });
  await act(async () => {
    app.root.findByProps({ label: 'Sign In' }).props.onPress();
  });
  await settle();
};

// A store that is already signed in, for testing the data layer on its own
const signedInStore = () => {
  const store = makeStore();
  store.dispatch(sessionSet({ token: 'jwt-1', user: USER }));
  return store;
};

test('starts on the login screen and rejects a bad form or a wrong password', async () => {
  const app = await start();
  expect(textOf(app.toJSON())).toContain('Sign In');
  expect(textOf(app.toJSON())).not.toContain('LedgerTrace');

  await signIn(app, '', '');
  expect(textOf(app.toJSON())).toContain('Enter your email and password.');

  await signIn(app, 'not-an-email', 'secret');
  expect(textOf(app.toJSON())).toContain('Enter a valid email address.');
  expect(calls).toHaveLength(0);

  await signIn(app, 'cmd@example.com', 'wrong');
  expect(textOf(app.toJSON())).toContain('Wrong email or password.');
  expect(textOf(app.toJSON())).not.toContain('LedgerTrace');
  await act(async () => app.unmount());
});

test('signing in opens the hub with the live pending total from the server', async () => {
  const app = await start();
  await signIn(app, 'cmd@example.com', 'right-password');

  const text = textOf(app.toJSON());
  expect(text).toContain('CMD Approval Hub');
  expect(text).toContain('LedgerTrace');
  expect(text).toContain('CAXIS');
  expect(text).toContain('2items need');

  const list = calls.find(c => c.path === '/api/software/ledgertrace/pending');
  expect(list.auth).toBe('Bearer jwt-1');

  // Signing in registers this phone for push notifications
  const device = calls.find(c => c.path === '/api/devices');
  expect(device).toMatchObject({
    method: 'POST',
    body: { platform: 'ios', token: 'fcm-token-1' },
    auth: 'Bearer jwt-1',
  });
  await act(async () => app.unmount());
});

test('the session is remembered: the next start opens the hub without signing in', async () => {
  const app = await start();
  const text = textOf(app.toJSON());
  expect(text).toContain('CMD Approval Hub');
  expect(text).toContain('2items need');
  expect(calls.some(c => c.path === '/api/auth/me')).toBe(true);
  expect(calls.some(c => c.path === '/api/auth/login')).toBe(false);
  await act(async () => app.unmount());
});

test('history comes from the server, with the software named', async () => {
  const store = signedInStore();
  const rows = await store
    .dispatch(api.endpoints.getHistory.initiate())
    .unwrap();
  expect(rows).toEqual([
    {
      ts: '2026-11-19T10:00:00.000Z',
      sw: 'LedgerTrace',
      id: 'INS-2026-1112',
      party: 'GANGADHAR MICROSCOPE',
      amount: '₹2,100',
      verb: 'Sent back',
      reason: 'Hold',
    },
  ]);
});

test('changing the password sends both, and a wrong current one is reported', async () => {
  const store = signedInStore();
  await expect(
    store.dispatch(changePassword('wrong', 'new-password-1')),
  ).rejects.toThrow('Your current password is not right.');
  expect(store.getState().auth.session.token).toBe('jwt-1');

  await store.dispatch(changePassword('right-password', 'new-password-1'));
  expect(store.getState().auth.session.token).toBe('jwt-2');
  expect(calls.at(-1).body).toEqual({
    current: 'right-password',
    next: 'new-password-1',
  });
});

test('a LedgerTrace card becomes an approval item the screens can show', async () => {
  const store = signedInStore();
  const data = await store
    .dispatch(api.endpoints.getPending.initiate('ledgertrace'))
    .unwrap();
  expect(data.total).toBe(2);
  expect(data.stages.inv.count).toBe(0);

  const [plain, split] = data.stages.pay.items;
  expect(plain).toMatchObject({
    id: 'INS-2026-1140',
    stage: 6,
    party: 'TRANSASIA BIO-MEDICALS LTD',
    amount: '₹7,662',
    balance: '',
    auto: 'Auto-moved on plan date 14 Nov 26',
    tags: ['NO TDS'],
    type: 'Standard · REAGENT',
    due: 'in 2d',
    dueLong: 'in 2 days',
    overdue: false,
    approve: 'Approve ₹7,662',
    canReject: false,
  });
  // Part already released: the invoice value, and what is left to approve
  expect(split).toMatchObject({
    amount: '₹62,559',
    balance: '₹41,706',
    decides: '₹41,706',
    tags: ['NO TDS', 'ADVANCE'],
    dueLong: '4 days overdue',
    overdue: true,
  });
});

test('a decision names the stage the item is at, and a refusal carries the reason', async () => {
  const store = signedInStore();
  const decide = arg => store.dispatch(api.endpoints.decide.initiate(arg));

  await decide({
    swId: 'ledgertrace',
    item: { id: 'INS-2026-1140', stage: 6 },
    verb: 'sendback',
    reason: 'Hold',
  }).unwrap();
  expect(calls.at(-1)).toMatchObject({
    method: 'POST',
    path: '/api/software/ledgertrace/items/INS-2026-1140/sendback',
    body: { stage: 6, reason: 'Hold' },
    auth: 'Bearer jwt-1',
  });

  await expect(
    decide({
      swId: 'ledgertrace',
      item: { id: 'INS-2026-1140', stage: 7 },
      verb: 'approve',
    }).unwrap(),
  ).rejects.toMatchObject({
    status: 409,
    message: 'INS-2026-1140 has already moved — it is now at Payment Release.',
  });

  const res = await store
    .dispatch(
      api.endpoints.approveAll.initiate({ swId: 'ledgertrace', stage: 6 }),
    )
    .unwrap();
  expect(calls.at(-1).path).toBe(
    '/api/software/ledgertrace/stages/6/approve-all',
  );
  expect(res.moved).toEqual(['INS-2026-1140']);
});

test('one item in full: the figures, the note, and a link for each document', async () => {
  const store = signedInStore();
  const detail = await store
    .dispatch(
      api.endpoints.getItem.initiate({
        swId: 'ledgertrace',
        id: 'INS-2026-1140',
      }),
    )
    .unwrap();
  expect(detail.party).toBe('TRANSASIA BIO-MEDICALS LTD');
  expect(detail.notes).toBe('Reagents for the analyser');
  const facts = Object.fromEntries(detail.facts);
  expect(facts).toMatchObject({
    Reference: 'INS-2026-1140',
    "Supplier's document no.": 'HRT2627V-13967',
    'Invoice date': '14 Oct 2026',
    Due: '21 Nov 2026 · in 2d',
    'GST (5%)': '₹365',
    'To approve now': '₹7,662',
    'Came from': 'AIMS',
  });
  // Nothing to show is left out rather than shown empty
  expect(facts).not.toHaveProperty('TDS withheld');
  expect(facts).not.toHaveProperty('Already paid');
  expect(detail.documents).toEqual([
    {
      id: 'a-0',
      name: 'grn-scan.pdf',
      group: 'Supplier invoice',
      size: '',
      source: 'AIMS',
    },
  ]);

  const url = await store
    .dispatch(
      api.endpoints.createFileLink.initiate({
        swId: 'ledgertrace',
        id: 'INS-2026-1140',
        docId: 'a-0',
      }),
    )
    .unwrap();
  expect(url).toBe('http://localhost:5050/api/files/tok');
  expect(calls.at(-1)).toMatchObject({
    method: 'POST',
    path: '/api/software/ledgertrace/items/INS-2026-1140/files/a-0/link',
    auth: 'Bearer jwt-1',
  });
});

test('the reminder switch is sent to the server with the phone, and again when it changes', async () => {
  const { enablePush, toggleSetting } = require('../src/store/hubThunks');
  const store = signedInStore();
  const devices = () =>
    calls.filter(c => c.path === '/api/devices').map(c => c.body);

  await store.dispatch(enablePush());
  expect(devices()).toEqual([
    { platform: 'ios', token: 'fcm-token-1', reminders: true },
  ]);

  // Switched off on the Alerts tab: the server is told straight away
  store.dispatch(toggleSetting('hourly'));
  await new Promise(resolve => setTimeout(resolve, 20));
  expect(store.getState().hub.settings.hourly).toBe(false);
  expect(devices().at(-1)).toEqual({
    platform: 'ios',
    token: 'fcm-token-1',
    reminders: false,
  });

  // The sound switch is this phone's own business: nothing is sent
  const before = devices().length;
  store.dispatch(toggleSetting('sound'));
  await new Promise(resolve => setTimeout(resolve, 20));
  expect(devices()).toHaveLength(before);
});

test('a token the server no longer accepts signs the app out', async () => {
  const store = signedInStore();
  global.fetch = jest.fn(async () =>
    answer(401, { message: 'Please sign in again.' }),
  );
  await store.dispatch(api.endpoints.getPending.initiate('ledgertrace'));
  expect(store.getState().auth.session).toBeNull();
});
