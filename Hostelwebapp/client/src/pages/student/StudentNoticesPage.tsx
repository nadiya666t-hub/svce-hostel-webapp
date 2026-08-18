import { useState, useEffect } from 'react'
import { Bell, ChevronDown, ChevronUp, AlertTriangle, Info, Megaphone, Wrench } from 'lucide-react'
import { studentService } from '@/services/studentService'
import type { Notice, NoticePriority } from '@/types'
import clsx from 'clsx'

const PRIORITY_META: Record<NoticePriority, { label: string; color: string; bg: string; dot: string }> = {
  LOW:    { label: 'Info',    color: 'text-slate-600',   bg: 'bg-slate-50 border-slate-200',    dot: 'bg-slate-400'   },
  MEDIUM: { label: 'Notice',  color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',      dot: 'bg-blue-500'    },
  HIGH:   { label: 'Important', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500'  },
  URGENT: { label: 'Urgent',  color: 'text-red-700',     bg: 'bg-red-50 border-red-200',        dot: 'bg-red-500'     },
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Events: Megaphone, Maintenance: Wrench, Fees: Bell, General: Info,
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function NoticeCard({ notice, index }: { notice: Notice; index: number }) {
  const [open, setOpen] = useState(index === 0)
  const meta = PRIORITY_META[notice.priority]
  const CatIcon = CATEGORY_ICONS[notice.category] ?? Info

  return (
    <div
      className={clsx('bg-white rounded-2xl border shadow-card overflow-hidden animate-slide-up',
        notice.priority === 'URGENT' ? 'border-red-200' : notice.priority === 'HIGH' ? 'border-orange-200' : 'border-slate-100'
      )}
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
    >
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-start gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left">
        <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', meta.bg)}>
          <CatIcon size={15} className={meta.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-slate-800">{notice.title}</p>
            <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide', meta.bg, meta.color)}>{meta.label}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{fmtDate(notice.createdAt)} · {notice.category}</p>
          {!open && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{notice.description}</p>}
        </div>
        {open ? <ChevronUp size={15} className="text-slate-400 shrink-0 mt-1" /> : <ChevronDown size={15} className="text-slate-400 shrink-0 mt-1" />}
      </button>
      {open && (
        <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50">
          <p className="text-sm text-slate-700 leading-relaxed">{notice.description}</p>
        </div>
      )}
    </div>
  )
}

export default function StudentNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('')

  useEffect(() => {
    setLoading(true)
    studentService.getNotices(1, 50)
      .then(r => { if (r.success && r.data) setNotices(r.data.data) })
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter ? notices.filter(n => n.priority === filter) : notices
  const urgentCount = notices.filter(n => n.priority === 'URGENT' || n.priority === 'HIGH').length

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <Bell size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Notices</h1>
          <p className="text-sm text-slate-400">Hostel announcements and updates</p>
        </div>
      </div>

      {urgentCount > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 mb-5">
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-medium">{urgentCount} important notice{urgentCount > 1 ? 's' : ''} require your attention.</p>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {[{ label: 'All', value: '' }, { label: 'Urgent', value: 'URGENT' }, { label: 'Important', value: 'HIGH' }, { label: 'Notices', value: 'MEDIUM' }, { label: 'Info', value: 'LOW' }].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all', filter === f.value ? 'bg-primary-600 text-white shadow-glow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-12 text-center">
          <Bell size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">No notices at this time</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n, i) => <NoticeCard key={n.id} notice={n} index={i} />)}
        </div>
      )}
    </div>
  )
}
