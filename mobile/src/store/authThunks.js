import { sessionFrom } from '../data/adapter';
import { unregisterFromPush } from '../services/push';
import { loadSession, loadSettings } from '../services/session';
import { api, toError } from './api';
import { authReady, sessionCleared, sessionSet } from './authSlice';
import { settingsLoaded } from './hubSlice';

/* Signing in and out, and changing the password. Each one throws an Error
   whose message can be shown as it is. */

const isEmail = value => /^\S+@\S+\.\S+$/.test(value);

// Runs one API mutation and gives back its answer, or throws a showable Error
const send = async (dispatch, endpoint, arg) => {
  try {
    return await dispatch(api.endpoints[endpoint].initiate(arg)).unwrap();
  } catch (e) {
    throw toError(e);
  }
};

/** App start: bring back the saved switches and session, and check the
    session with the server. */
export const restoreSession = () => async dispatch => {
  // The alert switches first: registering for push (right after sign-in)
  // tells the server whether this phone wants the reminder
  const settings = await loadSettings();
  if (settings) dispatch(settingsLoaded(settings));

  const saved = await loadSession();
  if (saved) {
    dispatch(sessionSet(saved));
    try {
      const user = await dispatch(
        api.endpoints.me.initiate(undefined, {
          forceRefetch: true,
          subscribe: false,
        }),
      ).unwrap();
      dispatch(sessionSet(sessionFrom(saved.token, user)));
    } catch (e) {
      // Rejected by the server: the api layer has already signed out.
      // Offline (status 0): keep the saved session, so the app still opens
      // and shows its connection error. Anything else: sign in again.
      if (e && e.status !== 0 && e.status !== 401) dispatch(sessionCleared());
    }
  }
  dispatch(authReady());
};

export const login = (email, password) => async dispatch => {
  const address = String(email || '').trim();
  if (!isEmail(address)) throw new Error('Enter a valid email address.');
  if (!password) throw new Error('Enter your password.');
  dispatch(
    sessionSet(await send(dispatch, 'login', { email: address, password })),
  );
};

/** Sign out. The server is first told to stop notifying this phone (that
    call needs the login token), but the CMD is never kept waiting on it. */
export const logout = () => async dispatch => {
  const removeToken = token =>
    dispatch(api.endpoints.unregisterDevice.initiate(token)).unwrap();
  await Promise.race([
    unregisterFromPush(removeToken),
    new Promise(resolve => setTimeout(resolve, 3000)),
  ]);
  dispatch(sessionCleared());
};

/** The server answers with a fresh token for this phone; every other device
    is signed out. */
export const changePassword = (current, next) => async dispatch => {
  dispatch(
    sessionSet(await send(dispatch, 'changePassword', { current, next })),
  );
};
