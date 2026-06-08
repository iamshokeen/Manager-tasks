'use client'

import { useEffect, useState } from 'react'
import { Loader2, Trash2, ChevronDown, ChevronUp, Save } from 'lucide-react'
import { toast } from 'sonner'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { useTeam } from '@/hooks/use-team'

interface GeneratedTask {
  title: string
  description: string | null
  assigneeId: string | null
  assigneeName: string | null
  isSelfTask: boolean
  department: string
  priority: string
  dueDate: string | null
}

interface ProjectTaskGeneratorProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  project: {
    id: string
    title: string
    description?: string | null
    brainstormNotes?: string | null
    department: string
  }
  departments: string[]
  onTasksCreated?: () => void
  onNotesSaved?: (notes: string) => void
}

const PRIORITIES = ['urgent', 'high', 'medium', 'low']
const MAX_NOTES = 6000

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

export function ProjectTaskGenerator({
  open,
  onOpenChange,
  project,
  departments,
  onTasksCreated,
  onNotesSaved,
}: ProjectTaskGeneratorProps) {
  const { members } = useTeam()
  const [notes, setNotes] = useState('')
  const [savedNotes, setSavedNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [tasks, setTasks] = useState<GeneratedTask[]>([])
  const [assignedByName, setAssignedByName] = useState('')
  const [creating, setCreating] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  useEffect(() => {
    if (open) {
      const initial = project.brainstormNotes ?? project.description ?? ''
      setNotes(initial)
      setSavedNotes(project.brainstormNotes ?? '')
      setTasks([])
      setExpandedIdx(null)
    }
  }, [open, project.brainstormNotes, project.description])

  const dirty = notes !== savedNotes

  async function handleSaveNotes() {
    setSavingNotes(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brainstormNotes: notes }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSavedNotes(notes)
      onNotesSaved?.(notes)
      toast.success('Notes saved')
    } catch {
      toast.error('Failed to save notes')
    } finally {
      setSavingNotes(false)
    }
  }

  async function handleGenerate() {
    if (!notes.trim()) {
      toast.error('Add some notes first')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/generate-project-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, brainstormNotes: notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setTasks(data.tasks ?? [])
      setAssignedByName(data.assignedByName)
      if ((data.tasks ?? []).length === 0) {
        toast.message('No tasks extracted — try adding more detail to your notes')
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate tasks')
    } finally {
      setGenerating(false)
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
          projectId: project.id,
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
    onOpenChange(false)
    setTimeout(() => setTasks([]), 200)
    if (fail === 0) toast.success(`${ok} task${ok !== 1 ? 's' : ''} created`)
    else toast.warning(`${ok} created, ${fail} failed`)
  }

  function updateTask(idx: number, patch: Partial<GeneratedTask>) {
    setTasks(t => t.map((task, i) => i === idx ? { ...task, ...patch } : task))
  }

  function removeTask(idx: number) {
    setTasks(t => t.filter((_, i) => i !== idx))
    if (expandedIdx === idx) setExpandedIdx(null)
  }

  const teamMembers = members as Array<{ id: string; name: string }>

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 overflow-hidden border-0"
        style={{
          maxWidth: '1100px',
          width: '95vw',
          height: '86vh',
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
              Generate Tasks — {project.title}
            </h1>
            <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
              Drop in brainstorm notes, a rough timeline, or meeting transcripts. AI turns them into structured tasks linked to this project.
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{ background: 'var(--surface-container-low)' }}
          >
            <div className="relative flex items-center justify-center w-2 h-2">
              {generating && (
                <div
                  className="w-2 h-2 rounded-full absolute animate-ping"
                  style={{ background: 'var(--primary)', opacity: 0.6 }}
                />
              )}
              <div
                className="w-2 h-2 rounded-full relative"
                style={{ background: generating ? 'var(--primary)' : '#10b981' }}
              />
            </div>
            <span
              className="text-[10px] font-bold tracking-wider uppercase"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              {generating ? 'Generating…' : 'AI Ready'}
            </span>
          </div>
        </div>

        {/* Split panels */}
        <div className="flex flex-1 min-h-0">
          {/* Left: Brainstorm notes */}
          <div
            className="w-2/5 flex flex-col overflow-hidden"
            style={{ borderRight: '1px solid var(--surface-container-high)' }}
          >
            <div
              className="flex items-center justify-between px-5 py-3 shrink-0"
              style={{ borderBottom: '1px solid var(--surface-container-high)' }}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--outline)' }}>
                Brainstorm & Timeline Notes
              </span>
              <div className="flex items-center gap-3">
                {dirty && (
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--tertiary)' }}>
                    Unsaved
                  </span>
                )}
                <button
                  onClick={() => setNotes('')}
                  className="text-xs font-bold hover:underline"
                  style={{ color: 'var(--primary)' }}
                >
                  Clear
                </button>
              </div>
            </div>
            <textarea
              className="flex-1 p-5 bg-transparent border-none focus:outline-none text-sm leading-relaxed resize-none"
              style={{ color: 'var(--on-surface)', fontFamily: 'Inter, sans-serif' }}
              placeholder={"Paste your brainstorm, rough timeline, or meeting notes here...\n\ne.g.\n- Week 1: Sarah audits current OTA rates and maps gaps\n- Week 2: John drafts new pricing model\n- Week 3: Review with stakeholders, finalize before EOM"}
              value={notes}
              onChange={e => setNotes(e.target.value.slice(0, MAX_NOTES))}
            />
            <div
              className="flex items-center justify-between gap-3 px-5 py-3 shrink-0"
              style={{ borderTop: '1px solid var(--surface-container-high)' }}
            >
              <span className="text-[10px]" style={{ color: 'var(--outline)' }}>
                {notes.length}/{MAX_NOTES}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveNotes}
                  disabled={!dirty || savingNotes}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{
                    background: 'var(--surface-container-high)',
                    color: 'var(--on-surface)',
                  }}
                >
                  {savingNotes
                    ? <><Loader2 className="h-3 w-3 animate-spin" />Saving…</>
                    : <><Save className="h-3 w-3" />Save Notes</>}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!notes.trim() || generating}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, var(--primary), #0048c1)',
                    color: 'var(--on-primary)',
                  }}
                >
                  {generating ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Generating…</>
                  ) : (
                    <><span className="material-symbols-outlined text-[18px]">psychology</span>Generate Tasks</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Proposed tasks */}
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
              <button
                onClick={handleCreateAll}
                disabled={tasks.length === 0 || creating}
                className="px-5 py-1.5 rounded-md text-sm font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-40"
                style={{
                  background: 'linear-gradient(90deg, var(--primary), #0048c1)',
                  color: 'var(--on-primary)',
                }}
              >
                {creating
                  ? <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />Creating…</span>
                  : `Create ${tasks.length} Task${tasks.length !== 1 ? 's' : ''}`}
              </button>
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
                    Add your notes on the left and click{' '}
                    <span className="font-semibold" style={{ color: 'var(--on-surface)' }}>Generate Tasks</span>{' '}
                    to see proposed action items here.
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
                            style={{ color, fontVariationSettings: "'FILL' 1" }}
                          >
                            {icon}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-bold text-sm leading-snug" style={{ color: 'var(--on-surface)' }}>
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
                          <div className="flex items-center gap-5 flex-wrap">
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
                            <span className="text-xs" style={{ color: 'var(--outline)' }}>{task.department}</span>
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
                          className="px-4 pb-4 pt-3 flex flex-col gap-3"
                          style={{ borderTop: '1px solid var(--surface-container)' }}
                        >
                          <Input
                            value={task.title}
                            onChange={e => updateTask(idx, { title: e.target.value })}
                            className="h-8 text-sm"
                            placeholder="Title"
                          />
                          <Textarea
                            value={task.description ?? ''}
                            onChange={e => updateTask(idx, { description: e.target.value || null })}
                            className="text-sm resize-none"
                            placeholder="Description / acceptance criteria"
                            rows={2}
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
                          <div className="grid grid-cols-2 gap-2 items-center">
                            <Select
                              value={task.isSelfTask ? '__self__' : (task.assigneeId ?? '__none__')}
                              onValueChange={v => {
                                if (v === '__self__') updateTask(idx, { isSelfTask: true, assigneeId: null, assigneeName: 'Me' })
                                else if (v === '__none__') updateTask(idx, { isSelfTask: false, assigneeId: null, assigneeName: null })
                                else {
                                  const m = teamMembers.find(x => x.id === v)
                                  updateTask(idx, { isSelfTask: false, assigneeId: v, assigneeName: m?.name ?? null })
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Assignee" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Unassigned</SelectItem>
                                <SelectItem value="__self__">— Me —</SelectItem>
                                {teamMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--on-surface-variant)' }}>
                              <Checkbox
                                checked={task.isSelfTask}
                                onCheckedChange={(c: boolean) => updateTask(idx, {
                                  isSelfTask: c,
                                  assigneeId: c ? null : task.assigneeId,
                                  assigneeName: c ? 'Me' : task.assigneeName,
                                })}
                              />
                              <span>Personal task</span>
                            </label>
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
