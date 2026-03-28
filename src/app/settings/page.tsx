'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { RefreshCw, Download, X, Plus, Users, ShieldCheck, ChevronDown, Trash2, BookOpen } from 'lucide-react'
import { useOnboarding } from '@/context/onboarding-context'
import { ThemeSelector } from '@/components/ui/theme-selector'
import { useDepartments } from '@/hooks/use-departments'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

// ─── CollapsibleSection ────────────────────────────────────────────────────────

function CollapsibleSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-card rounded-xl shadow-[var(--shadow-glass)] mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">{title}</h2>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

// ─── TargetsUpload ─────────────────────────────────────────────────────────────

function TargetsUpload() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setStatus(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/targets/upload', { method: 'POST', body: form })
      const json = await res.json()
      if (json.ok) setStatus('Targets uploaded successfully')
      else setStatus(`Error: ${json.error}`)
    } catch {
      setStatus('Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Upload Targets CSV to update OTA and Check-in GMV targets.</p>
      <label className="flex items-center gap-3 cursor-pointer">
        <span className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
          {loading ? 'Uploading...' : 'Upload Targets CSV'}
        </span>
        <input type="file" accept=".csv" onChange={handleUpload} className="hidden" disabled={loading} />
      </label>
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </div>
  )
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface NumberEntry {
  syncedAt?: string | null
}

interface NumbersData {
  weekly?: NumberEntry[]
  monthly?: NumberEntry[]
}

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

// ─── DepartmentsCard ───────────────────────────────────────────────────────────

function DepartmentsCard() {
  const { departments, mutate } = useDepartments()
  const [newDept, setNewDept] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    const trimmed = newDept.trim()
    if (!trimmed || departments.includes(trimmed)) return
    const updated = [...departments, trimmed]
    setSaving(true)
    try {
      await fetch('/api/settings/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departments: updated }),
      })
      await mutate()
      setNewDept('')
      toast.success('Department added')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(dept: string) {
    const updated = departments.filter(d => d !== dept)
    setSaving(true)
    try {
      await fetch('/api/settings/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departments: updated }),
      })
      await mutate()
      toast.success('Department removed')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <p className="text-xs text-muted-foreground mb-4">Manage department tags used across tasks and team members</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {departments.map(dept => (
          <span
            key={dept}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-foreground border border-border"
          >
            {dept}
            <button
              onClick={() => handleRemove(dept)}
              disabled={saving}
              className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={`Remove ${dept}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="New department name…"
          value={newDept}
          onChange={e => setNewDept(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          className="max-w-xs"
        />
        <Button size="sm" onClick={handleAdd} disabled={saving || !newDept.trim()}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
    </>
  )
}

// ─── TeamAccessCard ────────────────────────────────────────────────────────────

interface UserRecord {
  id: string
  email: string
  name: string | null
  role: string
  teamMemberId: string | null
  teamMember: { name: string } | null
}

interface TeamMember {
  id: string
  name: string
}

interface AddUserForm {
  name: string
  email: string
  password: string
  role: 'MANAGER' | 'JUNIOR'
  teamMemberId: string
}

const EMPTY_USER_FORM: AddUserForm = {
  name: '',
  email: '',
  password: '',
  role: 'JUNIOR',
  teamMemberId: '',
}

function TeamAccessCard() {
  const { data: users, mutate: mutateUsers } = useSWR<UserRecord[]>('/api/users', (url: string) =>
    fetch(url).then(r => r.json()).then(r => r.data ?? [])
  )
  const { data: membersData } = useSWR<TeamMember[]>('/api/team', (url: string) =>
    fetch(url).then(r => r.json()).then(r => r.data ?? [])
  )
  const members: TeamMember[] = membersData ?? []

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<AddUserForm>(EMPTY_USER_FORM)
  const [submitting, setSubmitting] = useState(false)

  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [deleteUserName, setDeleteUserName] = useState<string>('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error('Name, email, and password are required')
      return
    }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      }
      if (form.teamMemberId) body.teamMemberId = form.teamMemberId

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create user')
      await mutateUsers()
      setAddOpen(false)
      setForm(EMPTY_USER_FORM)
      toast.success('User created')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  function openDeleteConfirm(user: UserRecord) {
    setDeleteUserId(user.id)
    setDeleteUserName(user.name ?? user.email)
    setDeleteConfirmOpen(true)
  }

  async function handleDeleteUser() {
    if (!deleteUserId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/users/${deleteUserId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete user')
      await mutateUsers()
      setDeleteConfirmOpen(false)
      setDeleteUserId(null)
      toast.success('User deleted')
    } catch {
      toast.error('Failed to delete user')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Manage user accounts and roles for the command center
        </p>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add User
        </Button>
      </div>

      <div className="flex flex-col gap-2 mt-4">
        {!users || users.length === 0 ? (
          <p className="text-xs text-muted-foreground">No users found.</p>
        ) : (
          users.map(user => (
            <div
              key={user.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5 border border-border rounded-lg"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">
                  {user.name ?? '—'}
                </span>
                <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                {user.teamMember && (
                  <span className="text-xs text-muted-foreground">
                    Linked: {user.teamMember.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={
                    user.role === 'MANAGER'
                      ? 'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                      : 'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700'
                  }
                >
                  <ShieldCheck className="h-3 w-3" />
                  {user.role}
                </span>
                <button
                  onClick={() => openDeleteConfirm(user)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={`Delete ${user.name ?? user.email}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add User Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Name *</label>
              <Input
                placeholder="Full name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email *</label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Password *</label>
              <Input
                type="password"
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <Select
                  value={form.role}
                  onValueChange={v => setForm(f => ({ ...f, role: (v as 'MANAGER' | 'JUNIOR') ?? 'JUNIOR' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="JUNIOR">Junior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Team Member</label>
                <Select
                  value={form.teamMemberId}
                  onValueChange={v => setForm(f => ({ ...f, teamMemberId: v ?? '' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAddOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete User"
        description={`Are you sure you want to delete "${deleteUserName}"? This action cannot be undone.`}
        onConfirm={handleDeleteUser}
        loading={deleting}
      />
    </>
  )
}

// ─── SettingsPage ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: numbersData, mutate: mutateNumbers } = useSWR<NumbersData>('/api/numbers', fetcher)

  const [syncing, setSyncing] = useState(false)
  const [prepLoading, setPrepLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Find most recent syncedAt across all entries
  const allEntries: NumberEntry[] = [
    ...(numbersData?.weekly ?? []),
    ...(numbersData?.monthly ?? []),
  ]
  const lastSynced = allEntries
    .map(e => e.syncedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] ?? null

  async function handleSheetsSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/numbers/sync', { method: 'POST' })
      const json = await res.json()
      const count = json.data?.synced ?? json.synced ?? 0
      toast.success(`Synced ${count} records from Sheets`)
      mutateNumbers()
    } catch {
      toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function handlePrepTasks() {
    setPrepLoading(true)
    try {
      const res = await fetch('/api/cadence')
      const json = await res.json()
      const cadences: { id: string }[] = json.data ?? []
      let total = 0
      for (const cadence of cadences) {
        const r = await fetch('/api/cadence/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cadenceId: cadence.id }),
        })
        const j = await r.json()
        total += j.data?.created ?? j.created ?? 0
      }
      toast.success(`${total} prep tasks generated`)
    } catch {
      toast.error('Failed to generate prep tasks')
    } finally {
      setPrepLoading(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const [tasks, team, projects, stakeholders, oneOnOnes, cadences, reports, numbers] =
        await Promise.all([
          fetch('/api/tasks').then(r => r.json()),
          fetch('/api/team').then(r => r.json()),
          fetch('/api/projects').then(r => r.json()),
          fetch('/api/stakeholders').then(r => r.json()),
          fetch('/api/one-on-ones').then(r => r.json()),
          fetch('/api/cadence').then(r => r.json()),
          fetch('/api/reports').then(r => r.json()),
          fetch('/api/numbers').then(r => r.json()),
        ])
      const exportData = {
        tasks,
        team,
        projects,
        stakeholders,
        oneOnOnes,
        cadences,
        reports,
        numbers,
        exportedAt: new Date().toISOString(),
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lohono-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export downloaded')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Settings" description="Configuration, sync, and automation controls" />

      {/* Appearance */}
      <CollapsibleSection title="Appearance">
        <p className="text-xs text-muted-foreground mb-5">Choose a theme for the interface</p>
        <ThemeSelector />
      </CollapsibleSection>

      {/* Departments */}
      <CollapsibleSection title="Departments">
        <DepartmentsCard />
      </CollapsibleSection>

      {/* Team Access */}
      <CollapsibleSection title="Team Access">
        <TeamAccessCard />
      </CollapsibleSection>

      {/* Revenue Targets Upload */}
      <CollapsibleSection title="Revenue Targets (FY27)">
        <TargetsUpload />
      </CollapsibleSection>

      {/* Sheets Sync */}
      <CollapsibleSection title="Google Sheets Sync">
        <p className="text-xs text-muted-foreground mb-3">
          Last synced: {lastSynced ? formatDate(lastSynced) : 'Never'}
        </p>
        <Button onClick={handleSheetsSync} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Configure SHEETS_SCRIPT_URL and SHEETS_SCRIPT_TOKEN in your environment.
        </p>
      </CollapsibleSection>

      {/* Automation */}
      <CollapsibleSection title="Run Automations">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handlePrepTasks} disabled={prepLoading}>
            {prepLoading ? 'Generating...' : 'Generate Prep Tasks'}
          </Button>
        </div>
      </CollapsibleSection>

      {/* Data Export */}
      <CollapsibleSection title="Data Export">
        <p className="text-xs text-muted-foreground mb-3">
          Download a full JSON backup of all your data.
        </p>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          <Download className="h-4 w-4 mr-2" />
          {exporting ? 'Exporting...' : 'Export All Data (JSON)'}
        </Button>
      </CollapsibleSection>

      {/* Help */}
      <CollapsibleSection title="Help" defaultOpen={false}>
        <p className="text-xs text-muted-foreground mb-4">
          Relaunch the onboarding tour at any time. The tour adapts to your role.
        </p>
        <HelpSection />
      </CollapsibleSection>
    </div>
  )
}

function HelpSection() {
  const { launch } = useOnboarding()
  return (
    <Button variant="outline" onClick={launch} className="gap-2">
      <BookOpen className="h-4 w-4" />
      Relaunch Tour
    </Button>
  )
}
