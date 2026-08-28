import { Navigate, useLocation } from 'react-router-dom'
import { useParentAuth } from '@/hooks/useParentAuth'

export default function ParentProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useParentAuth()
  const location = useLocation()
  if (isLoading) return null
  if (!isAuthenticated) return <Navigate to="/parent/login" state={{ from: location }} replace />
  return <>{children}</>
}
