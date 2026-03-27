// src/components/layout/sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FolderKanban, CheckSquare, ListTodo, RefreshCw,
  Users, MessageSquare, Handshake, BarChart3, TrendingUp, Hotel,
  FileText, BookOpen, Settings, StickyNote
} from 'lucide-react'

const NAV_ITEMS = [
  {
    group: 'Overview',
    items: [{ href: '/', label: 'Dashboard', Icon: LayoutDashboard }],
  },
  {
    group: 'Work',
    items: [
      { href: '/projects', label: 'Projects', Icon: FolderKanban },
      { href: '/tasks', label: 'Tasks', Icon: CheckSquare },
      { href: '/my-tasks', label: 'My Tasks', Icon: ListTodo },
      { href: '/cadence', label: 'Cadence', Icon: RefreshCw },
      { href: '/notes', label: 'Notes', Icon: StickyNote },
    ],
  },
  {
    group: 'People',
    items: [
      { href: '/team', label: 'Team', Icon: Users },
      { href: '/one-on-ones', label: '1:1s', Icon: MessageSquare },
      { href: '/stakeholders', label: 'Stakeholders', Icon: Handshake },
    ],
  },
  {
    group: 'Assessment',
    items: [
      { href: '/metrics', label: 'Metrics', Icon: BarChart3 },
      { href: '/assessment/ota', label: 'OTA Assessment', Icon: TrendingUp },
      { href: '/assessment/checkin', label: 'Check-in GMV', Icon: Hotel },
    ],
  },
  {
    group: 'Reports',
    items: [{ href: '/reports', label: 'Reports', Icon: FileText }],
  },
  {
    group: 'Reference',
    items: [
      { href: '/playbook', label: 'Playbook', Icon: BookOpen },
      { href: '/settings', label: 'Settings', Icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 flex-col bg-[var(--surface-container-low)] z-40 print:hidden">
      {/* Brand */}
      <div className="px-6 py-5">
        <h1 className="text-xl font-bold tracking-tighter text-primary">Lohono Stays</h1>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--outline)] font-bold mt-0.5">
          Management Ecosystem
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV_ITEMS.map(({ group, items }) => (
          <div key={group} className="mb-1">
            <div className="px-3 py-2 text-[10px] font-bold tracking-widest text-[var(--outline)] uppercase">
              {group}
            </div>
            {items.map(({ href, label, Icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    active
                      ? 'text-primary bg-white/60 font-semibold'
                      : 'text-[var(--outline)] hover:text-[var(--foreground)] hover:bg-white/40'
                  )}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 1.75} />
                  {label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[var(--outline-variant)]/20">
        <div className="text-[10px] text-[var(--outline)] font-medium">FY27 · Lohono Stays</div>
      </div>
    </aside>
  )
}
