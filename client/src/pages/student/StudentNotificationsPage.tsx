import { useState, useEffect } from 'react'
import {
  BellDot, Bell, CheckCheck, CalendarCheck, CheckCircle2,
  XCircle, AlertCircle, CreditCard, Megaphone, Loader2,
} from 'lucide-react'
import { studentService } from '@/services/studentService'
import { useTheme } from '@/hooks/useTheme'
import type { Notification, NotificationType } from '@/types'
import clsx from 'clsx'

const TYPE_META: Record<NotificationType, { icon: React.ElementType; accent: string }> = {
  ATTENDANCE_UPDATED:    { icon: CalendarCheck,  accent: '#3b6ef4' },
  REQUEST_APPROVED:      { icon: CheckCircle2,   accent: '#10b981' },
  REQUEST_REJECTED:      { icon: XCircle,        accent: '#ef4444' },
  PROBLEM_STATUS_CHANGED:{ icon: AlertCircle,    accent: '#f97316' },
  FEE_REMINDER:          { icon: CreditCard,     accent: '#f43f5e' },
  IMPORTANT_NOTICE:      { icon: Megaphone,      accent: '#8b5cf6' },
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function NotifRow({ notif, onRead }: { notif: Notification; onRead: (id: string) => void }) {
  const { isDark } = useTheme()
  const meta = TYPE_META[notif.type] ?? TYPE_META.IMPORTANT_NOTICE
  const Icon = meta.icon

  return (
    <div
      onClick={() => { if (!notif.isRead) onRead(notif.id) }}
      className={clsx(
        'flex items-start gap-3 px-4 py-4 rounded-2xl border transition-all cursor-pointer',
        notif.isRead
          ? isDark ? 'bg-dark-900 border-white/4 opacity-60 hover:opacity-80' : 'bg-white border-zinc-200 opacity-60 hover:opacity-80'
          : isDark ? 'bg-dark-900 border-white/8 hover:border-white/12' : 'bg-white border-zinc-200 hover:border-zinc-300',
      )}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${meta.accent}15`, border: `1px solid ${meta.accent}25` }}>
        <Icon size={16} style={{ color: meta.accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-semibold', notif.isRead
          ? isDark ? 'text-zinc-400' : 'text-zinc-500'
          : isDark ? 'text-zinc-200' : 'text-zinc-800'
        )}>{notif.title}</p>
        <p className={clsx('text-xs mt-0.5 leading-relaxed', isDark ? 'text-zinc-500' : 'text-zinc-400')}>{notif.message}</p>
        <p className={clsx('text-[10px] mt-1 font-mono', isDark ? 'text-zinc-700' : 'text-zinc-400')}>{timeAgo(notif.createdAt)}</p>
      </div>
      {!notif.isRead && (
        <span className="w-2 h-2 rounded-full bg-accent-500 shrink-0 mt-1.5" />
      )}
    </div>
  )
}

export default function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const [total, setTotal]                 = useState(0)
  const [loading, setLoading]             = useState(true)
  const [markingAll, setMarkingAll]       = useState(false)
  const { isDark } = useTheme()

  async function load() {
    setLoading(true)
    try {
      const res = await studentService.getNotifications(1, 30)
      if (res.success && res.data) {
        setNotifications(res.data.data)
        setTotal(res.data.total)
        setUnreadCount(res.data.unreadCount)
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleRead(id: string) {
    await studentService.markNotificationRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount(c => Math.max(0, c - 1))
  }

  async function handleMarkAll() {
    setMarkingAll(true)
    await studentService.markAllNotificationsRead()
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
    setMarkingAll(false)
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={clsx('relative w-10 h-10 rounded-xl flex items-center justify-center',
            isDark ? 'bg-accent-600/15 border border-accent-600/20' : 'bg-blue-50 border border-blue-200')}>
            <BellDot size={18} className={isDark ? 'text-accent-400' : 'text-blue-600'} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className={clsx('text-2xl font-bold font-display', isDark ? 'text-white' : 'text-zinc-900')}>Notifications</h1>
            <p className={clsx('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAll} disabled={markingAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50"
            style={{ borderColor: 'rgba(59,110,244,0.3)', color: '#6090f8', background: 'rgba(59,110,244,0.08)' }}>
            {markingAll ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className={clsx('h-20 rounded-2xl animate-pulse', isDark ? 'bg-dark-800' : 'bg-zinc-100')} />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className={clsx('rounded-2xl border p-12 text-center', isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-zinc-200')}>
          <Bell size={36} className={clsx('mx-auto mb-3', isDark ? 'text-zinc-700' : 'text-zinc-300')} />
          <p className={clsx('text-sm font-semibold', isDark ? 'text-zinc-500' : 'text-zinc-500')}>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => <NotifRow key={n.id} notif={n} onRead={handleRead} />)}
          {total > notifications.length && (
            <p className={clsx('text-xs text-center py-2 font-mono', isDark ? 'text-zinc-700' : 'text-zinc-400')}>
              Showing {notifications.length} of {total}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
