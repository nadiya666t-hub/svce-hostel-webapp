import { useState, useEffect } from 'react'
import { ShieldCheck, Loader2, KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { useTheme } from '@/hooks/useTheme'
import api from '@/services/api'
import clsx from 'clsx'

export default function AdminProfilePage() {
  const { admin }    = useAdminAuth()
  const { isDark }   = useTheme()
  const [profile,   setProfile]  = useState<Record<string,unknown>|null>(null)
  const [loading,   setLoading]  = useState(true)
  const [showPw,    setShowPw]   = useState(false)
  const [showCur,   setShowCur]  = useState(false)
  const [showNew,   setShowNew]  = useState(false)
  const [showConf,  setShowConf] = useState(false)
  const [curPw,     setCurPw]    = useState('')
  const [newPw,     setNewPw]    = useState('')
  const [confPw,    setConfPw]   = useState('')
  const [pwMsg,     setPwMsg]    = useState<{type:'success'|'error';text:string}|null>(null)
  const [pwSaving,  setPwSaving] = useState(false)

  useEffect(() => {
    api.get('/admin/profile').then(r => {
      if (r.data.success) setProfile(r.data.data)
    }).catch(() => {
      // profile endpoint might not exist — set minimal data
      setProfile({ adminId: admin?.adminId, name: admin?.name, role: 'ADMIN' })
    }).finally(() => setLoading(false))
  }, [admin])

  async function handleChangePw(e: React.FormEvent) {
    e.preventDefault(); setPwMsg(null)
    if (newPw !== confPw) { setPwMsg({ type:'error', text:'New passwords do not match.' }); return }
    if (newPw.length < 8) { setPwMsg({ type:'error', text:'Password must be at least 8 characters.' }); return }
    setPwSaving(true)
    try {
      const r = await api.patch('/admin/profile/password', { currentPassword: curPw, newPassword: newPw })
      if (r.data.success) {
        setPwMsg({ type:'success', text:'Password changed successfully.' })
        setCurPw(''); setNewPw(''); setConfPw('')
      } else setPwMsg({ type:'error', text: r.data.message ?? 'Failed.' })
    } catch (e2: unknown) {
      setPwMsg({ type:'error', text: (e2 as {response?:{data?:{message?:string}}})?.response?.data?.message ?? 'Failed.' })
    } finally { setPwSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-violet-400"/></div>

  return (
    <div className="max-w-xl mx-auto animate-fade-in space-y-5">
      <div className="flex items-center gap-3">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', isDark?'bg-violet-500/15 border border-violet-500/20':'bg-violet-50 border border-violet-200')}>
          <ShieldCheck size={18} className={isDark?'text-violet-400':'text-violet-600'}/>
        </div>
        <h1 className={clsx('text-2xl font-bold', isDark?'text-white':'text-slate-900')}>Admin Profile</h1>
      </div>

      {/* Avatar */}
      <div className="bg-gradient-to-br from-violet-700 to-dark-800 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <ShieldCheck size={32} className="text-white/80"/>
          </div>
          <div>
            <h2 className="text-xl font-bold">{profile?.name as string ?? admin?.name ?? 'Admin'}</h2>
            <p className="text-violet-300 text-sm mt-0.5">System Administrator</p>
            <div className="flex items-center gap-1.5 mt-2">
              <ShieldCheck size={13} className="text-violet-300"/>
              <span className="text-xs text-violet-300 font-mono">{admin?.adminId}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className={clsx('rounded-2xl border p-5', isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
        {([
          ['Admin ID',    admin?.adminId],
          ['Name',        profile?.name ?? admin?.name],
          ['Role',        'ADMIN'],
          ['Last Login',  profile?.lastLoginAt ? new Date(profile.lastLoginAt as string).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true}) : '—'],
        ] as [string,unknown][]).filter(([,v]) => v && v !== '—').map(([l,v]) => (
          <div key={l} className={clsx('flex justify-between items-center py-3 border-b last:border-0', isDark?'border-white/5':'border-slate-100')}>
            <span className={clsx('text-sm', isDark?'text-slate-400':'text-slate-500')}>{l}</span>
            <span className={clsx('text-sm font-semibold', isDark?'text-slate-200':'text-slate-800')}>{String(v)}</span>
          </div>
        ))}
      </div>

      {/* Change password */}
      <div className={clsx('rounded-2xl border p-5', isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
        <button onClick={()=>setShowPw(v=>!v)} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className={isDark?'text-violet-400':'text-violet-600'}/>
            <span className={clsx('text-sm font-bold', isDark?'text-slate-200':'text-slate-800')}>Change Password</span>
          </div>
          <span className={clsx('text-xs', isDark?'text-slate-500':'text-slate-400')}>{showPw?'▲':'▼'}</span>
        </button>
        {showPw && (
          <form onSubmit={handleChangePw} className="mt-4 space-y-3">
            {pwMsg && (
              <div className={clsx('flex items-center gap-2 rounded-xl p-3 text-sm',
                pwMsg.type==='success'?'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400':'bg-red-500/10 border border-red-500/20 text-red-400')}>
                {pwMsg.type==='success'?<CheckCircle2 size={14}/>:<AlertCircle size={14}/>} {pwMsg.text}
              </div>
            )}
            {([
              ['Current Password', curPw, setCurPw, showCur, setShowCur],
              ['New Password',     newPw, setNewPw, showNew, setShowNew],
              ['Confirm Password', confPw,setConfPw,showConf,setShowConf],
            ] as [string, string, (v:string)=>void, boolean, (v:boolean)=>void][]).map(([l,v,fn,show,setShow]) => (
              <div key={l}>
                <label className="field-label">{l}</label>
                <div className="relative">
                  <input type={show?'text':'password'} value={v} onChange={e=>fn(e.target.value)} placeholder={l} className="input-dark w-full pr-10"/>
                  <button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                    {show ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>
            ))}
            <button type="submit" disabled={pwSaving} className="btn-accent text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-50">
              {pwSaving?<Loader2 size={13} className="animate-spin"/>:<KeyRound size={13}/>} Change Password
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
