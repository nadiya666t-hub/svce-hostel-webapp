import { useState, useEffect } from 'react'
import { Bell, ChevronDown, ChevronUp, Megaphone, Wrench, Info } from 'lucide-react'
import { studentService } from '@/services/studentService'
import { useTheme } from '@/hooks/useTheme'
import type { Notice } from '@/types'
import clsx from 'clsx'

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Events: Megaphone, Maintenance: Wrench, Fees: Bell, General: Info,
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function NoticeCard({ notice, index }: { notice: Notice; index: number }) {
  const [open, setOpen] = useState(index === 0)
  const { isDark } = useTheme()
  const CatIcon = CATEGORY_ICONS[notice.category] ?? Info

  return (
    <div
      className={clsx('rounded-2xl border overflow-hidden animate-slide-up transition-all duration-300',
        isDark ? 'bg-dark-900 border-white/5 hover:border-white/8' : 'bg-white border-zinc-200 hover:border-zinc-300'
      )}
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
    >
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-start gap-3 px-4 py-4 hover:bg-white/2 transition-colors text-left">
        <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
          isDark ? 'bg-accent-600/10 border border-accent-600/15' : 'bg-blue-50 border border-blue-100')}>
          <CatIcon size={14} className={isDark ? 'text-accent-400' : 'text-blue-600'} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={clsx('text-sm font-semibold', isDark ? 'text-zinc-200' : 'text-zinc-800')}>{notice.title}</p>
          <p className={clsx('text-xs mt-0.5', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
            {fmtDate(notice.createdAt)} · {notice.category}
          </p>
          {!open && <p className={clsx('text-xs mt-1 line-clamp-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>{notice.description}</p>}
        </div>
        {open
          ? <ChevronUp size={14} className={clsx('shrink-0 mt-1', isDark ? 'text-zinc-600' : 'text-zinc-400')} />
          : <ChevronDown size={14} className={clsx('shrink-0 mt-1', isDark ? 'text-zinc-600' : 'text-zinc-400')} />}
      </button>
      {open && (
        <div className={clsx('border-t px-4 py-4', isDark ? 'border-white/5 bg-dark-800/50' : 'border-zinc-100 bg-zinc-50/50')}>
          <p className={clsx('text-sm leading-relaxed', isDark ? 'text-zinc-300' : 'text-zinc-700')}>{notice.description}</p>
        </div>
      )}
    </div>
  )
}

export default function StudentNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const { isDark } = useTheme()

  useEffect(() => {
    setLoading(true)
    studentService.getNotices(1, 50)
      .then(r => { if (r.success && r.data) setNotices(r.data.data) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',
          isDark ? 'bg-accent-600/15 border border-accent-600/20' : 'bg-blue-50 border border-blue-200')}>
          <Bell size={18} className={isDark ? 'text-accent-400' : 'text-blue-600'} />
        </div>
        <div>
          <h1 className={clsx('text-2xl font-bold font-display', isDark ? 'text-white' : 'text-zinc-900')}>Notices</h1>
          <p className={clsx('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>Hostel announcements and updates</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className={clsx('h-20 rounded-2xl animate-pulse', isDark ? 'bg-dark-800' : 'bg-zinc-100')} />)}
        </div>
      ) : notices.length === 0 ? (
        <div className={clsx('rounded-2xl border p-12 text-center', isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-zinc-200')}>
          <Bell size={36} className={clsx('mx-auto mb-3', isDark ? 'text-zinc-700' : 'text-zinc-300')} />
          <p className={clsx('text-sm font-semibold', isDark ? 'text-zinc-500' : 'text-zinc-500')}>No notices at this time</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((n, i) => <NoticeCard key={n.id} notice={n} index={i} />)}
        </div>
      )}
    </div>
  )
}
