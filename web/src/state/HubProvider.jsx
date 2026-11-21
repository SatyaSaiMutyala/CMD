import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { unlockAudio } from '../lib/alerts.js'
import { openHubSocket } from '../lib/socket.js'
import { api } from '../store/api.js'
import { selectToken } from '../store/authSlice.js'
import {
  CONNECTED,
  arrival,
  enablePush,
  refreshPushStatus,
  reload,
  reloadAll,
  reloadHistory,
  reloadNotifications,
  reloadSettings,
  serverReminder,
  stopTimers,
} from '../store/hubThunks.js'

/* The hub while signed in.

   State lives in the Redux store: overlays and settings in store/hubSlice.js,
   and what is waiting plus the history in the RTK Query cache (store/api.js).
   The actions are thunks in store/hubThunks.js.

   <HubProvider> keeps the data live for as long as it is mounted: it holds the
   queries open, listens to the server over the socket, refetches when the tab
   comes back into view, and registers for browser push. Pages read everything
   through useHub() (state/hubContext.js). */
export function HubProvider({ children }) {
  const dispatch = useDispatch()
  const token = useSelector(selectToken)

  useEffect(() => {
    // Subscribing is what makes RTK Query fetch, cache and auto-refetch these
    const held = [
      ...CONNECTED.map((sw) => dispatch(api.endpoints.getPending.initiate(sw.id))),
      dispatch(api.endpoints.getHistory.initiate()),
      dispatch(api.endpoints.getNotifications.initiate()),
      dispatch(api.endpoints.getSettings.initiate()),
    ]

    const nudges = {}
    const stopSocket = openHubSocket(token, {
      // Several changes often land together (a column moved at once): one refetch
      onChanged: ({ software }) => {
        const ids = software ? [software] : CONNECTED.map((sw) => sw.id)
        ids.forEach((id) => {
          clearTimeout(nudges[id])
          nudges[id] = setTimeout(() => dispatch(reload(id)), 350)
        })
      },
      onArrival: (note) => dispatch(arrival(note)),
      onReminder: () => dispatch(serverReminder()),
      // do not disturb was changed on the phone (or another tab)
      onSettings: () => dispatch(reloadSettings()),
      onReconnect: () => {
        dispatch(reloadAll())
        dispatch(reloadNotifications())
        dispatch(reloadSettings())
      },
    })

    const onVisible = () => {
      if (document.hidden) return
      dispatch(reloadAll())
      dispatch(reloadHistory())
      dispatch(reloadNotifications())
      dispatch(reloadSettings())
      dispatch(refreshPushStatus())
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      held.forEach((query) => query.unsubscribe())
      stopSocket()
      document.removeEventListener('visibilitychange', onVisible)
      Object.values(nudges).forEach(clearTimeout)
      dispatch(stopTimers())
    }
  }, [dispatch, token])

  // Browser push: if notifications are already allowed, (re)register quietly
  useEffect(() => {
    dispatch(enablePush(false))
  }, [dispatch, token])

  // First click loads the sound files (browser rule: no sound before a gesture)
  useEffect(() => {
    const unlock = () => unlockAudio()
    document.addEventListener('click', unlock, { once: true })
    return () => document.removeEventListener('click', unlock)
  }, [])

  return children
}
