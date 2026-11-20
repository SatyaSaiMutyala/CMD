import { useEffect, useMemo } from 'react';
import { AppState, Linking } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { findSoftware } from '../data/registry';
import { openHome, openSoftware } from '../navigation/navigationRef';
import { prepareSounds } from '../services/feedback';
import {
  pushStatus,
  watchNotificationTaps,
  watchTokenRefresh,
} from '../services/push';
import { openHubSocket } from '../services/socket';
import { api } from './api';
import { selectToken } from './authSlice';
import {
  detailClosed,
  detailOpened,
  pushSet,
  reminderClosed,
  sheetClosed,
  sheetOpened,
  toastCleared,
} from './hubSlice';
import {
  CONNECTED,
  arrival,
  confirmSheet,
  enablePush,
  openBanner,
  previewArrival,
  reload,
  reloadAll,
  reloadHistory,
  reviewNow,
  selectHubStore,
  sendPushToken,
  serverReminder,
  showReminder,
  snoozeReminder,
  stopTimers,
  toggleSetting,
} from './hubThunks';
import { swPending } from './selectors';

/* The hub while signed in.

   State lives in the Redux store: overlays and settings in hubSlice.js, and
   what is waiting plus the history in the RTK Query cache (api.js). The
   actions are thunks in hubThunks.js.

   <HubProvider> keeps the data live for as long as it is mounted: it holds
   the queries open, listens to the server over the socket, refetches when the
   app comes back to the front, and sets up push notifications and sound.
   Screens read everything through useHub(). */

export function HubProvider({ children }) {
  const dispatch = useDispatch();
  const token = useSelector(selectToken);

  /* ---- the data: keep it loaded, keep it fresh ---- */
  useEffect(() => {
    // Subscribing is what makes RTK Query fetch, cache and auto-refetch these
    const held = [
      ...CONNECTED.map(sw =>
        dispatch(api.endpoints.getPending.initiate(sw.id)),
      ),
      dispatch(api.endpoints.getHistory.initiate()),
    ];

    const nudges = {};
    const stopSocket = openHubSocket(token, {
      // Several changes often land together (a column moved at once): one refetch
      onChanged: ({ software }) => {
        const ids = software ? [software] : CONNECTED.map(sw => sw.id);
        ids.forEach(id => {
          clearTimeout(nudges[id]);
          nudges[id] = setTimeout(() => dispatch(reload(id)), 350);
        });
      },
      onArrival: note => dispatch(arrival(note)),
      onReminder: () => dispatch(serverReminder()),
      onReconnect: () => dispatch(reloadAll()),
    });

    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') {
        dispatch(reloadAll());
        dispatch(reloadHistory());
      }
    });

    return () => {
      held.forEach(query => query.unsubscribe());
      stopSocket();
      appState.remove();
      Object.values(nudges).forEach(clearTimeout);
      dispatch(stopTimers());
    };
  }, [dispatch, token]);

  /* ---- push notifications and sound ---- */
  useEffect(() => {
    let live = true;
    prepareSounds();
    dispatch(enablePush());
    const stopRefresh = watchTokenRefresh((pushToken, platform) =>
      dispatch(sendPushToken(pushToken, platform)),
    );

    // A tap or a link can arrive before the screens exist (it started the
    // app), so the navigation is retried until it is ready.
    const open = swId => {
      dispatch(reloadAll());
      let tries = 0;
      const go = () => {
        if (!live) return;
        const sw = swId && findSoftware(swId);
        if (sw ? openSoftware(sw.id) : openHome()) return;
        tries += 1;
        if (tries < 20) setTimeout(go, 150);
      };
      go();
    };
    // A tapped notification opens the software it was about
    const stopTaps = watchNotificationTaps(open);

    // Android's full-screen reminder opens the app with this link when the
    // CMD taps "Review now" there (android/.../reminder/ReminderActivity.kt).
    // Straight to the software if only one has something waiting.
    const openPending = async () => {
      dispatch(reminderClosed());
      await dispatch(reloadAll());
      const store = dispatch((_, getState) => selectHubStore(getState()));
      const withPending = CONNECTED.filter(sw => swPending(store, sw) > 0);
      open(withPending.length === 1 ? withPending[0].id : null);
    };
    const onLink = url => {
      if (url && String(url).startsWith('cmdhub://review')) openPending();
    };
    Linking.getInitialURL()
      .then(onLink)
      .catch(() => {});
    const links = Linking.addEventListener('url', e => onLink(e.url));

    // Permission may be changed in the phone's settings while the app is away
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') {
        pushStatus().then(status => live && dispatch(pushSet(status)));
      }
    });

    return () => {
      live = false;
      stopRefresh();
      stopTaps();
      links.remove();
      appState.remove();
    };
  }, [dispatch]);

  return children;
}

/** Everything a screen needs from the hub:
      store        { live, history, settings } — read it with selectors.js
      detail, sheet, sheetBusy, sheetError, toast, banner, remindOpen, push
      and the actions below. The actions keep the same identity between
      renders, so they are safe to use inside effects. */
export function useHub() {
  const dispatch = useDispatch();
  const store = useSelector(selectHubStore);
  const hub = useSelector(state => state.hub);

  const actions = useMemo(
    () => ({
      reload: swId => dispatch(reload(swId)),
      openSheet: (type, swId, stage, id) =>
        dispatch(sheetOpened({ type, swId, stage, id })),
      closeSheet: () => dispatch(sheetClosed()),
      // One item in full, with its documents
      openDetail: (swId, stage, id) =>
        dispatch(detailOpened({ swId, stage, id })),
      closeDetail: () => dispatch(detailClosed()),
      confirmSheet: reason => dispatch(confirmSheet(reason)),
      clearToast: () => dispatch(toastCleared()),

      toggleSetting: name => dispatch(toggleSetting(name)),
      enablePush: () => dispatch(enablePush()),
      previewArrival: () => dispatch(previewArrival()),
      previewReminder: () => dispatch(showReminder(true)),

      openBanner: () => dispatch(openBanner()),
      dismissReminder: () => dispatch(reminderClosed()),
      snoozeReminder: () => dispatch(snoozeReminder()),
      reviewNow: () => dispatch(reviewNow()),
    }),
    [dispatch],
  );

  return {
    store,
    detail: hub.detail,
    sheet: hub.sheet,
    sheetBusy: hub.sheetBusy,
    sheetError: hub.sheetError,
    toast: hub.toast,
    banner: hub.banner,
    remindOpen: hub.remindOpen,
    push: hub.push,
    ...actions,
  };
}
