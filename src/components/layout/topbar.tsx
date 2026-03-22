// src/components/layout/topbar.tsx
'use client'
import { usePathname } from 'next/navigation'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/projects': 'Projects',
  '/tasks': 'Tasks',
  '/my-tasks': 'My Tasks',
  '/team': 'Team',
  '/one-on-ones': '1:1s',
  '/cadence': 'Cadence',
  '/stakeholders': 'Stakeholders',
  '/reports': 'Reports',
  '/playbook': 'Playbook',
  '/settings': 'Settings',
  '/metrics': 'Metrics',
  '/assessment': 'Assessment',
}

export function Topbar() {
  const pathname = usePathname()
  const baseRoute = '/' + (pathname.split('/')[1] ?? '')
  const title = PAGE_TITLES[baseRoute] ?? 'Lohono CMD'

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })

  return (
    <header className="fixed top-0 left-[220px] right-0 h-14 border-b border-border bg-background/80 backdrop-blur-sm z-30 flex items-center px-6 justify-between print:hidden">
      <h1 className="text-sm font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-muted-foreground">{today}</span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'var(--color-navy)', color: '#93C5FD' }}
        >
          FY27 Q4
        </span>
        <button
          onClick={() => window.print()}
          className="text-xs px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-[var(--color-gold)] transition-colors"
          title="Download as PDF"
        >
          ↓ PDF
        </button>
      </div>
    </header>
  )
}
