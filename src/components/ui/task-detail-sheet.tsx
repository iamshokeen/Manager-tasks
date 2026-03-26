'use client'

import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { toast } from 'sonner'
import { ExternalLink, Calendar, X } from 'lucide-react'
import { SummarizeButton, SummaryCard } from '@/components/ui/summarize-button'

import {
  Sheet,
  SheetContent,
  SheetHeader,
} from '@/components/ui/sheet'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { TaskComments } from '@/components/ui/task-comments'
import { StatusBadge } from '@/components/ui/status-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, STATUS_LABELS, TASK_STATUSES, PRIORITIES, formatDate } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

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
}

interface Activity {
  id: string
  note: string
  authorName: string | null
  createdAt: string
}

interface TaskDetailSheetProps {
  taskId: string | null
  open: boolean
  onClose: () => void
  onTaskUpdated: () => void
}

export function TaskDetailSheet({ taskId, open, onClose, onTaskUpdated }: TaskDetailSheetProps) {
  const { data: taskData, mutate: mutateTask } = useSWR<TaskDetail>(
    taskId && open ? `/api/tasks/${taskId}` : null,
    fetcher
  )

  const { data: activitiesData } = useSWR<{ activities: Activity[] }>(
    taskId && open ? `/api/tasks/${taskId}/activities` : null,
    fetcher,
    { onError: () => {} }
  )

  const task = taskData

  // Title editing
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Description editing
  const [descValue, setDescValue] = useState('')
  const [descChanged, setDescChanged] = useState(false)
  const [savingDesc, setSavingDesc] = useState(false)

  // Status dropdown
  const [statusOpen, setStatusOpen] = useState(false)

  // Priority dropdown
  const [priorityOpen, setPriorityOpen] = useState(false)

  // AI summary
  const [summary, setSummary] = useState<string | null>(null)

  // Sync state when task loads
  useEffect(() => {
    if (task) {
      setTitleValue(task.title)
      setDescValue(task.description ?? '')
      setDescChanged(false)
    }
  }, [task])

  // Focus title input when editing starts
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [editingTitle])

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

  async function changeStatus(newStatus: string) {
    setStatusOpen(false)
    await patchTask({ status: newStatus })
    toast.success('Status updated')
  }

  async function changePriority(newPriority: string) {
    setPriorityOpen(false)
    await patchTask({ priority: newPriority })
    toast.success('Priority updated')
  }

  const activities = activitiesData?.activities?.slice(0, 5) ?? []

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="sm:max-w-2xl w-full flex flex-col p-0 gap-0 overflow-hidden"
      >
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b border-border gap-0 flex-shrink-0">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
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
                  className="text-base font-semibold h-8"
                />
              ) : (
                <h2
                  onClick={() => setEditingTitle(true)}
                  className="text-base font-semibold text-foreground cursor-pointer hover:text-primary transition-colors truncate"
                  title="Click to edit"
                >
                  {task?.title ?? 'Loading…'}
                </h2>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {taskId && (
                <Link href={`/tasks/${taskId}`} target="_blank">
                  <Button variant="ghost" size="icon-sm" title="Open full page">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              <Button variant="ghost" size="icon-sm" onClick={onClose} title="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {task ? (
            <>
              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Status */}
                <div className="relative">
                  <button
                    onClick={() => { setStatusOpen(v => !v); setPriorityOpen(false) }}
                    className="cursor-pointer"
                    title="Change status"
                  >
                    <StatusBadge status={task.status} />
                  </button>
                  {statusOpen && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                      {TASK_STATUSES.map(s => (
                        <button
                          key={s}
                          onClick={() => changeStatus(s)}
                          className={cn(
                            'w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors',
                            task.status === s && 'text-primary font-medium'
                          )}
                        >
                          {STATUS_LABELS[s] ?? s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Priority */}
                <div className="relative">
                  <button
                    onClick={() => { setPriorityOpen(v => !v); setStatusOpen(false) }}
                    className="cursor-pointer"
                    title="Change priority"
                  >
                    <PriorityBadge priority={task.priority} />
                  </button>
                  {priorityOpen && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[130px]">
                      {PRIORITIES.map(p => (
                        <button
                          key={p}
                          onClick={() => changePriority(p)}
                          className={cn(
                            'w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors capitalize',
                            task.priority === p && 'text-primary font-medium'
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assignee */}
                {task.assignee && (
                  <div className="flex items-center gap-1.5">
                    <MemberAvatar name={task.assignee.name} size="sm" />
                    <span className="text-xs text-muted-foreground">{task.assignee.name}</span>
                  </div>
                )}

                {/* Due date */}
                {task.dueDate && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(task.dueDate)}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</h3>
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
                  <Button
                    size="sm"
                    onClick={saveDescription}
                    disabled={savingDesc}
                    className="h-7 text-xs"
                  >
                    {savingDesc ? 'Saving…' : 'Save'}
                  </Button>
                )}
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comments</h3>
                <TaskComments taskId={task.id} />
              </div>

              {/* Activity */}
              {activities.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Activity</h3>
                  <div className="space-y-2">
                    {activities.map(a => (
                      <div key={a.id} className="flex items-start gap-2 text-sm">
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-muted-foreground mt-0.5">
                          {(a.authorName ?? 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-foreground/80">{a.note}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {a.authorName ?? 'Unknown'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-40">
              <span className="text-sm text-muted-foreground">Loading task…</span>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
