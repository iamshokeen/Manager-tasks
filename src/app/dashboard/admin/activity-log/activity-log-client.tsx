'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RefreshCw } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActivityLogEntry {
  id: string
  action: string
  metadata: Record<string, unknown> | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
}

interface AdminUser {
  id: string
  name: string
  email: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_TYPES = [
  'user_approved',
  'user_rejected',
  'role_changed',
  'user_deactivated',
  'kpi_settings_updated',
  'workspace_member_added',
  'workspace_member_removed',
  'invite_accepted',
] as const

type ActionType = typeof ACTION_TYPES[number]

const ACTION_LABELS: Record<ActionType, string> = {
  user_approved: 'approved user',
  user_rejected: 'rejected user',
  role_changed: 'changed role',
  user_deactivated: 'deactivated user',
  kpi_settings_updated: 'updated KPI settings',
  workspace_member_added: 'added member to workspace',
  workspace_member_removed: 'removed member from workspace',
  invite_accepted: 'accepted invite',
}

const ACTION_COLORS: Record<ActionType, string> = {
  user_approved: 'bg-green-500',
  user_rejected: 'bg-red-500',
  role_changed: 'bg-blue-500',
  user_deactivated: 'bg-orange-500',
  kpi_settings_updated: 'bg-purple-500',
  workspace_member_added: 'bg-teal-500',
  workspace_member_removed: 'bg-rose-500',
  invite_accepted: 'bg-indigo-500',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fetcher(url: string) {
  return fetch(url).then((r) => r.json())
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action as ActionType] ?? action.replace(/_/g, ' ')
}

function actionDotColor(action: string): string {
  return ACTION_COLORS[action as ActionType] ?? 'bg-gray-400'
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function metadataSummary(metadata: Record<string, unknown> | null): string {
  if (!metadata) return ''
  const parts: string[] = []
  if (metadata.targetName) parts.push(String(metadata.targetName))
  if (metadata.workspaceName) parts.push(`in ${metadata.workspaceName}`)
  if (metadata.newRole) parts.push(`→ ${String(metadata.newRole).replace(/_/g, ' ')}`)
  if (metadata.reason) parts.push(`"${metadata.reason}"`)
  return parts.join(' ')
}

function buildApiUrl(filters: {
  userId: string
  action: string
  from: string
  to: string
}): string {
  const params = new URLSearchParams()
  if (filters.userId) params.set('userId', filters.userId)
  if (filters.action) params.set('action', filters.action)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  const qs = params.toString()
  return `/api/admin/activity-log${qs ? `?${qs}` : ''}`
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function ActivityLogClient() {
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    from: '',
    to: '',
  })
  const [appliedFilters, setAppliedFilters] = useState(filters)

  const apiUrl = buildApiUrl(appliedFilters)
  const { data, mutate, isLoading } = useSWR<ActivityLogEntry[]>(apiUrl, fetcher)
  const { data: usersData } = useSWR<AdminUser[]>('/api/admin/users', fetcher)

  const entries = data ?? []
  const users = usersData ?? []

  function applyFilters() {
    setAppliedFilters({ ...filters })
  }

  function resetFilters() {
    const empty = { userId: '', action: '', from: '', to: '' }
    setFilters(empty)
    setAppliedFilters(empty)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Activity Log</h1>
          <p className="text-sm text-[var(--outline)] mt-0.5">Audit trail of all admin actions</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      {/* Filter bar */}
      <div className="bg-[var(--surface-container-low)] rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* User filter */}
          <div>
            <label className="block text-xs font-medium text-[var(--outline)] mb-1">User</label>
            <select
              className="w-full h-9 rounded-lg bg-white px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 border border-[var(--outline-variant)]/30"
              value={filters.userId}
              onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
            >
              <option value="">All Users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action type filter */}
          <div>
            <label className="block text-xs font-medium text-[var(--outline)] mb-1">Action</label>
            <select
              className="w-full h-9 rounded-lg bg-white px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 border border-[var(--outline-variant)]/30"
              value={filters.action}
              onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
            >
              <option value="">All Actions</option>
              {ACTION_TYPES.map((a) => (
                <option key={a} value={a}>
                  {ACTION_LABELS[a]}
                </option>
              ))}
            </select>
          </div>

          {/* From date */}
          <div>
            <label className="block text-xs font-medium text-[var(--outline)] mb-1">From</label>
            <input
              type="date"
              className="w-full h-9 rounded-lg bg-white px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 border border-[var(--outline-variant)]/30"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            />
          </div>

          {/* To date */}
          <div>
            <label className="block text-xs font-medium text-[var(--outline)] mb-1">To</label>
            <input
              type="date"
              className="w-full h-9 rounded-lg bg-white px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 border border-[var(--outline-variant)]/30"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={applyFilters}>
            Apply Filters
          </Button>
          <Button size="sm" variant="ghost" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-[var(--surface-container-low)] animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-[var(--outline-variant)]/30 py-16 text-center">
          <p className="text-foreground font-medium">No activity found</p>
          <p className="text-sm text-[var(--outline)] mt-1">
            Try adjusting the filters or check back later
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-[var(--outline-variant)]/20" />

          <div className="space-y-1">
            {entries.map((entry, idx) => {
              const summary = metadataSummary(entry.metadata)
              return (
                <div
                  key={entry.id}
                  className="relative flex gap-4 pl-10 py-3 hover:bg-[var(--surface-container-low)] rounded-xl transition-colors group"
                >
                  {/* Dot */}
                  <div
                    className={`absolute left-3.5 top-5 size-3 rounded-full ring-2 ring-white ${actionDotColor(entry.action)}`}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="font-medium text-foreground text-sm">{entry.user.name}</span>
                      <span className="text-sm text-[var(--outline)]">{actionLabel(entry.action)}</span>
                      {summary && (
                        <span className="text-sm text-foreground/70">{summary}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-[var(--outline)]">{entry.user.email}</span>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="shrink-0 text-xs text-[var(--outline)] pt-0.5 whitespace-nowrap">
                    {timeAgo(entry.createdAt)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Result count */}
      {!isLoading && entries.length > 0 && (
        <p className="text-xs text-center text-[var(--outline)]">
          Showing {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </p>
      )}
    </div>
  )
}
