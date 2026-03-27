'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  UserPlus,
  Trash2,
  Save,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Role = 'SUPER_ADMIN' | 'MANAGER' | 'SENIOR_IC' | 'DIRECT_REPORT' | 'EXEC_VIEWER' | 'GUEST'
type WorkspaceType = 'PLATFORM' | 'DEPARTMENT' | 'PROJECT' | 'PERSONAL'

interface WorkspaceMember {
  id: string
  userId: string
  role: Role
  joinedAt: string
  user: {
    id: string
    name: string
    email: string
    avatarUrl: string | null
  }
}

interface WorkspaceDetail {
  id: string
  name: string
  type: WorkspaceType
  description: string | null
  isArchived: boolean
  members: WorkspaceMember[]
}

interface AdminUser {
  id: string
  name: string
  email: string
  role: Role
}

interface KpiSettingRow {
  kpiKey: string
  visibleTo: Role[]
}

interface KpiOverrideRow {
  kpiKey: string
  isVisible: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const ROLES: Role[] = ['SUPER_ADMIN', 'MANAGER', 'SENIOR_IC', 'DIRECT_REPORT', 'EXEC_VIEWER', 'GUEST']

const KPI_KEYS = [
  { key: 'revenue_vs_target', label: 'Revenue vs Target' },
  { key: 'ota_gmv', label: 'OTA GMV' },
  { key: 'checkin_gmv', label: 'Check-in GMV' },
  { key: 'task_board', label: 'Task Board' },
  { key: 'team_pulse', label: 'Team Pulse' },
  { key: 'one_on_one_logs', label: '1:1 Logs' },
  { key: 'stakeholder_crm', label: 'Stakeholder CRM' },
  { key: 'cadence_manager', label: 'Cadence Manager' },
] as const

type KpiKey = typeof KPI_KEYS[number]['key']

function roleBadgeClass(type: WorkspaceType): string {
  const map: Record<WorkspaceType, string> = {
    PLATFORM: 'bg-blue-100 text-blue-700',
    DEPARTMENT: 'bg-purple-100 text-purple-700',
    PROJECT: 'bg-green-100 text-green-700',
    PERSONAL: 'bg-gray-100 text-gray-600',
  }
  return map[type]
}

function memberRoleBadge(role: Role): string {
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ─── Add Member Modal ─────────────────────────────────────────────────────────

function AddMemberModal({
  workspaceId,
  onClose,
  onSuccess,
}: {
  workspaceId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const { data: allUsers } = useSWR<AdminUser[]>('/api/admin/users', fetcher)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [role, setRole] = useState<Role>('DIRECT_REPORT')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const filtered = (allUsers ?? []).filter(
    (u) =>
      (u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())) &&
      search.length > 0
  )

  async function handleAdd() {
    if (!selectedUser) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/workspaces/${workspaceId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, role }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to add member')
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
        <h2 className="text-lg font-semibold text-foreground mb-4">Add Member</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Search Users</label>
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setSelectedUser(null)
              }}
            />
            {search && filtered.length > 0 && !selectedUser && (
              <div className="mt-1 border border-[var(--outline-variant)]/30 rounded-lg overflow-hidden shadow-sm">
                {filtered.slice(0, 6).map((u) => (
                  <button
                    key={u.id}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-container-low)] transition-colors flex items-center gap-2"
                    onClick={() => {
                      setSelectedUser(u)
                      setSearch(u.name)
                    }}
                  >
                    <span className="size-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium shrink-0">
                      {initials(u.name)}
                    </span>
                    <div>
                      <div className="font-medium text-foreground">{u.name}</div>
                      <div className="text-xs text-[var(--outline)]">{u.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedUser && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--surface-container-low)]">
              <span className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium shrink-0">
                {initials(selectedUser.name)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{selectedUser.name}</div>
                <div className="text-xs text-[var(--outline)] truncate">{selectedUser.email}</div>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Role in Workspace</label>
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button onClick={handleAdd} disabled={loading || !selectedUser} className="flex-1">
              {loading ? 'Adding…' : 'Add Member'}
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

// ─── Members Tab ──────────────────────────────────────────────────────────────

function MembersTab({
  workspace,
  onRefresh,
}: {
  workspace: WorkspaceDetail
  onRefresh: () => void
}) {
  const [showAddModal, setShowAddModal] = useState(false)

  async function removeMember(userId: string) {
    await fetch(`/api/admin/workspaces/${workspace.id}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <UserPlus className="size-4" />
          Add Member
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[var(--outline-variant)]/30">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--surface-container-low)] text-left">
              <th className="px-4 py-3 font-medium text-foreground">Member</th>
              <th className="px-4 py-3 font-medium text-foreground">Role</th>
              <th className="px-4 py-3 font-medium text-foreground">Joined</th>
              <th className="px-4 py-3 font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--outline-variant)]/20">
            {workspace.members.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[var(--outline)]">
                  No members yet
                </td>
              </tr>
            )}
            {workspace.members.map((member) => (
              <tr key={member.id} className="hover:bg-[var(--surface-container-low)]/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                      {initials(member.user.name)}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{member.user.name}</div>
                      <div className="text-xs text-[var(--outline)]">{member.user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${memberRoleBadge(member.role)}`}>
                    {roleLabel(member.role)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--outline)]">{formatDate(member.joinedAt)}</td>
                <td className="px-4 py-3">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => removeMember(member.user.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AddMemberModal
          workspaceId={workspace.id}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            onRefresh()
          }}
        />
      )}
    </div>
  )
}

// ─── KPI Settings Tab ─────────────────────────────────────────────────────────

function KpiSettingsTab({ workspaceId }: { workspaceId: string }) {
  const { data: allUsers } = useSWR<AdminUser[]>('/api/admin/users', fetcher)

  // Role-level KPI settings: kpiKey → set of roles
  const [settings, setSettings] = useState<Record<KpiKey, Set<Role>>>(
    () =>
      Object.fromEntries(
        KPI_KEYS.map(({ key }) => [key, new Set<Role>(ROLES)])
      ) as Record<KpiKey, Set<Role>>
  )

  // Accordion open state
  const [openKpi, setOpenKpi] = useState<KpiKey | null>(null)

  // Per-user overrides
  const [selectedUserId, setSelectedUserId] = useState('')
  const [overrides, setOverrides] = useState<Record<KpiKey, boolean>>(
    () => Object.fromEntries(KPI_KEYS.map(({ key }) => [key, true])) as Record<KpiKey, boolean>
  )

  const [savingSettings, setSavingSettings] = useState(false)
  const [savingOverrides, setSavingOverrides] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState('')
  const [overridesMsg, setOverridesMsg] = useState('')

  function toggleRoleForKpi(kpiKey: KpiKey, role: Role) {
    setSettings((prev) => {
      const next = new Set(prev[kpiKey])
      if (next.has(role)) next.delete(role)
      else next.add(role)
      return { ...prev, [kpiKey]: next }
    })
  }

  async function saveSettings() {
    setSavingSettings(true)
    setSettingsMsg('')
    try {
      const settingsPayload = KPI_KEYS.map(({ key }) => ({
        kpiKey: key,
        visibleTo: Array.from(settings[key]),
      }))
      const res = await fetch(`/api/admin/workspaces/${workspaceId}/kpi-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'settings', settings: settingsPayload }),
      })
      setSettingsMsg(res.ok ? 'Saved successfully' : 'Failed to save')
    } catch {
      setSettingsMsg('Network error')
    } finally {
      setSavingSettings(false)
      setTimeout(() => setSettingsMsg(''), 3000)
    }
  }

  async function saveOverrides() {
    if (!selectedUserId) return
    setSavingOverrides(true)
    setOverridesMsg('')
    try {
      const overridesPayload = KPI_KEYS.map(({ key }) => ({
        kpiKey: key,
        isVisible: overrides[key],
        userId: selectedUserId,
      }))
      const res = await fetch(`/api/admin/workspaces/${workspaceId}/kpi-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'overrides', overrides: overridesPayload }),
      })
      setOverridesMsg(res.ok ? 'Overrides saved' : 'Failed to save overrides')
    } catch {
      setOverridesMsg('Network error')
    } finally {
      setSavingOverrides(false)
      setTimeout(() => setOverridesMsg(''), 3000)
    }
  }

  return (
    <div className="space-y-8">
      {/* Role-level settings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Role Visibility</h3>
          <div className="flex items-center gap-3">
            {settingsMsg && (
              <span className={`text-sm ${settingsMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {settingsMsg}
              </span>
            )}
            <Button size="sm" onClick={saveSettings} disabled={savingSettings}>
              <Save className="size-3.5" />
              {savingSettings ? 'Saving…' : 'Save KPI Settings'}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {KPI_KEYS.map(({ key, label }) => (
            <div
              key={key}
              className="border border-[var(--outline-variant)]/30 rounded-xl overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between px-4 py-3 bg-[var(--surface-container-low)] hover:bg-[var(--surface-container-low)]/80 transition-colors text-left"
                onClick={() => setOpenKpi(openKpi === key ? null : key)}
              >
                <span className="font-medium text-foreground text-sm">{label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--outline)]">
                    {settings[key].size} / {ROLES.length} roles
                  </span>
                  {openKpi === key ? (
                    <ChevronUp className="size-4 text-[var(--outline)]" />
                  ) : (
                    <ChevronDown className="size-4 text-[var(--outline)]" />
                  )}
                </div>
              </button>
              {openKpi === key && (
                <div className="px-4 py-4 bg-white grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ROLES.map((role) => (
                    <label key={role} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="size-4 rounded accent-primary cursor-pointer"
                        checked={settings[key].has(role)}
                        onChange={() => toggleRoleForKpi(key, role)}
                      />
                      <span className="text-sm text-foreground">{roleLabel(role)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Per-user overrides */}
      <div>
        <h3 className="font-semibold text-foreground mb-4">Per-User Overrides</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Select User</label>
            <select
              className="w-full max-w-sm h-10 rounded-lg bg-[var(--surface-container-low)] px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Choose a user…</option>
              {(allUsers ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          {selectedUserId && (
            <>
              <div className="rounded-xl border border-[var(--outline-variant)]/30 overflow-hidden">
                {KPI_KEYS.map(({ key, label }, idx) => (
                  <div
                    key={key}
                    className={`flex items-center justify-between px-4 py-3 ${idx !== 0 ? 'border-t border-[var(--outline-variant)]/20' : ''} hover:bg-[var(--surface-container-low)]/40 transition-colors`}
                  >
                    <span className="text-sm text-foreground">{label}</span>
                    <button
                      role="switch"
                      aria-checked={overrides[key]}
                      onClick={() =>
                        setOverrides((prev) => ({ ...prev, [key]: !prev[key] }))
                      }
                      className={`relative inline-flex h-6 w-11 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none ${
                        overrides[key] ? 'bg-primary' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block size-4 rounded-full bg-white shadow transform transition-transform duration-200 mt-1 ${
                          overrides[key] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                {overridesMsg && (
                  <span className={`text-sm ${overridesMsg.includes('saved') ? 'text-green-600' : 'text-red-600'}`}>
                    {overridesMsg}
                  </span>
                )}
                <Button size="sm" onClick={saveOverrides} disabled={savingOverrides}>
                  <Save className="size-3.5" />
                  {savingOverrides ? 'Saving…' : 'Save Overrides'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function WorkspaceDetailClient({ workspaceId }: { workspaceId: string }) {
  const { data: workspace, mutate } = useSWR<WorkspaceDetail>(
    `/api/admin/workspaces/${workspaceId}`,
    fetcher
  )
  const [activeTab, setActiveTab] = useState<'members' | 'kpi'>('members')

  if (!workspace) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-[var(--surface-container-low)] animate-pulse rounded-lg" />
        <div className="h-64 bg-[var(--surface-container-low)] animate-pulse rounded-xl" />
      </div>
    )
  }

  const typeBadgeClass: Record<WorkspaceType, string> = {
    PLATFORM: 'bg-blue-100 text-blue-700',
    DEPARTMENT: 'bg-purple-100 text-purple-700',
    PROJECT: 'bg-green-100 text-green-700',
    PERSONAL: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/admin/workspaces"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--outline)] hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="size-4" />
          Back to Workspaces
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">{workspace.name}</h1>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${typeBadgeClass[workspace.type]}`}>
            {workspace.type}
          </span>
          {workspace.isArchived && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
              Archived
            </span>
          )}
        </div>
        {workspace.description && (
          <p className="mt-1.5 text-sm text-[var(--outline)]">{workspace.description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--outline-variant)]/30">
        {(['members', 'kpi'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-[var(--outline)] hover:text-foreground'
            }`}
          >
            {tab === 'members' ? 'Members' : 'KPI Settings'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'members' && (
        <MembersTab workspace={workspace} onRefresh={() => mutate()} />
      )}
      {activeTab === 'kpi' && <KpiSettingsTab workspaceId={workspaceId} />}
    </div>
  )
}
