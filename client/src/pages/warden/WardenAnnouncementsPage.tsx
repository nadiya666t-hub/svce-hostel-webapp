import { useState, useEffect, useCallback } from 'react'
import { Megaphone, Plus, Loader2, X, Trash2, Pencil } from 'lucide-react'
import { wardenService } from '@/services/wardenService'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

function fmt(iso:string){ return new Date(iso).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true}) }

export default function WardenAnnouncementsPage() {
  const { isDark } = useTheme()
  const [announcements,setAnnouncements]= useState<Record<string,unknown>[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId,   setEditId]   = useState<string|null>(null)
  const [title,    setTitle]    = useState('')
  const [message,  setMessage]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const load = useCallback(async()=>{
    setLoading(true)
    try { const r=await wardenService.getAnnouncements(); if(r.success) setAnnouncements(r.data) }
    finally { setLoading(false) }
  },[])

  useEffect(()=>{ load() },[load])

  function openCreate(){ setEditId(null); setTitle(''); setMessage(''); setError(''); setShowForm(true) }
  function openEdit(ann:Record<string,unknown>){ setEditId(ann.id as string); setTitle(ann.title as string); setMessage(ann.message as string); setError(''); setShowForm(true) }
  function closeForm(){ setShowForm(false); setEditId(null); setTitle(''); setMessage(''); setError('') }

  async function handleSave(e:React.FormEvent){
    e.preventDefault(); setError('')
    if(!title.trim()||!message.trim()){ setError('Title and message required.'); return }
    setSaving(true)
    try {
      if(editId){
        // For edit: delete old + create new (no edit endpoint — create fresh)
        await wardenService.deleteAnnouncement(editId)
      }
      const r=await wardenService.createAnnouncement({title:title.trim(),message:message.trim()})
      if(r.success){ closeForm(); load() } else setError(r.message??'Failed.')
    } catch(e2:unknown){ setError((e2 as {response?:{data?:{message?:string}}})?.response?.data?.message??'Failed.') }
    finally { setSaving(false) }
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',isDark?'bg-indigo-500/15 border border-indigo-500/20':'bg-indigo-50 border border-indigo-200')}>
            <Megaphone size={18} className={isDark?'text-indigo-400':'text-indigo-600'}/>
          </div>
          <div>
            <h1 className={clsx('text-2xl font-bold',isDark?'text-white':'text-slate-900')}>Announcements</h1>
            <p className={clsx('text-xs',isDark?'text-slate-400':'text-slate-500')}>Broadcast to all students</p>
          </div>
        </div>
        {!showForm && (
          <button onClick={openCreate} className="btn-accent text-sm px-4 py-2 flex items-center gap-1.5">
            <Plus size={15}/> New Announcement
          </button>
        )}
      </div>

      {showForm && (
        <div className={clsx('rounded-2xl border p-5 mb-5 animate-slide-down',isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={clsx('text-base font-bold',isDark?'text-white':'text-slate-900')}>{editId?'Edit Announcement':'New Announcement'}</h2>
            <button onClick={closeForm} className={clsx('p-1.5 rounded-lg',isDark?'text-slate-500 hover:text-slate-300':'text-slate-400 hover:text-slate-600')}><X size={16}/></button>
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="field-label">Title</label>
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Announcement title…" className="input-dark w-full"/>
            </div>
            <div>
              <label className="field-label">Message</label>
              <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={4} placeholder="Write your announcement…"
                className={clsx('w-full px-3 py-2.5 rounded-xl border text-sm resize-none outline-none transition-all',isDark?'bg-dark-800 border-white/8 text-slate-100 placeholder-slate-600 focus:border-accent-500':'bg-zinc-50 border-zinc-200 text-slate-900 placeholder-zinc-400 focus:border-accent-500')}/>
            </div>
            {!editId && (
              <div className={clsx('flex items-center gap-2 rounded-xl p-3 text-xs',isDark?'bg-accent-600/10 border border-accent-600/20 text-accent-300':'bg-blue-50 border border-blue-200 text-blue-700')}>
                <Megaphone size={13} className="shrink-0"/> This announcement will be sent to ALL active students as a notification.
              </div>
            )}
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-accent text-sm px-5 py-2.5 flex items-center gap-2 disabled:opacity-50">
                {saving?<Loader2 size={14} className="animate-spin"/>:<Megaphone size={14}/>} {editId?'Update':'Send to All Students'}
              </button>
              <button type="button" onClick={closeForm} className={clsx('px-4 py-2.5 rounded-xl border text-sm',isDark?'border-white/8 text-slate-300 hover:bg-dark-700':'border-slate-200 text-slate-600 hover:bg-slate-50')}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-indigo-400"/></div>
        : announcements.length===0 ? (
          <div className={clsx('rounded-2xl border p-12 text-center',isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200')}>
            <Megaphone size={36} className={clsx('mx-auto mb-3',isDark?'text-slate-700':'text-slate-300')}/>
            <p className={clsx('text-sm',isDark?'text-slate-500':'text-slate-400')}>No announcements yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map(a=>{
              const ann=a as Record<string,unknown>
              return (
                <div key={ann.id as string} className={clsx('rounded-2xl border p-5',isDark?'bg-dark-900 border-white/5':'bg-white border-slate-200 shadow-sm')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center shrink-0',isDark?'bg-indigo-500/15':'bg-indigo-50')}>
                          <Megaphone size={13} className={isDark?'text-indigo-400':'text-indigo-600'}/>
                        </div>
                        <p className={clsx('text-sm font-bold',isDark?'text-slate-100':'text-slate-900')}>{ann.title as string}</p>
                      </div>
                      <p className={clsx('text-sm mt-1 leading-relaxed',isDark?'text-slate-300':'text-slate-600')}>{ann.message as string}</p>
                      <p className={clsx('text-xs mt-2',isDark?'text-slate-600':'text-slate-400')}>Sent by {ann.createdBy as string} · {fmt(ann.createdAt as string)}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={()=>openEdit(ann)} className={clsx('p-2 rounded-xl transition-colors',isDark?'text-slate-600 hover:text-accent-400 hover:bg-accent-600/10':'text-slate-400 hover:text-accent-600 hover:bg-accent-50')}><Pencil size={14}/></button>
                      <button onClick={async()=>{ if(confirm('Remove?')){ await wardenService.deleteAnnouncement(ann.id as string); load() } }}
                        className={clsx('p-2 rounded-xl transition-colors',isDark?'text-slate-600 hover:text-red-400 hover:bg-red-500/10':'text-slate-400 hover:text-red-500 hover:bg-red-50')}><Trash2 size={14}/></button>
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
