'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  MessageSquare,
  CheckCircle2,
  Mail,
  Edit2,
  UserPlus,
  RefreshCw,
  Trash2,
  ExternalLink,
  Send,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import useSWR from 'swr'

import { useTask } from '@/hooks/use-tasks'
import { useTeam } from '@/hooks/use-team'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { DepartmentBadge } from '@/components/ui/department-badge'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { StatusBadge } from '@/components/ui/status-badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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

import { cn, PRIORITIES, STATUS_LABELS, TASK_STATUSES, formatDate, formatRelative, isOverdue, isDueToday } from '@/lib/utils'
import type { ActivityType, Priority, TaskStatus } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  status_change: <RefreshCw className="h-3.5 w-3.5" />,
  comment: <MessageSquare className="h-3.5 w-3.5" />,
  edit: <Edit2 className="h-3.5 w-3.5" />,
  assignment: <UserPlus className="h-3.5 w-3.5" />,
  completion: <CheckCircle2 className="h-3.5 w-3.5" />,
  email_sent: <Mail className="h-3.5 w-3.5" />,
}

interface ActivityRecord {
  id: string
  type: ActivityType
  description: string
  note?: string | null
  createdAt: string
}

interface TaskDetail {
  id: string
  title: string
  description?: string | null
  status: TaskStatus
  priority: Priority
  department?: string | null
  dueDate?: string | null
  assigneeId?: string | null
  assignee?: { id: string; name: string } | null
  projectId?: string | null
  stakeholderId?: string | null
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { task, mutate: mutateTask, isLoading } = useTask(id)
  const { members } = useTeam()
  const { data: activities, mutate: mutateActivities } = useSWR<ActivityRecord[]>(
    id ? `/api/tasks/${id}/activity` : null,
    fetcher
  )

  // Editable title state
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  // Editable description state
  const [editingDesc, setEditingDesc] = useState(false)
  const [descValue, setDescValue] = useState('')

  // Comment state
  const [comment, setComment] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Email dialog
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '' })
  const [emailSending, setEmailSending] = useState(false)

  useEffect(() => {
    if (task) {
      setTitleValue(task.title ?? '')
      setDescValue(task.description ?? '')
      setEmailForm(f => ({ ...f, subject: task.title ?? '' }))
    }
  }, [task])

  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus()
      titleRef.current.select()
    }
  }, [editingTitle])

  async function patchTask(updates: Partial<TaskDetail>) {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update task')
      await mutateTask()
    } catch {
      toast.error('Failed to update task')
      throw new Error('patch failed')
    }
  }

  async function handleTitleBlur() {
    setEditingTitle(false)
    const newTitle = titleValue.trim()
    if (!newTitle || newTitle === task?.title) return
    await patchTask({ title: newTitle })
    toast.success('Title updated')
  }

  async function handleDescBlur() {
    setEditingDesc(false)
    if (descValue === (task?.description ?? '')) return
    await patchTask({ description: descValue })
    toast.success('Description updated')
  }

  async function handleStatusChange(status: string | null) {
    if (!status) return
    await patchTask({ status: status as TaskStatus })
    toast.success(`Status changed to ${STATUS_LABELS[status] ?? status}`)
  }

  async function handlePriorityChange(priority: string | null) {
    if (!priority) return
    await patchTask({ priority: priority as Priority })
    toast.success(`Priority changed to ${priority}`)
  }

  async function handleAssigneeChange(assigneeId: string | null) {
    await patchTask({ assigneeId: !assigneeId || assigneeId === 'unassigned' ? null : assigneeId })
    toast.success('Assignee updated')
  }

  async function handleDueDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    await patchTask({ dueDate: val ? new Date(val).toISOString() : null })
    toast.success('Due date updated')
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim()) return
    setCommentSubmitting(true)
    try {
      const res = await fetch(`/api/tasks/${id}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'comment', note: comment.trim() }),
      })
      if (!res.ok) throw new Error()
      setComment('')
      await mutateActivities()
      toast.success('Comment added')
    } catch {
      toast.error('Failed to add comment')
    } finally {
      setCommentSubmitting(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Task deleted')
      router.push('/tasks')
    } catch {
      toast.error('Failed to delete task')
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault()
    setEmailSending(true)
    try {
      const res = await fetch(`/api/tasks/${id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailForm),
      })
      if (!res.ok) throw new Error()
      setEmailOpen(false)
      await mutateActivities()
      toast.success('Email sent')
    } catch {
      toast.error('Failed to send email')
    } finally {
      setEmailSending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-muted-foreground">Loading task…</div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">Task not found</div>
        <Button variant="ghost" onClick={() => router.push('/tasks')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Tasks
        </Button>
      </div>
    )
  }

  const t = task as TaskDetail
  const overdue = isOverdue(t.dueDate ?? null)
  const today = isDueToday(t.dueDate ?? null)
  const dueDateForInput = t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : ''

  return (
    <div className="flex flex-col min-h-0">
      {/* Back nav */}
      <button
        onClick={() => router.push('/tasks')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tasks
      </button>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column — 2/3 */}
        <div className="col-span-2 flex flex-col gap-4">
          {/* Title */}
          <div>
            {editingTitle ? (
              <input
                ref={titleRef}
                value={titleValue}
                onChange={e => setTitleValue(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={e => { if (e.key === 'Enter') titleRef.current?.blur() }}
                className="w-full text-xl font-semibold bg-transparent border-b border-ring outline-none text-foreground py-1"
              />
            ) : (
              <h1
                onClick={() => setEditingTitle(true)}
                className="text-xl font-semibold text-foreground cursor-text hover:text-primary transition-colors"
                title="Click to edit"
              >
                {t.title}
              </h1>
            )}
          </div>

          {/* Metadata row */}
          <div className="bg-card border border-border rounded-lg p-4 flex flex-wrap items-center gap-4">
            {/* Status */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Status</span>
              <Select value={t.status} onValueChange={(v) => handleStatusChange(v)}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Priority</span>
              <Select value={t.priority} onValueChange={(v) => handlePriorityChange(v)}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            {t.department && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Department</span>
                <DepartmentBadge department={t.department} />
              </div>
            )}

            {/* Due Date */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Due Date</span>
              <input
                type="date"
                defaultValue={dueDateForInput}
                onBlur={handleDueDateChange}
                className={cn(
                  'text-xs bg-transparent border border-input rounded-md px-2 py-1 outline-none focus:border-ring transition-colors',
                  overdue ? 'text-[#EF4444]' : today ? 'text-[#C9A84C]' : 'text-foreground'
                )}
              />
            </div>
          </div>

          {/* Assignee */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assignee</span>
            </div>
            <div className="flex items-center gap-3">
              {t.assignee ? (
                <>
                  <MemberAvatar name={t.assignee.name} size="md" />
                  <span className="text-sm font-medium text-foreground">{t.assignee.name}</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Unassigned</span>
              )}
              <Select
                value={t.assigneeId ?? 'unassigned'}
                onValueChange={(v) => handleAssigneeChange(v)}
              >
                <SelectTrigger size="sm" className="ml-auto">
                  <SelectValue placeholder="Change…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {(members as Array<{ id: string; name: string }>).map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</span>
              {!editingDesc && (
                <button
                  onClick={() => setEditingDesc(true)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
            {editingDesc ? (
              <Textarea
                value={descValue}
                onChange={e => setDescValue(e.target.value)}
                onBlur={handleDescBlur}
                rows={4}
                autoFocus
                placeholder="Add a description…"
              />
            ) : (
              <p
                onClick={() => setEditingDesc(true)}
                className="text-sm text-foreground cursor-text min-h-[40px] whitespace-pre-wrap"
              >
                {t.description || <span className="text-muted-foreground">No description — click to add</span>}
              </p>
            )}
          </div>

          {/* Links */}
          {(t.projectId || t.stakeholderId) && (
            <div className="bg-card border border-border rounded-lg p-4 flex flex-wrap gap-4">
              {t.projectId && (
                <a
                  href={`/projects/${t.projectId}`}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Project
                </a>
              )}
              {t.stakeholderId && (
                <a
                  href={`/stakeholders/${t.stakeholderId}`}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Stakeholder
                </a>
              )}
            </div>
          )}

          {/* Delete */}
          <div className="mt-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete Task
            </Button>
          </div>
        </div>

        {/* Right column — 1/3 */}
        <div className="flex flex-col gap-4">
          {/* Activity timeline */}
          <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Activity</span>
            </div>

            <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto">
              {(!activities || activities.length === 0) ? (
                <p className="text-xs text-muted-foreground">No activity yet</p>
              ) : (
                activities.map(activity => (
                  <div key={activity.id} className="flex gap-2.5">
                    <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      {ACTIVITY_ICONS[activity.type] ?? <MessageSquare className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-snug">
                        {activity.description}
                        {activity.note && (
                          <span className="block mt-0.5 text-muted-foreground italic">{activity.note}</span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatRelative(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add comment */}
            <form onSubmit={handleAddComment} className="flex flex-col gap-2 mt-2 border-t border-border pt-3">
              <Textarea
                placeholder="Add a comment…"
                rows={2}
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
              <Button type="submit" size="sm" disabled={commentSubmitting || !comment.trim()}>
                <Send className="h-3.5 w-3.5" />
                {commentSubmitting ? 'Adding…' : 'Add Comment'}
              </Button>
            </form>
          </div>

          {/* Send Email Update */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEmailOpen(true)}
            className="w-full"
          >
            <Mail className="h-4 w-4" />
            Send Email Update
          </Button>
        </div>
      </div>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Task"
        description="This action cannot be undone. The task and all its activity will be permanently deleted."
        onConfirm={handleDelete}
        loading={deleting}
      />

      {/* Email dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Send Email Update</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSendEmail} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Input
                type="text"
                placeholder="recipient@example.com"
                value={emailForm.to}
                onChange={e => setEmailForm(f => ({ ...f, to: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Subject</label>
              <Input
                type="text"
                value={emailForm.subject}
                onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Body</label>
              <Textarea
                rows={4}
                placeholder="Email body…"
                value={emailForm.body}
                onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEmailOpen(false)} disabled={emailSending}>
                Cancel
              </Button>
              <Button type="submit" disabled={emailSending}>
                <Mail className="h-4 w-4" />
                {emailSending ? 'Sending…' : 'Send Email'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
