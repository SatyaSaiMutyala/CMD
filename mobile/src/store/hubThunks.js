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
  detailClosed,
  goneAdded,
  pushSet,
  reminderClosed,
  reminderOpened,
  settingToggled,
  sheetBusySet,
  sheetClosed,
  sheetDoneSet,
  sheetErrorSet,
  sheetOpened,
  toastSet,
} from './hubSlice';
import { swPending, totalPending, visibleItems } from './selectors';

/* What the hub does — every action a screen or the live socket can trigger.
   Each is a Redux thunk: it reads the store, calls the API through RTK Query
   and dispatches the slice actions in hubSlice.js. */

export const CONNECTED = REGISTRY.filter(sw => sw.connected);
const SNOOZE_MS = 15 * 60 * 1000;
export const BANNER_MS = 6000;

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
  // When the list on screen was fetched (shown if a later refresh fails)
  at: result.fulfilledTimeStamp || null,
  error: result.isError
    ? (result.error && result.error.message) || 'Could not load.'
    : null,
  stages: result.data ? result.data.stages : {},
});

const NO_HISTORY = [];

/** { live: { [swId]: { loaded, error, stages } }, history, notifications,
    settings } —
    the `store` object the screens and selectors.js work with. */
export const selectHubStore = createSelector(
  [
    ...CONNECTED.map(sw => api.endpoints.getPending.select(sw.id)),
    api.endpoints.getHistory.select(),
    api.endpoints.getNotifications.select(),
    state => state.hub.settings,
  ],
  (...parts) => {
    const settings = parts.pop();
    const notifications = parts.pop();
    const history = parts.pop();
    const live = {};
    CONNECTED.forEach((sw, i) => {
      live[sw.id] = liveOf(parts[i]);
    });
    return {
      live,
      history: history.data || NO_HISTORY,
      // false until the first answer has arrived (the pages shimmer till then)
      historyLoaded: history.data !== undefined,
      notifications: notifications.data
        ? notifications.data.items
        : NO_HISTORY,
      // more pages on the server, and how many in the whole list are unread
      notificationsMore: !!(notifications.data && notifications.data.hasMore),
      unread: notifications.data ? notifications.data.unread : 0,
      settings,
    };
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

/** The first page of notifications again (newer ones appear at the top) */
export const reloadNotifications = () => dispatch =>
  dispatch(fetchNow('getNotifications', undefined));

/** The next page, added under what is already loaded */
export const moreNotifications = () => (dispatch, getState) => {
  const store = selectHubStore(getState());
  const last = store.notifications[store.notifications.length - 1];
  if (!last || !store.notificationsMore) return Promise.resolve();
  return dispatch(fetchNow('getNotifications', last.ts));
};

const mutate = (endpoint, arg) => async dispatch => {
  try {
    await dispatch(api.endpoints[endpoint].initiate(arg)).unwrap();
    return true;
  } catch (e) {
    return false;
  }
};
// Each resolves to true when the server accepted it
export const readNotification = id => mutate('readNotification', id);
export const readAllNotifications = () => mutate('readAllNotifications');
export const deleteNotification = id => mutate('deleteNotification', id);
export const deleteAllNotifications = () => mutate('deleteAllNotifications');

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
  // It is on the Notifications page too, from now on
  dispatch(reloadNotifications());
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
  dispatch(reloadNotifications());
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

/** Open the confirm sheet for one item (approve / back / reject) or for a
    whole stage ('bulk'). `from` says where it was opened — 'deck' (the swipe
    review), 'list' or 'details' — and decides what a success looks like.
    `count` is how many a 'bulk' would move. */
export const openSheet =
  (type, swId, stage, id, { from = 'list', count = 0 } = {}) =>
  (dispatch, getState) => {
    const sw = findSoftware(swId);
    const st = sw && sw.stages && sw.stages.find(x => x.key === stage);
    if (!st) return;
    if (type === 'bulk') {
      dispatch(sheetOpened({ type, swId, stage, count, from }));
      return;
    }
    const item = visibleItems(selectHubStore(getState()), sw, st).find(
      i => i.id === id,
    );
    if (item) dispatch(sheetOpened({ type, swId, stage, id, item, from }));
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
    The lists and the history refetch by themselves (RTK Query tags); what
    was decided is hidden straight away meanwhile. */
export const confirmSheet = reason => async (dispatch, getState) => {
  const { sheet, sheetBusy } = getState().hub;
  if (!sheet || sheetBusy) return;
  const sw = findSoftware(sheet.swId);
  const st = sw.stages.find(x => x.key === sheet.stage);
  const hide = (ids, counts) =>
    dispatch(
      goneAdded({
        swId: sw.id,
        stage: st.key,
        ids,
        at: Date.now(),
        counts: !!counts,
      }),
    );
  // Back to the list the sheet (and the details page under it) came from
  const close = () => {
    dispatch(sheetClosed());
    if (sheet.from === 'details') dispatch(detailClosed());
  };

  dispatch(sheetBusySet(true));
  dispatch(sheetErrorSet(null));
  try {
    if (sheet.type === 'bulk') {
      const res = await dispatch(
        api.endpoints.approveAll.initiate({ swId: sw.id, stage: st.stage }),
      ).unwrap();
      const moved = res.moved || [];
      hide(moved);
      dispatch(
        toastSet({
          swId: sw.id,
          tone: 'ok',
          text: `Moved ${moved.length} to ${st.next}.`,
        }),
      );
      close();
    } else {
      const it = sheet.item;
      const verb = VERBS[sheet.type];
      const done = await dispatch(
        api.endpoints.decide.initiate({
          swId: sw.id,
          item: { id: it.id, stage: it.stage },
          verb: verb.send,
          reason: typeof reason === 'string' ? reason : '',
        }),
      ).unwrap();
      hide([it.id], true);
      // The source's own word where it has one (AIMS: "Verified" at its first gate)
      const past =
        (done && done.verb) ||
        (sheet.type === 'approve' && st.key === 'rel' ? 'Released' : verb.past);
      const where =
        sheet.type === 'approve'
          ? st.approveDone || `Moved to ${st.next}.`
          : sheet.type === 'back'
          ? `Returned to ${st.back}.`
          : st.rejectDone || 'Returned to Registered.';
      // What people know the item by (a test code, an invoice number)
      const ref = it.ref || it.id;
      // A software's own sentence stands by itself ("PR781. It is live in
      // the catalogue."); the default one continues from the reference
      // ("INS-1140 moved to Tally Entry.")
      const own =
        (sheet.type === 'approve' && st.approveDone) ||
        (sheet.type === 'reject' && st.rejectDone);
      if (sheet.from === 'deck') {
        // The swipe review stays on the sheet and shows the result there
        dispatch(
          sheetDoneSet({
            title: past,
            text: own
              ? `${ref}. ${where} Logged against your name.`
              : `${ref} ${where.charAt(0).toLowerCase()}${where.slice(
                  1,
                )} Logged against your name.`,
          }),
        );
      } else {
        dispatch(
          toastSet({
            swId: sw.id,
            tone: 'ok',
            text: `${past} ${ref}. ${where}`,
            bold: ref,
          }),
        );
        close();
      }
    }
  } catch (e) {
    if (e && e.status === 409) {
      // Someone (or an earlier tap) already actioned it: nothing to retry
      if (sheet.item) hide([sheet.item.id]);
      close();
      dispatch(
        toastSet({
          swId: sw.id,
          tone: 'info',
          text: `${e.message} Nothing was sent again.`,
          bold: sheet.item ? sheet.item.ref || sheet.item.id : undefined,
        }),
      );
    } else {
      dispatch(
        sheetErrorSet({
          // Status 0 = the server was never reached
          title:
            e && e.status === 0
              ? `Couldn't reach ${sw.name}`
              : "That didn't go through",
          text: (e && e.message) || 'Could not complete that. Try again.',
        }),
      );
    }
  } finally {
    dispatch(sheetBusySet(false));
  }
};
