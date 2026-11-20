import { createSlice } from '@reduxjs/toolkit'

/* Who is signed in.
     session  null when signed out, otherwise { token, user }
   The session is remembered on this browser (localStorage), so a reload stays
   signed in; store.js keeps the saved copy in step with this slice. */

export const SESSION_KEY = 'cmd-hub-session'

function readSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    // A session saved by the old demo login has no real token: ignore it
    return session && session.token && session.token !== 'demo-session' && session.user ? session : null
  } catch {
    return null
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: () => ({ session: readSession() }),
  reducers: {
    sessionSet(state, action) {
      state.session = action.payload
    },
    sessionCleared(state) {
      state.session = null
    },
  },
})

export const { sessionSet, sessionCleared } = authSlice.actions
export const selectSession = (state) => state.auth.session
export const selectToken = (state) => (state.auth.session ? state.auth.session.token : null)
export default authSlice.reducer
