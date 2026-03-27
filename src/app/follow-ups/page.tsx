'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useCurrentUser } from '@/hooks/use-current-user'
import { toast } from 'sonner'
import { formatDistanceToNow, isPast, addDays } from 'date-fns'
import {
  Plus, ChevronRight, ChevronDown, Bell, BellOff, CheckCircle2,
  RotateCcw, Trash2, X, ExternalLink, AlertCircle, Clock,
  GitBranch, Link2, Wand2, User
} from 'lucide-react'

import { PageHeader } from '@/components/ui/page-header'
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

function StatusDot({ status, alert }: { status: string; alert?: boolean }) {
  if (alert) return <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
  const color = {
    open: 'bg-blue-400',
    snoozed: 'bg-amber-400',
    closed: 'bg-emerald-500',
    converted: 'bg-purple-500',
  }[status] ?? 'bg-gray-400'
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
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
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {parentTitle ? `Open a loop under "${parentTitle}"` : 'Open a Loop'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">What are you following up on? *</label>
            <Input placeholder="e.g. Q1 OKR submission from Priya" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Who are you chasing? *</label>
            <Input placeholder="Name or description (anyone)" value={form.contactName}
              onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Link Team Member</label>
              <Select value={form.teamMemberId} onValueChange={v => setForm(f => ({ ...f, teamMemberId: v ?? '' }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Link Stakeholder</label>
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
            <label className="text-xs font-medium text-muted-foreground">Description / Context</label>
            <Textarea placeholder="Any background context…" rows={2} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Link to Task</label>
              <Select value={form.taskId} onValueChange={v => setForm(f => ({ ...f, taskId: v ?? '' }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {tasks.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Link to Project</label>
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
            <label className="text-xs font-medium text-muted-foreground">Scheduled Reminder</label>
            <Input type="datetime-local" value={form.reminderAt}
              onChange={e => setForm(f => ({ ...f, reminderAt: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.autoRemind}
              onChange={e => setForm(f => ({ ...f, autoRemind: e.target.checked }))}
              className="rounded" />
            <span className="text-xs text-muted-foreground">Auto-remind if no update after 1 day</span>
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
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            Convert to Task
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(['new', 'link'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={cn('flex-1 py-2 text-sm font-medium transition-colors',
                  mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                {m === 'new' ? 'Create New Task' : 'Link Existing Task'}
              </button>
            ))}
          </div>
          {mode === 'new' ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Task Title</label>
                <Input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder={followUp?.title ?? 'Task title'} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Priority</label>
                  <Select value={priority} onValueChange={v => setPriority(v ?? 'medium')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['urgent','high','medium','low'].map(p =>
                        <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Department</label>
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
                  <label className="text-xs font-medium text-muted-foreground">Assignee</label>
                  <Select value={assigneeId} onValueChange={v => setAssigneeId(v ?? '')}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Due Date</label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Link to existing task</label>
              <Select value={existingTaskId} onValueChange={v => setExistingTaskId(v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Select task…" /></SelectTrigger>
                <SelectContent>
                  {tasks.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">The follow-up history will be added as a comment on the task.</p>
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
      <DialogContent className="bg-card border-border max-w-xs">
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

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ followUp, onMutate, members, stakeholders, tasks, projects, departments, onSpawn }: {
  followUp: FollowUp
  onMutate: () => void
  members: TeamMember[]
  stakeholders: Stakeholder[]
  tasks: { id: string; title: string }[]
  projects: { id: string; title: string }[]
  departments: string[]
  onSpawn: (parentId: string, parentTitle: string) => void
}) {
  const currentUser = useCurrentUser()
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const alert = needsAttention(followUp)

  async function addNote() {
    if (!noteText.trim()) return
    setAddingNote(true)
    try {
      const res = await fetch(`/api/follow-ups/${followUp.id}/notes`, {
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

  async function patch(data: Record<string, unknown>) {
    try {
      await fetch(`/api/follow-ups/${followUp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      onMutate()
    } catch {
      toast.error('Update failed')
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await fetch(`/api/follow-ups/${followUp.id}`, { method: 'DELETE' })
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

  const isClosed = followUp.status === 'closed' || followUp.status === 'converted'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-start gap-2">
          <StatusDot status={followUp.status} alert={alert} />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-foreground leading-snug">{followUp.title}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {followUp.teamMember?.name ?? followUp.stakeholder?.name ?? followUp.contactName}
              </span>
              {followUp.task && (
                <Link href={`/tasks/${followUp.task.id}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <Link2 className="h-3 w-3" />
                  {followUp.task.title}
                </Link>
              )}
              {followUp.project && (
                <Link href={`/projects/${followUp.project.id}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" />
                  {followUp.project.title}
                </Link>
              )}
            </div>
          </div>
        </div>
        {followUp.description && (
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{followUp.description}</p>
        )}
        {alert && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded-lg">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            Needs attention — no update received
          </div>
        )}
        {followUp.snoozedUntil && followUp.status === 'snoozed' && (
          <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-lg">
            <Clock className="h-3.5 w-3.5" />
            Snoozed until {new Date(followUp.snoozedUntil).toLocaleString()}
          </div>
        )}
      </div>

      {/* Action bar */}
      {!isClosed && (
        <div className="px-5 py-2 border-b border-border flex-shrink-0 flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
            onClick={() => onSpawn(followUp.id, followUp.title)}>
            <GitBranch className="h-3 w-3" />
            Spawn child
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
            onClick={() => setSnoozeOpen(true)}>
            <BellOff className="h-3 w-3" />
            Snooze
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
            onClick={() => setConvertOpen(true)}>
            <Wand2 className="h-3 w-3" />
            Convert to task
          </Button>
          {followUp.status === 'snoozed' && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
              onClick={() => patch({ status: 'open', snoozedUntil: null })}>
              <RotateCcw className="h-3 w-3" />
              Reopen
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            onClick={() => patch({ status: 'closed' })}>
            <CheckCircle2 className="h-3 w-3" />
            Close
          </Button>
          <div className="ml-auto">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {isClosed && (
        <div className="px-5 py-2 border-b border-border flex-shrink-0 flex items-center justify-between">
          <span className="text-xs text-muted-foreground italic">
            {followUp.status === 'converted' ? 'Converted to task' : 'Closed'}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs"
              onClick={() => patch({ status: 'open', snoozedUntil: null, convertedTaskId: null })}>
              <RotateCcw className="h-3 w-3 mr-1" />
              Reopen
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Notes timeline */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {followUp.notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No updates yet. Add the first note.</p>
        ) : (
          followUp.notes.map(n => (
            <div key={n.id} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-primary mt-0.5">
                {(n.authorName ?? 'S').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-semibold">{n.authorName ?? 'System'}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{n.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add note */}
      {!isClosed && (
        <div className="px-5 py-3 border-t border-border flex-shrink-0 flex gap-2">
          <Input
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add an update…"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote() } }}
            className="flex-1"
          />
          <Button size="sm" onClick={addNote} disabled={addingNote || !noteText.trim()}>
            {addingNote ? '…' : 'Add'}
          </Button>
        </div>
      )}

      {/* Children list */}
      {followUp.children.length > 0 && (
        <div className="px-5 py-3 border-t border-border flex-shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Child loops ({followUp.children.length})
          </p>
          <div className="flex flex-col gap-1">
            {followUp.children.map(c => (
              <div key={c.id} className={cn('flex items-center gap-2 text-sm py-1 px-2 rounded-lg',
                c.status === 'closed' || c.status === 'converted' ? 'opacity-50' : 'hover:bg-muted/50')}>
                <StatusDot status={c.status} alert={needsAttention(c)} />
                <span className="flex-1 truncate">{c.title}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[80px]">{c.contactName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <SnoozeDialog open={snoozeOpen} onOpenChange={setSnoozeOpen} onSnooze={handleSnooze} />
      <ConvertDialog open={convertOpen} onOpenChange={setConvertOpen} followUp={followUp}
        onConverted={onMutate} tasks={tasks} members={members} departments={departments} />
      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen}
        title="Delete loop?" description="This will delete the loop and all its notes. Children will also be deleted."
        onConfirm={handleDelete} loading={deleting} />
    </div>
  )
}

// ─── Follow-up row ────────────────────────────────────────────────────────────

function FollowUpRow({ fu, selected, onSelect, depth = 0 }: {
  fu: FollowUpChild; selected: boolean; onSelect: () => void; depth?: number
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = fu.children && fu.children.length > 0
  const alert = needsAttention(fu)

  return (
    <div>
      <div
        onClick={onSelect}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm',
          selected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50',
          depth > 0 && 'ml-4 border-l-2 border-border pl-4 rounded-l-none'
        )}
        style={{ paddingLeft: depth > 0 ? `${(depth * 16) + 12}px` : undefined }}
      >
        {hasChildren ? (
          <button onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
            className="p-0.5 hover:bg-muted rounded flex-shrink-0">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : <span className="w-5 flex-shrink-0" />}
        <StatusDot status={fu.status} alert={alert} />
        <span className={cn('flex-1 truncate', fu.status === 'closed' || fu.status === 'converted' ? 'line-through text-muted-foreground' : '')}>
          {fu.title}
        </span>
        <span className="text-xs text-muted-foreground truncate max-w-[80px] flex-shrink-0">{fu.contactName}</span>
        {fu.notes.length > 0 && (
          <span className="text-[10px] text-muted-foreground flex-shrink-0">{fu.notes.length} note{fu.notes.length !== 1 ? 's' : ''}</span>
        )}
      </div>
      {hasChildren && expanded && fu.children!.map(child => (
        <FollowUpRow key={child.id} fu={child} selected={false} onSelect={onSelect} depth={depth + 1} />
      ))}
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

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [spawnParentId, setSpawnParentId] = useState<string | undefined>()
  const [spawnParentTitle, setSpawnParentTitle] = useState<string | undefined>()
  const [filter, setFilter] = useState<'all' | 'open' | 'snoozed' | 'closed'>('open')

  const allFus = followUps ?? []

  // Find selected follow-up (could be parent or child)
  function findFollowUp(id: string, list: FollowUpChild[]): FollowUp | null {
    for (const fu of list) {
      if (fu.id === id) return fu as FollowUp
      if (fu.children) {
        const found = findFollowUp(id, fu.children)
        if (found) return found
      }
    }
    return null
  }

  const selectedFollowUp = selectedId ? findFollowUp(selectedId, allFus) : null

  function flattenForList(fus: FollowUp[]): FollowUp[] {
    if (filter === 'all') return fus
    return fus.filter(fu => {
      if (filter === 'open') return fu.status === 'open' || fu.status === 'snoozed'
      return fu.status === filter
    })
  }

  const filtered = flattenForList(allFus)
  const alertCount = allFus.flatMap(fu => [fu, ...fu.children]).filter(needsAttention).length

  function handleSpawn(parentId: string, parentTitle: string) {
    setSpawnParentId(parentId)
    setSpawnParentTitle(parentTitle)
    setCreateOpen(true)
  }

  const tasks = tasksData ?? []
  const projects = projectsData ?? []

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] gap-0">
      {/* Page header */}
      <div className="flex-shrink-0 mb-4">
        <PageHeader
          title="Open Loops"
          description="Track things you're waiting on — chase updates, schedule reminders, convert to tasks"
          action={
            <div className="flex items-center gap-2">
              {alertCount > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded-full font-medium border border-red-200 dark:border-red-900">
                  <Bell className="h-3.5 w-3.5" />
                  {alertCount} need{alertCount === 1 ? 's' : ''} attention
                </span>
              )}
              <Button size="sm" onClick={() => { setSpawnParentId(undefined); setSpawnParentTitle(undefined); setCreateOpen(true) }} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Open a Loop
              </Button>
            </div>
          }
        />
      </div>

      {/* Filter tabs */}
      <div className="flex-shrink-0 flex gap-1 mb-3">
        {(['open', 'snoozed', 'closed', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize',
              filter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
            {f === 'all' ? 'All' : f === 'open' ? 'Active' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Two-panel layout */}
      <div className="flex-1 min-h-0 flex gap-4">
        {/* Left: list */}
        <div className="w-80 flex-shrink-0 bg-card border border-border rounded-xl overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-6">
              <CheckCircle2 className="h-10 w-10 opacity-20" />
              <p className="text-sm text-center">
                {filter === 'open' ? 'Nothing open. Rare. Enjoy it.' : `No ${filter} loops.`}
              </p>
            </div>
          ) : (
            <div className="p-2">
              {filtered.map(fu => (
                <div key={fu.id}>
                  <FollowUpRow
                    fu={fu}
                    selected={selectedId === fu.id}
                    onSelect={() => setSelectedId(fu.id)}
                    depth={0}
                  />
                  {fu.children?.map(child => (
                    <FollowUpRow
                      key={child.id}
                      fu={child}
                      selected={selectedId === child.id}
                      onSelect={() => setSelectedId(child.id)}
                      depth={1}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: detail */}
        <div className="flex-1 min-w-0 bg-card border border-border rounded-xl overflow-hidden">
          {selectedFollowUp ? (
            <DetailPanel
              followUp={selectedFollowUp}
              onMutate={() => mutate()}
              members={members as TeamMember[]}
              stakeholders={stakeholders}
              tasks={tasks}
              projects={projects}
              departments={departments}
              onSpawn={handleSpawn}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <Bell className="h-10 w-10 opacity-20" />
              <p className="text-sm">Select a loop to see details</p>
            </div>
          )}
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
