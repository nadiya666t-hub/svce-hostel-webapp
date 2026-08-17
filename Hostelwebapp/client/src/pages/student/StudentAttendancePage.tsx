import { useState, useRef, useCallback, useEffect } from 'react'
import {
  CalendarCheck, MapPin, Camera, CheckCircle2, XCircle, Clock,
  AlertCircle, RefreshCw, ChevronDown, ChevronUp, Loader2,
  Navigation, Lock, Unlock, Image as ImageIcon, BarChart2,
  TrendingUp, Calendar, Info,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { useAttendance } from '@/hooks/useAttendance'
import type { AttendanceRecord, AttendanceStatus } from '@/types'
import clsx from 'clsx'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const STATUS_META: Record<AttendanceStatus, { label: string; color: string; bg: string; dot: string }> = {
  PRESENT:     { label: 'Present',      color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  LATE_PRESENT:{ label: 'Late Present', color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',    dot: 'bg-amber-500'   },
  ABSENT:      { label: 'Absent',       color: 'text-red-700',     bg: 'bg-red-50 border-red-200',        dot: 'bg-red-500'     },
  EXCUSED:     { label: 'Excused',      color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',      dot: 'bg-blue-500'    },
  SPECIAL:     { label: 'Special',      color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200',  dot: 'bg-violet-500'  },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Top date + IST clock banner */
function DateTimeBanner({ currentTime }: { currentTime: Date }) {
  const timeStr = currentTime.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  })
  const dateStr = currentTime.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  return (
    <div className="bg-gradient-to-br from-primary-600 to-violet-600 rounded-2xl p-5 text-white shadow-glow">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-primary-200 text-xs font-medium uppercase tracking-wide mb-1">Today</p>
          <p className="text-lg font-bold leading-tight">{dateStr}</p>
        </div>
        <div className="text-right">
          <p className="text-primary-200 text-xs font-medium uppercase tracking-wide mb-1">IST</p>
          <p className="text-2xl font-mono font-bold tabular-nums">{timeStr}</p>
        </div>
      </div>
    </div>
  )
}

/** Window status card */
function WindowCard({
  windowState,
  window,
}: {
  windowState: string | undefined
  window: { startTime: string; endTime: string; isSpecial: boolean; reason: string | null } | null | undefined
}) {
  const isOpen = windowState === 'OPEN'
  const isBefore = windowState === 'BEFORE'
  const isClosed = windowState === 'CLOSED'

  return (
    <div className={clsx(
      'rounded-2xl border p-5 flex items-start gap-4 transition-all',
      isOpen   ? 'bg-emerald-50 border-emerald-200' :
      isBefore ? 'bg-blue-50 border-blue-200' :
      isClosed ? 'bg-slate-50 border-slate-200' :
                 'bg-slate-50 border-slate-200'
    )}>
      <div className={clsx(
        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
        isOpen ? 'bg-emerald-100' : isBefore ? 'bg-blue-100' : 'bg-slate-100'
      )}>
        <Clock size={20} className={isOpen ? 'text-emerald-600' : isBefore ? 'text-blue-600' : 'text-slate-400'} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-bold text-slate-800">Attendance Window</p>
          {window?.isSpecial && (
            <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
              Special
            </span>
          )}
        </div>
        {window ? (
          <p className="text-base font-semibold text-slate-700">
            {window.startTime} – {window.endTime}{' '}
            <span className="text-xs text-slate-400 font-normal">IST</span>
          </p>
        ) : (
          <p className="text-sm text-slate-400">No window configured for today</p>
        )}
        {window?.reason && (
          <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
            <Info size={11} /> {window.reason}
          </p>
        )}
        <p className={clsx(
          'text-xs font-semibold mt-1.5',
          isOpen ? 'text-emerald-600' : isBefore ? 'text-blue-600' : isClosed ? 'text-slate-500' : 'text-slate-400'
        )}>
          {isOpen   ? '● Open now' :
           isBefore ? `Opens at ${window?.startTime} IST` :
           isClosed ? 'Window closed for today' :
                      'No attendance window today'}
        </p>
      </div>
    </div>
  )
}

/** GPS location card */
function LocationCard({
  location,
  onRequest,
}: {
  location: ReturnType<typeof useAttendance>['location']
  onRequest: () => void
}) {
  const verified = location.result?.verified
  const hasResult = !!location.result
  const permDenied = location.permission === 'denied'

  return (
    <div className={clsx(
      'rounded-2xl border p-5 flex items-start gap-4',
      verified ? 'bg-emerald-50 border-emerald-200' :
      hasResult ? 'bg-red-50 border-red-100' :
      permDenied ? 'bg-red-50 border-red-100' :
                   'bg-white border-slate-200 shadow-card'
    )}>
      <div className={clsx(
        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
        verified ? 'bg-emerald-100' : hasResult || permDenied ? 'bg-red-100' : 'bg-primary-50'
      )}>
        <Navigation size={20} className={verified ? 'text-emerald-600' : hasResult || permDenied ? 'text-red-500' : 'text-primary-500'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 mb-0.5">Location</p>
        {location.checking ? (
          <p className="text-sm text-slate-500 flex items-center gap-1.5">
            <Loader2 size={13} className="animate-spin" /> Verifying location…
          </p>
        ) : verified ? (
          <>
            <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 size={14} /> Verified — inside hostel area
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">{location.result?.distance} m from hostel</p>
          </>
        ) : hasResult ? (
          <>
            <p className="text-sm font-semibold text-red-600 flex items-center gap-1">
              <XCircle size={14} /> Outside hostel area
            </p>
            <p className="text-xs text-red-500 mt-0.5">{location.result?.distance} m away (max {location.result?.radiusMeters} m)</p>
          </>
        ) : permDenied ? (
          <p className="text-sm text-red-600">{location.error}</p>
        ) : location.permission === 'unknown' ? (
          <p className="text-sm text-slate-500">Location permission required for attendance</p>
        ) : (
          <p className="text-sm text-slate-500">Tap to check your location</p>
        )}
        {!location.checking && !verified && (
          <button
            onClick={onRequest}
            className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <MapPin size={12} />
            {location.permission === 'unknown' ? 'Allow Location' : 'Retry Location'}
          </button>
        )}
      </div>
    </div>
  )
}

/** Camera section — captures a live photo via the device camera.
 *  On phones: tries rear camera first, falls back to front camera.
 *  Photo is REQUIRED — submission without a photo is rejected by the backend.
 */
function CameraSection({
  cameraState,
  capturedPhoto,
  canOpen,
  canOpenReason,
  onOpenCamera,
  onCapture,
  onRetake,
  onSubmit,
  submitError,
  submitSuccess,
  setCameraState,
}: {
  cameraState: ReturnType<typeof useAttendance>['cameraState']
  capturedPhoto: ReturnType<typeof useAttendance>['capturedPhoto']
  canOpen: boolean
  canOpenReason: string
  onOpenCamera: () => void
  onCapture: (blob: Blob, mime: string) => void
  onRetake: () => void
  onSubmit: () => void
  submitError: string | null
  submitSuccess: boolean
  setCameraState: (s: ReturnType<typeof useAttendance>['cameraState']) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Try rear camera first (mobile), then front, then any
  const startCamera = useCallback(async () => {
    setCameraError(null)

    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
      { video: true, audio: false },
    ]

    let stream: MediaStream | null = null
    let lastError: string = ''

    for (const constraints of attempts) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
        break
      } catch (err) {
        const e = err as { name?: string }
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
          lastError = 'Camera permission denied. Please allow camera access in your browser settings and try again.'
          break  // no point retrying — permission is denied
        }
        // NotFoundError / OverconstrainedError — try next constraint
        lastError = 'Camera not available. Please check your camera and try again.'
      }
    }

    if (!stream) {
      setCameraError(lastError)
      setCameraState('locked')
      return
    }

    streamRef.current = stream
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play()
    }
  }, [setCameraState])

  // Stop stream when leaving camera view
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    if (cameraState === 'capturing') startCamera()
    else stopCamera()
    return stopCamera
  }, [cameraState, startCamera, stopCamera])

  // Capture frame from video → canvas → Blob
  const captureFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => { if (blob) onCapture(blob, 'image/jpeg') },
      'image/jpeg',
      0.88,
    )
  }, [onCapture])

  // ── Already marked ──
  if (submitSuccess || cameraState === 'done') {
    return (
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center">
        <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
        <p className="text-base font-bold text-emerald-700">Attendance Marked!</p>
        <p className="text-sm text-emerald-600 mt-1">Your attendance has been recorded for today.</p>
      </div>
    )
  }

  // ── Camera permission / hardware error ──
  if (cameraError) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-red-500" />
        </div>
        <p className="text-sm font-bold text-red-700">Camera Error</p>
        <p className="text-xs text-red-600 mt-1 max-w-xs mx-auto leading-relaxed">{cameraError}</p>
        <button
          onClick={() => { setCameraError(null); setCameraState('locked') }}
          className="mt-4 px-4 py-2 text-xs font-semibold text-red-700 border border-red-300 rounded-xl hover:bg-red-100 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  // ── Camera locked ──
  if (!canOpen && cameraState === 'locked') {
    return (
      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Lock size={24} className="text-slate-400" />
        </div>
        <p className="text-sm font-bold text-slate-600">Camera Locked</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">{canOpenReason}</p>
      </div>
    )
  }
  if (canOpen && cameraState === 'locked') {
    return (
      <div className="rounded-2xl bg-primary-50 border border-primary-200 p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
          <Unlock size={24} className="text-primary-600" />
        </div>
        <p className="text-sm font-bold text-primary-700">Camera Ready</p>
        <p className="text-xs text-primary-500 mt-1 mb-4">Take a live photo to mark your attendance</p>
        <button
          onClick={onOpenCamera}
          className="inline-flex items-center gap-2 px-5 py-2.5 gradient-primary text-white text-sm font-semibold rounded-xl shadow-glow-sm hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <Camera size={16} /> Take Attendance Photo
        </button>
      </div>
    )
  }

  // ── Live camera ──
  if (cameraState === 'capturing') {
    return (
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-card bg-black">
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-72 object-cover"
          />
          {/* Corner guides */}
          <div className="absolute inset-4 pointer-events-none">
            {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
              <div key={i} className={`absolute w-6 h-6 border-white border-2 ${pos} ${i < 2 ? 'border-b-0' : 'border-t-0'} ${i % 2 === 0 ? 'border-r-0' : 'border-l-0'}`} />
            ))}
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <div className="bg-slate-900 p-4 flex justify-center gap-4">
          <button
            onClick={() => { stopCamera(); setCameraState('locked') }}
            className="px-4 py-2 rounded-xl border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={captureFrame}
            className="flex items-center gap-2 px-6 py-2 gradient-primary text-white text-sm font-semibold rounded-xl shadow-glow-sm hover:opacity-90 transition-all"
          >
            <Camera size={16} /> Capture
          </button>
        </div>
      </div>
    )
  }

  // ── Preview ──
  if (cameraState === 'preview' && capturedPhoto) {
    return (
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-card">
        <div className="relative bg-black">
          <img src={capturedPhoto.url} alt="Attendance preview" className="w-full max-h-72 object-cover" />
          <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1">
            <ImageIcon size={11} /> Preview
          </div>
        </div>
        {submitError && (
          <div className="mx-4 mt-3 flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-sm">
            <AlertCircle size={14} className="shrink-0 mt-0.5" /> {submitError}
          </div>
        )}
        <div className="p-4 flex gap-3">
          <button
            onClick={onRetake}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} /> Retake
          </button>
          <button
            onClick={onSubmit}
            className="flex-1 py-2.5 gradient-primary text-white text-sm font-semibold rounded-xl shadow-glow-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={14} /> Submit
          </button>
        </div>
      </div>
    )
  }

  // ── Submitting ──
  if (cameraState === 'submitting') {
    return (
      <div className="rounded-2xl bg-primary-50 border border-primary-200 p-8 text-center">
        <Loader2 size={36} className="animate-spin text-primary-500 mx-auto mb-3" />
        <p className="text-sm font-semibold text-primary-700">Submitting attendance…</p>
        <p className="text-xs text-primary-500 mt-1">Please wait, verifying with server</p>
      </div>
    )
  }

  return null
}

/** Single attendance history row with accordion expand */
function HistoryRow({ record, index }: { record: AttendanceRecord; index: number }) {
  const [open, setOpen] = useState(false)
  const meta = STATUS_META[record.status] ?? STATUS_META.ABSENT

  return (
    <div
      className={clsx(
        'border border-slate-100 rounded-xl overflow-hidden animate-slide-up bg-white',
      )}
      style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
    >
      {/* Header row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left"
      >
        <span className={clsx('w-2 h-2 rounded-full shrink-0', meta.dot)} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-slate-700">{fmtDateShort(record.date)}</span>
        </div>
        <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full border', meta.bg, meta.color)}>
          {meta.label}
        </span>
        {record.markedAt && (
          <span className="text-xs text-slate-400 hidden sm:block">{fmtTime(record.markedAt)}</span>
        )}
        {open ? <ChevronUp size={15} className="text-slate-400 shrink-0" /> : <ChevronDown size={15} className="text-slate-400 shrink-0" />}
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-slate-100 px-4 py-4 bg-slate-50/50 grid grid-cols-2 gap-3 text-xs">
          {[
            { label: 'Date', value: fmtDate(record.date) },
            { label: 'Status', value: meta.label },
            { label: 'Marked At', value: record.markedAt ? fmtTime(record.markedAt) : '—' },
            { label: 'Location', value: record.locationType === 'VERIFIED' ? 'Verified ✓' : 'Unverified' },
            { label: 'Distance', value: record.distanceFromHostel != null ? `${record.distanceFromHostel} m` : '—' },
            {
              label: 'Window',
              value: record.window ? `${record.window.startTime} – ${record.window.endTime}` : '—',
            },
            ...(record.isSpecialWindow ? [{ label: 'Special Timing', value: record.specialWindowReason ?? 'Yes' }] : []),
            ...(record.excuseReason ? [{ label: 'Excuse Reason', value: record.excuseReason }] : []),
            ...(record.photoUrl ? [{ label: 'Photo', value: 'Captured ✓' }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-slate-400 uppercase tracking-wide font-medium text-[10px]">{label}</span>
              <span className="text-slate-700 font-semibold">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Attendance percentage ring + stats */
function PercentageCard({
  summary,
}: {
  summary: ReturnType<typeof useAttendance>['summary']
}) {
  if (!summary) return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-5 animate-pulse">
      <div className="h-4 bg-slate-100 rounded w-1/3 mb-3" />
      <div className="h-20 bg-slate-100 rounded" />
    </div>
  )

  const pct = summary.percentage
  const circumference = 2 * Math.PI * 44
  const offset = circumference - (pct / 100) * circumference

  const stats = [
    { label: 'Present', value: summary.presentDays, color: 'text-emerald-600' },
    { label: 'Late', value: summary.lateDays, color: 'text-amber-600' },
    { label: 'Absent', value: summary.absentDays, color: 'text-red-500' },
    { label: 'Excused', value: summary.excusedDays, color: 'text-blue-500' },
  ]

  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-5">
      <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
        <TrendingUp size={15} className="text-primary-500" /> Attendance Summary
      </h3>
      <div className="flex items-center gap-6">
        {/* SVG ring */}
        <div className="relative shrink-0">
          <svg width="100" height="100" className="-rotate-90">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#e2e8f0" strokeWidth="10" />
            <circle
              cx="50" cy="50" r="44"
              fill="none"
              stroke={pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-extrabold text-slate-800">{pct}%</span>
            <span className="text-[10px] text-slate-400 font-medium">Overall</span>
          </div>
        </div>
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 flex-1">
          {stats.map(({ label, value, color }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-2.5 text-center">
              <p className={clsx('text-lg font-bold', color)}>{value}</p>
              <p className="text-[11px] text-slate-400 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 bg-slate-50 rounded-xl px-3 py-2 text-center">
        <span className="text-xs text-slate-400">Total recorded days: </span>
        <span className="text-xs font-bold text-slate-700">{summary.totalDays}</span>
      </div>
    </div>
  )
}

/** Animated bar chart — weekly or monthly toggle */
function AttendanceChart({
  summary,
}: {
  summary: ReturnType<typeof useAttendance>['summary']
}) {
  const [view, setView] = useState<'weekly' | 'monthly'>('weekly')

  if (!summary) return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-5 animate-pulse">
      <div className="h-4 bg-slate-100 rounded w-1/3 mb-3" />
      <div className="h-36 bg-slate-100 rounded" />
    </div>
  )

  const data = view === 'weekly'
    ? summary.weeklyData.slice(-6).map((w) => ({ name: w.week, Present: w.present, Absent: w.absent }))
    : summary.monthlyData.map((m) => ({ name: m.month, Present: m.present, Absent: m.absent }))

  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <BarChart2 size={15} className="text-primary-500" /> Attendance Chart
        </h3>
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          {(['weekly', 'monthly'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={clsx(
                'px-3 py-1 text-xs font-semibold rounded-md transition-all',
                view === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {v === 'weekly' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barCategoryGap="30%" barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
            cursor={{ fill: 'rgba(0,0,0,0.03)' }}
          />
          <Bar dataKey="Present" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill="#10b981" />)}
          </Bar>
          <Bar dataKey="Absent" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill="#fca5a5" />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 justify-center">
        {[{ color: 'bg-emerald-500', label: 'Present' }, { color: 'bg-red-300', label: 'Absent' }].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={clsx('w-2.5 h-2.5 rounded-sm', color)} />{label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StudentAttendancePage() {
  const {
    status, statusLoading, statusError, fetchStatus,
    currentTime,
    location, requestLocation,
    cameraState, setCameraState,
    capturedPhoto, setPhoto, retakePhoto,
    canOpenCamera,
    submitAttendance, submitError, submitSuccess,
    summary,
    history, historyTotal, historyPage, historyLoading, loadHistory,
  } = useAttendance()

  const [activeTab, setActiveTab] = useState<'mark' | 'history' | 'stats'>('mark')

  const { allowed: canOpen, reason: canOpenReason } = canOpenCamera()

  // Auto-request location when window is open
  useEffect(() => {
    if (
      status?.windowState === 'OPEN' &&
      location.permission === 'unknown' &&
      !location.checking
    ) {
      requestLocation()
    }
  }, [status?.windowState, location.permission, location.checking, requestLocation])

  // ── Loading state ──
  if (statusLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse pt-2">
        <div className="h-24 bg-slate-100 rounded-2xl" />
        <div className="h-20 bg-slate-100 rounded-2xl" />
        <div className="h-20 bg-slate-100 rounded-2xl" />
        <div className="h-44 bg-slate-100 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
            <CalendarCheck size={20} className="text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
            <p className="text-sm text-slate-400">Mark and track your daily attendance</p>
          </div>
        </div>
        <button
          onClick={fetchStatus}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Server error banner */}
      {statusError && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 rounded-xl p-3.5 mb-4 text-sm">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{statusError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-xl p-1 mb-5">
        {([
          { id: 'mark', label: 'Mark', icon: Camera },
          { id: 'history', label: 'History', icon: Calendar },
          { id: 'stats', label: 'Statistics', icon: BarChart2 },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition-all',
              activeTab === id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── MARK TAB ── */}
      {activeTab === 'mark' && (
        <div className="space-y-4">
          {/* Date/time */}
          <DateTimeBanner currentTime={currentTime} />

          {/* Special timing notice */}
          {status?.window?.isSpecial && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">Attendance Time Updated</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Your attendance timing for today has been updated to{' '}
                  <strong>{status.window.startTime} – {status.window.endTime} IST</strong>.
                </p>
                {status.window.reason && (
                  <p className="text-xs text-amber-600 mt-0.5">Reason: {status.window.reason}</p>
                )}
              </div>
            </div>
          )}

          {/* Window status */}
          <WindowCard windowState={status?.windowState} window={status?.window} />

          {/* Location */}
          <LocationCard location={location} onRequest={requestLocation} />

          {/* Camera / submit */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Camera</p>
            <CameraSection
              cameraState={cameraState}
              capturedPhoto={capturedPhoto}
              canOpen={canOpen}
              canOpenReason={canOpenReason}
              onOpenCamera={() => setCameraState('capturing')}
              onCapture={setPhoto}
              onRetake={retakePhoto}
              onSubmit={submitAttendance}
              submitError={submitError}
              submitSuccess={submitSuccess}
              setCameraState={setCameraState}
            />
          </div>

          {/* Already marked — show today's record */}
          {status?.alreadyMarked && status.todayRecord && cameraState !== 'done' && !submitSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <p className="text-sm font-bold text-emerald-800 flex items-center gap-2 mb-3">
                <CheckCircle2 size={16} /> Attendance Marked Today
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: 'Status', value: STATUS_META[status.todayRecord.status]?.label ?? status.todayRecord.status },
                  { label: 'Time', value: fmtTime(status.todayRecord.markedAt) },
                  { label: 'Location', value: status.todayRecord.locationType === 'VERIFIED' ? 'Verified ✓' : 'Unverified' },
                  { label: 'Distance', value: status.todayRecord.distanceFromHostel != null ? `${status.todayRecord.distanceFromHostel} m` : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white rounded-lg px-3 py-2 border border-emerald-100">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
                    <p className="font-semibold text-slate-700 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-700">{history.length}</span> of{' '}
              <span className="font-semibold text-slate-700">{historyTotal}</span> days
            </p>
          </div>

          {historyLoading && history.length === 0 ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-12 text-center">
              <CalendarCheck size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500">No attendance records yet</p>
              <p className="text-xs text-slate-400 mt-1">Your attendance history will appear here</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {history.map((record, i) => (
                  <HistoryRow key={record.id} record={record} index={i} />
                ))}
              </div>
              {history.length < historyTotal && (
                <button
                  onClick={() => loadHistory(historyPage + 1)}
                  disabled={historyLoading}
                  className="w-full py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {historyLoading ? <><Loader2 size={14} className="animate-spin" /> Loading…</> : 'Load more'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── STATS TAB ── */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <PercentageCard summary={summary} />
          <AttendanceChart summary={summary} />

          {/* Status legend */}
          <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Info size={14} className="text-primary-500" /> Status Guide
            </h3>
            <div className="space-y-2">
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className={clsx('w-2 h-2 rounded-full shrink-0', meta.dot)} />
                  <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full border', meta.bg, meta.color)}>
                    {meta.label}
                  </span>
                  <span className="text-xs text-slate-400">
                    {key === 'PRESENT' && 'Marked within the normal window (8:30–8:40 PM)'}
                    {key === 'LATE_PRESENT' && 'Marked via a special late-return window approved by Warden'}
                    {key === 'ABSENT' && 'No attendance marked for that day'}
                    {key === 'EXCUSED' && 'Absence excused by Warden or Admin'}
                    {key === 'SPECIAL' && 'Other special attendance case'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
