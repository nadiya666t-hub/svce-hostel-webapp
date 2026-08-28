import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft, Loader2, Users, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useParentAuth } from '@/hooks/useParentAuth'
import { useTheme } from '@/hooks/useTheme'
import { parentService } from '@/services/parentService'
import ThemeToggle from '@/components/ui/ThemeToggle'
import clsx from 'clsx'

export default function ParentLoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useParentAuth()
  const { isDark } = useTheme()

  const [usn, setUsn] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [usnError, setUsnError] = useState('')
  const [passError, setPassError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { if (isAuthenticated) navigate('/parent/dashboard', { replace: true }) }, [isAuthenticated, navigate])

  function normaliseUsn(s: string) { return s.replace(/[-\s]/g, '').toUpperCase() }

  async function handleBlur() {
    const norm = normaliseUsn(usn)
    if (!norm) return
    try {
      const res = await parentService.checkUsn(norm)
      if (!res.success) { setUsnError('No parent account found for this USN.'); return }
      setUsnError(''); setUsn(norm)
    } catch { /* silent */ }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setUsnError(''); setPassError('')
    const norm = normaliseUsn(usn)
    if (!norm) { setUsnError('Please enter the student USN.'); return }
    if (!password) { setPassError('Please enter your password.'); return }
    setLoading(true)
    try {
      const res = await parentService.login(norm, password)
      if (!res.success || !res.data) { setPassError(res.message || 'Login failed.'); return }
      setSuccess(`Welcome, ${res.data.user.name}!`)
      login(res.data.token, res.data.user)
      setTimeout(() => navigate('/parent/dashboard', { replace: true }), 500)
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } }; code?: string }
      if (e.code === 'ERR_NETWORK') setPassError('Unable to connect to server.')
      else if (e.response?.status === 401) setPassError('Incorrect USN or password.')
      else setPassError(e.response?.data?.message || 'Login failed.')
    } finally { setLoading(false) }
  }

  const bg = isDark ? 'bg-dark-950' : 'bg-slate-50'
  const card = isDark ? 'bg-dark-900 border-white/8 shadow-[0_4px_32px_rgba(0,0,0,0.8)]' : 'bg-white border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.08)]'

  return (
    <div className={clsx('min-h-screen flex flex-col transition-colors', bg)}>
      <div className="fixed inset-0 pointer-events-none dark:bg-grid-dark bg-grid-light" />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 70%)' }} />

      <header className={clsx('relative z-10 flex items-center justify-between px-4 sm:px-8 h-14 border-b backdrop-blur-md',
        isDark ? 'border-white/5 bg-dark-950/80' : 'border-slate-200 bg-white/80')}>
        <Link to="/" className="flex items-center gap-2 group">
          <ArrowLeft size={15} className={clsx('transition-transform group-hover:-translate-x-0.5', isDark ? 'text-slate-500' : 'text-slate-400')} />
          <span className={clsx('text-xs font-medium', isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}>Back</span>
        </Link>
        <ThemeToggle />
      </header>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px] animate-slide-up">
          <div className={clsx('rounded-2xl border overflow-hidden', card)}>
            <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, #10b981, transparent)' }} />
            <div className="p-8">
              {/* Icon + title */}
              <div className="flex flex-col items-center text-center mb-7">
                <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center mb-4',
                  isDark ? 'bg-emerald-500/15 border border-emerald-500/25' : 'bg-emerald-50 border border-emerald-200')}>
                  <Users size={24} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                </div>
                <h1 className={clsx('text-xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>Parent Portal</h1>
                <p className={clsx('text-xs mt-1', isDark ? 'text-slate-400' : 'text-slate-500')}>SVCE Girls Hostel · Family Access</p>
              </div>

              {success && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-3 mb-5 text-sm animate-scale-in">
                  <CheckCircle2 size={15} className="shrink-0" /> {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={clsx('block text-xs font-bold uppercase tracking-widest mb-2', isDark ? 'text-slate-400' : 'text-slate-500')}>Student USN</label>
                  <input type="text" value={usn}
                    onChange={e => { setUsn(e.target.value); setUsnError('') }}
                    onBlur={handleBlur}
                    placeholder="e.g. 1VE25CS048"
                    autoComplete="username" disabled={loading}
                    className={clsx('input-dark w-full uppercase font-mono tracking-wider text-center',
                      usnError && 'border-red-500/60')} />
                  {usnError && <p className="flex items-center gap-1.5 mt-1.5 text-red-400 text-xs"><AlertCircle size={12} />{usnError}</p>}
                </div>

                <div>
                  <label className={clsx('block text-xs font-bold uppercase tracking-widest mb-2', isDark ? 'text-slate-400' : 'text-slate-500')}>Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={password}
                      onChange={e => { setPassword(e.target.value); setPassError('') }}
                      placeholder="Enter your password" autoComplete="current-password" disabled={loading}
                      className={clsx('input-dark w-full pr-11', passError && 'border-red-500/60')} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className={clsx('absolute right-3 top-1/2 -translate-y-1/2', isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passError && <p className="flex items-center gap-1.5 mt-1.5 text-red-400 text-xs"><AlertCircle size={12} />{passError}</p>}
                </div>

                <button type="submit" disabled={loading} className="btn-accent w-full py-3 text-sm mt-1"
                  style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 2px 12px rgba(16,185,129,0.35)' }}>
                  {loading ? <><Loader2 size={15} className="animate-spin" /> Logging in…</> : 'Login to Parent Portal'}
                </button>

                <p className={clsx('text-center text-xs', isDark ? 'text-slate-600' : 'text-slate-400')}>
                  Login credentials are provided by the hostel office.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
