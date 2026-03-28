// src/components/ui/kairos-logo.tsx
// Geometric K mark — built from the Kairos brand bible reference
import { cn } from '@/lib/utils'

interface KairosMarkProps {
  size?: number
  className?: string
  color?: string
}

/** The K lettermark — use for icon/favicon contexts */
export function KairosMark({ size = 32, className, color = '#c9a96e' }: KairosMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Kairos"
    >
      {/* Vertical stem */}
      <rect x="18" y="12" width="11" height="76" fill={color} />
      {/* Upper arm — diagonal going upper-right */}
      <polygon
        points="29,50 29,44 74,12 82,12 82,18 35,50"
        fill={color}
      />
      {/* Lower arm — diagonal going lower-right */}
      <polygon
        points="29,50 35,50 82,82 82,88 74,88 29,56"
        fill={color}
      />
      {/* Junction accent — small notch at the K pivot */}
      <rect x="29" y="47" width="8" height="6" fill={color} />
    </svg>
  )
}

interface KairosWordmarkProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showTagline?: boolean
}

/** The K mark + KAIROS wordmark — use for sidebar/login headers */
export function KairosWordmark({ size = 'md', className, showTagline = false }: KairosWordmarkProps) {
  const markSize = size === 'sm' ? 24 : size === 'md' ? 32 : 44
  const titleClass = size === 'sm'
    ? 'text-base font-bold tracking-[0.2em]'
    : size === 'md'
    ? 'text-xl font-bold tracking-[0.25em]'
    : 'text-3xl font-bold tracking-[0.3em]'

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <KairosMark size={markSize} />
      <div className="flex flex-col">
        <span
          className={cn(titleClass, 'text-[#c9a96e] font-subhead uppercase')}
        >
          Kairos
        </span>
        {showTagline && (
          <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--outline)] font-medium mt-0.5">
            Know the moment. Own the purpose.
          </span>
        )}
      </div>
    </div>
  )
}
