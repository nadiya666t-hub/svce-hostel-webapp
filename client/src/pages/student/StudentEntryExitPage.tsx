import { useState, useEffect } from 'react'
import { LogIn, LogOut, Clock, Calendar, Info } from 'lucide-react'
import { studentService } from '@/services/studentService'
import type { EntryExitRecord } from '@/types'
import clsx from 'clsx'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'short' })
}
function fmtTime(iso: string | undefined) {
  if (!iso) return 'â€”'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
}

function RecordRow({ record }: { record: EntryExitRecord }) {
  const isIn = record.status === 'IN'
  return (
    <div className="dark:bg-dark-900 bg-white rounded-2xl border dark:border-white/5 border-zinc-200  p-4 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="dark:text-zinc-500 text-zinc-400" />
          <span className="text-sm font-semibold dark:text-zinc-200 text-zinc-700">{fmtDate(record.date)}</span>
        </div>
        <span className={clsx(
          'flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border',
          isIn ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'dark:bg-dark-800 bg-zinc-50 dark:border-white/8 border-zinc-200 dark:text-zinc-300 text-zinc-600'
        )}>
          {isIn ? <LogIn size={11} /> : <LogOut size={11} />} {isIn ? 'Inside' : 'Outside'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
          <div className="flex items-center gap-1.5 mb-1">
            <LogIn size={12} className="text-emerald-600" />
            <span className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wide">Entry</span>
          </div>
          <p className="text-sm font-bold text-emerald-800">{fmtTime(record.entryTime)}</p>
        </div>
        <div className="dark:bg-dark-800 bg-zinc-50 rounded-xl p-3 border dark:border-white/8 border-zinc-200">
          <div className="flex items-center gap-1.5 mb-1">
            <LogOut size={12} className="dark:text-zinc-400 text-zinc-500" />
            <span className="text-[11px] dark:text-zinc-400 text-zinc-500 font-semibold uppercase tracking-wide">Exit</span>
          </div>
          <p className="text-sm font-bold dark:text-zinc-200 text-zinc-700">{fmtTime(record.exitTime)}</p>
        </div>
      </div>
    </div>
  )
}

export default function StudentEntryExitPage() {
  const [records, setRecords] = useState<EntryExitRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)

  async function load(p: number, append = false) {
    if (p === 1) setLoading(true); else setLoadingMore(true)
    try {
      const res = await studentService.getEntryExit(p, 20)
      if (res.success && res.data) {
        setRecords(prev => append ? [...prev, ...res.data!.data] : res.data!.data)
        setTotal(res.data.total)
        setPage(p)
      }
    } finally { setLoading(false); setLoadingMore(false) }
  }

  useEffect(() => { load(1) }, [])

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <LogIn size={20} className="text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900">Entry / Exit</h1>
          <p className="text-sm dark:text-zinc-500 text-zinc-400">Your hostel entry and exit records</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-5">
        <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Entry and exit records are managed by the Watchman at the hostel gate.
          These records are read-only. Contact the hostel office for corrections.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[{ label: 'Total Records', value: total, icon: Clock }, { label: "Today's Status", value: records[0]?.status === 'IN' ? 'Inside' : 'Outside', icon: LogIn }].map(s => (
          <div key={s.label} className="dark:bg-dark-900 bg-white rounded-2xl border dark:border-white/5 border-zinc-200  p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <s.icon size={16} className="text-teal-600" />
            </div>
            <div>
              <p className="text-lg font-bold dark:text-zinc-100 text-zinc-900">{s.value}</p>
              <p className="text-xs dark:text-zinc-500 text-zinc-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 dark:bg-dark-700 bg-zinc-100 rounded-2xl animate-pulse" />)}</div>
      ) : records.length === 0 ? (
        <div className="dark:bg-dark-900 bg-white rounded-2xl  border dark:border-white/5 border-zinc-200 p-12 text-center">
          <LogIn size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-semibold dark:text-zinc-400 text-zinc-500">No records yet</p>
          <p className="text-xs dark:text-zinc-500 text-zinc-400 mt-1">Entry and exit records will appear here.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {records.map(r => <RecordRow key={r.id} record={r} />)}
          </div>
          {records.length < total && (
            <button onClick={() => load(page + 1, true)} disabled={loadingMore}
              className="w-full mt-4 py-2.5 border dark:border-white/8 border-zinc-200 rounded-xl text-sm font-medium dark:text-zinc-300 text-zinc-600 hover:dark:bg-dark-800 bg-zinc-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loadingMore ? <><Clock size={14} className="animate-spin" /> Loadingâ€¦</> : 'Load more'}
            </button>
          )}
        </>
      )}
    </div>
  )
}

