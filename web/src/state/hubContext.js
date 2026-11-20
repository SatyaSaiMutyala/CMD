import { useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router'
import { PATHS, softwarePath } from '../lib/paths.js'
import {
  detailClosed,
  detailOpened,
  reminderClosed,
  sheetClosed,
  sheetOpened,
  toastCleared,
} from '../store/hubSlice.js'
import {
  confirmSheet,
  enablePush,
  hideBanner,
  moreNotifications,
  previewArrival,
  readAllNotifications,
  readNotification,
  reload,
  reloadNotifications,
  removeAllNotifications,
  removeNotification,
  selectHubStore,
  selectOnlyPending,
  showReminder,
  snoozeReminder,
  toggleSetting,
} from '../store/hubThunks.js'

/** Everything a page needs from the hub — a thin layer over the Redux store.
 *    store        { live, history, notifications, notificationsMore, unread,
 *                   settings } — read it with selectors.js
 *    detail, sheet, sheetBusy, sheetError, toast, banner, remindOpen, push
 *    and the actions below. The actions keep the same identity between
 *    renders, so they are safe to use inside effects.
 *  State: store/hubSlice.js. Actions: store/hubThunks.js. Data: store/api.js. */
export function useHub() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const store = useSelector(selectHubStore)
  const hub = useSelector((state) => state.hub)

  const actions = useMemo(
    () => ({
      reload: (swId) => dispatch(reload(swId)),
      openSheet: (type, swId, stage, id) => dispatch(sheetOpened({ type, swId, stage, id })),
      closeSheet: () => dispatch(sheetClosed()),
      // One item in full, with its documents
      openDetail: (swId, stage, id) => dispatch(detailOpened({ swId, stage, id })),
      closeDetail: () => dispatch(detailClosed()),
      confirmSheet: (reason) => dispatch(confirmSheet(reason)),
      clearToast: () => dispatch(toastCleared()),

      // Notifications: the first page again, the next page, and the changes
      // (each resolves to true when the server accepted it)
      reloadNotifications: () => dispatch(reloadNotifications()),
      moreNotifications: () => dispatch(moreNotifications()),
      readNotification: (id) => dispatch(readNotification(id)),
      readAllNotifications: () => dispatch(readAllNotifications()),
      removeNotification: (id) => dispatch(removeNotification(id)),
      removeAllNotifications: () => dispatch(removeAllNotifications()),

      toggleSetting: (name) => dispatch(toggleSetting(name)),
      // Asks the browser for permission (if needed) and registers for push
      enablePush: () => dispatch(enablePush(true)),
      previewArrival: () => dispatch(previewArrival()),
      previewReminder: () => dispatch(showReminder(true)),

      hideBanner: () => dispatch(hideBanner()),
      // The snackbar's "open": go to the software it was about
      openBanner: () => {
        const swId = dispatch((_, getState) => getState().hub.banner?.swId)
        dispatch(hideBanner())
        if (swId) navigate(softwarePath(swId))
      },
      dismissReminder: () => dispatch(reminderClosed()),
      snoozeReminder: () => dispatch(snoozeReminder()),
      // Straight to the software if only one has something waiting
      reviewNow: () => {
        dispatch(reminderClosed())
        const only = dispatch((_, getState) => selectOnlyPending(getState()))
        navigate(only ? softwarePath(only) : PATHS.overview)
      },
    }),
    [dispatch, navigate],
  )

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
  }
}
