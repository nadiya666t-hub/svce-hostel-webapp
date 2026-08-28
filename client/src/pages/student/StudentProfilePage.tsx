import { useEffect, useState, useRef, useCallback } from 'react'
import {
  User, Building2, BookOpen, Hash, Phone, Mail,
  Heart, MapPin, Users, GraduationCap, Info, Shield,
  Camera, RefreshCw, CheckCircle2, Loader2, X, AlertCircle,
} from 'lucide-react'
import api from '@/services/api'
import { enrollmentService } from '@/services/enrollmentService'
import type { Student } from '@/types'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

function FieldRow({ label, value, icon: Icon, system = false, className }: {
  label: string; value?: string | number | null; icon: React.ElementType; system?: boolean; className?: string
}) {
  if (value == null || value === '' || value === '—') return null
  return (
    <div className={clsx('flex items-center gap-4 px-5 py-3.5', className)}>
      <div className="w-8 h-8 rounded-lg bg-accent-600/12 flex items-center justify-center shrink-0">
        <Icon size={14} className="text-accent-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] dark:text-zinc-500 text-zinc-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold dark:text-zinc-100 text-zinc-900 mt-0.5">{value}</p>
      </div>
      {system && (
        <span className="text-[10px] dark:text-zinc-500 text-zinc-400 dark:bg-white/8 bg-zinc-100 px-2 py-0.5 rounded-full shrink-0">System</span>
      )}
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="dark:bg-dark-900 bg-white rounded-2xl border dark:border-white/5 border-zinc-200 overflow-hidden">
      <div className="px-5 py-3 border-b dark:border-white/5 border-zinc-100 flex items-center gap-2">
        <Icon size={14} className="text-accent-400" />
        <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="divide-y divide-slate-50">{children}</div>
    </div>
  )
}

function formatGender(g?: string) {
  if (!g || g === 'NOT_SPECIFIED') return null
  return g.charAt(0) + g.slice(1).toLowerCase()
}

// ─── Photo Capture Widget ─────────────────────────────────────────────────────

function PhotoCapture({ currentPhotoUrl, onPhotoSaved }: {
  currentPhotoUrl: string | null
  onPhotoSaved: (url: string) => void
}) {
  const { isDark } = useTheme()
  const [mode, setMode] = useState<'idle' | 'camera' | 'preview' | 'saving'>('idle')
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [capturedUrl, setCapturedUrl]   = useState<string | null>(null)
  const [camError, setCamError]         = useState<string | null>(null)
  const [saveError, setSaveError]       = useState<string | null>(null)
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopCam = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const startCam = useCallback(async () => {
    setCamError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
    } catch (e) {
      const err = e as { name?: string }
      if (err.name === 'NotAllowedError') setCamError('Camera permission denied. Please allow camera access in your browser settings.')
      else setCamError('Camera not available. Please check your device.')
    }
  }, [])

  useEffect(() => {
    if (mode === 'camera') startCam()
    else stopCam()
    return stopCam
  }, [mode, startCam, stopCam])

  const capture = useCallback(() => {
    const video = videoRef.current; const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      setCapturedBlob(blob); setCapturedUrl(URL.createObjectURL(blob)); setMode('preview')
    }, 'image/jpeg', 0.92)
  }, [])

  const retake = useCallback(() => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    setCapturedBlob(null); setCapturedUrl(null); setSaveError(null); setMode('camera')
  }, [capturedUrl])

  const save = useCallback(async () => {
    if (!capturedBlob) return
    setMode('saving'); setSaveError(null)
    try {
      const res = await enrollmentService.uploadPhoto(capturedBlob, 'image/jpeg')
      if (res.success && res.data) {
        if (capturedUrl) URL.revokeObjectURL(capturedUrl)
        onPhotoSaved(res.data.photoUrl)
        setMode('idle'); setCapturedBlob(null); setCapturedUrl(null)
      } else {
        setSaveError(res.message ?? 'Failed to save photo.')
        setMode('preview')
      }
    } catch {
      setSaveError('Upload failed. Please try again.')
      setMode('preview')
    }
  }, [capturedBlob, capturedUrl, onPhotoSaved])

  const photoSrc = currentPhotoUrl?.startsWith('http') ? currentPhotoUrl : currentPhotoUrl ? `/api/uploads${currentPhotoUrl.replace('/uploads', '')}` : null

  return (
    <div className={clsx('rounded-2xl border overflow-hidden', isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-zinc-200')}>
      {/* Section header */}
      <div className="px-5 py-3 border-b dark:border-white/5 border-zinc-100 flex items-center gap-2">
        <Camera size={14} className="text-accent-400" />
        <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Profile Photo</h2>
      </div>

      {/* Idle — show current photo or placeholder */}
      {mode === 'idle' && (
        <div className="p-5 flex items-center gap-5">
          {currentPhotoUrl ? (
            <div className="relative shrink-0">
              <img src={photoSrc!} alt="Profile" className="w-24 h-24 rounded-2xl object-cover border dark:border-white/10 border-zinc-200" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckCircle2 size={12} className="text-white" />
              </div>
            </div>
          ) : (
            <div className={clsx('w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 border-dashed shrink-0',
              isDark ? 'border-white/10 bg-dark-800' : 'border-zinc-200 bg-zinc-50')}>
              <User size={24} className={isDark ? 'text-zinc-600' : 'text-zinc-300'} />
              <span className={clsx('text-[9px] font-medium text-center leading-tight', isDark ? 'text-zinc-600' : 'text-zinc-400')}>No photo yet</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            {currentPhotoUrl ? (
              <>
                <p className={clsx('text-sm font-semibold', isDark ? 'text-zinc-200' : 'text-zinc-800')}>Photo captured</p>
                <p className={clsx('text-xs mt-0.5 mb-3', isDark ? 'text-zinc-500' : 'text-zinc-400')}>Used for daily attendance verification</p>
              </>
            ) : (
              <>
                <p className={clsx('text-sm font-semibold', isDark ? 'text-zinc-200' : 'text-zinc-800')}>No photo captured yet</p>
                <p className={clsx('text-xs mt-0.5 mb-3', isDark ? 'text-zinc-500' : 'text-zinc-400')}>Capture your photo to enable attendance</p>
              </>
            )}
            <button onClick={() => setMode('camera')}
              className={clsx('inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                currentPhotoUrl
                  ? isDark ? 'bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10' : 'bg-zinc-100 border border-zinc-200 text-zinc-700 hover:bg-zinc-200'
                  : 'btn-accent')}>
              <Camera size={14} /> {currentPhotoUrl ? 'Retake Photo' : 'Capture Photo'}
            </button>
          </div>
        </div>
      )}

      {/* Camera view */}
      {mode === 'camera' && (
        <div>
          <div className={clsx('flex items-center justify-between px-4 py-2.5 border-b text-sm', isDark ? 'border-white/5' : 'border-zinc-100')}>
            <span className={clsx('font-semibold', isDark ? 'text-zinc-300' : 'text-zinc-700')}>Position your face in the frame</span>
            <button onClick={() => setMode('idle')} className={clsx(isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600')}><X size={16} /></button>
          </div>
          {camError ? (
            <div className="p-6 flex flex-col items-center gap-3 text-center">
              <AlertCircle size={28} className="text-red-400" />
              <p className="text-xs text-red-400 max-w-xs">{camError}</p>
              <button onClick={() => { setCamError(null); startCam() }} className="btn-accent px-4 py-2 text-sm">Try Again</button>
            </div>
          ) : (
            <>
              <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-40 h-52 rounded-full border-2 border-white/60" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }} />
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="p-4 flex justify-center">
                <button onClick={capture}
                  className="w-14 h-14 rounded-full bg-white border-4 border-accent-500 flex items-center justify-center transition-transform active:scale-95 hover:scale-105"
                  style={{ boxShadow: '0 0 0 4px rgba(79,126,248,0.25)' }}>
                  <Camera size={22} className="text-accent-600" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Preview */}
      {(mode === 'preview' || mode === 'saving') && capturedUrl && (
        <div>
          <div className={clsx('flex items-center justify-between px-4 py-2.5 border-b text-sm', isDark ? 'border-white/5' : 'border-zinc-100')}>
            <span className={clsx('font-semibold', isDark ? 'text-zinc-300' : 'text-zinc-700')}>Preview — does this look good?</span>
          </div>
          <div className="relative" style={{ aspectRatio: '4/3' }}>
            <img src={capturedUrl} alt="Preview" className="w-full h-full object-cover" />
          </div>
          {saveError && (
            <div className="mx-4 mt-3 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-xs">
              <AlertCircle size={13} className="shrink-0 mt-0.5" /> {saveError}
            </div>
          )}
          <div className="flex gap-3 p-4">
            <button onClick={retake} disabled={mode === 'saving'}
              className={clsx('flex-1 py-2.5 border rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50',
                isDark ? 'border-white/8 text-zinc-300 hover:bg-dark-700' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50')}>
              <RefreshCw size={14} /> Retake
            </button>
            <button onClick={save} disabled={mode === 'saving'}
              className="flex-1 py-2.5 btn-accent text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {mode === 'saving' ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><CheckCircle2 size={14} /> Use This Photo</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentProfilePage() {
  const [student,  setStudent]  = useState<Student | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    api.get('/students/me')
      .then(res => {
        const data = res.data?.data
        setStudent(data)
        setPhotoUrl(data?.photoUrl ?? null)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="max-w-xl mx-auto space-y-4 animate-pulse">
      <div className="h-40 bg-slate-100 rounded-2xl" />
      <div className="h-48 bg-slate-100 rounded-2xl" />
      <div className="h-32 bg-slate-100 rounded-2xl" />
    </div>
  )

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in">

      <div>
        <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900">My Profile</h1>
        <p className="text-sm dark:text-zinc-500 text-zinc-400 mt-1">Your personal and academic details</p>
      </div>

      {/* Avatar card */}
      <div className="bg-gradient-to-br from-accent-700 to-dark-800 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-5">
          {/* Photo or initial */}
          <div className="w-20 h-20 rounded-full overflow-hidden shrink-0 border-2 border-white/30">
            {photoUrl ? (
              <img
                src={photoUrl.startsWith('http') ? photoUrl : `/api/uploads${photoUrl.replace('/uploads', '')}`}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-white/20 flex items-center justify-center">
                <span className="text-3xl font-bold">{student?.name?.charAt(0) ?? 'S'}</span>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold truncate">{student?.name ?? '—'}</h2>
            <p className="text-accent-300 text-sm mt-0.5 font-mono">{student?.usn ?? '—'}</p>
            <p className="text-accent-300 text-xs mt-1">{student?.floorNumber} · Room {student?.roomNumber}</p>
            {student?.course && <p className="text-accent-300 text-xs mt-0.5">{student.course} · {student.branch}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {[student?.year, student?.semester, student?.academicYear].filter(Boolean).map(v => (
            <span key={v} className="bg-white/15 text-white text-xs font-medium px-3 py-1 rounded-full">{v}</span>
          ))}
        </div>
      </div>

      {/* Photo capture widget */}
      <PhotoCapture currentPhotoUrl={photoUrl} onPhotoSaved={url => setPhotoUrl(url)} />

      {/* Identity */}
      <Section title="Identity" icon={User}>
        <FieldRow label="Full Name"   value={student?.name}           icon={User}   />
        <FieldRow label="USN"         value={student?.usn}            icon={Hash}   system />
        <FieldRow label="Email"       value={student?.email}          icon={Mail}   />
        <FieldRow label="Phone"       value={student?.phone}          icon={Phone}  />
        <FieldRow label="Gender"      value={formatGender(student?.gender)} icon={User} />
        <FieldRow label="Blood Group" value={student?.bloodGroup}     icon={Heart}  />
      </Section>

      {/* Academic */}
      <Section title="Academic Details" icon={GraduationCap}>
        <FieldRow label="Academic Year"  value={student?.academicYear}  icon={BookOpen}     system />
        <FieldRow label="Year"           value={student?.year}          icon={BookOpen}     system />
        <FieldRow label="Semester"       value={student?.semester}      icon={BookOpen}     system />
        <FieldRow label="Course"         value={student?.course}        icon={GraduationCap} system />
        <FieldRow label="Branch"         value={student?.branch}        icon={GraduationCap} system />
        <FieldRow label="Admission Year" value={student?.admissionYear} icon={BookOpen}     system />
      </Section>

      {/* Hostel */}
      <Section title="Hostel Accommodation" icon={Building2}>
        <FieldRow label="Floor" value={student?.floorNumber} icon={Building2} system />
        <FieldRow label="Room"  value={student?.roomNumber}  icon={Building2} system />
      </Section>

      {(student?.parentName || student?.parentPhone || student?.parentEmail) && (
        <Section title="Parent / Guardian" icon={Users}>
          <FieldRow label="Parent Name"  value={student?.parentName}  icon={Users}  />
          <FieldRow label="Parent Phone" value={student?.parentPhone} icon={Phone}  />
          <FieldRow label="Parent Email" value={student?.parentEmail} icon={Mail}   />
        </Section>
      )}

      {(student?.address || student?.city || student?.state) && (
        <Section title="Address" icon={MapPin}>
          <FieldRow label="Address"  value={student?.address}  icon={MapPin} />
          <FieldRow label="City"     value={student?.city}     icon={MapPin} />
          <FieldRow label="State"    value={student?.state}    icon={MapPin} />
          <FieldRow label="Pin Code" value={student?.pinCode}  icon={MapPin} />
        </Section>
      )}

      <div className="bg-slate-50 rounded-2xl border border-slate-200 px-5 py-4">
        <div className="flex items-start gap-3">
          <Shield size={14} className="dark:text-zinc-500 text-zinc-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-semibold dark:text-zinc-400 text-zinc-500">System-managed fields</p>
            <p className="text-xs dark:text-zinc-500 text-zinc-400 leading-relaxed">
              USN, Floor, Room, Academic Year, Course, Branch and Admission Year are controlled by the hostel administration and cannot be changed here.
            </p>
          </div>
        </div>
      </div>

      {student?.importSource && (
        <div className="flex items-center gap-2 text-[11px] text-slate-300 justify-center pb-2">
          <Info size={11} /> Record source: {student.importSource}
        </div>
      )}
    </div>
  )
}
