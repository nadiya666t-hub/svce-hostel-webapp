import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={clsx(
        'relative flex items-center w-14 h-7 rounded-full border transition-all duration-300 shrink-0',
        isDark
          ? 'bg-accent-600/20 border-accent-600/40 hover:border-accent-500'
          : 'bg-zinc-100 border-zinc-300 hover:border-zinc-400',
        className,
      )}
    >
      {/* Track labels */}
      <Sun size={11} className={clsx('absolute left-1.5 transition-opacity duration-200', isDark ? 'opacity-30 text-zinc-400' : 'opacity-100 text-amber-500')} />
      <Moon size={11} className={clsx('absolute right-1.5 transition-opacity duration-200', isDark ? 'opacity-100 text-accent-400' : 'opacity-30 text-zinc-400')} />
      {/* Thumb */}
      <span
        className={clsx(
          'absolute w-5 h-5 rounded-full transition-all duration-300 shadow-sm flex items-center justify-center',
          isDark
            ? 'translate-x-[30px] bg-accent-500'
            : 'translate-x-[2px] bg-white'
        )}
      />
    </button>
  )
}
