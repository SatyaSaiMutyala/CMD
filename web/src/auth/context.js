import { useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { changePassword, login, logout } from '../store/authThunks.js'

/* Who is signed in — a thin layer over the Redux store (store/authSlice.js for
   the state, store/authThunks.js for the actions), so pages can write
     const { user, login, logout } = useAuth()                              */

/** { status: 'signedIn' | 'signedOut', user, token, login(email, password), logout(),
 *    changePassword(next) }
 *  Each action throws an Error whose message can be shown. */
export function useAuth() {
  const dispatch = useDispatch()
  const session = useSelector((state) => state.auth.session)

  const actions = useMemo(
    () => ({
      login: (email, password) => dispatch(login(email, password)),
      logout: () => dispatch(logout()),
      changePassword: (next) => dispatch(changePassword(next)),
    }),
    [dispatch],
  )

  return {
    status: session ? 'signedIn' : 'signedOut',
    user: session ? session.user : null,
    token: session ? session.token : null,
    ...actions,
  }
}
