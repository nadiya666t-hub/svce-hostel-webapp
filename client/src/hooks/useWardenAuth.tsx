import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { wardenService, type WardenUser } from '@/services/wardenService'

interface WardenAuthCtx {
  warden: WardenUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, warden: WardenUser) => void
  logout: () => void
}

const Ctx = createContext<WardenAuthCtx | null>(null)

export function WardenAuthProvider({ children }: { children: ReactNode }) {
  const [warden, setWarden] = useState<WardenUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = wardenService.getToken()
    const persisted = wardenService.getPersistedUser()
    if (token && persisted) setWarden(persisted)
    setIsLoading(false)
  }, [])

  const login = useCallback((token: string, w: WardenUser) => {
    wardenService.persistAuth(token, w)
    setWarden(w)
  }, [])

  const logout = useCallback(() => {
    wardenService.logout()
    setWarden(null)
  }, [])

  return (
    <Ctx.Provider value={{ warden, isAuthenticated: !!warden, isLoading, login, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export function useWardenAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useWardenAuth must be inside WardenAuthProvider')
  return ctx
}
