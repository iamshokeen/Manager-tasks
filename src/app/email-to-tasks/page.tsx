'use client'

import { useState } from 'react'
import { Loader2, Trash2, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ParsedTask {
  title: string
  description: string | null
  assigneeId: string | null
  assigneeName: string | null
  isSelfTask: boolean
  department: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  dueDate: string | null
}

interface DetectedPerson {
  name: string
  role: 'team' | 'stakeholder' | 'unknown'
}

const PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const

function priorityBadge(priority: string) {
  switch (priority) {
    case 'urgent': return { bg: 'var(--error-container)', color: 'var(--on-error-container)' }
    case 'high':   return { bg: 'var(--tertiary-container)', color: 'var(--on-tertiary-container)' }
    default:       return { bg: 'rgba(169,180,185,0.25)', color: 'var(--on-surface-variant)' }
  }
}

function personRoleColor(role: DetectedPerson['role']) {
  switch (role) {
    case 'team':        return 'var(--primary)'
    case 'stakeholder': return 'var(--tertiary)'
    default:            return 'var(--outline)'
  }
}

export default function EmailToTasksPage() {
  const [emailText, setEmailText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [tasks, setTasks] = useState<ParsedTask[]>([])
  const [people, setPeople] = useState<DetectedPerson[]>([])
  const [assignedByName, setAssignedByName] = useState('')
  const [creating, setCreating] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [createdIds, setCreatedIds] = useState<Set<number>>(new Set())

  async function handleExtract() {
    if (!emailText.trim()) return
    setParsing(true)
    setTasks([])
    setPeople([])
    setCreatedIds(new Set())
    try {
      const res = await fetch('/api/ai/email-to-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailText }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Extraction failed')
      }
      const data = await res.json()
      setTasks(data.tasks ?? [])
      setPeople(data.detectedPeople ?? [])
      setAssignedByName(data.assignedByName ?? '')
      if ((data.tasks ?? []).length === 0) {
        toast.info('No action items found in this email thread.')
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to extract tasks')
    } finally {
      setParsing(false)
    }
  }

  async function createTask(task: ParsedTask, idx: number) {
    const body: Record<string, unknown> = {
      title: task.title,
      department: task.department,
      priority: task.priority,
      assignedByName,
      source: 'email',
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
    if (!res.ok) throw new Error('Failed')
    setCreatedIds(prev => new Set([...prev, idx]))
  }

  async function handleCreateAll() {
    setCreating(true)
    let ok = 0, fail = 0
    const remaining = tasks
      .map((t, i) => ({ t, i }))
      .filter(({ i }) => !createdIds.has(i))

    for (const { t, i } of remaining) {
      try {
        await createTask(t, i)
        ok++
      } catch { fail++ }
    }
    setCreating(false)
    if (fail === 0) toast.success(`${ok} task${ok !== 1 ? 's' : ''} created`)
    else toast.warning(`${ok} created, ${fail} failed`)
  }

  function removeTask(idx: number) {
    setTasks(t => t.filter((_, i) => i !== idx))
    setCreatedIds(prev => {
      const next = new Set<number>()
      prev.forEach(id => { if (id < idx) next.add(id); else if (id > idx) next.add(id - 1) })
      return next
    })
  }

  function updateTask(idx: number, patch: Partial<ParsedTask>) {
    setTasks(t => t.map((task, i) => i === idx ? { ...task, ...patch } : task))
  }

  const pendingCount = tasks.filter((_, i) => !createdIds.has(i)).length

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: 'var(--background)' }}>

      {/* Page header */}
      <div
        className="flex items-end justify-between px-8 py-5 shrink-0"
        style={{ borderBottom: '1px solid rgba(169,180,185,0.12)' }}
      >
        <div>
          <h1
            className="text-3xl font-extrabold tracking-tight mb-1"
            style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' }}
          >
            Email → Tasks
          </h1>
          <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
            Paste an email thread. Telos reads the CTAs, matches your team, and creates tasks instantly.
          </p>
        </div>

        {tasks.length > 0 && (
          <button
            onClick={handleCreateAll}
            disabled={creating || pendingCount === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, var(--primary), var(--primary-dim, #0048c1))',
              color: 'var(--on-primary)',
            }}
          >
            {creating ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Creating…</>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>task_alt</span>
                Create All ({pendingCount})
              </>
            )}
          </button>
        )}
      </div>

      {/* Main split */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left — email input */}
        <div
          className="w-[42%] flex flex-col min-h-0"
          style={{ borderRight: '1px solid rgba(169,180,185,0.12)' }}
        >
          <div
            className="flex items-center justify-between px-6 py-3 shrink-0"
            style={{ borderBottom: '1px solid rgba(169,180,185,0.08)' }}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--outline)' }}>mail</span>
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--outline)' }}>
                Email Thread
              </span>
            </div>
            <button
              onClick={() => setEmailText('')}
              className="text-xs font-semibold transition-colors hover:underline"
              style={{ color: 'var(--primary)' }}
            >
              Clear
            </button>
          </div>

          <textarea
            className="flex-1 p-6 text-sm leading-relaxed bg-transparent border-none focus:outline-none resize-none"
            style={{
              color: 'var(--on-surface)',
              fontFamily: 'Inter, sans-serif',
              minHeight: 0,
            }}
            placeholder={`Paste your email thread here...\n\nFrom: sarah@company.com\nTo: you@company.com\nSubject: Q4 Resourcing\n\nHi,\n\nCan you ask Rahul to finalize the headcount model by Thursday? Also, Priya needs to\nsend the OTA report to me before EOW...`}
            value={emailText}
            onChange={e => setEmailText(e.target.value.slice(0, 8000))}
          />

          <div
            className="flex items-center justify-between px-6 py-3 shrink-0"
            style={{ borderTop: '1px solid rgba(169,180,185,0.08)' }}
          >
            <span className="text-[11px]" style={{ color: 'var(--outline)' }}>
              {emailText.length.toLocaleString()} / 8,000 chars
            </span>
            <button
              onClick={handleExtract}
              disabled={!emailText.trim() || parsing}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, var(--primary), var(--primary-dim, #0048c1))',
                color: 'var(--on-primary)',
              }}
            >
              {parsing ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Analyzing…</>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>cognition</span>
                  Extract Tasks
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right — results */}
        <div
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
          style={{ background: 'var(--surface-container-low)' }}
        >
          {/* Right header */}
          <div
            className="flex items-center justify-between px-6 py-3 shrink-0"
            style={{
              borderBottom: '1px solid rgba(169,180,185,0.12)',
              background: 'rgba(225,233,238,0.4)',
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>
                Action Items
              </span>
              {tasks.length > 0 && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
                >
                  {tasks.length}
                </span>
              )}
            </div>

            {/* Detected people chips */}
            {people.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-sm">
                {people.slice(0, 5).map((p, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                    style={{
                      color: personRoleColor(p.role),
                      borderColor: personRoleColor(p.role),
                      background: 'transparent',
                      opacity: 0.85,
                    }}
                  >
                    {p.name}
                  </span>
                ))}
                {people.length > 5 && (
                  <span className="text-[10px]" style={{ color: 'var(--outline)' }}>
                    +{people.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">

            {/* Empty state */}
            {tasks.length === 0 && !parsing && (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '56px', color: 'var(--outline-variant)', fontVariationSettings: "'FILL' 0" }}
                >
                  forward_to_inbox
                </span>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                    Paste an email, extract instant tasks
                  </p>
                  <p className="text-xs max-w-xs" style={{ color: 'var(--on-surface-variant)' }}>
                    Telos reads the thread, finds who needs to do what, and maps it to your team automatically.
                  </p>
                </div>
              </div>
            )}

            {/* Parsing skeleton */}
            {parsing && (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="rounded-lg p-4 animate-pulse"
                    style={{ background: 'var(--surface-container-lowest)', height: 76 }}
                  />
                ))}
                <p className="text-center text-xs pt-2" style={{ color: 'var(--on-surface-variant)' }}>
                  Reading email thread and extracting action items…
                </p>
              </div>
            )}

            {/* Task cards */}
            {!parsing && tasks.map((task, idx) => {
              const badge = priorityBadge(task.priority)
              const isCreated = createdIds.has(idx)
              return (
                <div
                  key={idx}
                  className="rounded-xl overflow-hidden transition-all"
                  style={{
                    background: 'var(--surface-container-lowest)',
                    border: isCreated
                      ? '1px solid rgba(16,185,129,0.3)'
                      : '1px solid rgba(169,180,185,0.08)',
                    opacity: isCreated ? 0.7 : 1,
                  }}
                >
                  {/* Card header */}
                  <div className="flex items-start gap-3 p-4">
                    <div className="mt-0.5 shrink-0">
                      {isCreated ? (
                        <CheckCircle2 className="h-5 w-5" style={{ color: '#10b981' }} />
                      ) : (
                        <span
                          className="material-symbols-outlined"
                          style={{
                            fontSize: '20px',
                            color: task.priority === 'urgent'
                              ? 'var(--error)'
                              : task.priority === 'high'
                                ? 'var(--tertiary)'
                                : 'var(--primary)',
                            fontVariationSettings: "'FILL' 1",
                          }}
                        >
                          {task.priority === 'urgent' ? 'report' : task.priority === 'high' ? 'check_circle' : 'pending_actions'}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p
                          className="text-sm font-bold leading-snug"
                          style={{
                            color: 'var(--on-surface)',
                            textDecoration: isCreated ? 'line-through' : 'none',
                          }}
                        >
                          {task.title}
                        </p>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-tight shrink-0"
                          style={{ background: badge.bg, color: badge.color }}
                        >
                          {task.priority}
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-xs mb-2 leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 flex-wrap">
                        {(task.assigneeName || task.isSelfTask) ? (
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                              style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
                            >
                              {(task.isSelfTask ? 'Me' : (task.assigneeName ?? '?'))
                                .split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                            </div>
                            <span className="text-xs font-medium" style={{ color: 'var(--on-surface)' }}>
                              {task.isSelfTask ? 'Me (self)' : task.assigneeName}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1" style={{ color: 'var(--outline)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person_search</span>
                            <span className="text-xs">Unassigned</span>
                          </div>
                        )}

                        {task.dueDate && (
                          <div className="flex items-center gap-1" style={{ color: 'var(--outline)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>calendar_today</span>
                            <span className="text-xs">{task.dueDate}</span>
                          </div>
                        )}

                        <span className="text-xs" style={{ color: 'var(--outline)' }}>
                          {task.department}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                      {!isCreated && (
                        <>
                          <button
                            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                            className="p-1 rounded transition-colors"
                            style={{ color: 'var(--on-surface-variant)' }}
                            title="Edit"
                          >
                            {expandedIdx === idx
                              ? <ChevronUp className="h-3.5 w-3.5" />
                              : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await createTask(task, idx)
                                toast.success('Task created')
                              } catch {
                                toast.error('Failed to create task')
                              }
                            }}
                            className="p-1 rounded transition-colors"
                            style={{ color: 'var(--primary)' }}
                            title="Create this task"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add_task</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => removeTask(idx)}
                        className="p-1 rounded transition-colors hover:text-red-500"
                        style={{ color: 'var(--on-surface-variant)' }}
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline edit */}
                  {expandedIdx === idx && !isCreated && (
                    <div
                      className="px-4 pb-4 pt-2 flex flex-col gap-2"
                      style={{ borderTop: '1px solid rgba(169,180,185,0.1)' }}
                    >
                      <Input
                        value={task.title}
                        onChange={e => updateTask(idx, { title: e.target.value })}
                        className="h-8 text-sm"
                        placeholder="Title"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <Select
                          value={task.priority}
                          onValueChange={v => updateTask(idx, { priority: v as ParsedTask['priority'] })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITIES.map(p => (
                              <SelectItem key={p} value={p} className="capitalize text-xs">{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={task.assigneeName ?? ''}
                          onChange={e => updateTask(idx, { assigneeName: e.target.value || null })}
                          className="h-8 text-xs"
                          placeholder="Assignee name"
                        />
                        <Input
                          type="date"
                          value={task.dueDate ?? ''}
                          onChange={e => updateTask(idx, { dueDate: e.target.value || null })}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
