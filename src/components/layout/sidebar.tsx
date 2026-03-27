// src/components/layout/sidebar.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FolderKanban, CheckSquare, ListTodo, RefreshCw,
  Users, MessageSquare, Handshake, BarChart3, TrendingUp, Hotel,
  FileText, BookOpen, Settings, StickyNote, Bell, ShieldCheck,
  UserCheck, Building2, Activity
} from 'lucide-react'

type Role = 'SUPER_ADMIN' | 'MANAGER' | 'SENIOR_IC' | 'DIRECT_REPORT' | 'EXEC_VIEWER' | 'GUEST'

interface NavItem { href: string; label: string; Icon: React.ElementType }
interface NavGroup { group: string; items: NavItem[] }

const BASE_NAV: NavGroup[] = [
  {
    group: 'Overview',
    items: [{ href: '/', label: 'Kairos', Icon: LayoutDashboard }],
  },
  {
    group: 'Work',
    items: [
      { href: '/projects', label: 'Projects', Icon: FolderKanban },
      { href: '/tasks', label: 'Tasks', Icon: CheckSquare },
      { href: '/my-tasks', label: 'My Tasks', Icon: ListTodo },
      { href: '/cadence', label: 'Rounds', Icon: RefreshCw },
      { href: '/notes', label: 'Notes', Icon: StickyNote },
      { href: '/follow-ups', label: 'Open Loops', Icon: Bell },
    ],
  },
  {
    group: 'People',
    items: [
      { href: '/team', label: 'Your People', Icon: Users },
      { href: '/one-on-ones', label: '1:1s', Icon: MessageSquare },
      { href: '/stakeholders', label: 'The Table', Icon: Handshake },
    ],
  },
  {
    group: 'Revenue',
    items: [
      { href: '/metrics', label: 'Metrics', Icon: BarChart3 },
      { href: '/assessment/ota', label: 'Channel Pulse', Icon: TrendingUp },
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

const ADMIN_NAV: NavGroup = {
  group: 'Admin',
  items: [
    { href: '/dashboard/admin/users', label: 'Users', Icon: UserCheck },
    { href: '/dashboard/admin/approvals', label: 'Approvals', Icon: ShieldCheck },
    { href: '/dashboard/admin/workspaces', label: 'Workspaces', Icon: Building2 },
    { href: '/dashboard/admin/activity-log', label: 'Activity', Icon: Activity },
  ],
}

// Items filtered based on role
const ROLE_HIDDEN: Record<string, Role[]> = {
  '/cadence': ['DIRECT_REPORT', 'EXEC_VIEWER', 'GUEST'],
  '/one-on-ones': ['EXEC_VIEWER', 'GUEST'],
  '/stakeholders': ['DIRECT_REPORT', 'EXEC_VIEWER', 'GUEST'],
  '/assessment/ota': ['DIRECT_REPORT', 'SENIOR_IC', 'EXEC_VIEWER', 'GUEST'],
  '/assessment/checkin': ['DIRECT_REPORT', 'SENIOR_IC', 'EXEC_VIEWER', 'GUEST'],
  '/metrics': ['EXEC_VIEWER', 'GUEST'],
  '/reports': ['EXEC_VIEWER', 'GUEST'],
  '/projects': ['EXEC_VIEWER', 'GUEST'],
}

function filterNavForRole(role: Role): NavGroup[] {
  const filtered = BASE_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      const hiddenFor = ROLE_HIDDEN[item.href]
      return !hiddenFor || !hiddenFor.includes(role)
    }),
  })).filter((group) => group.items.length > 0)

  if (role === 'SUPER_ADMIN') {
    filtered.push(ADMIN_NAV)
  }

  return filtered
}

interface SidebarProps {
  userRole?: string | null
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)

  const role = (userRole as Role) ?? 'DIRECT_REPORT'
  const navGroups = filterNavForRole(role)

  return (
    <aside
      className={cn(
        'hidden lg:flex fixed left-0 top-0 h-screen flex-col bg-[var(--surface-container-low)] z-40 print:hidden transition-[width] duration-300 overflow-hidden',
        expanded ? 'w-64' : 'w-16'
      )}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Brand */}
      <div className="px-4 py-5 flex items-center gap-3 min-w-0">
        <span className="text-xl font-bold tracking-tighter text-primary shrink-0">K</span>
        {expanded && (
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tighter text-primary whitespace-nowrap">Kairos</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--outline)] font-bold mt-0.5 whitespace-nowrap">
              Know the moment. Own the purpose.
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4">
        {navGroups.map(({ group, items }) => (
          <div key={group} className="mb-1">
            {expanded && (
              <div className="px-3 py-2 text-[10px] font-bold tracking-widest text-[var(--outline)] uppercase whitespace-nowrap">
                {group}
              </div>
            )}
            {!expanded && <div className="py-1" />}
            {items.map(({ href, label, Icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    active
                      ? 'text-primary bg-white/60 font-semibold'
                      : 'text-[var(--outline)] hover:text-[var(--foreground)] hover:bg-white/40'
                  )}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 1.75} className="shrink-0" />
                  {expanded && <span className="whitespace-nowrap">{label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {expanded && (
        <div className="px-5 py-4 border-t border-[var(--outline-variant)]/20">
          <div className="text-[10px] text-[var(--outline)] font-medium whitespace-nowrap">FY27 · Kairos</div>
        </div>
      )}
    </aside>
  )
}
