import { Settings } from 'lucide-react'

export default function StudentSettingsPage() {
  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <Settings size={20} className="text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
          <p className="text-sm text-slate-400">Account and app preferences</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-12 text-center">
        <Settings size={40} className="text-slate-200 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-600 mb-2">Coming Soon</h2>
        <p className="text-sm text-slate-400">Settings will be built in a later step.</p>
      </div>
    </div>
  )
}
