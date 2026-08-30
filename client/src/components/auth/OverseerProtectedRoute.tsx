import { Navigate, useLocation } from 'react-router-dom'
import { useOverseerAuth } from '@/hooks/useOverseerAuth'

export default function OverseerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useOverseerAuth()
  const location = useLocation()
  if (isLoading) return <div className="min-h-screen flex items-center justify-center dark:bg-dark-950 bg-zinc-50"><div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-accent-500 animate-spin" /></div>
  if (!isAuthenticated) return <Navigate to="/overseer/login" state={{ from: location }} replace />
  return <>{children}</>
}
