import { useState, useEffect } from 'react'
import {
  BellDot, Bell, CheckCheck, CalendarCheck, CheckCircle2,
  XCircle, AlertCircle, CreditCard, Megaphone, Loader2,
} from 'lucide-react'
import { studentService } from '@/services/studentService'
import type { Notification, NotificationType } from '@/types'
import clsx from 'clsx'

const TYPE_META: Record<NotificationType, { icon: React.ElementType; color: string; bg: string }> = {
  ATTENDANCE_UPDATED:    { icon: CalendarCheck,  color: 'text-primary-600', bg: 'bg-primary-50' },
  REQUEST_APPROVED:      { icon: CheckCircle2,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
  REQUEST_REJECTED:      { icon: XCircle,        color: 'text-red-500',     bg: 'bg-red-50'     },
  PROBLEM_STATUS_CHANGED:{ icon: AlertCircle,    color: 'text-orange-500',  bg: 'bg-orange-50'  },
  FEE_REMINDER:          { icon: CreditCard,     color: 'text-rose-500',    bg: 'bg-rose-50'    },
  IMPORTANT_NOTICE:      { icon: Megaphone,      color: 'text-blue-600',    bg: 'bg-blue-50'    },
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function NotifRow({ notif, onRead }: { notif: Notification; onRead: (id: string) => void }) {
  const meta = TYPE_META[notif.type] ?? TYPE_META.IMPORTANT_NOTICE
  const Icon = meta.icon
  return (
    <div
      onClick={() => { if (!notif.isRead) onRead(notif.id) }}
      className={clsx(
        'flex items-start gap-3 px-4 py-4 rounded-2xl border transition-all cursor-pointer',
        notif.isRead
          ? 'bg-white border-slate-100 opacity-70 hover:opacity-100'
          : 'bg-white border-primary-100 shadow-card hover:shadow-card-hover'
      )}
    >
      <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', meta.bg)}>
        <Icon size={17} className={meta.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-semibold text-slate-800', !notif.isRead && 'font-bold')}>{notif.title}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>
        <p className="text-xs text-slate-400 mt-1">{timeAgo(notif.createdAt)}</p>
      </div>
      {!notif.isRead && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1.5" />}
    </div>
  )
}

export default function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

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
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <BellDot size={20} className="text-violet-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
            <p className="text-sm text-slate-400">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAll} disabled={markingAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-600 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50">
            {markingAll ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={13} />}
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-12 text-center">
          <Bell size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">No notifications yet</p>
          <p className="text-xs text-slate-400 mt-1">You'll be notified about attendance, requests, and fees here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => <NotifRow key={n.id} notif={n} onRead={handleRead} />)}
          {total > notifications.length && (
            <p className="text-xs text-slate-400 text-center py-2">Showing {notifications.length} of {total}</p>
          )}
        </div>
      )}
    </div>
  )
}
