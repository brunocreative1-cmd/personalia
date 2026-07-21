import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { LoadingScreen } from './LoadingScreen'

export function ProtectedRoute() {
  const { sessionLoading, session } = useAuth()

  if (sessionLoading) return <LoadingScreen />
  if (!session) return <Navigate to="/auth" replace />

  return <Outlet />
}
