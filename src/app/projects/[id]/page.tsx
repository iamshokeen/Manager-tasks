'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'

import { useProject } from '@/hooks/use-projects'
import { useTeam } from '@/hooks/use-team'
import { useDepartments } from '@/hooks/use-departments'
import { ProjectDetailView } from '@/components/ui/project-detail-view'
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
import { PRIORITIES } from '@/lib/utils'

const STAGE_LABELS: Record<string, string> = {
  planning: 'Planning',
  active: 'Active',
  review: 'Review',
  closed: 'Closed',
}

const STAGE_COLORS: Record<string, string> = {
  planning: '#717c82',
  active: '#0053db',
  review: '#f59e0b',
  closed: '#10b981',
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

interface EditProjectForm {
  title: string
  description: string
  stage: string
  department: string
  dueDate: string
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { project, mutate, isLoading } = useProject(id)
  const { members } = useTeam()
  const { departments } = useDepartments()

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<EditProjectForm>({
    title: '',
    description: '',
    stage: 'planning',
    department: '',
    dueDate: '',
  })
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskForm, setTaskForm] = useState<AddTaskForm>(EMPTY_TASK_FORM)
  const [taskSubmitting, setTaskSubmitting] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function openEditDialog() {
    if (!project) return
    setEditForm({
      title: project.title,
      description: project.description ?? '',
      stage: project.stage,
      department: project.department ?? '',
      dueDate: project.dueDate ? project.dueDate.split('T')[0] : '',
    })
    setEditOpen(true)
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editForm.title.trim()) {
      toast.error('Title is required')
      return
    }
    setEditSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        title: editForm.title.trim(),
        stage: editForm.stage,
      }
      if (editForm.department) body.department = editForm.department
      if (editForm.description) body.description = editForm.description
      if (editForm.dueDate) body.dueDate = new Date(editForm.dueDate).toISOString()

      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to update project')
      await mutate()
      setEditOpen(false)
      toast.success('Project updated')
    } catch {
      toast.error('Failed to update project')
    } finally {
      setEditSubmitting(false)
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
      <div className="flex items-center justify-center py-20 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
        Loading…
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Project not found.</p>
        <Link
          href="/projects"
          className="text-sm hover:underline underline-offset-2 transition-colors"
          style={{ color: 'var(--on-surface-variant)' }}
        >
          ← Back to Projects
        </Link>
      </div>
    )
  }

  const stageColor = STAGE_COLORS[project.stage] ?? '#717c82'

  return (
    <div className="flex flex-col gap-6 w-full">

      {/* Stitch-style project header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs font-medium mb-3" style={{ color: 'var(--on-surface-variant)' }}>
            <Link
              href="/projects"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Projects
            </Link>
            <span>/</span>
            <span
              className="font-bold uppercase tracking-widest text-[10px]"
              style={{ color: 'var(--on-surface)' }}
            >
              {project.title}
            </span>
          </nav>

          {/* Title */}
          <h1
            className="font-headline font-extrabold text-3xl tracking-tight mb-2"
            style={{ color: 'var(--on-surface)' }}
          >
            {project.title}
          </h1>

          {/* Stage badge + department */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
              style={{
                background: `${stageColor}18`,
                color: stageColor,
                border: `1px solid ${stageColor}30`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: stageColor }}
              />
              {STAGE_LABELS[project.stage] ?? project.stage}
            </span>
            {project.department && (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{
                  background: 'var(--surface-container)',
                  color: 'var(--on-surface-variant)',
                }}
              >
                {project.department}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTaskDialogOpen(true)}
            className="gap-1.5"
            style={{
              background: 'var(--surface-container-high)',
              borderColor: 'transparent',
            }}
          >
            <Plus className="h-4 w-4" />
            Drop a Task
          </Button>
          <Button
            size="sm"
            onClick={openEditDialog}
            className="gap-1.5"
            style={{
              background: 'var(--primary)',
              color: '#f8f7ff',
              borderColor: 'transparent',
            }}
          >
            Edit Project
          </Button>
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

      {/* Main detail view */}
      <ProjectDetailView
        project={project}
        onEdit={openEditDialog}
        onTasksGenerated={() => mutate()}
      />

      {/* Edit Project Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Title *</label>
              <Input
                placeholder="Project title"
                value={editForm.title}
                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Stage</label>
                <Select
                  value={editForm.stage}
                  onValueChange={v => setEditForm(f => ({ ...f, stage: v ?? 'planning' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STAGE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Department</label>
                <Select
                  value={editForm.department}
                  onValueChange={v => setEditForm(f => ({ ...f, department: v ?? '' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Due Date</label>
              <Input
                type="date"
                value={editForm.dueDate}
                onChange={e => setEditForm(f => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea
                placeholder="Project description…"
                rows={3}
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} disabled={editSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={editSubmitting}>
                {editSubmitting ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Drop a Task</DialogTitle>
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
                      <SelectItem key={p} value={p} className="capitalize">
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </SelectItem>
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
                {taskSubmitting ? 'Adding…' : 'Drop a Task'}
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
