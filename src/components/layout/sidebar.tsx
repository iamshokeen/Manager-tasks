// src/components/layout/sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { group: 'Overview', items: [{ href: '/', label: 'Dashboard', icon: '⬡' }] },
  {
    group: 'Work',
    items: [
      { href: '/projects', label: 'Projects', icon: '◈' },
      { href: '/tasks', label: 'Tasks', icon: '◇' },
      { href: '/my-tasks', label: 'My Tasks', icon: '★' },
      { href: '/cadence', label: 'Cadence', icon: '○' },
    ],
  },
  {
    group: 'People',
    items: [
      { href: '/team', label: 'Team', icon: '▣' },
      { href: '/one-on-ones', label: '1:1s', icon: '◉' },
      { href: '/stakeholders', label: 'Stakeholders', icon: '◆' },
    ],
  },
  {
    group: 'Assessment',
    items: [
      { href: '/metrics', label: 'Metrics', icon: '▲' },
      { href: '/assessment/ota', label: 'OTA Assessment', icon: '◎' },
      { href: '/assessment/checkin', label: 'Check-in GMV', icon: '◑' },
    ],
  },
  {
    group: 'Reports',
    items: [{ href: '/reports', label: 'Reports', icon: '📊' }],
  },
  {
    group: 'Reference',
    items: [
      { href: '/playbook', label: 'Playbook', icon: '≡' },
      { href: '/settings', label: 'Settings', icon: '⚙' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] border-r border-border bg-[#0D0E13] flex flex-col z-40 print:hidden">
      <div className="px-4 py-4 border-b border-border">
        <div className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-gold)' }}>
          Lohono <span className="text-muted-foreground font-normal">CMD</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map(({ group, items }) => (
          <div key={group}>
            <div className="px-4 py-2 text-[10px] font-semibold tracking-widest text-[#3a3d47] uppercase">
              {group}
            </div>
            {items.map(({ href, label, icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 px-4 py-2 text-[13px] border-l-2 transition-all',
                    active
                      ? 'border-l-[var(--color-gold)] bg-[rgba(201,168,76,0.05)]'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-white/[0.02]'
                  )}
                  style={active ? { color: 'var(--color-gold)' } : undefined}
                >
                  <span className="w-4 text-center text-sm">{icon}</span>
                  {label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-border">
        <div className="text-[10px] text-muted-foreground font-mono">FY27 · Lohono Stays</div>
      </div>
    </aside>
  )
}
