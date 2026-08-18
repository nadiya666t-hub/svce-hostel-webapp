import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import { authService } from '@/services/authService'
import type { AuthUser } from '@/types'

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = authService.getToken()
    const persisted = authService.getPersistedUser()
    if (token && persisted) {
      setUser(persisted)
    }
    setIsLoading(false)
  }, [])

  const login = useCallback((token: string, userData: AuthUser) => {
    authService.persistAuth(token, userData)
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
