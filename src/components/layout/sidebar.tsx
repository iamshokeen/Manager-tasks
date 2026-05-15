// src/components/layout/sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

type Role = 'SUPER_ADMIN' | 'MANAGER' | 'SENIOR_IC' | 'DIRECT_REPORT' | 'EXEC_VIEWER' | 'GUEST'

interface NavItem { href: string; label: string; icon: string }
interface NavGroup { group: string; items: NavItem[] }

const BASE_NAV: NavGroup[] = [
  {
    group: 'Overview',
    items: [{ href: '/', label: 'Dashboard', icon: 'dashboard' }],
  },
  {
    group: 'Work',
    items: [
      { href: '/projects',       label: 'Projects',       icon: 'folder' },
      { href: '/tasks',          label: 'Tasks',           icon: 'checklist' },
      { href: '/my-tasks',       label: 'My Tasks',        icon: 'task_alt' },
      { href: '/email-to-tasks', label: 'Email → Tasks',   icon: 'forward_to_inbox' },
      { href: '/cadence',        label: 'Rounds',          icon: 'repeat' },
      { href: '/notes',          label: 'Notes',           icon: 'sticky_note_2' },
      { href: '/follow-ups',     label: 'Open Loops',      icon: 'track_changes' },
    ],
  },
  {
    group: 'People',
    items: [
      { href: '/team',         label: 'Your People', icon: 'group' },
      { href: '/one-on-ones',  label: '1:1s',        icon: 'forum' },
      { href: '/stakeholders', label: 'The Table',   icon: 'handshake' },
    ],
  },
  // Revenue group (Metrics / Channel Pulse / Check-in GMV) is hidden from the
  // sidebar per 2026-05-14 spec. Routes still exist and can be reached directly
  // via URL or restored by un-commenting. Do not delete the code.
  // {
  //   group: 'Revenue',
  //   items: [
  //     { href: '/metrics',           label: 'Metrics',       icon: 'analytics' },
  //     { href: '/assessment/ota',    label: 'Channel Pulse', icon: 'trending_up' },
  //     { href: '/assessment/checkin',label: 'Check-in GMV',  icon: 'hotel' },
  //   ],
  // },
  {
    group: 'Reports',
    items: [{ href: '/reports', label: 'Reports', icon: 'summarize' }],
  },
  {
    group: 'Reference',
    items: [
      { href: '/playbook', label: 'Playbook', icon: 'menu_book' },
      { href: '/settings', label: 'Settings', icon: 'settings' },
    ],
  },
]

const ADMIN_NAV: NavGroup = {
  group: 'Admin',
  items: [
    { href: '/dashboard/admin/users',        label: 'Users',       icon: 'manage_accounts' },
    { href: '/dashboard/admin/approvals',    label: 'Approvals',   icon: 'verified_user' },
    { href: '/dashboard/admin/workspaces',   label: 'Workspaces',  icon: 'corporate_fare' },
    { href: '/dashboard/admin/activity-log', label: 'Activity',    icon: 'history' },
    { href: '/dashboard/admin/rbac',         label: 'Permissions', icon: 'lock' },
  ],
}

const ROLE_HIDDEN: Record<string, Role[]> = {
  '/cadence':             ['DIRECT_REPORT', 'EXEC_VIEWER', 'GUEST'],
  '/one-on-ones':         ['EXEC_VIEWER', 'GUEST'],
  '/stakeholders':        ['DIRECT_REPORT', 'EXEC_VIEWER', 'GUEST'],
  '/assessment/ota':      ['DIRECT_REPORT', 'SENIOR_IC', 'EXEC_VIEWER', 'GUEST'],
  '/assessment/checkin':  ['DIRECT_REPORT', 'SENIOR_IC', 'EXEC_VIEWER', 'GUEST'],
  '/metrics':             ['EXEC_VIEWER', 'GUEST'],
  '/reports':             ['EXEC_VIEWER', 'GUEST'],
  '/projects':            ['EXEC_VIEWER', 'GUEST'],
  '/playbook':            ['MANAGER', 'SENIOR_IC', 'DIRECT_REPORT', 'EXEC_VIEWER', 'GUEST'],
}

function filterNavForRole(role: Role): NavGroup[] {
  const filtered = BASE_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      const hiddenFor = ROLE_HIDDEN[item.href]
      return !hiddenFor || !hiddenFor.includes(role)
    }),
  })).filter((group) => group.items.length > 0)

  if (role === 'SUPER_ADMIN') filtered.push(ADMIN_NAV)
  return filtered
}

interface SidebarProps {
  userRole?: string | null
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const role = (userRole as Role) ?? 'DIRECT_REPORT'
  const navGroups = filterNavForRole(role)

  return (
    <aside
      className="hidden lg:flex fixed left-0 top-0 h-screen w-64 flex-col z-40 print:hidden overflow-hidden"
      style={{ background: 'var(--surface-container)', borderRight: 'none' }}
    >
      {/* Brand */}
      <div className="px-4 py-6 mb-2">
        <div className="flex items-center gap-3 px-2">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0"
            style={{ background: 'var(--primary)' }}
          >
            <span className="material-symbols-outlined text-base" style={{ color: 'var(--on-primary)', fontSize: '18px' }}>
              hourglass_empty
            </span>
          </div>
          <div>
            <h1
              className="font-headline text-lg font-extrabold tracking-tight leading-tight"
              style={{ color: 'var(--on-surface)' }}
            >
              Kairos
            </h1>
            <p
              className="text-[9px] uppercase tracking-[0.18em] font-bold"
              style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}
            >
              Manager Command
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 space-y-0.5">
        {navGroups.map(({ group, items }) => (
          <div key={group} className="mb-1">
            <div
              className="px-3 py-1.5 text-[10px] font-bold tracking-[0.16em] uppercase"
              style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}
            >
              {group}
            </div>
            {items.map(({ href, label, icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer',
                  )}
                  style={active ? {
                    background: 'var(--surface-container-lowest)',
                    color: 'var(--primary)',
                    boxShadow: '0 1px 3px rgba(42,52,57,0.08)',
                  } : {
                    color: 'var(--on-surface-variant)',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.5)'
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--on-surface)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = ''
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--on-surface-variant)'
                    }
                  }}
                >
                  <span
                    className="material-symbols-outlined flex-shrink-0"
                    style={{ fontSize: '20px' }}
                  >
                    {icon}
                  </span>
                  <span className="whitespace-nowrap font-['Inter']">{label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-2" style={{ borderTop: '1px solid rgba(169,180,185,0.15)' }}>
        {/* New Task CTA */}
        <Link
          href="/tasks"
          className="w-full mb-3 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dim) 100%)',
            color: 'var(--on-primary)',
            boxShadow: '0 2px 12px rgba(0,83,219,0.25)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          New Task
        </Link>

        <Link
          href="/profile"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer',
          )}
          style={pathname === '/profile' ? {
            background: 'var(--surface-container-lowest)',
            color: 'var(--primary)',
          } : {
            color: 'var(--on-surface-variant)',
          }}
        >
          <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '20px' }}>
            account_circle
          </span>
          <span className="whitespace-nowrap font-['Inter']">Profile</span>
        </Link>

        <div className="px-3 pt-2">
          <div
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--on-surface-variant)', opacity: 0.5 }}
          >
            FY27 · Kairos
          </div>
        </div>
      </div>
    </aside>
  )
}
