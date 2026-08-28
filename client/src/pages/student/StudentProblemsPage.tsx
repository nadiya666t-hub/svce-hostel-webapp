import { useState, useEffect, useRef } from 'react'
import {
  AlertTriangle, Plus, X, ChevronDown, ChevronUp,
  CheckCircle2, Loader2, AlertCircle, Wrench,
  Camera, Image as ImageIcon,
} from 'lucide-react'
import { studentService } from '@/services/studentService'
import type { StudentProblem, ProblemCategory, ProblemStatus } from '@/types'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

// ─── Category metadata ────────────────────────────────────────────────────────

const CATEGORY_META: Record<ProblemCategory, {
  label: string
  color: string        // icon foreground
  bg: string           // icon background (dark)
  bgLight: string      // icon background (light)
  border: string
  borderLight: string
}> = {
  NO_WATER:    { label: 'No Water',           color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  bgLight: '#eff6ff', border: 'rgba(96,165,250,0.3)',  borderLight: '#bfdbfe' },
  ELECTRICITY: { label: 'Electricity',        color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  bgLight: '#fffbeb', border: 'rgba(251,191,36,0.3)',  borderLight: '#fde68a' },
  CLEANING:    { label: 'Cleaning',           color: '#34d399', bg: 'rgba(52,211,153,0.15)',  bgLight: '#f0fdf4', border: 'rgba(52,211,153,0.3)',  borderLight: '#a7f3d0' },
  PLUMBING:    { label: 'Plumbing',           color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', bgLight: '#f5f3ff', border: 'rgba(167,139,250,0.3)', borderLight: '#ddd6fe' },
  FURNITURE:   { label: 'Furniture',          color: '#fb923c', bg: 'rgba(251,146,60,0.15)',  bgLight: '#fff7ed', border: 'rgba(251,146,60,0.3)',  borderLight: '#fed7aa' },
  WIFI:        { label: 'Wi-Fi Problem',      color: '#f472b6', bg: 'rgba(244,114,182,0.15)', bgLight: '#fdf2f8', border: 'rgba(244,114,182,0.3)', borderLight: '#fbcfe8' },
  OTHER:       { label: 'Other',              color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', bgLight: '#f8fafc', border: 'rgba(148,163,184,0.3)', borderLight: '#e2e8f0' },
}

const STATUS_META: Record<ProblemStatus, { label: string; color: string; bg: string; dot: string }> = {
  PENDING:     { label: 'Pending',     color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200',    dot: 'bg-amber-500' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200',      dot: 'bg-blue-500'  },
  RESOLVED:    { label: 'Resolved',    color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
}

// ─── Category SVG icons ───────────────────────────────────────────────────────

function CategoryIcon({ category, size = 28 }: { category: ProblemCategory; size?: number }) {
  const s = size
  switch (category) {
    case 'NO_WATER': return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        {/* Tap body */}
        <rect x="11" y="13" width="12" height="9" rx="2.5" fill="currentColor" opacity="0.9"/>
        {/* Spout */}
        <rect x="17" y="22" width="4" height="5" rx="1.5" fill="currentColor" opacity="0.8"/>
        {/* Handle arm */}
        <rect x="6" y="15" width="7" height="2.5" rx="1.2" fill="currentColor" opacity="0.7"/>
        <rect x="5" y="13" width="2.5" height="7" rx="1.2" fill="currentColor" opacity="0.7"/>
        {/* Water drop */}
        <path d="M19 28 Q16 32 16 30 Q16 27 19 28Z" fill="#93c5fd"/>
        {/* No-water slash */}
        <line x1="5" y1="5" x2="27" y2="27" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
      </svg>
    )
    case 'ELECTRICITY': return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        {/* Glow */}
        <circle cx="16" cy="14" r="10" fill="currentColor" opacity="0.08"/>
        {/* Lightning bolt */}
        <path d="M18 3 L10 15 H15.5 L13 26 L24 13 H18.5 Z" fill="currentColor" opacity="0.95"/>
        {/* Plug prongs at bottom */}
        <rect x="12" y="25" width="3" height="4" rx="1" fill="currentColor" opacity="0.5"/>
        <rect x="17" y="25" width="3" height="4" rx="1" fill="currentColor" opacity="0.5"/>
      </svg>
    )
    case 'CLEANING': return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        {/* Mop stick */}
        <rect x="14.5" y="2" width="3" height="18" rx="1.5" fill="currentColor" opacity="0.75" transform="rotate(5 14.5 2)"/>
        {/* Mop head oval */}
        <ellipse cx="15" cy="22" rx="9" ry="3.5" fill="currentColor" opacity="0.5" transform="rotate(5 15 22)"/>
        {/* Mop strands */}
        {[8,11,14,17,20,23].map((x, i) => (
          <line key={i} x1={x} y1={24} x2={x - 1} y2={30} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.65"/>
        ))}
        {/* Bubbles */}
        <circle cx="25" cy="8" r="2.5" fill="#93c5fd" opacity="0.5"/>
        <circle cx="28" cy="14" r="1.8" fill="#bfdbfe" opacity="0.4"/>
        <circle cx="27" cy="4" r="1.2" fill="#dbeafe" opacity="0.4"/>
      </svg>
    )
    case 'PLUMBING': return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        {/* Pipe horizontal */}
        <rect x="2" y="13" width="14" height="5" rx="2.5" fill="currentColor" opacity="0.55"/>
        {/* Pipe vertical */}
        <rect x="5" y="2" width="5" height="14" rx="2.5" fill="currentColor" opacity="0.55"/>
        {/* Elbow joint */}
        <circle cx="7.5" cy="15.5" r="4" fill="currentColor" opacity="0.7"/>
        {/* Wrench */}
        <path d="M22 4 C26 4 30 8 28 13 L16 25 L12 29 C10 31 7 29 9 27 L13 23 L25 11 C27 9 26 5 22 4Z"
              fill="currentColor" opacity="0.85"/>
        <circle cx="11" cy="28" r="2.5" fill="currentColor" opacity="0.5"/>
        {/* Water drip */}
        <path d="M16 18 Q14 22 14 21 Q14 18 16 18Z" fill="#93c5fd" opacity="0.8"/>
      </svg>
    )
    case 'FURNITURE': return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        {/* Chair back */}
        <rect x="6" y="5" width="4" height="12" rx="2" fill="currentColor" opacity="0.7"/>
        <rect x="22" y="5" width="4" height="12" rx="2" fill="currentColor" opacity="0.7"/>
        <rect x="6" y="5" width="20" height="5" rx="2" fill="currentColor" opacity="0.6"/>
        {/* Seat */}
        <rect x="6" y="16" width="20" height="5" rx="2" fill="currentColor" opacity="0.85"/>
        {/* Legs */}
        <rect x="8" y="21" width="3.5" height="8" rx="1.5" fill="currentColor" opacity="0.6"/>
        <rect x="20.5" y="21" width="3.5" height="8" rx="1.5" fill="currentColor" opacity="0.6"/>
        {/* Alert badge */}
        <circle cx="25" cy="5" r="6" fill="#f59e0b" opacity="0.95"/>
        <rect x="24.3" y="2.5" width="1.4" height="3.5" rx="0.7" fill="white"/>
        <circle cx="25" cy="7.5" r="0.8" fill="white"/>
      </svg>
    )
    case 'WIFI': return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        {/* Wifi arcs */}
        <path d="M4 13 Q16 3 28 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.35"/>
        <path d="M7 18 Q16 10 25 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6"/>
        <path d="M11 23 Q16 18 21 23" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.85"/>
        {/* Dot */}
        <circle cx="16" cy="28" r="2.5" fill="currentColor"/>
        {/* No signal X */}
        <circle cx="25" cy="7" r="6.5" fill="#ef4444" opacity="0.15"/>
        <line x1="22" y1="4" x2="28" y2="10" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="28" y1="4" x2="22" y2="10" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    )
    default: return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        {/* Gear */}
        <circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.85"/>
        <circle cx="16" cy="16" r="2.5" fill="currentColor" opacity="0.7"/>
        {[0,45,90,135,180,225,270,315].map((a, i) => {
          const r = (a * Math.PI) / 180
          return <line key={i} x1={16 + 8*Math.cos(r)} y1={16 + 8*Math.sin(r)} x2={16 + 12*Math.cos(r)} y2={16 + 12*Math.sin(r)} stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
        })}
        {/* Alert */}
        <circle cx="24" cy="8" r="5.5" fill="#f59e0b" opacity="0.95"/>
        <rect x="23.3" y="5.5" width="1.4" height="3" rx="0.7" fill="white"/>
        <circle cx="24" cy="10" r="0.7" fill="white"/>
      </svg>
    )
  }
}

// ─── Category selector button ─────────────────────────────────────────────────

function CategoryButton({ k, selected, onClick, isDark }: {
  k: ProblemCategory; selected: boolean; onClick: () => void; isDark: boolean
}) {
  const meta = CATEGORY_META[k]
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-200 text-center',
        selected
          ? 'shadow-md scale-[1.03]'
          : isDark
            ? 'border-white/8 bg-dark-800 hover:bg-dark-700'
            : 'border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300'
      )}
      style={selected ? {
        background: isDark ? meta.bg : meta.bgLight,
        borderColor: isDark ? meta.border : meta.borderLight,
        color: meta.color,
      } : {
        color: isDark ? '#71717a' : '#6b7280',
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center transition-all"
        style={selected
          ? { background: isDark ? meta.bg : meta.bgLight, color: meta.color }
          : { background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', color: isDark ? '#52525b' : '#94a3b8' }
        }
      >
        <CategoryIcon category={k} size={26} />
      </div>
      <span className={clsx(
        'text-[11px] font-semibold leading-tight',
        selected ? '' : isDark ? 'text-zinc-400' : 'text-zinc-500'
      )}>
        {meta.label}
      </span>
    </button>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Problem card ─────────────────────────────────────────────────────────────

function ProblemCard({ prob }: { prob: StudentProblem }) {
  const [open, setOpen] = useState(false)
  const { isDark } = useTheme()
  const meta = STATUS_META[prob.status]
  const catMeta = CATEGORY_META[prob.category]

  return (
    <div className={clsx(
      'rounded-2xl border overflow-hidden transition-all',
      isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-zinc-200 shadow-sm'
    )}>
      <button
        onClick={() => setOpen(v => !v)}
        className={clsx(
          'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors',
          isDark ? 'hover:bg-dark-800' : 'hover:bg-zinc-50'
        )}
      >
        {/* Icon badge */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: isDark ? catMeta.bg : catMeta.bgLight, color: catMeta.color }}
        >
          <CategoryIcon category={prob.category} size={22} />
        </div>

        <div className="flex-1 min-w-0">
          <p className={clsx('text-sm font-bold', isDark ? 'text-zinc-100' : 'text-zinc-900')}>
            {catMeta.label}
          </p>
          <p className={clsx('text-xs mt-0.5 truncate', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            {prob.description}
          </p>
        </div>

        <span className={clsx(
          'flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0',
          meta.bg, meta.color
        )}>
          <span className={clsx('w-1.5 h-1.5 rounded-full', meta.dot)} />
          {meta.label}
        </span>

        {open
          ? <ChevronUp size={14} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
          : <ChevronDown size={14} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
        }
      </button>

      {open && (
        <div className={clsx(
          'border-t px-4 py-4 space-y-3 text-sm',
          isDark ? 'border-white/5 bg-dark-800' : 'border-zinc-100 bg-zinc-50/60'
        )}>
          <div>
            <span className={clsx('text-[10px] uppercase tracking-widest font-semibold', isDark ? 'text-zinc-500' : 'text-zinc-400')}>Description</span>
            <p className={clsx('mt-1', isDark ? 'text-zinc-200' : 'text-zinc-700')}>{prob.description}</p>
          </div>
          <div className="flex gap-6 text-xs">
            <div>
              <span className={clsx('text-[10px] uppercase tracking-widest font-semibold', isDark ? 'text-zinc-500' : 'text-zinc-400')}>Room</span>
              <p className={clsx('font-semibold mt-0.5', isDark ? 'text-zinc-200' : 'text-zinc-700')}>{prob.roomNumber}</p>
            </div>
            <div>
              <span className={clsx('text-[10px] uppercase tracking-widest font-semibold', isDark ? 'text-zinc-500' : 'text-zinc-400')}>Reported</span>
              <p className={clsx('font-semibold mt-0.5', isDark ? 'text-zinc-200' : 'text-zinc-700')}>{fmtDate(prob.createdAt)}</p>
            </div>
          </div>
          {prob.photoUrl && (
            <img src={prob.photoUrl} alt="Problem photo"
              className="w-full max-h-48 object-cover rounded-xl border dark:border-white/8 border-zinc-200" />
          )}
          {prob.status === 'RESOLVED' && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <CheckCircle2 size={13} /> This problem has been resolved.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── New problem form ─────────────────────────────────────────────────────────

function NewProblemForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const { isDark } = useTheme()
  const [category, setCategory] = useState<ProblemCategory>('NO_WATER')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (description.trim().length < 5) { setError('Description must be at least 5 characters.'); return }
    setLoading(true)
    try {
      const res = await studentService.createProblem({ category, description: description.trim(), photo: photo ?? undefined })
      if (res.success) onSuccess()
      else setError(res.message ?? 'Failed to report problem.')
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to report problem.')
    } finally { setLoading(false) }
  }

  return (
    <div className={clsx(
      'rounded-2xl border p-5 animate-slide-up',
      isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-zinc-200 shadow-sm'
    )}>
      <div className="flex items-center justify-between mb-5">
        <h2 className={clsx('text-base font-bold', isDark ? 'text-zinc-100' : 'text-zinc-900')}>Report a Problem</h2>
        <button onClick={onCancel}
          className={clsx('p-1.5 rounded-lg transition-colors', isDark ? 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300' : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600')}>
          <X size={16} />
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
          <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Category grid */}
        <div>
          <label className={clsx('text-xs font-bold uppercase tracking-widest block mb-3', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
            Problem Category
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {(Object.keys(CATEGORY_META) as ProblemCategory[]).map(k => (
              <CategoryButton key={k} k={k} selected={category === k} onClick={() => setCategory(k)} isDark={isDark} />
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={clsx('text-xs font-bold uppercase tracking-widest block mb-2', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe the problem in detail…"
            className={clsx(
              'w-full px-3 py-2.5 rounded-xl border text-sm resize-none outline-none transition-all',
              isDark
                ? 'bg-dark-800 border-white/8 text-zinc-100 placeholder-zinc-600 focus:border-accent-500 focus:ring-2 focus:ring-accent-600/20'
                : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-accent-500 focus:ring-2 focus:ring-accent-600/15'
            )}
          />
        </div>

        {/* Photo */}
        <div>
          <label className={clsx('text-xs font-bold uppercase tracking-widest block mb-2', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
            Photo <span className={isDark ? 'text-zinc-600' : 'text-zinc-400'}>(optional)</span>
          </label>
          {preview ? (
            <div className="relative rounded-xl overflow-hidden border dark:border-white/8 border-zinc-200">
              <img src={preview} alt="Preview" className="w-full max-h-40 object-cover" />
              <button type="button" onClick={() => { setPhoto(null); setPreview(null) }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className={clsx(
                'w-full border-2 border-dashed rounded-xl py-5 flex flex-col items-center gap-2 transition-colors',
                isDark
                  ? 'border-white/10 text-zinc-600 hover:border-accent-500/40 hover:text-zinc-400'
                  : 'border-zinc-200 text-zinc-400 hover:border-accent-400/40 hover:text-zinc-500'
              )}>
              <Camera size={20} />
              <span className="text-xs font-medium">Tap to add a photo</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </div>

        {/* Info */}
        <div className={clsx(
          'flex items-center gap-2 rounded-xl p-3 text-xs',
          isDark ? 'bg-accent-600/10 border border-accent-600/20 text-accent-300' : 'bg-blue-50 border border-blue-200 text-blue-700'
        )}>
          <ImageIcon size={13} className="shrink-0" />
          Your floor and room are automatically included from your profile.
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onCancel}
            className={clsx(
              'flex-1 py-2.5 border rounded-xl text-sm font-semibold transition-colors',
              isDark ? 'border-white/8 text-zinc-300 hover:bg-dark-700' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            )}>
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 btn-accent rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Reporting…</> : 'Report Problem'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentProblemsPage() {
  const { isDark } = useTheme()
  const [problems, setProblems] = useState<StudentProblem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<string>('')

  async function loadProblems() {
    setLoading(true)
    try {
      const res = await studentService.getProblems(1, 20, filter || undefined)
      if (res.success && res.data) { setProblems(res.data.data); setTotal(res.data.total) }
    } finally { setLoading(false) }
  }

  useEffect(() => { loadProblems() }, [filter])

  const open = problems.filter(p => p.status !== 'RESOLVED').length

  const filters = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Resolved', value: 'RESOLVED' },
  ]

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            isDark ? 'bg-orange-500/15 border border-orange-500/20' : 'bg-orange-50 border border-orange-200'
          )}>
            <AlertTriangle size={20} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
          </div>
          <div>
            <h1 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-zinc-900')}>Raise a Problem</h1>
            <p className={clsx('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>Report hostel issues to management</p>
          </div>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-accent text-sm px-4 py-2 flex items-center gap-1.5">
            <Plus size={15} /> Report
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total',    value: total,        color: isDark ? 'text-zinc-100' : 'text-zinc-800' },
          { label: 'Open',     value: open,          color: 'text-orange-500' },
          { label: 'Resolved', value: total - open,  color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className={clsx(
            'rounded-2xl border p-4 text-center',
            isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-zinc-200 shadow-sm'
          )}>
            <p className={clsx('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className={clsx('text-xs font-semibold mt-0.5', isDark ? 'text-zinc-500' : 'text-zinc-400')}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-5">
          <NewProblemForm onSuccess={() => { setShowForm(false); loadProblems() }} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {filters.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={clsx(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
              filter === f.value
                ? 'bg-accent-600 text-white shadow-sm'
                : isDark
                  ? 'bg-dark-800 border border-white/8 text-zinc-300 hover:bg-dark-700'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            )}>
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className={clsx('h-16 rounded-2xl animate-pulse', isDark ? 'bg-dark-700' : 'bg-zinc-100')} />
          ))}
        </div>
      ) : problems.length === 0 ? (
        <div className={clsx(
          'rounded-2xl border p-12 text-center',
          isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-zinc-200'
        )}>
          <Wrench size={36} className={clsx('mx-auto mb-3', isDark ? 'text-zinc-700' : 'text-zinc-300')} />
          <p className={clsx('text-sm font-semibold', isDark ? 'text-zinc-400' : 'text-zinc-500')}>No problems reported</p>
          <p className={clsx('text-xs mt-1', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
            Tap <strong>Report</strong> to raise an issue
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {problems.map(p => <ProblemCard key={p.id} prob={p} />)}
        </div>
      )}
    </div>
  )
}
