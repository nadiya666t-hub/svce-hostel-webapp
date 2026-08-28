/**
 * Clean SVG illustrations for each problem category.
 * Designed to be immediately recognisable, consistent in size and style.
 */
import clsx from 'clsx'

interface Props {
  category: string
  size?: number
  className?: string
}

export default function ProblemCategoryIcon({ category, size = 32, className }: Props) {
  const s = size
  const base = clsx('shrink-0', className)

  switch (category) {
    case 'NO_WATER':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className={base}>
          {/* Tap body */}
          <rect x="15" y="18" width="14" height="10" rx="2.5" fill="currentColor" opacity="0.85"/>
          {/* Tap spout */}
          <rect x="22" y="28" width="4" height="7" rx="1.5" fill="currentColor" opacity="0.85"/>
          {/* Tap handle */}
          <rect x="10" y="20" width="7" height="3" rx="1.5" fill="currentColor" opacity="0.7"/>
          <rect x="8" y="17" width="3" height="9" rx="1.5" fill="currentColor" opacity="0.7"/>
          {/* Water drops */}
          <ellipse cx="24" cy="37" rx="2" ry="2.5" fill="#60a5fa" opacity="0.9"/>
          <ellipse cx="28" cy="35" rx="1.5" ry="2" fill="#93c5fd" opacity="0.7"/>
          {/* X mark — no water */}
          <circle cx="30" cy="10" r="8" fill="#ef4444" opacity="0.15"/>
          <line x1="27" y1="7" x2="33" y2="13" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
          <line x1="33" y1="7" x2="27" y2="13" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )

    case 'ELECTRICITY':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className={base}>
          {/* Plug body */}
          <rect x="13" y="22" width="14" height="12" rx="3" fill="currentColor" opacity="0.8"/>
          {/* Plug prongs */}
          <rect x="17" y="27" width="3" height="5" rx="1" fill="#fbbf24"/>
          <rect x="22" y="27" width="3" height="5" rx="1" fill="#fbbf24"/>
          {/* Plug cord */}
          <path d="M20 34 Q20 38 20 38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
          {/* Lightning bolt */}
          <path d="M22 4 L15 16 H20 L17 24 L27 11 H22 Z" fill="#fbbf24" opacity="0.95"/>
          {/* Glow */}
          <circle cx="21" cy="14" r="9" fill="#fbbf24" opacity="0.08"/>
        </svg>
      )

    case 'CLEANING':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className={base}>
          {/* Mop handle */}
          <rect x="19" y="4" width="3" height="22" rx="1.5" fill="currentColor" opacity="0.7" transform="rotate(8 19 4)"/>
          {/* Mop head */}
          <ellipse cx="18" cy="28" rx="9" ry="4" fill="currentColor" opacity="0.5" transform="rotate(8 18 28)"/>
          {/* Mop strands */}
          <line x1="11" y1="27" x2="9" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
          <line x1="14" y1="29" x2="13" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
          <line x1="17" y1="30" x2="17" y2="39" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
          <line x1="20" y1="30" x2="21" y2="39" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
          <line x1="23" y1="29" x2="25" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
          {/* Bubbles */}
          <circle cx="30" cy="12" r="3" fill="#60a5fa" opacity="0.5"/>
          <circle cx="34" cy="18" r="2" fill="#93c5fd" opacity="0.4"/>
          <circle cx="32" cy="6" r="1.5" fill="#bfdbfe" opacity="0.4"/>
        </svg>
      )

    case 'PLUMBING':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className={base}>
          {/* Wrench */}
          <path d="M28 4 C32 4 36 8 34 13 L18 29 L12 36 C10 38 7 36 9 34 L16 27 L32 11 C34 9 34 5 28 4 Z"
                fill="currentColor" opacity="0.8"/>
          <circle cx="11" cy="35" r="3" fill="currentColor" opacity="0.5"/>
          {/* Pipe horizontal */}
          <rect x="4" y="17" width="16" height="5" rx="2" fill="currentColor" opacity="0.5"/>
          {/* Pipe vertical */}
          <rect x="7" y="4" width="5" height="16" rx="2" fill="currentColor" opacity="0.5"/>
          {/* Elbow connector */}
          <circle cx="9.5" cy="19" r="3.5" fill="currentColor" opacity="0.6"/>
          {/* Water drop hint */}
          <ellipse cx="20" cy="36" rx="2" ry="2.5" fill="#60a5fa" opacity="0.7"/>
        </svg>
      )

    case 'FURNITURE':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className={base}>
          {/* Chair seat */}
          <rect x="8" y="20" width="24" height="5" rx="2" fill="currentColor" opacity="0.85"/>
          {/* Chair back */}
          <rect x="8" y="8" width="5" height="14" rx="2" fill="currentColor" opacity="0.7"/>
          <rect x="27" y="8" width="5" height="14" rx="2" fill="currentColor" opacity="0.7"/>
          <rect x="8" y="8" width="24" height="5" rx="2" fill="currentColor" opacity="0.6"/>
          {/* Chair legs */}
          <rect x="10" y="25" width="4" height="11" rx="2" fill="currentColor" opacity="0.6"/>
          <rect x="26" y="25" width="4" height="11" rx="2" fill="currentColor" opacity="0.6"/>
          {/* Warning triangle */}
          <path d="M30 4 L36 14 L24 14 Z" fill="#f59e0b" opacity="0.9"/>
          <rect x="29.5" y="7" width="1.5" height="4" rx="0.75" fill="white"/>
          <circle cx="30.25" cy="12.5" r="0.75" fill="white"/>
        </svg>
      )

    case 'WIFI':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className={base}>
          {/* Wifi arcs */}
          <path d="M6 16 Q20 4 34 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.4"/>
          <path d="M10 21 Q20 12 30 21" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6"/>
          <path d="M14 26 Q20 20 26 26" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8"/>
          {/* Dot */}
          <circle cx="20" cy="32" r="3" fill="currentColor"/>
          {/* X mark — no wifi */}
          <circle cx="31" cy="9" r="8" fill="#ef4444" opacity="0.12"/>
          <line x1="28" y1="6" x2="34" y2="12" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="34" y1="6" x2="28" y2="12" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      )

    case 'OTHER':
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className={base}>
          {/* Gear / settings */}
          <circle cx="20" cy="20" r="7" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.8"/>
          <circle cx="20" cy="20" r="3" fill="currentColor" opacity="0.7"/>
          {/* Gear teeth */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
            const rad = (angle * Math.PI) / 180
            const x1 = 20 + 9 * Math.cos(rad)
            const y1 = 20 + 9 * Math.sin(rad)
            const x2 = 20 + 13 * Math.cos(rad)
            const y2 = 20 + 13 * Math.sin(rad)
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.7"/>
          })}
          {/* Alert dot */}
          <circle cx="31" cy="9" r="6" fill="#f59e0b" opacity="0.9"/>
          <rect x="30.25" y="6" width="1.5" height="3.5" rx="0.75" fill="white"/>
          <circle cx="31" cy="11" r="0.75" fill="white"/>
        </svg>
      )
  }
}
