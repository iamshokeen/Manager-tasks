'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useTeam } from '@/hooks/use-team'
import { useDepartments } from '@/hooks/use-departments'
import { useStakeholders } from '@/hooks/use-stakeholders'
import { useProjects } from '@/hooks/use-projects'

const PRIORITIES = ['urgent', 'high', 'medium', 'low']

interface TaskCreateForm {
  title: string
  department: string
  priority: string
  assigneeId: string
  dueDate: string
  description: string
  isSelfTask: boolean
  stakeholderIds: string[]
  projectId: string
}

const EMPTY_FORM: TaskCreateForm = {
  title: '',
  department: '',
  priority: 'medium',
  assigneeId: '',
  dueDate: '',
  description: '',
  isSelfTask: false,
  stakeholderIds: [],
  projectId: '',
}

interface TaskCreatePanelProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function TaskCreatePanel({ open, onClose, onCreated }: TaskCreatePanelProps) {
  const [form, setForm] = useState<TaskCreateForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const currentUser = useCurrentUser()
  const { members } = useTeam()
  const { departments } = useDepartments()
  const { stakeholders } = useStakeholders()
  const { projects } = useProjects()

  function reset() {
    setForm(EMPTY_FORM)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function toggleStakeholder(id: string) {
    setForm(f => ({
      ...f,
      stakeholderIds: f.stakeholderIds.includes(id)
        ? f.stakeholderIds.filter(s => s !== id)
        : [...f.stakeholderIds, id],
    }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    setSubmitting(true)
    try {
      const isSelf = form.assigneeId === '__self__'
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        priority: form.priority || 'medium',
        isSelfTask: isSelf ? true : form.isSelfTask,
        assignedByName: currentUser?.name ?? 'You',
      }
      if (form.department) body.department = form.department
      if (!isSelf && form.assigneeId) body.assigneeId = form.assigneeId
      if (form.dueDate) body.dueDate = new Date(form.dueDate).toISOString()
      if (form.description) body.description = form.description
      if (form.stakeholderIds.length > 0) body.stakeholderIds = form.stakeholderIds
      if (form.projectId) body.projectId = form.projectId

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to create task')
      toast.success('Task created')
      reset()
      onCreated()
      onClose()
    } catch {
      toast.error('Failed to create task')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const selectedStakeholders = (stakeholders as Array<{ id: string; name: string }>).filter(s =>
    form.stakeholderIds.includes(s.id)
  )
  const availableStakeholders = (stakeholders as Array<{ id: string; name: string }>).filter(s =>
    !form.stakeholderIds.includes(s.id)
  )

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-[540px] bg-[var(--surface-container)] border-l border-border shadow-2xl">

        {/* Header */}
        <div className="px-7 py-6 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-serif text-xl text-foreground">Drop a Task</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Create and assign to your team</p>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleCreate} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5">

            {/* Assigned-by banner */}
            {currentUser && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-primary/5 border border-primary/15 text-sm">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-muted-foreground">Assigning as</span>
                <span className="font-medium text-foreground">{currentUser.name}</span>
                <span className="ml-auto text-[10px] text-muted-foreground/60 uppercase tracking-wider">auto</span>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Task Title <span className="text-primary">*</span>
              </label>
              <Input
                placeholder="What needs to happen?"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="h-12 text-base"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Description</label>
              <Textarea
                placeholder="Add context, goals, or acceptance criteria…"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="resize-none"
              />
            </div>

            {/* Assign To + Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Assign To</label>
                <Select
                  value={form.assigneeId}
                  onValueChange={v => setForm(f => ({ ...f, assigneeId: v ?? '' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__self__">— Me —</SelectItem>
                    {(members as Array<{ id: string; name: string }>).map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Due Date</label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Priority + Department */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Priority</label>
                <Select
                  value={form.priority}
                  onValueChange={v => setForm(f => ({ ...f, priority: v ?? 'medium' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Department</label>
                <Select
                  value={form.department}
                  onValueChange={v => setForm(f => ({ ...f, department: v ?? '' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {(departments as string[]).map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Stakeholders multi-select */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Stakeholders
              </label>
              <div className="min-h-[44px] p-2.5 rounded-xl bg-[var(--surface-container-high)] border border-border space-y-2">
                {selectedStakeholders.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStakeholders.map(s => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300"
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-purple-500/20 flex items-center justify-center text-[8px] font-bold">
                          {s.name.charAt(0).toUpperCase()}
                        </span>
                        {s.name}
                        <button
                          type="button"
                          onClick={() => toggleStakeholder(s.id)}
                          className="hover:text-red-400 transition-colors cursor-pointer ml-0.5"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {availableStakeholders.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {availableStakeholders.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleStakeholder(s.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface-container-highest)] border border-dashed border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all cursor-pointer"
                      >
                        <Plus size={9} />
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
                {stakeholders.length === 0 && (
                  <p className="text-xs text-muted-foreground">No stakeholders in system yet.</p>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">Click names to add or remove stakeholders</p>
            </div>

            {/* Link to Project */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Link to Project <span className="text-muted-foreground font-normal normal-case tracking-normal">(optional)</span>
              </label>
              <Select
                value={form.projectId}
                onValueChange={v => setForm(f => ({ ...f, projectId: v ?? '' }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No project</SelectItem>
                  {(projects as Array<{ id: string; title: string }>).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Personal task toggle */}
            <label className={cn(
              'flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all',
              form.isSelfTask
                ? 'bg-primary/5 border-primary/20'
                : 'bg-[var(--surface-container-high)] border-border hover:border-border/80'
            )}>
              <Checkbox
                checked={form.isSelfTask}
                onCheckedChange={(checked: boolean) => setForm(f => ({ ...f, isSelfTask: checked }))}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-foreground">Personal task</p>
                <p className="text-xs text-muted-foreground">Only visible to you</p>
              </div>
            </label>

          </div>

          {/* Footer */}
          <div className="px-7 py-4 border-t border-border flex items-center justify-end gap-3 flex-shrink-0">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="px-6">
              {submitting ? 'Creating…' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
