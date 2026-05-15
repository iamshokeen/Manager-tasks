// src/components/layout/mobile-bottom-nav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/',         label: 'Home',     icon: 'dashboard' },
  { href: '/tasks',    label: 'Tasks',    icon: 'checklist' },
  { href: '/projects', label: 'Projects', icon: 'folder_kanban' },
  { href: '/team',     label: 'Team',     icon: 'group' },
  { href: '/reports',  label: 'Reports',  icon: 'summarize' },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 print:hidden"
      style={{
        background: 'rgba(247,249,251,0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(169,180,185,0.2)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {NAV.map(({ href, label, icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[60px] transition-all duration-200"
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '22px',
                  color: active ? 'var(--primary)' : 'var(--outline)',
                }}
              >
                {icon}
              </span>
              <span
                className="text-[10px] font-semibold"
                style={{ color: active ? 'var(--primary)' : 'var(--outline)' }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
