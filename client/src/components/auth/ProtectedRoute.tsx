import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-dark-950 bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-zinc-700 border-t-accent-500 animate-spin" />
          <p className="text-xs font-mono dark:text-zinc-600 text-zinc-400 uppercase tracking-widest">Loading</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/student/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
