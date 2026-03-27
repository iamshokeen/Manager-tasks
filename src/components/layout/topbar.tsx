// src/components/layout/topbar.tsx
'use client'
import { usePathname, useRouter } from 'next/navigation'
import { Search, Bell, LogOut } from 'lucide-react'
import { useState } from 'react'

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
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth/login')
  }
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
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-14 z-30 flex items-center justify-between px-5 lg:px-8 bg-white/80 backdrop-blur-xl shadow-[var(--shadow-glass)] print:hidden">
      {/* Left: brand on mobile, page title on desktop */}
      <div className="flex items-center gap-4">
        <span className="text-base font-black tracking-tight text-foreground lg:hidden">
          Lohono Stays
        </span>
        <h1 className="hidden lg:block text-sm font-semibold text-foreground">{title}</h1>
      </div>

      {/* Right: date + badge + search + notifications + PDF */}
      <div className="flex items-center gap-2 lg:gap-3">
        <span className="hidden lg:block text-xs font-medium text-muted-foreground">{today}</span>
        <span className="hidden md:inline-flex text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary">
          FY27 Q4
        </span>
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
          className="w-8 h-8 flex items-center justify-center text-[var(--outline)] hover:text-primary transition-colors rounded-lg hover:bg-primary/5"
          title="Search (⌘K)"
        >
          <Search size={16} />
        </button>
        <button className="w-8 h-8 flex items-center justify-center text-[var(--outline)] hover:text-primary transition-colors rounded-lg hover:bg-primary/5">
          <Bell size={16} />
        </button>
        <button
          onClick={() => window.print()}
          className="hidden md:flex text-xs px-2.5 py-1 rounded-lg border border-[var(--outline-variant)]/40 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
          title="Download as PDF"
        >
          ↓ PDF
        </button>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title="Log out"
          className="w-8 h-8 flex items-center justify-center text-[var(--outline)] hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-40"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  )
}
