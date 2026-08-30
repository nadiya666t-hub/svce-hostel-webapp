import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import api from '@/services/api'

interface WatchmanUser { id: string; watchmanId: string; name: string; designation: string; email: string | null; phone: string | null; role: string }
interface WatchmanAuthCtx { watchman: WatchmanUser | null; token: string | null; isAuthenticated: boolean; isLoading: boolean; login: (id: string, pw: string) => Promise<void>; logout: () => void }

const Ctx = createContext<WatchmanAuthCtx | null>(null)
const TK  = 'hms_watchman_token'
const US  = 'hms_watchman_user'

export function WatchmanAuthProvider({ children }: { children: ReactNode }) {
  const [watchman, setWatchman] = useState<WatchmanUser | null>(null)
  const [token,    setToken]    = useState<string | null>(null)
  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    const t = localStorage.getItem(TK)
    const u = localStorage.getItem(US)
    if (t && u) { try { setToken(t); setWatchman(JSON.parse(u)) } catch {} }
    setLoading(false)
  }, [])

  const login = useCallback(async (watchmanId: string, password: string) => {
    const r = await api.post('/watchman/auth/login', { watchmanId, password })
    const { token: tk, watchman: wm } = r.data.data
    localStorage.setItem(TK, tk); localStorage.setItem(US, JSON.stringify(wm))
    setToken(tk); setWatchman(wm)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TK); localStorage.removeItem(US)
    setToken(null); setWatchman(null)
  }, [])

  return <Ctx.Provider value={{ watchman, token, isAuthenticated: !!watchman, isLoading, login, logout }}>{children}</Ctx.Provider>
}

export function useWatchmanAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useWatchmanAuth must be inside WatchmanAuthProvider')
  return c
}
