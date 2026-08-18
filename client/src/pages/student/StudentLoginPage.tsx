import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import {
  Eye, EyeOff, ArrowLeft, Loader2, GraduationCap,
  AlertCircle, CheckCircle2, ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { authService } from '@/services/authService'
import ThemeToggle from '@/components/ui/ThemeToggle'
import clsx from 'clsx'

type Step = 'usn' | 'password-setup' | 'password-login'

export default function StudentLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated } = useAuth()
  const { isDark } = useTheme()
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/student/dashboard'

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, navigate, from])

  const [step, setStep]                   = useState<Step>('usn')
  const [usn, setUsn]                     = useState('')
  const [password, setPassword]           = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword]   = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [loading, setLoading]             = useState(false)
  const [usnError, setUsnError]           = useState('')
  const [passError, setPassError]         = useState('')
  const [successMsg, setSuccessMsg]       = useState('')

  const usnRef  = useRef<HTMLInputElement>(null)
  const passRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 'usn') usnRef.current?.focus()
    else passRef.current?.focus()
  }, [step])

  // ── Submit USN ─────────────────────────────────────────────────────────────
  async function handleUsnSubmit(e: React.FormEvent) {
    e.preventDefault()
    setUsnError(''); setPassError('')
    const trimmed = usn.trim().toUpperCase()
    if (!trimmed) { setUsnError('Please enter your USN.'); return }

    setLoading(true)
    try {
      const res = await authService.checkUsn(trimmed)
      if (!res.success || !res.data) {
        setUsnError('Invalid USN. Please check your USN.')
        return
      }
      setUsn(trimmed)
      setStep(res.data.requiresSetup ? 'password-setup' : 'password-login')
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } }; code?: string }
      if (e.code === 'ERR_NETWORK') {
        setUsnError('Unable to connect to server. Please try again.')
      } else if (e.response?.status === 404) {
        setUsnError('Invalid USN. Please check your USN.')
      } else {
        setUsnError(e.response?.data?.message || 'Unable to verify USN. Please try again.')
      }
    } finally { setLoading(false) }
  }

  // ── Set password (first time) ──────────────────────────────────────────────
  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    setPassError('')
    if (password.length < 8) { setPassError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setPassError('Passwords do not match.'); return }

    setLoading(true)
    try {
      const res = await authService.setPassword({ usn, password, confirmPassword })
      if (!res.success || !res.data) { setPassError(res.message || 'Failed to set password.'); return }
      setSuccessMsg(`Welcome, ${res.data.user.name}!`)
      login(res.data.token, res.data.user)
      setTimeout(() => navigate(from, { replace: true }), 600)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setPassError(e.response?.data?.message || 'Failed to set password.')
    } finally { setLoading(false) }
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setPassError('')
    if (!password) { setPassError('Please enter your password.'); return }

    setLoading(true)
    try {
      const res = await authService.login({ usn, password })
      if (!res.success || !res.data) { setPassError('Incorrect password.'); return }
      setSuccessMsg(`Welcome back, ${res.data.user.name}!`)
      login(res.data.token, res.data.user)
      setTimeout(() => navigate(from, { replace: true }), 500)
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } }; code?: string }
      if (e.code === 'ERR_NETWORK') {
        setPassError('Unable to connect to server. Please try again.')
      } else if (e.response?.status === 401) {
        setPassError('Incorrect password.')
      } else {
        setPassError(e.response?.data?.message || 'Login failed. Please try again.')
      }
    } finally { setLoading(false) }
  }

  const bg = isDark ? 'bg-dark-950' : 'bg-zinc-50'

  return (
    <div className={clsx('min-h-screen flex flex-col transition-colors duration-300', bg)}>
      {/* Grid background */}
      <div className={clsx('fixed inset-0 pointer-events-none', isDark ? 'bg-grid-dark' : 'bg-grid-light')} />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(59,110,244,0.12) 0%, transparent 70%)' }} />

      {/* Header */}
      <header className={clsx('relative z-10 flex items-center justify-between px-4 sm:px-8 h-14 border-b',
        isDark ? 'border-white/5 bg-dark-950/80' : 'border-zinc-200 bg-white/80', 'backdrop-blur-md')}>
        <Link to="/" className="flex items-center gap-2 group">
          <ArrowLeft size={15} className={clsx('transition-transform group-hover:-translate-x-0.5', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
          <span className={clsx('text-xs font-medium', isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600')}>
            Back
          </span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Center content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px] animate-slide-up">

          {/* Card */}
          <div className={clsx(
            'rounded-2xl border overflow-hidden',
            isDark
              ? 'bg-dark-900 border-white/8 shadow-[0_2px_8px_rgba(0,0,0,0.8)]'
              : 'bg-white border-zinc-200 shadow-[0_4px_24px_rgba(0,0,0,0.08)]'
          )}>
            {/* Top accent */}
            <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, #3b6ef4, transparent)' }} />

            <div className="p-8">
              {/* Icon + title */}
              <div className="flex flex-col items-center text-center mb-8">
                <div className={clsx(
                  'w-14 h-14 rounded-2xl flex items-center justify-center mb-4',
                  isDark ? 'bg-accent-600/15 border border-accent-600/25' : 'bg-blue-50 border border-blue-200'
                )}>
                  <GraduationCap size={24} className={isDark ? 'text-accent-400' : 'text-blue-600'} />
                </div>
                <h1 className={clsx('text-xl font-bold font-display', isDark ? 'text-white' : 'text-zinc-900')}>
                  {step === 'usn' ? 'Student Login' : step === 'password-setup' ? 'Create Password' : 'Welcome Back'}
                </h1>
                <p className={clsx('text-xs mt-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                  {step === 'usn'
                    ? 'SVCE Girls Hostel · Student Portal'
                    : step === 'password-setup'
                    ? `Setting up account for ${usn}`
                    : `Logging in as ${usn}`}
                </p>
              </div>

              {/* Progress dots */}
              <div className="flex items-center gap-2 mb-6">
                {[0, 1].map(i => (
                  <div key={i} className={clsx(
                    'flex-1 h-0.5 rounded-full transition-all duration-300',
                    (i === 0) || (step !== 'usn' && i === 1)
                      ? 'bg-accent-500'
                      : isDark ? 'bg-white/10' : 'bg-zinc-200'
                  )} />
                ))}
              </div>

              {/* Success */}
              {successMsg && (
                <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-3 mb-5 text-sm animate-scale-in">
                  <CheckCircle2 size={15} className="shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* ── STEP 1: USN ── */}
              {step === 'usn' && (
                <form onSubmit={handleUsnSubmit} className="space-y-4">
                  <div>
                    <label className={clsx('block text-xs font-semibold uppercase tracking-widest mb-2', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                      USN
                    </label>
                    <input
                      ref={usnRef}
                      type="text"
                      value={usn}
                      onChange={e => { setUsn(e.target.value); setUsnError('') }}
                      placeholder="e.g. 1V25CS048"
                      autoComplete="username"
                      disabled={loading}
                      className={clsx(
                        'input-dark w-full uppercase font-mono tracking-wider text-center text-base',
                        usnError && 'border-red-500/60 focus:border-red-500'
                      )}
                    />
                    {usnError && (
                      <div className="flex items-center gap-1.5 mt-2 text-red-400 text-xs animate-slide-down">
                        <AlertCircle size={12} className="shrink-0" />
                        {usnError}
                      </div>
                    )}
                    <p className={clsx('text-xs mt-1.5', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
                      Enter your USN without hyphens
                    </p>
                  </div>
                  <button type="submit" disabled={loading} className="btn-accent w-full py-3 text-sm">
                    {loading ? <><Loader2 size={15} className="animate-spin" /> Checking…</> : <>Continue <ArrowRight size={14} /></>}
                  </button>
                </form>
              )}

              {/* ── STEP 2a: Create password ── */}
              {step === 'password-setup' && (
                <form onSubmit={handleSetPassword} className="space-y-4">
                  <div className={clsx('rounded-xl p-3 text-xs border', isDark ? 'bg-accent-600/10 border-accent-600/20 text-accent-300' : 'bg-blue-50 border-blue-200 text-blue-700')}>
                    First time login for <strong className="font-mono">{usn}</strong> — create your password below.
                  </div>

                  <div>
                    <label className={clsx('block text-xs font-semibold uppercase tracking-widest mb-2', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        ref={passRef}
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => { setPassword(e.target.value); setPassError('') }}
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                        disabled={loading}
                        className="input-dark w-full pr-11"
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className={clsx('absolute right-3 top-1/2 -translate-y-1/2 transition-colors', isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600')}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={clsx('block text-xs font-semibold uppercase tracking-widest mb-2', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setPassError('') }}
                        placeholder="Re-enter your password"
                        autoComplete="new-password"
                        disabled={loading}
                        className="input-dark w-full pr-11"
                      />
                      <button type="button" onClick={() => setShowConfirm(v => !v)}
                        className={clsx('absolute right-3 top-1/2 -translate-y-1/2 transition-colors', isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600')}>
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passError && (
                      <div className="flex items-center gap-1.5 mt-2 text-red-400 text-xs animate-slide-down">
                        <AlertCircle size={12} className="shrink-0" /> {passError}
                      </div>
                    )}
                  </div>

                  <button type="submit" disabled={loading} className="btn-accent w-full py-3 text-sm">
                    {loading ? <><Loader2 size={15} className="animate-spin" /> Activating…</> : 'Activate Account & Login'}
                  </button>
                  <button type="button" onClick={() => { setStep('usn'); setPassError(''); setPassword(''); setConfirmPassword('') }}
                    className={clsx('w-full py-2 text-xs transition-colors', isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-600')}>
                    ← Use a different USN
                  </button>
                </form>
              )}

              {/* ── STEP 2b: Login ── */}
              {step === 'password-login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className={clsx('block text-xs font-semibold uppercase tracking-widest mb-2', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                      Password
                    </label>
                    <div className="relative">
                      <input
                        ref={passRef}
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => { setPassword(e.target.value); setPassError('') }}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        disabled={loading}
                        className={clsx('input-dark w-full pr-11', passError && 'border-red-500/60')}
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className={clsx('absolute right-3 top-1/2 -translate-y-1/2 transition-colors', isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600')}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passError && (
                      <div className="flex items-center gap-1.5 mt-2 text-red-400 text-xs animate-slide-down">
                        <AlertCircle size={12} className="shrink-0" /> {passError}
                      </div>
                    )}
                  </div>

                  <button type="submit" disabled={loading} className="btn-accent w-full py-3 text-sm">
                    {loading ? <><Loader2 size={15} className="animate-spin" /> Logging in…</> : 'Login'}
                  </button>

                  {/* Forgot password — no reset, just a message */}
                  <p className={clsx('text-center text-xs', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
                    Forgot your password?{' '}
                    <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                      Please contact the administrator.
                    </span>
                  </p>

                  <button type="button" onClick={() => { setStep('usn'); setPassError(''); setPassword('') }}
                    className={clsx('w-full py-2 text-xs transition-colors', isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-600')}>
                    ← Use a different USN
                  </button>
                </form>
              )}
            </div>
          </div>

          <p className={clsx('text-center text-xs mt-5', isDark ? 'text-zinc-700' : 'text-zinc-400')}>
            SVCE Girls Hostel · Student Portal
          </p>
        </div>
      </div>
    </div>
  )
}
