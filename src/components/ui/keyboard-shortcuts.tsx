// src/components/ui/keyboard-shortcuts.tsx
//
// Two things in one file:
//   1. A "g + letter" leader-sequence nav handler. Press `g` then a single
//      letter to jump to a page (gd = dashboard, gt = tasks, gm = my tasks…).
//      Inactive while the user is typing in any text field.
//   2. A modal overlay that lists every keyboard shortcut. Open with `?`,
//      close with Esc or by clicking the backdrop.
'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Keyboard } from 'lucide-react'

type Shortcut = { keys: string[]; label: string }
type Section = { title: string; shortcuts: Shortcut[] }

const SECTIONS: Section[] = [
  {
    title: 'Search & Commands',
    shortcuts: [
      { keys: ['⌘', 'K'], label: 'Open command palette' },
      { keys: ['/'], label: 'In palette: jump to page' },
      { keys: ['>'], label: 'In palette: run an action' },
      { keys: ['?'], label: 'Show this help' },
    ],
  },
  {
    title: 'Quick Capture',
    shortcuts: [
      { keys: ['⌘', '⇧', 'N'], label: 'Capture a note' },
      { keys: ['⌘', '⇧', 'L'], label: 'Open a loop' },
      { keys: ['⌘', '↵'], label: 'Save note (in capture)' },
    ],
  },
  {
    title: 'Jump To (press g then…)',
    shortcuts: [
      { keys: ['g', 'd'], label: 'Dashboard' },
      { keys: ['g', 't'], label: 'Tasks' },
      { keys: ['g', 'm'], label: 'My Tasks' },
      { keys: ['g', 'p'], label: 'Projects' },
      { keys: ['g', 'n'], label: 'Notes' },
      { keys: ['g', 'l'], label: 'Open Loops' },
      { keys: ['g', 'y'], label: 'Your People' },
      { keys: ['g', 'o'], label: '1:1s' },
      { keys: ['g', 's'], label: 'Settings' },
      { keys: ['g', 'r'], label: 'Reports' },
    ],
  },
  {
    title: 'Global',
    shortcuts: [
      { keys: ['Esc'], label: 'Close panel / dialog' },
    ],
  },
]

const G_NAV: Record<string, string> = {
  d: '/',
  t: '/tasks',
  m: '/my-tasks',
  p: '/projects',
  n: '/notes',
  l: '/follow-ups',
  y: '/team',
  o: '/one-on-ones',
  s: '/settings',
  r: '/reports',
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return false
}

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  // Leader sequence: when set, the next non-modifier keystroke is the target.
  const leaderRef = useRef<number | null>(null)

  useEffect(() => {
    function clearLeader() {
      if (leaderRef.current !== null) {
        window.clearTimeout(leaderRef.current)
        leaderRef.current = null
      }
    }

    function onKey(e: KeyboardEvent) {
      // Never hijack while the user is typing in a field. Always allow Esc.
      const typing = isTyping(e.target)

      if (e.key === 'Escape') {
        clearLeader()
        if (open) setOpen(false)
        return
      }

      if (typing) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      // `?` opens the overlay. Shift+/ on most layouts produces '?'.
      if (e.key === '?') {
        e.preventDefault()
        setOpen((o) => !o)
        return
      }

      // Leader sequence: g, then letter.
      if (leaderRef.current !== null) {
        const target = G_NAV[e.key.toLowerCase()]
        clearLeader()
        if (target) {
          e.preventDefault()
          router.push(target)
        }
        return
      }

      if (e.key === 'g') {
        e.preventDefault()
        leaderRef.current = window.setTimeout(clearLeader, 1200)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearLeader()
    }
  }, [open, router])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(8,12,16,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={() => setOpen(false)}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-label="Keyboard shortcuts"
          className="pointer-events-auto w-full max-w-2xl rounded-2xl overflow-hidden"
          style={{
            background: 'var(--surface-container-lowest, var(--background))',
            border: '1px solid var(--surface-container)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.42), 0 0 0 1px rgba(201,169,110,0.12)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: '1px solid var(--surface-container)' }}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-md flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--primary) 14%, transparent)', color: 'var(--primary)' }}
              >
                <Keyboard size={14} strokeWidth={1.75} />
              </span>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                  Keyboard Shortcuts
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: 'var(--outline)' }}>
                  Move at the speed of intent
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="h-7 w-7 flex items-center justify-center rounded transition-colors"
              style={{ color: 'var(--outline)' }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-container-high)'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--on-surface)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = ''
                ;(e.currentTarget as HTMLElement).style.color = 'var(--outline)'
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Body — 2-column grid of sections */}
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 max-h-[70vh] overflow-y-auto">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <div
                  className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2.5"
                  style={{ color: 'var(--outline)' }}
                >
                  {section.title}
                </div>
                <ul className="space-y-1.5">
                  {section.shortcuts.map((s, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 text-sm">
                      <span style={{ color: 'var(--on-surface)' }}>{s.label}</span>
                      <span className="flex items-center gap-1 flex-shrink-0">
                        {s.keys.map((k, j) => (
                          <kbd
                            key={j}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold min-w-[1.4rem] text-center"
                            style={{
                              background: 'var(--surface-container-high)',
                              color: 'var(--on-surface-variant)',
                              border: '1px solid var(--surface-container)',
                            }}
                          >
                            {k}
                          </kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            className="px-5 py-2.5 text-[10px] flex items-center justify-between"
            style={{ borderTop: '1px solid var(--surface-container)', color: 'var(--outline)' }}
          >
            <span>
              Press{' '}
              <kbd
                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }}
              >
                ?
              </kbd>{' '}
              any time to open this.
            </span>
            <span>
              <kbd
                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }}
              >
                Esc
              </kbd>{' '}
              to close
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
