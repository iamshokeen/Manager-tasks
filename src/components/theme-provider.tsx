// src/components/theme-provider.tsx
'use client'
import { createContext, useContext, useEffect, useState } from 'react'

export type ThemeId =
  // Dark
  | 'gold' | 'violet-dark' | 'slate-dark' | 'navy-dark'
  | 'forest-dark' | 'rose-dark' | 'amber-dark' | 'cyan-dark'
  // Light
  | 'azure' | 'sky-light' | 'lavender-light' | 'rose-light'
  | 'mint-light' | 'honey-light' | 'teal-light' | 'sunset-light'
  // Colorful
  | 'aurora' | 'deep-ocean' | 'sunset-dark' | 'candy'

const DARK_THEMES: ThemeId[] = [
  'gold', 'violet-dark', 'slate-dark', 'navy-dark',
  'forest-dark', 'rose-dark', 'amber-dark', 'cyan-dark',
  'aurora', 'deep-ocean', 'sunset-dark',
]

const ThemeContext = createContext<{
  theme: ThemeId
  setTheme: (t: ThemeId) => void
}>({ theme: 'azure', setTheme: () => {} })

function applyTheme(theme: ThemeId) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  if (DARK_THEMES.includes(theme)) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('azure')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = (localStorage.getItem('lohono-theme') as ThemeId) ?? 'azure'
    applyTheme(saved)
    setThemeState(saved)
    setMounted(true)
  }, [])

  function setTheme(t: ThemeId) {
    setThemeState(t)
    localStorage.setItem('lohono-theme', t)
    applyTheme(t)
  }

  // Avoid flash: render nothing until mounted
  if (!mounted) return <>{children}</>

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

export const THEMES: { id: ThemeId; label: string; group: string; bg: string; primary: string; accent?: string }[] = [
  // Dark
  { id: 'gold',         label: 'Gold',           group: 'Dark',      bg: '#0A0B0F', primary: '#C9A84C' },
  { id: 'violet-dark',  label: 'Violet',         group: 'Dark',      bg: '#0D0B14', primary: '#A78BFA' },
  { id: 'slate-dark',   label: 'Slate',          group: 'Dark',      bg: '#0F1117', primary: '#94A3B8' },
  { id: 'navy-dark',    label: 'Navy',           group: 'Dark',      bg: '#060B18', primary: '#60A5FA' },
  { id: 'forest-dark',  label: 'Forest',         group: 'Dark',      bg: '#061009', primary: '#4ADE80' },
  { id: 'rose-dark',    label: 'Rose',           group: 'Dark',      bg: '#130810', primary: '#FB7185' },
  { id: 'amber-dark',   label: 'Amber',          group: 'Dark',      bg: '#110C04', primary: '#FCD34D' },
  { id: 'cyan-dark',    label: 'Cyan',           group: 'Dark',      bg: '#041214', primary: '#22D3EE' },
  // Light
  { id: 'azure',        label: 'Clean',          group: 'Light',     bg: '#f7f9fb', primary: '#004ac6' },
  { id: 'sky-light',    label: 'Sky Blue',       group: 'Light',     bg: '#f0f9ff', primary: '#0284C7' },
  { id: 'lavender-light',label:'Lavender',       group: 'Light',     bg: '#f9f7ff', primary: '#7C3AED' },
  { id: 'rose-light',   label: 'Rose',           group: 'Light',     bg: '#fff7f8', primary: '#E11D48' },
  { id: 'mint-light',   label: 'Mint',           group: 'Light',     bg: '#f0fdf4', primary: '#059669' },
  { id: 'honey-light',  label: 'Honey',          group: 'Light',     bg: '#fffbf0', primary: '#D97706' },
  { id: 'teal-light',   label: 'Teal',           group: 'Light',     bg: '#f0fdfd', primary: '#0D9488' },
  { id: 'sunset-light', label: 'Sunset Orange',  group: 'Light',     bg: '#fff8f4', primary: '#EA580C' },
  // Colorful
  { id: 'aurora',       label: 'Aurora',         group: 'Colorful',  bg: '#0D0618', primary: '#C084FC', accent: '#EC4899' },
  { id: 'deep-ocean',   label: 'Deep Ocean',     group: 'Colorful',  bg: '#030D1A', primary: '#22D3EE', accent: '#4F46E5' },
  { id: 'sunset-dark',  label: 'Sunset Dark',    group: 'Colorful',  bg: '#130802', primary: '#FB923C', accent: '#EC4899' },
  { id: 'candy',        label: 'Candy',          group: 'Colorful',  bg: '#FFF5FD', primary: '#EC4899', accent: '#A78BFA' },
]
