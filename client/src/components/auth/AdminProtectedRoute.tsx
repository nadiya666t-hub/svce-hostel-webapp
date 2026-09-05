import { Navigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from '@/hooks/useAdminAuth'

export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth()
  const location = useLocation()
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center dark:bg-dark-950 bg-zinc-50">
      <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-violet-500 animate-spin" />
    </div>
  )
  if (!isAuthenticated) return <Navigate to="/admin/login" state={{ from: location }} replace />
  return <>{children}</>
}
