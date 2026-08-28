import { useState, useEffect } from 'react'
import { History, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
import { parentService, type ParentOutgoingRecord } from '@/services/parentService'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  APPROVED:  { label: 'Approved',  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  PENDING:   { label: 'Pending',   color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
  REJECTED:  { label: 'Rejected',  color: 'text-red-600',     bg: 'bg-red-50 border-red-200' },
  CANCELLED: { label: 'Cancelled', color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200' },
}
const TYPE_LABEL: Record<string, string> = {
  GOING_HOME: 'Going Home', OUTING: 'Outing', LEAVE: 'Leave',
  EMERGENCY_LEAVE: 'Emergency Leave', EMERGENCY: 'Emergency',
  IMPORTANT: 'Important', MODERATE: 'Moderate', OTHER: 'Other',
}

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }

export default function ParentOutgoingPage() {
  const { isDark } = useTheme()
  const [records, setRecords] = useState<ParentOutgoingRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)

  async function load(p: number) {
    setLoading(true)
    try {
      const res = await parentService.getOutgoing(p)
      if (res.success && res.data) {
        setRecords(prev => p === 1 ? res.data!.records : [...prev, ...res.data!.records])
        setTotal(res.data.total)
        setMore(p < res.data.totalPages)
        setPage(p)
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { load(1) }, [])

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', isDark ? 'bg-blue-500/15 border border-blue-500/20' : 'bg-blue-50 border border-blue-200')}>
          <History size={18} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
        </div>
        <div>
          <h1 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>Outgoing History</h1>
          <p className={clsx('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>Leave and outing requests</p>
        </div>
      </div>

      {loading && records.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-blue-400" /></div>
      ) : records.length === 0 ? (
        <div className={clsx('rounded-2xl border p-12 text-center', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200')}>
          <History size={32} className={clsx('mx-auto mb-3', isDark ? 'text-slate-700' : 'text-slate-300')} />
          <p className={clsx('text-sm', isDark ? 'text-slate-500' : 'text-slate-400')}>No outgoing records found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(r => {
            const meta = STATUS_META[r.status] ?? STATUS_META.PENDING
            const StatusIcon = r.status === 'APPROVED' ? CheckCircle2 : r.status === 'REJECTED' ? XCircle : Clock
            return (
              <div key={r.id} className={clsx('rounded-2xl border p-4', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={clsx('text-sm font-bold', isDark ? 'text-slate-100' : 'text-slate-900')}>{TYPE_LABEL[r.type] ?? r.type}</span>
                      <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full border', meta.bg, meta.color)}>{meta.label}</span>
                    </div>
                    <p className={clsx('text-xs mb-1', isDark ? 'text-slate-400' : 'text-slate-500')}>
                      {fmtDate(r.fromDate)} → {fmtDate(r.toDate)}
                      {r.destination && ` · ${r.destination}`}
                    </p>
                    <p className={clsx('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>{r.reason}</p>
                    {r.reviewNote && (
                      <p className={clsx('text-xs mt-1 italic', isDark ? 'text-slate-600' : 'text-slate-400')}>Note: {r.reviewNote}</p>
                    )}
                  </div>
                  <StatusIcon size={18} className={clsx('shrink-0 mt-0.5',
                    r.status === 'APPROVED' ? 'text-emerald-400' : r.status === 'REJECTED' ? 'text-red-400' : isDark ? 'text-slate-500' : 'text-slate-400')} />
                </div>
              </div>
            )
          })}
          {more && (
            <button onClick={() => load(page + 1)} disabled={loading}
              className={clsx('w-full py-2.5 border rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50',
                isDark ? 'border-white/8 text-slate-300 hover:bg-dark-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
              {loading ? <><Loader2 size={14} className="animate-spin" /> Loading…</> : `Load more (${total - records.length} remaining)`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
