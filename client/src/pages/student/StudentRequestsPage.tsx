import { useState, useEffect, useCallback } from 'react'
import {
  MessageSquarePlus, Plus, X, ChevronDown, ChevronUp,
  Clock, CheckCircle2, XCircle, Loader2, AlertCircle,
  Calendar, User, Hash, Building2, MapPin, Ban,
  AlertTriangle, Star, Minus,
} from 'lucide-react'
import { studentService } from '@/services/studentService'
import { useTheme } from '@/hooks/useTheme'
import type { StudentRequest, RequestType, RequestStatus } from '@/types'
import api from '@/services/api'
import clsx from 'clsx'

// ─── Request type groups ──────────────────────────────────────────────────────
// Dropdown structure per spec:
//   Emergency  → urgent, immediate
//   Important  → important but not immediate
//   Moderate   → normal + Other (sub-option under Moderate only)

type RequestGroup = 'EMERGENCY' | 'IMPORTANT' | 'MODERATE'

interface RequestOption {
  value: RequestType
  label: string
  description: string
  group: RequestGroup
}

const REQUEST_OPTIONS: RequestOption[] = [
  // Emergency group
  { value: 'EMERGENCY', label: 'Emergency', description: 'Medical or urgent personal emergency requiring immediate attention', group: 'EMERGENCY' },
  // Important group
  { value: 'IMPORTANT', label: 'Important', description: 'Important personal matter or permission request', group: 'IMPORTANT' },
  // Moderate group — only going home, outing, other (no planned leave / routine hostel)
  { value: 'GOING_HOME', label: 'Going Home', description: 'Weekend or holiday visit home', group: 'MODERATE' },
  { value: 'OUTING',     label: 'Outing',     description: 'Short outing — shopping, errands, etc.', group: 'MODERATE' },
  { value: 'OTHER',      label: 'Other',      description: 'Other moderate request not listed above', group: 'MODERATE' },
]

const GROUP_META: Record<RequestGroup, { label: string; icon: React.ElementType; accent: string; desc: string }> = {
  EMERGENCY: { label: 'Emergency', icon: AlertTriangle, accent: '#ef4444', desc: 'Very urgent — requires immediate attention' },
  IMPORTANT: { label: 'Important', icon: Star,          accent: '#f59e0b', desc: 'Important but not necessarily immediate' },
  MODERATE:  { label: 'Moderate',  icon: Minus,         accent: '#3b6ef4', desc: 'Normal, non-urgent requests' },
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  GOING_HOME: 'Going Home', OUTING: 'Outing', LEAVE: 'Leave',
  EMERGENCY_LEAVE: 'Emergency Leave', OTHER: 'Other',
  EMERGENCY: 'Emergency', IMPORTANT: 'Important', MODERATE: 'Moderate',
}

const DESTINATION_REQUIRED: RequestType[] = ['GOING_HOME', 'OUTING']

const STATUS_META: Record<RequestStatus, { label: string; icon: React.ElementType; color: string; bg: string; dot: string }> = {
  PENDING:   { label: 'Pending',   icon: Clock,        color: 'text-amber-500',   bg: 'bg-amber-500/10 border-amber-500/20',   dot: 'bg-amber-400' },
  APPROVED:  { label: 'Approved',  icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500' },
  REJECTED:  { label: 'Rejected',  icon: XCircle,      color: 'text-red-500',     bg: 'bg-red-500/10 border-red-500/20',       dot: 'bg-red-500' },
  CANCELLED: { label: 'Cancelled', icon: Ban,          color: 'dark:text-zinc-400 text-zinc-500', bg: 'dark:bg-dark-700 dark:border-white/8 bg-zinc-100 border-zinc-200', dot: 'bg-zinc-400' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Student info strip ───────────────────────────────────────────────────────

interface StudentInfo { name: string; usn: string; floorNumber: string; roomNumber: string }

function StudentInfoStrip({ info }: { info: StudentInfo }) {
  const { isDark } = useTheme()
  return (
    <div className={clsx('rounded-xl border px-4 py-3', isDark ? 'bg-accent-600/8 border-accent-600/20' : 'bg-blue-50 border-blue-200')}>
      <p className="text-[10px] font-bold text-accent-400 uppercase tracking-widest mb-2">Submitting as</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { icon: User, label: 'Name', value: info.name },
          { icon: Hash, label: 'USN', value: info.usn },
          { icon: Building2, label: 'Floor', value: info.floorNumber },
          { icon: MapPin, label: 'Room', value: info.roomNumber },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-accent-600/15 flex items-center justify-center shrink-0">
              <Icon size={11} className="text-accent-400" />
            </div>
            <div className="min-w-0">
              <p className={clsx('text-[9px] uppercase tracking-wide', isDark ? 'text-zinc-500' : 'text-zinc-400')}>{label}</p>
              <p className={clsx('text-xs font-bold truncate font-mono', isDark ? 'text-zinc-200' : 'text-zinc-800')}>{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Request card ──────────────────────────────────────────────────────────────

function RequestCard({ req, onCancel }: { req: StudentRequest; onCancel: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const { isDark } = useTheme()
  const meta = STATUS_META[req.status] ?? STATUS_META.PENDING
  const Icon = meta.icon

  async function handleCancel(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Cancel this request?')) return
    setCancelling(true)
    try { await api.patch(`/requests/${req.id}/cancel`); onCancel(req.id) }
    catch { /* silent */ } finally { setCancelling(false) }
  }

  return (
    <div className={clsx('rounded-2xl border overflow-hidden transition-all',
      isDark ? 'bg-dark-900 border-white/5 hover:border-white/8' : 'bg-white border-zinc-200 hover:border-zinc-300')}>
      <button onClick={() => setOpen(v => !v)}
        className={clsx('w-full flex items-center gap-3 px-4 py-4 text-left transition-colors',
          isDark ? 'hover:bg-dark-800' : 'hover:bg-zinc-50')}>
        <span className={clsx('w-2 h-2 rounded-full shrink-0', meta.dot)} />
        <div className="flex-1 min-w-0">
          <p className={clsx('text-sm font-bold', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
            {REQUEST_TYPE_LABELS[req.type] ?? req.type}
          </p>
          <p className={clsx('text-xs mt-0.5', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            {fmtDate(req.fromDate)} — {fmtDate(req.toDate)}
          </p>
        </div>
        <span className={clsx('flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0', meta.bg, meta.color)}>
          <Icon size={10} /> {meta.label}
        </span>
        {open ? <ChevronUp size={14} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
               : <ChevronDown size={14} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />}
      </button>

      {open && (
        <div className={clsx('border-t px-4 py-4 space-y-2', isDark ? 'border-white/5 bg-dark-800' : 'border-zinc-100 bg-zinc-50')}>
          <div>
            <p className={clsx('text-[10px] uppercase tracking-wide', isDark ? 'text-zinc-500' : 'text-zinc-400')}>Reason</p>
            <p className={clsx('text-sm mt-0.5', isDark ? 'text-zinc-300' : 'text-zinc-700')}>{req.reason}</p>
          </div>
          {req.destination && (
            <div>
              <p className={clsx('text-[10px] uppercase tracking-wide', isDark ? 'text-zinc-500' : 'text-zinc-400')}>Destination</p>
              <p className={clsx('text-sm mt-0.5', isDark ? 'text-zinc-300' : 'text-zinc-700')}>{req.destination}</p>
            </div>
          )}
          {req.additionalDetails && (
            <div>
              <p className={clsx('text-[10px] uppercase tracking-wide', isDark ? 'text-zinc-500' : 'text-zinc-400')}>Additional Details</p>
              <p className={clsx('text-sm mt-0.5', isDark ? 'text-zinc-300' : 'text-zinc-700')}>{req.additionalDetails}</p>
            </div>
          )}
          {req.reviewNote && (
            <div className={clsx('rounded-lg px-3 py-2 text-xs border', req.status === 'APPROVED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400')}>
              <strong>Warden note: </strong>{req.reviewNote}
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <p className={clsx('text-xs', isDark ? 'text-zinc-600' : 'text-zinc-400')}>Submitted: {fmtDate(req.createdAt)}</p>
            {req.status === 'PENDING' && (
              <button onClick={handleCancel} disabled={cancelling}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50',
                  isDark ? 'border-white/8 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/25' : 'border-zinc-200 text-zinc-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200')}>
                {cancelling ? <Loader2 size={11} className="animate-spin" /> : <Ban size={11} />}
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── New Request Form ──────────────────────────────────────────────────────────

function NewRequestForm({ studentInfo, onSuccess, onCancel }: {
  studentInfo: StudentInfo | null; onSuccess: () => void; onCancel: () => void
}) {
  const { isDark } = useTheme()
  const [selectedGroup, setSelectedGroup] = useState<RequestGroup>('MODERATE')
  const [type, setType]                   = useState<RequestType>('MODERATE')
  const [fromDate, setFromDate]           = useState('')
  const [toDate, setToDate]               = useState('')
  const [reason, setReason]               = useState('')
  const [destination, setDestination]     = useState('')
  const [additionalDetails, setAdditionalDetails] = useState('')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')

  const today = new Date().toISOString().split('T')[0]
  const destinationRequired = DESTINATION_REQUIRED.includes(type)
  const optionsForGroup = REQUEST_OPTIONS.filter(o => o.group === selectedGroup)

  // When group changes, auto-select first option in that group
  function handleGroupChange(g: RequestGroup) {
    setSelectedGroup(g)
    setType(REQUEST_OPTIONS.find(o => o.group === g)!.value)
    setDestination('')
    setError('')
  }

  useEffect(() => {
    if (!destinationRequired) setDestination('')
  }, [type, destinationRequired])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!fromDate || !toDate) { setError('Please select dates.'); return }
    if (new Date(toDate) < new Date(fromDate)) { setError('End date cannot be before start date.'); return }
    if (reason.trim().length < 5) { setError('Please provide a reason (min 5 characters).'); return }
    if (destinationRequired && !destination.trim()) {
      setError(`Destination is required for ${REQUEST_TYPE_LABELS[type]}.`); return
    }
    setLoading(true)
    try {
      const res = await studentService.createRequest({
        type, fromDate, toDate,
        reason: reason.trim(),
        destination: destination.trim() || undefined,
        additionalDetails: additionalDetails.trim() || undefined,
      })
      if (res.success) onSuccess()
      else setError(res.message ?? 'Failed to submit request.')
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to submit.')
    } finally { setLoading(false) }
  }

  const card = clsx('rounded-2xl border overflow-hidden',
    isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-zinc-200 shadow-[0_2px_8px_rgba(0,0,0,0.06)]')
  const label = clsx('block text-xs font-semibold uppercase tracking-widest mb-1.5', isDark ? 'text-zinc-400' : 'text-zinc-500')
  const input = clsx('input-dark w-full')

  return (
    <div className={card}>
      <div className={clsx('px-5 py-4 border-b flex items-center justify-between', isDark ? 'border-white/5' : 'border-zinc-100')}>
        <h2 className={clsx('text-base font-bold font-display', isDark ? 'text-white' : 'text-zinc-900')}>New Request</h2>
        <button onClick={onCancel} className={clsx('p-1.5 rounded-lg transition-colors', isDark ? 'text-zinc-500 hover:bg-white/5' : 'text-zinc-400 hover:bg-zinc-100')}>
          <X size={16} />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {studentInfo && <StudentInfoStrip info={studentInfo} />}

        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-sm">
            <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Step 1: Priority group ── */}
          <div>
            <label className={label}>Request Priority</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(GROUP_META) as RequestGroup[]).map(g => {
                const m = GROUP_META[g]
                const GIcon = m.icon
                const active = selectedGroup === g
                return (
                  <button key={g} type="button" onClick={() => handleGroupChange(g)}
                    className={clsx('flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all',
                      active
                        ? 'border-[color:var(--accent)] bg-[color:var(--accent-subtle)]'
                        : isDark ? 'border-white/8 bg-dark-800 hover:border-white/15' : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'
                    )}
                    style={active ? { borderColor: m.accent, background: `${m.accent}12` } : {}}>
                    <GIcon size={18} style={{ color: active ? m.accent : isDark ? '#52525b' : '#a1a1aa' }} />
                    <span className={clsx('text-xs font-bold', active ? '' : isDark ? 'text-zinc-400' : 'text-zinc-500')}
                      style={active ? { color: m.accent } : {}}>
                      {m.label}
                    </span>
                    <span className={clsx('text-[9px] leading-tight hidden sm:block', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
                      {m.desc}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Step 2: Specific type dropdown (Moderate has Other) ── */}
          <div>
            <label className={label}>Request Type</label>
            <select value={type} onChange={e => { setType(e.target.value as RequestType); setDestination('') }}
              className={clsx('input-dark w-full cursor-pointer',
                isDark ? 'bg-dark-800' : 'bg-white')}>
              {optionsForGroup.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label} — {opt.description}</option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>From Date <span className="text-red-400">*</span></label>
              <input type="date" value={fromDate} min={today}
                onChange={e => { setFromDate(e.target.value); if (toDate && toDate < e.target.value) setToDate('') }}
                className={input} />
            </div>
            <div>
              <label className={label}>To Date <span className="text-red-400">*</span></label>
              <input type="date" value={toDate} min={fromDate || today}
                onChange={e => setToDate(e.target.value)}
                className={input} />
            </div>
          </div>

          {/* Destination */}
          <div>
            <label className={label}>
              Destination
              {destinationRequired ? <span className="text-red-400 ml-1">*</span> : <span className={clsx('ml-1 font-normal', isDark ? 'text-zinc-600' : 'text-zinc-400')}>(optional)</span>}
            </label>
            <input type="text" value={destination} onChange={e => setDestination(e.target.value)}
              placeholder={destinationRequired ? 'Where are you going? (required)' : 'Where are you going?'}
              className={input} />
          </div>

          {/* Reason */}
          <div>
            <label className={label}>Reason <span className="text-red-400">*</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="Explain your reason clearly (min 5 characters)…"
              className={clsx(input, 'resize-none')} />
            <p className={clsx('text-[10px] mt-1', isDark ? 'text-zinc-600' : 'text-zinc-400')}>{reason.trim().length}/500</p>
          </div>

          {/* Additional details */}
          <div>
            <label className={label}>Additional Details <span className={clsx('font-normal', isDark ? 'text-zinc-600' : 'text-zinc-400')}>(optional)</span></label>
            <textarea value={additionalDetails} onChange={e => setAdditionalDetails(e.target.value)} rows={2}
              placeholder="Any extra information for the Warden…"
              className={clsx(input, 'resize-none')} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel}
              className={clsx('flex-1 py-2.5 border rounded-xl text-sm font-semibold transition-colors',
                isDark ? 'border-white/8 text-zinc-300 hover:bg-dark-700' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50')}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 btn-accent text-sm flex items-center justify-center gap-2 rounded-xl">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentRequestsPage() {
  const [requests, setRequests]       = useState<StudentRequest[]>([])
  const [total, setTotal]             = useState(0)
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [filter, setFilter]           = useState<string>('')
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const { isDark } = useTheme()

  useEffect(() => {
    api.get('/requests/student-info').then(res => { if (res.data?.success) setStudentInfo(res.data.data) }).catch(() => {})
  }, [])

  const loadRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await studentService.getRequests(1, 30, filter || undefined)
      if (res.success && res.data) { setRequests(res.data.data); setTotal(res.data.total) }
    } finally { setLoading(false) }
  }, [filter])

  useEffect(() => { loadRequests() }, [loadRequests])

  function handleCancelled(id: string) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'CANCELLED' as RequestStatus } : r))
  }

  const pending  = requests.filter(r => r.status === 'PENDING').length
  const approved = requests.filter(r => r.status === 'APPROVED').length

  const card = clsx('rounded-2xl border', isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-zinc-200')

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',
            isDark ? 'bg-amber-500/15 border border-amber-500/20' : 'bg-amber-50 border border-amber-200')}>
            <MessageSquarePlus size={18} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
          </div>
          <div>
            <h1 className={clsx('text-2xl font-bold font-display', isDark ? 'text-white' : 'text-zinc-900')}>Raise Request</h1>
            <p className={clsx('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>Permission & approval requests</p>
          </div>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-accent text-sm flex items-center gap-1.5 py-2 px-4">
            <Plus size={14} /> New Request
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[{ label: 'Total', value: total, color: isDark ? 'text-zinc-200' : 'text-zinc-800' },
          { label: 'Pending', value: pending, color: 'text-amber-500' },
          { label: 'Approved', value: approved, color: 'text-emerald-500' }].map(s => (
          <div key={s.label} className={clsx(card, 'p-4 text-center')}>
            <p className={clsx('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className={clsx('text-[11px] font-medium mt-0.5', isDark ? 'text-zinc-500' : 'text-zinc-400')}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-5">
          <NewRequestForm studentInfo={studentInfo}
            onSuccess={() => { setShowForm(false); loadRequests() }}
            onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {[{ label: 'All', value: '' }, { label: 'Pending', value: 'PENDING' },
          { label: 'Approved', value: 'APPROVED' }, { label: 'Rejected', value: 'REJECTED' },
          { label: 'Cancelled', value: 'CANCELLED' }].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
              filter === f.value
                ? 'bg-accent-600 text-white'
                : isDark ? 'bg-dark-800 border border-white/8 text-zinc-400 hover:border-white/15' : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300')}>
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className={clsx('h-16 rounded-2xl animate-pulse', isDark ? 'bg-dark-800' : 'bg-zinc-100')} />)}
        </div>
      ) : requests.length === 0 ? (
        <div className={clsx(card, 'p-12 text-center')}>
          <Calendar size={36} className={clsx('mx-auto mb-3', isDark ? 'text-zinc-700' : 'text-zinc-300')} />
          <p className={clsx('text-sm font-semibold', isDark ? 'text-zinc-500' : 'text-zinc-500')}>
            {filter ? `No ${filter.toLowerCase()} requests` : 'No requests yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => <RequestCard key={r.id} req={r} onCancel={handleCancelled} />)}
        </div>
      )}
    </div>
  )
}
