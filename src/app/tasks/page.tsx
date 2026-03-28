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
import { TaskDetailPanel } from '@/components/ui/task-detail-panel'
import { TaskCreatePanel } from '@/components/ui/task-create-panel'
import { BacklogAlert } from '@/components/ui/backlog-alert'
import { AiTaskParser } from '@/components/ui/ai-task-parser'

// ---------------------------------------------------------------------------
// Kanban column definitions
// ---------------------------------------------------------------------------

const KANBAN_COLUMNS: Array<{ key: 'todo' | 'in_progress' | 'review' | 'done'; label: string; color: string; dotColor: string }> = [
  { key: 'todo',        label: 'To Do',       color: 'border-t-[#6B7280]', dotColor: '#6B7280' },
  { key: 'in_progress', label: 'In Progress', color: 'border-t-[#3B82F6]', dotColor: '#3B82F6' },
  { key: 'review',      label: 'Review',      color: 'border-t-[#F59E0B]', dotColor: '#F59E0B' },
  { key: 'done',        label: 'Done',        color: 'border-t-[#10B981]', dotColor: '#10B981' },
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
        'flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5 min-h-[80px] rounded-lg transition-colors',
        isOver && 'bg-primary/5 ring-1 ring-primary/20'
      )}
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
}

function TaskCard({ task, onClick }: TaskCardProps) {
  const overdue = isOverdue(task.dueDate ?? null)
  const today = isDueToday(task.dueDate ?? null)
  const dueDateColor = overdue
    ? 'text-[#EF4444]'
    : today
    ? 'text-[#C9A84C]'
    : 'text-muted-foreground'

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-ring/40 transition-colors group"
    >
      <p className="text-sm font-medium text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
        {task.title}
      </p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        <PriorityBadge priority={task.priority} />
        {task.department && <DepartmentBadge department={task.department} />}
        {task.stakeholders && task.stakeholders.length > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Users className="h-2.5 w-2.5" />
            {task.stakeholders.length}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5">
          {task.assignee ? (
            <>
              <MemberAvatar name={task.assignee.name} size="sm" />
              <span className="text-xs text-muted-foreground truncate max-w-[80px]">{task.assignee.name}</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Unassigned</span>
          )}
        </div>
        {task.dueDate && (
          <div className={cn('flex items-center gap-1 text-xs', dueDateColor)}>
            <Calendar className="h-3 w-3" />
            <span>{formatDate(task.dueDate)}</span>
          </div>
        )}
      </div>
      {task.assignedByName && (
        <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-border/40">
          <User className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-[11px] text-muted-foreground/60">by {task.assignedByName}</span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SortableTaskCard — wraps TaskCard with dnd-kit drag handles
// ---------------------------------------------------------------------------

interface SortableTaskCardProps {
  task: TaskShape
  onClick: () => void
}

function SortableTaskCard({ task, onClick }: SortableTaskCardProps) {
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
      <TaskCard task={task} onClick={onClick} />
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
    return <p className="text-sm text-muted-foreground py-3">No completed tasks.</p>
  }
  return (
    <div className="mt-3 space-y-1.5">
      {tasks.map(task => (
        <div
          key={task.id}
          className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2"
        >
          <p className="flex-1 text-sm text-muted-foreground line-through truncate">{task.title}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <PriorityBadge priority={task.priority} />
            {task.assignee && (
              <div className="flex items-center gap-1">
                <MemberAvatar name={task.assignee.name} size="sm" />
              </div>
            )}
            {task.dueDate && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(task.dueDate)}</span>
              </div>
            )}
            <button
              onClick={() => onRestore(task)}
              className="text-xs text-primary hover:underline transition-colors"
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
            <Button variant="outline" onClick={() => setAiParserOpen(true)} className="gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Parse
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Drop a Task
            </Button>
          </div>
        }
      />

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
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

      {/* Kanban board — drag-and-drop */}
      {/* Backlog alert — computed from live task data, no AI */}
      <BacklogAlert tasks={tasks} className="mb-2" />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
          {ACTIVE_COLUMNS.map(col => {
            const colTasks = columns[col.key]
            return (
              <div key={col.key} className="flex flex-col min-h-0">
                {/* Column header */}
                <div
                  className={cn(
                    'bg-card border border-border border-t-2 rounded-lg px-3 py-2 mb-3 flex items-center justify-between',
                    col.color
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: col.dotColor }}
                    />
                    <span className="text-sm font-medium text-foreground">{col.label}</span>
                  </div>
                  <span className="text-xs font-semibold bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                    {isLoading ? '…' : colTasks.length}
                  </span>
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
      <div className="mt-4 pt-4 border-t border-border">
        <button
          onClick={() => setShowArchive(v => !v)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Archive className="h-4 w-4" />
          Archive ({doneTasks.length} completed tasks) {showArchive ? '▲' : '▼'}
        </button>
        {showArchive && <ArchiveList tasks={doneTasks} onRestore={handleRestore} />}
      </div>

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
