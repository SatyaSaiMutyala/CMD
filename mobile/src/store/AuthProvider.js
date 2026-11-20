import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { changePassword, login, logout, restoreSession } from './authThunks';

/* Who is signed in — a thin layer over the Redux store (authSlice.js for the
   state, authThunks.js for the actions), so screens can write
     const { user, login, logout } = useAuth();                              */

/** Reads the saved session once, when the app starts. */
export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);
  return children;
}

/** { user, token, ready, login(email, password), logout(),
      changePassword(current, next) }
    `ready` is false while the saved session is being read on app start;
    `user` is null when signed out. Each action throws an Error whose
    message can be shown. */
export function useAuth() {
  const dispatch = useDispatch();
  const session = useSelector(state => state.auth.session);
  const ready = useSelector(state => state.auth.ready);

  const actions = useMemo(
    () => ({
      login: (email, password) => dispatch(login(email, password)),
      logout: () => dispatch(logout()),
      changePassword: (current, next) =>
        dispatch(changePassword(current, next)),
    }),
    [dispatch],
  );

  return {
    user: session ? session.user : null,
    token: session ? session.token : null,
    ready,
    ...actions,
  };
}
