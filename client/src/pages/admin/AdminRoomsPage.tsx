import { useState, useEffect } from 'react'
import { Building2, Loader2, ChevronDown, ChevronUp, Users } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import api from '@/services/api'
import clsx from 'clsx'

interface Occupant { name: string; usn: string }
interface Room { id:string; roomNumber:string; capacity:number; occupied:number; available:number; occupants:Occupant[] }
interface Floor { id:string; floorNumber:string; floorName:string; rooms:Room[] }

export default function AdminRoomsPage() {
  const { isDark } = useTheme()
  const [floors,   setFloors]   = useState<Floor[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    api.get('/admin/floors-rooms')
      .then(r => { if (r.data.success) setFloors(r.data.data) })
      .finally(() => setLoading(false))
  }, [])

  const toggle = (id: string) => setExpanded(e => e === id ? null : id)

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', isDark?'bg-indigo-500/15 border border-indigo-500/20':'bg-indigo-50 border border-indigo-200')}>
          <Building2 size={18} className={isDark?'text-indigo-400':'text-indigo-600'} />
        </div>
        <div>
          <h1 className={clsx('text-2xl font-bold', isDark?'text-white':'text-slate-900')}>Rooms</h1>
          <p className={clsx('text-xs', isDark?'text-slate-400':'text-slate-500')}>Floor & room occupancy</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
      ) : floors.length === 0 ? (
        <div className={clsx('rounded-2xl border p-12 text-center', isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200')}>
          <Building2 size={36} className={clsx('mx-auto mb-3', isDark?'text-slate-700':'text-slate-300')} />
          <p className={clsx('text-sm', isDark?'text-slate-500':'text-slate-400')}>No floors/rooms found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {floors.map(floor => {
            const totalOccupied  = floor.rooms.reduce((s,r) => s + r.occupied, 0)
            const totalCapacity  = floor.rooms.reduce((s,r) => s + r.capacity, 0)
            const isOpen = expanded === floor.id
            return (
              <div key={floor.id} className={clsx('rounded-2xl border overflow-hidden', isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
                <button onClick={() => toggle(floor.id)}
                  className={clsx('w-full flex items-center justify-between p-5', isDark?'hover:bg-white/3':'hover:bg-slate-50')}>
                  <div className="flex items-center gap-3">
                    <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold',
                      isDark?'bg-indigo-500/20 text-indigo-400':'bg-indigo-100 text-indigo-700')}>{floor.floorNumber}</div>
                    <div className="text-left">
                      <p className={clsx('text-sm font-bold', isDark?'text-slate-200':'text-slate-800')}>{floor.floorName}</p>
                      <p className={clsx('text-xs', isDark?'text-slate-500':'text-slate-400')}>
                        {floor.rooms.length} rooms · {totalOccupied}/{totalCapacity} occupied
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      {floor.rooms.map(r => (
                        <div key={r.id} title={`Room ${r.roomNumber}: ${r.occupied}/${r.capacity}`}
                          className={clsx('w-2.5 h-2.5 rounded-sm',
                            r.available === 0 ? 'bg-red-500' : r.occupied > 0 ? 'bg-amber-500' : 'bg-emerald-500')} />
                      ))}
                    </div>
                    {isOpen ? <ChevronUp size={16} className={isDark?'text-slate-500':'text-slate-400'} />
                             : <ChevronDown size={16} className={isDark?'text-slate-500':'text-slate-400'} />}
                  </div>
                </button>

                {isOpen && (
                  <div className={clsx('border-t grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4',
                    isDark?'border-white/5 bg-dark-800':'border-slate-100 bg-slate-50')}>
                    {floor.rooms.map(r => (
                      <div key={r.id} className={clsx('rounded-xl border p-3',
                        r.available === 0
                          ? isDark?'bg-red-500/10 border-red-500/20':'bg-red-50 border-red-200'
                          : r.occupied > 0
                          ? isDark?'bg-amber-500/10 border-amber-500/20':'bg-amber-50 border-amber-200'
                          : isDark?'bg-emerald-500/10 border-emerald-500/20':'bg-emerald-50 border-emerald-200')}>
                        <p className={clsx('text-sm font-bold mb-1', isDark?'text-slate-200':'text-slate-800')}>Room {r.roomNumber}</p>
                        <div className="flex items-center gap-1 mb-2">
                          <Users size={11} className={isDark?'text-slate-500':'text-slate-400'} />
                          <span className={clsx('text-xs', isDark?'text-slate-400':'text-slate-500')}>{r.occupied}/{r.capacity}</span>
                        </div>
                        {r.occupants.length > 0 ? (
                          <div className="space-y-1">
                            {r.occupants.map(o => (
                              <p key={o.usn} className={clsx('text-[10px] truncate', isDark?'text-slate-400':'text-slate-600')}>{o.name}</p>
                            ))}
                          </div>
                        ) : (
                          <p className={clsx('text-[10px]', isDark?'text-slate-600':'text-slate-400')}>Vacant</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      {!loading && floors.length > 0 && (
        <div className="flex items-center gap-4 mt-4 justify-center">
          {[['bg-emerald-500','Vacant'],['bg-amber-500','Partial'],['bg-red-500','Full']].map(([c,l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className={clsx('w-2.5 h-2.5 rounded-sm', c)} />
              <span className={clsx('text-xs', isDark?'text-slate-500':'text-slate-400')}>{l}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
