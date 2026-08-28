import { useState, useEffect, useCallback } from 'react'
import { Bell, Plus, Loader2, X, Pencil, Trash2 } from 'lucide-react'
import { wardenService } from '@/services/wardenService'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

const PRIORITY_META: Record<string,{label:string;color:string}> = {
  LOW:    {label:'Low',    color:'text-slate-400'},
  MEDIUM: {label:'Medium', color:'text-blue-400'},
  HIGH:   {label:'High',   color:'text-amber-400'},
  URGENT: {label:'Urgent', color:'text-red-400'},
}
function fmt(iso:string){ return new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) }

export default function WardenNoticesPage() {
  const { isDark } = useTheme()
  const [notices, setNotices] = useState<Record<string,unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm,setShowForm]= useState(false)
  const [editId,  setEditId]  = useState<string|null>(null)
  const [title,   setTitle]   = useState('')
  const [desc,    setDesc]    = useState('')
  const [cat,     setCat]     = useState('General')
  const [prio,    setPrio]    = useState('MEDIUM')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const load = useCallback(async()=>{
    setLoading(true)
    try{ const r=await wardenService.getNotices(); if(r.success) setNotices(r.data) }
    finally{ setLoading(false) }
  },[])

  useEffect(()=>{ load() },[load])

  function openCreate(){ setEditId(null); setTitle(''); setDesc(''); setCat('General'); setPrio('MEDIUM'); setError(''); setShowForm(true) }
  function openEdit(n:Record<string,unknown>){ setEditId(n.id as string); setTitle(n.title as string); setDesc(n.description as string); setCat(n.category as string); setPrio(n.priority as string); setError(''); setShowForm(true) }
  function closeForm(){ setShowForm(false); setEditId(null); setTitle(''); setDesc(''); setError('') }

  async function handleSave(e:React.FormEvent){
    e.preventDefault(); setError('')
    if(!title.trim()||!desc.trim()){ setError('Title and description required.'); return }
    setSaving(true)
    try {
      const data={title:title.trim(),description:desc.trim(),category:cat,priority:prio}
      const r = editId ? await wardenService.updateNotice(editId,data) : await wardenService.createNotice(data)
      if(r.success){ closeForm(); load() } else setError(r.message??'Failed.')
    } catch(e2:unknown){ setError((e2 as {response?:{data?:{message?:string}}})?.response?.data?.message??'Failed.') }
    finally{ setSaving(false) }
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',isDark?'bg-amber-500/15 border border-amber-500/20':'bg-amber-50 border border-amber-200')}>
            <Bell size={18} className={isDark?'text-amber-400':'text-amber-600'}/>
          </div>
          <div>
            <h1 className={clsx('text-2xl font-bold',isDark?'text-white':'text-slate-900')}>Notices</h1>
            <p className={clsx('text-xs',isDark?'text-slate-400':'text-slate-500')}>Manage hostel notices</p>
          </div>
        </div>
        {!showForm && <button onClick={openCreate} className="btn-accent text-sm px-4 py-2 flex items-center gap-1.5"><Plus size={15}/> New Notice</button>}
      </div>

      {showForm && (
        <div className={clsx('rounded-2xl border p-5 mb-5 animate-slide-down',isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={clsx('text-base font-bold',isDark?'text-white':'text-slate-900')}>{editId?'Edit Notice':'New Notice'}</h2>
            <button onClick={closeForm} className={clsx('p-1.5 rounded-lg',isDark?'text-slate-500 hover:text-slate-300':'text-slate-400 hover:text-slate-600')}><X size={16}/></button>
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="field-label">Title</label>
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Notice title…" className="input-dark w-full"/>
            </div>
            <div>
              <label className="field-label">Description</label>
              <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={4} placeholder="Notice content…"
                className={clsx('w-full px-3 py-2.5 rounded-xl border text-sm resize-none outline-none',isDark?'bg-dark-800 border-white/8 text-slate-100 placeholder-slate-600 focus:border-accent-500':'bg-zinc-50 border-zinc-200 text-slate-900 placeholder-zinc-400 focus:border-accent-500')}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Category</label>
                <select value={cat} onChange={e=>setCat(e.target.value)} className="input-dark w-full">
                  {['General','Fees','Events','Maintenance','Rules','Other'].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Priority</label>
                <select value={prio} onChange={e=>setPrio(e.target.value)} className="input-dark w-full">
                  {Object.entries(PRIORITY_META).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-accent text-sm px-5 py-2.5 flex items-center gap-2 disabled:opacity-50">
                {saving?<Loader2 size={14} className="animate-spin"/>:<Bell size={14}/>} {editId?'Update':'Publish'}
              </button>
              <button type="button" onClick={closeForm} className={clsx('px-4 py-2.5 rounded-xl border text-sm',isDark?'border-white/8 text-slate-300 hover:bg-dark-700':'border-slate-200 text-slate-600 hover:bg-slate-50')}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-amber-400"/></div>
        : notices.length===0 ? (
          <div className={clsx('rounded-2xl border p-12 text-center',isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200')}>
            <Bell size={36} className={clsx('mx-auto mb-3',isDark?'text-slate-700':'text-slate-300')}/>
            <p className={clsx('text-sm',isDark?'text-slate-500':'text-slate-400')}>No notices yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notices.map(n=>{
              const notice=n as Record<string,unknown>
              const pMeta=PRIORITY_META[notice.priority as string]??PRIORITY_META.MEDIUM
              return (
                <div key={notice.id as string} className={clsx('rounded-2xl border p-5',isDark?'bg-dark-900 border-white/5':'bg-white border-slate-200 shadow-sm')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={clsx('text-sm font-bold',isDark?'text-slate-100':'text-slate-900')}>{notice.title as string}</p>
                        <span className={clsx('text-xs font-semibold',pMeta.color)}>{pMeta.label}</span>
                        <span className={clsx('text-xs',isDark?'text-slate-600':'text-slate-400')}>{notice.category as string}</span>
                      </div>
                      <p className={clsx('text-sm leading-relaxed',isDark?'text-slate-300':'text-slate-600')}>{notice.description as string}</p>
                      <p className={clsx('text-xs mt-2',isDark?'text-slate-600':'text-slate-400')}>{fmt(notice.createdAt as string)}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={()=>openEdit(notice)} className={clsx('p-2 rounded-xl',isDark?'text-slate-600 hover:text-accent-400 hover:bg-accent-600/10':'text-slate-400 hover:text-accent-600 hover:bg-accent-50')}><Pencil size={14}/></button>
                      <button onClick={async()=>{ if(confirm('Delete notice?')){ await wardenService.deleteNotice(notice.id as string); load() } }}
                        className={clsx('p-2 rounded-xl',isDark?'text-slate-600 hover:text-red-400 hover:bg-red-500/10':'text-slate-400 hover:text-red-500 hover:bg-red-50')}><Trash2 size={14}/></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}
