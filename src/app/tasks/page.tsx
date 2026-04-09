'use client'

import React, { useState } from 'react'
import { Plus, Search, Calendar, ClipboardList, User, Archive, Sparkles, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrentUser } from '@/hooks/use-current-user'

import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { useTasks } from '@/hooks/use-tasks'
import { useTeam } from '@/hooks/use-team'
import { useDepartments } from '@/hooks/use-departments'
import { PageHeader } from '@/components/ui/page-header'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { DepartmentBadge } from '@/components/ui/department-badge'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { cn, formatDate, isOverdue, isDueToday } from '@/lib/utils'
import type { TaskFilters } from '@/types'

type Tab = 'kanban' | 'list' | 'calendar'
import { TaskDetailPanel } from '@/components/ui/task-detail-panel'
import { TaskCreatePanel } from '@/components/ui/task-create-panel'
import { BacklogAlert } from '@/components/ui/backlog-alert'
import { AiTaskParser } from '@/components/ui/ai-task-parser'
import { TaskCalendarView } from '@/components/ui/task-calendar-view'

// ---------------------------------------------------------------------------
// Kanban column definitions
// ---------------------------------------------------------------------------

const KANBAN_COLUMNS: Array<{ key: 'todo' | 'in_progress' | 'review' | 'done'; label: string; color: string; dotColor: string; countStyle: string }> = [
  { key: 'todo',        label: 'To Do',       color: 'border-t-[#6B7280]', dotColor: '#6B7280', countStyle: '' },
  { key: 'in_progress', label: 'In Progress', color: 'border-t-[#0053db]', dotColor: '#0053db', countStyle: 'primary' },
  { key: 'review',      label: 'Review',      color: 'border-t-[#865400]', dotColor: '#865400', countStyle: '' },
  { key: 'done',        label: 'Done',        color: 'border-t-[#10B981]', dotColor: '#10B981', countStyle: '' },
]

// Columns shown in the active Kanban board (done is archived separately)
const ACTIVE_COLUMNS = KANBAN_COLUMNS.filter(c => c.key !== 'done')

type ColumnKey = 'todo' | 'in_progress' | 'review' | 'done'

// ---------------------------------------------------------------------------
// Task type used on this page
// ---------------------------------------------------------------------------

interface TaskShape {
  id: string
  title: string
  priority: string
  status?: string
  department?: string
  dueDate?: string | null
  assignee?: { id: string; name: string } | null
  assignedByName?: string | null
  stakeholders?: Array<{ stakeholder: { id: string; name: string } }>
}

// Droppable column wrapper — enables empty columns to accept drops
function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5 min-h-[80px] rounded-xl transition-colors',
        isOver && 'ring-2 ring-inset'
      )}
      style={isOver ? { outline: '2px solid var(--primary)', outlineOffset: '-2px' } : {}}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Static TaskCard (used for the non-draggable detail-click scenario)
// ---------------------------------------------------------------------------

interface TaskCardProps {
  task: TaskShape
  onClick: () => void
  isMyTask?: boolean
}

function TaskCard({ task, onClick, isMyTask }: TaskCardProps) {
  const overdue = isOverdue(task.dueDate ?? null)
  const today = isDueToday(task.dueDate ?? null)
  const dueDateStyle = overdue
    ? { color: 'var(--error)' }
    : today
    ? { color: 'var(--tertiary)' }
    : { color: 'var(--on-surface-variant)' }

  return (
    <div
      onClick={onClick}
      className="rounded-xl p-4 cursor-pointer transition-all group"
      style={{
        background: isMyTask ? 'rgba(0,83,219,0.04)' : 'var(--surface-container-lowest)',
        boxShadow: '0 8px 30px rgb(42,52,57,0.04)',
        borderLeft: isMyTask ? '3px solid var(--primary)' : '3px solid transparent',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 30px rgb(42,52,57,0.08)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 30px rgb(42,52,57,0.04)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <PriorityBadge priority={task.priority} />
        {task.stakeholders && task.stakeholders.length > 0 && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>groups</span>
            {task.stakeholders.length}
          </span>
        )}
      </div>
      <p className="text-sm font-semibold line-clamp-2 mb-1 leading-snug transition-colors group-hover:text-[var(--primary)]" style={{ color: 'var(--on-surface)' }}>
        {task.title}
      </p>
      {task.assignedByName && (
        <p className="text-[11px] mb-3" style={{ color: 'var(--on-surface-variant)' }}>
          by <span className="font-semibold">{task.assignedByName}</span>
        </p>
      )}
      {task.department && (
        <div className="mb-2">
          <DepartmentBadge department={task.department} />
        </div>
      )}
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          {task.assignee ? (
            <>
              <MemberAvatar name={task.assignee.name} size="sm" />
              <span className="text-[11px] font-medium truncate max-w-[80px]" style={{ color: 'var(--on-surface-variant)' }}>{task.assignee.name}</span>
            </>
          ) : (
            <span className="text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>Unassigned</span>
          )}
        </div>
        {task.dueDate && (
          <div className="flex items-center gap-1 text-[11px] font-bold" style={dueDateStyle}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>calendar_today</span>
            <span>{formatDate(task.dueDate)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SortableTaskCard — wraps TaskCard with dnd-kit drag handles
// ---------------------------------------------------------------------------

interface SortableTaskCardProps {
  task: TaskShape
  onClick: () => void
  isMyTask?: boolean
}

function SortableTaskCard({ task, onClick, isMyTask }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing select-none"
    >
      <TaskCard task={task} onClick={onClick} isMyTask={isMyTask} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// (Create-task form is handled by TaskCreatePanel component)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ArchiveList — compact list of done tasks
// ---------------------------------------------------------------------------

interface ArchiveListProps {
  tasks: TaskShape[]
  onRestore: (task: TaskShape) => void
}

function ArchiveList({ tasks, onRestore }: ArchiveListProps) {
  if (tasks.length === 0) {
    return <p className="text-sm py-3" style={{ color: 'var(--on-surface-variant)' }}>No completed tasks.</p>
  }
  return (
    <div className="mt-3 space-y-1.5">
      {tasks.map(task => (
        <div
          key={task.id}
          className="flex items-center gap-3 rounded-xl px-3 py-2"
          style={{ background: 'var(--surface-container-lowest)', boxShadow: 'var(--shadow-card)' }}
        >
          <p className="flex-1 text-sm line-through truncate" style={{ color: 'var(--on-surface-variant)' }}>{task.title}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <PriorityBadge priority={task.priority} />
            {task.assignee && (
              <div className="flex items-center gap-1">
                <MemberAvatar name={task.assignee.name} size="sm" />
              </div>
            )}
            {task.dueDate && (
              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>calendar_today</span>
                <span>{formatDate(task.dueDate)}</span>
              </div>
            )}
            <button
              onClick={() => onRestore(task)}
              className="text-xs font-semibold hover:underline transition-colors"
              style={{ color: 'var(--primary)' }}
            >
              Restore
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TasksPage() {
  const currentUser = useCurrentUser()

  const [activeTab, setActiveTab] = useState<Tab>('kanban')
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [assignedToMe, setAssignedToMe] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [aiParserOpen, setAiParserOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [showArchive, setShowArchive] = useState(false)

  const myTeamMemberId = currentUser?.teamMemberId

  const filters: TaskFilters = {}
  if (search) filters.search = search
  if (deptFilter && deptFilter !== 'all') filters.department = deptFilter
  if (assignedToMe && myTeamMemberId) filters.assigneeId = myTeamMemberId

  const { tasks, mutate, isLoading } = useTasks(filters)
  const { mutate: mutateTeam } = useTeam()
  const { departments } = useDepartments()

  // Group tasks by column
  const columns: Record<ColumnKey, TaskShape[]> = {
    todo:        (tasks as TaskShape[]).filter(t => t.status === 'todo'),
    in_progress: (tasks as TaskShape[]).filter(t => t.status === 'in_progress'),
    review:      (tasks as TaskShape[]).filter(t => t.status === 'review'),
    done:        (tasks as TaskShape[]).filter(t => t.status === 'done'),
  }

  const doneTasks = columns.done

  async function handleRestore(task: TaskShape) {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'todo' }),
      })
      if (!res.ok) throw new Error('Failed to restore task')
      await mutate()
      toast.success('Task restored')
    } catch {
      toast.error('Failed to restore task')
    }
  }

  // -------------------------------------------------------------------------
  // dnd-kit sensors
  // -------------------------------------------------------------------------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // -------------------------------------------------------------------------
  // Drag-end: PATCH the task status when dropped on a new column
  // -------------------------------------------------------------------------
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const overId = String(over.id)
    // The SortableContext ids are ColumnKey strings; card ids are UUIDs.
    // If dropped directly on the column droppable (id === ColumnKey), move there.
    // If dropped on another card, find which column that card belongs to.
    let targetColumn: ColumnKey | undefined = KANBAN_COLUMNS.find(c => c.key === overId)?.key as ColumnKey | undefined

    if (!targetColumn) {
      // Dropped on a card — find which column owns that card
      for (const col of KANBAN_COLUMNS) {
        if (columns[col.key].some(t => t.id === overId)) {
          targetColumn = col.key
          break
        }
      }
    }

    if (!targetColumn) return

    const task = (tasks as TaskShape[]).find(t => t.id === String(active.id))
    if (!task || task.status === targetColumn) return

    // Optimistic revalidate then PATCH
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetColumn }),
      })
      if (!res.ok) throw new Error('Failed to update task status')
      await mutate()
      toast.success('Task moved')
    } catch {
      toast.error('Failed to move task')
      await mutate()
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Tasks"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setAiParserOpen(true)}
              className="gap-1.5"
              style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>auto_awesome</span>
              AI Parse
            </Button>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-all hover:shadow-md active:scale-95"
              style={{
                background: 'linear-gradient(to right, var(--primary), var(--primary-dim))',
                color: 'var(--on-primary)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              Drop a Task
            </button>
          </div>
        }
      />

      {/* Tab bar — pill style */}
      <div className="flex items-center gap-1.5 mb-5 -mt-2 p-1 rounded-xl w-fit" style={{ background: 'var(--surface-container)' }}>
        {(['list', 'kanban', 'calendar'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all cursor-pointer',
              activeTab === tab
                ? 'shadow-sm'
                : 'hover:opacity-80'
            )}
            style={activeTab === tab
              ? { background: 'var(--surface-container-lowest)', color: 'var(--primary)' }
              : { color: 'var(--on-surface-variant)', background: 'transparent' }
            }
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Filter bar — shown for list + kanban only */}
      {activeTab !== 'calendar' && (
        <div
          className="flex items-center gap-3 mb-6 flex-wrap px-4 py-3 rounded-xl"
          style={{ background: 'var(--surface-container)' }}
        >
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined pointer-events-none" style={{ fontSize: '18px', color: 'var(--on-surface-variant)' }}>search</span>
            <Input
              placeholder="Search tasks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={deptFilter} onValueChange={(v: string | null) => setDeptFilter(v ?? 'all')}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {myTeamMemberId && (
            <Button
              variant={assignedToMe ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAssignedToMe(v => !v)}
              className="gap-1.5"
            >
              <User className="h-3.5 w-3.5" />
              Assigned to me
            </Button>
          )}
        </div>
      )}

      {/* ── Calendar tab ─────────────────────────────────────────────────── */}
      {activeTab === 'calendar' && (
        <TaskCalendarView
          tasks={tasks as TaskShape[]}
          onTaskClick={(id) => { setSelectedTaskId(id); setSheetOpen(true) }}
          mutate={mutate}
          myTeamMemberId={myTeamMemberId}
        />
      )}

      {/* ── List tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'list' && (
        <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--on-surface-variant)' }}>Loading…</p>
          ) : (tasks as TaskShape[]).filter(t => t.status !== 'done').length === 0 ? (
            <EmptyState icon={<ClipboardList className="h-8 w-8" />} title="No tasks found" description="Adjust filters or create a task" />
          ) : (
            <>
              {/* Header row */}
              <div
                className="grid grid-cols-[1fr_100px_90px_120px_90px_90px] gap-3 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg mb-1"
                style={{ color: 'var(--on-surface-variant)', background: 'var(--surface-container)' }}
              >
                <span>Task</span>
                <span>Status</span>
                <span>Priority</span>
                <span>Assignee</span>
                <span>Dept</span>
                <span>Due</span>
              </div>
              {(tasks as TaskShape[]).filter(t => t.status !== 'done').map(task => {
                const overdue   = isOverdue(task.dueDate ?? null)
                const today     = isDueToday(task.dueDate ?? null)
                const isMyTask  = !!myTeamMemberId && task.assignee?.id === myTeamMemberId
                return (
                  <div
                    key={task.id}
                    onClick={() => { setSelectedTaskId(task.id); setSheetOpen(true) }}
                    className="grid grid-cols-[1fr_100px_90px_120px_90px_90px] gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all group items-center"
                    style={{
                      background: isMyTask ? 'rgba(0,83,219,0.04)' : 'var(--surface-container-lowest)',
                      boxShadow: 'var(--shadow-card)',
                      borderLeft: isMyTask ? '3px solid var(--primary)' : '3px solid transparent',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = isMyTask ? 'rgba(0,83,219,0.07)' : 'var(--surface-container-low)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isMyTask ? 'rgba(0,83,219,0.04)' : 'var(--surface-container-lowest)' }}
                  >
                    <p className="text-sm font-semibold truncate transition-colors group-hover:text-[var(--primary)]" style={{ color: 'var(--on-surface)' }}>{task.title}</p>
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full w-fit uppercase tracking-wide',
                      task.status === 'todo'        && 'bg-[var(--surface-container-highest)] text-[var(--on-surface-variant)]',
                      task.status === 'in_progress' && 'bg-[#dbe1ff] text-[#0048bf]',
                      task.status === 'review'      && 'bg-[#f8a010]/10 text-[#865400]',
                    )}>
                      {task.status === 'in_progress' ? 'In Progress' : task.status === 'todo' ? 'To Do' : 'Review'}
                    </span>
                    <PriorityBadge priority={task.priority} />
                    <div className="flex items-center gap-1.5 min-w-0">
                      {task.assignee
                        ? <><MemberAvatar name={task.assignee.name} size="sm" /><span className="text-xs truncate" style={{ color: 'var(--on-surface-variant)' }}>{task.assignee.name}</span></>
                        : <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>—</span>
                      }
                    </div>
                    {task.department
                      ? <DepartmentBadge department={task.department} />
                      : <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>—</span>
                    }
                    {task.dueDate ? (
                      <div
                        className="flex items-center gap-1 text-xs font-bold"
                        style={overdue ? { color: 'var(--error)' } : today ? { color: 'var(--tertiary)' } : { color: 'var(--on-surface-variant)' }}
                      >
                        <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '12px' }}>calendar_today</span>
                        {formatDate(task.dueDate)}
                      </div>
                    ) : <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>—</span>}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* ── Kanban tab ───────────────────────────────────────────────────── */}
      {activeTab === 'kanban' && <>
      {/* Backlog alert — computed from live task data, no AI */}
      <BacklogAlert tasks={tasks} className="mb-2" />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-3 gap-5 flex-1 min-h-0">
          {ACTIVE_COLUMNS.map(col => {
            const colTasks = columns[col.key]
            return (
              <div
                key={col.key}
                className="flex flex-col min-h-0 rounded-xl p-2"
                style={{ background: 'rgba(240,244,247,0.5)' }}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-4">
                  <div className="flex items-center gap-2">
                    <h2 className="font-headline font-bold tracking-tight uppercase text-sm" style={{ color: 'var(--on-surface)' }}>
                      {col.label}
                    </h2>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={col.key === 'in_progress'
                        ? { background: 'rgba(0,83,219,0.1)', color: 'var(--primary)' }
                        : { background: 'var(--surface-container-highest)', color: 'var(--on-surface-variant)' }
                      }
                    >
                      {isLoading ? '…' : colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Sortable drop zone */}
                <SortableContext
                  id={col.key}
                  items={colTasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <DroppableColumn id={col.key}>
                    {colTasks.length === 0 && !isLoading ? (
                      <EmptyState
                        icon={<ClipboardList className="h-8 w-8" />}
                        title="Nothing queued. Add the first task."
                        description={`No ${col.label.toLowerCase()} tasks`}
                      />
                    ) : (
                      colTasks.map(task => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          onClick={() => { setSelectedTaskId(task.id); setSheetOpen(true) }}
                          isMyTask={!!myTeamMemberId && task.assignee?.id === myTeamMemberId}
                        />
                      ))
                    )}
                  </DroppableColumn>
                </SortableContext>
              </div>
            )
          })}
        </div>
      </DndContext>

      {/* Archive bar */}
      <div
        className="mt-4 px-5 py-3 rounded-xl flex items-center justify-between cursor-pointer group transition-all"
        style={{ background: 'var(--surface-container-highest)' }}
        onClick={() => setShowArchive(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined" style={{ color: 'var(--on-surface-variant)', fontSize: '20px' }}>unfold_more</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight uppercase font-headline" style={{ color: 'var(--on-surface)' }}>Archive</span>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-black"
              style={{ background: 'rgba(42,52,57,0.1)', color: 'var(--on-surface)' }}
            >
              {doneTasks.length} COMPLETED
            </span>
          </div>
        </div>
        <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>{showArchive ? '▲' : '▼'}</span>
      </div>
      {showArchive && <ArchiveList tasks={doneTasks} onRestore={handleRestore} />}
      </>}

      {/* Task Detail Panel */}
      <TaskDetailPanel
        taskId={selectedTaskId}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onTaskUpdated={() => mutate()}
      />

      {/* Create Task Panel */}
      <TaskCreatePanel
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { mutate(); mutateTeam() }}
      />

      {/* AI Task Parser */}
      <AiTaskParser
        open={aiParserOpen}
        onClose={() => setAiParserOpen(false)}
        onTasksCreated={() => { mutate(); mutateTeam() }}
        departments={departments}
      />
    </div>
  )
}
