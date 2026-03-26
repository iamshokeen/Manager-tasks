'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  startOfWeek, endOfWeek, addWeeks, subWeeks,
  eachDayOfInterval, isSameDay, format, isToday
} from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { StatusBadge } from '@/components/ui/status-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { formatDate } from '@/lib/utils'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  dueDate?: string | null
  assigneeId?: string | null
  assignee?: { id: string; name: string } | null
}

interface Member {
  id: string
  name: string
  status: string
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const TASK_CHIP_COLORS: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300',
  high:     'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  medium:   'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  low:      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
}
const DONE_CHIP = 'bg-muted text-muted-foreground line-through opacity-60'

export function TaskCalendarSection({ tasks, members }: { tasks: Task[]; members: Member[] }) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd]
  )

  const activeMembers = members.filter(m => m.status === 'active')

  // Map: memberId → dayIndex (0-6) → tasks[]
  const calendarMap = useMemo(() => {
    const map: Record<string, Record<number, Task[]>> = {}
    for (const m of activeMembers) {
      map[m.id] = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
    }
    for (const task of tasks) {
      if (!task.dueDate || !task.assigneeId || !map[task.assigneeId]) continue
      const due = new Date(task.dueDate)
      for (let i = 0; i < weekDays.length; i++) {
        if (isSameDay(due, weekDays[i])) {
          map[task.assigneeId][i].push(task)
        }
      }
    }
    return map
  }, [tasks, activeMembers, weekDays])

  // Tasks due in this week (for the list below)
  const weekTasks = useMemo(() =>
    tasks
      .filter(t => {
        if (!t.dueDate) return false
        const d = new Date(t.dueDate)
        return d >= weekStart && d <= weekEnd
      })
      .sort((a, b) =>
        new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
      ),
    [tasks, weekStart, weekEnd]
  )

  const weekLabel = `${format(weekStart, 'd MMM')} – ${format(weekEnd, 'd MMM yyyy')}`

  return (
    <section className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Task Calendar
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setWeekStart(w => subWeeks(w, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[156px] text-center tabular-nums">
            {weekLabel}
          </span>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setWeekStart(w => addWeeks(w, 1))}>
            <ChevronRight className="size-4" />
          </Button>
          <Link href="/tasks">
            <Button size="sm" className="ml-1">+ Task</Button>
          </Link>
        </div>
      </div>

      {/* ── Calendar Grid ──────────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl shadow-[var(--shadow-glass)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="w-32 text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  {weekTasks.length} task{weekTasks.length !== 1 ? 's' : ''}
                </th>
                {weekDays.map((day, i) => (
                  <th
                    key={i}
                    className={`px-2 py-3 text-center min-w-[90px] ${isToday(day) ? 'bg-primary/5' : ''}`}
                  >
                    <div className={`text-[10px] font-semibold uppercase tracking-wider ${isToday(day) ? 'text-primary' : 'text-muted-foreground'}`}>
                      {DAY_LABELS[i]}
                    </div>
                    <div className={`text-lg font-bold mt-0.5 ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                      {format(day, 'd')}
                    </div>
                    {isToday(day) && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-0.5" />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No active team members yet.
                  </td>
                </tr>
              ) : (
                activeMembers.map((member, mi) => (
                  <tr
                    key={member.id}
                    className={`border-b border-border/40 ${mi % 2 === 1 ? 'bg-[var(--surface-container-low)]/20' : ''}`}
                  >
                    {/* Member name column */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <MemberAvatar name={member.name} size="sm" />
                        <span className="text-xs font-medium text-foreground truncate max-w-[72px]">
                          {member.name.split(' ')[0]}
                        </span>
                      </div>
                    </td>

                    {/* Day columns */}
                    {weekDays.map((_, di) => {
                      const dayTasks = calendarMap[member.id]?.[di] ?? []
                      const visible = dayTasks.slice(0, 2)
                      const overflow = dayTasks.length - 2
                      return (
                        <td
                          key={di}
                          className={`px-1.5 py-2 align-top ${isToday(weekDays[di]) ? 'bg-primary/5' : ''}`}
                        >
                          <div className="space-y-0.5">
                            {visible.map(task => (
                              <Link key={task.id} href={`/tasks/${task.id}`}>
                                <div
                                  className={`rounded-md px-1.5 py-1 text-[11px] font-medium leading-tight truncate transition-opacity hover:opacity-70 ${
                                    task.status === 'done'
                                      ? DONE_CHIP
                                      : TASK_CHIP_COLORS[task.priority] ?? TASK_CHIP_COLORS.medium
                                  }`}
                                  title={task.title}
                                >
                                  {task.title}
                                </div>
                              </Link>
                            ))}
                            {overflow > 0 && (
                              <div className="text-[10px] text-muted-foreground px-1.5 py-0.5">
                                +{overflow} more
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Task List Table ────────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl shadow-[var(--shadow-glass)] overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Tasks This Week
          </span>
          <span className="text-xs text-muted-foreground">
            {weekTasks.length} task{weekTasks.length !== 1 ? 's' : ''}
          </span>
        </div>

        {weekTasks.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No tasks due this week.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Task</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Assignee</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Priority</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Due</th>
                </tr>
              </thead>
              <tbody>
                {weekTasks.map((task, i) => (
                  <tr
                    key={task.id}
                    className={`border-b border-border/30 hover:bg-[var(--surface-container-low)]/40 transition-colors ${
                      i % 2 === 1 ? 'bg-[var(--surface-container-low)]/20' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors truncate max-w-[220px] block"
                      >
                        {task.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-3 py-2.5">
                      {task.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <MemberAvatar name={task.assignee.name} size="sm" />
                          <span className="text-xs text-muted-foreground">
                            {task.assignee.name.split(' ')[0]}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">
                      {task.dueDate ? formatDate(task.dueDate) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
