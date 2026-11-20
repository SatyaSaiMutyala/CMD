import { sessionFrom } from '../data/adapter.js'
import { unregisterFromPush } from '../lib/push.js'
import { api, toError } from './api.js'
import { selectSession, sessionCleared, sessionSet } from './authSlice.js'

/* Signing in and out, and changing the password. Each one throws an Error
   whose message can be shown as it is. */

const isEmail = (value) => /^\S+@\S+\.\S+$/.test(value)

// Runs one API mutation and gives back its answer, or throws a showable Error
const send = async (dispatch, endpoint, arg) => {
  try {
    return await dispatch(api.endpoints[endpoint].initiate(arg)).unwrap()
  } catch (e) {
    throw toError(e)
  }
}

/** Page load: check the remembered session with the server. */
export const restoreSession = () => async (dispatch, getState) => {
  const saved = selectSession(getState())
  if (!saved) return
  try {
    const user = await dispatch(api.endpoints.me.initiate(undefined, { forceRefetch: true, subscribe: false })).unwrap()
    dispatch(sessionSet(sessionFrom(saved.token, user)))
  } catch (e) {
    // Rejected by the server: the api layer has already signed out.
    // Offline (status 0): keep the session and let the pages show the
    // connection error. Anything else: sign in again.
    if (e && e.status !== 0 && e.status !== 401) dispatch(sessionCleared())
  }
}

export const login = (email, password) => async (dispatch) => {
  const address = String(email || '').trim()
  if (!isEmail(address)) throw new Error('Enter a valid email address.')
  if (!password) throw new Error('Enter your password.')
  dispatch(sessionSet(await send(dispatch, 'login', { email: address, password })))
}

/** Sign out. The server is first told to stop pushing to this browser (that
    call needs the login token), but nobody is kept waiting on it. */
export const logout = () => async (dispatch) => {
  const remove = (endpoint) => dispatch(api.endpoints.unregisterDevice.initiate(endpoint)).unwrap()
  await Promise.race([unregisterFromPush(remove), new Promise((resolve) => setTimeout(resolve, 3000))])
  dispatch(sessionCleared())
}

/** The server answers with a fresh token for this browser; every other
    device is signed out. */
export const changePassword = (next) => async (dispatch) => {
  dispatch(sessionSet(await send(dispatch, 'changePassword', next)))
}
