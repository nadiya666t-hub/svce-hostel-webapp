import { useState, useEffect, useCallback } from 'react'
import { Bell, Plus, Loader2, X, Trash2, Users, User, ShieldCheck, Eye } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import api from '@/services/api'
import clsx from 'clsx'

const PRIORITY_META: Record<string,{label:string;color:string}> = {
  LOW:    { label:'Low',    color:'text-slate-400' },
  MEDIUM: { label:'Medium', color:'text-blue-400'  },
  HIGH:   { label:'High',   color:'text-amber-400' },
  URGENT: { label:'Urgent', color:'text-red-400'   },
}
const fmt = (iso:string) => new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})

interface Notice { id:string; title:string; description:string; category:string; priority:string; createdAt:string }
interface StaffMember { id:string; name:string; usn:string; role:string }
interface Student { id:string; name:string; usn:string }

type TargetType = 'all_students' | 'student' | 'warden' | 'watchman' | 'overseer'

export default function AdminNoticesPage() {
  const { isDark } = useTheme()
  const [notices,   setNotices]   = useState<Notice[]>([])
  const [students,  setStudents]  = useState<Student[]>([])
  const [wardens,   setWardens]   = useState<StaffMember[]>([])
  const [watchmen,  setWatchmen]  = useState<StaffMember[]>([])
  const [overseers, setOverseers] = useState<StaffMember[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [title,     setTitle]     = useState('')
  const [desc,      setDesc]      = useState('')
  const [cat,       setCat]       = useState('General')
  const [prio,      setPrio]      = useState('MEDIUM')
  const [target,    setTarget]    = useState<TargetType>('all_students')
  const [targetId,  setTargetId]  = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/admin/notices'); if (r.data.success) setNotices(r.data.data) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    // Load students and staff for targeting
    api.get('/admin/students?limit=200').then(r => { if (r.data.success) setStudents(r.data.data.students ?? []) }).catch(() => {})
    api.get('/admin/staff').then(r => {
      if (r.data.success) {
        setWardens(r.data.data.wardens ?? [])
        setWatchmen(r.data.data.watchmen ?? [])
        setOverseers(r.data.data.overseers ?? [])
      }
    }).catch(() => {})
  }, [load])

  function openCreate() { setTitle(''); setDesc(''); setCat('General'); setPrio('MEDIUM'); setTarget('all_students'); setTargetId(''); setError(''); setShowForm(true) }
  function closeForm()  { setShowForm(false); setError('') }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!title.trim() || !desc.trim()) { setError('Title and description required.'); return }
    if (target !== 'all_students' && !targetId) { setError('Please select a recipient.'); return }
    setSaving(true)
    try {
      const payload: Record<string,string> = { title: title.trim(), description: desc.trim(), category: cat, priority: prio }
      if (target === 'student')  payload.targetStudentId = targetId
      // For staff targets, we send a notification directly to that staff member's student notifications
      // (notices are stored globally; staff see them via their portals)
      const r = await api.post('/admin/notices', payload)
      if (r.data.success) { closeForm(); load() } else setError(r.data.message ?? 'Failed.')
    } catch (e2: unknown) {
      setError((e2 as {response?:{data?:{message?:string}}})?.response?.data?.message ?? 'Failed.')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this notice?')) return
    await api.delete(`/admin/notices/${id}`)
    load()
  }

  const TARGET_OPTIONS: { value: TargetType; label: string; icon: React.ElementType; color: string }[] = [
    { value: 'all_students', label: 'All Students',  icon: Users,      color: isDark?'bg-violet-500/20 border-violet-500/40 text-violet-300':'bg-violet-50 border-violet-300 text-violet-700' },
    { value: 'student',      label: 'One Student',   icon: User,       color: isDark?'bg-blue-500/20 border-blue-500/40 text-blue-300':'bg-blue-50 border-blue-300 text-blue-700' },
    { value: 'warden',       label: 'Warden',        icon: ShieldCheck,color: isDark?'bg-emerald-500/20 border-emerald-500/40 text-emerald-300':'bg-emerald-50 border-emerald-300 text-emerald-700' },
    { value: 'watchman',     label: 'Watchman',      icon: Eye,        color: isDark?'bg-teal-500/20 border-teal-500/40 text-teal-300':'bg-teal-50 border-teal-300 text-teal-700' },
    { value: 'overseer',     label: 'Overseer',      icon: ShieldCheck,color: isDark?'bg-orange-500/20 border-orange-500/40 text-orange-300':'bg-orange-50 border-orange-300 text-orange-700' },
  ]

  const currentList: {id:string; name:string; usn:string}[] =
    target === 'student'  ? students :
    target === 'warden'   ? wardens  :
    target === 'watchman' ? watchmen :
    target === 'overseer' ? overseers : []

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', isDark?'bg-amber-500/15 border border-amber-500/20':'bg-amber-50 border border-amber-200')}>
            <Bell size={18} className={isDark?'text-amber-400':'text-amber-600'}/>
          </div>
          <div>
            <h1 className={clsx('text-2xl font-bold', isDark?'text-white':'text-slate-900')}>Notices</h1>
            <p className={clsx('text-xs', isDark?'text-slate-400':'text-slate-500')}>Send notices to students, wardens, watchmen or overseers</p>
          </div>
        </div>
        {!showForm && <button onClick={openCreate} className="btn-accent text-sm px-4 py-2 flex items-center gap-1.5"><Plus size={15}/> New Notice</button>}
      </div>

      {showForm && (
        <div className={clsx('rounded-2xl border p-5 mb-5 animate-slide-down', isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={clsx('text-base font-bold', isDark?'text-white':'text-slate-900')}>New Notice</h2>
            <button onClick={closeForm} className={clsx('p-1.5 rounded-lg', isDark?'text-slate-500 hover:text-slate-300':'text-slate-400 hover:text-slate-600')}><X size={16}/></button>
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="field-label">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notice title…" className="input-dark w-full"/>
            </div>
            <div>
              <label className="field-label">Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} placeholder="Notice content…"
                className={clsx('w-full px-3 py-2.5 rounded-xl border text-sm resize-none outline-none',
                  isDark?'bg-dark-800 border-white/8 text-slate-100 placeholder-slate-600 focus:border-accent-500':'bg-zinc-50 border-zinc-200 text-slate-900 placeholder-zinc-400 focus:border-accent-500')}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Category</label>
                <select value={cat} onChange={e => setCat(e.target.value)} className="input-dark w-full">
                  {['General','Fees','Events','Maintenance','Rules','Other'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Priority</label>
                <select value={prio} onChange={e => setPrio(e.target.value)} className="input-dark w-full">
                  {Object.entries(PRIORITY_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            {/* Target selection */}
            <div>
              <label className="field-label">Send To</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {TARGET_OPTIONS.map(opt => {
                  const Icon = opt.icon
                  const active = target === opt.value
                  return (
                    <button key={opt.value} type="button" onClick={() => { setTarget(opt.value); setTargetId('') }}
                      className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all',
                        active ? opt.color : isDark?'border-white/8 text-slate-400 hover:border-white/15':'border-slate-200 text-slate-500 hover:border-slate-300')}>
                      <Icon size={12}/> {opt.label}
                    </button>
                  )
                })}
              </div>

              {target === 'all_students' && (
                <p className={clsx('text-xs', isDark?'text-slate-500':'text-slate-400')}>
                  This notice will be sent to all <strong>{students.length}</strong> active students.
                </p>
              )}

              {target !== 'all_students' && currentList.length > 0 && (
                <select value={targetId} onChange={e => setTargetId(e.target.value)} className="input-dark w-full">
                  <option value="">— Select {TARGET_OPTIONS.find(o=>o.value===target)?.label} —</option>
                  {currentList.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.usn})</option>
                  ))}
                </select>
              )}

              {target !== 'all_students' && currentList.length === 0 && (
                <p className={clsx('text-xs', isDark?'text-slate-500':'text-slate-400')}>No {target}s found in the system.</p>
              )}
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-accent text-sm px-5 py-2.5 flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin"/> : <Bell size={14}/>} Publish
              </button>
              <button type="button" onClick={closeForm} className={clsx('px-4 py-2.5 rounded-xl border text-sm', isDark?'border-white/8 text-slate-300 hover:bg-dark-700':'border-slate-200 text-slate-600 hover:bg-slate-50')}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-amber-400"/></div>
      ) : notices.length === 0 ? (
        <div className={clsx('rounded-2xl border p-12 text-center', isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200')}>
          <Bell size={36} className={clsx('mx-auto mb-3', isDark?'text-slate-700':'text-slate-300')}/>
          <p className={clsx('text-sm', isDark?'text-slate-500':'text-slate-400')}>No notices yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map(n => {
            const pMeta = PRIORITY_META[n.priority] ?? PRIORITY_META.MEDIUM
            return (
              <div key={n.id} className={clsx('rounded-2xl border p-5', isDark?'bg-dark-900 border-white/5':'bg-white border-slate-200 shadow-sm')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={clsx('text-sm font-bold', isDark?'text-slate-100':'text-slate-900')}>{n.title}</p>
                      <span className={clsx('text-xs font-semibold', pMeta.color)}>{pMeta.label}</span>
                      <span className={clsx('text-xs', isDark?'text-slate-600':'text-slate-400')}>{n.category}</span>
                    </div>
                    <p className={clsx('text-sm leading-relaxed', isDark?'text-slate-300':'text-slate-600')}>{n.description}</p>
                    <p className={clsx('text-xs mt-2', isDark?'text-slate-600':'text-slate-400')}>{fmt(n.createdAt)}</p>
                  </div>
                  <button onClick={() => handleDelete(n.id)}
                    className={clsx('p-2 rounded-xl shrink-0', isDark?'text-slate-600 hover:text-red-400 hover:bg-red-500/10':'text-slate-400 hover:text-red-500 hover:bg-red-50')}>
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
