import { cn } from '@/lib/utils'

export function StatCard({ label, value, sub, accent, className }: {
  label: string
  value: string | number
  sub?: string
  accent?: 'gold' | 'red' | 'green' | 'blue'
  className?: string
}) {
  const accentStyles: Record<string, React.CSSProperties> = {
    gold:  { color: 'var(--tertiary)' },
    red:   { color: 'var(--error)' },
    green: { color: '#16a34a' },
    blue:  { color: 'var(--primary)' },
  }
  const accentStyle = accentStyles[accent ?? 'blue']

  return (
    <div
      className={cn('rounded-xl p-5 transition-all', className)}
      style={{ background: 'var(--surface-container-lowest)', boxShadow: 'var(--shadow-card)' }}
    >
      <div
        className="text-xs font-bold uppercase tracking-widest mb-1"
        style={{ color: 'var(--on-surface-variant)' }}
      >
        {label}
      </div>
      <div
        className="font-headline text-3xl font-extrabold"
        style={{ color: 'var(--on-surface)', ...accentStyle }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-1" style={{ color: 'var(--outline)' }}>{sub}</div>
      )}
    </div>
  )
}
