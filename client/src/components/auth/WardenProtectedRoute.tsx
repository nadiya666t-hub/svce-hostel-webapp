import { Navigate, useLocation } from 'react-router-dom'
import { useWardenAuth } from '@/hooks/useWardenAuth'

export default function WardenProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useWardenAuth()
  const location = useLocation()
  if (isLoading) return null
  if (!isAuthenticated) return <Navigate to="/warden/login" state={{ from: location }} replace />
  return <>{children}</>
}
