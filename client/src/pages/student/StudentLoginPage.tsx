import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import {
  Eye, EyeOff, ArrowLeft, Loader2, GraduationCap,
  AlertCircle, CheckCircle2,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { authService } from '@/services/authService'
import ThemeToggle from '@/components/ui/ThemeToggle'
import clsx from 'clsx'

export default function StudentLoginPage() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { login, isAuthenticated } = useAuth()
  const { isDark } = useTheme()
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/student/dashboard'

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, navigate, from])

  // Form state
  const [usn,             setUsn]             = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword,    setShowPassword]    = useState(false)
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [usnError,        setUsnError]        = useState('')
  const [passError,       setPassError]       = useState('')
  const [successMsg,      setSuccessMsg]      = useState('')
  // null = not checked yet, false = existing account, true = needs setup
  const [needsSetup,      setNeedsSetup]      = useState<boolean | null>(null)

  const usnRef  = useRef<HTMLInputElement>(null)
  const passRef = useRef<HTMLInputElement>(null)

  useEffect(() => { usnRef.current?.focus() }, [])

  /** Strip hyphens/spaces and uppercase — matches server normaliseUsn() */
  function normaliseUsn(raw: string): string {
    return raw.replace(/[-\s]/g, '').toUpperCase()
  }

  // Validate USN on blur — check if it exists in the system
  async function handleUsnBlur() {
    const norm = normaliseUsn(usn)
    if (!norm) return
    try {
      const res = await authService.checkUsn(norm)
      if (!res.success || !res.data) {
        setUsnError('Invalid USN. Please check your USN.')
        setNeedsSetup(null)
      } else {
        setUsnError('')
        setNeedsSetup(res.data.requiresSetup)
        setUsn(norm)
        setTimeout(() => passRef.current?.focus(), 50)
      }
    } catch {
      // silent — validate on submit
    }
  }

  // ── Main submit ────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setUsnError(''); setPassError('')

    const trimmedUsn = normaliseUsn(usn)
    if (!trimmedUsn) { setUsnError('Please enter your USN.'); return }
    if (!password)   { setPassError('Please enter your password.'); return }

    setLoading(true)
    try {
      // First check USN if we haven't yet
      let isFirstTime = needsSetup
      if (isFirstTime === null) {
        const checkRes = await authService.checkUsn(trimmedUsn)
        if (!checkRes.success || !checkRes.data) {
          setUsnError('Invalid USN. Please check your USN.')
          return
        }
        isFirstTime = checkRes.data.requiresSetup
        setNeedsSetup(isFirstTime)
        setUsn(trimmedUsn)
      }

      if (isFirstTime) {
        // First-time setup: need confirm password
        if (!confirmPassword) { setPassError('Please confirm your password.'); return }
        if (password !== confirmPassword) { setPassError('Passwords do not match.'); return }
        if (password.length < 8) { setPassError('Password must be at least 8 characters.'); return }

        const res = await authService.setPassword({ usn: trimmedUsn, password, confirmPassword })
        if (!res.success || !res.data) { setPassError(res.message || 'Failed to set password.'); return }
        setSuccessMsg(`Welcome, ${res.data.user.name}!`)
        login(res.data.token, res.data.user)
        setTimeout(() => navigate('/student/dashboard', { replace: true }), 600)
      } else {
        // Normal login
        const res = await authService.login({ usn: trimmedUsn, password })
        if (!res.success || !res.data) { setPassError('Incorrect password.'); return }
        setSuccessMsg(`Welcome back, ${res.data.user.name}!`)
        login(res.data.token, res.data.user)
        setTimeout(() => navigate(from, { replace: true }), 500)
      }
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } }; code?: string }
      if (e.code === 'ERR_NETWORK') {
        setPassError('Unable to connect to server. Please try again.')
      } else if (e.response?.status === 401) {
        setPassError('Incorrect password.')
      } else if (e.response?.status === 404) {
        setUsnError('Invalid USN. Please check your USN.')
      } else {
        setPassError(e.response?.data?.message || 'Login failed. Please try again.')
      }
    } finally { setLoading(false) }
  }

  const isFirstTime = needsSetup === true
  const bg = isDark ? 'dark:bg-dark-950 bg-zinc-50' : 'bg-zinc-50'

  return (
    <div className={clsx('min-h-screen flex flex-col transition-colors duration-300', bg)}>
      {/* Grid background */}
      <div className={clsx('fixed inset-0 pointer-events-none', isDark ? 'bg-grid-dark' : 'bg-grid-light')} />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(59,110,244,0.1) 0%, transparent 70%)' }} />

      {/* Header */}
      <header className={clsx('relative z-10 flex items-center justify-between px-4 sm:px-8 h-14 border-b backdrop-blur-md',
        isDark ? 'border-white/5 bg-dark-950/80' : 'border-zinc-200 bg-white/80')}>
        <Link to="/" className="flex items-center gap-2 group">
          <ArrowLeft size={15} className={clsx('transition-transform group-hover:-translate-x-0.5', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
          <span className={clsx('text-xs font-medium', isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600')}>Back</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Card */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px] animate-slide-up">
          <div className={clsx('rounded-2xl border overflow-hidden',
            isDark ? 'bg-dark-900 border-white/8 shadow-[0_4px_24px_rgba(0,0,0,0.8)]'
                   : 'bg-white border-zinc-200 shadow-[0_4px_24px_rgba(0,0,0,0.08)]')}>
            {/* Top accent line */}
            <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, #3b6ef4, transparent)' }} />

            <div className="p-8">
              {/* Icon + title */}
              <div className="flex flex-col items-center text-center mb-7">
                <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center mb-4',
                  isDark ? 'bg-accent-600/15 border border-accent-600/25' : 'bg-blue-50 border border-blue-200')}>
                  <GraduationCap size={24} className={isDark ? 'text-accent-400' : 'text-blue-600'} />
                </div>
                <h1 className={clsx('text-xl font-bold font-display', isDark ? 'text-white' : 'text-zinc-900')}>
                  {isFirstTime ? 'Create Password' : 'Student Login'}
                </h1>
                <p className={clsx('text-xs mt-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                  SVCE Girls Hostel · Student Portal
                </p>
              </div>

              {/* Success */}
              {successMsg && (
                <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-3 mb-5 text-sm animate-scale-in">
                  <CheckCircle2 size={15} className="shrink-0" /> {successMsg}
                </div>
              )}

              {/* First-time notice */}
              {isFirstTime && (
                <div className={clsx('rounded-xl p-3 text-xs border mb-5',
                  isDark ? 'bg-accent-600/10 border-accent-600/20 text-accent-300' : 'bg-blue-50 border-blue-200 text-blue-700')}>
                  First time logging in as <strong className="font-mono">{usn}</strong> — create your password below.
                </div>
              )}

              {/* ── Single form: USN + Password ── */}
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* USN */}
                <div>
                  <label className={clsx('block text-xs font-semibold uppercase tracking-widest mb-2',
                    isDark ? 'text-zinc-400' : 'text-zinc-500')}>USN</label>
                  <input
                    ref={usnRef}
                    type="text"
                    value={usn}
                    onChange={e => { setUsn(e.target.value); setUsnError(''); setNeedsSetup(null) }}
                    onBlur={handleUsnBlur}
                    placeholder="e.g. 1VE25CS048"
                    autoComplete="username"
                    disabled={loading}
                    className={clsx('input-dark w-full uppercase font-mono tracking-wider text-center text-base',
                      usnError && 'border-red-500/60 focus:border-red-500')}
                  />
                  {usnError && (
                    <div className="flex items-center gap-1.5 mt-2 text-red-400 text-xs animate-slide-down">
                      <AlertCircle size={12} className="shrink-0" /> {usnError}
                    </div>
                  )}
                  {needsSetup === false && !usnError && usn && (
                    <p className="text-xs text-emerald-500 mt-1.5 flex items-center gap-1">
                      <CheckCircle2 size={11} /> USN verified
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className={clsx('block text-xs font-semibold uppercase tracking-widest mb-2',
                    isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                    {isFirstTime ? 'New Password' : 'Password'}
                  </label>
                  <div className="relative">
                    <input
                      ref={passRef}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setPassError('') }}
                      placeholder={isFirstTime ? 'Min. 8 characters' : 'Enter your password'}
                      autoComplete={isFirstTime ? 'new-password' : 'current-password'}
                      disabled={loading}
                      className={clsx('input-dark w-full pr-11',
                        passError && 'border-red-500/60 focus:border-red-500')}
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className={clsx('absolute right-3 top-1/2 -translate-y-1/2 transition-colors',
                        isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600')}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passError && (
                    <div className="flex items-center gap-1.5 mt-2 text-red-400 text-xs animate-slide-down">
                      <AlertCircle size={12} className="shrink-0" /> {passError}
                    </div>
                  )}
                </div>

                {/* Confirm password — only for first-time setup */}
                {isFirstTime && (
                  <div>
                    <label className={clsx('block text-xs font-semibold uppercase tracking-widest mb-2',
                      isDark ? 'text-zinc-400' : 'text-zinc-500')}>Confirm Password</label>
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
                        className={clsx('absolute right-3 top-1/2 -translate-y-1/2 transition-colors',
                          isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600')}>
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit */}
                <button type="submit" disabled={loading}
                  className="btn-accent w-full py-3 text-sm mt-2">
                  {loading
                    ? <><Loader2 size={15} className="animate-spin" /> {isFirstTime ? 'Activating…' : 'Logging in…'}</>
                    : isFirstTime ? 'Activate Account & Login' : 'Login'
                  }
                </button>

                {/* Forgot password — no reset, contact admin */}
                {!isFirstTime && (
                  <p className={clsx('text-center text-xs', isDark ? 'text-zinc-700' : 'text-zinc-400')}>
                    Forgot your password?{' '}
                    <span className={isDark ? 'text-zinc-600' : 'text-zinc-500'}>Please contact the administrator.</span>
                  </p>
                )}
              </form>
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
