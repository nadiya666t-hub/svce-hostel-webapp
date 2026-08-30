import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import api from '@/services/api'

interface OverseerUser { id: string; overseerId: string; name: string; designation: string; email: string | null; phone: string | null; role: string }
interface OverseerAuthCtx { overseer: OverseerUser | null; token: string | null; isAuthenticated: boolean; isLoading: boolean; login: (id: string, pw: string) => Promise<void>; logout: () => void }

const Ctx = createContext<OverseerAuthCtx | null>(null)
const TK  = 'hms_overseer_token'
const US  = 'hms_overseer_user'

export function OverseerAuthProvider({ children }: { children: ReactNode }) {
  const [overseer, setOverseer] = useState<OverseerUser | null>(null)
  const [token,    setToken]    = useState<string | null>(null)
  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    const t = localStorage.getItem(TK)
    const u = localStorage.getItem(US)
    if (t && u) { try { setToken(t); setOverseer(JSON.parse(u)) } catch {} }
    setLoading(false)
  }, [])

  const login = useCallback(async (overseerId: string, password: string) => {
    const r = await api.post('/overseer/auth/login', { overseerId, password })
    const { token: tk, overseer: ov } = r.data.data
    localStorage.setItem(TK, tk); localStorage.setItem(US, JSON.stringify(ov))
    setToken(tk); setOverseer(ov)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TK); localStorage.removeItem(US)
    setToken(null); setOverseer(null)
  }, [])

  return <Ctx.Provider value={{ overseer, token, isAuthenticated: !!overseer, isLoading, login, logout }}>{children}</Ctx.Provider>
}

export function useOverseerAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useOverseerAuth must be inside OverseerAuthProvider')
  return c
}
