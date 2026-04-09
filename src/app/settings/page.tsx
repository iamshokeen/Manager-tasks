'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { RefreshCw, Download, X, Plus, Users, ShieldCheck, ChevronDown, Trash2, BookOpen, Palette, Building2, Database, Zap, HelpCircle } from 'lucide-react'
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

// ─── Types ─────────────────────────────────────────────────────────────────────

interface NumberEntry {
  syncedAt?: string | null
}

interface NumbersData {
  weekly?: NumberEntry[]
  monthly?: NumberEntry[]
}

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

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
      <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
        Upload Targets CSV to update OTA and Check-in GMV targets.
      </p>
      <label className="flex items-center gap-3 cursor-pointer">
        <span
          className="px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ background: 'var(--primary)', color: '#f8f7ff' }}
        >
          {loading ? 'Uploading...' : 'Upload Targets CSV'}
        </span>
        <input type="file" accept=".csv" onChange={handleUpload} className="hidden" disabled={loading} />
      </label>
      {status && <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>{status}</p>}
    </div>
  )
}

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
      <p className="text-sm mb-4" style={{ color: 'var(--on-surface-variant)' }}>
        Manage department tags used across tasks and team members
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {departments.map(dept => (
          <span
            key={dept}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border"
            style={{
              background: 'rgba(0,83,219,0.08)',
              color: 'var(--on-primary-container, #0048bf)',
              borderColor: 'rgba(0,83,219,0.12)',
            }}
          >
            {dept}
            <button
              onClick={() => handleRemove(dept)}
              disabled={saving}
              className="hover:opacity-70 transition-opacity"
              aria-label={`Remove ${dept}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <button
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border-2 border-dashed transition-all hover:border-primary/40 hover:text-primary"
          style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }}
          onClick={() => {
            const val = prompt('New department name')
            if (val?.trim()) {
              setNewDept(val.trim())
            }
          }}
        >
          <Plus className="h-3 w-3" />
          Add Tag
        </button>
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
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm flex items-center gap-1.5" style={{ color: 'var(--on-surface-variant)' }}>
          <Users className="h-3.5 w-3.5" />
          Manage user accounts and roles for the command center
        </p>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add User
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {!users || users.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>No users found.</p>
        ) : (
          users.map(user => (
            <div
              key={user.id}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border"
              style={{
                background: 'var(--surface-container-low)',
                borderColor: 'rgba(169,180,185,0.2)',
              }}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-semibold truncate" style={{ color: 'var(--on-surface)' }}>
                  {user.name ?? '—'}
                </span>
                <span className="text-xs truncate" style={{ color: 'var(--on-surface-variant)' }}>{user.email}</span>
                {user.teamMember && (
                  <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                    Linked: {user.teamMember.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold"
                  style={
                    user.role === 'MANAGER'
                      ? { background: 'rgba(0,83,219,0.1)', color: 'var(--primary)', border: '1px solid rgba(0,83,219,0.15)' }
                      : { background: 'var(--surface-container)', color: 'var(--on-surface-variant)', border: '1px solid rgba(169,180,185,0.3)' }
                  }
                >
                  <ShieldCheck className="h-3 w-3" />
                  {user.role}
                </span>
                <button
                  onClick={() => openDeleteConfirm(user)}
                  className="transition-colors"
                  style={{ color: 'var(--on-surface-variant)' }}
                  aria-label={`Delete ${user.name ?? user.email}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

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

// ─── Section card component ────────────────────────────────────────────────────

interface SettingsSectionProps {
  title: string
  icon: string  // Material Symbol name
  children: React.ReactNode
  defaultOpen?: boolean
  danger?: boolean
}

function SettingsSection({ title, icon, children, defaultOpen = true, danger = false }: SettingsSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="flex flex-col gap-4">
      <div
        className="flex items-center justify-between pb-2 cursor-pointer"
        style={{ borderBottom: `1px solid ${danger ? 'rgba(159,64,61,0.2)' : 'var(--surface-container-highest)'}` }}
        onClick={() => setOpen(v => !v)}
      >
        <h3
          className="font-bold text-lg flex items-center gap-2"
          style={{ fontFamily: 'Manrope, sans-serif', color: danger ? 'var(--error)' : 'var(--on-surface)' }}
        >
          <span
            className="material-symbols-outlined"
            style={{ color: danger ? 'var(--error)' : 'var(--primary)', fontSize: '22px' }}
          >
            {icon}
          </span>
          {title}
        </h3>
        <span
          className="material-symbols-outlined transition-transform duration-200"
          style={{
            color: 'var(--outline)',
            fontSize: '22px',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          expand_more
        </span>
      </div>

      {open && (
        <div
          className="p-6 rounded-xl border"
          style={{
            background: danger ? 'rgba(159,64,61,0.03)' : 'var(--surface-container-lowest)',
            borderColor: danger ? 'rgba(159,64,61,0.1)' : 'rgba(169,180,185,0.1)',
            boxShadow: '0 8px 30px rgba(42,52,57,0.02)',
          }}
        >
          {children}
        </div>
      )}
    </section>
  )
}

// ─── Workspace Settings ────────────────────────────────────────────────────────

function WorkspaceSettings() {
  const [name, setName] = useState('Kairos Global')
  const [domain, setDomain] = useState('kairos-hq.com')
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Logo */}
      <div className="md:col-span-1 flex flex-col items-center gap-3 border-r pr-6" style={{ borderColor: 'rgba(169,180,185,0.1)' }}>
        <div
          className="relative group w-32 h-32 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed cursor-pointer"
          style={{ background: 'var(--surface-container-high)', borderColor: 'var(--outline-variant)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--outline)', opacity: 0.4 }}>
            domain
          </span>
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(42,52,57,0.4)' }}
          >
            <span className="material-symbols-outlined text-white" style={{ fontSize: '24px' }}>upload</span>
          </div>
        </div>
        <p className="text-xs font-medium uppercase tracking-widest text-center" style={{ color: 'var(--outline)' }}>Brand Mark</p>
      </div>
      {/* Fields */}
      <div className="md:col-span-2 flex flex-col gap-4 justify-center">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--on-surface-variant)' }}>
            Workspace Name
          </label>
          <input
            className="w-full rounded-lg px-4 py-2.5 text-sm font-medium border-none outline-none focus:ring-2 transition-all"
            style={{ background: 'var(--surface-container-low)', color: 'var(--on-surface)' }}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--on-surface-variant)' }}>
            Business Domain
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2" style={{ fontSize: '16px', color: 'var(--outline)' }}>
              language
            </span>
            <input
              className="w-full rounded-lg pl-9 pr-4 py-2.5 text-sm font-medium border-none outline-none focus:ring-2 transition-all"
              style={{ background: 'var(--surface-container-low)', color: 'var(--on-surface)' }}
              value={domain}
              onChange={e => setDomain(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SettingsPage ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: numbersData, mutate: mutateNumbers } = useSWR<NumbersData>('/api/numbers', fetcher)

  const [syncing, setSyncing] = useState(false)
  const [prepLoading, setPrepLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

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
        tasks, team, projects, stakeholders, oneOnOnes, cadences, reports, numbers,
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
    <div className="max-w-4xl pb-20">
      {/* Header */}
      <div className="mb-10">
        <h2
          className="text-3xl font-extrabold tracking-tight mb-1"
          style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' }}
        >
          Configuration
        </h2>
        <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Manage organization global parameters and visual presence.
        </p>
      </div>

      <div className="flex flex-col gap-10">
        {/* Workspace */}
        <SettingsSection title="Workspace Settings" icon="domain">
          <WorkspaceSettings />
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection title="Appearance" icon="palette">
          <p className="text-sm mb-5" style={{ color: 'var(--on-surface-variant)' }}>
            Choose a theme for the interface
          </p>
          <ThemeSelector />
        </SettingsSection>

        {/* Departments */}
        <SettingsSection title="Department Tags" icon="label">
          <DepartmentsCard />
        </SettingsSection>

        {/* Team Access */}
        <SettingsSection title="Team Access" icon="group">
          <TeamAccessCard />
        </SettingsSection>

        {/* Revenue Targets Upload */}
        <SettingsSection title="Revenue Targets (FY27)" icon="upload_file">
          <TargetsUpload />
        </SettingsSection>

        {/* Sheets Sync */}
        <SettingsSection title="Google Sheets Sync" icon="sync">
          <p className="text-sm mb-3" style={{ color: 'var(--on-surface-variant)' }}>
            Last synced: {lastSynced ? formatDate(lastSynced) : 'Never'}
          </p>
          <Button onClick={handleSheetsSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
          <p className="text-xs mt-2" style={{ color: 'var(--on-surface-variant)' }}>
            Configure SHEETS_SCRIPT_URL and SHEETS_SCRIPT_TOKEN in your environment.
          </p>
        </SettingsSection>

        {/* Automation */}
        <SettingsSection title="Run Automations" icon="bolt">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handlePrepTasks} disabled={prepLoading}>
              {prepLoading ? 'Generating...' : 'Generate Prep Tasks'}
            </Button>
          </div>
        </SettingsSection>

        {/* Help */}
        <SettingsSection title="Help & Onboarding" icon="help_outline" defaultOpen={false}>
          <p className="text-sm mb-4" style={{ color: 'var(--on-surface-variant)' }}>
            Relaunch the onboarding tour at any time. The tour adapts to your role.
          </p>
          <HelpSection />
        </SettingsSection>

        {/* Danger Zone */}
        <SettingsSection title="Danger Zone" icon="warning" danger>
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-6">
              <div className="flex-1">
                <h4 className="font-bold text-sm" style={{ color: 'var(--on-surface)' }}>Data Exportation</h4>
                <p className="text-xs mt-1" style={{ color: 'var(--on-surface-variant)' }}>
                  Request a permanent archive of all workspace activity and configuration files.
                </p>
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-5 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-highest)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-high)' }}
              >
                {exporting ? 'Exporting…' : 'Export Data'}
              </button>
            </div>
            <div className="h-px w-full" style={{ background: 'rgba(159,64,61,0.1)' }} />
            <div className="flex items-center justify-between gap-6">
              <div className="flex-1">
                <h4 className="font-bold text-sm" style={{ color: 'var(--error)' }}>Clear Workspace Environment</h4>
                <p className="text-xs mt-1" style={{ color: 'var(--on-surface-variant)' }}>
                  Irreversibly delete all temporary data, cache, and historical logs. This action cannot be undone.
                </p>
              </div>
              <button
                className="px-5 py-2 rounded-lg font-bold text-sm text-white shadow-sm transition-all active:scale-95"
                style={{ background: 'var(--error)' }}
                onClick={() => toast.error('This action is disabled in demo mode.')}
              >
                Clear Environment
              </button>
            </div>
          </div>
        </SettingsSection>
      </div>

      {/* Footer */}
      <div className="mt-10 pt-8 flex justify-end gap-3">
        <button
          className="px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors"
          style={{ color: 'var(--on-surface)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
        >
          Discard
        </button>
        <button
          className="px-8 py-2.5 rounded-lg font-bold text-sm shadow-lg transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, var(--primary), #0048c1)',
            color: 'var(--on-primary)',
            boxShadow: '0 4px 14px rgba(0,83,219,0.3)',
          }}
          onClick={() => toast.success('Settings saved')}
        >
          Save Changes
        </button>
      </div>
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
