// src/components/layout/app-shell.tsx
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { MobileBottomNav } from './mobile-bottom-nav'
import { CommandPalette } from '../ui/command-palette'
import { getCurrentUser } from '@/lib/getCurrentUser'

export async function AppShell({ children }: { children: React.ReactNode }) {
  // Fetch user server-side to power role-aware sidebar
  const user = await getCurrentUser().catch(() => null)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={user?.role ?? null} />
      <Topbar />
      <CommandPalette />
      <main className="pt-14 lg:ml-16 min-h-screen pb-16 lg:pb-0 print:ml-0 print:pt-0">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
      <MobileBottomNav />
    </div>
  )
}
