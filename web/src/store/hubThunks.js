import { createSelector } from '@reduxjs/toolkit'
import { REGISTRY, findSoftware } from '../data/registry.js'
import { chime, notify } from '../lib/alerts.js'
import { pushStatus, registerForPush } from '../lib/push.js'
import { swPending, totalPending, visibleItems } from '../state/selectors.js'
import { api } from './api.js'
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
} from './hubSlice.js'

/* What the hub does — every action a page or the live socket can trigger.
   Each is a Redux thunk: it reads the store, calls the API through RTK Query
   and dispatches the slice actions in hubSlice.js. */

export const CONNECTED = REGISTRY.filter((sw) => sw.connected)
const SNOOZE_MS = 15 * 60 * 1000
const BANNER_MS = 6000

// What each sheet type sends to the server, and how it reads afterwards
const VERBS = {
  approve: { send: 'approve', past: 'Approved' },
  // AIMS only: the first of its two sign-offs
  verify: { send: 'verify', past: 'Verified' },
  back: { send: 'sendback', past: 'Sent back' },
  reject: { send: 'reject', past: 'Rejected' },
}

let bannerTimer = null
let snoozeTimer = null

/* ---- the data the pages read ---- */

// One software's cached answer -> what selectors.js expects.
// After a failed refresh RTK Query keeps the last good data and adds the error.
const liveOf = (result) => ({
  loaded: result.data !== undefined,
  error: result.isError ? (result.error && result.error.message) || 'Could not load.' : null,
  stages: result.data ? result.data.stages : {},
})

const NO_HISTORY = []

/** { live: { [swId]: { loaded, error, stages } }, history, notifications,
    notificationsLoaded, notificationsMore, unread, settings } —
    the `store` object the pages and selectors.js work with. */
export const selectHubStore = createSelector(
  [
    ...CONNECTED.map((sw) => api.endpoints.getPending.select(sw.id)),
    api.endpoints.getHistory.select(),
    api.endpoints.getNotifications.select(),
    (state) => state.hub.settings,
  ],
  (...parts) => {
    const settings = parts.pop()
    const notifications = parts.pop()
    const history = parts.pop()
    const live = {}
    CONNECTED.forEach((sw, i) => {
      live[sw.id] = liveOf(parts[i])
    })
    return {
      live,
      history: history.data || NO_HISTORY,
      notifications: notifications.data ? notifications.data.items : NO_HISTORY,
      // false until the first answer has arrived
      notificationsLoaded: notifications.data !== undefined,
      // more pages on the server, and how many in the whole list are unread
      notificationsMore: !!(notifications.data && notifications.data.hasMore),
      unread: notifications.data ? notifications.data.unread : 0,
      settings,
    }
  },
)

/** The software to open from a reminder: the only one with something waiting, or none */
export const selectOnlyPending = (state) => {
  const store = selectHubStore(state)
  const withPending = CONNECTED.filter((sw) => swPending(store, sw) > 0)
  return withPending.length === 1 ? withPending[0].id : null
}

/* ---- fetching ---- */

const fetchNow = (endpoint, arg) => (dispatch) =>
  dispatch(api.endpoints[endpoint].initiate(arg, { subscribe: false, forceRefetch: true }))

/** Refetch one software's pending list */
export const reload = (swId) => (dispatch) => {
  const sw = findSoftware(swId)
  if (!sw || !sw.connected) return Promise.resolve()
  return dispatch(fetchNow('getPending', swId))
}

/** Refetch every connected software; resolves when all have answered */
export const reloadAll = () => (dispatch) => Promise.all(CONNECTED.map((sw) => dispatch(fetchNow('getPending', sw.id))))

export const reloadHistory = () => (dispatch) => dispatch(fetchNow('getHistory', undefined))

/** The first page of notifications again (newer ones appear at the top) */
export const reloadNotifications = () => (dispatch) => dispatch(fetchNow('getNotifications', undefined))

/** The next page, added under what is already loaded */
export const moreNotifications = () => (dispatch, getState) => {
  const store = selectHubStore(getState())
  const last = store.notifications[store.notifications.length - 1]
  if (!last || !store.notificationsMore) return Promise.resolve()
  return dispatch(fetchNow('getNotifications', last.ts))
}

// Each resolves to true when the server accepted it
const mutate = (endpoint, arg) => async (dispatch) => {
  try {
    await dispatch(api.endpoints[endpoint].initiate(arg)).unwrap()
    return true
  } catch {
    return false
  }
}
export const readNotification = (id) => mutate('readNotification', id)
export const readAllNotifications = () => mutate('readAllNotifications')
export const removeNotification = (id) => mutate('removeNotification', id)
export const removeAllNotifications = () => mutate('removeAllNotifications')

/* ---- snackbar and reminder ---- */

export const hideBanner = () => (dispatch) => {
  clearTimeout(bannerTimer)
  dispatch(bannerCleared())
}

export const showBanner = (banner) => (dispatch) => {
  dispatch(bannerSet(banner))
  clearTimeout(bannerTimer)
  bannerTimer = setTimeout(() => dispatch(bannerCleared()), BANNER_MS)
}

/** A new approval arrived (from the live socket) */
export const arrival = (note) => (dispatch, getState) => {
  const sw = findSoftware(note.software)
  const title = note.title || 'New approval'
  const sub = note.body || (sw ? sw.name : '')
  // It is in the notifications list too, from now on
  dispatch(reloadNotifications())
  chime(false, getState().hub.settings.sound)
  dispatch(showBanner({ mono: sw ? sw.mono : '•', title, sub, swId: sw ? sw.id : null }))
  notify(title, sub)
}

/** `force` shows it even when nothing is pending (the "Preview" button) */
export const showReminder = (force) => (dispatch, getState) => {
  const state = getState()
  const total = totalPending(selectHubStore(state))
  if (!force && total === 0) return
  clearTimeout(bannerTimer)
  dispatch(reminderOpened())
  chime(true, state.hub.settings.sound)
  try {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200])
  } catch {
    /* vibration is best-effort */
  }
  notify(`${total} ${total === 1 ? 'approval' : 'approvals'} pending`, 'Open CMD Approval Hub to review.')
}

/** The server's 15-minute reminder: fresh numbers first, then the screen */
export const serverReminder = () => async (dispatch, getState) => {
  dispatch(reloadNotifications())
  if (!getState().hub.settings.hourly) return
  await dispatch(reloadAll())
  dispatch(showReminder())
}

export const snoozeReminder = () => (dispatch, getState) => {
  dispatch(reminderClosed())
  clearTimeout(snoozeTimer)
  snoozeTimer = setTimeout(() => {
    if (getState().hub.settings.hourly) dispatch(showReminder())
  }, SNOOZE_MS)
}

/** Stop the timers this file started (when the hub is left) */
export const stopTimers = () => () => {
  clearTimeout(bannerTimer)
  clearTimeout(snoozeTimer)
}

/* ---- settings ---- */

export const toggleSetting = (name) => (dispatch, getState) => {
  dispatch(settingToggled(name))
  if (name === 'sound' && getState().hub.settings.sound) chime(false, true)
  // The reminder switch also decides whether the server pushes the reminder
  // to this browser when no hub tab is open: tell it (a no-op if push is off)
  if (name === 'hourly') dispatch(enablePush(false))
}

// "Try it" on the Alerts page: shows the snackbar without touching any data
export const previewArrival = () => (dispatch, getState) => {
  chime(false, getState().hub.settings.sound)
  dispatch(
    showBanner({
      mono: 'LT',
      title: 'New approval · ₹28,390',
      sub: 'TENET DIAGNOSTICS CENTRE · LedgerTrace · Pay Approval',
      swId: null,
    }),
  )
}

/* ---- browser push ---- */

/** Register this browser for push. `ask` = may show the permission prompt. */
export const enablePush =
  (ask = false) =>
  async (dispatch, getState) => {
    const status = await registerForPush({
      ask,
      getKey: () =>
        dispatch(api.endpoints.getWebPushKey.initiate(undefined, { subscribe: false, forceRefetch: true })).unwrap(),
      // Sent with this browser's reminder switch, so the server knows whether to send the reminder here
      sendSubscription: (subscription) =>
        dispatch(
          api.endpoints.registerDevice.initiate({ subscription, reminders: !!getState().hub.settings.hourly }),
        ).unwrap(),
    })
    dispatch(pushSet(status))
    return status
  }

/** Permission may have been changed in the browser's settings meanwhile */
export const refreshPushStatus = () => async (dispatch) => dispatch(pushSet(await pushStatus()))

/* ---- decisions ---- */

/** Confirm the open sheet: send the decision, then say what happened.
    The lists and the history refetch by themselves (RTK Query tags). */
export const confirmSheet = (reason) => async (dispatch, getState) => {
  const { sheet, sheetBusy } = getState().hub
  if (!sheet || sheetBusy) return
  const sw = findSoftware(sheet.swId)
  const st = sw.stages.find((x) => x.key === sheet.stage)
  const items = visibleItems(selectHubStore(getState()), sw, st)

  dispatch(sheetBusySet(true))
  dispatch(sheetErrorSet(null))
  try {
    if (sheet.type === 'bulk') {
      const res = await dispatch(api.endpoints.approveAll.initiate({ swId: sw.id, stage: st.stage })).unwrap()
      const moved = res.moved || []
      dispatch(toastSet({ swId: sw.id, text: `Moved ${moved.length} to ${st.next}.` }))
    } else {
      const it = items.find((i) => i.id === sheet.id)
      if (!it) {
        dispatch(sheetClosed())
        return
      }
      const verb = VERBS[sheet.type]
      const done = await dispatch(
        api.endpoints.decide.initiate({
          swId: sw.id,
          item: { id: it.id, stage: it.stage },
          verb: verb.send,
          reason: typeof reason === 'string' ? reason : '',
        }),
      ).unwrap()
      // The source's own word where it has one (AIMS: "Verified" at its first gate)
      const past = (done && done.verb) || (sheet.type === 'approve' && st.key === 'rel' ? 'Released' : verb.past)
      const where =
        sheet.type === 'approve'
          ? st.approveDone || `Moved to ${st.next}.`
          : sheet.type === 'verify'
            ? st.verifyDone || 'It now waits for approval.'
            : sheet.type === 'back'
              ? `Returned to ${st.back}.`
              : st.rejectDone || 'Returned to Registered.'
      // What people know the item by (a test code, an invoice number)
      dispatch(toastSet({ swId: sw.id, text: `${past} ${it.ref || it.id}. ${where}` }))
    }
    dispatch(sheetClosed())
  } catch (e) {
    if (e && e.status === 409) {
      // Someone (or an earlier click) already actioned it: nothing to retry
      dispatch(sheetClosed())
      dispatch(toastSet({ swId: sw.id, text: e.message }))
    } else {
      dispatch(sheetErrorSet((e && e.message) || 'Could not complete that. Try again.'))
    }
  } finally {
    dispatch(sheetBusySet(false))
  }
}
