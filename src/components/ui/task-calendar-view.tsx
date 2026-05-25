'use client'

//
// Task calendar with multi-day spanning bars + Week / Month / Year scale toggle.
//
// Task time block = [startDate, endDate]. Legacy tasks (only dueDate) collapse
// to a single-day block on dueDate. Tasks without any date land in "Unscheduled".
//

import { useState, useMemo } from 'react'
import {
  DndContext, useDroppable, useDraggable,
  PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { ChevronLeft, ChevronRight, AlertCircle, CalendarDays } from 'lucide-react'
import { cn, isOverdue } from '@/lib/utils'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { toast } from 'sonner'

interface TaskShape {
  id: string
  title: string
  priority: string
  status?: string
  department?: string
  startDate?: string | null
  endDate?: string | null
  dueDate?: string | null
  assignee?: { id: string; name: string } | null
  isSelfTask?: boolean
}

type Scale = 'week' | 'month' | 'year'
type ColorBy = 'priority' | 'stage' | 'dept' | 'assignee'

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#9f403d', critical: '#9f403d',
  high: '#865400', medium: '#f8a010', low: '#a9b4b9',
}
const STAGE_COLORS: Record<string, string> = {
  todo: '#a9b4b9',
  in_progress: '#0053db',
  review: '#7c3aed',
  blocked: '#c62828',
  done: '#2e7d32',
}
const COLOR_PALETTE = ['#0053db', '#865400', '#2e7d32', '#6a1b9a', '#00695c', '#c62828', '#0277bd', '#558b2f']
const DAY_MS = 86_400_000

function hashColor(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i)) % COLOR_PALETTE.length
  return COLOR_PALETTE[h]
}

function getCardColor(task: TaskShape, mode: ColorBy): string {
  if (mode === 'priority') return PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.low
  if (mode === 'stage') return STAGE_COLORS[task.status ?? 'todo'] ?? STAGE_COLORS.todo
  if (mode === 'dept') return hashColor(task.department ?? 'none')
  return hashColor(task.assignee?.name ?? 'unassigned')
}

function startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function addMonths(d: Date, n: number): Date { const x = new Date(d); x.setMonth(x.getMonth() + n); return x }
function addYears(d: Date, n: number): Date { const x = new Date(d); x.setFullYear(x.getFullYear() + n); return x }
function toKey(d: Date): string { return d.toISOString().split('T')[0] }
function isToday(d: Date): boolean { const t = new Date(); return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate() }
function isSameMonth(a: Date, b: Date): boolean { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() }
function daysBetween(a: Date, b: Date): number { return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS) }

// Pull the canonical [start, end] dates for a task. Legacy tasks with only
// dueDate collapse to a single-day block on dueDate.
function getRange(t: TaskShape): { start: Date; end: Date } | null {
  const s = t.startDate ?? t.endDate ?? t.dueDate ?? null
  const e = t.endDate ?? t.dueDate ?? t.startDate ?? null
  if (!s || !e) return null
  const ds = startOfDay(new Date(s))
  const de = startOfDay(new Date(e))
  return de.getTime() < ds.getTime() ? { start: de, end: ds } : { start: ds, end: de }
}

// ─── WEEK / MONTH navigation helpers ─────────────────────────────────────────

function startOfWeek(anchor: Date): Date {
  // Sunday-first to mirror the Stitch design.
  const d = startOfDay(anchor)
  return addDays(d, -d.getDay())
}

function getWeekDates(anchor: Date): Date[] {
  const sun = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, i) => addDays(sun, i))
}

function getMonthGridStart(anchor: Date): Date {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  return startOfWeek(first)
}

function getMonthGridDates(anchor: Date): Date[] {
  const start = getMonthGridStart(anchor)
  // 6 weeks × 7 days = 42 cells — always enough for any month layout.
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

const DAY_NAMES_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTH_NAMES_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// ─── Layout: lane-pack tasks into rows to avoid overlap ──────────────────────

interface LaidTask {
  task: TaskShape
  startIdx: number // column index in grid (0-based)
  endIdx: number   // inclusive column index
  lane: number
}

function layoutTasksAcrossGrid(tasks: TaskShape[], gridDates: Date[]): LaidTask[] {
  if (gridDates.length === 0) return []
  const gridStart = gridDates[0]
  const gridEnd = gridDates[gridDates.length - 1]

  // Filter to tasks intersecting the grid range, then sort by start asc.
  const ranged = tasks
    .map((t) => ({ task: t, range: getRange(t) }))
    .filter((r): r is { task: TaskShape; range: { start: Date; end: Date } } => r.range !== null)
    .filter((r) => r.range.end.getTime() >= gridStart.getTime() && r.range.start.getTime() <= gridEnd.getTime())
    .sort((a, b) => a.range.start.getTime() - b.range.start.getTime() || a.range.end.getTime() - b.range.end.getTime())

  const lanes: number[] = [] // per-lane "next free index"
  const laid: LaidTask[] = []
  for (const { task, range } of ranged) {
    const startIdx = Math.max(0, daysBetween(gridStart, range.start))
    const endIdx = Math.min(gridDates.length - 1, daysBetween(gridStart, range.end))
    let lane = lanes.findIndex((next) => next <= startIdx)
    if (lane === -1) { lane = lanes.length; lanes.push(0) }
    lanes[lane] = endIdx + 1
    laid.push({ task, startIdx, endIdx, lane })
  }
  return laid
}

// ─── Bar component ───────────────────────────────────────────────────────────

interface TaskBarProps {
  task: TaskShape
  colorBy: ColorBy
  onClick: () => void
  isMyTask?: boolean
  syncing?: boolean
  /** number of grid days the bar spans (1 = single day) */
  span: number
  /** drag-and-drop id (unique per occurrence; we don't drag in span mode) */
  draggable?: boolean
  /** true when this bar visually starts at the left edge of its grid row */
  startsAtRowStart: boolean
  /** true when this bar visually ends at the right edge of its grid row */
  endsAtRowEnd: boolean
  /** when true, render a slim pill (month view); otherwise a denser card */
  variant: 'pill' | 'card'
}

function TaskBar({
  task, colorBy, onClick, isMyTask, syncing, span, draggable = false,
  startsAtRowStart, endsAtRowEnd, variant,
}: TaskBarProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, disabled: !draggable })
  const color = getCardColor(task, colorBy)
  const overdue = isOverdue(task.endDate ?? task.dueDate ?? null) && task.status !== 'done'

  if (syncing) {
    return (
      <div className="h-full flex items-center justify-center px-2 rounded-[3px] border border-dashed"
        style={{ borderColor: 'rgba(71,234,237,0.45)', background: 'rgba(71,234,237,0.06)' }}>
        <span className="text-[9px] font-bold uppercase tracking-widest animate-pulse" style={{ color: 'var(--primary)' }}>Syncing…</span>
      </div>
    )
  }

  const roundLeft = startsAtRowStart ? '3px' : '0px'
  const roundRight = endsAtRowEnd ? '3px' : '0px'

  if (variant === 'pill') {
    return (
      <div
        ref={setNodeRef} {...(draggable ? attributes : {})} {...(draggable ? listeners : {})}
        onClick={(e) => { e.stopPropagation(); if (!isDragging) onClick() }}
        title={`${task.title} · ${span}d`}
        className="h-[18px] flex items-center gap-1.5 cursor-pointer hover:brightness-125 transition-all select-none truncate px-1.5"
        style={{
          opacity: isDragging ? 0.35 : 1,
          background: `${color}30`,
          borderLeft: startsAtRowStart ? `3px solid ${color}` : 'none',
          borderTopLeftRadius: roundLeft, borderBottomLeftRadius: roundLeft,
          borderTopRightRadius: roundRight, borderBottomRightRadius: roundRight,
          boxShadow: isMyTask ? `inset 0 0 0 1px ${color}90` : undefined,
        }}
      >
        {startsAtRowStart && overdue && <AlertCircle size={9} className="flex-shrink-0" style={{ color: '#ef4444' }} />}
        <span className="text-[10px] font-semibold truncate" style={{ color: 'var(--on-surface)' }}>
          {startsAtRowStart ? task.title : ' '}
        </span>
      </div>
    )
  }

  // card variant (week all-day band)
  return (
    <div
      ref={setNodeRef} {...(draggable ? attributes : {})} {...(draggable ? listeners : {})}
      onClick={(e) => { e.stopPropagation(); if (!isDragging) onClick() }}
      title={`${task.title} · ${span}d`}
      className="h-full flex items-center gap-2 cursor-pointer hover:brightness-125 transition-all select-none px-2"
      style={{
        opacity: isDragging ? 0.35 : 1,
        background: `${color}25`,
        borderLeft: startsAtRowStart ? `3px solid ${color}` : 'none',
        borderTopLeftRadius: roundLeft, borderBottomLeftRadius: roundLeft,
        borderTopRightRadius: roundRight, borderBottomRightRadius: roundRight,
        boxShadow: isMyTask ? `inset 0 0 0 1px ${color}90` : undefined,
      }}
    >
      {startsAtRowStart && overdue && <AlertCircle size={11} className="flex-shrink-0" style={{ color: '#ef4444' }} />}
      <span className="text-[11px] font-semibold truncate flex-1" style={{ color: 'var(--on-surface)' }}>
        {startsAtRowStart ? task.title : ' '}
      </span>
      {startsAtRowStart && task.assignee && <MemberAvatar name={task.assignee.name} size="sm" />}
      {startsAtRowStart && span > 1 && (
        <span className="text-[9px] font-mono uppercase tracking-widest flex-shrink-0" style={{ color: 'var(--on-surface-variant)' }}>
          {span}d
        </span>
      )}
    </div>
  )
}

// ─── Droppable day cell wrapper (week & month) ───────────────────────────────

function DroppableCell({ id, children, className, style }: { id: string; children?: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={cn(className, isOver && 'ring-1 ring-inset')}
      style={{ ...style, ...(isOver ? { boxShadow: 'inset 0 0 0 1px var(--primary)' } : null) }}
    >
      {children}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

interface TaskCalendarViewProps {
  tasks: TaskShape[]
  onTaskClick: (id: string) => void
  mutate: () => void
  myTeamMemberId?: string | null
}

export function TaskCalendarView({ tasks, onTaskClick, mutate, myTeamMemberId }: TaskCalendarViewProps) {
  const [scale, setScale] = useState<Scale>('week')
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()))
  const [colorBy, setColorBy] = useState<ColorBy>('priority')
  const [syncingId, setSyncingId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function shift(direction: -1 | 1) {
    setAnchor((a) => {
      if (scale === 'week') return addDays(a, 7 * direction)
      if (scale === 'month') return addMonths(a, direction)
      return addYears(a, direction)
    })
  }
  function goToday() { setAnchor(startOfDay(new Date())) }

  const unscheduled = useMemo(() => tasks.filter(t => !t.startDate && !t.endDate && !t.dueDate), [tasks])
  const totalActive = tasks.filter(t => t.status !== 'done').length

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const taskId = String(active.id)
    const targetId = String(over.id) // 'YYYY-MM-DD' or 'unscheduled'
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const currentRange = getRange(task)
    const currentStartKey = currentRange ? toKey(currentRange.start) : 'unscheduled'
    if (currentStartKey === targetId) return
    setSyncingId(taskId)
    try {
      let body: Record<string, unknown>
      if (targetId === 'unscheduled') {
        body = { startDate: null, endDate: null, dueDate: null }
      } else {
        const newStart = new Date(targetId + 'T12:00:00')
        if (currentRange) {
          const span = daysBetween(currentRange.start, currentRange.end)
          const newEnd = addDays(newStart, span)
          body = {
            startDate: newStart.toISOString(),
            endDate: newEnd.toISOString(),
            dueDate: newEnd.toISOString(),
          }
        } else {
          body = {
            startDate: newStart.toISOString(),
            endDate: newStart.toISOString(),
            dueDate: newStart.toISOString(),
          }
        }
      }
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      await mutate()
      toast.success(targetId === 'unscheduled' ? 'Moved to Unscheduled' : 'Rescheduled')
    } catch {
      toast.error('Failed to reschedule task')
      await mutate()
    } finally {
      setSyncingId(null)
    }
  }

  // ─── Range label per scale ────────────────────────────────────────────────
  const rangeLabel = (() => {
    if (scale === 'week') {
      const week = getWeekDates(anchor)
      const s = week[0], e = week[6]
      const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
      return `${s.toLocaleDateString('en-GB', opts)} – ${e.toLocaleDateString('en-GB', opts)}, ${e.getFullYear()}`
    }
    if (scale === 'month') return `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`
    return String(anchor.getFullYear())
  })()

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-4">

        {/* ── Top bar ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={goToday}
              className="px-4 py-1.5 rounded-md text-sm font-semibold transition-colors cursor-pointer"
              style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)' }}
            >Today</button>
            <div className="flex items-center rounded-md p-0.5" style={{ background: 'var(--surface-container)' }}>
              <button onClick={() => shift(-1)} className="p-1.5 rounded cursor-pointer hover:bg-[var(--surface-container-high)] transition-colors" aria-label="Previous"><ChevronLeft size={15} /></button>
              <button onClick={() => shift(1)} className="p-1.5 rounded cursor-pointer hover:bg-[var(--surface-container-high)] transition-colors" aria-label="Next"><ChevronRight size={15} /></button>
            </div>
            <span className="text-base font-bold tabular-nums" style={{ color: 'var(--on-surface)' }}>{rangeLabel}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Scale toggle */}
            <div className="flex rounded-md p-0.5 gap-0.5" style={{ background: 'var(--surface-container)' }}>
              {(['week', 'month', 'year'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={cn(
                    'px-3 py-1 rounded text-[11px] font-bold uppercase tracking-widest transition-colors cursor-pointer',
                    scale === s ? 'text-[var(--on-primary)]' : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'
                  )}
                  style={scale === s ? { background: 'var(--primary)' } : undefined}
                >{s}</button>
              ))}
            </div>

            {/* Color-by toggle (hidden in year heatmap) */}
            {scale !== 'year' && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>Color:</span>
                <div className="flex rounded-md p-0.5 gap-0.5" style={{ background: 'var(--surface-container)' }}>
                  {(['priority', 'stage', 'dept', 'assignee'] as const).map(mode => (
                    <button key={mode} onClick={() => setColorBy(mode)}
                      className={cn('px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer',
                        colorBy === mode ? 'text-[var(--primary)]' : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]')}
                      style={colorBy === mode ? { background: 'var(--surface-container-highest)' } : undefined}
                    >{mode === 'priority' ? 'Priority' : mode === 'stage' ? 'Stage' : mode === 'dept' ? 'Dept' : 'Assignee'}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Calendar surface ──────────────────────────────────────────────── */}
        {scale === 'week' && (
          <WeekView
            anchor={anchor} tasks={tasks} colorBy={colorBy}
            onTaskClick={onTaskClick} syncingId={syncingId} myTeamMemberId={myTeamMemberId}
          />
        )}
        {scale === 'month' && (
          <MonthView
            anchor={anchor} tasks={tasks} colorBy={colorBy}
            onTaskClick={onTaskClick} syncingId={syncingId} myTeamMemberId={myTeamMemberId}
          />
        )}
        {scale === 'year' && (
          <YearView
            anchor={anchor} tasks={tasks}
            jumpToMonth={(d) => { setAnchor(d); setScale('month') }}
          />
        )}

        {/* ── Footer: unscheduled drop zone ─────────────────────────────────── */}
        {scale !== 'year' && (
          <UnscheduledRail
            items={unscheduled}
            colorBy={colorBy}
            onTaskClick={onTaskClick}
            syncingId={syncingId}
            myTeamMemberId={myTeamMemberId ?? null}
            totalActive={totalActive}
          />
        )}
      </div>
    </DndContext>
  )
}

// ─── WEEK view ───────────────────────────────────────────────────────────────

function WeekView({
  anchor, tasks, colorBy, onTaskClick, syncingId, myTeamMemberId,
}: {
  anchor: Date; tasks: TaskShape[]; colorBy: ColorBy
  onTaskClick: (id: string) => void; syncingId: string | null; myTeamMemberId?: string | null
}) {
  const week = useMemo(() => getWeekDates(anchor), [anchor])
  const laid = useMemo(() => layoutTasksAcrossGrid(tasks, week), [tasks, week])
  const laneCount = laid.reduce((m, l) => Math.max(m, l.lane + 1), 0)
  const rowHeight = 22 // px per lane
  const bandHeight = Math.max(laneCount * (rowHeight + 4) + 12, 64)

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface-container-low)' }}>
      {/* Day header row */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
        {week.map((d) => {
          const today = isToday(d)
          return (
            <div key={toKey(d)} className="px-3 py-2.5 flex flex-col items-center"
              style={{ background: today ? 'var(--surface-container)' : 'transparent' }}>
              <span className="text-[10px] font-bold uppercase tracking-widest tabular-nums"
                style={{ color: today ? 'var(--primary)' : 'var(--on-surface-variant)' }}>{DAY_NAMES_SHORT[d.getDay()]}</span>
              <span className="text-lg font-bold tabular-nums leading-none mt-0.5"
                style={{ color: today ? 'var(--primary)' : 'var(--on-surface)' }}>{d.getDate()}</span>
              {today && <div className="mt-1 h-0.5 w-6 rounded-full" style={{ background: 'var(--primary)' }} />}
            </div>
          )
        })}
      </div>

      {/* All-day band: laid-out spanning bars over the same 7-col grid */}
      <div className="relative" style={{ background: 'var(--surface)', minHeight: bandHeight }}>
        {/* Background drop targets */}
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {week.map((d) => (
            <DroppableCell
              key={`drop-${toKey(d)}`}
              id={toKey(d)}
              className="border-l first:border-l-0 transition-colors"
              style={{ borderColor: 'var(--surface-container)', minHeight: bandHeight }}
            />
          ))}
        </div>

        {/* Lane-packed bars */}
        <div className="relative pt-2 pb-3 px-1">
          {laid.length === 0 && (
            <p className="text-center text-xs italic py-8" style={{ color: 'var(--on-surface-variant)' }}>
              Nothing scheduled this week. Drag from the Unscheduled rail or click + to add.
            </p>
          )}
          {laid.map(({ task, startIdx, endIdx, lane }) => {
            const span = endIdx - startIdx + 1
            const leftPct = (startIdx / 7) * 100
            const widthPct = (span / 7) * 100
            const top = lane * (rowHeight + 4) + 4
            const isMine = (!!myTeamMemberId && task.assignee?.id === myTeamMemberId) || !!task.isSelfTask
            return (
              <div
                key={task.id}
                style={{
                  position: 'absolute',
                  top,
                  left: `calc(${leftPct}% + 4px)`,
                  width: `calc(${widthPct}% - 8px)`,
                  height: rowHeight,
                }}
              >
                <TaskBar
                  task={task} colorBy={colorBy} onClick={() => onTaskClick(task.id)}
                  isMyTask={isMine} syncing={syncingId === task.id}
                  span={span} draggable startsAtRowStart endsAtRowEnd variant="card"
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── MONTH day-cell chip ─────────────────────────────────────────────────────

function MonthDayChip({
  task, colorBy, isMyTask, syncing, continuesLeft, continuesRight, onClick,
}: {
  task: TaskShape; colorBy: ColorBy; isMyTask: boolean; syncing: boolean
  continuesLeft: boolean; continuesRight: boolean; onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })
  const color = getCardColor(task, colorBy)
  const overdue = isOverdue(task.endDate ?? task.dueDate ?? null) && task.status !== 'done'

  if (syncing) {
    return (
      <div className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-1 rounded animate-pulse"
        style={{ color: 'var(--primary)', background: 'rgba(71,234,237,0.06)' }}>Syncing…</div>
    )
  }

  return (
    <div
      ref={setNodeRef} {...attributes} {...listeners}
      onClick={(e) => { e.stopPropagation(); if (!isDragging) onClick() }}
      title={task.title}
      className="cursor-grab active:cursor-grabbing select-none transition-all hover:brightness-125"
      style={{
        opacity: isDragging ? 0.35 : 1,
        background: `${color}25`,
        // Edge stripes that double as continuation indicators
        borderLeft: continuesLeft ? `2px dashed ${color}` : `3px solid ${color}`,
        borderRight: continuesRight ? `2px dashed ${color}` : 'none',
        borderRadius: 3,
        padding: '3px 6px',
        boxShadow: isMyTask ? `inset 0 0 0 1px ${color}90` : undefined,
        fontSize: 11, lineHeight: 1.3,
        color: 'var(--on-surface)',
        wordBreak: 'break-word',
        display: 'flex', alignItems: 'flex-start', gap: 4,
      }}
    >
      {continuesLeft && <span style={{ color, fontSize: 10, lineHeight: '14px', flexShrink: 0 }}>←</span>}
      {overdue && !continuesLeft && <AlertCircle size={10} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />}
      <span className="font-semibold flex-1 min-w-0">{task.title}</span>
      {continuesRight && <span style={{ color, fontSize: 10, lineHeight: '14px', flexShrink: 0 }}>→</span>}
    </div>
  )
}

// ─── MONTH view ──────────────────────────────────────────────────────────────
//
// Per-day stacking: every cell lists the full title of every task whose
// [start..end] range covers that day. Multi-day tasks repeat in each spanned
// cell with ← / → arrows showing continuation. No "+N" overflow chips —
// nothing is hidden. Cells auto-grow vertically to fit their content.

function MonthView({
  anchor, tasks, colorBy, onTaskClick, syncingId, myTeamMemberId,
}: {
  anchor: Date; tasks: TaskShape[]; colorBy: ColorBy
  onTaskClick: (id: string) => void; syncingId: string | null
  myTeamMemberId?: string | null
}) {
  const grid = useMemo(() => getMonthGridDates(anchor), [anchor])

  // Pre-resolve ranges once, dropping unscheduled and items outside the grid.
  const ranged = useMemo(() => tasks
    .map(t => ({ task: t, range: getRange(t) }))
    .filter((r): r is { task: TaskShape; range: { start: Date; end: Date } } => r.range !== null)
    .sort((a, b) =>
      a.range.start.getTime() - b.range.start.getTime() ||
      (b.range.end.getTime() - b.range.start.getTime()) - (a.range.end.getTime() - a.range.start.getTime())
    ),
    [tasks])

  // Trim trailing empty week rows for compactness.
  const allDates = useMemo(() => {
    const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
    const cells = [...grid]
    while (cells.length >= 35 && cells[cells.length - 7].getTime() > monthEnd.getTime()) {
      cells.splice(cells.length - 7, 7)
    }
    return cells
  }, [grid, anchor])

  // Bucket tasks per day key.
  const perDay = useMemo(() => {
    const map = new Map<string, Array<{ task: TaskShape; continuesLeft: boolean; continuesRight: boolean }>>()
    for (const d of allDates) map.set(toKey(d), [])
    for (const { task, range } of ranged) {
      const sMs = range.start.getTime(), eMs = range.end.getTime()
      for (const d of allDates) {
        const dMs = d.getTime()
        if (dMs < sMs || dMs > eMs) continue
        const k = toKey(d)
        map.get(k)!.push({
          task,
          continuesLeft: dMs > sMs,   // task started before this cell
          continuesRight: dMs < eMs,  // task continues past this cell
        })
      }
    }
    return map
  }, [ranged, allDates])

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface-container-low)' }}>
      {/* Day-name header */}
      <div className="grid sticky top-0 z-10" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', background: 'var(--surface-container-low)' }}>
        {DAY_NAMES_SHORT.map((name) => (
          <div key={name} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-center"
            style={{ color: 'var(--on-surface-variant)' }}>{name}</div>
        ))}
      </div>

      {/* Month grid — auto-row-height so cells grow with content */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridAutoRows: 'minmax(120px, auto)' }}>
        {allDates.map((d) => {
          const k = toKey(d)
          const inMonth = isSameMonth(d, anchor)
          const today = isToday(d)
          const items = perDay.get(k) ?? []
          return (
            <DroppableCell
              key={k}
              id={k}
              className="border-l border-t transition-colors"
              style={{
                borderColor: 'var(--surface-container)',
                background: today ? 'var(--surface-container)' : 'var(--surface)',
                opacity: inMonth ? 1 : 0.55,
              }}
            >
              <div className="p-1.5 flex flex-col gap-1 min-h-[120px]">
                {/* Header: date + count badge */}
                <div className="flex items-center justify-between">
                  <span
                    className="text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded"
                    style={{
                      color: today ? 'var(--on-primary)' : (inMonth ? 'var(--on-surface)' : 'var(--on-surface-variant)'),
                      background: today ? 'var(--primary)' : 'transparent',
                    }}
                  >{d.getDate()}</span>
                  {items.length > 0 && (
                    <span className="text-[9px] font-mono tabular-nums px-1 py-0.5 rounded"
                      style={{ color: 'var(--on-surface-variant)', background: 'var(--surface-container-high)' }}>
                      {items.length}
                    </span>
                  )}
                </div>

                {/* Task chips — full title, wraps if long */}
                {items.map(({ task, continuesLeft, continuesRight }) => {
                  const isMine = (!!myTeamMemberId && task.assignee?.id === myTeamMemberId) || !!task.isSelfTask
                  return (
                    <MonthDayChip
                      key={`${k}-${task.id}`}
                      task={task}
                      colorBy={colorBy}
                      isMyTask={isMine}
                      syncing={syncingId === task.id}
                      continuesLeft={continuesLeft}
                      continuesRight={continuesRight}
                      onClick={() => onTaskClick(task.id)}
                    />
                  )
                })}
              </div>
            </DroppableCell>
          )
        })}
      </div>
    </div>
  )
}

// ─── YEAR view ───────────────────────────────────────────────────────────────

function YearView({
  anchor, tasks, jumpToMonth,
}: { anchor: Date; tasks: TaskShape[]; jumpToMonth: (d: Date) => void }) {
  const year = anchor.getFullYear()
  const months = useMemo(() => Array.from({ length: 12 }, (_, m) => new Date(year, m, 1)), [year])

  // Aggregate per-day task load and per-month stats.
  const yearStart = useMemo(() => new Date(year, 0, 1), [year])
  const yearEnd = useMemo(() => new Date(year, 11, 31), [year])

  const dayLoads = useMemo(() => {
    const map = new Map<string, { count: number; done: number; overdue: number }>()
    for (const t of tasks) {
      const r = getRange(t)
      if (!r) continue
      const s = r.start.getTime() < yearStart.getTime() ? yearStart : r.start
      const e = r.end.getTime() > yearEnd.getTime() ? yearEnd : r.end
      if (s.getTime() > e.getTime()) continue
      const days = daysBetween(s, e) + 1
      for (let i = 0; i < days; i++) {
        const d = addDays(s, i)
        const k = toKey(d)
        const slot = map.get(k) ?? { count: 0, done: 0, overdue: 0 }
        slot.count += 1
        if (t.status === 'done') slot.done += 1
        if (t.status !== 'done' && isOverdue(t.endDate ?? t.dueDate ?? null)) slot.overdue += 1
        map.set(k, slot)
      }
    }
    return map
  }, [tasks, yearStart, yearEnd])

  const maxLoad = useMemo(() => {
    let m = 0
    dayLoads.forEach(v => { if (v.count > m) m = v.count })
    return Math.max(1, m)
  }, [dayLoads])

  function intensityColor(count: number): string {
    if (count === 0) return 'var(--surface-container-high)'
    const t = Math.min(1, count / maxLoad)
    // primary cyan-ish ramp; rely on the design token for hue.
    const alpha = 0.18 + 0.72 * t
    return `rgba(71, 234, 237, ${alpha.toFixed(3)})`
  }

  // Year-wide totals for the small status strip
  const totals = useMemo(() => {
    const distinctTotal = tasks.filter(t => {
      const r = getRange(t); if (!r) return false
      return r.end.getTime() >= yearStart.getTime() && r.start.getTime() <= yearEnd.getTime()
    }).length
    const distinctDone = tasks.filter(t => {
      const r = getRange(t); if (!r) return false
      return t.status === 'done' && r.end.getTime() >= yearStart.getTime() && r.start.getTime() <= yearEnd.getTime()
    }).length
    const distinctOverdue = tasks.filter(t => {
      const r = getRange(t); if (!r) return false
      return t.status !== 'done' && isOverdue(t.endDate ?? t.dueDate ?? null) && r.end.getTime() >= yearStart.getTime() && r.start.getTime() <= yearEnd.getTime()
    }).length
    return { total: distinctTotal, done: distinctDone, overdue: distinctOverdue }
  }, [tasks, yearStart, yearEnd])

  return (
    <div className="flex flex-col gap-4">
      {/* Year-strip stats */}
      <div className="flex items-center gap-5 text-[11px] font-mono uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>
        <span><span style={{ color: 'var(--on-surface)' }}>{totals.total}</span> tasks</span>
        <span style={{ color: '#9f403d' }}>● <span style={{ color: 'var(--on-surface)' }}>{totals.overdue}</span> overdue</span>
        <span style={{ color: '#2e7d32' }}>● <span style={{ color: 'var(--on-surface)' }}>{totals.done}</span> done</span>
      </div>

      {/* 3×4 month grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {months.map((m) => {
          const monthStart = m
          const monthEnd = new Date(year, m.getMonth() + 1, 0)
          const monthDays = monthEnd.getDate()
          let monthCount = 0, monthDone = 0, monthOverdue = 0
          for (let d = 1; d <= monthDays; d++) {
            const slot = dayLoads.get(toKey(new Date(year, m.getMonth(), d)))
            if (slot) { monthCount += slot.count; monthDone += slot.done; monthOverdue += slot.overdue }
          }
          // Heatmap layout: 7 columns × ceil(daysInMonth/7) rows of dots, starting at the correct DOW
          const firstDow = monthStart.getDay()
          const totalCells = firstDow + monthDays
          const rowCount = Math.ceil(totalCells / 7)

          return (
            <button
              key={m.toISOString()}
              onClick={() => jumpToMonth(new Date(year, m.getMonth(), 1))}
              className="rounded-lg p-3 text-left transition-all cursor-pointer hover:brightness-110"
              style={{ background: 'var(--surface-container)' }}
            >
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface)' }}>
                  {MONTH_NAMES_SHORT[m.getMonth()]}
                </span>
                <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--on-surface-variant)' }}>{year}</span>
              </div>

              {/* Heatmap dots */}
              <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {Array.from({ length: rowCount * 7 }).map((_, idx) => {
                  const dayNum = idx - firstDow + 1
                  if (dayNum < 1 || dayNum > monthDays) {
                    return <div key={idx} style={{ aspectRatio: '1 / 1' }} />
                  }
                  const d = new Date(year, m.getMonth(), dayNum)
                  const slot = dayLoads.get(toKey(d))
                  const today = isToday(d)
                  return (
                    <div
                      key={idx}
                      title={`${dayNum} ${MONTH_NAMES_SHORT[m.getMonth()]} · ${slot?.count ?? 0} task(s)`}
                      style={{
                        aspectRatio: '1 / 1',
                        background: intensityColor(slot?.count ?? 0),
                        borderRadius: 2,
                        outline: today ? '1.5px solid var(--primary)' : undefined,
                        outlineOffset: today ? 1 : undefined,
                      }}
                    />
                  )
                })}
              </div>

              {/* Stats row */}
              <div className="mt-2 flex items-center gap-3 text-[10px] font-mono tabular-nums" style={{ color: 'var(--on-surface-variant)' }}>
                <span><span style={{ color: 'var(--on-surface)' }}>{monthCount}</span> task-days</span>
                {monthOverdue > 0 && <span style={{ color: '#ef4444' }}>{monthOverdue} overdue</span>}
                {monthDone > 0 && <span style={{ color: '#22c55e' }}>{monthDone} done</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Unscheduled rail (drop-to-clear or pick-up source) ───────────────────────

function UnscheduledRail({
  items, colorBy, onTaskClick, syncingId, myTeamMemberId, totalActive,
}: {
  items: TaskShape[]; colorBy: ColorBy
  onTaskClick: (id: string) => void; syncingId: string | null
  myTeamMemberId: string | null; totalActive: number
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unscheduled' })
  return (
    <div
      ref={setNodeRef}
      className={cn('rounded-lg p-3 flex flex-col gap-2 transition-all', isOver && 'ring-1 ring-inset ring-primary')}
      style={{ background: 'var(--surface-container-low)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays size={13} style={{ color: 'var(--on-surface-variant)' }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>
            Unscheduled
          </span>
          <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }}>{items.length}</span>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>
          {totalActive} active
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] italic" style={{ color: 'var(--on-surface-variant)' }}>All tasks have a schedule. Drop here to clear.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((t) => (
            <UnscheduledChip key={t.id} task={t} colorBy={colorBy} onClick={() => onTaskClick(t.id)} syncing={syncingId === t.id}
              isMyTask={(!!myTeamMemberId && t.assignee?.id === myTeamMemberId) || !!t.isSelfTask}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function UnscheduledChip({ task, colorBy, onClick, syncing, isMyTask }: {
  task: TaskShape; colorBy: ColorBy; onClick: () => void; syncing: boolean; isMyTask: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })
  const color = getCardColor(task, colorBy)
  if (syncing) {
    return <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded animate-pulse"
      style={{ color: 'var(--primary)', background: 'rgba(71,234,237,0.08)' }}>Syncing…</span>
  }
  return (
    <div
      ref={setNodeRef} {...attributes} {...listeners}
      onClick={() => { if (!isDragging) onClick() }}
      className="inline-flex items-center gap-2 px-2 py-1 rounded cursor-grab active:cursor-grabbing transition-all hover:brightness-125 select-none"
      style={{
        opacity: isDragging ? 0.35 : 1,
        background: 'var(--surface-container)',
        borderLeft: `3px solid ${color}`,
        boxShadow: isMyTask ? `inset 0 0 0 1px ${color}90` : undefined,
      }}
    >
      <span className="text-[11px] font-semibold truncate max-w-[200px]" style={{ color: 'var(--on-surface)' }}>{task.title}</span>
      {task.assignee && <MemberAvatar name={task.assignee.name} size="sm" />}
    </div>
  )
}
