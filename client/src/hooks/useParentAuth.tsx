import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { parentService, type ParentAuthUser } from '@/services/parentService'

interface ParentAuthCtx {
  user: ParentAuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, user: ParentAuthUser) => void
  logout: () => void
}

const Ctx = createContext<ParentAuthCtx | null>(null)

export function ParentAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ParentAuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = parentService.getToken()
    const persisted = parentService.getPersistedUser()
    if (token && persisted) setUser(persisted)
    setIsLoading(false)
  }, [])

  const login = useCallback((token: string, u: ParentAuthUser) => {
    parentService.persistAuth(token, u)
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    parentService.logout()
    setUser(null)
  }, [])

  return (
    <Ctx.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export function useParentAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useParentAuth must be inside ParentAuthProvider')
  return ctx
}
