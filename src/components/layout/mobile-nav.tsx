// src/components/layout/mobile-nav.tsx
//
// Mobile slide-in drawer + the hamburger trigger in the topbar. Mirrors the
// desktop sidebar nav so that on phones the user can actually reach every
// page (the desktop <Sidebar> is `hidden lg:flex` and the bottom-nav only
// surfaces 5 of ~20 routes, so without this drawer Settings, Profile,
// Schedules, Messages, Notes, Open Loops, Rounds, 1:1s, Stakeholders,
// Email→Tasks, Playbook, and Admin are unreachable from a phone).
//
// Listens on the global `kairos:open-mobile-nav` event so the topbar (a
// separate client component) can fire-and-forget — no shared context.

'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import useSWR from 'swr'

type Role = 'SUPER_ADMIN' | 'MANAGER' | 'SENIOR_IC' | 'DIRECT_REPORT' | 'EXEC_VIEWER' | 'GUEST'

interface NavItem { href: string; label: string; icon: string }
interface NavGroup { group: string; items: NavItem[] }

const BASE_NAV: NavGroup[] = [
  { group: 'Overview', items: [{ href: '/', label: 'Dashboard', icon: 'dashboard' }] },
  {
    group: 'Work',
    items: [
      { href: '/projects',       label: 'Projects',     icon: 'folder' },
      { href: '/tasks',          label: 'Tasks',        icon: 'checklist' },
      { href: '/my-tasks',       label: 'My Tasks',     icon: 'task_alt' },
      { href: '/schedules',      label: 'Schedules',    icon: 'event_repeat' },
      { href: '/email-to-tasks', label: 'Email → Tasks', icon: 'forward_to_inbox' },
      { href: '/cadence',        label: 'Rounds',       icon: 'repeat' },
      { href: '/notes',          label: 'Notes',        icon: 'sticky_note_2' },
      { href: '/follow-ups',     label: 'Open Loops',   icon: 'track_changes' },
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
  { group: 'Reports', items: [{ href: '/reports', label: 'Reports', icon: 'summarize' }] },
  { group: 'Connect', items: [{ href: '/messages', label: 'Messages', icon: 'forum' }] },
  {
    group: 'Reference',
    items: [
      { href: '/playbook', label: 'Playbook', icon: 'menu_book' },
      { href: '/settings', label: 'Settings', icon: 'settings' },
      { href: '/profile',  label: 'Profile',  icon: 'account_circle' },
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

// Routes hidden per role — mirror sidebar.tsx exactly so the drawer doesn't
// expose links a viewer-tier user shouldn't see.
const ROLE_HIDDEN: Record<string, Role[]> = {
  '/cadence':             ['DIRECT_REPORT', 'EXEC_VIEWER', 'GUEST'],
  '/one-on-ones':         ['EXEC_VIEWER', 'GUEST'],
  '/stakeholders':        ['DIRECT_REPORT', 'EXEC_VIEWER', 'GUEST'],
  '/assessment/ota':      ['DIRECT_REPORT', 'SENIOR_IC', 'EXEC_VIEWER', 'GUEST'],
  '/assessment/checkin':  ['DIRECT_REPORT', 'SENIOR_IC', 'EXEC_VIEWER', 'GUEST'],
  '/metrics':             ['EXEC_VIEWER', 'GUEST'],
  '/reports':             ['EXEC_VIEWER', 'GUEST'],
  '/projects':            ['EXEC_VIEWER', 'GUEST'],
  '/schedules':           ['EXEC_VIEWER', 'GUEST'],
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

const unreadFetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data?.count ?? 0)

interface Props {
  userRole?: string | null
}

export function MobileNav({ userRole }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const role = (userRole as Role) ?? 'DIRECT_REPORT'
  const navGroups = filterNavForRole(role)

  const { data: unreadCount } = useSWR<number>('/api/messages/unread', unreadFetcher, {
    refreshInterval: 10_000,
    revalidateOnFocus: true,
  })

  // Listen for the topbar's hamburger event.
  useEffect(() => {
    function handle() { setOpen(true) }
    window.addEventListener('kairos:open-mobile-nav', handle)
    return () => window.removeEventListener('kairos:open-mobile-nav', handle)
  }, [])

  // Close on route change.
  useEffect(() => { setOpen(false) }, [pathname])

  // Lock body scroll while drawer is open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth/login')
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] print:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Drawer */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-[100dvh] w-[82vw] max-w-[320px] z-50 flex flex-col print:hidden transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'var(--surface-container)' }}
        aria-hidden={!open}
      >
        {/* Brand + close */}
        <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(169,180,185,0.15)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0"
              style={{ background: 'var(--primary)' }}
            >
              <span className="material-symbols-outlined" style={{ color: 'var(--on-primary)', fontSize: '18px' }}>hourglass_empty</span>
            </div>
            <div>
              <h1 className="font-headline text-lg font-extrabold tracking-tight leading-tight" style={{ color: 'var(--on-surface)' }}>Kairos</h1>
              <p className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>
                Manager Command
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-10 h-10 flex items-center justify-center rounded-lg active:scale-95"
            style={{ color: 'var(--on-surface)' }}
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>close</span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-0.5">
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
                const showBadge = href === '/messages' && (unreadCount ?? 0) > 0
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between px-3 py-3 rounded-lg text-sm font-semibold transition-all active:scale-[0.98]"
                    style={active ? {
                      background: 'var(--surface-container-lowest)',
                      color: 'var(--primary)',
                      boxShadow: '0 1px 3px rgba(42,52,57,0.08)',
                    } : { color: 'var(--on-surface-variant)' }}
                  >
                    <span className="flex items-center gap-3">
                      <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '22px' }}>{icon}</span>
                      <span className="whitespace-nowrap font-['Inter']">{label}</span>
                    </span>
                    {showBadge && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
                      >
                        {unreadCount! > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer: logout */}
        <div className="px-3 pb-5 pt-3" style={{ borderTop: '1px solid rgba(169,180,185,0.15)' }}>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm disabled:opacity-50 active:scale-95"
            style={{ background: 'var(--surface-container-lowest)', color: 'var(--error)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-3 text-center" style={{ color: 'var(--on-surface-variant)', opacity: 0.5 }}>
            FY27 · Kairos
          </p>
        </div>
      </aside>
    </>
  )
}
