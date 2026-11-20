import { Navigate, useLocation } from 'react-router'
import { useAuth } from './context.js'

/** Route guard: signed-in users only. Remembers where the person was heading. */
export function RequireAuth({ children }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status !== 'signedIn') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return children
}
