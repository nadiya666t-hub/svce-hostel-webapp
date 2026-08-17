import { useState, useEffect, useRef } from 'react'
import {
  AlertTriangle, Plus, X, ChevronDown, ChevronUp,
  CheckCircle2, Loader2, AlertCircle, Wrench,
  Camera, Image as ImageIcon,
} from 'lucide-react'
import { studentService } from '@/services/studentService'
import type { StudentProblem, ProblemCategory, ProblemStatus } from '@/types'
import clsx from 'clsx'

const CATEGORY_LABELS: Record<ProblemCategory, string> = {
  NO_WATER: 'No Water', ELECTRICITY: 'Electricity Problem', CLEANING: 'Cleaning',
  PLUMBING: 'Plumbing', FURNITURE: 'Furniture', WIFI: 'Wi-Fi Problem', OTHER: 'Other',
}
const CATEGORY_ICONS: Record<ProblemCategory, string> = {
  NO_WATER: '💧', ELECTRICITY: '⚡', CLEANING: '🧹', PLUMBING: '🔧', FURNITURE: '🪑', WIFI: '📶', OTHER: '❓',
}
const STATUS_META: Record<ProblemStatus, { label: string; color: string; bg: string; dot: string }> = {
  PENDING:     { label: 'Pending',     color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',   dot: 'bg-amber-500' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',     dot: 'bg-blue-500'  },
  RESOLVED:    { label: 'Resolved',    color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ProblemCard({ prob }: { prob: StudentProblem }) {
  const [open, setOpen] = useState(false)
  const meta = STATUS_META[prob.status]
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left">
        <span className="text-xl shrink-0">{CATEGORY_ICONS[prob.category]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800">{CATEGORY_LABELS[prob.category]}</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{prob.description}</p>
        </div>
        <span className={clsx('flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0', meta.bg, meta.color)}>
          <span className={clsx('w-1.5 h-1.5 rounded-full', meta.dot)} /> {meta.label}
        </span>
        {open ? <ChevronUp size={15} className="text-slate-400 shrink-0" /> : <ChevronDown size={15} className="text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50 space-y-2 text-sm">
          <div><span className="text-xs text-slate-400 uppercase tracking-wide">Description</span><p className="text-slate-700 mt-0.5">{prob.description}</p></div>
          <div className="flex gap-4 text-xs">
            <div><span className="text-slate-400">Room: </span><span className="font-semibold text-slate-700">{prob.roomNumber}</span></div>
            <div><span className="text-slate-400">Reported: </span><span className="font-semibold text-slate-700">{fmtDate(prob.createdAt)}</span></div>
          </div>
          {prob.photoUrl && (
            <div className="mt-2">
              <img src={prob.photoUrl} alt="Problem photo" className="w-full max-h-48 object-cover rounded-xl border border-slate-200" />
            </div>
          )}
          {prob.status === 'RESOLVED' && <div className="text-xs text-emerald-700 font-medium flex items-center gap-1"><CheckCircle2 size={12} /> This problem has been resolved.</div>}
        </div>
      )}
    </div>
  )
}

function NewProblemForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
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
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-800">Report a Problem</h2>
        <button onClick={onCancel} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"><X size={16} /></button>
      </div>
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 mb-4 text-sm">
          <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category grid */}
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">Problem Category</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.keys(CATEGORY_LABELS) as ProblemCategory[]).map(k => (
              <button key={k} type="button" onClick={() => setCategory(k)}
                className={clsx('flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all', category === k ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
                <span>{CATEGORY_ICONS[k]}</span> <span className="truncate">{CATEGORY_LABELS[k]}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">Description <span className="text-red-400">*</span></label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Describe the problem in detail..."
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
        {/* Photo upload */}
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">Photo (optional)</label>
          {preview ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-200">
              <img src={preview} alt="Preview" className="w-full max-h-40 object-cover" />
              <button type="button" onClick={() => { setPhoto(null); setPreview(null) }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"><X size={14} /></button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 rounded-xl py-6 flex flex-col items-center gap-2 text-slate-400 hover:border-primary-300 hover:text-primary-500 transition-colors">
              <Camera size={20} /><span className="text-xs font-medium">Tap to add a photo</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 flex items-center gap-2">
          <ImageIcon size={13} className="shrink-0" /> Your floor and room are automatically included from your profile.
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onCancel} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold shadow-glow-sm hover:opacity-90 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Reporting…</> : 'Report Problem'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function StudentProblemsPage() {
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

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Raise a Problem</h1>
            <p className="text-sm text-slate-400">Report hostel issues</p>
          </div>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 gradient-primary text-white text-sm font-semibold rounded-xl shadow-glow-sm hover:opacity-90 transition-all">
            <Plus size={15} /> Report
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[{ label: 'Total', value: total, color: 'text-slate-700' }, { label: 'Open', value: open, color: 'text-orange-600' }, { label: 'Resolved', value: total - open, color: 'text-emerald-600' }].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 text-center">
            <p className={clsx('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {showForm && <div className="mb-5"><NewProblemForm onSuccess={() => { setShowForm(false); loadProblems() }} onCancel={() => setShowForm(false)} /></div>}

      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {[{ label: 'All', value: '' }, { label: 'Pending', value: 'PENDING' }, { label: 'In Progress', value: 'IN_PROGRESS' }, { label: 'Resolved', value: 'RESOLVED' }].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all', filter === f.value ? 'bg-primary-600 text-white shadow-glow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
      ) : problems.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-12 text-center">
          <Wrench size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">No problems reported</p>
          <p className="text-xs text-slate-400 mt-1">Tap <strong>Report</strong> to raise an issue</p>
        </div>
      ) : (
        <div className="space-y-3">
          {problems.map(p => <ProblemCard key={p.id} prob={p} />)}
        </div>
      )}
    </div>
  )
}
