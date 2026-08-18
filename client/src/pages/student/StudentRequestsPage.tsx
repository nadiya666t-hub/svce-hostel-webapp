import { useState, useEffect, useCallback } from 'react'
import {
  MessageSquarePlus, Plus, X, ChevronDown, ChevronUp,
  Clock, CheckCircle2, XCircle, Loader2, AlertCircle,
  Calendar, User, Hash, Building2, MapPin, Ban,
} from 'lucide-react'
import { studentService } from '@/services/studentService'
import type { StudentRequest, RequestType, RequestStatus } from '@/types'
import api from '@/services/api'
import clsx from 'clsx'

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  GOING_HOME:     'Going Home',
  OUTING:         'Outing',
  LEAVE:          'Leave',
  EMERGENCY_LEAVE:'Emergency Leave',
  OTHER:          'Other',
}

// Types that require a destination
const DESTINATION_REQUIRED: RequestType[] = ['GOING_HOME', 'OUTING']

const STATUS_META: Record<RequestStatus, { label: string; icon: React.ElementType; color: string; bg: string; dot: string }> = {
  PENDING:   { label: 'Pending',   icon: Clock,         color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',   dot: 'bg-amber-400'   },
  APPROVED:  { label: 'Approved',  icon: CheckCircle2,  color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  REJECTED:  { label: 'Rejected',  icon: XCircle,       color: 'text-red-700',     bg: 'bg-red-50 border-red-200',       dot: 'bg-red-500'     },
  CANCELLED: { label: 'Cancelled', icon: Ban,           color: 'dark:text-zinc-300 text-zinc-600',   bg: 'dark:bg-dark-700 bg-zinc-100 dark:border-white/8 border-zinc-200',  dot: 'bg-slate-400'   },
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// â”€â”€â”€ Student info strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface StudentInfo { name: string; usn: string; floorNumber: string; roomNumber: string }

function StudentInfoStrip({ info }: { info: StudentInfo }) {
  return (
    <div className="bg-accent-600/10 border border-accent-600/20 rounded-2xl px-5 py-4">
      <p className="text-[10px] font-bold text-accent-400 uppercase tracking-widest mb-3">
        Submitting as
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: User,      label: 'Name',  value: info.name },
          { icon: Hash,      label: 'USN',   value: info.usn },
          { icon: Building2, label: 'Floor', value: info.floorNumber },
          { icon: MapPin,    label: 'Room',  value: info.roomNumber },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-600/15 flex items-center justify-center shrink-0">
              <Icon size={13} className="text-accent-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-primary-400 uppercase tracking-wide font-medium">{label}</p>
              <p className="text-xs font-bold text-primary-800 truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// â”€â”€â”€ Request card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function RequestCard({
  req,
  onCancel,
}: {
  req: StudentRequest
  onCancel: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const meta = STATUS_META[req.status] ?? STATUS_META.PENDING
  const Icon = meta.icon

  async function handleCancel(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Cancel this request?')) return
    setCancelling(true)
    try {
      await api.patch(`/requests/${req.id}/cancel`)
      onCancel(req.id)
    } catch { /* error handled by parent refresh */ }
    finally { setCancelling(false) }
  }

  return (
    <div
      className={clsx(
        'dark:bg-dark-900 bg-white rounded-2xl border  overflow-hidden animate-slide-up transition-all',
        req.status === 'APPROVED' ? 'border-emerald-200' :
        req.status === 'REJECTED' ? 'border-red-200' :
        req.status === 'CANCELLED' ? 'dark:border-white/8 border-zinc-200 opacity-70' :
        'border-slate-100',
      )}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-4 hover:dark:bg-dark-800 bg-zinc-50 transition-colors text-left"
      >
        <span className={clsx('w-2 h-2 rounded-full shrink-0', meta.dot)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold dark:text-zinc-100 text-zinc-900">{REQUEST_TYPE_LABELS[req.type]}</p>
          <p className="text-xs dark:text-zinc-500 text-zinc-400 mt-0.5">
            {fmtDate(req.fromDate)} â€” {fmtDate(req.toDate)}
          </p>
        </div>
        <span className={clsx(
          'flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0',
          meta.bg, meta.color,
        )}>
          <Icon size={11} /> {meta.label}
        </span>
        {open ? <ChevronUp size={15} className="dark:text-zinc-500 text-zinc-400 shrink-0" /> : <ChevronDown size={15} className="dark:text-zinc-500 text-zinc-400 shrink-0" />}
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-slate-100 px-4 py-4 dark:bg-dark-800 bg-zinc-50/50 space-y-3">
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div>
              <span className="text-[10px] dark:text-zinc-500 text-zinc-400 uppercase tracking-wide font-medium">Reason</span>
              <p className="dark:text-zinc-200 text-zinc-700 mt-0.5">{req.reason}</p>
            </div>
            {req.destination && (
              <div>
                <span className="text-[10px] dark:text-zinc-500 text-zinc-400 uppercase tracking-wide font-medium">Destination</span>
                <p className="dark:text-zinc-200 text-zinc-700 mt-0.5">{req.destination}</p>
              </div>
            )}
            {req.additionalDetails && (
              <div>
                <span className="text-[10px] dark:text-zinc-500 text-zinc-400 uppercase tracking-wide font-medium">Additional Details</span>
                <p className="dark:text-zinc-200 text-zinc-700 mt-0.5">{req.additionalDetails}</p>
              </div>
            )}
            {req.reviewNote && (
              <div className={clsx(
                'rounded-xl px-3 py-2 text-xs',
                req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
              )}>
                <span className="font-bold">Warden note: </span>{req.reviewNote}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs dark:text-zinc-500 text-zinc-400">Submitted: {fmtDate(req.createdAt)}</p>
            {req.status === 'PENDING' && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold dark:text-zinc-400 text-zinc-500 border dark:border-white/8 border-zinc-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
              >
                {cancelling ? <Loader2 size={11} className="animate-spin" /> : <Ban size={11} />}
                Cancel Request
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// â”€â”€â”€ New request form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function NewRequestForm({
  studentInfo,
  onSuccess,
  onCancel,
}: {
  studentInfo: StudentInfo | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const [type, setType]                         = useState<RequestType>('OUTING')
  const [fromDate, setFromDate]                 = useState('')
  const [toDate, setToDate]                     = useState('')
  const [reason, setReason]                     = useState('')
  const [destination, setDestination]           = useState('')
  const [additionalDetails, setAdditionalDetails] = useState('')
  const [loading, setLoading]                   = useState(false)
  const [error, setError]                       = useState('')

  const today = new Date().toISOString().split('T')[0]
  const destinationRequired = DESTINATION_REQUIRED.includes(type)

  // Clear destination when switching to a type that doesn't require it
  useEffect(() => {
    if (!destinationRequired) setDestination('')
  }, [type, destinationRequired])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!fromDate)                              { setError('Please select a start date.'); return }
    if (!toDate)                                { setError('Please select an end date.'); return }
    if (new Date(toDate) < new Date(fromDate))  { setError('End date cannot be before start date.'); return }
    if (reason.trim().length < 5)              { setError('Reason must be at least 5 characters.'); return }
    if (destinationRequired && !destination.trim()) {
      setError(`Destination is required for ${REQUEST_TYPE_LABELS[type]}.`); return
    }

    setLoading(true)
    try {
      const res = await studentService.createRequest({
        type,
        fromDate,
        toDate,
        reason: reason.trim(),
        destination:       destination.trim()       || undefined,
        additionalDetails: additionalDetails.trim() || undefined,
      })
      if (res.success) {
        onSuccess()
      } else {
        setError(res.message ?? 'Failed to submit request.')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Failed to submit request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dark:bg-dark-900 bg-white rounded-2xl  border dark:border-white/5 border-zinc-200 overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-base font-bold dark:text-zinc-100 text-zinc-900">New Request</h2>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg dark:text-zinc-500 text-zinc-400 hover:dark:bg-dark-700 bg-zinc-100 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Student info â€” read-only */}
        {studentInfo && <StudentInfoStrip info={studentInfo} />}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-sm">
            <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Request type */}
          <div>
            <label className="text-xs font-semibold dark:text-zinc-300 text-zinc-600 uppercase tracking-wide block mb-2">
              Request Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(REQUEST_TYPE_LABELS) as RequestType[]).map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setType(k)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-all',
                    type === k
                      ? 'border-accent-500 bg-accent-600/10 text-accent-300'
                      : 'dark:border-white/8 border-zinc-200 bg-white dark:text-zinc-300 text-zinc-600 hover:dark:bg-dark-800 bg-zinc-50',
                  )}
                >
                  <span className={clsx('w-2 h-2 rounded-full shrink-0', type === k ? 'bg-accent-500' : 'bg-slate-300')} />
                  {REQUEST_TYPE_LABELS[k]}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold dark:text-zinc-300 text-zinc-600 uppercase tracking-wide block mb-1.5">
                From Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={fromDate}
                min={today}
                onChange={e => { setFromDate(e.target.value); if (toDate && toDate < e.target.value) setToDate('') }}
                className="w-full px-3 py-2.5 rounded-xl border dark:border-white/8 border-zinc-200 dark:bg-dark-800 bg-zinc-50 text-sm dark:text-zinc-100 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold dark:text-zinc-300 text-zinc-600 uppercase tracking-wide block mb-1.5">
                To Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={toDate}
                min={fromDate || today}
                onChange={e => setToDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border dark:border-white/8 border-zinc-200 dark:bg-dark-800 bg-zinc-50 text-sm dark:text-zinc-100 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
          </div>

          {/* Destination */}
          <div>
            <label className="text-xs font-semibold dark:text-zinc-300 text-zinc-600 uppercase tracking-wide block mb-1.5">
              Destination
              {destinationRequired
                ? <span className="text-red-400 ml-1">*</span>
                : <span className="dark:text-zinc-500 text-zinc-400 font-normal ml-1">(optional)</span>
              }
            </label>
            <input
              type="text"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              placeholder={destinationRequired ? 'Where are you going? (required)' : 'Where are you going?'}
              className={clsx(
                'w-full px-3 py-2.5 rounded-xl border dark:bg-dark-800 bg-zinc-50 text-sm dark:text-zinc-100 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary-400',
                destinationRequired ? 'border-accent-600/30' : 'dark:border-white/8 border-zinc-200',
              )}
            />
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-semibold dark:text-zinc-300 text-zinc-600 uppercase tracking-wide block mb-1.5">
              Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Explain your reason clearly (min 5 characters)â€¦"
              className="w-full px-3 py-2.5 rounded-xl border dark:border-white/8 border-zinc-200 dark:bg-dark-800 bg-zinc-50 text-sm dark:text-zinc-100 text-zinc-900 resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <p className="text-[10px] dark:text-zinc-500 text-zinc-400 mt-1">{reason.trim().length}/500 characters</p>
          </div>

          {/* Additional details */}
          <div>
            <label className="text-xs font-semibold dark:text-zinc-300 text-zinc-600 uppercase tracking-wide block mb-1.5">
              Additional Details <span className="dark:text-zinc-500 text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={additionalDetails}
              onChange={e => setAdditionalDetails(e.target.value)}
              rows={2}
              placeholder="Any additional information for the Wardenâ€¦"
              className="w-full px-3 py-2.5 rounded-xl border dark:border-white/8 border-zinc-200 dark:bg-dark-800 bg-zinc-50 text-sm dark:text-zinc-100 text-zinc-900 resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 border dark:border-white/8 border-zinc-200 rounded-xl text-sm font-semibold dark:text-zinc-300 text-zinc-600 hover:dark:bg-dark-800 bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 btn-accent text-white rounded-xl text-sm font-semibold  hover:opacity-90 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Submittingâ€¦</>
                : 'Submit Request'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// â”€â”€â”€ Main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function StudentRequestsPage() {
  const [requests, setRequests]     = useState<StudentRequest[]>([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [filter, setFilter]         = useState<string>('')
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)

  // Fetch student info once for the form
  useEffect(() => {
    api.get('/requests/student-info')
      .then(res => { if (res.data?.success) setStudentInfo(res.data.data) })
      .catch(() => { /* silent â€” form still works without it */ })
  }, [])

  const loadRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await studentService.getRequests(1, 30, filter || undefined)
      if (res.success && res.data) {
        setRequests(res.data.data)
        setTotal(res.data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { loadRequests() }, [loadRequests])

  // Called when a request is cancelled inline
  function handleCancelled(id: string) {
    setRequests(prev =>
      prev.map(r => r.id === id ? { ...r, status: 'CANCELLED' as RequestStatus } : r)
    )
  }

  const pending   = requests.filter(r => r.status === 'PENDING').length
  const approved  = requests.filter(r => r.status === 'APPROVED').length
  const cancelled = requests.filter(r => r.status === 'CANCELLED').length

  const filters = [
    { label: 'All',       value: '' },
    { label: 'Pending',   value: 'PENDING' },
    { label: 'Approved',  value: 'APPROVED' },
    { label: 'Rejected',  value: 'REJECTED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ]

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">

      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <MessageSquarePlus size={20} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900">Raise Request</h1>
            <p className="text-sm dark:text-zinc-500 text-zinc-400">Permission & approval requests</p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 btn-accent text-white text-sm font-semibold rounded-xl  hover:opacity-90 transition-all"
          >
            <Plus size={15} /> New Request
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total',     value: total,     color: 'dark:text-zinc-200 text-zinc-700' },
          { label: 'Pending',   value: pending,   color: 'text-amber-600' },
          { label: 'Approved',  value: approved,  color: 'text-emerald-600' },
          { label: 'Cancelled', value: cancelled, color: 'dark:text-zinc-500 text-zinc-400' },
        ].map(s => (
          <div key={s.label} className="dark:bg-dark-900 bg-white rounded-2xl border dark:border-white/5 border-zinc-200  p-3 text-center">
            <p className={clsx('text-xl font-bold', s.color)}>{s.value}</p>
            <p className="text-[10px] dark:text-zinc-500 text-zinc-400 font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* New request form */}
      {showForm && (
        <div className="mb-5">
          <NewRequestForm
            studentInfo={studentInfo}
            onSuccess={() => { setShowForm(false); loadRequests() }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
              filter === f.value
                ? 'bg-accent-600 text-white '
                : 'bg-white border dark:border-white/8 border-zinc-200 dark:text-zinc-300 text-zinc-600 hover:dark:bg-dark-800 bg-zinc-50',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Request list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 dark:bg-dark-700 bg-zinc-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="dark:bg-dark-900 bg-white rounded-2xl  border dark:border-white/5 border-zinc-200 p-12 text-center">
          <Calendar size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-semibold dark:text-zinc-400 text-zinc-500">
            {filter ? `No ${filter.toLowerCase()} requests` : 'No requests yet'}
          </p>
          <p className="text-xs dark:text-zinc-500 text-zinc-400 mt-1">
            {!filter && 'Tap New Request to raise a permission request to the Warden'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <RequestCard key={r.id} req={r} onCancel={handleCancelled} />
          ))}
        </div>
      )}
    </div>
  )
}

