// src/components/ui/command-palette.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  LayoutDashboard, FolderKanban, CheckSquare, ListTodo, RefreshCw,
  Users, MessageSquare, Handshake, BarChart3, TrendingUp, Hotel,
  FileText, BookOpen, Settings, Plus, Search
} from 'lucide-react'

const PAGES = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, group: 'Navigate' },
  { href: '/projects', label: 'Projects', icon: FolderKanban, group: 'Navigate' },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare, group: 'Navigate' },
  { href: '/my-tasks', label: 'My Tasks', icon: ListTodo, group: 'Navigate' },
  { href: '/cadence', label: 'Cadence', icon: RefreshCw, group: 'Navigate' },
  { href: '/team', label: 'Team', icon: Users, group: 'Navigate' },
  { href: '/one-on-ones', label: '1:1s', icon: MessageSquare, group: 'Navigate' },
  { href: '/stakeholders', label: 'Stakeholders', icon: Handshake, group: 'Navigate' },
  { href: '/metrics', label: 'Metrics', icon: BarChart3, group: 'Navigate' },
  { href: '/assessment/ota', label: 'OTA Assessment', icon: TrendingUp, group: 'Navigate' },
  { href: '/assessment/checkin', label: 'Check-in GMV', icon: Hotel, group: 'Navigate' },
  { href: '/reports', label: 'Reports', icon: FileText, group: 'Navigate' },
  { href: '/playbook', label: 'Playbook', icon: BookOpen, group: 'Navigate' },
  { href: '/settings', label: 'Settings', icon: Settings, group: 'Navigate' },
]

const ACTIONS = [
  { label: 'New Task', icon: Plus, href: '/tasks?new=1', group: 'Actions' },
  { label: 'New Project', icon: Plus, href: '/projects?new=1', group: 'Actions' },
  { label: 'New 1:1', icon: Plus, href: '/one-on-ones?new=1', group: 'Actions' },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const router = useRouter()

  // Toggle on ⌘K or Ctrl+K
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const navigate = useCallback((href: string) => {
    setOpen(false)
    setSearch('')
    router.push(href)
  }, [router])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50 px-4">
        <div className="bg-card rounded-2xl shadow-2xl shadow-black/20 overflow-hidden border border-[var(--outline-variant)]/20">
          <Command shouldFilter={true} className="[&_[cmdk-input-wrapper]]:border-none">
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--outline-variant)]/15">
              <Search size={16} className="text-[var(--outline)] flex-shrink-0" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Search pages, actions…"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-[var(--outline)] outline-none border-none"
              />
              <kbd className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-[var(--outline)] bg-[var(--surface-container-high)] px-2 py-0.5 rounded">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <Command.List className="max-h-80 overflow-y-auto p-2">
              <Command.Empty className="py-8 text-center text-sm text-[var(--outline)]">
                No results found.
              </Command.Empty>

              {/* Actions */}
              <Command.Group
                heading="Actions"
                className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-[var(--outline)] [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {ACTIONS.map(item => (
                  <Command.Item
                    key={item.href}
                    value={item.label}
                    onSelect={() => navigate(item.href)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground cursor-pointer data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon size={14} className="text-primary" />
                    </div>
                    {item.label}
                  </Command.Item>
                ))}
              </Command.Group>

              {/* Navigation */}
              <Command.Group
                heading="Navigate"
                className="mt-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-[var(--outline)] [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {PAGES.map(page => (
                  <Command.Item
                    key={page.href}
                    value={page.label}
                    onSelect={() => navigate(page.href)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--outline)] cursor-pointer data-[selected=true]:bg-[var(--surface-container-low)] data-[selected=true]:text-foreground transition-colors"
                  >
                    <page.icon size={16} strokeWidth={1.5} className="flex-shrink-0" />
                    {page.label}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>

            {/* Footer hint */}
            <div className="px-4 py-2.5 border-t border-[var(--outline-variant)]/10 flex items-center gap-3">
              <span className="text-[10px] text-[var(--outline)] flex items-center gap-1">
                <kbd className="bg-[var(--surface-container-high)] px-1.5 py-0.5 rounded text-[9px] font-semibold">↑↓</kbd>
                navigate
              </span>
              <span className="text-[10px] text-[var(--outline)] flex items-center gap-1">
                <kbd className="bg-[var(--surface-container-high)] px-1.5 py-0.5 rounded text-[9px] font-semibold">↵</kbd>
                open
              </span>
              <span className="text-[10px] text-[var(--outline)] flex items-center gap-1">
                <kbd className="bg-[var(--surface-container-high)] px-1.5 py-0.5 rounded text-[9px] font-semibold">⌘K</kbd>
                toggle
              </span>
            </div>
          </Command>
        </div>
      </div>
    </>
  )
}
