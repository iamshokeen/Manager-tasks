// src/components/ui/quick-capture.tsx
//
// Floating "quick capture" dock. One FAB, two modes:
//   - Note      → POST /api/notes
//   - Open Loop → POST /api/follow-ups
//
// Shortcuts:
//   Cmd/Ctrl + Shift + N → open in Note mode
//   Cmd/Ctrl + Shift + L → open in Open Loop mode
//   Esc                  → close
//
// Lives at the app-shell level so it's available on every authenticated
// route without each page wiring its own panel.
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { Plus, StickyNote, Target, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Mode = 'note' | 'loop'

export function QuickCapture() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('note')
  const { mutate } = useSWRConfig()

  // Note state
  const [noteContent, setNoteContent] = useState('')
  const [noteVisibility, setNoteVisibility] = useState<'personal' | 'team'>('personal')

  // Loop state
  const [loopTitle, setLoopTitle] = useState('')
  const [loopContact, setLoopContact] = useState('')
  const [loopReminder, setLoopReminder] = useState('')

  const [saving, setSaving] = useState(false)
  const firstInputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)

  const openIn = useCallback((next: Mode) => {
    setMode(next)
    setOpen(true)
  }, [])

  const reset = useCallback(() => {
    setNoteContent('')
    setNoteVisibility('personal')
    setLoopTitle('')
    setLoopContact('')
    setLoopReminder('')
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    reset()
  }, [reset])

  // Global shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault()
        openIn('note')
      } else if (mod && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault()
        openIn('loop')
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, openIn])

  // Autofocus first field when opened or mode changes
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => firstInputRef.current?.focus(), 30)
    return () => window.clearTimeout(t)
  }, [open, mode])

  async function saveNote() {
    if (!noteContent.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent, visibility: noteVisibility }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to save note')
      }
      toast.success('Note captured')
      // Revalidate any /api/notes-keyed SWR caches without needing exact keys.
      mutate(key => typeof key === 'string' && key.startsWith('/api/notes'), undefined, { revalidate: true })
      close()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  async function saveLoop() {
    if (!loopTitle.trim() || !loopContact.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: loopTitle,
          contactName: loopContact,
          reminderAt: loopReminder || undefined,
          autoRemind: true,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to open loop')
      }
      toast.success('Open Loop created')
      mutate(key => typeof key === 'string' && key.startsWith('/api/follow-ups'), undefined, { revalidate: true })
      close()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to open loop')
    } finally {
      setSaving(false)
    }
  }

  const canSubmit =
    !saving &&
    ((mode === 'note' && noteContent.trim().length > 0) ||
      (mode === 'loop' && loopTitle.trim().length > 0 && loopContact.trim().length > 0))

  return (
    <>
      {/* Floating action button. Sits above the mobile bottom-nav (pb-20 on
          mobile) and bottom-right on desktop. Hidden in print. */}
      <button
        type="button"
        aria-label="Quick capture"
        title="Quick capture (⌘⇧N note, ⌘⇧L loop)"
        onClick={() => openIn('note')}
        className={cn(
          'fixed z-40 right-4 bottom-24 lg:bottom-6 h-12 w-12 rounded-full flex items-center justify-center',
          'shadow-lg transition-transform active:scale-95 print:hidden',
          open && 'opacity-0 pointer-events-none',
        )}
        style={{
          background: 'var(--primary)',
          color: 'var(--on-primary, var(--primary-foreground))',
          boxShadow: '0 12px 32px rgba(42,52,57,0.28)',
        }}
      >
        <Plus className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center print:hidden"
          onClick={close}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(8,12,16,0.45)', backdropFilter: 'blur(2px)' }}
          />

          {/* Panel */}
          <div
            className="relative w-full sm:w-[420px] max-w-[calc(100vw-1rem)] rounded-t-2xl sm:rounded-2xl overflow-hidden"
            style={{
              background: 'var(--surface-container-lowest, var(--background))',
              boxShadow: '0 24px 60px rgba(0,0,0,0.32)',
              border: '1px solid var(--surface-container)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / mode tabs */}
            <div
              className="flex items-center justify-between gap-2 px-4 pt-3 pb-2"
              style={{ borderBottom: '1px solid var(--surface-container)' }}
            >
              <div className="flex items-center gap-1">
                <ModeTab active={mode === 'note'} onClick={() => setMode('note')} icon={<StickyNote className="h-3.5 w-3.5" />} label="Note" hint="⌘⇧N" />
                <ModeTab active={mode === 'loop'} onClick={() => setMode('loop')} icon={<Target className="h-3.5 w-3.5" />} label="Open Loop" hint="⌘⇧L" />
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-[var(--surface-container-high)] transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              {mode === 'note' ? (
                <>
                  <textarea
                    ref={(el) => { firstInputRef.current = el }}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Capture a thought…"
                    rows={5}
                    className="w-full resize-none rounded-md px-3 py-2 text-sm bg-transparent border focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    style={{ borderColor: 'var(--surface-container-high)' }}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit) {
                        e.preventDefault()
                        void saveNote()
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                      Visibility
                    </span>
                    <button
                      type="button"
                      onClick={() => setNoteVisibility('personal')}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors',
                        noteVisibility === 'personal'
                          ? 'bg-[var(--primary)] text-[var(--on-primary,var(--primary-foreground))]'
                          : 'text-muted-foreground hover:text-foreground hover:bg-[var(--surface-container-high)]',
                      )}
                    >
                      Personal
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteVisibility('team')}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors',
                        noteVisibility === 'team'
                          ? 'bg-[var(--primary)] text-[var(--on-primary,var(--primary-foreground))]'
                          : 'text-muted-foreground hover:text-foreground hover:bg-[var(--surface-container-high)]',
                      )}
                    >
                      Team
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <input
                    ref={(el) => { firstInputRef.current = el }}
                    value={loopTitle}
                    onChange={(e) => setLoopTitle(e.target.value)}
                    placeholder="Loop title (what needs closing?)"
                    className="w-full rounded-md px-3 py-2 text-sm bg-transparent border focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    style={{ borderColor: 'var(--surface-container-high)' }}
                  />
                  <input
                    value={loopContact}
                    onChange={(e) => setLoopContact(e.target.value)}
                    placeholder="Contact (name)"
                    className="w-full rounded-md px-3 py-2 text-sm bg-transparent border focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    style={{ borderColor: 'var(--surface-container-high)' }}
                  />
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">
                      Reminder (optional)
                    </label>
                    <input
                      type="date"
                      value={loopReminder}
                      onChange={(e) => setLoopReminder(e.target.value)}
                      className="w-full rounded-md px-3 py-2 text-sm bg-transparent border focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      style={{ borderColor: 'var(--surface-container-high)' }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between gap-2 px-4 py-3"
              style={{ borderTop: '1px solid var(--surface-container)' }}
            >
              <span className="text-[10px] text-muted-foreground">
                {mode === 'note' ? '⌘↵ to save' : 'Title + contact required'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="px-3 py-1.5 rounded-md text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-[var(--surface-container-high)] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={mode === 'note' ? saveNote : saveLoop}
                  disabled={!canSubmit}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-bold inline-flex items-center gap-1.5 transition-all',
                    canSubmit
                      ? 'bg-[var(--primary)] text-[var(--on-primary,var(--primary-foreground))] hover:opacity-90'
                      : 'bg-[var(--surface-container-high)] text-muted-foreground cursor-not-allowed',
                  )}
                >
                  {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                  {mode === 'note' ? 'Save Note' : 'Open Loop'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  hint: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors',
        active
          ? 'bg-[var(--primary)] text-[var(--on-primary,var(--primary-foreground))]'
          : 'text-muted-foreground hover:text-foreground hover:bg-[var(--surface-container-high)]',
      )}
      title={`${label} (${hint})`}
    >
      {icon}
      {label}
    </button>
  )
}
