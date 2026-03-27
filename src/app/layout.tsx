// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ConditionalShell } from '@/components/layout/conditional-shell'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/components/providers'

export const viewport: Viewport = {
  themeColor: '#004ac6',
}

export const metadata: Metadata = {
  title: 'Kairos',
  description: 'Kairos — the command center for managers who know why the work matters.',
  manifest: '/manifest.json',
  icons: { apple: '/icons/apple-touch-icon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <ConditionalShell>{children}</ConditionalShell>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
