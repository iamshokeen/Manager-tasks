'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Role = 'SUPER_ADMIN' | 'MANAGER' | 'SENIOR_IC' | 'DIRECT_REPORT' | 'EXEC_VIEWER' | 'GUEST'

interface AccessRequest {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
}

interface Workspace {
  id: string
  name: string
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

function roleLabel(role: Role): string {
  return role.replace(/_/g, ' ')
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// ─── Approve Modal ────────────────────────────────────────────────────────────

function ApproveModal({
  request,
  workspaces,
  onClose,
  onSuccess,
}: {
  request: AccessRequest
  workspaces: Workspace[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [role, setRole] = useState<Role>(request.role)
  const [workspaceId, setWorkspaceId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleApprove() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/approvals/${request.id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, workspaceId: workspaceId || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to approve')
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
        <div className="flex items-center gap-3 mb-5">
          <div className="size-10 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="size-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Approve Access</h2>
            <p className="text-sm text-[var(--outline)]">{request.name} · {request.email}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Assign Role</label>
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
          <div className="flex gap-2 pt-1">
            <Button onClick={handleApprove} disabled={loading} className="flex-1">
              {loading ? 'Approving…' : 'Approve'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────

function RejectModal({
  request,
  onClose,
  onSuccess,
}: {
  request: AccessRequest
  onClose: () => void
  onSuccess: () => void
}) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleReject() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/approvals/${request.id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to reject')
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
        <div className="flex items-center gap-3 mb-5">
          <div className="size-10 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="size-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Reject Access</h2>
            <p className="text-sm text-[var(--outline)]">{request.name} · {request.email}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Reason (optional)</label>
            <textarea
              className="w-full rounded-lg bg-[var(--surface-container-low)] px-3 py-2.5 text-sm text-foreground placeholder:text-[var(--outline)] focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              rows={3}
              placeholder="Explain why this request is being rejected…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button variant="destructive" onClick={handleReject} disabled={loading} className="flex-1">
              {loading ? 'Rejecting…' : 'Reject Request'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({
  request,
  workspaces,
  onRefresh,
}: {
  request: AccessRequest
  workspaces: Workspace[]
  onRefresh: () => void
}) {
  const [modal, setModal] = useState<'approve' | 'reject' | null>(null)
  const initials = request.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <>
      <div className="bg-white rounded-xl border border-[var(--outline-variant)]/30 p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground truncate">{request.name}</div>
            <div className="text-sm text-[var(--outline)] truncate">{request.email}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeClass(request.role)}`}>
                {roleLabel(request.role)}
              </span>
              <span className="flex items-center gap-1 text-xs text-[var(--outline)]">
                <Clock className="size-3" />
                {timeAgo(request.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => setModal('approve')}>
            <CheckCircle className="size-3.5" />
            Approve
          </Button>
          <Button size="sm" variant="destructive" className="flex-1" onClick={() => setModal('reject')}>
            <XCircle className="size-3.5" />
            Reject
          </Button>
        </div>
      </div>

      {modal === 'approve' && (
        <ApproveModal
          request={request}
          workspaces={workspaces}
          onClose={() => setModal(null)}
          onSuccess={onRefresh}
        />
      )}
      {modal === 'reject' && (
        <RejectModal
          request={request}
          onClose={() => setModal(null)}
          onSuccess={onRefresh}
        />
      )}
    </>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function ApprovalsClient() {
  const { data, mutate, isLoading } = useSWR<AccessRequest[]>('/api/admin/approvals', fetcher)
  const { data: workspacesData } = useSWR<Workspace[]>('/api/admin/workspaces', fetcher)

  const requests = data ?? []
  const workspaces = workspacesData ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Access Requests</h1>
          {requests.length > 0 && (
            <span className="inline-flex items-center justify-center size-6 rounded-full bg-primary text-white text-xs font-semibold">
              {requests.length}
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-[var(--surface-container-low)] animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-[var(--outline-variant)]/30 py-16 text-center">
          <CheckCircle className="size-10 text-green-500 mx-auto mb-3" />
          <p className="text-foreground font-medium">All caught up</p>
          <p className="text-sm text-[var(--outline)] mt-1">No pending access requests</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              workspaces={workspaces}
              onRefresh={() => mutate()}
            />
          ))}
        </div>
      )}
    </div>
  )
}
