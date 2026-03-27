'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Archive, ArchiveRestore, Users, ChevronRight } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type WorkspaceType = 'PLATFORM' | 'DEPARTMENT' | 'PROJECT' | 'PERSONAL'

interface Workspace {
  id: string
  name: string
  slug: string
  type: WorkspaceType
  description: string | null
  isArchived: boolean
  createdAt: string
  _count: { members: number }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const WORKSPACE_TYPES: WorkspaceType[] = ['PLATFORM', 'DEPARTMENT', 'PROJECT', 'PERSONAL']

function typeBadgeClass(type: WorkspaceType): string {
  const map: Record<WorkspaceType, string> = {
    PLATFORM: 'bg-blue-100 text-blue-700',
    DEPARTMENT: 'bg-purple-100 text-purple-700',
    PROJECT: 'bg-green-100 text-green-700',
    PERSONAL: 'bg-gray-100 text-gray-600',
  }
  return map[type]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── New Workspace Modal ──────────────────────────────────────────────────────

function NewWorkspaceModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<WorkspaceType>('DEPARTMENT')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, description: description || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to create workspace')
        return
      }
      onSuccess()
      onClose()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
        <h2 className="text-lg font-semibold text-foreground mb-4">New Workspace</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Name</label>
            <Input
              placeholder="e.g. Revenue Operations"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Type</label>
            <select
              className="w-full h-10 rounded-lg bg-[var(--surface-container-low)] px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              value={type}
              onChange={(e) => setType(e.target.value as WorkspaceType)}
            >
              {WORKSPACE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description (optional)</label>
            <textarea
              className="w-full rounded-lg bg-[var(--surface-container-low)] px-3 py-2.5 text-sm text-foreground placeholder:text-[var(--outline)] focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              rows={3}
              placeholder="What is this workspace for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating…' : 'Create Workspace'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Workspace Card ───────────────────────────────────────────────────────────

function WorkspaceCard({
  workspace,
  onToggleArchive,
}: {
  workspace: Workspace
  onToggleArchive: () => void
}) {
  return (
    <div className={`bg-white rounded-xl border border-[var(--outline-variant)]/30 p-5 shadow-sm hover:shadow-md transition-all ${workspace.isArchived ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground truncate">{workspace.name}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeBadgeClass(workspace.type)}`}>
              {workspace.type}
            </span>
            {workspace.isArchived && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                Archived
              </span>
            )}
          </div>
          {workspace.description && (
            <p className="mt-1 text-sm text-[var(--outline)] line-clamp-2">{workspace.description}</p>
          )}
          <div className="mt-3 flex items-center gap-4 text-xs text-[var(--outline)]">
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              {workspace._count.members} members
            </span>
            <span>Created {formatDate(workspace.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onToggleArchive}
            title={workspace.isArchived ? 'Unarchive' : 'Archive'}
          >
            {workspace.isArchived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
          </Button>
          <Link href={`/dashboard/admin/workspaces/${workspace.id}`}>
            <Button size="icon-sm" variant="ghost">
              <ChevronRight className="size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function WorkspacesClient() {
  const { data, mutate } = useSWR<Workspace[]>('/api/admin/workspaces', fetcher)
  const [showModal, setShowModal] = useState(false)

  const workspaces = data ?? []

  async function toggleArchive(workspace: Workspace) {
    await fetch(`/api/admin/workspaces/${workspace.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isArchived: !workspace.isArchived }),
    })
    mutate()
  }

  const active = workspaces.filter((w) => !w.isArchived)
  const archived = workspaces.filter((w) => w.isArchived)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workspaces</h1>
          <p className="text-sm text-[var(--outline)] mt-0.5">Manage workspaces and their members</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="size-4" />
          New Workspace
        </Button>
      </div>

      {/* Active Workspaces */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-[var(--outline)] uppercase tracking-wider">
            Active ({active.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {active.map((w) => (
              <WorkspaceCard key={w.id} workspace={w} onToggleArchive={() => toggleArchive(w)} />
            ))}
          </div>
        </div>
      )}

      {/* Archived Workspaces */}
      {archived.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-[var(--outline)] uppercase tracking-wider">
            Archived ({archived.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {archived.map((w) => (
              <WorkspaceCard key={w.id} workspace={w} onToggleArchive={() => toggleArchive(w)} />
            ))}
          </div>
        </div>
      )}

      {workspaces.length === 0 && (
        <div className="rounded-xl border border-[var(--outline-variant)]/30 py-16 text-center">
          <p className="text-foreground font-medium">No workspaces yet</p>
          <p className="text-sm text-[var(--outline)] mt-1">Create your first workspace to get started</p>
          <Button className="mt-4" onClick={() => setShowModal(true)}>
            <Plus className="size-4" />
            New Workspace
          </Button>
        </div>
      )}

      {showModal && (
        <NewWorkspaceModal
          onClose={() => setShowModal(false)}
          onSuccess={() => mutate()}
        />
      )}
    </div>
  )
}
