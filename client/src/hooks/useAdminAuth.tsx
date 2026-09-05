import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import api from '@/services/api'

interface AdminUser { id: string; adminId: string; name: string; role: string }
interface AdminAuthCtx {
  admin: AdminUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (id: string, pw: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AdminAuthCtx | null>(null)
const TK  = 'hms_admin_token'
const US  = 'hms_admin_user'

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin,     setAdmin]   = useState<AdminUser | null>(null)
  const [token,     setToken]   = useState<string | null>(null)
  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    const t = localStorage.getItem(TK)
    const u = localStorage.getItem(US)
    if (t && u) { try { setToken(t); setAdmin(JSON.parse(u)) } catch {} }
    setLoading(false)
  }, [])

  const login = useCallback(async (adminId: string, password: string) => {
    const r = await api.post('/admin/auth/login', { adminId, password })
    const { token: tk, admin: ad } = r.data.data
    localStorage.setItem(TK, tk)
    localStorage.setItem(US, JSON.stringify(ad))
    setToken(tk); setAdmin(ad)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TK); localStorage.removeItem(US)
    setToken(null); setAdmin(null)
  }, [])

  return (
    <Ctx.Provider value={{ admin, token, isAuthenticated: !!admin, isLoading, login, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAdminAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAdminAuth must be inside AdminAuthProvider')
  return c
}
