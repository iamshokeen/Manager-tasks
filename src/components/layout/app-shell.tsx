// src/components/layout/app-shell.tsx
import { Suspense } from 'react'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { MobileBottomNav } from './mobile-bottom-nav'
import { MobileNav } from './mobile-nav'
import { CommandPalette } from '../ui/command-palette'
import { OnboardingModal, OnboardingController } from '../ui/onboarding-modal'
import { FloatingTourBanner } from '../ui/floating-tour-banner'
import { OnboardingProvider } from '@/context/onboarding-context'
import { getSessionRole } from '@/lib/auth'

export async function AppShell({ children }: { children: React.ReactNode }) {
  // JWT-only — no DB call. Role is in the signed token.
  const session = await getSessionRole().catch(() => null)
  const role = session?.role ?? null

  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Sidebar userRole={role} />
        <MobileNav userRole={role} />
        <Topbar />
        <CommandPalette />
        <OnboardingController />
        <OnboardingModal />
        <Suspense>
          <FloatingTourBanner />
        </Suspense>
        <main className="pt-14 lg:ml-64 min-h-screen pb-20 lg:pb-0 print:ml-0 print:pt-0">
          <div className="p-3 sm:p-4 lg:p-8 max-w-full overflow-x-hidden">{children}</div>
        </main>
        <MobileBottomNav />
      </div>
    </OnboardingProvider>
  )
}
