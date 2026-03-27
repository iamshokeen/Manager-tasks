// src/components/providers.tsx
'use client'
import { ThemeProvider } from './theme-provider'
import { WorkspaceProvider } from '@/context/WorkspaceContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </ThemeProvider>
  )
}
