import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import {
  clearSession,
  saveSession,
  saveSettings,
} from '../services/session';
import { api } from './api';
import authReducer, { sessionCleared, sessionSet } from './authSlice';
import hubReducer, { settingToggled } from './hubSlice';

/* The app's Redux store.
     auth  who is signed in                       (authSlice.js)
     hub   overlays and alert settings             (hubSlice.js)
     api   everything fetched from the hub backend (api.js, RTK Query)

   A function rather than a single shared store, so each test starts clean. */
export function makeStore() {
  // Keeps the phone's saved copy of the session in step with the store,
  // however the session changed (sign-in, sign-out, or the server rejecting
  // the token), and drops fetched data when the session ends.
  const listeners = createListenerMiddleware();
  listeners.startListening({
    actionCreator: sessionSet,
    effect: action => {
      saveSession(action.payload);
    },
  });
  listeners.startListening({
    actionCreator: sessionCleared,
    effect: (action, { dispatch }) => {
      clearSession();
      dispatch(api.util.resetApiState());
    },
  });

  // The alert switches are remembered on the phone too
  listeners.startListening({
    actionCreator: settingToggled,
    effect: (action, { getState }) => {
      saveSettings(getState().hub.settings);
    },
  });

  return configureStore({
    reducer: {
      auth: authReducer,
      hub: hubReducer,
      [api.reducerPath]: api.reducer,
    },
    middleware: getDefault =>
      getDefault().prepend(listeners.middleware).concat(api.middleware),
  });
}
