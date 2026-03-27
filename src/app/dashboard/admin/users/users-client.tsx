'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { UserPlus, RefreshCw, Send, XCircle } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Role = 'SUPER_ADMIN' | 'MANAGER' | 'SENIOR_IC' | 'DIRECT_REPORT' | 'EXEC_VIEWER' | 'GUEST'
type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type InviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED'

interface AdminUser {
  id: string
  name: string
  email: string
  role: Role
  approvalStatus: ApprovalStatus
  isActive: boolean
  lastLoginAt: string | null
  workspaceMemberships: { workspace: { name: string } }[]
}

interface Workspace {
  id: string
  name: string
  type: string
}

interface Invite {
  id: string
  email: string
  role: Role
  workspace: { name: string } | null
  status: InviteStatus
  createdAt: string
  expiresAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json()).then((r) => r.data)

const ROLES: Role[] = ['SUPER_ADMIN', 'MANAGER', 'SENIOR_IC', 'DIRECT_REPORT', 'EXEC_VIEWER', 'GUEST']

function roleBadgeClass(role: Role): string {
  const map: Record<Role, string> = {
    SUPER_ADMIN: 'bg-indigo-100 text-indigo-700',
    MANAGER: 'bg-blue-100 text-blue-700',
    SENIOR_IC: 'bg-purple-100 text-purple-700',
    DIRECT_REPORT: 'bg-green-100 text-green-700',
    EXEC_VIEWER: 'bg-orange-100 text-orange-700',
    GUEST: 'bg-gray-100 text-gray-600',
  }
  return map[role]
}

function statusBadgeClass(status: ApprovalStatus | InviteStatus): string {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    ACCEPTED: 'bg-green-100 text-green-700',
    EXPIRED: 'bg-gray-100 text-gray-500',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function roleLabel(role: Role): string {
  return role.replace(/_/g, ' ')
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

function InviteModal({
  workspaces,
  onClose,
  onSuccess,
}: {
  workspaces: Workspace[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('DIRECT_REPORT')
  const [workspaceId, setWorkspaceId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, workspaceId: workspaceId || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to send invite')
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
        <h2 className="text-lg font-semibold text-foreground mb-4">Invite User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
            <Input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Role</label>
            <select
              className="w-full h-10 rounded-lg bg-[var(--surface-container-low)] px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Workspace (optional)</label>
            <select
              className="w-full h-10 rounded-lg bg-[var(--surface-container-low)] px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
            >
              <option value="">None</option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Sending…' : 'Send Invite'}
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

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab({
  workspaces,
  onOpenInvite,
}: {
  workspaces: Workspace[]
  onOpenInvite: () => void
}) {
  const { data, mutate } = useSWR<AdminUser[]>('/api/admin/users', fetcher)
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'ALL'>('ALL')

  const users = data ?? []

  const filtered = users.filter((u) => {
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter
    const matchStatus = statusFilter === 'ALL' || u.approvalStatus === statusFilter
    return matchRole && matchStatus
  })

  async function patchUser(id: string, body: Record<string, unknown>) {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    mutate()
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          className="h-9 rounded-lg bg-[var(--surface-container-low)] px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Role | 'ALL')}
        >
          <option value="ALL">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-lg bg-[var(--surface-container-low)] px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ApprovalStatus | 'ALL')}
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <span className="ml-auto text-sm text-[var(--outline)]">{filtered.length} users</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--outline-variant)]/30">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--surface-container-low)] text-left">
              <th className="px-4 py-3 font-medium text-foreground">Name / Email</th>
              <th className="px-4 py-3 font-medium text-foreground">Role</th>
              <th className="px-4 py-3 font-medium text-foreground">Status</th>
              <th className="px-4 py-3 font-medium text-foreground">Last Login</th>
              <th className="px-4 py-3 font-medium text-foreground">Workspaces</th>
              <th className="px-4 py-3 font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--outline-variant)]/20">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--outline)]">
                  No users found
                </td>
              </tr>
            )}
            {filtered.map((user) => (
              <tr key={user.id} className="hover:bg-[var(--surface-container-low)]/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{user.name}</div>
                  <div className="text-xs text-[var(--outline)]">{user.email}</div>
                </td>
                <td className="px-4 py-3">
                  <select
                    className={`text-xs font-medium px-2 py-1 rounded-full cursor-pointer border-0 outline-none ${roleBadgeClass(user.role)}`}
                    value={user.role}
                    onChange={(e) => patchUser(user.id, { role: e.target.value })}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {roleLabel(r)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(user.approvalStatus)}`}>
                    {user.approvalStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--outline)] text-xs">{formatDate(user.lastLoginAt)}</td>
                <td className="px-4 py-3 text-[var(--outline)] text-xs">
                  {user.workspaceMemberships.length > 0
                    ? user.workspaceMemberships.map((m) => m.workspace.name).join(', ')
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <Button
                    size="xs"
                    variant={user.isActive ? 'destructive' : 'outline'}
                    onClick={() => patchUser(user.id, { isActive: !user.isActive })}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Invites Tab ──────────────────────────────────────────────────────────────

function InvitesTab() {
  const { data, mutate } = useSWR<Invite[]>('/api/admin/invites', fetcher)
  const invites = data ?? []

  async function handleInviteAction(inviteId: string, action: 'resend' | 'revoke') {
    await fetch('/api/admin/invites', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId, action }),
    })
    mutate()
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--outline-variant)]/30">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--surface-container-low)] text-left">
            <th className="px-4 py-3 font-medium text-foreground">Email</th>
            <th className="px-4 py-3 font-medium text-foreground">Role</th>
            <th className="px-4 py-3 font-medium text-foreground">Workspace</th>
            <th className="px-4 py-3 font-medium text-foreground">Status</th>
            <th className="px-4 py-3 font-medium text-foreground">Sent</th>
            <th className="px-4 py-3 font-medium text-foreground">Expires</th>
            <th className="px-4 py-3 font-medium text-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--outline-variant)]/20">
          {invites.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-[var(--outline)]">
                No invites sent yet
              </td>
            </tr>
          )}
          {invites.map((invite) => (
            <tr key={invite.id} className="hover:bg-[var(--surface-container-low)]/50 transition-colors">
              <td className="px-4 py-3 text-foreground">{invite.email}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeClass(invite.role)}`}>
                  {roleLabel(invite.role)}
                </span>
              </td>
              <td className="px-4 py-3 text-[var(--outline)] text-xs">{invite.workspace?.name ?? '—'}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(invite.status)}`}>
                  {invite.status}
                </span>
              </td>
              <td className="px-4 py-3 text-[var(--outline)] text-xs">{formatDate(invite.createdAt)}</td>
              <td className="px-4 py-3 text-[var(--outline)] text-xs">{formatDate(invite.expiresAt)}</td>
              <td className="px-4 py-3">
                {invite.status === 'PENDING' && (
                  <div className="flex gap-1.5">
                    <Button size="xs" variant="outline" onClick={() => handleInviteAction(invite.id, 'resend')}>
                      <Send className="size-3" />
                      Resend
                    </Button>
                    <Button size="xs" variant="destructive" onClick={() => handleInviteAction(invite.id, 'revoke')}>
                      <XCircle className="size-3" />
                      Revoke
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function UsersClient() {
  const [activeTab, setActiveTab] = useState<'users' | 'invites'>('users')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const { data: workspacesData, mutate: mutateWorkspaces } = useSWR<Workspace[]>('/api/admin/workspaces', fetcher)
  const workspaces = workspacesData ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-[var(--outline)] mt-0.5">Manage user accounts, roles, and invites</p>
        </div>
        <Button onClick={() => setShowInviteModal(true)}>
          <UserPlus className="size-4" />
          Invite User
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--outline-variant)]/30">
        {(['users', 'invites'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-[var(--outline)] hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <UsersTab workspaces={workspaces} onOpenInvite={() => setShowInviteModal(true)} />
      )}
      {activeTab === 'invites' && <InvitesTab />}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          workspaces={workspaces}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => mutateWorkspaces()}
        />
      )}
    </div>
  )
}
