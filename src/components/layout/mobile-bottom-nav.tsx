// src/components/layout/mobile-bottom-nav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, CheckSquare, FolderKanban, Users, BarChart3 } from 'lucide-react'

const NAV = [
  { href: '/', label: 'Home', Icon: LayoutDashboard },
  { href: '/tasks', label: 'Tasks', Icon: CheckSquare },
  { href: '/projects', label: 'Projects', Icon: FolderKanban },
  { href: '/team', label: 'Team', Icon: Users },
  { href: '/metrics', label: 'Metrics', Icon: BarChart3 },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-[var(--outline-variant)]/20 shadow-[0_-8px_24px_rgba(0,74,198,0.06)] print:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[60px] transition-all duration-200',
                active ? 'text-primary' : 'text-[var(--outline)]'
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
              <span className={cn('text-[10px] font-semibold', active ? 'text-primary' : 'text-[var(--outline)]')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
