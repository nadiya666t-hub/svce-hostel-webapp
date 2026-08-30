import { useState, useEffect } from 'react'
import { Clock, Plus, X, Loader2, CheckCircle2, XCircle } from 'lucide-react'
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

export default function WatchmanLateEntriesPage() {
  const { isDark } = useTheme()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [studentUsn, setStudentUsn] = useState('')
  const [reason, setReason]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [formErr, setFormErr]   = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/watchman/late-entries', { params: { limit: '50' } })
      if (r.data.success) setEntries(r.data.data.data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault(); setFormErr('')
    if (!studentUsn.trim()) { setFormErr('Student USN is required.'); return }
    setSaving(true)
    try {
      await api.post('/watchman/late-entries', { studentUsn, reason })
      setShowForm(false); setStudentUsn(''); setReason(''); load()
    } catch (err: unknown) {
      setFormErr((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to record.')
    } finally { setSaving(false) }
  }

  async function handlePermission(id: string, status: 'APPROVED' | 'REJECTED') {
    await api.patch(`/watchman/late-entries/${id}/permission`, { status, approvedBy: 'Warden' }); load()
  }

  const card = clsx('rounded-2xl border', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm')

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', isDark ? 'bg-orange-500/15 border border-orange-500/20' : 'bg-orange-50 border border-orange-200')}>
            <Clock size={18} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
          </div>
          <h1 className={clsx('text-2xl font-bold font-display', isDark ? 'text-white' : 'text-slate-900')}>Late Entries</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-accent text-sm flex items-center gap-1.5 py-2 px-4"><Plus size={14} />Record</button>
      </div>

      {showForm && (
        <div className={clsx(card, 'p-5 mb-5 animate-slide-up')}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={clsx('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>Record Late Entry</h2>
            <button onClick={() => setShowForm(false)} className={clsx('p-1.5 rounded-lg', isDark ? 'text-slate-500 hover:bg-white/5' : 'text-slate-400 hover:bg-slate-100')}><X size={16} /></button>
          </div>
          {formErr && <p className="text-xs text-red-400 mb-3">{formErr}</p>}
          <form onSubmit={handleRecord} className="space-y-3">
            <div><label className={clsx('text-xs font-semibold uppercase tracking-widest block mb-1.5', isDark ? 'text-slate-400' : 'text-slate-500')}>Student USN *</label><input value={studentUsn} onChange={e => setStudentUsn(e.target.value.toUpperCase())} className="input-dark w-full font-mono uppercase" placeholder="1VE25CS048" /></div>
            <div><label className={clsx('text-xs font-semibold uppercase tracking-widest block mb-1.5', isDark ? 'text-slate-400' : 'text-slate-500')}>Reason</label><textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} className="input-dark w-full resize-none" placeholder="Reason for late arrival…" /></div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className={clsx('flex-1 py-2.5 border rounded-xl text-sm font-semibold', isDark ? 'border-white/8 text-slate-300' : 'border-slate-200 text-slate-600')}>Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 btn-accent py-2.5 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : 'Record Late Entry'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-orange-400" /></div>
      : entries.length === 0 ? <div className={clsx(card, 'p-12 text-center')}><Clock size={36} className={clsx('mx-auto mb-3', isDark ? 'text-slate-700' : 'text-slate-300')} /><p className={clsx('text-sm', isDark ? 'text-slate-500' : 'text-slate-500')}>No late entries recorded</p></div>
      : (
        <div className="space-y-3">
          {entries.map((e: Entry) => {
            const pm = PERM_META[e.permissionStatus as string] ?? PERM_META.PENDING
            return (
              <div key={e.id as string} className={clsx(card, 'p-4')}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className={clsx('text-sm font-bold', isDark ? 'text-slate-200' : 'text-slate-800')}>{e.studentName as string}</p>
                    <p className={clsx('text-xs mt-0.5 font-mono', isDark ? 'text-slate-500' : 'text-slate-400')}>{e.studentUsn as string} · Room {e.roomNumber as string}</p>
                    <p className={clsx('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>Entry: {fmtDate(e.entryTime as string)}</p>
                    {(e.reason as string) && <p className={clsx('text-xs mt-0.5', isDark ? 'text-slate-400' : 'text-slate-600')}>Reason: {e.reason as string}</p>}
                    {(e.approvedBy as string) && <p className={clsx('text-xs mt-0.5', isDark ? 'text-slate-500' : 'text-slate-400')}>Approved by: {e.approvedBy as string}</p>}
                  </div>
                  <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0', pm.bg, pm.color)}>{pm.label}</span>
                </div>
                {e.permissionStatus === 'PENDING' && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handlePermission(e.id as string, 'APPROVED')}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                      <CheckCircle2 size={12} /> Approve
                    </button>
                    <button onClick={() => handlePermission(e.id as string, 'REJECTED')}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                      <XCircle size={12} /> Reject
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
