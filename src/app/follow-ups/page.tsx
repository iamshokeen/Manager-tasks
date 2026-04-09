'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useCurrentUser } from '@/hooks/use-current-user'
import { toast } from 'sonner'
import { formatDistanceToNow, isPast, addDays, format } from 'date-fns'
import {
  BellOff, CheckCircle2, RotateCcw, Trash2,
  GitBranch, Link2, Wand2, ExternalLink
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
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
import { cn } from '@/lib/utils'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

// ─── Types ───────────────────────────────────────────────────────────────────

interface FollowUpNote {
  id: string
  content: string
  authorName: string | null
  createdAt: string
}

interface FollowUpChild {
  id: string
  title: string
  contactName: string
  status: string
  reminderAt: string | null
  snoozedUntil: string | null
  autoRemind: boolean
  lastActivityAt: string
  teamMember: { id: string; name: string } | null
  stakeholder: { id: string; name: string } | null
  notes: FollowUpNote[]
  _count?: { children: number }
  children?: FollowUpChild[]
}

interface FollowUp extends FollowUpChild {
  description: string | null
  task: { id: string; title: string; status: string } | null
  project: { id: string; title: string; stage: string } | null
  convertedTaskId: string | null
  children: FollowUpChild[]
}

interface TeamMember { id: string; name: string; department: string }
interface Stakeholder { id: string; name: string }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function needsAttention(fu: FollowUpChild): boolean {
  if (fu.status !== 'open') return false
  if (fu.snoozedUntil && !isPast(new Date(fu.snoozedUntil))) return false
  if (fu.reminderAt && isPast(new Date(fu.reminderAt))) return true
  if (fu.autoRemind && isPast(addDays(new Date(fu.lastActivityAt), 1))) return true
  return false
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function formatReminderDate(fu: FollowUpChild): { label: string; value: string; overdue: boolean } {
  if (fu.status === 'closed' || fu.status === 'converted') {
    return { label: 'Completed', value: formatDistanceToNow(new Date(fu.lastActivityAt), { addSuffix: true }), overdue: false }
  }
  if (fu.snoozedUntil) {
    return { label: 'Snooze Until', value: format(new Date(fu.snoozedUntil), 'MMM d'), overdue: false }
  }
  if (fu.reminderAt) {
    const overdue = isPast(new Date(fu.reminderAt))
    return { label: overdue ? 'Overdue' : 'Reminder', value: overdue ? 'Yesterday' : format(new Date(fu.reminderAt), 'MMM d, yyyy'), overdue }
  }
  return { label: 'Last Active', value: formatDistanceToNow(new Date(fu.lastActivityAt), { addSuffix: true }), overdue: false }
}

function StatusPill({ status }: { status: string }) {
  const configs: Record<string, { bg: string; color: string; label: string }> = {
    open: { bg: 'rgba(248,160,16,0.2)', color: 'var(--tertiary)', label: 'Open' },
    snoozed: { bg: 'rgba(169,180,185,0.15)', color: 'var(--outline)', label: 'Snoozed' },
    closed: { bg: 'rgba(213,227,252,0.3)', color: 'var(--secondary)', label: 'Done' },
    converted: { bg: 'rgba(213,227,252,0.3)', color: 'var(--secondary)', label: 'Converted' },
  }
  const cfg = configs[status] ?? configs.open
  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}

// ─── Create / Edit dialog ─────────────────────────────────────────────────────

interface CreateForm {
  title: string
  description: string
  contactName: string
  teamMemberId: string
  stakeholderId: string
  reminderAt: string
  autoRemind: boolean
  taskId: string
  projectId: string
  parentId: string
}

const EMPTY_FORM: CreateForm = {
  title: '', description: '', contactName: '', teamMemberId: '',
  stakeholderId: '', reminderAt: '', autoRemind: true, taskId: '',
  projectId: '', parentId: '',
}

function CreateFollowUpDialog({
  open, onOpenChange, onCreated, members, stakeholders, tasks, projects, parentId, parentTitle,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: () => void
  members: TeamMember[]
  stakeholders: Stakeholder[]
  tasks: { id: string; title: string }[]
  projects: { id: string; title: string }[]
  parentId?: string
  parentTitle?: string
}) {
  const [form, setForm] = useState<CreateForm>({ ...EMPTY_FORM, parentId: parentId ?? '' })
  const [saving, setSaving] = useState(false)

  function reset() { setForm({ ...EMPTY_FORM, parentId: parentId ?? '' }) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.contactName.trim()) {
      toast.error('Title and contact are required')
      return
    }
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        contactName: form.contactName.trim(),
        autoRemind: form.autoRemind,
      }
      if (form.teamMemberId) body.teamMemberId = form.teamMemberId
      if (form.stakeholderId) body.stakeholderId = form.stakeholderId
      if (form.reminderAt) body.reminderAt = new Date(form.reminderAt).toISOString()
      if (form.taskId) body.taskId = form.taskId
      if (form.projectId) body.projectId = form.projectId
      if (form.parentId) body.parentId = form.parentId

      const res = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed')
      onCreated()
      onOpenChange(false)
      reset()
      toast.success('Follow-up created')
    } catch {
      toast.error('Failed to create follow-up')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) reset() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface-container-lowest)' }}>
        <DialogHeader>
          <DialogTitle>
            {parentTitle ? `Open a loop under "${parentTitle}"` : 'Open a Loop'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>What are you following up on? *</label>
            <Input placeholder="e.g. Q1 OKR submission from Priya" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>Who are you chasing? *</label>
            <Input placeholder="Name or description (anyone)" value={form.contactName}
              onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>Link Team Member</label>
              <Select value={form.teamMemberId} onValueChange={v => setForm(f => ({ ...f, teamMemberId: v ?? '' }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>Link Stakeholder</label>
              <Select value={form.stakeholderId} onValueChange={v => setForm(f => ({ ...f, stakeholderId: v ?? '' }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {stakeholders.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>Description / Context</label>
            <Textarea placeholder="Any background context…" rows={2} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>Link to Task</label>
              <Select value={form.taskId} onValueChange={v => setForm(f => ({ ...f, taskId: v ?? '' }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {tasks.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>Link to Project</label>
              <Select value={form.projectId} onValueChange={v => setForm(f => ({ ...f, projectId: v ?? '' }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>Scheduled Reminder</label>
            <Input type="datetime-local" value={form.reminderAt}
              onChange={e => setForm(f => ({ ...f, reminderAt: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.autoRemind}
              onChange={e => setForm(f => ({ ...f, autoRemind: e.target.checked }))}
              className="rounded" />
            <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Auto-remind if no update after 1 day</span>
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Open a Loop'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Convert dialog ───────────────────────────────────────────────────────────

function ConvertDialog({
  open, onOpenChange, followUp, onConverted, tasks, members, departments,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  followUp: FollowUp | FollowUpChild | null
  onConverted: () => void
  tasks: { id: string; title: string }[]
  members: TeamMember[]
  departments: string[]
}) {
  const [mode, setMode] = useState<'new' | 'link'>('new')
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('medium')
  const [department, setDepartment] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [existingTaskId, setExistingTaskId] = useState('')
  const [converting, setConverting] = useState(false)

  async function handleConvert() {
    if (!followUp) return
    setConverting(true)
    try {
      const body: Record<string, unknown> = { mode }
      if (mode === 'link') {
        if (!existingTaskId) { toast.error('Select a task to link'); setConverting(false); return }
        body.existingTaskId = existingTaskId
      } else {
        body.title = title || followUp.title
        body.priority = priority
        body.department = department || 'Program Management'
        if (assigneeId) body.assigneeId = assigneeId
        if (dueDate) body.dueDate = new Date(dueDate).toISOString()
      }
      const res = await fetch(`/api/follow-ups/${followUp.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed')
      onConverted()
      onOpenChange(false)
      toast.success('Converted to task — history added as comment')
    } catch {
      toast.error('Failed to convert')
    } finally {
      setConverting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" style={{ background: 'var(--surface-container-lowest)' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            Convert to Task
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex rounded-xl overflow-hidden p-1" style={{ background: 'var(--surface-container)' }}>
            {(['new', 'link'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 py-2 text-sm font-medium transition-colors rounded-lg"
                style={mode === m
                  ? { background: 'var(--surface-container-lowest)', color: 'var(--primary)', boxShadow: '0 1px 3px rgba(42,52,57,0.08)' }
                  : { color: 'var(--on-surface-variant)', background: 'transparent' }
                }
              >
                {m === 'new' ? 'Create New Task' : 'Link Existing Task'}
              </button>
            ))}
          </div>
          {mode === 'new' ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>Task Title</label>
                <Input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder={followUp?.title ?? 'Task title'} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>Priority</label>
                  <Select value={priority} onValueChange={v => setPriority(v ?? 'medium')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['urgent','high','medium','low'].map(p =>
                        <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>Department</label>
                  <Select value={department} onValueChange={v => setDepartment(v ?? '')}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>Assignee</label>
                  <Select value={assigneeId} onValueChange={v => setAssigneeId(v ?? '')}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>Due Date</label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>Link to existing task</label>
              <Select value={existingTaskId} onValueChange={v => setExistingTaskId(v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Select task…" /></SelectTrigger>
                <SelectContent>
                  {tasks.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>The follow-up history will be added as a comment on the task.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={converting}>Cancel</Button>
          <Button onClick={handleConvert} disabled={converting} className="gap-2">
            <Wand2 className="h-3.5 w-3.5" />
            {converting ? 'Converting…' : 'Convert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Snooze dialog ────────────────────────────────────────────────────────────

function SnoozeDialog({ open, onOpenChange, onSnooze }: {
  open: boolean; onOpenChange: (v: boolean) => void; onSnooze: (until: string) => void
}) {
  const [custom, setCustom] = useState('')
  const options = [
    { label: 'Tomorrow', value: addDays(new Date(), 1).toISOString() },
    { label: '3 days', value: addDays(new Date(), 3).toISOString() },
    { label: '1 week', value: addDays(new Date(), 7).toISOString() },
  ]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs" style={{ background: 'var(--surface-container-lowest)' }}>
        <DialogHeader><DialogTitle>Snooze until…</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-2">
          {options.map(o => (
            <Button key={o.label} variant="outline" className="justify-start" onClick={() => { onSnooze(o.value); onOpenChange(false) }}>
              {o.label}
            </Button>
          ))}
          <div className="flex gap-2 mt-2">
            <Input type="datetime-local" value={custom} onChange={e => setCustom(e.target.value)} className="flex-1" />
            <Button onClick={() => { if (custom) { onSnooze(new Date(custom).toISOString()); onOpenChange(false) } }}
              disabled={!custom}>Set</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Follow-up row (rich, inline-expandable) ──────────────────────────────────

function FollowUpRow({
  fu, depth = 0, onMutate, members, tasks, projects, departments, onSpawnChild,
}: {
  fu: FollowUpChild
  depth?: number
  onMutate: () => void
  members: TeamMember[]
  tasks: { id: string; title: string }[]
  projects: { id: string; title: string }[]
  departments: string[]
  onSpawnChild: (parentId: string, parentTitle: string) => void
}) {
  const currentUser = useCurrentUser()
  const [expanded, setExpanded] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const alert = needsAttention(fu)
  const hasChildren = fu.children && fu.children.length > 0
  const isClosed = fu.status === 'closed' || fu.status === 'converted'
  const reminder = formatReminderDate(fu)
  const contactDisplay = fu.teamMember?.name ?? fu.stakeholder?.name ?? fu.contactName
  const teamLabel = fu.teamMember?.name ?? null

  async function patch(data: Record<string, unknown>) {
    try {
      await fetch(`/api/follow-ups/${fu.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      onMutate()
    } catch {
      toast.error('Update failed')
    }
  }

  async function addNote() {
    if (!noteText.trim()) return
    setAddingNote(true)
    try {
      const res = await fetch(`/api/follow-ups/${fu.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteText.trim(), authorName: currentUser?.name ?? 'You' }),
      })
      if (!res.ok) throw new Error()
      setNoteText('')
      onMutate()
    } catch {
      toast.error('Failed to add note')
    } finally {
      setAddingNote(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await fetch(`/api/follow-ups/${fu.id}`, { method: 'DELETE' })
      onMutate()
      toast.success('Deleted')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  async function handleSnooze(until: string) {
    await patch({ status: 'snoozed', snoozedUntil: until })
    toast.success('Snoozed')
  }

  return (
    <div className={cn(depth > 0 && 'ml-12 border-l-2')} style={depth > 0 ? { borderColor: 'var(--surface-container)' } : {}}>
      {/* Row */}
      <div
        className={cn(
          'group flex items-center gap-4 p-3 rounded-md transition-all cursor-pointer',
          depth > 0 && 'ml-4',
          isClosed && 'opacity-60',
        )}
        style={{
          background: expanded ? 'rgba(0,83,219,0.03)' : 'transparent',
          borderLeft: expanded && depth === 0 ? '4px solid var(--primary)' : depth === 0 ? '4px solid transparent' : undefined,
          borderRadius: expanded ? '0.375rem 0.375rem 0 0' : undefined,
        }}
        onMouseEnter={e => { if (!expanded) (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,83,219,0.03)' }}
        onMouseLeave={e => { if (!expanded) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
        onClick={() => setExpanded(v => !v)}
      >
        {/* Chevron / done icon */}
        <span
          className="material-symbols-outlined transition-transform duration-200 flex-shrink-0"
          style={{
            color: isClosed ? '#10b981' : 'var(--outline)',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            fontVariationSettings: isClosed ? "'FILL' 1" : "'FILL' 0",
            fontSize: '20px',
          }}
        >
          {isClosed ? 'check_circle' : 'chevron_right'}
        </span>

        {/* Title */}
        <span
          className={cn('text-sm font-semibold flex-1 truncate', isClosed && 'line-through')}
          style={{
            color: isClosed ? 'var(--on-surface-variant)' : 'var(--on-surface)',
            minWidth: depth > 0 ? '200px' : '260px',
          }}
        >
          {alert && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block mr-2 align-middle flex-shrink-0" />}
          {fu.title}
        </span>

        {/* Contact */}
        <div className="flex items-center gap-2 min-w-[140px] flex-shrink-0">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={{ background: 'rgba(0,83,219,0.12)', color: 'var(--primary)' }}
          >
            {getInitials(contactDisplay)}
          </div>
          <span className="text-xs font-medium truncate" style={{ color: 'var(--on-surface-variant)' }}>
            {contactDisplay}
          </span>
        </div>

        {/* Team badge */}
        {teamLabel ? (
          <div
            className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: 'var(--surface-container)', border: '1px solid rgba(169,180,185,0.1)' }}
          >
            <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'var(--on-surface-variant)' }}>
              {teamLabel.split(' ')[0]}
            </span>
          </div>
        ) : (
          <div className="hidden md:block w-20 flex-shrink-0" />
        )}

        {/* Status pill */}
        <div className="flex-shrink-0 w-20 flex justify-center">
          <StatusPill status={fu.status} />
        </div>

        {/* Reminder date */}
        <div className="hidden lg:flex flex-col items-end flex-shrink-0 min-w-[80px]">
          <span
            className="text-[10px] uppercase font-bold tracking-tighter"
            style={{ color: reminder.overdue ? 'var(--error)' : 'var(--outline)' }}
          >
            {reminder.label}
          </span>
          <span className="text-xs font-medium" style={{ color: reminder.overdue ? 'var(--error)' : 'var(--on-surface)' }}>
            {reminder.value}
          </span>
        </div>

        {/* More vert / note count */}
        <div
          className="w-8 flex justify-center flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          {fu.notes.length > 0 ? (
            <span className="text-[10px] font-bold" style={{ color: 'var(--on-surface-variant)' }}>
              {fu.notes.length}
            </span>
          ) : (
            <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--outline)', fontSize: '20px' }}>
              more_vert
            </span>
          )}
        </div>
      </div>

      {/* Inline expanded panel */}
      {expanded && (
        <div
          className={cn('border-x border-b rounded-b-lg', depth > 0 && 'ml-4')}
          style={{ borderColor: 'rgba(169,180,185,0.1)', background: 'rgba(240,244,247,0.4)' }}
        >
          {/* Context links & description */}
          {(fu as FollowUp).description || (fu as FollowUp).task || (fu as FollowUp).project ? (
            <div className="px-10 pt-4 pb-2 flex flex-wrap items-center gap-3">
              {(fu as FollowUp).description && (
                <p className="text-xs leading-relaxed w-full" style={{ color: 'var(--on-surface-variant)' }}>
                  {(fu as FollowUp).description}
                </p>
              )}
              {(fu as FollowUp).task && (
                <Link href={`/tasks/${(fu as FollowUp).task!.id}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--primary)' }}
                  onClick={e => e.stopPropagation()}>
                  <Link2 className="h-3 w-3" />
                  {(fu as FollowUp).task!.title}
                </Link>
              )}
              {(fu as FollowUp).project && (
                <Link href={`/projects/${(fu as FollowUp).project!.id}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--primary)' }}
                  onClick={e => e.stopPropagation()}>
                  <ExternalLink className="h-3 w-3" />
                  {(fu as FollowUp).project!.title}
                </Link>
              )}
            </div>
          ) : null}

          {/* Alert banner */}
          {alert && (
            <div className="mx-10 mt-3 flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
              style={{ color: 'var(--on-error-container)', background: 'var(--error-container)' }}>
              <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '14px' }}>error</span>
              Needs attention — no update received
            </div>
          )}

          {/* Notes timeline */}
          <div className="px-10 pt-4 pb-2">
            {fu.notes.length === 0 ? (
              <p className="text-xs italic" style={{ color: 'var(--on-surface-variant)' }}>No updates yet. Be the first.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {fu.notes.map((n, i) => (
                  <div key={n.id} className={cn('flex gap-3', i > 0 && 'ml-8')}>
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                      style={{ background: i === 0 ? 'var(--surface-container-highest)' : 'rgba(0,83,219,0.1)', color: i === 0 ? 'var(--on-surface)' : 'var(--primary)' }}
                    >
                      {(n.authorName ?? 'S').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: 'var(--on-surface)' }}>{n.authorName ?? 'System'}</span>
                        <span className="text-[10px]" style={{ color: 'var(--outline)' }}>
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>{n.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add note */}
          {!isClosed && (
            <div className="px-10 pt-2 pb-4">
              <div className="relative mt-2">
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  className="w-full resize-none rounded-md p-3 text-sm focus:outline-none focus:ring-2 h-20"
                  style={{
                    background: 'var(--surface-container-lowest)',
                    border: '1px solid rgba(169,180,185,0.2)',
                    color: 'var(--on-surface)',
                    boxShadow: 'inset 0 1px 4px rgba(42,52,57,0.04)',
                  }}
                  placeholder="Write a quick update..."
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote() } }}
                  onClick={e => e.stopPropagation()}
                />
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <button
                    className="bg-primary text-on-primary px-3 py-1 rounded text-xs font-semibold disabled:opacity-50"
                    disabled={addingNote || !noteText.trim()}
                    onClick={e => { e.stopPropagation(); addNote() }}
                    style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
                  >
                    {addingNote ? '…' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action bar */}
          <div
            className="px-10 py-3 flex items-center gap-2 flex-wrap"
            style={{ borderTop: '1px solid rgba(169,180,185,0.08)' }}
            onClick={e => e.stopPropagation()}
          >
            {!isClosed && (
              <>
                <button
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                  style={{ color: 'var(--on-surface-variant)', border: '1px solid rgba(169,180,185,0.2)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  onClick={() => onSpawnChild(fu.id, fu.title)}
                >
                  <GitBranch className="h-3 w-3" />
                  Spawn child
                </button>
                <button
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                  style={{ color: 'var(--on-surface-variant)', border: '1px solid rgba(169,180,185,0.2)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  onClick={() => setSnoozeOpen(true)}
                >
                  <BellOff className="h-3 w-3" />
                  Snooze
                </button>
                <button
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                  style={{ color: 'var(--on-surface-variant)', border: '1px solid rgba(169,180,185,0.2)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  onClick={() => setConvertOpen(true)}
                >
                  <Wand2 className="h-3 w-3" />
                  Convert to task
                </button>
                {fu.status === 'snoozed' && (
                  <button
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                    style={{ color: 'var(--on-surface-variant)', border: '1px solid rgba(169,180,185,0.2)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    onClick={() => patch({ status: 'open', snoozedUntil: null })}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reopen
                  </button>
                )}
                <button
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                  style={{ color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.05)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  onClick={() => patch({ status: 'closed' })}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Close
                </button>
              </>
            )}
            {isClosed && (
              <button
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                style={{ color: 'var(--on-surface-variant)', border: '1px solid rgba(169,180,185,0.2)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                onClick={() => patch({ status: 'open', snoozedUntil: null, convertedTaskId: null })}
              >
                <RotateCcw className="h-3 w-3" />
                Reopen
              </button>
            )}
            <div className="ml-auto">
              <button
                className="p-1.5 rounded-md transition-colors"
                style={{ color: 'var(--on-surface-variant)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--error)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(159,64,61,0.05)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--on-surface-variant)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Children rows */}
      {hasChildren && expanded && fu.children!.map(child => (
        <FollowUpRow
          key={child.id}
          fu={child}
          depth={depth + 1}
          onMutate={onMutate}
          members={members}
          tasks={tasks}
          projects={projects}
          departments={departments}
          onSpawnChild={onSpawnChild}
        />
      ))}

      <SnoozeDialog open={snoozeOpen} onOpenChange={setSnoozeOpen} onSnooze={handleSnooze} />
      <ConvertDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        followUp={fu as FollowUp}
        onConverted={onMutate}
        tasks={tasks}
        members={members}
        departments={departments}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete loop?"
        description="This will delete the loop and all its notes. Children will also be deleted."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FollowUpsPage() {
  const { data: followUps, mutate } = useSWR<FollowUp[]>('/api/follow-ups', fetcher)
  const { data: members = [] } = useSWR<TeamMember[]>('/api/team', fetcher)
  const { data: stakeholders = [] } = useSWR<Stakeholder[]>('/api/stakeholders', (url: string) =>
    fetch(url).then(r => r.json()).then(r => r.data ?? []))
  const { data: tasksData } = useSWR<{ id: string; title: string }[]>('/api/tasks',
    (url: string) => fetch(url).then(r => r.json()).then(r => (r.data ?? []).map((t: { id: string; title: string }) => ({ id: t.id, title: t.title }))))
  const { data: projectsData } = useSWR<{ id: string; title: string }[]>('/api/projects',
    (url: string) => fetch(url).then(r => r.json()).then(r => (r.data ?? []).map((p: { id: string; title: string }) => ({ id: p.id, title: p.title }))))
  const { data: deptSetting } = useSWR<{ value: string }>('/api/settings/departments',
    (url: string) => fetch(url).then(r => r.json()))

  const departments: string[] = deptSetting?.value ? JSON.parse(deptSetting.value) : [
    'Analytics', 'Revenue', 'OTA', 'Marketing', 'Financial Modelling', 'Program Management'
  ]

  const [createOpen, setCreateOpen] = useState(false)
  const [spawnParentId, setSpawnParentId] = useState<string | undefined>()
  const [spawnParentTitle, setSpawnParentTitle] = useState<string | undefined>()
  const [filter, setFilter] = useState<'all' | 'open' | 'snoozed' | 'closed'>('open')
  const [search, setSearch] = useState('')

  const allFus = followUps ?? []
  const alertCount = allFus.flatMap(fu => [fu, ...(fu.children ?? [])]).filter(needsAttention).length
  const openCount = allFus.filter(fu => fu.status === 'open').length
  const snoozedCount = allFus.filter(fu => fu.status === 'snoozed').length

  // Loop health: % of non-overdue open loops
  const total = allFus.length
  const healthPct = total === 0 ? 100 : Math.round(((total - alertCount) / total) * 100)

  function flattenForList(fus: FollowUp[]): FollowUp[] {
    let result = fus
    if (filter !== 'all') {
      result = fus.filter(fu => {
        if (filter === 'open') return fu.status === 'open' || fu.status === 'snoozed'
        return fu.status === filter
      })
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(fu =>
        fu.title.toLowerCase().includes(q) ||
        fu.contactName.toLowerCase().includes(q)
      )
    }
    return result
  }

  const filtered = flattenForList(allFus)

  function handleSpawn(parentId: string, parentTitle: string) {
    setSpawnParentId(parentId)
    setSpawnParentTitle(parentTitle)
    setCreateOpen(true)
  }

  const tasks = tasksData ?? []
  const projects = projectsData ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2
            className="text-4xl font-extrabold tracking-tight mb-2"
            style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' }}
          >
            Open Loops
          </h2>
          <p className="max-w-2xl text-sm" style={{ color: 'var(--on-surface-variant)' }}>
            Track things you&apos;re waiting on — chase updates, schedule reminders, convert to tasks.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {alertCount > 0 && (
            <span
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium"
              style={{ color: 'var(--on-error-container)', background: 'var(--error-container)', border: '1px solid var(--error)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>crisis_alert</span>
              {alertCount} need{alertCount === 1 ? 's' : ''} attention
            </span>
          )}
          <button
            onClick={() => { setSpawnParentId(undefined); setSpawnParentTitle(undefined); setCreateOpen(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dim, #0048c1))', color: 'var(--on-primary)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
            New Follow-up
          </button>
        </div>
      </div>

      {/* Filter tabs + search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1.5 p-1 rounded-xl w-fit" style={{ background: 'var(--surface-container)' }}>
          {[
            { key: 'open', label: 'Open' },
            { key: 'snoozed', label: 'Snoozed' },
            { key: 'closed', label: 'Done' },
            { key: 'all', label: 'All' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={filter === key
                ? { background: 'var(--surface-container-lowest)', color: 'var(--primary)', boxShadow: '0 1px 3px rgba(42,52,57,0.08)' }
                : { color: 'var(--on-surface-variant)', background: 'transparent' }
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined"
            style={{ color: 'var(--outline)', fontSize: '18px' }}
          >
            search
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-1.5 rounded-md text-sm border-none outline-none focus:ring-2 w-64"
            style={{
              background: 'var(--surface-container-low)',
              color: 'var(--on-surface)',
            }}
            placeholder="Search loops..."
          />
        </div>
      </div>

      {/* Loop list */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--surface-container-lowest)',
          boxShadow: '0 8px 30px rgb(42,52,57,0.04)',
          border: '1px solid rgba(169,180,185,0.1)',
        }}
      >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: 'var(--on-surface-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.2 }}>check_circle</span>
            <p className="text-sm">
              {filter === 'open' ? 'Nothing open. Rare. Enjoy it.' : `No ${filter} loops.`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1 p-2">
            {filtered.map(fu => (
              <FollowUpRow
                key={fu.id}
                fu={fu}
                depth={0}
                onMutate={() => mutate()}
                members={members as TeamMember[]}
                tasks={tasks}
                projects={projects}
                departments={departments}
                onSpawnChild={handleSpawn}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        {/* Loop Health */}
        <div
          className="p-6 rounded-xl flex flex-col gap-4"
          style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(169,180,185,0.1)', boxShadow: '0 8px 30px rgb(42,52,57,0.04)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--outline)' }}>Loop Health</span>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>analytics</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold" style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' }}>
              {healthPct}%
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--secondary)' }}>
              {openCount} open, {snoozedCount} snoozed
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-container)' }}>
            <div className="h-full rounded-full" style={{ width: `${healthPct}%`, background: 'var(--primary)' }} />
          </div>
        </div>

        {/* Response Time */}
        <div
          className="p-6 rounded-xl flex flex-col gap-4"
          style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(169,180,185,0.1)', boxShadow: '0 8px 30px rgb(42,52,57,0.04)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--outline)' }}>Open Response Time</span>
            <span className="material-symbols-outlined" style={{ color: 'var(--tertiary)', fontSize: '20px' }}>timer</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold" style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' }}>2.4h</span>
            <span className="text-xs font-medium" style={{ color: 'var(--tertiary)' }}>High Focus Area</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
            Response rate is trending 15m faster than team average.
          </p>
        </div>

        {/* Pending Actions */}
        <div
          className="p-6 rounded-xl flex flex-col gap-4"
          style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(169,180,185,0.1)', boxShadow: '0 8px 30px rgb(42,52,57,0.04)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--outline)' }}>Pending Actions</span>
            <span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: '20px' }}>crisis_alert</span>
          </div>
          <div className="flex -space-x-2">
            {allFus.filter(fu => needsAttention(fu)).slice(0, 3).map(fu => (
              <div
                key={fu.id}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-[var(--surface)] flex-shrink-0"
                style={{ background: 'rgba(159,64,61,0.1)', color: 'var(--error)' }}
              >
                {getInitials(fu.contactName)}
              </div>
            ))}
            {alertCount > 3 && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-[var(--surface)] flex-shrink-0"
                style={{ background: 'var(--surface-container-highest)', color: 'var(--on-surface)' }}
              >
                +{alertCount - 3}
              </div>
            )}
          </div>
          <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
            {alertCount === 0
              ? 'All loops are up to date.'
              : `${alertCount} loop${alertCount !== 1 ? 's' : ''} require your immediate attention.`}
          </p>
        </div>
      </div>

      <CreateFollowUpDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => mutate()}
        members={members as TeamMember[]}
        stakeholders={stakeholders}
        tasks={tasks}
        projects={projects}
        parentId={spawnParentId}
        parentTitle={spawnParentTitle}
      />
    </div>
  )
}
