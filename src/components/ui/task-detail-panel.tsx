'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  X, ExternalLink, Calendar, ChevronDown, Plus, Sparkles,
  User, Users, Building2, Layers,
} from 'lucide-react'
import { cn, STATUS_LABELS, TASK_STATUSES, PRIORITIES, formatDate } from '@/lib/utils'
import { SummarizeButton, SummaryCard } from '@/components/ui/summarize-button'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { TaskComments } from '@/components/ui/task-comments'
import { StatusBadge } from '@/components/ui/status-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { DepartmentBadge } from '@/components/ui/department-badge'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDepartments } from '@/hooks/use-departments'
import { useStakeholders } from '@/hooks/use-stakeholders'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

type Tab = 'overview' | 'description' | 'comments' | 'activity'

interface StakeholderLink {
  stakeholder: { id: string; name: string; title?: string | null }
}

interface TaskDetail {
  id: string
  title: string
  status: string
  priority: string
  description?: string | null
  dueDate?: string | null
  assignee?: { id: string; name: string } | null
  assignedByName?: string | null
  department?: string | null
  stakeholders?: StakeholderLink[]
  project?: { id: string; title: string } | null
  createdAt?: string
}

interface Activity {
  id: string
  note: string
  authorName: string | null
  createdAt: string
}

interface TaskDetailPanelProps {
  taskId: string | null
  open: boolean
  onClose: () => void
  onTaskUpdated: () => void
}

export function TaskDetailPanel({ taskId, open, onClose, onTaskUpdated }: TaskDetailPanelProps) {
  const { data: taskData, mutate: mutateTask } = useSWR<TaskDetail>(
    taskId && open ? `/api/tasks/${taskId}` : null,
    fetcher
  )
  const { data: activitiesData } = useSWR<Activity[]>(
    taskId && open ? `/api/tasks/${taskId}/activities` : null,
    fetcher,
    { onError: () => {} }
  )

  const task = taskData

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [descValue, setDescValue] = useState('')
  const [descChanged, setDescChanged] = useState(false)
  const [savingDesc, setSavingDesc] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [priorityOpen, setPriorityOpen] = useState(false)
  const [deptOpen, setDeptOpen] = useState(false)
  const [stkOpen, setStkOpen] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [progressReport, setProgressReport] = useState<string | null>(null)
  const [loadingProgress, setLoadingProgress] = useState(false)

  const { departments } = useDepartments()
  const { stakeholders: allStakeholders } = useStakeholders()

  useEffect(() => {
    if (task) {
      setTitleValue(task.title)
      setDescValue(task.description ?? '')
      setDescChanged(false)
    }
  }, [task])

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [editingTitle])

  // Reset tab when a new task is opened
  useEffect(() => {
    if (open) setActiveTab('overview')
  }, [taskId, open])

  async function patchTask(updates: Record<string, unknown>) {
    if (!taskId) return
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update task')
      await mutateTask()
      onTaskUpdated()
    } catch {
      toast.error('Failed to update task')
    }
  }

  async function saveTitle() {
    const trimmed = titleValue.trim()
    if (!trimmed || trimmed === task?.title) {
      setEditingTitle(false)
      setTitleValue(task?.title ?? '')
      return
    }
    setEditingTitle(false)
    await patchTask({ title: trimmed })
    toast.success('Title updated')
  }

  async function saveDescription() {
    setSavingDesc(true)
    await patchTask({ description: descValue })
    setSavingDesc(false)
    setDescChanged(false)
    toast.success('Description saved')
  }

  async function changeStatus(s: string) {
    setStatusOpen(false)
    await patchTask({ status: s })
    toast.success('Status updated')
  }

  async function changePriority(p: string) {
    setPriorityOpen(false)
    await patchTask({ priority: p })
    toast.success('Priority updated')
  }

  async function changeDepartment(d: string) {
    setDeptOpen(false)
    await patchTask({ department: d })
    toast.success('Department updated')
  }

  async function addStakeholder(sId: string) {
    if (!task) return
    setStkOpen(false)
    const current = task.stakeholders?.map(s => s.stakeholder.id) ?? []
    if (current.includes(sId)) return
    await patchTask({ stakeholderIds: [...current, sId] })
    toast.success('Stakeholder added')
  }

  async function removeStakeholder(sId: string) {
    if (!task) return
    const current = task.stakeholders?.map(s => s.stakeholder.id) ?? []
    await patchTask({ stakeholderIds: current.filter(id => id !== sId) })
    toast.success('Stakeholder removed')
  }

  const fetchProgressReport = useCallback(async () => {
    if (!taskId) return
    setLoadingProgress(true)
    try {
      const res = await fetch('/api/ai/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'comments', taskId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setProgressReport(data.summary)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate report')
    } finally {
      setLoadingProgress(false)
    }
  }, [taskId])

  const activities = activitiesData?.slice(0, 8) ?? []

  const taskStakeholders = task?.stakeholders ?? []
  const taskStakeholderIds = taskStakeholders.map(s => s.stakeholder.id)
  const availableStakeholders = (allStakeholders as Array<{ id: string; name: string }>).filter(
    s => !taskStakeholderIds.includes(s.id)
  )

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-[560px] bg-[var(--surface-container)] border-l border-border shadow-2xl">

        {/* Cover gradient area */}
        <div className="relative h-[100px] flex-shrink-0 overflow-hidden bg-gradient-to-br from-[var(--surface-container-high)] to-[var(--surface-container-highest)]">
          <div className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(201,169,110,0.06) 20px, rgba(201,169,110,0.06) 40px)',
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[var(--surface-container)] to-transparent" />
          {/* Cover action buttons */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {taskId && (
              <Link href={`/tasks/${taskId}`} target="_blank">
                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-black/30 border border-white/10 text-[var(--outline)] hover:text-[var(--fg)] hover:border-[var(--primary)] transition-all cursor-pointer">
                  <ExternalLink size={13} />
                </button>
              </Link>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-black/30 border border-white/10 text-[var(--outline)] hover:text-red-400 hover:border-red-400/40 transition-all cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Header: status + title + tabs */}
        <div className="px-6 pt-3 pb-0 flex-shrink-0">
          {/* Status + priority row */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="relative">
              <button
                onClick={() => { setStatusOpen(v => !v); setPriorityOpen(false); setDeptOpen(false); setStkOpen(false) }}
                className="cursor-pointer"
                title="Change status"
              >
                <StatusBadge status={task?.status ?? 'todo'} />
              </button>
              {statusOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[150px]">
                  {TASK_STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => changeStatus(s)}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors cursor-pointer',
                        task?.status === s && 'text-primary font-medium'
                      )}
                    >
                      {STATUS_LABELS[s] ?? s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => { setPriorityOpen(v => !v); setStatusOpen(false); setDeptOpen(false); setStkOpen(false) }}
                className="cursor-pointer"
                title="Change priority"
              >
                <PriorityBadge priority={task?.priority ?? 'medium'} />
              </button>
              {priorityOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[130px]">
                  {PRIORITIES.map(p => (
                    <button
                      key={p}
                      onClick={() => changePriority(p)}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors capitalize cursor-pointer',
                        task?.priority === p && 'text-primary font-medium'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {task?.department && (
              <div className="relative">
                <button
                  onClick={() => { setDeptOpen(v => !v); setStatusOpen(false); setPriorityOpen(false); setStkOpen(false) }}
                  className="cursor-pointer"
                  title="Change department"
                >
                  <DepartmentBadge department={task.department} />
                </button>
                {deptOpen && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[160px]">
                    {departments?.map(d => (
                      <button
                        key={d}
                        onClick={() => changeDepartment(d)}
                        className={cn(
                          'w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors cursor-pointer',
                          task?.department === d && 'text-primary font-medium'
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          {editingTitle ? (
            <Input
              ref={titleInputRef}
              value={titleValue}
              onChange={e => setTitleValue(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => {
                if (e.key === 'Enter') saveTitle()
                if (e.key === 'Escape') {
                  setEditingTitle(false)
                  setTitleValue(task?.title ?? '')
                }
              }}
              className="text-lg font-semibold h-9 mb-3"
            />
          ) : (
            <h2
              onClick={() => setEditingTitle(true)}
              className="font-serif text-[1.4rem] leading-snug text-foreground cursor-pointer hover:text-primary transition-colors mb-4"
              title="Click to edit"
            >
              {task?.title ?? 'Loading…'}
            </h2>
          )}

          {/* Tabs */}
          <div className="flex border-b border-border -mx-6 px-6">
            {(['overview', 'description', 'comments', 'activity'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors cursor-pointer border-b-2 -mb-px',
                  activeTab === tab
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                )}
              >
                {tab === 'overview' ? 'Details' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main content (left) */}
          <div className="flex-1 overflow-y-auto p-6">
            {!task ? (
              <div className="flex items-center justify-center h-32">
                <span className="text-sm text-muted-foreground">Loading…</span>
              </div>
            ) : (
              <>
                {/* OVERVIEW tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-5">
                    {/* Description preview */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Description</h3>
                        <SummarizeButton
                          getText={() => descValue.replace(/<[^>]+>/g, ' ').trim()}
                          onSummary={s => setSummary(s)}
                        />
                      </div>
                      {summary && <SummaryCard summary={summary} onDismiss={() => setSummary(null)} />}
                      <RichTextEditor
                        content={descValue}
                        onChange={html => {
                          setDescValue(html)
                          setDescChanged(html !== (task.description ?? ''))
                        }}
                        placeholder="Add a description…"
                        editable={true}
                      />
                      {descChanged && (
                        <Button size="sm" onClick={saveDescription} disabled={savingDesc} className="h-7 text-xs">
                          {savingDesc ? 'Saving…' : 'Save'}
                        </Button>
                      )}
                    </div>

                    {/* Activity snippet */}
                    {activities.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-border">
                        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Recent Activity</h3>
                        <div className="space-y-2">
                          {activities.slice(0, 3).map(a => (
                            <div key={a.id} className="flex items-start gap-2 text-sm">
                              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-muted-foreground mt-0.5">
                                {(a.authorName ?? 'S').charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-foreground/80 text-xs">{a.note}</span>
                                <span className="text-[11px] text-muted-foreground ml-2">{a.authorName ?? 'System'}</span>
                              </div>
                            </div>
                          ))}
                          {activities.length > 3 && (
                            <button onClick={() => setActiveTab('activity')} className="text-xs text-primary hover:underline cursor-pointer">
                              View all {activities.length} activity items
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* DESCRIPTION tab */}
                {activeTab === 'description' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <SummarizeButton
                        getText={() => descValue.replace(/<[^>]+>/g, ' ').trim()}
                        onSummary={s => setSummary(s)}
                      />
                    </div>
                    {summary && <SummaryCard summary={summary} onDismiss={() => setSummary(null)} />}
                    <RichTextEditor
                      content={descValue}
                      onChange={html => {
                        setDescValue(html)
                        setDescChanged(html !== (task.description ?? ''))
                      }}
                      placeholder="Add a description…"
                      editable={true}
                    />
                    {descChanged && (
                      <Button size="sm" onClick={saveDescription} disabled={savingDesc} className="h-7 text-xs">
                        {savingDesc ? 'Saving…' : 'Save'}
                      </Button>
                    )}
                  </div>
                )}

                {/* COMMENTS tab */}
                {activeTab === 'comments' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Comments</h3>
                      <button
                        onClick={fetchProgressReport}
                        disabled={loadingProgress}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 cursor-pointer"
                        title="Generate progress report from comments"
                      >
                        <Sparkles className="h-3 w-3" />
                        {loadingProgress ? 'Generating…' : 'Progress Report'}
                      </button>
                    </div>
                    {progressReport && (
                      <SummaryCard summary={progressReport} onDismiss={() => setProgressReport(null)} />
                    )}
                    <TaskComments taskId={task.id} />
                  </div>
                )}

                {/* ACTIVITY tab */}
                {activeTab === 'activity' && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Activity Log</h3>
                    {activities.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No activity yet.</p>
                    ) : (
                      activities.map(a => (
                        <div key={a.id} className="flex items-start gap-2 text-sm">
                          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-muted-foreground mt-0.5">
                            {(a.authorName ?? 'S').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-foreground/80">{a.note}</span>
                            <span className="text-xs text-muted-foreground ml-2">{a.authorName ?? 'System'}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Metadata sidebar (right) */}
          <div className="w-[188px] flex-shrink-0 border-l border-border overflow-y-auto p-4 space-y-5">

            {/* Assigned To */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <User size={10} /> Assigned To
              </p>
              {task?.assignee ? (
                <div className="flex items-center gap-2">
                  <MemberAvatar name={task.assignee.name} size="sm" />
                  <span className="text-xs text-foreground truncate">{task.assignee.name}</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Unassigned</span>
              )}
            </div>

            {/* Assigned By */}
            {task?.assignedByName && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <User size={10} /> Assigned By
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary flex-shrink-0">
                    {task.assignedByName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-foreground truncate">{task.assignedByName}</span>
                </div>
              </div>
            )}

            <div className="h-px bg-border" />

            {/* Stakeholders */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <Users size={10} /> Stakeholders
              </p>
              <div className="space-y-1.5">
                {taskStakeholders.map(sl => (
                  <div
                    key={sl.stakeholder.id}
                    className="flex items-center gap-1.5 group"
                  >
                    <div className="w-4 h-4 rounded bg-purple-500/20 flex items-center justify-center text-[8px] font-bold text-purple-300 flex-shrink-0">
                      {sl.stakeholder.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-foreground flex-1 truncate">{sl.stakeholder.name}</span>
                    <button
                      onClick={() => removeStakeholder(sl.stakeholder.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all cursor-pointer"
                      title="Remove"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}

                {/* Add stakeholder */}
                {availableStakeholders.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setStkOpen(v => !v)}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors border border-dashed border-border hover:border-primary/40 rounded px-1.5 py-0.5 w-full cursor-pointer"
                    >
                      <Plus size={10} /> Add
                    </button>
                    {stkOpen && (
                      <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[160px] max-h-48 overflow-y-auto">
                        {availableStakeholders.map(s => (
                          <button
                            key={s.id}
                            onClick={() => addStakeholder(s.id)}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors cursor-pointer truncate"
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {taskStakeholders.length === 0 && availableStakeholders.length === 0 && (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Due Date */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <Calendar size={10} /> Due Date
              </p>
              <span className="text-xs text-foreground">
                {task?.dueDate ? formatDate(task.dueDate) : <span className="text-muted-foreground">Not set</span>}
              </span>
            </div>

            {/* Department */}
            {task?.department && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Building2 size={10} /> Department
                </p>
                <DepartmentBadge department={task.department} />
              </div>
            )}

            {/* Project */}
            {task?.project && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Layers size={10} /> Project
                </p>
                <Link
                  href={`/projects/${task.project.id}`}
                  className="text-xs text-primary hover:underline truncate block"
                >
                  {task.project.title}
                </Link>
              </div>
            )}

            {/* Created */}
            {task?.createdAt && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Created</p>
                <span className="text-xs text-muted-foreground">{formatDate(task.createdAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
