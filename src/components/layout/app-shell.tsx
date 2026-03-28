// src/components/layout/app-shell.tsx
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { MobileBottomNav } from './mobile-bottom-nav'
import { CommandPalette } from '../ui/command-palette'
import { OnboardingModal, OnboardingController } from '../ui/onboarding-modal'
import { OnboardingProvider } from '@/context/onboarding-context'
import { getSessionRole } from '@/lib/auth'

export async function AppShell({ children }: { children: React.ReactNode }) {
  // JWT-only — no DB call. Role is in the signed token.
  const session = await getSessionRole().catch(() => null)

  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-background">
        <Sidebar userRole={session?.role ?? null} />
        <Topbar />
        <CommandPalette />
        <OnboardingController />
        <OnboardingModal />
        <main className="pt-14 lg:ml-64 min-h-screen pb-16 lg:pb-0 print:ml-0 print:pt-0">
          <div className="p-4 lg:p-8">{children}</div>
        </main>
        <MobileBottomNav />
      </div>
    </OnboardingProvider>
  )
}
