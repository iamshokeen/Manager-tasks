'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { CheckCircle2, Circle, Plus, ListTodo } from 'lucide-react'

import { useTasks } from '@/hooks/use-tasks'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
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
import { isOverdue, isDueToday, formatDate, PRIORITIES } from '@/lib/utils'

interface TaskItem {
  id: string
  title: string
  status: string
  priority: string
  dueDate?: string | null
  description?: string | null
}

interface NewTaskForm {
  title: string
  priority: string
  dueDate: string
  description: string
}

const EMPTY_FORM: NewTaskForm = {
  title: '',
  priority: 'medium',
  dueDate: '',
  description: '',
}

const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low']

const PRIORITY_GROUP_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export default function MyTasksPage() {
  const { tasks, mutate, isLoading } = useTasks({ isSelfTask: true })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<NewTaskForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  async function toggleDone(task: TaskItem) {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update task')
      await mutate()
      toast.success(newStatus === 'done' ? 'Task marked complete' : 'Task reopened')
    } catch {
      toast.error('Failed to update task')
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        priority: form.priority,
        isSelfTask: true,
        department: 'Program Management',
      }
      if (form.dueDate) body.dueDate = new Date(form.dueDate).toISOString()
      if (form.description) body.description = form.description

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to create task')
      await mutate()
      setDialogOpen(false)
      setForm(EMPTY_FORM)
      toast.success('Task created')
    } catch {
      toast.error('Failed to create task')
    } finally {
      setSubmitting(false)
    }
  }

  // Group tasks by priority; within each group, open tasks first, then done
  const grouped = PRIORITY_ORDER.reduce((acc, priority) => {
    const inPriority = (tasks as TaskItem[]).filter(t => t.priority === priority)
    const open = inPriority.filter(t => t.status !== 'done')
    const done = inPriority.filter(t => t.status === 'done')
    acc[priority] = [...open, ...done]
    return acc
  }, {} as Record<string, TaskItem[]>)

  const totalTasks = (tasks as TaskItem[]).length

  return (
    <div className="flex flex-col max-w-3xl">
      <PageHeader
        title="My Tasks"
        description="Personal tasks and action items"
        action={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Task
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          Loading…
        </div>
      ) : totalTasks === 0 ? (
        <EmptyState
          icon={<ListTodo className="h-10 w-10" />}
          title="No personal tasks"
          description="Create a task to start tracking your work."
          action={
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Task
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col bg-white rounded-xl shadow-[0_20px_40px_rgba(0,74,198,0.06)] px-5 py-4">
          {PRIORITY_ORDER.map(priority => {
            const items = grouped[priority]
            if (items.length === 0) return null
            return (
              <div key={priority}>
                <div className="text-[10px] font-bold text-[var(--outline)] uppercase tracking-widest mb-2 mt-4">
                  {PRIORITY_GROUP_LABELS[priority]} Priority
                </div>
                <div className="flex flex-col gap-2">
                  {items.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-4 rounded-lg hover:bg-[var(--surface-container-low)] transition-colors group"
                    >
                      <button
                        onClick={() => toggleDone(task)}
                        className="shrink-0 focus:outline-none"
                        aria-label={task.status === 'done' ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {task.status === 'done'
                          ? <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
                          : <Circle className="h-5 w-5 text-[var(--outline)] hover:text-primary transition-colors" />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/tasks/${task.id}`}
                          className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-[var(--outline)]' : 'text-foreground hover:text-primary transition-colors'}`}
                        >
                          {task.title}
                        </Link>
                        {task.dueDate && (
                          <div
                            className={`text-xs mt-0.5 ${
                              isOverdue(task.dueDate) && task.status !== 'done'
                                ? 'text-[#EF4444]'
                                : isDueToday(task.dueDate) && task.status !== 'done'
                                ? 'text-primary'
                                : 'text-[var(--outline)]'
                            }`}
                          >
                            Due {formatDate(task.dueDate)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <PriorityBadge priority={task.priority} />
                        <StatusBadge status={task.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>New Personal Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Title *</label>
              <Input
                placeholder="Task title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <Select
                  value={form.priority}
                  onValueChange={v => setForm(f => ({ ...f, priority: v ?? 'medium' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Due Date</label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea
                placeholder="Optional notes…"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
