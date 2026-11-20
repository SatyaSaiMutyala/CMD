import { createSlice } from '@reduxjs/toolkit';

/* Who is signed in.
     session  null when signed out, otherwise { token, user }
     ready    false while the saved session is still being read on app start */

const authSlice = createSlice({
  name: 'auth',
  initialState: { session: null, ready: false },
  reducers: {
    sessionSet(state, action) {
      state.session = action.payload;
    },
    sessionCleared(state) {
      state.session = null;
    },
    authReady(state) {
      state.ready = true;
    },
  },
});

export const { sessionSet, sessionCleared, authReady } = authSlice.actions;
export const selectSession = state => state.auth.session;
export const selectToken = state =>
  state.auth.session ? state.auth.session.token : null;
export default authSlice.reducer;
