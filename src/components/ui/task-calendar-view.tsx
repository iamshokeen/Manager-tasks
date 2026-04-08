'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  useDroppable,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import { cn, isOverdue } from '@/lib/utils'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { toast } from 'sonner'

interface TaskShape {
  id: string
  title: string
  priority: string
  status?: string
  department?: string
  dueDate?: string | null
  assignee?: { id: string; name: string } | null
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#9f403d', high: '#865400', medium: '#f8a010', low: '#a9b4b9',
}
const COLOR_PALETTE = ['#0053db','#865400','#2e7d32','#6a1b9a','#00695c','#c62828','#0277bd','#558b2f']

function hashColor(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i)) % COLOR_PALETTE.length
  return COLOR_PALETTE[h]
}

function getCardColor(task: TaskShape, mode: 'priority' | 'dept' | 'assignee'): string {
  if (mode === 'priority') return PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.low
  if (mode === 'dept') return hashColor(task.department ?? 'none')
  return hashColor(task.assignee?.name ?? 'unassigned')
}

function getWeekDates(offset: number): Date[] {
  const now = new Date()
  const day = now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  mon.setHours(0, 0, 0, 0)
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return d
  })
}

function toKey(d: Date): string { return d.toISOString().split('T')[0] }

function isToday(d: Date): boolean {
  const t = new Date()
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const OVERFLOW_AT = 4

function CalCard({ task, viewMode, onClick, syncing }: {
  task: TaskShape; viewMode: 'priority' | 'dept' | 'assignee'; onClick: () => void; syncing: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })
  const overdue = isOverdue(task.dueDate ?? null)
  const color = getCardColor(task, viewMode)

  if (syncing) return (
    <div className="p-3 rounded-md border-2 border-dashed border-primary/40 bg-primary/5 flex items-center justify-center h-[68px]">
      <span className="text-[10px] font-bold text-primary uppercase animate-pulse tracking-widest">Syncing…</span>
    </div>
  )

  return (
    <div
      ref={setNodeRef} {...attributes} {...listeners}
      style={{ opacity: isDragging ? 0.35 : 1, borderLeftColor: color }}
      className="bg-card border-l-4 p-3 rounded-md hover:bg-primary/5 transition-all cursor-grab active:cursor-grabbing select-none shadow-sm"
      onClick={() => { if (!isDragging) onClick() }}
    >
      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{task.title}</p>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1">
          {overdue && <AlertCircle size={11} className="text-red-500 flex-shrink-0" />}
          {task.department && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{ background: `${hashColor(task.department)}18`, color: hashColor(task.department) }}>
              {task.department}
            </span>
          )}
        </div>
        {task.assignee
          ? <MemberAvatar name={task.assignee.name} size="sm" />
          : <div className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center text-[8px] text-muted-foreground">?</div>
        }
      </div>
    </div>
  )
}

function CalColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={cn(
      'flex-1 p-2 space-y-2 transition-colors rounded-lg min-h-[80px]',
      isOver && 'bg-primary/5 ring-1 ring-primary/30 ring-inset'
    )}>
      {children}
    </div>
  )
}

interface TaskCalendarViewProps {
  tasks: TaskShape[]
  onTaskClick: (id: string) => void
  mutate: () => void
}

export function TaskCalendarView({ tasks, onTaskClick, mutate }: TaskCalendarViewProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [viewMode, setViewMode] = useState<'priority' | 'dept' | 'assignee'>('priority')
  const [expandedCols, setExpandedCols] = useState<Set<string>>(new Set())
  const [syncingId, setSyncingId] = useState<string | null>(null)

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])

  const grouped = useMemo(() => {
    const map: Record<string, TaskShape[]> = { unscheduled: [] }
    weekDates.forEach(d => { map[toKey(d)] = [] })
    tasks.forEach(t => {
      if (!t.dueDate) { map.unscheduled.push(t); return }
      const k = t.dueDate.split('T')[0]
      if (map[k]) map[k].push(t)
    })
    return map
  }, [tasks, weekDates])

  const scheduledThisWeek = weekDates.reduce((n, d) => n + (grouped[toKey(d)]?.length ?? 0), 0)
  const totalActive = tasks.filter(t => t.status !== 'done').length
  const utilization = totalActive === 0 ? 0 : Math.min(100, Math.round((scheduledThisWeek / totalActive) * 100))
  const unassignedCount = tasks.filter(t => !t.assignee).length
  const overdueCount = tasks.filter(t => isOverdue(t.dueDate ?? null)).length

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const taskId = String(active.id)
    const targetId = String(over.id)
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const currentKey = task.dueDate ? task.dueDate.split('T')[0] : 'unscheduled'
    if (currentKey === targetId) return
    setSyncingId(taskId)
    try {
      const newDueDate = targetId === 'unscheduled' ? null : new Date(targetId + 'T12:00:00').toISOString()
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: newDueDate }),
      })
      if (!res.ok) throw new Error()
      await mutate()
      toast.success(targetId === 'unscheduled' ? 'Moved to Unscheduled' : 'Due date updated')
    } catch {
      toast.error('Failed to reschedule task')
      await mutate()
    } finally {
      setSyncingId(null)
    }
  }

  const weekLabel = (() => {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    return `${weekDates[0].toLocaleDateString('en-GB', opts)} – ${weekDates[4].toLocaleDateString('en-GB', opts)}, ${weekDates[4].getFullYear()}`
  })()

  const unscheduled = grouped.unscheduled ?? []

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-5">

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setWeekOffset(0); setExpandedCols(new Set()) }}
              className="px-4 py-1.5 bg-[var(--surface-container-high)] text-foreground rounded-md text-sm font-semibold hover:bg-[var(--surface-container-highest)] transition-colors cursor-pointer"
            >Today</button>
            <div className="flex items-center bg-[var(--surface-container)] rounded-md p-0.5">
              <button onClick={() => { setWeekOffset(v => v - 1); setExpandedCols(new Set()) }} className="p-1.5 hover:bg-card rounded transition-colors cursor-pointer"><ChevronLeft size={15} /></button>
              <button onClick={() => { setWeekOffset(v => v + 1); setExpandedCols(new Set()) }} className="p-1.5 hover:bg-card rounded transition-colors cursor-pointer"><ChevronRight size={15} /></button>
            </div>
            <span className="text-base font-bold text-foreground">{weekLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">View by:</span>
            <div className="flex bg-[var(--surface-container)] rounded-lg p-1 gap-1">
              {(['priority', 'dept', 'assignee'] as const).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className={cn('px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer',
                    viewMode === mode ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:bg-[var(--surface-container-highest)]')}>
                  {mode === 'priority' ? 'Priority' : mode === 'dept' ? 'Dept' : 'Assignee'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-6 gap-px bg-[var(--outline-variant)]/20 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-[var(--surface-container-low)] flex flex-col min-h-[520px]">
            <div className="p-3 flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Unscheduled</span>
              <span className="text-[10px] font-bold bg-[var(--surface-container-highest)] px-1.5 py-0.5 rounded text-muted-foreground">{unscheduled.length}</span>
            </div>
            <CalColumn id="unscheduled">
              {unscheduled.length === 0
                ? <p className="text-[10px] text-muted-foreground/40 text-center py-6">All scheduled</p>
                : unscheduled.map(t => <CalCard key={t.id} task={t} viewMode={viewMode} onClick={() => onTaskClick(t.id)} syncing={syncingId === t.id} />)
              }
            </CalColumn>
          </div>

          {weekDates.map((date, i) => {
            const key = toKey(date)
            const today = isToday(date)
            const colTasks = grouped[key] ?? []
            const expanded = expandedCols.has(key)
            const overflow = colTasks.length > OVERFLOW_AT && !expanded
            const visible = overflow ? colTasks.slice(0, OVERFLOW_AT - 1) : colTasks
            const hidden = colTasks.length - (OVERFLOW_AT - 1)
            return (
              <div key={key} className="bg-[var(--surface)] flex flex-col border-l border-[var(--outline-variant)]/20">
                <div className={cn('p-3', today ? 'bg-primary/10' : 'bg-[var(--surface-container-low)]/60')}>
                  <p className={cn('text-[10px] font-bold uppercase tracking-widest mb-0.5', today ? 'text-primary' : 'text-muted-foreground')}>{DAY_NAMES[i]}</p>
                  <p className={cn('text-xl font-black leading-none', today ? 'text-primary' : 'text-foreground')}>
                    {date.getDate()} <span className="text-sm font-semibold">{date.toLocaleDateString('en-GB', { month: 'short' })}</span>
                  </p>
                  {today && <div className="mt-1.5 h-0.5 w-full bg-primary rounded-full" />}
                </div>
                <CalColumn id={key}>
                  {colTasks.length === 0
                    ? <div className="border-2 border-dashed border-[var(--outline-variant)]/30 rounded-md h-16 flex items-center justify-center text-[10px] text-muted-foreground/40 hover:border-primary/40 hover:text-primary/40 transition-colors">Drop here</div>
                    : <>
                        {visible.map(t => <CalCard key={t.id} task={t} viewMode={viewMode} onClick={() => onTaskClick(t.id)} syncing={syncingId === t.id} />)}
                        {overflow && (
                          <button
                            onClick={() => setExpandedCols(s => { const n = new Set(s); n.add(key); return n })}
                            className="w-full py-1.5 bg-[var(--surface-container-high)] text-primary text-[11px] font-bold uppercase tracking-widest rounded-md hover:bg-[var(--surface-container-highest)] transition-colors cursor-pointer"
                          >{hidden} more tasks…</button>
                        )}
                      </>
                  }
                </CalColumn>
              </div>
            )
          })}
        </div>

        {/* Footer stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-2 bg-card p-5 rounded-xl border-l-4 border-primary shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-foreground text-sm">Weekly Utilization</h4>
              <span className="text-primary font-black text-2xl">{utilization}%</span>
            </div>
            <div className="w-full bg-[var(--surface-container-highest)] h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all duration-700" style={{ width: `${utilization}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              {scheduledThisWeek} of {totalActive} active tasks scheduled this week.
              {utilization > 85 && <span className="font-semibold text-foreground"> Near-peak — consider moving low-priority tasks forward.</span>}
            </p>
          </div>
          <div className="bg-card p-5 rounded-xl shadow-sm">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Unassigned</h4>
            <p className="text-4xl font-black text-foreground">{String(unassignedCount).padStart(2, '0')}</p>
          </div>
          <div className="bg-card p-5 rounded-xl shadow-sm">
            <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Overdue</h4>
            <p className="text-4xl font-black text-red-400">{String(overdueCount).padStart(2, '0')}</p>
          </div>
        </div>
      </div>
    </DndContext>
  )
}
