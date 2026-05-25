'use client'

import { useState } from 'react'
import { X, Plus, Repeat } from 'lucide-react'
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

type RepeatFrequency = 'none' | 'daily' | 'weekly' | 'monthly'

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface TaskCreateForm {
  title: string
  department: string
  priority: string
  assigneeId: string
  startDate: string
  dueDate: string
  description: string
  isSelfTask: boolean
  stakeholderIds: string[]
  projectId: string
  repeat: RepeatFrequency
  interval: number
  daysOfWeek: number[]
  dayOfMonth: string
  dayOfMonthLast: boolean
  endDate: string
}

function getTomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

const EMPTY_FORM: TaskCreateForm = {
  title: '',
  department: '',
  priority: 'medium',
  assigneeId: '',
  startDate: '',
  dueDate: '',
  description: '',
  isSelfTask: false,
  stakeholderIds: [],
  projectId: '',
  repeat: 'none',
  interval: 1,
  daysOfWeek: [new Date().getDay()],
  dayOfMonth: String(new Date().getDate()),
  dayOfMonthLast: false,
  endDate: '',
}

interface TaskCreatePanelProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function TaskCreatePanel({ open, onClose, onCreated }: TaskCreatePanelProps) {
  const [form, setForm] = useState<TaskCreateForm>(() => ({ ...EMPTY_FORM, dueDate: getTomorrow() }))
  const [submitting, setSubmitting] = useState(false)

  const currentUser = useCurrentUser()
  const { members } = useTeam()
  const { departments } = useDepartments()
  const { stakeholders } = useStakeholders()
  const { projects } = useProjects()

  function reset() {
    setForm({ ...EMPTY_FORM, dueDate: getTomorrow() })
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
    if (form.repeat !== 'none' && !form.department) {
      toast.error('Department is required for recurring tasks')
      return
    }
    setSubmitting(true)
    try {
      const isSelf = form.assigneeId === '__self__'

      // ── Recurring branch: create RecurringTaskTemplate and spawn the first
      // instance atomically via the recurring-tasks endpoint.
      if (form.repeat !== 'none') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const body: Record<string, unknown> = {
          title: form.title.trim(),
          description: form.description || undefined,
          priority: form.priority || 'medium',
          department: form.department,
          isSelfTask: isSelf ? true : form.isSelfTask,
          assigneeId: !isSelf && form.assigneeId ? form.assigneeId : null,
          projectId: form.projectId || null,
          stakeholderId: form.stakeholderIds[0] ?? null,
          frequency: form.repeat,
          interval: Math.max(1, Number(form.interval) || 1),
          daysOfWeek: form.repeat === 'weekly' ? form.daysOfWeek : [],
          dayOfMonth: form.repeat === 'monthly'
            ? (form.dayOfMonthLast ? -1 : Math.max(1, Math.min(31, Number(form.dayOfMonth) || today.getDate())))
            : null,
          dueOffsetDays: 0,
          startDate: today.toISOString(),
          endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
          spawnFirstNow: true,
          firstTaskDueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
          assignedByName: currentUser?.name ?? 'You',
          stakeholderIds: form.stakeholderIds,
        }

        const res = await fetch('/api/recurring-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('Failed to create recurring task')
        toast.success('Recurring task scheduled')
        reset()
        onCreated()
        onClose()
        return
      }

      // ── Standard one-off branch
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        priority: form.priority || 'medium',
        isSelfTask: isSelf ? true : form.isSelfTask,
        assignedByName: currentUser?.name ?? 'You',
      }
      if (form.department) body.department = form.department
      if (!isSelf && form.assigneeId) body.assigneeId = form.assigneeId
      // Date-range semantics: if only one of start/due is given, both
      // collapse to a single-day block. If both are given, range spans
      // [startDate, endDate] in calendar rendering.
      const startIso = form.startDate ? new Date(form.startDate).toISOString() : null
      const dueIso = form.dueDate ? new Date(form.dueDate).toISOString() : null
      const effectiveStart = startIso ?? dueIso
      const effectiveEnd = dueIso ?? startIso
      if (effectiveStart) body.startDate = effectiveStart
      if (effectiveEnd) body.endDate = effectiveEnd
      if (dueIso) body.dueDate = dueIso
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

  function toggleDayOfWeek(d: number) {
    setForm(f => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(d) ? f.daysOfWeek.filter(x => x !== d) : [...f.daysOfWeek, d].sort(),
    }))
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

            {/* Assign To */}
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

            {/* Start + Due Date range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Starts
                </label>
                <Input
                  type="date"
                  value={form.startDate}
                  max={form.dueDate || undefined}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                />
                <p className="text-[10px] text-muted-foreground">Optional. Defaults to due date.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Due Date <span className="text-muted-foreground/60 normal-case">(ends)</span>
                </label>
                <Input
                  type="date"
                  value={form.dueDate}
                  min={form.startDate || undefined}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                />
                {form.startDate && form.dueDate && (
                  <p className="text-[10px] font-mono text-primary">
                    Spans {Math.max(1, Math.round((new Date(form.dueDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1)} day(s)
                  </p>
                )}
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

            {/* Repeat */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Repeat size={11} /> Repeat
              </label>
              <Select
                value={form.repeat}
                onValueChange={(v: string | null) => setForm(f => ({ ...f, repeat: (v as RepeatFrequency) ?? 'none' }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>

              {form.repeat !== 'none' && (
                <div className="space-y-3 mt-2 px-3.5 py-3 rounded-xl bg-primary/5 border border-primary/15">
                  {/* Interval */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Every</span>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={form.interval}
                      onChange={e => setForm(f => ({ ...f, interval: Number(e.target.value) || 1 }))}
                      className="w-16 h-8 text-center"
                    />
                    <span className="text-muted-foreground">
                      {form.repeat === 'daily' && (form.interval === 1 ? 'day' : 'days')}
                      {form.repeat === 'weekly' && (form.interval === 1 ? 'week' : 'weeks')}
                      {form.repeat === 'monthly' && (form.interval === 1 ? 'month' : 'months')}
                    </span>
                  </div>

                  {/* Weekly: weekdays */}
                  {form.repeat === 'weekly' && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">On</p>
                      <div className="flex flex-wrap gap-1">
                        {DOW_LABELS.map((label, idx) => {
                          const active = form.daysOfWeek.includes(idx)
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => toggleDayOfWeek(idx)}
                              className={cn(
                                'w-9 h-8 rounded-md text-[11px] font-semibold transition-all',
                                active
                                  ? 'bg-primary text-[var(--on-primary)]'
                                  : 'bg-[var(--surface-container-highest)] text-muted-foreground hover:text-foreground'
                              )}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Monthly: day-of-month */}
                  {form.repeat === 'monthly' && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">On day</p>
                      <div className="flex items-center gap-2 text-sm">
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          value={form.dayOfMonth}
                          onChange={e => setForm(f => ({ ...f, dayOfMonth: e.target.value, dayOfMonthLast: false }))}
                          disabled={form.dayOfMonthLast}
                          className="w-16 h-8 text-center"
                        />
                        <span className="text-muted-foreground">of the month</span>
                        <label className="flex items-center gap-1.5 ml-auto text-xs cursor-pointer">
                          <Checkbox
                            checked={form.dayOfMonthLast}
                            onCheckedChange={(c: boolean) => setForm(f => ({ ...f, dayOfMonthLast: c }))}
                          />
                          <span className="text-muted-foreground">Last day</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* End date */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ends</p>
                    <Input
                      type="date"
                      value={form.endDate}
                      onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                      className="h-8"
                      placeholder="Never"
                    />
                    <p className="text-[10px] text-muted-foreground">Leave blank to repeat indefinitely.</p>
                  </div>

                  {form.stakeholderIds.length > 1 && (
                    <p className="text-[10px] text-amber-500">
                      Only the first selected stakeholder is preserved on future instances.
                    </p>
                  )}
                </div>
              )}
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
