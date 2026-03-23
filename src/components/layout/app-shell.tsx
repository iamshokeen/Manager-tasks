// src/components/layout/app-shell.tsx
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { MobileBottomNav } from './mobile-bottom-nav'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Topbar />
      <main className="pt-14 lg:ml-64 min-h-screen pb-16 lg:pb-0 print:ml-0 print:pt-0">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
      <MobileBottomNav />
    </div>
  )
}
