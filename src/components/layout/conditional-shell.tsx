// src/components/layout/conditional-shell.tsx
// Server component — reads x-pathname header set by middleware to decide
// whether to render the full AppShell (sidebar + topbar) or pass children through.
import { headers } from 'next/headers'
import { AppShell } from './app-shell'

export async function ConditionalShell({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  // Auth pages and legacy login bypass the shell
  if (pathname.startsWith('/auth') || pathname === '/login') {
    return <>{children}</>
  }

  return <AppShell>{children}</AppShell>
}
