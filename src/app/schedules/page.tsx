'use client'
//
// /schedules — manage RecurringTaskTemplate rows.
//
// Cron generates concrete Task instances; this page is for shaping the
// templates that drive that loop.

import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Plus, Calendar, RefreshCw, Trash2, Pencil } from 'lucide-react'

import { useTeam } from '@/hooks/use-team'
import { useDepartments } from '@/hooks/use-departments'
import { useStakeholders } from '@/hooks/use-stakeholders'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
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
import { PRIORITIES, formatDate } from '@/lib/utils'

type Frequency = 'daily' | 'weekly' | 'monthly'

interface Template {
  id: string
  title: string
  description?: string | null
  priority: string
  department: string
  assigneeId?: string | null
  isSelfTask: boolean
  projectId?: string | null
  stakeholderId?: string | null
  frequency: Frequency
  interval: number
  daysOfWeek: number[]
  dayOfMonth: number | null
  dueOffsetDays: number
  startDate: string
  endDate: string | null
  isActive: boolean
  lastGeneratedAt: string | null
  nextRunAt: string | null
  assignee?: { id: string; name: string } | null
  project?: { id: string; title: string } | null
  stakeholder?: { id: string; name: string } | null
  createdByUser?: { id: string; name: string } | null
}

interface FormState {
  id: string | null
  title: string
  description: string
  priority: string
  department: string
  assigneeId: string
  isSelfTask: boolean
  projectId: string
  stakeholderId: string
  frequency: Frequency
  interval: number
  daysOfWeek: number[]
  dayOfMonth: string
  dayOfMonthLast: boolean
  dueOffsetDays: number
  startDate: string
  endDate: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function defaultForm(): FormState {
  const today = new Date()
  return {
    id: null,
    title: '',
    description: '',
    priority: 'medium',
    department: '',
    assigneeId: '__none__',
    isSelfTask: false,
    projectId: '__none__',
    stakeholderId: '__none__',
    frequency: 'weekly',
    interval: 1,
    daysOfWeek: [today.getDay()],
    dayOfMonth: String(today.getDate()),
    dayOfMonthLast: false,
    dueOffsetDays: 0,
    startDate: today.toISOString().slice(0, 10),
    endDate: '',
  }
}

function describeRecurrence(t: Template): string {
  if (t.frequency === 'daily') return t.interval === 1 ? 'Daily' : `Every ${t.interval} days`
  if (t.frequency === 'weekly') {
    const days = (t.daysOfWeek.length ? t.daysOfWeek : [new Date(t.startDate).getDay()])
      .slice()
      .sort()
      .map((d) => DOW_LABELS[d])
      .join(', ')
    const base = t.interval === 1 ? 'Weekly' : `Every ${t.interval} weeks`
    return `${base} on ${days}`
  }
  const dom = t.dayOfMonth ?? new Date(t.startDate).getDate()
  const dayLabel = dom === -1 ? 'last day' : `day ${dom}`
  return t.interval === 1 ? `Monthly on ${dayLabel}` : `Every ${t.interval} months on ${dayLabel}`
}

export default function SchedulesPage() {
  const me = useCurrentUser()
  const { data: templates, mutate, isLoading } = useSWR<Template[]>('/api/recurring-tasks', fetcher)
  const { members } = useTeam()
  const { departments } = useDepartments()
  const { stakeholders } = useStakeholders()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm())
  const [submitting, setSubmitting] = useState(false)

  const canCreate = !!me && me.role !== 'EXEC_VIEWER' && me.role !== 'GUEST'

  function openCreate() {
    if (!canCreate) {
      toast.error("You don't have permission to schedule tasks")
      return
    }
    setForm(defaultForm())
    setDialogOpen(true)
  }

  function openEdit(t: Template) {
    setForm({
      id: t.id,
      title: t.title,
      description: t.description ?? '',
      priority: t.priority,
      department: t.department,
      assigneeId: t.assigneeId ?? '__none__',
      isSelfTask: t.isSelfTask,
      projectId: t.projectId ?? '__none__',
      stakeholderId: t.stakeholderId ?? '__none__',
      frequency: t.frequency,
      interval: t.interval,
      daysOfWeek: t.daysOfWeek.length ? t.daysOfWeek : [new Date(t.startDate).getDay()],
      dayOfMonth: t.dayOfMonth && t.dayOfMonth > 0 ? String(t.dayOfMonth) : String(new Date(t.startDate).getDate()),
      dayOfMonthLast: t.dayOfMonth === -1,
      dueOffsetDays: t.dueOffsetDays,
      startDate: t.startDate.slice(0, 10),
      endDate: t.endDate ? t.endDate.slice(0, 10) : '',
    })
    setDialogOpen(true)
  }

  function toggleDow(day: number) {
    setForm(f => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day) ? f.daysOfWeek.filter(d => d !== day) : [...f.daysOfWeek, day],
    }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Title is required'); return }
    if (!form.department) { toast.error('Department is required'); return }
    if (!form.startDate) { toast.error('Start date is required'); return }
    if (form.frequency === 'weekly' && form.daysOfWeek.length === 0) {
      toast.error('Pick at least one weekday'); return
    }
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description || null,
        priority: form.priority,
        department: form.department,
        assigneeId: form.assigneeId === '__none__' ? null : form.assigneeId,
        isSelfTask: form.isSelfTask,
        projectId: form.projectId === '__none__' ? null : form.projectId,
        stakeholderId: form.stakeholderId === '__none__' ? null : form.stakeholderId,
        frequency: form.frequency,
        interval: Math.max(1, form.interval),
        daysOfWeek: form.frequency === 'weekly' ? form.daysOfWeek : [],
        dayOfMonth: form.frequency === 'monthly'
          ? (form.dayOfMonthLast ? -1 : Math.max(1, Math.min(31, Number(form.dayOfMonth))))
          : null,
        dueOffsetDays: Math.max(0, form.dueOffsetDays),
        startDate: form.startDate,
        endDate: form.endDate || null,
      }
      const url = form.id ? `/api/recurring-tasks/${form.id}` : '/api/recurring-tasks'
      const method = form.id ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to save')
      }
      await mutate()
      setDialogOpen(false)
      toast.success(form.id ? 'Schedule updated' : 'Schedule created')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(t: Template) {
    if (!confirm(`Delete schedule "${t.title}"? Already-generated tasks stay.`)) return
    try {
      const res = await fetch(`/api/recurring-tasks/${t.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed')
      }
      await mutate()
      toast.success('Schedule deleted')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  async function toggleActive(t: Template) {
    try {
      await fetch(`/api/recurring-tasks/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !t.isActive }),
      })
      await mutate()
    } catch {
      toast.error('Failed to toggle')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Schedules"
        description="Recurring task templates — daily, weekly, monthly"
        action={
          canCreate ? (
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New schedule
            </Button>
          ) : null
        }
      />

      {isLoading ? (
        <div className="text-sm py-12 text-center" style={{ color: 'var(--on-surface-variant)' }}>Loading…</div>
      ) : !templates || templates.length === 0 ? (
        <EmptyState
          icon={<RefreshCw className="h-8 w-8" />}
          title="No schedules yet"
          description="Create a recurring task to have it drop into the board on its own."
          action={canCreate ? <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />New schedule</Button> : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <div
            className="grid grid-cols-[2fr_1.4fr_1fr_1fr_1fr_120px] gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest"
            style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}
          >
            <span>Title</span>
            <span>Recurrence</span>
            <span>Assignee</span>
            <span>Next run</span>
            <span>Status</span>
            <span></span>
          </div>
          {templates.map(t => (
            <div
              key={t.id}
              className="grid grid-cols-[2fr_1.4fr_1fr_1fr_1fr_120px] gap-2 items-center px-4 py-3 rounded-xl"
              style={{ background: 'var(--surface-container-lowest)', boxShadow: 'var(--shadow-card)' }}
            >
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold truncate" style={{ color: 'var(--on-surface)' }}>{t.title}</span>
                <span className="text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>
                  {t.department}{t.dueOffsetDays > 0 ? ` · due +${t.dueOffsetDays}d` : ''}
                </span>
              </div>
              <span className="text-xs" style={{ color: 'var(--on-surface)' }}>{describeRecurrence(t)}</span>
              <span className="text-xs truncate" style={{ color: 'var(--on-surface-variant)' }}>
                {t.isSelfTask ? 'Self' : (t.assignee?.name ?? 'Unassigned')}
              </span>
              <span className="text-xs" style={{ color: 'var(--on-surface)' }}>
                {t.nextRunAt ? formatDate(t.nextRunAt) : '—'}
              </span>
              <button
                onClick={() => toggleActive(t)}
                className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full w-fit"
                style={
                  t.isActive
                    ? { background: 'rgba(16,185,129,0.12)', color: '#10B981' }
                    : { background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }
                }
              >
                {t.isActive ? 'Active' : 'Paused'}
              </button>
              <div className="flex items-center gap-1 justify-end">
                <button
                  onClick={() => openEdit(t)}
                  className="p-1.5 rounded transition-colors"
                  style={{ color: 'var(--on-surface-variant)' }}
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => remove(t)}
                  className="p-1.5 rounded transition-colors"
                  style={{ color: 'var(--on-surface-variant)' }}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit schedule' : 'New schedule'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Title *</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Department *</label>
                <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v ?? '' }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v ?? 'medium' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Assignee</label>
                <Select value={form.assigneeId} onValueChange={v => setForm(f => ({ ...f, assigneeId: v ?? '__none__' }))}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {(members as Array<{ id: string; name: string }>).map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Stakeholder</label>
                <Select value={form.stakeholderId} onValueChange={v => setForm(f => ({ ...f, stakeholderId: v ?? '__none__' }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {(stakeholders as Array<{ id: string; name: string }>).map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Recurrence */}
            <div
              className="flex flex-col gap-3 p-3 rounded-lg"
              style={{ background: 'var(--surface-container)' }}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--on-surface-variant)' }}>Repeat</span>
                {(['daily', 'weekly', 'monthly'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, frequency: f }))}
                    className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide transition-all"
                    style={
                      form.frequency === f
                        ? { background: 'var(--primary)', color: 'var(--on-primary)' }
                        : { background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }
                    }
                  >
                    {f}
                  </button>
                ))}
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>every</span>
                  <Input
                    type="number"
                    min={1}
                    value={form.interval}
                    onChange={e => setForm(p => ({ ...p, interval: Math.max(1, Number(e.target.value || 1)) }))}
                    className="w-20"
                  />
                  <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                    {form.frequency === 'daily' ? 'day(s)' : form.frequency === 'weekly' ? 'week(s)' : 'month(s)'}
                  </span>
                </div>
              </div>

              {form.frequency === 'weekly' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--on-surface-variant)' }}>On</span>
                  {DOW_LABELS.map((label, idx) => {
                    const active = form.daysOfWeek.includes(idx)
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleDow(idx)}
                        className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide transition-all"
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
              )}

              {form.frequency === 'monthly' && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--on-surface-variant)' }}>On</span>
                  <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--on-surface)' }}>
                    <input
                      type="checkbox"
                      checked={form.dayOfMonthLast}
                      onChange={e => setForm(p => ({ ...p, dayOfMonthLast: e.target.checked }))}
                    />
                    Last day of month
                  </label>
                  {!form.dayOfMonthLast && (
                    <>
                      <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>day</span>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={form.dayOfMonth}
                        onChange={e => setForm(p => ({ ...p, dayOfMonth: e.target.value }))}
                        className="w-20"
                      />
                      <span className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>(months with fewer days clamp to last day)</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Start *</label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">End (optional)</label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Due offset (days)</label>
                <Input
                  type="number"
                  min={0}
                  value={form.dueOffsetDays}
                  onChange={e => setForm(f => ({ ...f, dueOffsetDays: Math.max(0, Number(e.target.value || 0)) }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional details that show on each generated task…"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : form.id ? 'Save' : 'Create schedule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
