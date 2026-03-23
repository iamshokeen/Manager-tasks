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
    <div className={cn('bg-white rounded-xl p-5 shadow-[0_20px_40px_rgba(0,74,198,0.06)] hover:-translate-y-0.5 transition-all', className)}>
      <div className="text-xs text-[var(--outline)] uppercase tracking-wider mb-2">{label}</div>
      <div className={cn('text-2xl font-bold text-foreground', accentColor)}>{value}</div>
      {sub && <div className="text-xs text-[var(--outline)] mt-1">{sub}</div>}
    </div>
  )
}
