import { useState } from 'react'
import { Eye, EyeOff, Loader2, AlertCircle, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useOverseerAuth } from '@/hooks/useOverseerAuth'
import { useTheme } from '@/hooks/useTheme'
import ThemeToggle from '@/components/ui/ThemeToggle'
import clsx from 'clsx'

export default function OverseerLoginPage() {
  const { login, isAuthenticated } = useOverseerAuth()
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [id, setId]   = useState('')
  const [pw, setPw]   = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  if (isAuthenticated) { navigate('/overseer/dashboard', { replace: true }); return null }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!id.trim() || !pw) { setError('Enter your Overseer ID and password.'); return }
    setLoading(true)
    try { await login(id.trim(), pw); navigate('/overseer/dashboard', { replace: true }) }
    catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string } } }
      setError(e2.response?.data?.message ?? 'Invalid credentials.')
    } finally { setLoading(false) }
  }

  return (
    <div className={clsx('min-h-screen flex flex-col', isDark ? 'bg-dark-950' : 'bg-zinc-50')}>
      <div className={clsx('fixed inset-0 pointer-events-none', isDark ? 'bg-grid-dark' : 'bg-grid-light')} />
      <header className={clsx('relative z-10 flex items-center justify-between px-6 h-14 border-b backdrop-blur-md', isDark ? 'border-white/5 bg-dark-950/80' : 'border-zinc-200 bg-white/80')}>
        <span className={clsx('text-xs font-bold font-mono uppercase tracking-widest', isDark ? 'text-zinc-400' : 'text-zinc-500')}>SVCE · Overseer Portal</span>
        <ThemeToggle />
      </header>
      <div className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-[380px] animate-slide-up">
          <div className={clsx('rounded-2xl border overflow-hidden', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-zinc-200 shadow-lg')}>
            <div className="h-0.5" style={{ background: 'linear-gradient(90deg,transparent,#f97316,transparent)' }} />
            <div className="p-8">
              <div className="flex flex-col items-center mb-7">
                <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center mb-4', isDark ? 'bg-orange-500/15 border border-orange-500/25' : 'bg-orange-50 border border-orange-200')}>
                  <Shield size={24} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
                </div>
                <h1 className={clsx('text-xl font-bold font-display', isDark ? 'text-white' : 'text-zinc-900')}>Overseer Login</h1>
                <p className={clsx('text-xs mt-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>SVCE Girls Hostel</p>
              </div>
              {error && <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 mb-4 text-sm"><AlertCircle size={14} />{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={clsx('block text-xs font-semibold uppercase tracking-widest mb-1.5', isDark ? 'text-zinc-400' : 'text-zinc-500')}>Overseer ID</label>
                  <input type="text" value={id} onChange={e => { setId(e.target.value); setError('') }} placeholder="e.g. OVERSEER001" autoComplete="username" disabled={loading} className="input-dark w-full uppercase font-mono tracking-wider" />
                </div>
                <div>
                  <label className={clsx('block text-xs font-semibold uppercase tracking-widest mb-1.5', isDark ? 'text-zinc-400' : 'text-zinc-500')}>Password</label>
                  <div className="relative">
                    <input type={show ? 'text' : 'password'} value={pw} onChange={e => { setPw(e.target.value); setError('') }} placeholder="Enter password" autoComplete="current-password" disabled={loading} className="input-dark w-full pr-11" />
                    <button type="button" onClick={() => setShow(v => !v)} className={clsx('absolute right-3 top-1/2 -translate-y-1/2', isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600')}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
                  {loading ? <><Loader2 size={15} className="animate-spin" />Logging in…</> : 'Login'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
