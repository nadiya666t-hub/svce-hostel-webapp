import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, Loader2, RefreshCw, CheckCircle2, Clock, User } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import api from '@/services/api'
import clsx from 'clsx'

interface Instruction {
  id: string
  studentId: string
  studentName: string
  usn: string
  floor: string
  room: string
  date: string
  startTime: string
  endTime: string
  reason: string | null
  isUsed: boolean
  createdAt: string
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function WatchmanInstructionsPage() {
  const { isDark } = useTheme()
  const [items,    setItems]    = useState<Instruction[]>([])
  const [loading,  setLoading]  = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    try {
      // Fetch attendance windows that have special timing (non-default)
      const r = await api.get('/watchman/instructions')
      if (r.data.success) setItems(r.data.data ?? [])
    } catch {
      // Endpoint may not exist yet — show empty state gracefully
      setItems([])
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const today = new Date().toISOString().slice(0, 10)
  const todayItems   = items.filter(i => i.date === today)
  const previousItems = items.filter(i => i.date < today)

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',
            isDark ? 'bg-teal-500/15 border border-teal-500/20' : 'bg-teal-50 border border-teal-200')}>
            <ClipboardList size={18} className={isDark ? 'text-teal-400' : 'text-teal-600'} />
          </div>
          <div>
            <h1 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>Warden Instructions</h1>
            <p className={clsx('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>Special attendance timings issued by Warden</p>
          </div>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className={clsx('p-2 rounded-xl border transition-all', isDark ? 'border-white/8 text-slate-400 hover:text-slate-200 hover:bg-white/5' : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50')}>
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-teal-400" /></div>
      ) : items.length === 0 ? (
        <div className={clsx('rounded-2xl border p-12 text-center', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200')}>
          <ClipboardList size={36} className={clsx('mx-auto mb-3', isDark ? 'text-slate-700' : 'text-slate-300')} />
          <p className={clsx('text-sm font-semibold mb-1', isDark ? 'text-slate-400' : 'text-slate-600')}>No special instructions</p>
          <p className={clsx('text-xs', isDark ? 'text-slate-600' : 'text-slate-400')}>
            When a Warden grants a student special attendance timing, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {todayItems.length > 0 && (
            <section>
              <h2 className={clsx('text-xs font-bold uppercase tracking-widest mb-3', isDark ? 'text-slate-400' : 'text-slate-500')}>
                Today — {fmt(today)}
              </h2>
              <div className="space-y-3">
                {todayItems.map(item => <InstructionCard key={item.id} item={item} isDark={isDark} />)}
              </div>
            </section>
          )}
          {previousItems.length > 0 && (
            <section>
              <h2 className={clsx('text-xs font-bold uppercase tracking-widest mb-3', isDark ? 'text-slate-500' : 'text-slate-400')}>
                Previous
              </h2>
              <div className="space-y-3">
                {previousItems.map(item => <InstructionCard key={item.id} item={item} isDark={isDark} past />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function InstructionCard({ item, isDark, past }: { item: Instruction; isDark: boolean; past?: boolean }) {
  return (
    <div className={clsx('rounded-2xl border p-5', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm', past && 'opacity-60')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
            isDark ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-700')}>
            <User size={15} />
          </div>
          <div>
            <p className={clsx('text-sm font-bold', isDark ? 'text-slate-200' : 'text-slate-800')}>{item.studentName}</p>
            <p className={clsx('text-xs font-mono', isDark ? 'text-slate-500' : 'text-slate-400')}>{item.usn}</p>
          </div>
        </div>
        {item.isUsed ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <CheckCircle2 size={11} /> Used
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            <Clock size={11} /> Pending
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          ['Date',  new Date(item.date + 'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})],
          ['Room',  `${item.floor} · Room ${item.room}`],
          ['From',  item.startTime],
          ['To',    item.endTime],
        ] as [string,string][]).map(([l,v]) => (
          <div key={l} className={clsx('rounded-xl p-3 border', isDark ? 'bg-dark-800 border-white/5' : 'bg-slate-50 border-slate-100')}>
            <p className={clsx('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>{l}</p>
            <p className={clsx('text-sm font-semibold mt-0.5', isDark ? 'text-slate-200' : 'text-slate-800')}>{v}</p>
          </div>
        ))}
      </div>

      {item.reason && (
        <div className={clsx('mt-3 rounded-xl p-3 border', isDark ? 'bg-dark-800 border-white/5' : 'bg-slate-50 border-slate-100')}>
          <p className={clsx('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>Reason</p>
          <p className={clsx('text-sm mt-0.5', isDark ? 'text-slate-300' : 'text-slate-600')}>{item.reason}</p>
        </div>
      )}
    </div>
  )
}
