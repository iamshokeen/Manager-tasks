import { cn } from '@/lib/utils'

const CONFIG = {
  todo: { label: 'To Do', className: 'bg-[#1E2028] text-[#6B7280] border-[#1E2028]' },
  in_progress: { label: 'In Progress', className: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20' },
  review: { label: 'Review', className: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20' },
  done: { label: 'Done', className: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' },
  blocked: { label: 'Blocked', className: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = CONFIG[status as keyof typeof CONFIG] ?? CONFIG.todo
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', config.className)}>
      {config.label}
    </span>
  )
}
