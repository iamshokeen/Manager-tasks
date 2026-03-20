import { cn } from '@/lib/utils'

const DEPT_COLORS: Record<string, string> = {
  Analytics: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Revenue: 'bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/20',
  OTA: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Marketing: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'Financial Modelling': 'bg-green-500/10 text-green-400 border-green-500/20',
  'Program Management': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

export function DepartmentBadge({ department, className }: { department: string; className?: string }) {
  const color = DEPT_COLORS[department] ?? 'bg-[#1E2028] text-[#6B7280] border-[#1E2028]'
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', color, className)}>
      {department}
    </span>
  )
}
