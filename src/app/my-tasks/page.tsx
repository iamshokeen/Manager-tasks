'use client'
//
// My Tasks (2026-05-15 update).
//
// Same filter / sort surface as /tasks, plus a Show-completed toggle
// (default off). Personal scope is enforced server-side via isSelfTask=true.

import React, { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { CheckCircle2, Circle, Plus, ListTodo, X } from 'lucide-react'

import { useTasks } from '@/hooks/use-tasks'
import { useStakeholders } from '@/hooks/use-stakeholders'
import { useDepartments } from '@/hooks/use-departments'
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
import type { TaskFilters } from '@/types'

interface TaskItem {
  id: string
  title: string
  status: string
  priority: string
  dueDate?: string | null
  description?: string | null
  department?: string | null
  stakeholderId?: string | null
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

const PRIORITY_ORDER = ['critical', 'urgent', 'high', 'medium', 'low']

const PRIORITY_GROUP_LABELS: Record<string, string> = {
  critical: 'Critical',
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export default function MyTasksPage() {
  // ── Local filter / sort / toggle state ─────────────────────────────────────
  const [search, setSearch] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false)
  const [priorityIn, setPriorityIn] = useState<string[]>([])
  const [departmentIn, setDepartmentIn] = useState<string[]>([])
  const [stakeholderIdIn, setStakeholderIdIn] = useState<string[]>([])
  const [dueWindow, setDueWindow] = useState<TaskFilters['dueWindow']>('any')
  const [createdWindow, setCreatedWindow] = useState<TaskFilters['createdWindow']>('any')
  const [sortBy, setSortBy] = useState<TaskFilters['sortBy'] | undefined>(undefined)

  // ── Filters object sent to the API ─────────────────────────────────────────
  const filters: TaskFilters = { isSelfTask: true }
  if (search) filters.search = search
  if (priorityIn.length) filters.priorityIn = priorityIn
  if (departmentIn.length) filters.departmentIn = departmentIn
  if (stakeholderIdIn.length) filters.stakeholderIdIn = stakeholderIdIn
  if (dueWindow && dueWindow !== 'any') filters.dueWindow = dueWindow
  if (createdWindow && createdWindow !== 'any') filters.createdWindow = createdWindow
  if (sortBy) filters.sortBy = sortBy

  const { tasks, mutate, isLoading } = useTasks(filters)
  const { stakeholders: allStakeholders } = useStakeholders()
  const { departments } = useDepartments()

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

  // ── Toggle helpers ────────────────────────────────────────────────────────
  function toggleInList(value: string, list: string[], setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  const activeFilterCount =
    priorityIn.length +
    departmentIn.length +
    stakeholderIdIn.length +
    (dueWindow && dueWindow !== 'any' ? 1 : 0) +
    (createdWindow && createdWindow !== 'any' ? 1 : 0)

  function clearAdvancedFilters() {
    setPriorityIn([])
    setDepartmentIn([])
    setStakeholderIdIn([])
    setDueWindow('any')
    setCreatedWindow('any')
  }

  // ── Visible set (apply completed toggle client-side) ───────────────────────
  const visibleTasks = (tasks as TaskItem[]).filter(t =>
    showCompleted ? true : t.status !== 'done'
  )

  // Group by priority; open first, done after (when shown).
  const grouped = PRIORITY_ORDER.reduce((acc, priority) => {
    const inPriority = visibleTasks.filter(t => t.priority === priority)
    const open = inPriority.filter(t => t.status !== 'done')
    const done = inPriority.filter(t => t.status === 'done')
    acc[priority] = [...open, ...done]
    return acc
  }, {} as Record<string, TaskItem[]>)

  const totalTasks = visibleTasks.length

  return (
    <div className="flex flex-col max-w-3xl">
      <PageHeader
        title="My Tasks"
        description="Personal tasks and action items"
        action={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Drop a Task
          </Button>
        }
      />

      {/* Filter bar */}
      <div
        className="flex flex-col gap-3 mb-5 px-4 py-3 rounded-xl"
        style={{ background: 'var(--surface-container)' }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined pointer-events-none" style={{ fontSize: '18px', color: 'var(--on-surface-variant)' }}>search</span>
            <Input
              placeholder="Search tasks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <Button
            variant={showCompleted ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowCompleted(v => !v)}
            className="gap-1.5"
            title={showCompleted ? 'Hide completed tasks' : 'Show completed tasks'}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {showCompleted ? 'Hide completed' : 'Show completed'}
          </Button>

          <Select value={sortBy ?? 'default'} onValueChange={(v: string | null) => setSortBy(v && v !== 'default' ? (v as TaskFilters['sortBy']) : undefined)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Sort: default</SelectItem>
              <SelectItem value="due_asc">Due (soonest)</SelectItem>
              <SelectItem value="due_desc">Due (latest)</SelectItem>
              <SelectItem value="priority_desc">Priority (high→low)</SelectItem>
              <SelectItem value="priority_asc">Priority (low→high)</SelectItem>
              <SelectItem value="created_desc">Created (newest)</SelectItem>
              <SelectItem value="created_asc">Created (oldest)</SelectItem>
              <SelectItem value="title_asc">Title (A→Z)</SelectItem>
              <SelectItem value="title_desc">Title (Z→A)</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={filtersPanelOpen || activeFilterCount > 0 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltersPanelOpen(v => !v)}
            className="gap-1.5"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>tune</span>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAdvancedFilters} className="gap-1.5">
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>

        {filtersPanelOpen && (
          <div
            className="flex flex-col gap-4 mt-2 pt-3"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wide w-24 shrink-0" style={{ color: 'var(--on-surface-variant)' }}>Priority</span>
              {(['urgent', 'high', 'medium', 'low'] as const).map(p => {
                const active = priorityIn.includes(p)
                return (
                  <button
                    key={p}
                    onClick={() => toggleInList(p, priorityIn, setPriorityIn)}
                    className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide transition-all"
                    style={
                      active
                        ? { background: 'var(--primary)', color: 'var(--on-primary)' }
                        : { background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }
                    }
                  >
                    {p}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wide w-24 shrink-0" style={{ color: 'var(--on-surface-variant)' }}>Due</span>
              {([
                ['any', 'Any'],
                ['overdue', 'Overdue'],
                ['today', 'Today'],
                ['week', 'This week'],
                ['month', 'This month'],
                ['none', 'No date'],
              ] as const).map(([val, label]) => {
                const active = (dueWindow ?? 'any') === val
                return (
                  <button
                    key={val}
                    onClick={() => setDueWindow(val as TaskFilters['dueWindow'])}
                    className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
                    style={
                      active
                        ? { background: 'var(--primary)', color: 'var(--on-primary)' }
                        : { background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }
                    }
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wide w-24 shrink-0" style={{ color: 'var(--on-surface-variant)' }}>Created</span>
              {([
                ['any', 'Any'],
                ['today', 'Today'],
                ['week', 'This week'],
                ['month', 'This month'],
              ] as const).map(([val, label]) => {
                const active = (createdWindow ?? 'any') === val
                return (
                  <button
                    key={val}
                    onClick={() => setCreatedWindow(val as TaskFilters['createdWindow'])}
                    className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
                    style={
                      active
                        ? { background: 'var(--primary)', color: 'var(--on-primary)' }
                        : { background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }
                    }
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            {departments.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--on-surface-variant)' }}>Department</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {departments.map(d => {
                    const active = departmentIn.includes(d)
                    return (
                      <button
                        key={d}
                        onClick={() => toggleInList(d, departmentIn, setDepartmentIn)}
                        className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
                        style={
                          active
                            ? { background: 'var(--primary)', color: 'var(--on-primary)' }
                            : { background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }
                        }
                      >
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {allStakeholders.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--on-surface-variant)' }}>Stakeholder</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {(allStakeholders as Array<{ id: string; name: string }>).map(s => {
                    const active = stakeholderIdIn.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleInList(s.id, stakeholderIdIn, setStakeholderIdIn)}
                        className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
                        style={
                          active
                            ? { background: 'var(--primary)', color: 'var(--on-primary)' }
                            : { background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }
                        }
                      >
                        {s.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          Loading…
        </div>
      ) : totalTasks === 0 ? (
        <EmptyState
          icon={<ListTodo className="h-10 w-10" />}
          title="Nothing matches. Either nothing's assigned, or your filters are too tight."
          description="Tasks assigned to you land here."
          action={
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Drop a Task
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col bg-card rounded-xl shadow-[var(--shadow-glass)] px-5 py-4">
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
        <DialogContent className="bg-card max-w-md">
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
