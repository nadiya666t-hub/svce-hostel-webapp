import { useState, useRef, useCallback, useEffect } from 'react'
import {
  CalendarCheck, Camera, CheckCircle2, XCircle, Clock,
  AlertCircle, RefreshCw, ChevronDown, ChevronUp, Loader2,
  Navigation, Lock, Unlock, Image as ImageIcon, BarChart2,
  TrendingUp, Calendar, Info,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { useAttendance } from '@/hooks/useAttendance'
import { useTheme } from '@/hooks/useTheme'
import type { AttendanceRecord, AttendanceStatus } from '@/types'
import clsx from 'clsx'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric',
  })
}
function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric',
  })
}

// Only show Present, Late Present, Absent in the UI (no Excused/Special per spec)
const STATUS_META: Record<AttendanceStatus, { label: string; color: string; bg: string; dot: string }> = {
  PRESENT:      { label: 'Present',      color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500' },
  LATE_PRESENT: { label: 'Late Present', color: 'text-amber-500',   bg: 'bg-amber-500/10 border-amber-500/20',    dot: 'bg-amber-500'   },
  ABSENT:       { label: 'Absent',       color: 'text-red-500',     bg: 'bg-red-500/10 border-red-500/20',        dot: 'bg-red-500'     },
  EXCUSED:      { label: 'Excused',      color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20',dot: 'bg-emerald-400' },
  SPECIAL:      { label: 'Present',      color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20',dot: 'bg-emerald-400' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DateTimeBanner({ currentTime }: { currentTime: Date }) {
  const { isDark } = useTheme()
  const timeStr = currentTime.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  })
  const dateStr = currentTime.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  return (
    <div className={clsx('rounded-2xl border p-5 flex items-center justify-between gap-4',
      isDark ? 'bg-dark-800 border-white/8' : 'bg-white border-zinc-200')}>
      <div>
        <p className={clsx('text-[10px] uppercase tracking-widest font-mono mb-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>Today</p>
        <p className={clsx('text-sm font-semibold', isDark ? 'text-zinc-200' : 'text-zinc-800')}>{dateStr}</p>
      </div>
      <div className="text-right">
        <p className={clsx('text-[10px] uppercase tracking-widest font-mono mb-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>IST</p>
        <p className={clsx('text-2xl font-mono font-bold tabular-nums', isDark ? 'text-white' : 'text-zinc-900')}>{timeStr}</p>
      </div>
    </div>
  )
}

function WindowCard({ windowState, window }: {
  windowState: string | undefined
  window: { startTime: string; endTime: string; isSpecial: boolean; reason: string | null } | null | undefined
}) {
  const { isDark } = useTheme()
  const isOpen   = windowState === 'OPEN'
  const isBefore = windowState === 'BEFORE'
  const isClosed = windowState === 'CLOSED'

  return (
    <div className={clsx('rounded-2xl border p-4 flex items-start gap-3 transition-all',
      isOpen   ? 'bg-emerald-500/10 border-emerald-500/25' :
      isBefore ? 'bg-accent-600/10 border-accent-600/25' :
      isDark   ? 'bg-dark-800 border-white/8' : 'bg-zinc-50 border-zinc-200'
    )}>
      <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
        isOpen ? 'bg-emerald-500/20' : isBefore ? 'bg-accent-600/20' : isDark ? 'bg-dark-700' : 'bg-zinc-100')}>
        <Clock size={17} className={isOpen ? 'text-emerald-400' : isBefore ? 'text-accent-400' : isDark ? 'text-zinc-500' : 'text-zinc-400'} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <p className={clsx('text-sm font-bold', isDark ? 'text-zinc-100' : 'text-zinc-900')}>Attendance Window</p>
          {window?.isSpecial && (
            <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full font-semibold">Special</span>
          )}
        </div>
        {window ? (
          <p className={clsx('text-base font-bold font-mono', isDark ? 'text-zinc-200' : 'text-zinc-700')}>
            {window.startTime} – {window.endTime}
            <span className={clsx('text-xs font-normal ml-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>IST</span>
          </p>
        ) : (
          <p className={clsx('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            Opens daily: <span className="font-mono font-semibold">8:30 PM – 8:40 PM</span>
          </p>
        )}
        {window?.reason && (
          <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
            <Info size={11} /> {window.reason}
          </p>
        )}
        <p className={clsx('text-xs font-semibold mt-1.5',
          isOpen ? 'text-emerald-400' : isBefore ? 'text-accent-400' : isClosed ? isDark ? 'text-zinc-400' : 'text-zinc-500' : isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          {isOpen   ? '● Open now — attendance is active' :
           isBefore ? `Opens at ${window?.startTime ?? '8:30 PM'} IST` :
           isClosed ? 'Attendance window closed for today' :
                      'Attendance opens at 8:30 PM tonight'}
        </p>
      </div>
    </div>
  )
}

function LocationCard({ gps, onRequest }: {
  gps: ReturnType<typeof useAttendance>['gps']
  onRequest: () => void
}) {
  const { isDark } = useTheme()
  const verifiedLocation = gps.verifiedLocation
  const isHostel  = verifiedLocation === 'HOSTEL'
  const isCollege = verifiedLocation === 'COLLEGE'
  const isOutside = verifiedLocation === 'OUTSIDE'
  const verified  = isHostel || isCollege
  const permDenied = gps.permission === 'denied'
  const accuracyLow = gps.result?.gpsAccuracyTooLow ?? false

  const borderClass = verified ? 'bg-emerald-500/10 border-emerald-500/25' :
    isOutside || permDenied || accuracyLow ? 'bg-red-500/10 border-red-500/25' :
    isDark ? 'bg-dark-800 border-white/8' : 'bg-white border-zinc-200'

  const iconColor = verified ? 'text-emerald-400' : isOutside || permDenied ? 'text-red-400' : 'text-accent-400'
  const iconBg    = verified ? 'bg-emerald-500/20' : isOutside || permDenied ? 'bg-red-500/20' : isDark ? 'bg-accent-600/15' : 'bg-blue-50'

  return (
    <div className={clsx('rounded-2xl border p-4 flex items-start gap-3', borderClass)}>
      <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
        <Navigation size={17} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-bold mb-0.5', isDark ? 'text-zinc-100' : 'text-zinc-900')}>Location</p>

        {gps.checking ? (
          <p className={clsx('text-sm flex items-center gap-1.5', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
            <Loader2 size={13} className="animate-spin" /> Verifying location…
          </p>
        ) : accuracyLow ? (
          <div>
            <p className="text-sm font-semibold text-amber-400 flex items-center gap-1">
              <AlertCircle size={13} /> GPS accuracy too low ({gps.accuracy ? Math.round(gps.accuracy) : '?'} m)
            </p>
            <p className={clsx('text-xs mt-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              Max allowed: {gps.result?.maxAccuracyMeters ?? 50} m. Enable precise location.
            </p>
          </div>
        ) : isHostel ? (
          <div>
            <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={13} /> <span className="text-emerald-300 font-bold">HOSTEL</span> — Verified ✓
            </p>
            <p className={clsx('text-xs mt-0.5', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              {gps.coords && <>Lat: {gps.coords.latitude.toFixed(6)} · Lng: {gps.coords.longitude.toFixed(6)}</>}
              {gps.accuracy && <> · Accuracy: {Math.round(gps.accuracy)} m</>}
            </p>
          </div>
        ) : isCollege ? (
          <div>
            <p className="text-sm font-semibold text-blue-400 flex items-center gap-1.5">
              <CheckCircle2 size={13} /> <span className="text-blue-300 font-bold">COLLEGE</span> — Verified ✓
            </p>
            <p className={clsx('text-xs mt-0.5', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              {gps.coords && <>Lat: {gps.coords.latitude.toFixed(6)} · Lng: {gps.coords.longitude.toFixed(6)}</>}
              {gps.accuracy && <> · Accuracy: {Math.round(gps.accuracy)} m</>}
            </p>
          </div>
        ) : isOutside ? (
          <div>
            <p className="text-sm font-semibold text-red-400 flex items-center gap-1">
              <XCircle size={13} /> OUTSIDE — Not in hostel or college area
            </p>
            <p className={clsx('text-xs mt-0.5', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              Hostel: {gps.result?.hostelDistanceMeters ?? '?'} m away
              {gps.result?.collegeDistanceMeters != null && <> · College: {gps.result.collegeDistanceMeters} m away</>}
            </p>
          </div>
        ) : permDenied ? (
          <p className="text-sm text-red-400">{gps.error}</p>
        ) : (
          <p className={clsx('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
            {gps.permission === 'unknown' ? 'Location permission required' : 'Tap to check your location'}
          </p>
        )}

        {gps.coords && !gps.checking && (
          <p className={clsx('text-[10px] font-mono mt-1.5', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
            {gps.coords.latitude.toFixed(6)}, {gps.coords.longitude.toFixed(6)}
            {gps.accuracy != null && ` · ±${Math.round(gps.accuracy)} m`}
          </p>
        )}

        {!gps.checking && !verified && (
          <button onClick={onRequest}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-accent-400 hover:text-accent-300 bg-accent-600/10 hover:bg-accent-600/15 px-3 py-1.5 rounded-lg transition-colors">
            <RefreshCw size={11} />
            {gps.permission === 'unknown' ? 'Allow Location' : 'Refresh Location'}
          </button>
        )}
        {verified && !gps.checking && (
          <button onClick={onRequest}
            className={clsx('mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors',
              isDark ? 'text-zinc-500 hover:text-zinc-300 bg-white/5 hover:bg-white/8' : 'text-zinc-400 hover:text-zinc-600 bg-zinc-100 hover:bg-zinc-200')}>
            <RefreshCw size={11} /> Refresh Location
          </button>
        )}
      </div>
    </div>
  )
}

function CameraPanel({
  cameraState, capturedPhoto, canOpen, canOpenReason,
  onOpenCamera, onCapture, onRetake, onSubmit,
  submitError, submitSuccess, setCameraState,
}: {
  cameraState: ReturnType<typeof useAttendance>['cameraState']
  capturedPhoto: ReturnType<typeof useAttendance>['capturedPhoto']
  canOpen: boolean; canOpenReason: string
  onOpenCamera: () => void
  onCapture: (blob: Blob, mime: string) => void
  onRetake: () => void; onSubmit: () => void
  submitError: string | null; submitSuccess: boolean
  setCameraState: (s: ReturnType<typeof useAttendance>['cameraState']) => void
}) {
  const { isDark } = useTheme()
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const startCamera = useCallback(async () => {
    setCameraError(null)
    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
      { video: true, audio: false },
    ]
    let stream: MediaStream | null = null
    let lastError = ''
    for (const c of attempts) {
      try { stream = await navigator.mediaDevices.getUserMedia(c); break }
      catch (err) {
        const e = err as { name?: string }
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
          lastError = 'Camera permission denied. Please allow camera access in your browser settings.'; break
        }
        lastError = 'Camera not available. Please check your camera and try again.'
      }
    }
    if (!stream) { setCameraError(lastError); setCameraState('locked'); return }
    streamRef.current = stream
    if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
  }, [setCameraState])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null
  }, [])

  useEffect(() => {
    if (cameraState === 'capturing') startCamera(); else stopCamera()
    return stopCamera
  }, [cameraState, startCamera, stopCamera])

  const captureFrame = useCallback(() => {
    const video = videoRef.current; const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d'); if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(blob => { if (blob) onCapture(blob, 'image/jpeg') }, 'image/jpeg', 0.88)
  }, [onCapture])

  const panelBase = clsx('rounded-2xl border overflow-hidden h-full min-h-[280px] flex flex-col',
    isDark ? 'bg-dark-800 border-white/8' : 'bg-white border-zinc-200')

  if (submitSuccess || cameraState === 'done') return (
    <div className={clsx(panelBase, 'items-center justify-center p-6 text-center bg-emerald-500/10 border-emerald-500/25')}>
      <CheckCircle2 size={44} className="text-emerald-400 mb-3" />
      <p className="text-base font-bold text-emerald-400">Attendance Marked!</p>
      <p className="text-xs text-emerald-500 mt-1">Recorded for today.</p>
    </div>
  )

  if (cameraError) return (
    <div className={clsx(panelBase, 'items-center justify-center p-6 text-center bg-red-500/10 border-red-500/25')}>
      <AlertCircle size={36} className="text-red-400 mb-3" />
      <p className="text-sm font-bold text-red-400">Camera Error</p>
      <p className="text-xs text-red-500 mt-1 leading-relaxed max-w-[200px] mx-auto">{cameraError}</p>
      <button onClick={() => { setCameraError(null); setCameraState('locked') }}
        className="mt-4 px-4 py-2 text-xs font-semibold text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10 transition-colors">
        Try Again
      </button>
    </div>
  )

  if (!canOpen && cameraState === 'locked') return (
    <div className={clsx(panelBase, 'items-center justify-center p-6 text-center')}>
      <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4',
        isDark ? 'bg-dark-700' : 'bg-zinc-100')}>
        <Lock size={24} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
      </div>
      <p className={clsx('text-sm font-bold mb-2', isDark ? 'text-zinc-300' : 'text-zinc-600')}>
        Attendance Camera Closed
      </p>
      <p className={clsx('text-xs leading-relaxed max-w-[220px] mx-auto', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
        {canOpenReason.includes('No attendance window') || canOpenReason.includes('configured')
          ? 'The attendance camera will open every day from 8:30 PM to 8:40 PM.'
          : canOpenReason.includes('before')  || canOpenReason.includes('not started')
          ? 'The attendance camera will open every day from 8:30 PM to 8:40 PM.'
          : canOpenReason.includes('closed')  || canOpenReason.includes('after')
          ? "Today's attendance window was from 8:30 PM to 8:40 PM."
          : canOpenReason.includes('already') || canOpenReason.includes('marked')
          ? 'You have already submitted your attendance for today.'
          : canOpenReason.includes('photo')   || canOpenReason.includes('enroll')
          ? 'Please capture your profile photo first. Go to Profile → Capture Photo.'
          : 'The attendance camera will open every day from 8:30 PM to 8:40 PM.'
        }
      </p>
    </div>
  )

  if (canOpen && cameraState === 'locked') return (
    <div className={clsx(panelBase, 'items-center justify-center p-6 text-center bg-accent-600/10 border-accent-600/25')}>
      <div className="w-14 h-14 rounded-2xl bg-accent-600/20 flex items-center justify-center mx-auto mb-4">
        <Unlock size={24} className="text-accent-400" />
      </div>
      <p className="text-sm font-bold text-accent-300 mb-1">Camera Ready</p>
      <p className="text-xs text-accent-400 mb-5">Take a live photo to mark attendance</p>
      <button onClick={onOpenCamera}
        className="btn-accent text-sm px-6 py-2.5 flex items-center gap-2">
        <Camera size={16} /> Take Attendance Photo
      </button>
    </div>
  )

  if (cameraState === 'capturing') return (
    <div className={clsx(panelBase, 'bg-black')}>
      <div className="relative flex-1">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <div className="absolute inset-4 pointer-events-none">
          {['top-0 left-0','top-0 right-0','bottom-0 left-0','bottom-0 right-0'].map((pos, i) => (
            <div key={i} className={`absolute w-7 h-7 border-white border-2 ${pos} ${i<2?'border-b-0':'border-t-0'} ${i%2===0?'border-r-0':'border-l-0'}`} />
          ))}
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <div className="bg-zinc-900 p-4 flex justify-center gap-3">
        <button onClick={() => { stopCamera(); setCameraState('locked') }}
          className="px-5 py-2 rounded-xl border border-zinc-600 text-zinc-300 text-sm font-medium hover:bg-zinc-800 transition-colors">
          Cancel
        </button>
        <button onClick={captureFrame}
          className="btn-accent px-6 py-2 flex items-center gap-2 text-sm">
          <Camera size={15} /> Capture
        </button>
      </div>
    </div>
  )

  if (cameraState === 'preview' && capturedPhoto) return (
    <div className={clsx(panelBase)}>
      <div className="relative flex-1 bg-black">
        <img src={capturedPhoto.url} alt="Preview" className="w-full h-full object-cover" />
        <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1">
          <ImageIcon size={11} /> Preview
        </div>
      </div>
      {submitError && (
        <div className="mx-4 mt-3 flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-xs">
          <AlertCircle size={13} className="shrink-0 mt-0.5" /> {submitError}
        </div>
      )}
      <div className="p-4 flex gap-3">
        <button onClick={onRetake}
          className={clsx('flex-1 py-2.5 border rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2',
            isDark ? 'border-white/8 text-zinc-300 hover:bg-dark-700' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50')}>
          <RefreshCw size={13} /> Retake
        </button>
        <button onClick={onSubmit}
          className="flex-1 py-2.5 btn-accent text-sm flex items-center justify-center gap-2">
          <CheckCircle2 size={13} /> Submit
        </button>
      </div>
    </div>
  )

  if (cameraState === 'submitting') return (
    <div className={clsx(panelBase, 'items-center justify-center p-8 text-center bg-accent-600/10 border-accent-600/25')}>
      <Loader2 size={36} className="animate-spin text-accent-400 mx-auto mb-3" />
      <p className="text-sm font-semibold text-accent-300">Submitting…</p>
      <p className="text-xs text-accent-400 mt-1">Verifying with server</p>
    </div>
  )

  return null
}

function HistoryRow({ record, index }: { record: AttendanceRecord; index: number }) {
  const [open, setOpen] = useState(false)
  const { isDark } = useTheme()
  const meta = STATUS_META[record.status] ?? STATUS_META.ABSENT

  return (
    <div className={clsx('border rounded-xl overflow-hidden animate-slide-up',
      isDark ? 'border-white/5 bg-dark-900' : 'border-zinc-200 bg-white')}
      style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}>
      <button onClick={() => setOpen(v => !v)}
        className={clsx('w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors',
          isDark ? 'hover:bg-dark-800' : 'hover:bg-zinc-50')}>
        <span className={clsx('w-2 h-2 rounded-full shrink-0', meta.dot)} />
        <div className="flex-1 min-w-0">
          <span className={clsx('text-sm font-semibold', isDark ? 'text-zinc-200' : 'text-zinc-800')}>{fmtDateShort(record.date)}</span>
        </div>
        <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full border', meta.bg, meta.color)}>{meta.label}</span>
        {record.markedAt && (
          <span className={clsx('text-xs hidden sm:block', isDark ? 'text-zinc-500' : 'text-zinc-400')}>{fmtTime(record.markedAt)}</span>
        )}
        {open ? <ChevronUp size={14} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} /> : <ChevronDown size={14} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />}
      </button>
      {open && (
        <div className={clsx('border-t px-4 py-4 grid grid-cols-2 gap-3 text-xs',
          isDark ? 'border-white/5 bg-dark-800' : 'border-zinc-100 bg-zinc-50')}>
          {[
            { label: 'Date',     value: fmtDate(record.date) },
            { label: 'Status',   value: meta.label },
            { label: 'Time',     value: record.markedAt ? fmtTime(record.markedAt) : '—' },
            { label: 'Location', value: record.verifiedLocation ?? (record.locationType === 'VERIFIED' ? 'Verified ✓' : 'Unverified') },
            { label: 'Distance', value: record.distanceFromHostel != null ? `${record.distanceFromHostel} m` : '—' },
            { label: 'Window',   value: record.window ? `${record.window.startTime} – ${record.window.endTime}` : '—' },
            ...(record.isSpecialWindow ? [{ label: 'Special', value: record.specialWindowReason ?? 'Yes' }] : []),
            ...(record.photoUrl ? [{ label: 'Photo', value: 'Captured ✓' }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className={clsx('text-[10px] uppercase tracking-wide', isDark ? 'text-zinc-500' : 'text-zinc-400')}>{label}</span>
              <span className={clsx('font-semibold', isDark ? 'text-zinc-200' : 'text-zinc-700')}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Fix 8: stats show only Present, Late, Absent (no Excused/Special)
function PercentageCard({ summary }: { summary: ReturnType<typeof useAttendance>['summary'] }) {
  const { isDark } = useTheme()
  if (!summary) return (
    <div className={clsx('rounded-2xl border p-5 animate-pulse', isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-zinc-200')}>
      <div className={clsx('h-4 rounded w-1/3 mb-3', isDark ? 'bg-dark-700' : 'bg-zinc-100')} />
      <div className={clsx('h-20 rounded', isDark ? 'bg-dark-700' : 'bg-zinc-100')} />
    </div>
  )

  const pct = summary.percentage
  const circumference = 2 * Math.PI * 44
  const offset = circumference - (pct / 100) * circumference

  // Only Present, Late, Absent — no Excused/Special per spec
  const stats = [
    { label: 'Present', value: summary.presentDays, color: 'text-emerald-500' },
    { label: 'Late',    value: summary.lateDays,    color: 'text-amber-500'   },
    { label: 'Absent',  value: summary.absentDays,  color: 'text-red-500'    },
  ]

  return (
    <div className={clsx('rounded-2xl border p-5', isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-zinc-200')}>
      <h3 className={clsx('text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
        <TrendingUp size={13} className="text-accent-400" /> Attendance Summary
      </h3>
      <div className="flex items-center gap-6">
        <div className="relative shrink-0">
          <svg width="100" height="100" className="-rotate-90">
            <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8"
              className={isDark ? 'stroke-white/8' : 'stroke-zinc-100'} />
            <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8"
              stroke={pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'}
              strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={clsx('text-xl font-extrabold', isDark ? 'text-white' : 'text-zinc-900')}>{pct}%</span>
            <span className={clsx('text-[10px]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>Overall</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 flex-1">
          {stats.map(({ label, value, color }) => (
            <div key={label} className={clsx('rounded-xl p-2.5 text-center', isDark ? 'bg-dark-800' : 'bg-zinc-50')}>
              <p className={clsx('text-xl font-bold', color)}>{value}</p>
              <p className={clsx('text-[10px] font-medium', isDark ? 'text-zinc-500' : 'text-zinc-400')}>{label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className={clsx('mt-3 rounded-xl px-3 py-2 text-center', isDark ? 'bg-dark-800' : 'bg-zinc-50')}>
        <span className={clsx('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>Total days: </span>
        <span className={clsx('text-xs font-bold', isDark ? 'text-zinc-200' : 'text-zinc-700')}>{summary.totalDays}</span>
      </div>
    </div>
  )
}

function AttendanceChart({ summary }: { summary: ReturnType<typeof useAttendance>['summary'] }) {
  const [view, setView] = useState<'weekly' | 'monthly'>('weekly')
  const { isDark } = useTheme()

  if (!summary) return (
    <div className={clsx('rounded-2xl border p-5 animate-pulse', isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-zinc-200')}>
      <div className={clsx('h-4 rounded w-1/3 mb-3', isDark ? 'bg-dark-700' : 'bg-zinc-100')} />
      <div className={clsx('h-36 rounded', isDark ? 'bg-dark-700' : 'bg-zinc-100')} />
    </div>
  )

  // Only Present and Absent — no Excused/Special
  const data = view === 'weekly'
    ? summary.weeklyData.slice(-6).map(w => ({ name: w.week, Present: w.present, Absent: w.absent }))
    : summary.monthlyData.map(m => ({ name: m.month, Present: m.present, Absent: m.absent }))

  const tooltip = { borderRadius: '8px', border: 'none', fontSize: '12px',
    background: isDark ? '#18191f' : '#fff', color: isDark ? '#f4f4f5' : '#09090b' }

  return (
    <div className={clsx('rounded-2xl border p-5', isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-zinc-200')}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={clsx('text-xs font-bold uppercase tracking-widest flex items-center gap-2', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
          <BarChart2 size={13} className="text-accent-400" /> Attendance Chart
        </h3>
        <div className={clsx('flex rounded-lg p-0.5', isDark ? 'bg-dark-700' : 'bg-zinc-100')}>
          {(['weekly', 'monthly'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={clsx('px-3 py-1 text-xs font-semibold rounded-md transition-all',
                view === v
                  ? isDark ? 'bg-dark-600 text-zinc-100 shadow-sm' : 'bg-white text-zinc-900 shadow-sm'
                  : isDark ? 'text-zinc-400' : 'text-zinc-500')}>
              {v === 'weekly' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barCategoryGap="30%" barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#52525b' : '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: isDark ? '#52525b' : '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={tooltip} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="Present" radius={[4,4,0,0]}>
            {data.map((_, i) => <Cell key={i} fill="#10b981" />)}
          </Bar>
          <Bar dataKey="Absent" radius={[4,4,0,0]}>
            {data.map((_, i) => <Cell key={i} fill="#ef4444" fillOpacity={0.6} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 justify-center">
        {[{ color: 'bg-emerald-500', label: 'Present' }, { color: 'bg-red-400', label: 'Absent' }].map(({ color, label }) => (
          <div key={label} className={clsx('flex items-center gap-1.5 text-xs', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
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
    currentTime, gps, requestLocation,
    cameraState, setCameraState,
    capturedPhoto, setPhoto, retakePhoto,
    canOpenCamera,
    submitAttendance, submitError, submitSuccess,
    summary, history, historyTotal, historyPage, historyLoading, loadHistory,
  } = useAttendance()
  const { isDark } = useTheme()
  const [activeTab, setActiveTab] = useState<'mark' | 'history' | 'stats'>('mark')
  const { allowed: canOpen, reason: canOpenReason } = canOpenCamera()

  // Auto-request location removed here — now handled inside useAttendance hook

  if (statusLoading) return (
    <div className="max-w-4xl mx-auto space-y-4 animate-pulse pt-2">
      {[1,2,3].map(i => <div key={i} className={clsx('h-24 rounded-2xl', isDark ? 'bg-dark-700' : 'bg-zinc-100')} />)}
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',
            isDark ? 'bg-accent-600/15 border border-accent-600/20' : 'bg-blue-50 border border-blue-200')}>
            <CalendarCheck size={18} className={isDark ? 'text-accent-400' : 'text-blue-600'} />
          </div>
          <div>
            <h1 className={clsx('text-2xl font-bold font-display', isDark ? 'text-white' : 'text-zinc-900')}>Attendance</h1>
            <p className={clsx('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>Daily hostel attendance — 8:30 PM – 8:40 PM</p>
          </div>
        </div>
        <button onClick={fetchStatus}
          className={clsx('p-2 rounded-xl transition-colors', isDark ? 'text-zinc-500 hover:text-zinc-300 hover:bg-dark-700' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100')}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Server error */}
      {statusError && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3.5 mb-4 text-sm">
          <AlertCircle size={15} className="shrink-0 mt-0.5" /> {statusError}
        </div>
      )}

      {/* Tabs */}
      <div className={clsx('flex rounded-xl p-1 mb-5', isDark ? 'bg-dark-700' : 'bg-zinc-100')}>
        {([
          { id: 'mark',    label: 'Mark',       icon: Camera },
          { id: 'history', label: 'History',    icon: Calendar },
          { id: 'stats',   label: 'Statistics', icon: BarChart2 },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={clsx('flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition-all',
              activeTab === id
                ? isDark ? 'bg-dark-600 text-zinc-100 shadow-sm' : 'bg-white text-zinc-900 shadow-sm'
                : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700')}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── MARK TAB: two-column layout ── */}
      {activeTab === 'mark' && (
        <div className="space-y-4">
          <DateTimeBanner currentTime={currentTime} />

          {/* Special timing notice */}
          {status?.window?.isSpecial && (
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl p-4">
              <Info size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-300">Attendance Time Updated</p>
                <p className="text-xs text-amber-400 mt-0.5">
                  Updated to <strong className="font-mono">{status.window.startTime} – {status.window.endTime} IST</strong>
                  {status.window.reason && ` · ${status.window.reason}`}
                </p>
              </div>
            </div>
          )}

          {/* Two-column layout: left = info, right = camera */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEFT — Window + Location */}
            <div className="space-y-4">
              <WindowCard windowState={status?.windowState} window={status?.window} />
              <LocationCard gps={gps} onRequest={requestLocation} />

              {/* Today's record (if already marked) */}
              {status?.alreadyMarked && status.todayRecord && !submitSuccess && (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-4">
                  <p className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-3">
                    <CheckCircle2 size={15} /> Attendance Marked Today
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: 'Status',   value: STATUS_META[status.todayRecord.status]?.label ?? status.todayRecord.status },
                      { label: 'Time',     value: fmtTime(status.todayRecord.markedAt) },
                      { label: 'Location', value: status.todayRecord.verifiedLocation ?? (status.todayRecord.locationType === 'VERIFIED' ? 'Verified ✓' : 'Unverified') },
                      { label: 'Distance', value: status.todayRecord.distanceFromHostel != null ? `${status.todayRecord.distanceFromHostel} m` : '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className={clsx('rounded-lg px-3 py-2 border', isDark ? 'bg-dark-800 border-white/5' : 'bg-white border-emerald-100')}>
                        <p className={clsx('text-[10px] uppercase tracking-wide', isDark ? 'text-zinc-500' : 'text-zinc-400')}>{label}</p>
                        <p className={clsx('font-semibold mt-0.5', isDark ? 'text-zinc-200' : 'text-zinc-700')}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT — Camera */}
            <div className="flex flex-col">
              <p className={clsx('text-[10px] font-bold uppercase tracking-widest mb-2', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                Camera
              </p>
              <div className="flex-1">
                <CameraPanel
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
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <p className={clsx('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            Showing <span className={clsx('font-semibold', isDark ? 'text-zinc-300' : 'text-zinc-700')}>{history.length}</span> of{' '}
            <span className={clsx('font-semibold', isDark ? 'text-zinc-300' : 'text-zinc-700')}>{historyTotal}</span> days
          </p>
          {historyLoading && history.length === 0 ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => <div key={i} className={clsx('h-14 rounded-xl animate-pulse', isDark ? 'bg-dark-700' : 'bg-zinc-100')} />)}
            </div>
          ) : history.length === 0 ? (
            <div className={clsx('rounded-2xl border p-12 text-center', isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-zinc-200')}>
              <CalendarCheck size={36} className={clsx('mx-auto mb-3', isDark ? 'text-zinc-700' : 'text-zinc-300')} />
              <p className={clsx('text-sm font-semibold', isDark ? 'text-zinc-500' : 'text-zinc-500')}>No attendance records yet</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {history.map((r, i) => <HistoryRow key={r.id} record={r} index={i} />)}
              </div>
              {history.length < historyTotal && (
                <button onClick={() => loadHistory(historyPage + 1)} disabled={historyLoading}
                  className={clsx('w-full py-2.5 border rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2',
                    isDark ? 'border-white/8 text-zinc-300 hover:bg-dark-800' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50')}>
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
        </div>
      )}
    </div>
  )
}
