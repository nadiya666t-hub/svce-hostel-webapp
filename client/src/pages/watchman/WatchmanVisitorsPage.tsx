import { useState, useEffect } from 'react'
import { Users, Plus, X, Loader2, CheckCircle2, XCircle, Clock, LogOut as ExitIcon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import api from '@/services/api'
import clsx from 'clsx'

type Entry = Record<string, unknown>

const PERM_META: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'Pending',  color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  APPROVED: { label: 'Approved', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  REJECTED: { label: 'Rejected', color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
}

export default function WatchmanVisitorsPage() {
  const { isDark } = useTheme()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter]   = useState('')
  // Form
  const [visitorName, setVisitorName] = useState('')
  const [phone, setPhone]   = useState('')
  const [relation, setRelation] = useState('')
  const [purpose, setPurpose]   = useState('')
  const [studentUsn, setStudentUsn] = useState('')
  const [saving, setSaving]   = useState(false)
  const [formErr, setFormErr] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { limit: '30' }
      if (filter) params.status = filter
      const r = await api.get('/watchman/visitors', { params })
      if (r.data.success) setEntries(r.data.data.data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [filter])

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault(); setFormErr('')
    if (!visitorName.trim() || !studentUsn.trim()) { setFormErr('Visitor name and student USN are required.'); return }
    setSaving(true)
    try {
      await api.post('/watchman/visitors', { visitorName, phone, relationship: relation, purpose, studentUsn })
      setShowForm(false); setVisitorName(''); setPhone(''); setRelation(''); setPurpose(''); setStudentUsn('')
      load()
    } catch (err: unknown) {
      setFormErr((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to record visitor.')
    } finally { setSaving(false) }
  }

  async function handleExit(id: string) {
    await api.patch(`/watchman/visitors/${id}/exit`); load()
  }
  async function handlePermission(id: string, status: 'APPROVED' | 'REJECTED', approvedBy?: string) {
    await api.patch(`/watchman/visitors/${id}/permission`, { status, approvedBy: approvedBy ?? 'Warden' }); load()
  }

  const card = clsx('rounded-2xl border', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm')

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', isDark ? 'bg-violet-500/15 border border-violet-500/20' : 'bg-violet-50 border border-violet-200')}>
            <Users size={18} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
          </div>
          <h1 className={clsx('text-2xl font-bold font-display', isDark ? 'text-white' : 'text-slate-900')}>Visitors</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-accent text-sm flex items-center gap-1.5 py-2 px-4"><Plus size={14} />Record Visitor</button>
      </div>

      {/* New visitor form */}
      {showForm && (
        <div className={clsx(card, 'p-5 mb-5 animate-slide-up')}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={clsx('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>New Visitor Entry</h2>
            <button onClick={() => setShowForm(false)} className={clsx('p-1.5 rounded-lg', isDark ? 'text-slate-500 hover:bg-white/5' : 'text-slate-400 hover:bg-slate-100')}><X size={16} /></button>
          </div>
          {formErr && <p className="text-xs text-red-400 mb-3">{formErr}</p>}
          <form onSubmit={handleRecord} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={clsx('text-xs font-semibold uppercase tracking-widest block mb-1.5', isDark ? 'text-slate-400' : 'text-slate-500')}>Visitor Name *</label><input value={visitorName} onChange={e => setVisitorName(e.target.value)} className="input-dark w-full" placeholder="Full name" /></div>
            <div><label className={clsx('text-xs font-semibold uppercase tracking-widest block mb-1.5', isDark ? 'text-slate-400' : 'text-slate-500')}>Phone</label><input value={phone} onChange={e => setPhone(e.target.value)} className="input-dark w-full" placeholder="+91 ..." /></div>
            <div><label className={clsx('text-xs font-semibold uppercase tracking-widest block mb-1.5', isDark ? 'text-slate-400' : 'text-slate-500')}>Relationship</label><input value={relation} onChange={e => setRelation(e.target.value)} className="input-dark w-full" placeholder="Mother, Father, Guardian…" /></div>
            <div><label className={clsx('text-xs font-semibold uppercase tracking-widest block mb-1.5', isDark ? 'text-slate-400' : 'text-slate-500')}>Purpose</label><input value={purpose} onChange={e => setPurpose(e.target.value)} className="input-dark w-full" placeholder="Meeting, Delivery…" /></div>
            <div><label className={clsx('text-xs font-semibold uppercase tracking-widest block mb-1.5', isDark ? 'text-slate-400' : 'text-slate-500')}>Student USN *</label><input value={studentUsn} onChange={e => setStudentUsn(e.target.value.toUpperCase())} className="input-dark w-full font-mono uppercase" placeholder="1VE25CS048" /></div>
            <div className="sm:col-span-2 flex gap-3 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className={clsx('flex-1 py-2.5 border rounded-xl text-sm font-semibold', isDark ? 'border-white/8 text-slate-300' : 'border-slate-200 text-slate-600')}>Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 btn-accent py-2.5 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={14} className="animate-spin" />Recording…</> : 'Record Entry'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {['', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all', filter === f ? 'bg-teal-500 text-white' : isDark ? 'bg-dark-800 border border-white/8 text-slate-400 hover:border-white/15' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300')}>
            {f || 'All'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-teal-400" /></div>
      : entries.length === 0 ? <div className={clsx(card, 'p-12 text-center')}><Users size={36} className={clsx('mx-auto mb-3', isDark ? 'text-slate-700' : 'text-slate-300')} /><p className={clsx('text-sm', isDark ? 'text-slate-500' : 'text-slate-500')}>No visitors recorded</p></div>
      : (
        <div className="space-y-3">
          {entries.map((e: Entry) => {
            const pm = PERM_META[e.permissionStatus as string] ?? PERM_META.PENDING
            const isInside = e.entryStatus === 'INSIDE'
            return (
              <div key={e.id as string} className={clsx(card, 'p-4')}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className={clsx('text-sm font-bold', isDark ? 'text-slate-200' : 'text-slate-800')}>{e.visitorName as string}</p>
                    <p className={clsx('text-xs mt-0.5', isDark ? 'text-slate-500' : 'text-slate-400')}>{e.relationship as string} · {e.phone as string}</p>
                    <p className={clsx('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>Visiting: <span className="font-semibold">{e.studentName as string}</span> ({e.studentUsn as string}) — Room {e.roomNumber as string}</p>
                    {e.purpose && <p className={clsx('text-xs', isDark ? 'text-slate-600' : 'text-slate-400')}>Purpose: {e.purpose as string}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full border', pm.bg, pm.color)}>{pm.label}</span>
                    <span className={clsx('text-[10px] font-semibold', isInside ? 'text-emerald-400' : isDark ? 'text-slate-600' : 'text-slate-400')}>{isInside ? '● Inside' : 'Exited'}</span>
                  </div>
                </div>
                <div className={clsx('flex items-center justify-between text-[10px]', isDark ? 'text-slate-600' : 'text-slate-400')}>
                  <span>Entry: {fmtDate(e.entryTime as string)}</span>
                  {(e.exitTime as string) && <span>Exit: {fmtDate(e.exitTime as string)}</span>}
                </div>
                {/* Actions */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {e.permissionStatus === 'PENDING' && (
                    <>
                      <button onClick={() => handlePermission(e.id as string, 'APPROVED', 'Warden')}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                        <CheckCircle2 size={12} /> Approve
                      </button>
                      <button onClick={() => handlePermission(e.id as string, 'REJECTED')}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                        <XCircle size={12} /> Reject
                      </button>
                    </>
                  )}
                  {isInside && e.permissionStatus !== 'REJECTED' && (
                    <button onClick={() => handleExit(e.id as string)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors">
                      <ExitIcon size={12} /> Mark Exit
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
