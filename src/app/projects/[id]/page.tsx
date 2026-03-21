'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Calendar } from 'lucide-react'

import { useProject } from '@/hooks/use-projects'
import { useTeam } from '@/hooks/use-team'
import { PageHeader } from '@/components/ui/page-header'
import { DepartmentBadge } from '@/components/ui/department-badge'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { formatDate, PRIORITIES } from '@/lib/utils'

const STAGE_LABELS: Record<string, string> = {
  planning: 'Planning',
  active: 'Active',
  review: 'Review',
  closed: 'Closed',
}

interface TaskRow {
  id: string
  title: string
  status: string
  priority: string
  dueDate?: string | null
  assignee?: { id: string; name: string } | null
}

interface AddTaskForm {
  title: string
  priority: string
  assigneeId: string
  dueDate: string
}

const EMPTY_TASK_FORM: AddTaskForm = {
  title: '',
  priority: 'medium',
  assigneeId: '',
  dueDate: '',
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { project, mutate, isLoading } = useProject(id)
  const { members } = useTeam()

  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskForm, setTaskForm] = useState<AddTaskForm>(EMPTY_TASK_FORM)
  const [taskSubmitting, setTaskSubmitting] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [stageChanging, setStageChanging] = useState(false)

  async function handleStageChange(newStage: string) {
    setStageChanging(true)
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      })
      if (!res.ok) throw new Error('Failed to update stage')
      await mutate()
      toast.success('Stage updated')
    } catch {
      toast.error('Failed to update stage')
    } finally {
      setStageChanging(false)
    }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!taskForm.title.trim()) {
      toast.error('Title is required')
      return
    }
    setTaskSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        title: taskForm.title.trim(),
        priority: taskForm.priority,
        projectId: id,
        department: project?.department ?? 'Program Management',
      }
      if (taskForm.assigneeId) body.assigneeId = taskForm.assigneeId
      if (taskForm.dueDate) body.dueDate = new Date(taskForm.dueDate).toISOString()

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to create task')
      await mutate()
      setTaskDialogOpen(false)
      setTaskForm(EMPTY_TASK_FORM)
      toast.success('Task added')
    } catch {
      toast.error('Failed to add task')
    } finally {
      setTaskSubmitting(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete project')
      toast.success('Project deleted')
      router.push('/projects')
    } catch {
      toast.error('Failed to delete project')
      setDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        Loading…
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground text-sm">Project not found.</p>
        <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back to Projects</Link>
      </div>
    )
  }

  const tasks: TaskRow[] = project.tasks ?? []

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Back link */}
      <Link
        href="/projects"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Projects
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground mb-2">{project.title}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            {project.department && <DepartmentBadge department={project.department} />}
            {project.dueDate && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(project.dueDate)}</span>
              </div>
            )}
            {project.owner && (
              <div className="flex items-center gap-1.5">
                <MemberAvatar name={project.owner.name} size="sm" />
                <span className="text-xs text-muted-foreground">{project.owner.name}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Stage selector */}
          <Select
            value={project.stage}
            onValueChange={handleStageChange}
            disabled={stageChanging}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STAGE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteOpen(true)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-muted-foreground">{project.description}</p>
      )}

      {/* Tasks section */}
      <div>
        <PageHeader
          title="Tasks"
          action={
            <Button size="sm" onClick={() => setTaskDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
          }
        />

        {tasks.length === 0 ? (
          <EmptyState
            title="No tasks yet"
            description="Add tasks to track work for this project."
            action={
              <Button size="sm" onClick={() => setTaskDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-[#C9A84C]/50 transition-colors"
              >
                <StatusBadge status={task.status} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{task.title}</div>
                  {task.assignee && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <MemberAvatar name={task.assignee.name} size="sm" />
                      <span className="text-xs text-muted-foreground">{task.assignee.name}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PriorityBadge priority={task.priority} />
                  {task.dueDate && (
                    <span className="text-xs text-muted-foreground">{formatDate(task.dueDate)}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Add Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task to Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTask} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Title *</label>
              <Input
                placeholder="Task title"
                value={taskForm.title}
                onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <Select
                  value={taskForm.priority}
                  onValueChange={v => setTaskForm(f => ({ ...f, priority: v ?? 'medium' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Assignee</label>
                <Select
                  value={taskForm.assigneeId}
                  onValueChange={v => setTaskForm(f => ({ ...f, assigneeId: v ?? '' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {(members as Array<{ id: string; name: string }>).map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Due Date</label>
              <Input
                type="date"
                value={taskForm.dueDate}
                onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setTaskDialogOpen(false)} disabled={taskSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={taskSubmitting}>
                {taskSubmitting ? 'Adding…' : 'Add Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Project?"
        description={`"${project.title}" and all its data will be permanently deleted.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
