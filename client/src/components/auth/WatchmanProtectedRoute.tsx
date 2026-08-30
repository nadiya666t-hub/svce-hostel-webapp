import { Navigate, useLocation } from 'react-router-dom'
import { useWatchmanAuth } from '@/hooks/useWatchmanAuth'

export default function WatchmanProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useWatchmanAuth()
  const location = useLocation()
  if (isLoading) return <div className="min-h-screen flex items-center justify-center dark:bg-dark-950 bg-zinc-50"><div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-accent-500 animate-spin" /></div>
  if (!isAuthenticated) return <Navigate to="/watchman/login" state={{ from: location }} replace />
  return <>{children}</>
}
