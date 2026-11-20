import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit'
import { api } from './api.js'
import authReducer, { SESSION_KEY, sessionCleared, sessionSet } from './authSlice.js'
import hubReducer, { SETTINGS_KEY, settingToggled } from './hubSlice.js'

/* The web app's Redux store.
     auth  who is signed in                       (authSlice.js)
     hub   overlays and alert settings             (hubSlice.js)
     api   everything fetched from the hub backend (api.js, RTK Query) */

const save = (key, value) => {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage blocked: it lasts for this visit only */
  }
}

export function makeStore() {
  // Keeps what is remembered on this browser in step with the store, however
  // it changed (sign-in, sign-out, or the server rejecting the token), and
  // drops fetched data when the session ends.
  const listeners = createListenerMiddleware()
  listeners.startListening({
    actionCreator: sessionSet,
    effect: (action) => save(SESSION_KEY, action.payload),
  })
  listeners.startListening({
    actionCreator: sessionCleared,
    effect: (action, { dispatch }) => {
      save(SESSION_KEY, null)
      dispatch(api.util.resetApiState())
    },
  })
  listeners.startListening({
    actionCreator: settingToggled,
    effect: (action, { getState }) => save(SETTINGS_KEY, getState().hub.settings),
  })

  return configureStore({
    reducer: {
      auth: authReducer,
      hub: hubReducer,
      [api.reducerPath]: api.reducer,
    },
    middleware: (getDefault) => getDefault().prepend(listeners.middleware).concat(api.middleware),
  })
}

export const store = makeStore()
