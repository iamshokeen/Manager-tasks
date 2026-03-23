import { cn } from '@/lib/utils'

const CONFIG = {
  critical: { label: 'Critical', className: 'bg-red-50 text-red-700 border-red-200' },
  high: { label: 'High', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  medium: { label: 'Medium', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  low: { label: 'Low', className: 'bg-green-50 text-green-700 border-green-200' },
}

export function PriorityBadge({ priority }: { priority: string }) {
  const config = CONFIG[priority as keyof typeof CONFIG] ?? CONFIG.medium
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', config.className)}>
      {config.label}
    </span>
  )
}
