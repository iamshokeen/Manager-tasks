// src/components/layout/mobile-bottom-nav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Icon names MUST be single-word ligatures present in the Material Symbols
// Outlined variable font. Underscored names like `folder_kanban` can render
// only their first word as a glyph and leak the rest as raw text — which
// blows up the tab layout. Stick to single-word icons here.
const NAV = [
  { href: '/',         label: 'Home',     icon: 'dashboard' },
  { href: '/tasks',    label: 'Tasks',    icon: 'checklist' },
  { href: '/projects', label: 'Projects', icon: 'folder' },
  { href: '/team',     label: 'Team',     icon: 'group' },
  { href: '/reports',  label: 'Reports',  icon: 'summarize' },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 print:hidden"
      style={{
        background: 'color-mix(in srgb, var(--surface) 95%, transparent)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--outline-variant)',
      }}
    >
      <div className="flex items-stretch justify-around px-1 py-2">
        {NAV.map(({ href, label, icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 min-w-0 flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-xl transition-all duration-200"
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
