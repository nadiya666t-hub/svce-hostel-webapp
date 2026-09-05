import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Clock, CheckCircle2, Camera } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import api from '@/services/api'
import clsx from 'clsx'

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  NEW:          { label: 'New',         color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
  ACKNOWLEDGED: { label: 'Acknowledged',color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  IN_PROGRESS:  { label: 'In Progress', color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20' },
  RESOLVED:     { label: 'Resolved',    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  REJECTED:     { label: 'Rejected',    color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
  ESCALATED:    { label: 'Escalated',   color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20' },
}

const NEXT_STATUSES = ['NEW','ACKNOWLEDGED','IN_PROGRESS','RESOLVED','REJECTED','ESCALATED']

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function OverseerProblemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const [problem, setProblem] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading]   = useState(true)
  const [newStatus, setNewStatus] = useState('')
  const [comment, setComment]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [saveMsg, setSaveMsg]   = useState('')

  useEffect(() => {
    if (!id) return
    api.get(`/overseer/problems/${id}`).then(r => { if (r.data.success) { setProblem(r.data.data); setNewStatus(r.data.data.status as string) } }).finally(() => setLoading(false))
  }, [id])

  async function handleUpdate() {
    if (!newStatus || !id) return
    setSaving(true); setSaveMsg('')
    try {
      await api.patch(`/overseer/problems/${id}/status`, { status: newStatus, comment })
      setSaveMsg('Status updated successfully.')
      setComment('')
      const r = await api.get(`/overseer/problems/${id}`)
      if (r.data.success) setProblem(r.data.data)
    } catch { setSaveMsg('Failed to update status.') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-orange-400" /></div>
  if (!problem) return <div className="text-center py-16 text-slate-400">Problem not found.</div>

  const meta = STATUS_META[problem.status as string] ?? STATUS_META.NEW
  const updates = (problem.updates ?? []) as Array<Record<string, unknown>>
  const attachments = (problem.attachments ?? []) as Array<Record<string, unknown>>
  const isOverdue = problem.isOverdue as boolean
  const hoursLeft = problem.hoursRemaining as number

  const card = clsx('rounded-2xl border p-5', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm')

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-5">
      <button onClick={() => navigate('/overseer/problems')} className={clsx('flex items-center gap-2 text-xs transition-colors', isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}>
        <ArrowLeft size={14} /> Back to Problems
      </button>

      {/* Problem info */}
      <div className={clsx(card, 'relative overflow-hidden')}>
        <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: '#f97316' }} />
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className={clsx('text-xl font-bold font-display', isDark ? 'text-white' : 'text-slate-900')}>
              {(problem.category as string).replace(/_/g,' ')}
            </h1>
            <p className={clsx('text-xs mt-0.5', isDark ? 'text-slate-500' : 'text-slate-400')}>{fmtDate(problem.createdAt as string)}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full border', meta.bg, meta.color)}>{meta.label}</span>
            {isOverdue
              ? <span className="text-[10px] text-rose-400 font-bold">OVERDUE — Escalated</span>
              : !['RESOLVED','REJECTED','ESCALATED'].includes(problem.status as string) && (
                <span className={clsx('text-[10px] flex items-center gap-1', hoursLeft < 6 ? 'text-rose-400' : hoursLeft < 24 ? 'text-amber-400' : isDark ? 'text-slate-500' : 'text-slate-400')}>
                  <Clock size={10} /> {hoursLeft}h remaining
                </span>
              )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Student', value: problem.studentName as string },
            { label: 'USN',     value: problem.studentUsn as string },
            { label: 'Room',    value: `Room ${problem.roomNumber as string}` },
            { label: 'Floor',   value: problem.floor as string },
          ].map(({ label, value }) => (
            <div key={label} className={clsx('rounded-xl p-3 border', isDark ? 'bg-dark-800 border-white/5' : 'bg-slate-50 border-slate-100')}>
              <p className={clsx('text-[10px] uppercase tracking-wide', isDark ? 'text-slate-500' : 'text-slate-400')}>{label}</p>
              <p className={clsx('text-sm font-semibold mt-0.5', isDark ? 'text-slate-200' : 'text-slate-800')}>{value}</p>
            </div>
          ))}
        </div>

        <div className={clsx('rounded-xl p-4 border', isDark ? 'bg-dark-800 border-white/5' : 'bg-slate-50 border-slate-100')}>
          <p className={clsx('text-[10px] uppercase tracking-wide mb-1', isDark ? 'text-slate-500' : 'text-slate-400')}>Description</p>
          <p className={clsx('text-sm', isDark ? 'text-slate-300' : 'text-slate-700')}>{problem.description as string}</p>
        </div>

        {/* Photo */}
        {(problem.photoUrl as string) && (
          <div className="mt-3">
            <p className={clsx('text-[10px] uppercase tracking-wide mb-2 flex items-center gap-1', isDark ? 'text-slate-500' : 'text-slate-400')}><Camera size={10} /> Attached Photo</p>
            <img src={problem.photoUrl as string} alt="Problem" className="rounded-xl w-full max-h-64 object-cover border border-white/10" />
          </div>
        )}

        {/* Extra attachments */}
        {attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {attachments.map(a => (
              <a key={a.id as string} href={a.fileUrl as string} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-xs text-accent-400 hover:underline">
                <Camera size={12} /> {(a.fileType as string) === 'video' ? '▶ Video' : '📷 Photo'} {a.filename as string}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Update status */}
      {!['RESOLVED','REJECTED','ESCALATED'].includes(problem.status as string) && (
        <div className={card}>
          <h2 className={clsx('text-sm font-bold uppercase tracking-widest mb-4', isDark ? 'text-slate-400' : 'text-slate-500')}>Update Status</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
            {NEXT_STATUSES.map(s => {
              const m = STATUS_META[s]
              return (
                <button key={s} onClick={() => setNewStatus(s)}
                  className={clsx('py-2 px-2 rounded-xl border text-xs font-semibold transition-all text-center',
                    newStatus === s ? clsx(m.bg, m.color) : isDark ? 'border-white/8 text-slate-500 hover:border-white/15' : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
                  {m.label}
                </button>
              )
            })}
          </div>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Add a note or remark (optional)…"
            className="input-dark w-full resize-none mb-3" />
          {saveMsg && <p className={clsx('text-xs mb-3', saveMsg.includes('successfully') ? 'text-emerald-400' : 'text-red-400')}>{saveMsg}</p>}
          <button onClick={handleUpdate} disabled={saving}
            className="btn-accent w-full py-2.5 flex items-center justify-center gap-2">
            {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : <><CheckCircle2 size={14} />Update Status</>}
          </button>
        </div>
      )}

      {/* Timeline */}
      <div className={card}>
        <h2 className={clsx('text-sm font-bold uppercase tracking-widest mb-4', isDark ? 'text-slate-400' : 'text-slate-500')}>Problem History</h2>
        {updates.length === 0 ? (
          <p className={clsx('text-xs text-center py-4', isDark ? 'text-slate-600' : 'text-slate-400')}>No updates yet.</p>
        ) : (
          <div className="space-y-3">
            {updates.map((u, i) => {
              const m = STATUS_META[u.status as string] ?? STATUS_META.NEW
              return (
                <div key={u.id as string} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={clsx('w-2 h-2 rounded-full shrink-0 mt-1', isDark ? 'bg-slate-600' : 'bg-slate-300')} />
                    {i < updates.length - 1 && <div className={clsx('w-px flex-1 mt-1', isDark ? 'bg-white/8' : 'bg-slate-200')} />}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={clsx('text-xs font-bold', m.color)}>{m.label}</span>
                      <span className={clsx('text-[10px]', isDark ? 'text-slate-600' : 'text-slate-400')}>{fmtDate(u.createdAt as string)}</span>
                      <span className={clsx('text-[10px]', isDark ? 'text-slate-600' : 'text-slate-400')}>by {u.updatedBy as string}</span>
                    </div>
                    {(u.comment as string) && <p className={clsx('text-xs mt-1', isDark ? 'text-slate-400' : 'text-slate-600')}>{u.comment as string}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
