// src/components/layout/workspace-switcher.tsx
'use client'
import { useState } from 'react'
import { ChevronDown, Building2, Layers, FolderOpen, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/context/WorkspaceContext'

const TYPE_ICONS = {
  PLATFORM: Layers,
  DEPARTMENT: Building2,
  PROJECT: FolderOpen,
  PERSONAL: User,
}

const TYPE_LABELS = {
  PLATFORM: 'Platform',
  DEPARTMENT: 'Department',
  PROJECT: 'Project',
  PERSONAL: 'Personal',
}

export function WorkspaceSwitcher() {
  const { workspaces, currentWorkspace, setCurrentWorkspace, isLoading } = useWorkspace()
  const [open, setOpen] = useState(false)

  if (isLoading || !currentWorkspace) return null
  if (workspaces.length <= 1) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-[var(--outline)] px-2">
        <Layers size={14} />
        <span className="truncate max-w-[140px]">{currentWorkspace.name}</span>
      </div>
    )
  }

  const Icon = TYPE_ICONS[currentWorkspace.type as keyof typeof TYPE_ICONS] ?? Layers

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm text-[var(--foreground)] hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-white/40"
      >
        <Icon size={14} className="text-[var(--outline)]" />
        <span className="truncate max-w-[140px]">{currentWorkspace.name}</span>
        <ChevronDown size={12} className={cn('text-[var(--outline)] transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-lg shadow-lg border border-[var(--outline-variant)]/30 py-1 min-w-[200px]">
            {workspaces.map((ws) => {
              const WsIcon = TYPE_ICONS[ws.type as keyof typeof TYPE_ICONS] ?? Layers
              const isActive = ws.id === currentWorkspace.id
              return (
                <button
                  key={ws.id}
                  onClick={() => { setCurrentWorkspace(ws); setOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--surface-container-low)] transition-colors',
                    isActive && 'text-primary font-medium'
                  )}
                >
                  <WsIcon size={14} className="shrink-0 text-[var(--outline)]" />
                  <div className="min-w-0">
                    <div className="truncate">{ws.name}</div>
                    <div className="text-[10px] text-[var(--outline)] uppercase tracking-wide">
                      {TYPE_LABELS[ws.type as keyof typeof TYPE_LABELS] ?? ws.type}
                    </div>
                  </div>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
