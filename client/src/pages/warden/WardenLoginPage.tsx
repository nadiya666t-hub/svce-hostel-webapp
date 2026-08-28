import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ShieldCheck, AlertCircle } from 'lucide-react'
import { useWardenAuth } from '@/hooks/useWardenAuth'
import { useTheme } from '@/hooks/useTheme'
import { wardenService } from '@/services/wardenService'
import ThemeToggle from '@/components/ui/ThemeToggle'
import clsx from 'clsx'

export default function WardenLoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useWardenAuth()
  const { isDark } = useTheme()
  const [wardenId, setWardenId] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => { if (isAuthenticated) navigate('/warden/dashboard', { replace: true }) }, [isAuthenticated, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!wardenId.trim()) { setError('Please enter your Warden ID.'); return }
    if (!password)        { setError('Please enter your password.'); return }
    setLoading(true)
    try {
      const res = await wardenService.login(wardenId.trim().toUpperCase(), password)
      if (res.success && res.data) {
        login(res.data.token, res.data.warden)
        navigate('/warden/dashboard', { replace: true })
      } else {
        setError(res.message ?? 'Login failed.')
      }
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string } }; code?: string }
      if (e2.code === 'ERR_NETWORK') setError('Cannot connect to server.')
      else setError(e2.response?.data?.message ?? 'Invalid Warden ID or password.')
    } finally { setLoading(false) }
  }

  return (
    <div className={clsx('min-h-screen flex flex-col transition-colors', isDark ? 'bg-dark-950' : 'bg-slate-50')}>
      <div className="fixed inset-0 pointer-events-none dark:bg-grid-dark bg-grid-light" />

      <header className={clsx('relative z-10 flex items-center justify-between px-6 h-14 border-b backdrop-blur-md',
        isDark ? 'border-white/5 bg-dark-950/80' : 'border-slate-200 bg-white/80')}>
        <div className="flex items-center gap-2">
          <img src="/images/svce-logo.png" alt="SVCE" className="w-7 h-7 object-contain"
            onError={e => { const i = e.currentTarget; if (!i.src.endsWith('.svg')) i.src = '/svce-logo.svg' }} />
          <span className={clsx('text-xs font-bold font-mono uppercase tracking-widest', isDark ? 'text-slate-300' : 'text-slate-700')}>SVCE Bengaluru</span>
        </div>
        <ThemeToggle />
      </header>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px] animate-slide-up">
          <div className={clsx('rounded-2xl border overflow-hidden',
            isDark ? 'bg-dark-900 border-white/8 shadow-[0_4px_32px_rgba(0,0,0,0.8)]' : 'bg-white border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.08)]')}>

            <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, #2952e8, transparent)' }} />

            <div className="p-8">
              <div className="flex flex-col items-center text-center mb-7">
                <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center mb-4',
                  isDark ? 'bg-accent-600/15 border border-accent-600/25' : 'bg-accent-50 border border-accent-200')}>
                  <ShieldCheck size={26} className={isDark ? 'text-accent-400' : 'text-accent-600'} />
                </div>
                <h1 className={clsx('text-xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>Warden Portal</h1>
                <p className={clsx('text-xs mt-1', isDark ? 'text-slate-400' : 'text-slate-500')}>SVCE Girls Hostel · Warden Access</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 mb-5 text-sm animate-scale-in">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={clsx('block text-xs font-bold uppercase tracking-widest mb-2', isDark ? 'text-slate-400' : 'text-slate-500')}>Warden ID</label>
                  <input type="text" value={wardenId}
                    onChange={e => { setWardenId(e.target.value); setError('') }}
                    placeholder="e.g. WARDEN001"
                    autoComplete="username" disabled={loading}
                    className={clsx('input-dark w-full uppercase font-mono tracking-wider text-center',
                      error && 'border-red-500/60')} />
                </div>

                <div>
                  <label className={clsx('block text-xs font-bold uppercase tracking-widest mb-2', isDark ? 'text-slate-400' : 'text-slate-500')}>Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      placeholder="Enter password" autoComplete="current-password" disabled={loading}
                      className={clsx('input-dark w-full pr-11', error && 'border-red-500/60')} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className={clsx('absolute right-3 top-1/2 -translate-y-1/2', isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-accent w-full py-3 text-sm mt-1">
                  {loading ? <><Loader2 size={15} className="animate-spin" /> Logging in…</> : 'Login'}
                </button>

                <p className={clsx('text-center text-xs', isDark ? 'text-slate-600' : 'text-slate-400')}>
                  Forgot password? Please contact the administrator.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
