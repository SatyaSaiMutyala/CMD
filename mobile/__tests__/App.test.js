/**
 * @format
 */

import React from 'react';
import { AccessibilityInfo, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import { api } from '../src/store/api';
import { sessionSet } from '../src/store/authSlice';
import { changePassword } from '../src/store/authThunks';
import { makeStore } from '../src/store/store';

// The camera is native: the tests answer for it
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
}));
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

// Several tests go through whole screens, each with a slide that takes real
// time. On a busy computer (a native build running alongside) that can pass
// Jest's five seconds, and a test that times out carries on in the background
// and upsets the ones after it.
jest.setTimeout(30000);

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
    return String(body.next || '').length >= 8
      ? answer(200, { token: 'jwt-2', user: USER })
      : answer(400, { message: 'Use at least 8 characters.' });
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
  // The slide-to-confirm knob cannot be dragged in a test. With a screen
  // reader on it can be activated instead, which is what `slide` below does.
  jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(true);
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
  // The sign-in bar is slid, not tapped
  await slide(app);
};

// A store that is already signed in, for testing the data layer on its own
const signedInStore = () => {
  const store = makeStore();
  store.dispatch(sessionSet({ token: 'jwt-1', user: USER }));
  return store;
};

test('starts on the login screen and rejects a bad form or a wrong password', async () => {
  const app = await start();
  expect(textOf(app.toJSON())).toContain('Slide to sign in');
  expect(textOf(app.toJSON())).toContain('Authorized access only');
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
  expect(text).toContain('Venkata');
  expect(text).toContain('WAITING FOR YOU');
  expect(text).toContain('2pending');
  expect(text).toContain('Start swipe review');
  expect(text).toContain('LedgerTrace');
  expect(text).toContain('5/5Systems connected');
  expect(text).toContain('eDOS');
  expect(text).toContain('Sales Pulse 365');

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
  expect(text).toContain('WAITING FOR YOU');
  expect(text).toContain('2pending');
  expect(calls.some(c => c.path === '/api/auth/me')).toBe(true);
  expect(calls.some(c => c.path === '/api/auth/login')).toBe(false);
  await act(async () => app.unmount());
});

// A page that has just been opened shimmers while its list is fetched: this
// waits for the real cards
const opened = () =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, 700));
  });

// Presses the first thing on screen that carries this accessibility label
const press = async (app, label) => {
  await act(async () => {
    app.root.findAllByProps({ accessibilityLabel: label })[0].props.onPress();
  });
  await settle();
};

// What a screen reader does in place of sliding the knob to the end (the
// slider on top: the home page, with its own, stays mounted underneath)
const slide = async app => {
  await act(async () => {
    app.root
      .findAll(node => typeof node.props.onAccessibilityAction === 'function')
      .at(-1)
      .props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } });
  });
  // The knob glides to the end before the decision is sent
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 600));
  });
  await settle();
};

test('the swipe review: approve opens the sheet, and only the slide sends it', async () => {
  const app = await start();
  // The bar on the home card is slid, not tapped
  await slide(app);
  await opened();

  // The first stage with something waiting, one card at a time
  let text = textOf(app.toJSON());
  expect(text).toContain('Swipe right to approve · left to send back');
  expect(text).toContain('LT · Pay Approval');
  expect(text).toContain('TRANSASIA BIO-MEDICALS LTD');
  expect(text).toContain('AMOUNT TO APPROVE');
  expect(text).toContain('1 of 2');

  await press(app, 'Approve');
  text = textOf(app.toJSON());
  expect(text).toContain('APPROVE PAYMENT');
  expect(text).toContain('NEXT STAGE');
  expect(text).toContain('Payment Release');
  expect(text).toContain('Slide to approve ₹7,662');
  // Opening the sheet sends nothing
  expect(calls.some(c => c.method === 'POST' && /approve/.test(c.path))).toBe(
    false,
  );

  await slide(app);
  expect(
    calls.find(
      c => c.path === '/api/software/ledgertrace/items/INS-2026-1140/approve',
    ),
  ).toMatchObject({ method: 'POST', body: { stage: 6 }, auth: 'Bearer jwt-1' });
  text = textOf(app.toJSON());
  expect(text).toContain('Approved');
  expect(text).toContain(
    'INS-2026-1140 moved to Payment Release. Logged against your name.',
  );
  expect(text).toContain('Next approval');
  await act(async () => app.unmount());
});

test('the list view: every item of the stage, move all, and a send-back with its reason', async () => {
  const app = await start();
  await press(app, 'Open LedgerTrace, 2 pending');
  await opened();

  let text = textOf(app.toJSON());
  expect(text).toContain('Move all 2 to Payment Release');
  expect(text).toContain('Swipe a row → approve · ← send back');
  expect(text).toContain('ARKA BIO SOLUTIONS');
  expect(text).toContain('4d overdue');
  expect(text).toContain('Balance of a ₹62,559 invoice');

  await press(app, 'Send back INS-2026-1140');
  text = textOf(app.toJSON());
  expect(text).toContain('SEND BACK');
  expect(text).toContain('Release Queue');
  expect(text).toContain('Slide to send back');
  await act(async () => {
    app.root
      .findByProps({ accessibilityLabel: 'Reason for sending back · optional' })
      .props.onChangeText('Hold till month end');
  });
  await slide(app);
  expect(
    calls.find(
      c => c.path === '/api/software/ledgertrace/items/INS-2026-1140/sendback',
    ),
  ).toMatchObject({
    method: 'POST',
    body: { stage: 6, reason: 'Hold till month end' },
  });
  // Back on the list, with what happened said above it
  text = textOf(app.toJSON());
  expect(text).toContain('Sent back INS-2026-1140. Returned to Release Queue.');
  expect(text).not.toContain('Slide to send back');
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

test('changing the password sends only the new one, and a refusal is reported', async () => {
  const store = signedInStore();
  await expect(store.dispatch(changePassword('short'))).rejects.toThrow(
    'Use at least 8 characters.',
  );
  expect(store.getState().auth.session.token).toBe('jwt-1');

  await store.dispatch(changePassword('new-password-1'));
  expect(store.getState().auth.session.token).toBe('jwt-2');
  expect(calls.at(-1).body).toEqual({ next: 'new-password-1' });
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

test('a TrustMark asset: two tabs, the file shown in place, a zip looked inside', async () => {
  const { pendingFrom, detailFrom } = require('../src/data/adapter');
  const { zipEntryId } = require('../src/components/overlays/ZipList');
  const card = {
    id: '6b013f9fb759e728085b66ee',
    stage: 'review',
    name: 'Diwali hoarding',
    path: 'Demand Generation / Out-of-Home / Hoarding',
    type: 'Hoarding',
    dist: 'Public',
    version: 2,
    revisions: 3,
    comments: 1,
    by: 'Asha',
    date: '2026-11-20',
    file: { name: 'hero.pdf', ext: 'PDF', size: '1.5 MB', kind: 'pdf' },
    flags: ['Expires in 12 days (2026-12-02) — plan the replacement.'],
  };
  const data = pendingFrom('prism', {
    pending: { draft: 1, review: 1, total: 1 },
    stages: [
      { key: 'draft', count: 1, items: [{ ...card, stage: 'draft', flags: [] }] },
      { key: 'review', count: 1, items: [card] },
    ],
  });
  expect(data.stages.review.items[0]).toMatchObject({
    ref: 'PDF · v2',
    party: 'Diwali hoarding',
    amount: 'Hoarding',
    note: 'Uploaded by Asha',
    auto: 'Demand Generation / Out-of-Home / Hoarding',
    tags: ['PUBLIC', '1.5 MB', '3 FILES', '1 COMMENT', 'FLAGGED'],
    due: 'Sent 20 Nov',
    approve: 'Approve',
    canSendBack: true,
    canReject: false,
  });
  // still being revised: send it for approval, or say what should change
  expect(data.stages.draft.items[0]).toMatchObject({
    approve: 'Send for approval',
    canSendBack: false,
    canReject: true,
    rejectLabel: 'Feedback',
  });

  const full = detailFrom('prism', {
    item: {
      ...card,
      stage_name: 'Approval',
      facts: [{ label: 'Distribution', value: 'Public' }],
      preview: { kind: 'pdf', url: 'https://storage.test/hero.pdf', poster: null },
      documents: [
        { id: 'master', name: 'hero.pdf', group: 'Current file · version 2, revision 1', size: '1.5 MB', kind: 'pdf', by: 'Ravi', note: 'new headline' },
        { id: 'v1r1', name: 'kit.zip', group: 'version 1, revision 1', size: '8 MB', kind: 'zip', by: 'Asha' },
      ],
      activity: [{ at: '2026-11-19T12:00:00.000Z', who: 'Meera', msg: 'v1 · Make the logo bigger' }],
    },
  });
  expect(full.facts[0]).toEqual([
    'Governance flag',
    'Expires in 12 days (2026-12-02) — plan the replacement.',
  ]);
  expect(full.preview).toEqual({ kind: 'pdf', url: 'https://storage.test/hero.pdf', poster: null });
  expect(full.documents.map(d => [d.id, d.kind, d.note])).toEqual([
    ['master', 'pdf', 'new headline'],
    ['v1r1', 'zip', ''],
  ]);
  expect(full.activity[0].msg).toBe('v1 · Make the logo bigger');

  // a file inside a zip is asked for by the zip's id and its path
  expect(zipEntryId('master', 'brand/readme.txt')).toBe(
    `zip~master~${Buffer.from('brand/readme.txt').toString('base64url')}`,
  );
  expect(zipEntryId('v1r1', 'लोगो/प्राथमिक.svg')).toBe(
    `zip~v1r1~${Buffer.from('लोगो/प्राथमिक.svg').toString('base64url')}`,
  );
});

test('a Sales Pulse contract is signed with a live selfie; a price quote is approved or rejected', async () => {
  const { pendingFrom, detailFrom } = require('../src/data/adapter');
  const contract = {
    id: 'c-7',
    stage: 'contract',
    kind: 'contract',
    ref: 'TL/SP/2026/0007',
    name: 'SUNRISE DIAGNOSTICS',
    title: 'Lab Services Agreement',
    type: 'Service agreement',
    signed: 1,
    signatories: 1,
    at: '2026-11-20T10:00:00+05:30',
    amount_text: '₹5,00,000',
    needs_selfie: true,
  };
  const quote = {
    id: 'q-42',
    stage: 'quote',
    kind: 'quote',
    ref: 'PRQ-2026-0042',
    name: 'SUNRISE DIAGNOSTICS',
    code: 'TS0042PP',
    type: 'Test',
    variant: 'Test rate card',
    by: 'Asha Rao',
    at: '2026-11-20T00:00:00+05:30',
    line_count: 2,
    amount_text: '₹1,20,000',
  };
  const data = pendingFrom('sp365', {
    pending: { contract: 1, quote: 1, total: 2 },
    stages: [
      { key: 'contract', count: 1, items: [contract] },
      { key: 'quote', count: 1, items: [quote] },
    ],
  });
  expect(data.total).toBe(2);
  expect(data.stages.contract.items[0]).toMatchObject({
    id: 'c-7',
    ref: 'TL/SP/2026/0007',
    party: 'SUNRISE DIAGNOSTICS',
    amount: '₹5,00,000',
    note: '1 of 1 client signatory has signed',
    due: 'Sent 20 Nov',
    // approving signs it: the sheet asks for the selfie first
    needsSelfie: true,
    // a contract goes back for changes; it is not rejected outright
    canSendBack: true,
    canReject: false,
  });
  expect(data.stages.quote.items[0]).toMatchObject({
    id: 'q-42',
    ref: 'PRQ-2026-0042',
    amount: '₹1,20,000',
    note: 'Raised by Asha Rao',
    tags: ['TEST', '2 TESTS', 'TS0042PP'],
    canSendBack: false,
    canReject: true,
  });
  expect(data.stages.quote.items[0].needsSelfie).toBeUndefined();

  const full = detailFrom('sp365', {
    item: {
      ...contract,
      stage_name: 'Pending Approval',
      facts: [{ label: 'Credit limit', value: '₹2,00,000' }],
      lines: [],
      documents: [{ id: 'contract', name: 'Contract (PDF)', group: 'Contract' }],
    },
  });
  expect(full.facts).toEqual([['Credit limit', '₹2,00,000']]);
  expect(full.documents[0]).toMatchObject({ id: 'contract', name: 'Contract (PDF)' });
});

test('the selfie is a fresh front-camera photo, and a closed or refused camera says so', async () => {
  const picker = require('react-native-image-picker');
  const { takeSelfie } = require('../src/services/selfie');

  picker.launchCamera.mockResolvedValueOnce({
    assets: [{ base64: 'QUJD', type: 'image/jpeg' }],
  });
  expect(await takeSelfie()).toEqual({ photo: 'data:image/jpeg;base64,QUJD' });
  expect(picker.launchCamera.mock.calls[0][0]).toMatchObject({
    mediaType: 'photo',
    cameraType: 'front',
    includeBase64: true,
    saveToPhotos: false,
  });

  picker.launchCamera.mockResolvedValueOnce({ didCancel: true });
  expect(await takeSelfie()).toEqual({ cancelled: true });

  picker.launchCamera.mockResolvedValueOnce({ errorCode: 'permission' });
  expect((await takeSelfie()).error).toMatch(/Camera access is required/);

  // an app built before the camera was added
  picker.launchCamera.mockRejectedValueOnce(new Error('native module missing'));
  expect((await takeSelfie()).error).toMatch(/Update the app/);
});

test('an AIMS item becomes an approval item: verify, approve or reject', async () => {
  const { pendingFrom, detailFrom } = require('../src/data/adapter');
  const order = {
    id: 'YXBwclR4bnxQTy8yNi0yNy8wMDAwMQ',
    stage: 'approve',
    queue: 'doc',
    kind: 'PO — purchase order',
    ref: 'PO/26-27/00001',
    name: 'ACME DIAGNOSTICS',
    detail: '1 lines · IGST',
    by: 'Sita',
    date: '20 Nov 26',
    urgent: false,
    amount_text: '₹1,20,000',
    can_verify: false,
  };
  const item = {
    id: 'YXBwck1hc3RlcnxSRzAwMg',
    stage: 'verify',
    queue: 'master',
    kind: 'Item Master',
    ref: 'RG002',
    name: 'FREE T4',
    detail: 'Reagents',
    by: '',
    date: '',
    urgent: true,
    amount_text: '',
    can_verify: true,
  };
  const data = pendingFrom('aims', {
    pending: { master: 1, indent: 0, doc: 1, adj: 0, total: 2 },
    stages: [
      { key: 'master', count: 1, items: [item] },
      { key: 'doc', count: 1, items: [order] },
    ],
  });
  expect(data.total).toBe(2);
  expect(data.stages.doc.items[0]).toMatchObject({
    // AIMS's own id is what it is asked to decide; people know the order number
    id: 'YXBwclR4bnxQTy8yNi0yNy8wMDAwMQ',
    ref: 'PO/26-27/00001',
    stage: 'approve',
    party: 'ACME DIAGNOSTICS',
    amount: '₹1,20,000',
    eyebrow: 'PURCHASE ORDER',
    note: 'Raised by Sita',
    tags: ['TO APPROVE'],
    due: 'Sent 20 Nov 26',
    approve: 'Approve',
    // already verified: it can only be approved
    canVerify: false,
    canReject: true,
    canSendBack: false,
    plainSlide: true,
  });
  // No amount on a master record: the card says what it is, and what to do
  expect(data.stages.master.items[0]).toMatchObject({
    stage: 'verify',
    party: 'FREE T4',
    amount: 'Item Master',
    eyebrow: 'TO VERIFY',
    tags: ['URGENT', 'TO VERIFY'],
    // still at the first sign-off: verify only, or approve outright
    approve: 'Approve',
    canVerify: true,
    due: '',
  });

  const full = detailFrom('aims', {
    item: {
      ...order,
      stage_name: 'Document Approval',
      facts: [{ label: 'Vendor', value: 'ACME DIAGNOSTICS' }],
      lines: ['RG001 · TOTAL T3 · 10 · ₹1,20,000'],
      more_lines: 2,
      notes: '',
      activity: [],
    },
  });
  expect(full.stageName).toBe('Document Approval');
  expect(full.facts).toEqual([
    ['Vendor', 'ACME DIAGNOSTICS'],
    ['Line 1', 'RG001 · TOTAL T3 · 10 · ₹1,20,000'],
    ['More lines', '2 more in AIMS'],
  ]);
  expect(full.documents).toEqual([]);
});

test('an eDOS request becomes an approval item: approve or reject, no send back', async () => {
  const { pendingFrom, detailFrom } = require('../src/data/adapter');
  const card = {
    id: 41,
    stage: 1,
    code: 'PR781',
    name: 'Culture and Sensitivity (Aerobic)',
    action: 'create',
    note: 'Addition of sample type Pus Swab.',
    by: 'Asha',
    at: '2026-11-20T10:00:00+05:30',
    mrp_text: '₹1,100',
    change_count: 3,
    variants: 2,
    attachments: 1,
    missing_test: false,
  };
  const data = pendingFrom('edos', {
    pending: { req: 2, total: 2 },
    stages: [
      {
        key: 'req',
        count: 2,
        items: [
          card,
          { ...card, id: 42, code: 'BC900', action: 'update', mrp_text: '' },
        ],
      },
    ],
  });
  expect(data.total).toBe(2);
  const [added, edited] = data.stages.req.items;
  expect(added).toMatchObject({
    // eDOS is asked to decide request 41; people know it as PR781
    id: '41',
    ref: 'PR781',
    stage: 1,
    party: 'Culture and Sensitivity (Aerobic)',
    decides: '₹1,100',
    eyebrow: 'NEW TEST · MRP',
    note: 'Requested by Asha',
    auto: 'Addition of sample type Pus Swab.',
    tags: ['NEW TEST', '+2 LOCATIONS', '1 FILE'],
    type: 'New test',
    due: 'Sent 20 Nov',
    canReject: true,
    canSendBack: false,
    plainSlide: true,
  });
  // An edit has no price of its own: what matters is how much it changes
  expect(edited).toMatchObject({
    id: '42',
    decides: '3 changes',
    eyebrow: 'EDIT TO A LIVE TEST',
    type: 'Edit',
  });

  const detail = detailFrom('edos', {
    ok: true,
    request: {
      ...card,
      action: 'update',
      stage_name: 'Test Approval',
      changes: [{ field: 'MRP', from: '₹900', to: '₹1,100' }],
      documents: [
        { id: 'a-7', name: 'method.pdf', group: 'Method sheet', size: '2 KB', source: 'eDOS' },
      ],
    },
  });
  expect(detail).toMatchObject({
    id: '41',
    party: 'Culture and Sensitivity (Aerobic)',
    factsTitle: 'What changes',
    facts: [['MRP', '₹900  →  ₹1,100']],
    notes: 'Addition of sample type Pus Swab.\nRequested by Asha.',
    documents: [{ id: 'a-7', name: 'method.pdf', group: 'Method sheet' }],
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

test('the app knows its own version: appVersion.js follows build.gradle', () => {
  // Gradle rewrites the file before every Android build (scripts/sync-version.js);
  // this catches a stale copy in the repository
  const fs = require('fs');
  const path = require('path');
  const gradle = fs.readFileSync(
    path.join(__dirname, '../android/app/build.gradle'),
    'utf8',
  );
  const v = require('../src/update/appVersion');
  expect(v.APP_VERSION).toBe(gradle.match(/versionName\s+"([^"]+)"/)[1]);
  expect(v.ANDROID_PACKAGE_ID).toBe(
    gradle.match(/applicationId\s+"([^"]+)"/)[1],
  );
});

test('the version live on Google Play is read from either page layout, or not at all', async () => {
  const { fetchPlayStoreVersion } = require('../src/update/playStoreVersion');
  const page = (body, ok = true) =>
    jest.fn(async () => ({ ok, text: async () => body }));

  global.fetch = page('xx[[["1.0.4"]],[[[33]]]]yy');
  await expect(fetchPlayStoreVersion()).resolves.toBe('1.0.4');
  expect(global.fetch.mock.calls[0][0]).toContain('id=com.app.approvalhub');

  global.fetch = page('<div>Current Version</div><span class="x">2.3.1</span>');
  await expect(fetchPlayStoreVersion()).resolves.toBe('2.3.1');

  // A redesigned page, or the app not published yet: no answer, so no block
  global.fetch = page('<html>nothing useful</html>');
  await expect(fetchPlayStoreVersion()).resolves.toBeNull();
  global.fetch = page('not found', false);
  await expect(fetchPlayStoreVersion()).resolves.toBeNull();
});

test('version numbers compare part by part, as numbers', () => {
  const { isNewer } = require('../src/update/useForceUpdate');
  expect(isNewer('1.10', '1.9')).toBe(true);
  expect(isNewer('1.0.1', '1.0')).toBe(true);
  expect(isNewer('2.0', '1.9.9')).toBe(true);
  expect(isNewer('1.0', '1.0')).toBe(false);
  expect(isNewer('1.0', '1.0.0')).toBe(false);
  expect(isNewer('1.9', '1.10')).toBe(false);
});
