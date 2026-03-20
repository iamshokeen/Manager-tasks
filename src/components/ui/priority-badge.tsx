import { cn } from '@/lib/utils'

const CONFIG = {
  critical: { label: 'Critical', className: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20' },
  high: { label: 'High', className: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20' },
  medium: { label: 'Medium', className: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20' },
  low: { label: 'Low', className: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' },
}

export function PriorityBadge({ priority }: { priority: string }) {
  const config = CONFIG[priority as keyof typeof CONFIG] ?? CONFIG.medium
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', config.className)}>
      {config.label}
    </span>
  )
}
