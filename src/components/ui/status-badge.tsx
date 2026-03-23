import { cn } from '@/lib/utils'

const CONFIG = {
  todo: { label: 'To Do', className: 'bg-[var(--surface-container-high)] text-[var(--outline)] border-[var(--surface-container-high)]' },
  in_progress: { label: 'In Progress', className: 'bg-primary/10 text-primary border-primary/20' },
  review: { label: 'Review', className: 'bg-[var(--secondary-container)]/30 text-[var(--outline)] border-[var(--secondary-container)]/20' },
  done: { label: 'Done', className: 'bg-green-100 text-green-700 border-green-200' },
  blocked: { label: 'Blocked', className: 'bg-[var(--error-container)] text-[var(--on-error-container)] border-[var(--error-container)]' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = CONFIG[status as keyof typeof CONFIG] ?? CONFIG.todo
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', config.className)}>
      {config.label}
    </span>
  )
}
