import { Settings } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import ThemeToggle from '@/components/ui/ThemeToggle'
import clsx from 'clsx'

export default function StudentSettingsPage() {
  const { isDark } = useTheme()
  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',
          isDark ? 'bg-dark-800 border border-white/8' : 'bg-zinc-100 border border-zinc-200')}>
          <Settings size={18} className={isDark ? 'text-zinc-400' : 'text-zinc-500'} />
        </div>
        <div>
          <h1 className={clsx('text-2xl font-bold font-display', isDark ? 'text-white' : 'text-zinc-900')}>Settings</h1>
          <p className={clsx('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>Account and app preferences</p>
        </div>
      </div>

      {/* Theme section */}
      <div className={clsx('rounded-2xl border p-5 mb-4', isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-zinc-200')}>
        <div className="flex items-center justify-between">
          <div>
            <p className={clsx('text-sm font-semibold', isDark ? 'text-zinc-200' : 'text-zinc-800')}>Appearance</p>
            <p className={clsx('text-xs mt-0.5', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              Switch between dark and light mode
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className={clsx('rounded-2xl border p-12 text-center', isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-zinc-200')}>
        <Settings size={36} className={clsx('mx-auto mb-3', isDark ? 'text-zinc-700' : 'text-zinc-300')} />
        <p className={clsx('text-sm font-semibold', isDark ? 'text-zinc-500' : 'text-zinc-500')}>More settings coming soon</p>
      </div>
    </div>
  )
}
