// src/components/layout/conditional-shell.tsx
// Server component — reads x-pathname header set by middleware to decide
// whether to render the full AppShell (sidebar + topbar) or pass children through.
import { headers } from 'next/headers'
import { AppShell } from './app-shell'

export async function ConditionalShell({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  // Auth pages and legacy login bypass the shell. The /reports/print
  // route is also chrome-free so PDFs render cleanly.
  if (
    pathname.startsWith('/auth') ||
    pathname === '/login' ||
    pathname.startsWith('/reports/print')
  ) {
    return <>{children}</>
  }

  return <AppShell>{children}</AppShell>
}
