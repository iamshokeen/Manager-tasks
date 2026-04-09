'use client'

import { useState, useEffect } from 'react'
import { Loader2, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MemberAvatar } from '@/components/ui/member-avatar'

interface ParsedTask {
  title: string
  description: string | null
  assigneeId: string | null
  assigneeName: string | null
  isSelfTask: boolean
  department: string
  priority: string
  dueDate: string | null
}

interface AiTaskParserProps {
  open: boolean
  onClose?: () => void
  onOpenChange?: (v: boolean) => void
  onTasksCreated?: () => void
  onCreated?: () => void
  departments?: string[]
  initialText?: string
}

const PRIORITIES = ['urgent', 'high', 'medium', 'low']

function priorityIcon(priority: string): { icon: string; color: string } {
  switch (priority) {
    case 'urgent': return { icon: 'report', color: 'var(--error)' }
    case 'high':   return { icon: 'check_circle', color: 'var(--tertiary)' }
    case 'medium': return { icon: 'pending_actions', color: 'var(--primary)' }
    default:       return { icon: 'event', color: 'var(--outline)' }
  }
}

function priorityBadgeStyle(priority: string): React.CSSProperties {
  switch (priority) {
    case 'urgent': return { background: 'var(--error-container)', color: 'var(--on-error-container)' }
    case 'high':   return { background: 'var(--tertiary-container)', color: 'var(--on-tertiary-container)' }
    case 'medium': return { background: 'rgba(169,180,185,0.3)', color: 'var(--on-surface-variant)' }
    default:       return { background: 'rgba(169,180,185,0.3)', color: 'var(--on-surface-variant)' }
  }
}

export function AiTaskParser({ open, onClose, onOpenChange, onTasksCreated, onCreated, departments = [], initialText }: AiTaskParserProps) {
  const [text, setText] = useState(initialText ?? '')
  const [parsing, setParsing] = useState(false)
  const [tasks, setTasks] = useState<ParsedTask[]>([])
  const [assignedByName, setAssignedByName] = useState('')
  const [creating, setCreating] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  useEffect(() => {
    if (open && initialText) setText(initialText)
  }, [open, initialText])

  async function handleParse() {
    if (!text.trim()) return
    setParsing(true)
    try {
      const res = await fetch('/api/ai/parse-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Parse failed')
      }
      const data = await res.json()
      setTasks(data.tasks ?? [])
      setAssignedByName(data.assignedByName)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to parse tasks')
    } finally {
      setParsing(false)
    }
  }

  async function handleCreateAll() {
    setCreating(true)
    let ok = 0, fail = 0
    for (const task of tasks) {
      try {
        const body: Record<string, unknown> = {
          title: task.title,
          department: task.department,
          priority: task.priority,
          assignedByName,
          source: 'ai',
        }
        if (task.description) body.description = task.description
        if (task.isSelfTask) body.isSelfTask = true
        else if (task.assigneeId) body.assigneeId = task.assigneeId
        if (task.dueDate) body.dueDate = new Date(task.dueDate).toISOString()
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error()
        ok++
      } catch { fail++ }
    }
    setCreating(false)
    onTasksCreated?.()
    onCreated?.()
    if (fail === 0) toast.success(`${ok} task${ok !== 1 ? 's' : ''} created`)
    else toast.warning(`${ok} created, ${fail} failed`)
    handleClose()
  }

  function handleClose() {
    onClose?.()
    onOpenChange?.(false)
    setTimeout(() => { setText(initialText ?? ''); setTasks([]); setExpandedIdx(null) }, 200)
  }

  function removeTask(idx: number) {
    setTasks(t => t.filter((_, i) => i !== idx))
  }

  function updateTask(idx: number, patch: Partial<ParsedTask>) {
    setTasks(t => t.map((task, i) => i === idx ? { ...task, ...patch } : task))
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent
        className="p-0 overflow-hidden border-0"
        style={{
          maxWidth: '900px',
          width: '95vw',
          height: '82vh',
          background: 'var(--surface-container-lowest)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          className="flex items-end justify-between px-8 pt-6 pb-4 shrink-0"
          style={{ borderBottom: '1px solid var(--surface-container-high)' }}
        >
          <div>
            <h1
              className="text-2xl font-extrabold tracking-tight mb-0.5"
              style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' }}
            >
              AI Task Parser
            </h1>
            <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
              Paste raw notes or meeting transcripts to extract structured action items.
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{ background: 'var(--surface-container-low)' }}
          >
            <div className="relative flex items-center justify-center w-2 h-2">
              {parsing && (
                <div
                  className="w-2 h-2 rounded-full absolute animate-ping"
                  style={{ background: 'var(--primary)', opacity: 0.6 }}
                />
              )}
              <div
                className="w-2 h-2 rounded-full relative"
                style={{ background: parsing ? 'var(--primary)' : '#10b981' }}
              />
            </div>
            <span
              className="text-[10px] font-bold tracking-wider uppercase"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              {parsing ? 'Processing…' : 'AI Ready'}
            </span>
          </div>
        </div>

        {/* Split panels */}
        <div className="flex flex-1 min-h-0">
          {/* Left: Raw Input */}
          <div
            className="w-2/5 flex flex-col overflow-hidden"
            style={{ borderRight: '1px solid var(--surface-container-high)' }}
          >
            <div
              className="flex items-center justify-between px-5 py-3 shrink-0"
              style={{ borderBottom: '1px solid var(--surface-container-high)' }}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--outline)' }}>
                Raw Context
              </span>
              <button
                onClick={() => setText('')}
                className="text-xs font-bold hover:underline"
                style={{ color: 'var(--primary)' }}
              >
                Clear
              </button>
            </div>
            <textarea
              className="flex-1 p-5 bg-transparent border-none focus:outline-none text-sm leading-relaxed resize-none"
              style={{ color: 'var(--on-surface)', fontFamily: 'Inter, sans-serif' }}
              placeholder={"Paste your unformatted notes here...\n\ne.g. 'Meeting with Sarah: We need to finalize the Q3 budget by Friday. Also, John should check the API docs for the ledger integration...'"}
              value={text}
              onChange={e => setText(e.target.value.slice(0, 3000))}
            />
            <div
              className="flex items-center justify-between px-5 py-3 shrink-0"
              style={{ borderTop: '1px solid var(--surface-container-high)' }}
            >
              <span className="text-[10px]" style={{ color: 'var(--outline)' }}>
                {text.length}/3000
              </span>
              <button
                onClick={handleParse}
                disabled={!text.trim() || parsing}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, var(--primary), #0048c1)',
                  color: 'var(--on-primary)',
                }}
              >
                {parsing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Parsing…</>
                ) : (
                  <><span className="material-symbols-outlined text-[18px]">psychology</span>Extract Tasks</>
                )}
              </button>
            </div>
          </div>

          {/* Right: Proposed Tasks */}
          <div
            className="flex-1 flex flex-col overflow-hidden"
            style={{ background: 'var(--surface-container-low)' }}
          >
            <div
              className="flex items-center justify-between px-5 py-3 shrink-0"
              style={{
                borderBottom: '1px solid var(--surface-container-highest)',
                background: 'rgba(225,233,238,0.5)',
              }}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>
                Proposed Tasks ({tasks.length})
              </span>
              <div className="flex items-center gap-4">
                {tasks.length > 0 && (
                  <span className="text-xs italic" style={{ color: 'var(--on-surface-variant)' }}>
                    AI high-confidence matches
                  </span>
                )}
                <button
                  onClick={handleCreateAll}
                  disabled={tasks.length === 0 || creating}
                  className="px-5 py-1.5 rounded-md text-sm font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(90deg, var(--primary), #0048c1)',
                    color: 'var(--on-primary)',
                  }}
                >
                  {creating ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Creating…
                    </span>
                  ) : (
                    'Create All Tasks'
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                  <span
                    className="material-symbols-outlined text-5xl"
                    style={{ color: 'var(--outline-variant)' }}
                  >
                    psychology
                  </span>
                  <p className="text-sm text-center max-w-xs" style={{ color: 'var(--on-surface-variant)' }}>
                    Paste your notes on the left and click{' '}
                    <span className="font-semibold" style={{ color: 'var(--on-surface)' }}>Extract Tasks</span>{' '}
                    to see AI-parsed action items here.
                  </p>
                </div>
              ) : (
                tasks.map((task, idx) => {
                  const { icon, color } = priorityIcon(task.priority)
                  const badgeStyle = priorityBadgeStyle(task.priority)
                  return (
                    <div
                      key={idx}
                      className="rounded-lg overflow-hidden transition-all"
                      style={{ background: 'var(--surface-container-lowest)' }}
                    >
                      <div className="flex items-start gap-4 p-4">
                        <div className="mt-0.5 shrink-0">
                          <span
                            className="material-symbols-outlined text-2xl"
                            style={{
                              color,
                              fontVariationSettings: icon === 'check_circle' ? "'FILL' 1" : "'FILL' 1",
                            }}
                          >
                            {icon}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3
                              className="font-bold text-sm leading-snug"
                              style={{ color: 'var(--on-surface)' }}
                            >
                              {task.title}
                            </h3>
                            <span
                              className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-tight shrink-0"
                              style={badgeStyle}
                            >
                              {task.priority}
                            </span>
                          </div>
                          {task.description && (
                            <p className="text-xs mb-3" style={{ color: 'var(--on-surface-variant)' }}>
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-5">
                            {(task.assigneeName || task.isSelfTask) ? (
                              <div className="flex items-center gap-2">
                                <MemberAvatar
                                  name={task.isSelfTask ? 'Me' : (task.assigneeName ?? '?')}
                                  size="sm"
                                  style={{ width: 20, height: 20, fontSize: 8 }}
                                />
                                <span className="text-xs font-medium" style={{ color: 'var(--on-surface)' }}>
                                  {task.isSelfTask ? 'Me (self)' : task.assigneeName}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1" style={{ color: 'var(--outline)' }}>
                                <span className="material-symbols-outlined text-sm">person_search</span>
                                <span className="text-xs font-medium">Unassigned</span>
                              </div>
                            )}
                            {task.dueDate && (
                              <div className="flex items-center gap-1" style={{ color: 'var(--outline)' }}>
                                <span className="material-symbols-outlined text-sm">calendar_today</span>
                                <span className="text-xs">{task.dueDate}</span>
                              </div>
                            )}
                            <span className="text-xs" style={{ color: 'var(--outline)' }}>
                              {task.department}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          <button
                            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                            className="p-1 rounded transition-colors"
                            style={{ color: 'var(--on-surface-variant)' }}
                          >
                            {expandedIdx === idx ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => removeTask(idx)}
                            className="p-1 rounded transition-colors hover:text-red-500"
                            style={{ color: 'var(--on-surface-variant)' }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {expandedIdx === idx && (
                        <div
                          className="px-4 pb-4 pt-2 flex flex-col gap-3"
                          style={{ borderTop: '1px solid var(--surface-container)' }}
                        >
                          <Input
                            value={task.title}
                            onChange={e => updateTask(idx, { title: e.target.value })}
                            className="h-8 text-sm"
                            placeholder="Title"
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <Select value={task.priority} onValueChange={v => updateTask(idx, { priority: v ?? task.priority })}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Select value={task.department} onValueChange={v => updateTask(idx, { department: v ?? task.department })}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input
                              type="date"
                              value={task.dueDate ?? ''}
                              onChange={e => updateTask(idx, { dueDate: e.target.value || null })}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
