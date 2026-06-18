// src/components/ui/command-palette.tsx
//
// Universal command palette. ⌘K / Ctrl+K opens it. Three modes, switched by
// the first character of the query:
//   default  → universal search across tasks, projects, people, etc.
//   `/`      → page navigation only
//   `>`      → quick actions only
//
// On an empty query: shows Recents (localStorage) + Quick Filters + actions.
'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  LayoutDashboard, FolderKanban, CheckSquare, ListTodo, RefreshCw,
  Users, MessageSquare, Handshake, BarChart3, TrendingUp, Hotel,
  FileText, BookOpen, Settings, Plus, Search, Sparkles, Target,
  StickyNote, User as UserIcon, Briefcase, Clock, Flame, History,
  ArrowRight,
} from 'lucide-react'

type Hit = {
  type: 'task' | 'project' | 'person' | 'stakeholder' | 'loop' | 'note'
  id: string
  title: string
  subtitle?: string
  href: string
  meta?: string
}

const PAGES = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/my-tasks', label: 'My Tasks', icon: ListTodo },
  { href: '/cadence', label: 'Rounds', icon: RefreshCw },
  { href: '/notes', label: 'Notes', icon: StickyNote },
  { href: '/follow-ups', label: 'Open Loops', icon: Target },
  { href: '/team', label: 'Your People', icon: Users },
  { href: '/one-on-ones', label: '1:1s', icon: MessageSquare },
  { href: '/stakeholders', label: 'The Table', icon: Handshake },
  { href: '/metrics', label: 'Metrics', icon: BarChart3 },
  { href: '/assessment/ota', label: 'Channel Pulse', icon: TrendingUp },
  { href: '/assessment/checkin', label: 'Check-in GMV', icon: Hotel },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/playbook', label: 'Playbook', icon: BookOpen },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/profile', label: 'Profile', icon: UserIcon },
]

const ACTIONS = [
  { label: 'Drop a Task',         hint: 'New task',         icon: Plus,        href: '/tasks?new=1' },
  { label: 'Start a Project',     hint: 'New project',      icon: Briefcase,   href: '/projects?new=1' },
  { label: 'Log a 1:1',           hint: 'New one-on-one',   icon: MessageSquare, href: '/one-on-ones?new=1' },
  { label: 'Capture a Note',      hint: 'Quick note',       icon: StickyNote,  event: 'kairos:open-note' },
  { label: 'Open a Loop',         hint: 'New follow-up',    icon: Target,      event: 'kairos:open-loop' },
]

const QUICK_FILTERS = [
  { label: 'Due Today',    icon: Clock, href: '/tasks?dueWindow=today' },
  { label: 'Overdue',      icon: Flame, href: '/tasks?dueWindow=overdue' },
  { label: 'Assigned to Me', icon: UserIcon, href: '/my-tasks' },
]

const TYPE_META: Record<Hit['type'], { icon: typeof Search; label: string; tint: string }> = {
  task:        { icon: CheckSquare,    label: 'Task',        tint: 'var(--primary)' },
  project:     { icon: FolderKanban,   label: 'Project',     tint: '#7c8a52' },
  person:      { icon: Users,          label: 'Person',      tint: '#c9a96e' },
  stakeholder: { icon: Handshake,      label: 'Stakeholder', tint: '#b07d4f' },
  loop:        { icon: Target,         label: 'Loop',        tint: '#9f5a8a' },
  note:        { icon: StickyNote,     label: 'Note',        tint: '#5b8aa0' },
}

const RECENTS_KEY = 'kairos:cmdk:recents'
const MAX_RECENTS = 6

type Recent = { href: string; label: string; type: 'page' | Hit['type']; subtitle?: string }

function loadRecents(): Recent[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.slice(0, MAX_RECENTS) : []
  } catch {
    return []
  }
}

function saveRecent(entry: Recent) {
  if (typeof window === 'undefined') return
  const current = loadRecents().filter((r) => r.href !== entry.href)
  current.unshift(entry)
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(current.slice(0, MAX_RECENTS)))
  } catch {
    // localStorage may be unavailable; recents simply won't persist.
  }
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [loading, setLoading] = useState(false)
  const [recents, setRecents] = useState<Recent[]>([])
  const router = useRouter()
  const reqIdRef = useRef(0)

  // ⌘K / Ctrl+K toggle + Esc to close
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open])

  // Load recents whenever we open
  useEffect(() => {
    if (open) setRecents(loadRecents())
    else {
      setSearch('')
      setHits([])
    }
  }, [open])

  // Parse mode + query
  const { mode, query } = useMemo(() => {
    const s = search.trim()
    if (s.startsWith('>')) return { mode: 'actions' as const, query: s.slice(1).trim() }
    if (s.startsWith('/')) return { mode: 'pages' as const, query: s.slice(1).trim() }
    return { mode: 'search' as const, query: s }
  }, [search])

  // Debounced fetch for universal search
  useEffect(() => {
    if (mode !== 'search') {
      setHits([])
      setLoading(false)
      return
    }
    if (!query) {
      setHits([])
      return
    }
    const myReq = ++reqIdRef.current
    setLoading(true)
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const body = await res.json().catch(() => ({ data: [] }))
        if (myReq !== reqIdRef.current) return
        setHits(Array.isArray(body.data) ? body.data : [])
      } catch {
        if (myReq === reqIdRef.current) setHits([])
      } finally {
        if (myReq === reqIdRef.current) setLoading(false)
      }
    }, 150)
    return () => window.clearTimeout(t)
  }, [query, mode])

  const close = useCallback(() => setOpen(false), [])

  const go = useCallback(
    (href: string, recent?: Recent) => {
      close()
      if (recent) saveRecent(recent)
      router.push(href)
    },
    [router, close],
  )

  const fireEvent = useCallback(
    (name: string) => {
      close()
      // QuickCapture listens on the window for these.
      window.dispatchEvent(new Event(name))
    },
    [close],
  )

  if (!open) return null

  const showEmptyState = mode === 'search' && !query
  const filteredPages = PAGES.filter((p) =>
    !query ? true : p.label.toLowerCase().includes(query.toLowerCase()),
  )
  const filteredActions = ACTIONS.filter((a) =>
    !query ? true : a.label.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(8,12,16,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={close}
      />

      {/* Palette */}
      <div className="fixed top-[12vh] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-3">
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--surface-container-lowest, var(--background))',
            border: '1px solid var(--surface-container)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.42), 0 0 0 1px rgba(201,169,110,0.12)',
          }}
        >
          <Command
            // We do our own filtering for hits; cmdk handles pages/actions filtering.
            shouldFilter={mode !== 'search'}
            className="[&_[cmdk-input-wrapper]]:border-none"
            label="Command palette"
          >
            {/* Input */}
            <div
              className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: '1px solid var(--surface-container)' }}
            >
              <Search size={16} style={{ color: 'var(--outline)' }} className="flex-shrink-0" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder={
                  mode === 'actions'
                    ? 'Run an action…'
                    : mode === 'pages'
                    ? 'Jump to page…'
                    : 'Search tasks, people, projects… or type / or >'
                }
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-[var(--outline)] outline-none border-none"
                autoFocus
              />
              <ModeBadge mode={mode} loading={loading} />
              <kbd
                className="hidden sm:flex items-center text-[10px] font-bold px-2 py-0.5 rounded"
                style={{
                  background: 'var(--surface-container-high)',
                  color: 'var(--on-surface-variant)',
                }}
              >
                ESC
              </kbd>
            </div>

            {/* Body */}
            <Command.List
              className="overflow-y-auto p-2"
              style={{ maxHeight: 'min(60vh, 480px)' }}
            >
              {/* Empty state: recents, quick filters, top actions */}
              {showEmptyState && (
                <>
                  {recents.length > 0 && (
                    <Group label="Recent" icon={History}>
                      {recents.map((r) => (
                        <Row
                          key={`recent-${r.href}`}
                          value={`recent ${r.label}`}
                          onSelect={() => go(r.href, r)}
                          icon={TYPE_META[r.type as Hit['type']]?.icon ?? ArrowRight}
                          tint={TYPE_META[r.type as Hit['type']]?.tint ?? 'var(--outline)'}
                          title={r.label}
                          subtitle={r.subtitle ?? (r.type === 'page' ? r.href : undefined)}
                          tag={r.type === 'page' ? 'Page' : TYPE_META[r.type as Hit['type']]?.label}
                        />
                      ))}
                    </Group>
                  )}

                  <Group label="Quick Filters" icon={Sparkles}>
                    {QUICK_FILTERS.map((f) => (
                      <Row
                        key={`qf-${f.href}`}
                        value={`filter ${f.label}`}
                        onSelect={() =>
                          go(f.href, { href: f.href, label: f.label, type: 'page' })
                        }
                        icon={f.icon}
                        tint="var(--primary)"
                        title={f.label}
                        tag="Filter"
                      />
                    ))}
                  </Group>

                  <Group label="Actions" icon={Plus}>
                    {ACTIONS.map((a) => (
                      <Row
                        key={`act-${a.label}`}
                        value={`action ${a.label}`}
                        onSelect={() =>
                          'event' in a && a.event
                            ? fireEvent(a.event)
                            : a.href
                            ? go(a.href, { href: a.href, label: a.label, type: 'page' })
                            : undefined
                        }
                        icon={a.icon}
                        tint="var(--primary)"
                        title={a.label}
                        subtitle={a.hint}
                      />
                    ))}
                  </Group>
                </>
              )}

              {/* Universal search results */}
              {mode === 'search' && query && hits.length === 0 && (
                <div className="py-10 text-center" style={{ color: 'var(--outline)' }}>
                  {loading ? (
                    <span className="text-xs tracking-wider uppercase font-bold">Searching…</span>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-sm">No matches for “{query}”</div>
                      <div className="text-[11px]">
                        Try a different word, or press{' '}
                        <kbd
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            background: 'var(--surface-container-high)',
                            color: 'var(--on-surface-variant)',
                          }}
                        >
                          /
                        </kbd>{' '}
                        to jump to a page.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mode === 'search' && query && hits.length > 0 && (
                <Group label="Results" icon={Search}>
                  {hits.map((h) => {
                    const meta = TYPE_META[h.type]
                    return (
                      <Row
                        key={`${h.type}-${h.id}`}
                        value={`${h.type} ${h.title} ${h.subtitle ?? ''}`}
                        onSelect={() =>
                          go(h.href, {
                            href: h.href,
                            label: h.title,
                            type: h.type,
                            subtitle: h.subtitle,
                          })
                        }
                        icon={meta.icon}
                        tint={meta.tint}
                        title={h.title}
                        subtitle={h.subtitle}
                        tag={meta.label}
                        metaRight={h.meta}
                      />
                    )
                  })}
                </Group>
              )}

              {/* Pages-only mode */}
              {mode === 'pages' && (
                <Group label="Pages" icon={ArrowRight}>
                  {filteredPages.map((p) => (
                    <Row
                      key={p.href}
                      value={`page ${p.label}`}
                      onSelect={() => go(p.href, { href: p.href, label: p.label, type: 'page' })}
                      icon={p.icon}
                      tint="var(--outline)"
                      title={p.label}
                      subtitle={p.href}
                    />
                  ))}
                </Group>
              )}

              {/* Actions-only mode */}
              {mode === 'actions' && (
                <Group label="Actions" icon={Plus}>
                  {filteredActions.map((a) => (
                    <Row
                      key={a.label}
                      value={`action ${a.label}`}
                      onSelect={() =>
                        'event' in a && a.event
                          ? fireEvent(a.event)
                          : a.href
                          ? go(a.href, { href: a.href, label: a.label, type: 'page' })
                          : undefined
                      }
                      icon={a.icon}
                      tint="var(--primary)"
                      title={a.label}
                      subtitle={a.hint}
                    />
                  ))}
                </Group>
              )}
            </Command.List>

            {/* Footer */}
            <div
              className="px-4 py-2.5 flex items-center justify-between gap-3 text-[10px]"
              style={{
                borderTop: '1px solid var(--surface-container)',
                color: 'var(--outline)',
              }}
            >
              <div className="flex items-center gap-3">
                <FooterKbd k="↑↓">navigate</FooterKbd>
                <FooterKbd k="↵">open</FooterKbd>
                <FooterKbd k="⌘K">toggle</FooterKbd>
              </div>
              <div className="flex items-center gap-2 opacity-80">
                <Hint k="/">pages</Hint>
                <span style={{ color: 'var(--outline)', opacity: 0.5 }}>·</span>
                <Hint k=">">actions</Hint>
                <span style={{ color: 'var(--outline)', opacity: 0.5 }}>·</span>
                <Hint k="?">shortcuts</Hint>
              </div>
            </div>
          </Command>
        </div>
      </div>
    </>
  )
}

// ─── Building blocks ─────────────────────────────────────────────────────────

function Group({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon: typeof Search
  children: React.ReactNode
}) {
  return (
    <Command.Group
      heading={
        <span className="inline-flex items-center gap-1.5">
          <Icon size={10} strokeWidth={2.25} />
          {label}
        </span>
      }
      className="mb-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-[var(--outline)] [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2"
    >
      {children}
    </Command.Group>
  )
}

function Row({
  value,
  onSelect,
  icon: Icon,
  tint,
  title,
  subtitle,
  tag,
  metaRight,
}: {
  value: string
  onSelect: () => void
  icon: typeof Search
  tint: string
  title: string
  subtitle?: string
  tag?: string
  metaRight?: string
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors data-[selected=true]:bg-[var(--surface-container)] data-[selected=true]:text-foreground"
      style={{ color: 'var(--on-surface)' }}
    >
      <span
        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
        style={{
          background: `color-mix(in srgb, ${tint} 14%, transparent)`,
          color: tint,
        }}
      >
        <Icon size={14} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{title}</div>
        {subtitle && (
          <div className="truncate text-[11px]" style={{ color: 'var(--outline)' }}>
            {subtitle}
          </div>
        )}
      </div>
      {metaRight && (
        <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--outline)' }}>
          {metaRight}
        </span>
      )}
      {tag && (
        <span
          className="text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
          style={{
            background: 'var(--surface-container-high)',
            color: 'var(--on-surface-variant)',
          }}
        >
          {tag}
        </span>
      )}
    </Command.Item>
  )
}

function ModeBadge({ mode, loading }: { mode: 'search' | 'pages' | 'actions'; loading: boolean }) {
  if (loading) {
    return (
      <span
        className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded animate-pulse"
        style={{ background: 'var(--surface-container-high)', color: 'var(--outline)' }}
      >
        …
      </span>
    )
  }
  if (mode === 'search') return null
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
      style={{ background: 'var(--primary)', color: 'var(--on-primary, var(--primary-foreground))' }}
    >
      {mode === 'pages' ? 'Pages' : 'Actions'}
    </span>
  )
}

function FooterKbd({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1">
      <kbd
        className="px-1.5 py-0.5 rounded text-[9px] font-bold"
        style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }}
      >
        {k}
      </kbd>
      {children}
    </span>
  )
}

function Hint({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1">
      <kbd
        className="px-1.5 py-0.5 rounded text-[9px] font-bold"
        style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }}
      >
        {k}
      </kbd>
      <span>{children}</span>
    </span>
  )
}
