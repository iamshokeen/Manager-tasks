// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppShell } from '@/components/layout/app-shell'
import { Toaster } from '@/components/ui/sonner'

export const viewport: Viewport = {
  themeColor: '#C9A84C',
}

export const metadata: Metadata = {
  title: 'Lohono Command Center',
  description: 'People management & task tracking for Lohono Stays',
  manifest: '/manifest.json',
  icons: { apple: '/icons/apple-touch-icon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  )
}
