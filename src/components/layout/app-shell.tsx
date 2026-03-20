// src/components/layout/app-shell.tsx
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Topbar />
      <main className="ml-[220px] pt-14 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
