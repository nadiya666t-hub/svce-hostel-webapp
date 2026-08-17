import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Building2, ArrowLeft, AlertCircle, CheckCircle2, Loader2, GraduationCap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/authService'
import clsx from 'clsx'

type Step = 'usn' | 'password-setup' | 'password-login'

export default function StudentLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated } = useAuth()
  const from = (location.state as { from?: Location })?.from?.pathname || '/student/dashboard'

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, navigate, from])

  // ─── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('usn')
  const [usn, setUsn] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const usnRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 'usn') usnRef.current?.focus()
    else passwordRef.current?.focus()
  }, [step])

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleUsnSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const trimmedUsn = usn.trim().toUpperCase()
    if (!trimmedUsn) {
      setError('Please enter your USN.')
      return
    }
    setLoading(true)
    try {
      const res = await authService.checkUsn(trimmedUsn)
      if (!res.success || !res.data) {
        setError(res.message || 'USN not found. Please contact the hostel office.')
        return
      }
      setUsn(trimmedUsn)
      if (res.data.requiresSetup) {
        setStep('password-setup')
      } else {
        setStep('password-login')
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } }; code?: string; message?: string }
      if (axiosErr.code === 'ERR_NETWORK' || axiosErr.code === 'ECONNREFUSED') {
        setError('Unable to connect to the server. Please make sure the backend is running.')
      } else if (axiosErr.response?.status === 404) {
        setError('Invalid USN. Please check your USN and try again.')
      } else if (axiosErr.response?.data?.message) {
        setError(axiosErr.response.data.message)
      } else {
        setError('Unable to connect to the server. Please try again later.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const res = await authService.setPassword({ usn, password, confirmPassword })
      if (!res.success || !res.data) {
        setError(res.message || 'Failed to set password.')
        return
      }
      login(res.data.token, res.data.user)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Failed to set password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!password) {
      setError('Please enter your password.')
      return
    }
    setLoading(true)
    try {
      const res = await authService.login({ usn, password })
      if (!res.success || !res.data) {
        setError(res.message || 'Invalid credentials.')
        return
      }
      setSuccessMsg(`Welcome back, ${res.data.user.name}!`)
      login(res.data.token, res.data.user)
      setTimeout(() => navigate(from, { replace: true }), 400)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Login failed. Check your USN and password.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const stepTitles: Record<Step, string> = {
    usn: 'Student Login',
    'password-setup': 'Create Your Password',
    'password-login': 'Welcome Back',
  }
  const stepSubtitles: Record<Step, string> = {
    usn: 'Enter your USN to continue',
    'password-setup': "First time? Set up your account password.",
    'password-login': `Logging in as ${usn}`,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/30 flex flex-col">
      {/* Sticky nav */}
      <header className="glass border-b border-white/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shadow-glow-sm group-hover:scale-105 transition-transform">
              <Building2 size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold text-slate-700">HMS</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={15} />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Center card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-slide-up">
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
            {/* Top accent bar */}
            <div className="h-1 gradient-primary" />

            <div className="p-8">
              {/* Icon + title */}
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mb-4 shadow-glow-sm">
                  <GraduationCap size={26} className="text-primary-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800">{stepTitles[step]}</h1>
                <p className="text-sm text-slate-400 mt-1">{stepSubtitles[step]}</p>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-6">
                {(['usn', step === 'password-setup' ? 'password-setup' : 'password-login'] as Step[]).map(
                  (s, i) => (
                    <div
                      key={s}
                      className={clsx(
                        'flex-1 h-1 rounded-full transition-colors duration-300',
                        i === 0 ? 'bg-primary-500' : step !== 'usn' ? 'bg-primary-500' : 'bg-slate-200'
                      )}
                    />
                  )
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 rounded-xl p-3.5 mb-5 animate-scale-in">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Success */}
              {successMsg && (
                <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl p-3.5 mb-5 animate-scale-in">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <p className="text-sm">{successMsg}</p>
                </div>
              )}

              {/* ── STEP 1: USN entry ── */}
              {step === 'usn' && (
                <form onSubmit={handleUsnSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                      USN
                    </label>
                    <input
                      ref={usnRef}
                      type="text"
                      value={usn}
                      onChange={(e) => { setUsn(e.target.value); setError('') }}
                      placeholder="e.g. 1VE-25CS-048"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all uppercase"
                      disabled={loading}
                      autoComplete="username"
                    />
                    <p className="mt-1.5 text-xs text-slate-400">
                      Your University Seat Number assigned by the institution
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl gradient-primary text-white font-semibold text-sm shadow-glow-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Loader2 size={16} className="animate-spin" /> Checking…</>
                    ) : (
                      'Continue'
                    )}
                  </button>
                </form>
              )}

              {/* ── STEP 2a: First-time password setup ── */}
              {step === 'password-setup' && (
                <form onSubmit={handleSetPassword} className="space-y-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-700 leading-relaxed">
                    <strong>First time here?</strong> Your account is ready — just create a password
                    to activate it. This USN is: <span className="font-bold">{usn}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        ref={passwordRef}
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError('') }}
                        placeholder="Min. 8 characters"
                        className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
                        disabled={loading}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                        placeholder="Re-enter your password"
                        className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
                        disabled={loading}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl gradient-primary text-white font-semibold text-sm shadow-glow-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Loader2 size={16} className="animate-spin" /> Setting up…</>
                    ) : (
                      'Activate Account & Login'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setStep('usn'); setError(''); setPassword(''); setConfirmPassword('') }}
                    className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    ← Use a different USN
                  </button>
                </form>
              )}

              {/* ── STEP 2b: Return-user login ── */}
              {step === 'password-login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        ref={passwordRef}
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError('') }}
                        placeholder="Enter your password"
                        className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
                        disabled={loading}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl gradient-primary text-white font-semibold text-sm shadow-glow-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Loader2 size={16} className="animate-spin" /> Logging in…</>
                    ) : (
                      'Login'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setStep('usn'); setError(''); setPassword('') }}
                    className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    ← Use a different USN
                  </button>
                </form>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-5">
            Need help?{' '}
            <span className="text-primary-600 font-medium cursor-pointer hover:underline">
              Contact the hostel office
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
