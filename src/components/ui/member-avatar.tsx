import { cn } from '@/lib/utils'

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

const COLORS = [
  'bg-[#C9A84C]/20 text-[#C9A84C]',
  'bg-blue-500/20 text-blue-400',
  'bg-purple-500/20 text-purple-400',
  'bg-green-500/20 text-green-400',
  'bg-pink-500/20 text-pink-400',
]

export function MemberAvatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const colorIdx = name.charCodeAt(0) % COLORS.length
  const sizes = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-10 w-10 text-sm' }
  return (
    <div className={cn('rounded-full flex items-center justify-center font-semibold shrink-0', sizes[size], COLORS[colorIdx], className)}>
      {initials(name)}
    </div>
  )
}
