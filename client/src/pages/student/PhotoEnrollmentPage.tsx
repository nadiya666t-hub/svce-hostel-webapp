/**
 * PhotoEnrollmentPage
 * Shown once after a student sets their password for the first time.
 * Captures a reference photo that is stored against the student's USN
 * and used for daily attendance verification.
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera, CheckCircle2, RefreshCw, Loader2,
  AlertCircle, User, ShieldCheck, Info, X,
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { enrollmentService } from '@/services/enrollmentService'
import clsx from 'clsx'

type Step = 'intro' | 'camera' | 'preview' | 'uploading' | 'done'

export default function PhotoEnrollmentPage() {
  const { isDark } = useTheme()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('intro')
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [capturedUrl, setCapturedUrl]   = useState<string | null>(null)
  const [error, setError]               = useState<string | null>(null)
  const [cameraError, setCameraError]   = useState<string | null>(null)

  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // ── Camera lifecycle ──────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    setCameraError(null)
    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
      { video: true, audio: false },
    ]
    let stream: MediaStream | null = null
    for (const c of attempts) {
      try { stream = await navigator.mediaDevices.getUserMedia(c); break }
      catch (e) {
        const err = e as { name?: string }
        if (err.name === 'NotAllowedError') {
          setCameraError('Camera permission denied. Please allow camera access in your browser settings and try again.')
          return
        }
      }
    }
    if (!stream) {
      setCameraError('Camera not available. Please check your device and try again.')
      return
    }
    streamRef.current = stream
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play()
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    if (step === 'camera') startCamera()
    else stopCamera()
    return stopCamera
  }, [step, startCamera, stopCamera])

  // ── Capture ───────────────────────────────────────────────────────────────

  const captureFrame = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width  = video.videoWidth  || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Mirror if front-facing (cosmetic — stored without mirror for identification)
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      setCapturedBlob(blob)
      setCapturedUrl(url)
      setStep('preview')
    }, 'image/jpeg', 0.9)
  }, [])

  const retake = useCallback(() => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    setCapturedBlob(null)
    setCapturedUrl(null)
    setError(null)
    setStep('camera')
  }, [capturedUrl])

  // ── Submit ────────────────────────────────────────────────────────────────

  const submit = useCallback(async () => {
    if (!capturedBlob) return
    setStep('uploading')
    setError(null)
    try {
      const res = await enrollmentService.uploadPhoto(capturedBlob, 'image/jpeg')
      if (res.success) {
        if (capturedUrl) URL.revokeObjectURL(capturedUrl)
        setStep('done')
      } else {
        setError(res.message ?? 'Upload failed. Please try again.')
        setStep('preview')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Upload failed. Please try again.')
      setStep('preview')
    }
  }, [capturedBlob, capturedUrl])

  // ── UI ────────────────────────────────────────────────────────────────────

  const bg = isDark ? 'bg-dark-950' : 'bg-slate-50'
  const card = isDark
    ? 'bg-dark-900 border-white/8 shadow-[0_4px_24px_rgba(0,0,0,0.7)]'
    : 'bg-white border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.08)]'

  return (
    <div className={clsx('min-h-screen flex flex-col items-center justify-center px-4 py-10 transition-colors', bg)}>
      <div className={clsx('w-full max-w-md rounded-2xl border overflow-hidden animate-slide-up', card)}>

        {/* Accent top line */}
        <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, #4f7ef8, transparent)' }} />

        {/* ── INTRO ── */}
        {step === 'intro' && (
          <div className="p-8">
            <div className="flex flex-col items-center text-center mb-7">
              <div className={clsx(
                'w-16 h-16 rounded-2xl flex items-center justify-center mb-4',
                isDark ? 'bg-accent-600/15 border border-accent-600/25' : 'bg-blue-50 border border-blue-200'
              )}>
                <Camera size={28} className={isDark ? 'text-accent-400' : 'text-blue-600'} />
              </div>
              <h1 className={clsx('text-xl font-bold mb-1', isDark ? 'text-white' : 'text-slate-900')}>
                Photo Enrollment
              </h1>
              <p className={clsx('text-sm', isDark ? 'text-slate-300' : 'text-slate-500')}>
                Welcome, <strong>{user?.name ?? 'Student'}</strong>
              </p>
            </div>

            <div className={clsx(
              'rounded-xl p-4 mb-6 text-sm leading-relaxed',
              isDark ? 'bg-accent-600/10 border border-accent-600/20 text-accent-200' : 'bg-blue-50 border border-blue-200 text-blue-800'
            )}>
              <p className="font-semibold mb-2 flex items-center gap-2">
                <ShieldCheck size={15} /> One-time registration
              </p>
              <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                Your photo will be used for daily hostel attendance verification.
                You only need to do this once.
              </p>
            </div>

            {/* Guidelines */}
            <div className="space-y-2.5 mb-7">
              {[
                'Face clearly visible, looking directly at the camera',
                'Good lighting — avoid dark or backlit settings',
                'Keep your face inside the capture area',
                'Remove anything that substantially covers your face',
                'Keep the camera at an appropriate distance',
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className={clsx(
                    'w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                    isDark ? 'bg-accent-600/20 text-accent-400' : 'bg-blue-100 text-blue-600'
                  )}>
                    <span className="text-[10px] font-bold">{i + 1}</span>
                  </div>
                  <p className={clsx('text-sm', isDark ? 'text-slate-300' : 'text-slate-600')}>{tip}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep('camera')}
              className="btn-accent w-full py-3 text-sm flex items-center justify-center gap-2"
            >
              <Camera size={16} /> Open Camera
            </button>

            <button
              onClick={() => navigate('/student/dashboard')}
              className={clsx(
                'w-full mt-3 py-2.5 text-xs font-medium rounded-xl transition-colors',
                isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
              )}
            >
              Skip for now (attendance won't be available)
            </button>
          </div>
        )}

        {/* ── CAMERA ── */}
        {step === 'camera' && (
          <div>
            {cameraError ? (
              <div className="p-8 flex flex-col items-center text-center">
                <AlertCircle size={36} className="text-red-400 mb-3" />
                <p className={clsx('text-sm font-bold mb-2', isDark ? 'text-slate-200' : 'text-slate-800')}>Camera Error</p>
                <p className="text-xs text-red-400 leading-relaxed max-w-xs mb-5">{cameraError}</p>
                <button onClick={() => { setCameraError(null); startCamera() }}
                  className="btn-accent px-5 py-2 text-sm">Try Again</button>
                <button onClick={() => setStep('intro')}
                  className={clsx('mt-2 text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>← Back</button>
              </div>
            ) : (
              <>
                {/* Camera header */}
                <div className={clsx('flex items-center justify-between px-4 py-3 border-b', isDark ? 'border-white/5' : 'border-slate-100')}>
                  <p className={clsx('text-sm font-semibold', isDark ? 'text-slate-200' : 'text-slate-700')}>Position your face in the frame</p>
                  <button onClick={() => setStep('intro')} className={clsx('p-1 rounded', isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}>
                    <X size={16} />
                  </button>
                </div>

                {/* Video */}
                <div className="relative bg-black aspect-[4/3] overflow-hidden">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  {/* Face oval guide */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-60 rounded-full border-2 border-white/60"
                      style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }} />
                  </div>
                  {/* Corner guides */}
                  {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                    <div key={i} className={clsx(
                      'absolute w-8 h-8 border-white border-2 m-3',
                      pos,
                      i < 2 ? 'border-b-0' : 'border-t-0',
                      i % 2 === 0 ? 'border-r-0' : 'border-l-0'
                    )} />
                  ))}
                </div>
                <canvas ref={canvasRef} className="hidden" />

                <div className="p-4 flex items-center gap-2">
                  <div className={clsx('flex-1 rounded-lg p-2.5 text-xs flex items-start gap-2',
                    isDark ? 'bg-dark-800 text-slate-400' : 'bg-slate-50 text-slate-500')}>
                    <Info size={13} className="shrink-0 mt-0.5" />
                    Look directly at the camera with good lighting on your face.
                  </div>
                  <button
                    onClick={captureFrame}
                    className="shrink-0 w-14 h-14 rounded-full bg-white border-4 border-accent-500 flex items-center justify-center transition-transform active:scale-95 hover:scale-105"
                    style={{ boxShadow: '0 0 0 4px rgba(79,126,248,0.25)' }}
                  >
                    <Camera size={22} className="text-accent-600" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── PREVIEW ── */}
        {step === 'preview' && capturedUrl && (
          <div>
            <div className={clsx('flex items-center justify-between px-4 py-3 border-b', isDark ? 'border-white/5' : 'border-slate-100')}>
              <p className={clsx('text-sm font-semibold', isDark ? 'text-slate-200' : 'text-slate-700')}>Preview</p>
              <span className={clsx('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>
                Check your photo is clear
              </span>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden bg-black">
              <img src={capturedUrl} alt="Captured" className="w-full h-full object-cover" />
            </div>

            {error && (
              <div className="mx-4 mt-3 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-xs">
                <AlertCircle size={13} className="shrink-0 mt-0.5" /> {error}
              </div>
            )}

            {/* Quality checklist */}
            <div className="px-4 pt-3">
              <p className={clsx('text-xs font-semibold mb-2', isDark ? 'text-slate-400' : 'text-slate-500')}>
                Before submitting, verify:
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {['Face clearly visible', 'Good lighting', 'Looking at camera', 'Not blurry'].map(check => (
                  <div key={check} className={clsx(
                    'flex items-center gap-1.5 text-xs rounded-lg px-2 py-1.5',
                    isDark ? 'bg-dark-800 text-slate-400' : 'bg-slate-50 text-slate-500'
                  )}>
                    <CheckCircle2 size={11} className={isDark ? 'text-emerald-400' : 'text-emerald-500'} />
                    {check}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 p-4">
              <button onClick={retake}
                className={clsx(
                  'flex-1 py-2.5 border rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors',
                  isDark ? 'border-white/8 text-slate-300 hover:bg-dark-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                )}>
                <RefreshCw size={14} /> Retake
              </button>
              <button onClick={submit}
                className="flex-1 py-2.5 btn-accent text-sm flex items-center justify-center gap-2">
                <CheckCircle2 size={14} /> Use This Photo
              </button>
            </div>
          </div>
        )}

        {/* ── UPLOADING ── */}
        {step === 'uploading' && (
          <div className="p-12 flex flex-col items-center text-center">
            <Loader2 size={40} className="animate-spin text-accent-400 mb-4" />
            <p className={clsx('text-base font-semibold', isDark ? 'text-slate-200' : 'text-slate-700')}>
              Saving your photo…
            </p>
            <p className={clsx('text-sm mt-1', isDark ? 'text-slate-500' : 'text-slate-400')}>
              This will only take a moment.
            </p>
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div className="p-10 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center mb-5">
              <CheckCircle2 size={38} className="text-emerald-400" />
            </div>
            <h2 className={clsx('text-xl font-bold mb-2', isDark ? 'text-white' : 'text-slate-900')}>
              Enrollment Complete!
            </h2>
            <p className={clsx('text-sm mb-1', isDark ? 'text-slate-300' : 'text-slate-600')}>
              Your reference photo has been saved.
            </p>
            <p className={clsx('text-xs mb-8', isDark ? 'text-slate-500' : 'text-slate-400')}>
              You can now use the daily attendance feature between 8:30 PM – 8:40 PM.
            </p>

            <div className={clsx(
              'w-full rounded-xl p-3.5 mb-6 text-xs flex items-start gap-2',
              isDark ? 'bg-accent-600/10 border border-accent-600/20 text-accent-200' : 'bg-blue-50 border border-blue-200 text-blue-700'
            )}>
              <User size={14} className="shrink-0 mt-0.5" />
              <span>Your photo is stored securely and only used for hostel attendance verification.</span>
            </div>

            <button
              onClick={() => navigate('/student/dashboard', { replace: true })}
              className="btn-accent w-full py-3 text-sm"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
