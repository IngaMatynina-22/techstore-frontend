import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAuth } from '@/features/auth/AuthContext'

function AuthLoading() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <CircularProgress />
    </Box>
  )
}

/** Any authenticated user */
export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Admin / Manager only */
export function RequireStaff() {
  const { user, loading, isStaff } = useAuth()
  const location = useLocation()

  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!isStaff) return <Navigate to="/app" replace />
  return <Outlet />
}

/** Customer role only */
export function RequireCustomer() {
  const { user, loading, isStaff, isCustomer } = useAuth()
  const location = useLocation()

  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (isStaff) return <Navigate to="/" replace />
  if (!isCustomer) return <Navigate to="/403" replace />
  return <Outlet />
}

export function RequireAdmin() {
  const { isAdmin, loading } = useAuth()
  if (loading) return null
  if (!isAdmin) return <Navigate to="/403" replace />
  return <Outlet />
}
