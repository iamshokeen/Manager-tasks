import React from 'react'

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

// MD3-aligned avatar palette — each uses a container bg + on-container text
const PALETTES = [
  { bg: 'var(--primary-container)',   color: 'var(--on-primary-container)' },
  { bg: 'var(--secondary-container)', color: 'var(--on-secondary-container)' },
  { bg: 'var(--tertiary-container)',  color: 'var(--on-tertiary-container)' },
  { bg: 'rgba(5,150,105,0.15)',       color: '#065f46' },
  { bg: 'rgba(124,58,237,0.12)',      color: '#5b21b6' },
]

export function MemberAvatar({ name, size = 'md', className, style }: {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  style?: React.CSSProperties
}) {
  const palette = PALETTES[name.charCodeAt(0) % PALETTES.length]
  const sizeClass = { sm: 'h-6 w-6 text-[9px]', md: 'h-8 w-8 text-[10px]', lg: 'h-12 w-12 text-sm' }[size]

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold shrink-0 ${sizeClass}${className ? ' ' + className : ''}`}
      style={{ background: palette.bg, color: palette.color, ...style }}
    >
      {initials(name)}
    </div>
  )
}
