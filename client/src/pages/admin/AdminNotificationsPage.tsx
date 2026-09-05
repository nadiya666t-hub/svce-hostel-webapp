import { useState, useEffect, useCallback } from 'react'
import { BellRing, Send, Loader2, X, Users } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import api from '@/services/api'
import clsx from 'clsx'

interface Notif {
  id: string; title: string; message: string; type: string; isRead: boolean; createdAt: string
  student: { name: string; user: { usn: string } }
}

const TYPE_COLOR: Record<string,string> = {
  ATTENDANCE_REMINDER: 'text-blue-400',
  REQUEST_UPDATE:      'text-amber-400',
  PROBLEM_UPDATE:      'text-orange-400',
  FEE_REMINDER:        'text-red-400',
  IMPORTANT_NOTICE:    'text-violet-400',
  GENERAL:             'text-slate-400',
}
const fmt = (iso:string) => new Date(iso).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:true})

export default function AdminNotificationsPage() {
  const { isDark } = useTheme()
  const [notifs,   setNotifs]   = useState<Notif[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title,    setTitle]    = useState('')
  const [message,  setMessage]  = useState('')
  const [type,     setType]     = useState('GENERAL')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/admin/notifications'); if (r.data.success) setNotifs(r.data.data) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openForm() { setTitle(''); setMessage(''); setType('GENERAL'); setError(''); setSuccess(''); setShowForm(true) }
  function closeForm() { setShowForm(false); setError(''); setSuccess('') }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSuccess('')
    if (!title.trim() || !message.trim()) { setError('Title and message required.'); return }
    setSaving(true)
    try {
      const r = await api.post('/admin/notifications/broadcast', { title: title.trim(), message: message.trim(), type })
      if (r.data.success) {
        setSuccess(r.data.message ?? 'Sent successfully.')
        setTitle(''); setMessage(''); setType('GENERAL')
        load()
      } else setError(r.data.message ?? 'Failed.')
    } catch (e2: unknown) {
      setError((e2 as {response?:{data?:{message?:string}}})?.response?.data?.message ?? 'Failed.')
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', isDark?'bg-violet-500/15 border border-violet-500/20':'bg-violet-50 border border-violet-200')}>
            <BellRing size={18} className={isDark?'text-violet-400':'text-violet-600'} />
          </div>
          <div>
            <h1 className={clsx('text-2xl font-bold', isDark?'text-white':'text-slate-900')}>Notifications</h1>
            <p className={clsx('text-xs', isDark?'text-slate-400':'text-slate-500')}>Broadcast to all students</p>
          </div>
        </div>
        {!showForm && (
          <button onClick={openForm} className="btn-accent text-sm px-4 py-2 flex items-center gap-1.5">
            <Send size={14}/> Broadcast
          </button>
        )}
      </div>

      {showForm && (
        <div className={clsx('rounded-2xl border p-5 mb-5 animate-slide-down', isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={15} className={isDark?'text-violet-400':'text-violet-600'} />
              <h2 className={clsx('text-base font-bold', isDark?'text-white':'text-slate-900')}>Broadcast Notification</h2>
            </div>
            <button onClick={closeForm} className={clsx('p-1.5 rounded-lg', isDark?'text-slate-500 hover:text-slate-300':'text-slate-400 hover:text-slate-600')}><X size={16}/></button>
          </div>
          {error   && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 mb-3 text-sm">{error}</div>}
          {success && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-3 mb-3 text-sm">{success}</div>}
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="field-label">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title…" className="input-dark w-full" />
            </div>
            <div>
              <label className="field-label">Message</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Message content…"
                className={clsx('w-full px-3 py-2.5 rounded-xl border text-sm resize-none outline-none',
                  isDark?'bg-dark-800 border-white/8 text-slate-100 placeholder-slate-600 focus:border-accent-500':'bg-zinc-50 border-zinc-200 text-slate-900 placeholder-zinc-400 focus:border-accent-500')} />
            </div>
            <div>
              <label className="field-label">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="input-dark w-full">
                <option value="GENERAL">General</option>
                <option value="IMPORTANT_NOTICE">Important Notice</option>
                <option value="FEE_REMINDER">Fee Reminder</option>
                <option value="ATTENDANCE_REMINDER">Attendance Reminder</option>
              </select>
            </div>
            <div className={clsx('rounded-xl p-3 text-xs', isDark?'bg-violet-500/10 border border-violet-500/20 text-violet-300':'bg-violet-50 border border-violet-200 text-violet-700')}>
              ℹ This notification will be sent to <strong>all active students</strong>.
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-accent text-sm px-5 py-2.5 flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send
              </button>
              <button type="button" onClick={closeForm} className={clsx('px-4 py-2.5 rounded-xl border text-sm', isDark?'border-white/8 text-slate-300 hover:bg-dark-700':'border-slate-200 text-slate-600 hover:bg-slate-50')}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Log */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-violet-400" /></div>
      ) : notifs.length === 0 ? (
        <div className={clsx('rounded-2xl border p-12 text-center', isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200')}>
          <BellRing size={36} className={clsx('mx-auto mb-3', isDark?'text-slate-700':'text-slate-300')} />
          <p className={clsx('text-sm', isDark?'text-slate-500':'text-slate-400')}>No notifications sent yet.</p>
        </div>
      ) : (
        <div className={clsx('rounded-2xl border overflow-hidden', isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
          <div className={clsx('px-4 py-3 border-b text-xs font-semibold uppercase tracking-widest', isDark?'text-slate-500 border-white/5':'text-slate-400 border-slate-100')}>
            Recent Notifications ({notifs.length})
          </div>
          <div className="divide-y divide-white/5">
            {notifs.map(n => (
              <div key={n.id} className="px-4 py-3 flex items-start gap-3">
                <span className={clsx('mt-0.5 text-[10px] font-bold shrink-0', TYPE_COLOR[n.type] ?? 'text-slate-400')}>
                  {n.type.replace(/_/g,' ')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm font-semibold', isDark?'text-slate-200':'text-slate-800')}>{n.title}</p>
                  <p className={clsx('text-xs mt-0.5', isDark?'text-slate-400':'text-slate-500')}>{n.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className={clsx('text-[10px]', isDark?'text-slate-600':'text-slate-400')}>{n.student?.name} · {n.student?.user?.usn}</p>
                    <span className={clsx('text-[10px]', isDark?'text-slate-700':'text-slate-300')}>·</span>
                    <p className={clsx('text-[10px]', isDark?'text-slate-600':'text-slate-400')}>{fmt(n.createdAt)}</p>
                  </div>
                </div>
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0 mt-1.5" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
