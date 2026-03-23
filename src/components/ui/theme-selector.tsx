// src/components/ui/theme-selector.tsx
'use client'
import { useTheme, THEMES, type ThemeId } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

const GROUPS = ['Dark', 'Light', 'Colorful'] as const

export function ThemeSelector() {
  const { theme: current, setTheme } = useTheme()

  return (
    <div className="space-y-6">
      {GROUPS.map(group => (
        <div key={group}>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--outline)] mb-3">
            {group}
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {THEMES.filter(t => t.group === group).map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as ThemeId)}
                title={t.label}
                className={cn(
                  'group flex flex-col items-center gap-2 p-1 rounded-xl transition-all',
                  current === t.id ? 'ring-2 ring-offset-2 ring-[var(--ring)]' : 'hover:scale-105'
                )}
              >
                {/* Swatch */}
                <div
                  className="w-full aspect-square rounded-lg relative overflow-hidden shadow-sm"
                  style={{ background: t.bg, minHeight: 48 }}
                >
                  {/* Primary accent blob */}
                  <div
                    className="absolute bottom-1 right-1 w-5 h-5 rounded-full shadow"
                    style={{
                      background: t.accent
                        ? `linear-gradient(135deg, ${t.primary}, ${t.accent})`
                        : t.primary
                    }}
                  />
                  {/* Active check */}
                  {current === t.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                      <svg className="w-4 h-4 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                {/* Label */}
                <span className={cn(
                  'text-[10px] font-semibold leading-tight text-center',
                  current === t.id ? 'text-[var(--primary)]' : 'text-[var(--outline)]'
                )}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
