import { createSelector } from '@reduxjs/toolkit';
import { Platform } from 'react-native';
import { REGISTRY, findSoftware } from '../data/registry';
import { openHome, openSoftware } from '../navigation/navigationRef';
import { buzz, chime } from '../services/feedback';
import { registerForPush, registeredPushToken } from '../services/push';
import { api } from './api';
import {
  bannerCleared,
  bannerSet,
  pushSet,
  reminderClosed,
  reminderOpened,
  settingToggled,
  sheetBusySet,
  sheetClosed,
  sheetErrorSet,
  toastSet,
} from './hubSlice';
import { swPending, totalPending, visibleItems } from './selectors';

/* What the hub does — every action a screen or the live socket can trigger.
   Each is a Redux thunk: it reads the store, calls the API through RTK Query
   and dispatches the slice actions in hubSlice.js. */

export const CONNECTED = REGISTRY.filter(sw => sw.connected);
const SNOOZE_MS = 15 * 60 * 1000;
const BANNER_MS = 6000;

// What each sheet type sends to the server, and how it reads afterwards
const VERBS = {
  approve: { send: 'approve', past: 'Approved' },
  back: { send: 'sendback', past: 'Sent back' },
  reject: { send: 'reject', past: 'Rejected' },
};

let bannerTimer = null;
let snoozeTimer = null;

/* ---- the data the screens read ---- */

// One software's cached answer -> what selectors.js expects.
// After a failed refresh RTK Query keeps the last good data and adds the error.
const liveOf = result => ({
  loaded: result.data !== undefined,
  error: result.isError
    ? (result.error && result.error.message) || 'Could not load.'
    : null,
  stages: result.data ? result.data.stages : {},
});

const NO_HISTORY = [];

/** { live: { [swId]: { loaded, error, stages } }, history, settings } —
    the `store` object the screens and selectors.js work with. */
export const selectHubStore = createSelector(
  [
    ...CONNECTED.map(sw => api.endpoints.getPending.select(sw.id)),
    api.endpoints.getHistory.select(),
    state => state.hub.settings,
  ],
  (...parts) => {
    const settings = parts.pop();
    const history = parts.pop();
    const live = {};
    CONNECTED.forEach((sw, i) => {
      live[sw.id] = liveOf(parts[i]);
    });
    return { live, history: history.data || NO_HISTORY, settings };
  },
);

/* ---- fetching ---- */

const fetchNow = (endpoint, arg) => dispatch =>
  dispatch(
    api.endpoints[endpoint].initiate(arg, {
      subscribe: false,
      forceRefetch: true,
    }),
  );

/** Refetch one software's pending list */
export const reload = swId => dispatch => {
  const sw = findSoftware(swId);
  if (!sw || !sw.connected) return Promise.resolve();
  return dispatch(fetchNow('getPending', swId));
};

/** Refetch every connected software; resolves when all have answered */
export const reloadAll = () => dispatch =>
  Promise.all(CONNECTED.map(sw => dispatch(fetchNow('getPending', sw.id))));

export const reloadHistory = () => dispatch =>
  dispatch(fetchNow('getHistory', undefined));

/* ---- banner and reminder ---- */

export const hideBanner = () => dispatch => {
  clearTimeout(bannerTimer);
  dispatch(bannerCleared());
};

export const showBanner = banner => dispatch => {
  dispatch(bannerSet(banner));
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => dispatch(bannerCleared()), BANNER_MS);
};

/** A new approval arrived (from the live socket) */
export const arrival = note => (dispatch, getState) => {
  const sw = findSoftware(note.software);
  chime(false, getState().hub.settings.sound);
  dispatch(
    showBanner({
      mono: sw ? sw.mono : '•',
      title: note.title || 'New approval',
      sub: note.body || (sw ? sw.name : ''),
      swId: sw ? sw.id : null,
    }),
  );
};

/** `force` shows it even when nothing is pending (the "Preview" button) */
export const showReminder = force => (dispatch, getState) => {
  const state = getState();
  if (!force && totalPending(selectHubStore(state)) === 0) return;
  clearTimeout(bannerTimer);
  dispatch(reminderOpened());
  chime(true, state.hub.settings.sound);
  buzz();
};

/** The server's 15-minute reminder: fresh numbers first, then the screen */
export const serverReminder = () => async (dispatch, getState) => {
  if (!getState().hub.settings.hourly) return;
  await dispatch(reloadAll());
  dispatch(showReminder());
};

export const snoozeReminder = () => (dispatch, getState) => {
  dispatch(reminderClosed());
  clearTimeout(snoozeTimer);
  snoozeTimer = setTimeout(() => {
    if (getState().hub.settings.hourly) dispatch(showReminder());
  }, SNOOZE_MS);
};

export const reviewNow = () => (dispatch, getState) => {
  dispatch(reminderClosed());
  const store = selectHubStore(getState());
  const withPending = CONNECTED.filter(sw => swPending(store, sw) > 0);
  if (withPending.length === 1) openSoftware(withPending[0].id);
  else openHome();
};

export const openBanner = () => (dispatch, getState) => {
  const { banner } = getState().hub;
  dispatch(hideBanner());
  if (banner && banner.swId) openSoftware(banner.swId);
};

/** Stop the timers this file started (when the hub is left) */
export const stopTimers = () => () => {
  clearTimeout(bannerTimer);
  clearTimeout(snoozeTimer);
};

/* ---- settings ---- */

export const toggleSetting = name => (dispatch, getState) => {
  dispatch(settingToggled(name));
  if (name === 'sound' && getState().hub.settings.sound) chime(false, true);
  // The reminder switch also decides whether the server sends the reminder
  // to this phone when the app is closed (on Android, the full-screen one)
  if (name === 'hourly') {
    const token = registeredPushToken();
    if (token) dispatch(sendPushToken(token, Platform.OS)).catch(() => {});
  }
};

// "Try it" on the Alerts tab: shows the banner without touching any data
export const previewArrival = () => (dispatch, getState) => {
  chime(false, getState().hub.settings.sound);
  dispatch(
    showBanner({
      mono: 'LT',
      title: 'New approval · ₹28,390',
      sub: 'TENET DIAGNOSTICS CENTRE · LedgerTrace · Pay Approval',
      swId: null,
    }),
  );
};

/* ---- push notifications ---- */

/** Saves this phone's push token on the server, with its reminder switch */
export const sendPushToken = (token, platform) => (dispatch, getState) =>
  dispatch(
    api.endpoints.registerDevice.initiate({
      platform,
      token,
      reminders: !!getState().hub.settings.hourly,
    }),
  ).unwrap();

/** Ask for permission (if needed) and register this phone for push */
export const enablePush = () => async dispatch => {
  const status = await registerForPush((token, platform) =>
    dispatch(sendPushToken(token, platform)),
  );
  dispatch(pushSet(status));
  return status;
};

/* ---- decisions ---- */

/** Confirm the open sheet: send the decision, then say what happened.
    The lists and the history refetch by themselves (RTK Query tags). */
export const confirmSheet = reason => async (dispatch, getState) => {
  const { sheet, sheetBusy } = getState().hub;
  if (!sheet || sheetBusy) return;
  const sw = findSoftware(sheet.swId);
  const st = sw.stages.find(x => x.key === sheet.stage);
  const items = visibleItems(selectHubStore(getState()), sw, st);

  dispatch(sheetBusySet(true));
  dispatch(sheetErrorSet(null));
  try {
    if (sheet.type === 'bulk') {
      const res = await dispatch(
        api.endpoints.approveAll.initiate({ swId: sw.id, stage: st.stage }),
      ).unwrap();
      const moved = res.moved || [];
      dispatch(
        toastSet({ swId: sw.id, text: `Moved ${moved.length} to ${st.next}.` }),
      );
    } else {
      const it = items.find(i => i.id === sheet.id);
      if (!it) {
        dispatch(sheetClosed());
        return;
      }
      const verb = VERBS[sheet.type];
      await dispatch(
        api.endpoints.decide.initiate({
          swId: sw.id,
          item: { id: it.id, stage: it.stage },
          verb: verb.send,
          reason: typeof reason === 'string' ? reason : '',
        }),
      ).unwrap();
      const past =
        sheet.type === 'approve' && st.key === 'rel' ? 'Released' : verb.past;
      const where =
        sheet.type === 'approve'
          ? `Moved to ${st.next}.`
          : sheet.type === 'back'
          ? `Returned to ${st.back}.`
          : 'Returned to Registered.';
      dispatch(toastSet({ swId: sw.id, text: `${past} ${it.id}. ${where}` }));
    }
    dispatch(sheetClosed());
  } catch (e) {
    if (e && e.status === 409) {
      // Someone (or an earlier tap) already actioned it: nothing to retry
      dispatch(sheetClosed());
      dispatch(toastSet({ swId: sw.id, text: e.message }));
    } else {
      dispatch(
        sheetErrorSet(
          (e && e.message) || 'Could not complete that. Try again.',
        ),
      );
    }
  } finally {
    dispatch(sheetBusySet(false));
  }
};
