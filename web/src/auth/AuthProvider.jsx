import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { restoreSession } from '../store/authThunks.js'

/* The session itself lives in the Redux store and is remembered on this
   browser (store/authSlice.js). This only checks the remembered session with
   the server once, when the page loads; a session the server no longer accepts
   is dropped and the login page appears. */
export function AuthProvider({ children }) {
  const dispatch = useDispatch()
  useEffect(() => {
    dispatch(restoreSession())
  }, [dispatch])
  return children
}
