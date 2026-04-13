// src/components/layout/topbar.tsx
'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

const PAGE_TITLES: Record<string, string> = {
  '/':                     'Dashboard',
  '/profile':              'Profile',
  '/projects':             'Projects',
  '/tasks':                'Tasks',
  '/my-tasks':             'My Tasks',
  '/team':                 'Your People',
  '/one-on-ones':          '1:1s',
  '/cadence':              'Rounds',
  '/stakeholders':         'The Table',
  '/reports':              'Reports',
  '/playbook':             'Playbook',
  '/settings':             'Settings',
  '/metrics':              'Metrics',
  '/assessment':           'Channel Pulse',
  '/follow-ups':           'Open Loops',
  '/dashboard/admin':      'Admin',
  '/notes':                'Notes',
}

const PAGE_BREADCRUMB: Record<string, string[]> = {
  '/':                    ['Admin', 'Overview'],
  '/tasks':               ['Work', 'Tasks'],
  '/my-tasks':            ['Work', 'My Tasks'],
  '/projects':            ['Work', 'Projects'],
  '/cadence':             ['Work', 'Rounds'],
  '/notes':               ['Work', 'Notes'],
  '/follow-ups':          ['Work', 'Open Loops'],
  '/team':                ['People', 'Your People'],
  '/one-on-ones':         ['People', '1:1s'],
  '/stakeholders':        ['People', 'The Table'],
  '/metrics':             ['Revenue', 'Metrics'],
  '/assessment/ota':      ['Revenue', 'Channel Pulse'],
  '/assessment/checkin':  ['Revenue', 'Check-in GMV'],
  '/reports':             ['Reports', 'Overview'],
  '/playbook':            ['Reference', 'Playbook'],
  '/settings':            ['Reference', 'Settings'],
}

export function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth/login')
  }

  const baseRoute = '/' + (pathname.split('/').slice(1, pathname.split('/').length > 2 ? 3 : 2).join('/'))
  const simpleRoute = '/' + (pathname.split('/')[1] ?? '')
  const title = PAGE_TITLES[baseRoute] ?? PAGE_TITLES[simpleRoute] ?? 'Kairos'
  const breadcrumb = PAGE_BREADCRUMB[pathname] ?? PAGE_BREADCRUMB[simpleRoute] ?? ['Admin', title]

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })

  return (
    <header
      className="fixed top-0 left-0 lg:left-64 right-0 h-14 z-30 flex items-center justify-between px-5 lg:px-8 print:hidden"
      style={{
        background: 'rgba(247,249,251,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(169,180,185,0.2)',
      }}
    >
      {/* Left: mobile brand + breadcrumb on desktop */}
      <div className="flex items-center gap-3">
        <span
          className="font-headline text-base font-black tracking-tight lg:hidden"
          style={{ color: 'var(--on-surface)' }}
        >
          Kairos
        </span>
        <nav className="hidden lg:flex items-center gap-1.5" style={{ color: 'var(--on-surface-variant)' }}>
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <span className="material-symbols-outlined" style={{ fontSize: '14px', opacity: 0.5 }}>
                  chevron_right
                </span>
              )}
              <span
                className={`text-xs tracking-widest uppercase font-bold ${i === breadcrumb.length - 1 ? '' : 'opacity-60'}`}
                style={{ color: i === breadcrumb.length - 1 ? 'var(--on-surface)' : undefined }}
              >
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Right: date + badge + actions */}
      <div className="flex items-center gap-2 lg:gap-3">
        <span
          className="hidden lg:block text-xs font-medium"
          style={{ color: 'var(--on-surface-variant)' }}
        >
          {today}
        </span>
        <span
          className="hidden md:inline-flex text-[10px] px-2 py-0.5 rounded-full font-bold"
          style={{
            background: 'var(--primary-container)',
            color: 'var(--on-primary-container)',
          }}
        >
          FY27 Q4
        </span>

        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer"
          style={{ color: 'var(--outline)' }}
          title="Search (⌘K)"
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--primary)'
            ;(e.currentTarget as HTMLElement).style.background = 'rgba(0,83,219,0.06)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--outline)'
            ;(e.currentTarget as HTMLElement).style.background = ''
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>search</span>
        </button>

        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer"
          style={{ color: 'var(--outline)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--primary)'
            ;(e.currentTarget as HTMLElement).style.background = 'rgba(0,83,219,0.06)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--outline)'
            ;(e.currentTarget as HTMLElement).style.background = ''
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>notifications</span>
        </button>

        <button
          onClick={() => window.print()}
          className="hidden md:flex print:hidden items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all cursor-pointer"
          title="Download as PDF"
          style={{
            border: '1px solid rgba(169,180,185,0.5)',
            color: 'var(--on-surface-variant)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--primary)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--on-surface-variant)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(169,180,185,0.5)'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span>
          PDF
        </button>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title="Log out"
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 disabled:opacity-40 cursor-pointer"
          style={{ color: 'var(--outline)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--error)'
            ;(e.currentTarget as HTMLElement).style.background = 'rgba(159,64,61,0.06)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--outline)'
            ;(e.currentTarget as HTMLElement).style.background = ''
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
        </button>
      </div>
    </header>
  )
}
