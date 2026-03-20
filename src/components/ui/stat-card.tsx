import { cn } from '@/lib/utils'

export function StatCard({ label, value, sub, accent, className }: {
  label: string
  value: string | number
  sub?: string
  accent?: 'gold' | 'red' | 'green' | 'blue'
  className?: string
}) {
  const accentColor = {
    gold: 'text-[#C9A84C]',
    red: 'text-[#EF4444]',
    green: 'text-[#10B981]',
    blue: 'text-[#3B82F6]',
  }[accent ?? 'gold']

  return (
    <div className={cn('bg-card border border-border rounded-lg p-4', className)}>
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
      <div className={cn('text-2xl font-bold font-mono', accentColor)}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  )
}
