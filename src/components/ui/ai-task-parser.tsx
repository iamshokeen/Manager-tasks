'use client'

import { useState } from 'react'
import { Sparkles, Loader2, CheckCircle2, XCircle, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { cn } from '@/lib/utils'

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
  onClose: () => void
  onTasksCreated: () => void
  departments: string[]
}

type Step = 'input' | 'preview'

const PRIORITIES = ['urgent', 'high', 'medium', 'low']

export function AiTaskParser({ open, onClose, onTasksCreated, departments }: AiTaskParserProps) {
  const [step, setStep] = useState<Step>('input')
  const [text, setText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [tasks, setTasks] = useState<ParsedTask[]>([])
  const [assignedByName, setAssignedByName] = useState('')
  const [creating, setCreating] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

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
      setTasks(data.tasks)
      setAssignedByName(data.assignedByName)
      setStep('preview')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to parse tasks')
    } finally {
      setParsing(false)
    }
  }

  async function handleCreateAll() {
    setCreating(true)
    let successCount = 0
    let failCount = 0

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
        if (task.isSelfTask) {
          body.isSelfTask = true
        } else if (task.assigneeId) {
          body.assigneeId = task.assigneeId
        }
        if (task.dueDate) body.dueDate = new Date(task.dueDate).toISOString()

        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error()
        successCount++
      } catch {
        failCount++
      }
    }

    setCreating(false)
    onTasksCreated()

    if (failCount === 0) {
      toast.success(`${successCount} task${successCount !== 1 ? 's' : ''} created`)
    } else {
      toast.warning(`${successCount} created, ${failCount} failed`)
    }
    handleClose()
  }

  function handleClose() {
    onClose()
    // reset after animation
    setTimeout(() => {
      setStep('input')
      setText('')
      setTasks([])
      setExpandedIdx(null)
    }, 200)
  }

  function removeTask(idx: number) {
    setTasks(t => t.filter((_, i) => i !== idx))
  }

  function updateTask(idx: number, patch: Partial<ParsedTask>) {
    setTasks(t => t.map((task, i) => (i === idx ? { ...task, ...patch } : task)))
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Task Parser
          </DialogTitle>
        </DialogHeader>

        {step === 'input' && (
          <div className="flex flex-col gap-4 flex-1">
            <p className="text-sm text-muted-foreground">
              Describe tasks in plain language. Claude will extract them, assign people, and set priorities.
            </p>
            <Textarea
              placeholder={`e.g. "Ask Priya to prepare the Q1 revenue deck by Friday. Rahul should do the OTA competitive analysis urgently. Remind me to review the marketing budget end of week."`}
              rows={6}
              value={text}
              onChange={e => setText(e.target.value)}
              className="resize-none"
              autoFocus
            />
            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleParse}
                disabled={!text.trim() || parsing}
                className="gap-2"
              >
                {parsing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Parsing…</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Parse Tasks</>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found <span className="font-semibold text-foreground">{tasks.length}</span> task{tasks.length !== 1 ? 's' : ''}. Review and edit before creating.
              </p>
              <button
                onClick={() => setStep('input')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Edit input
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <XCircle className="h-8 w-8" />
                <p className="text-sm">No tasks extracted. Try rephrasing your input.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto pr-1">
                {tasks.map((task, idx) => (
                  <div
                    key={idx}
                    className="border border-border rounded-lg bg-[var(--surface-container-low)] overflow-hidden"
                  >
                    {/* Row summary */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <PriorityBadge priority={task.priority} />
                          {task.assigneeName && (
                            <span className="text-xs text-muted-foreground">→ {task.assigneeName}</span>
                          )}
                          {task.isSelfTask && (
                            <span className="text-xs text-muted-foreground">→ Me (self)</span>
                          )}
                          {task.dueDate && (
                            <span className="text-xs text-muted-foreground">due {task.dueDate}</span>
                          )}
                          <span className="text-xs text-muted-foreground">{task.department}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                          className="p-1 rounded hover:bg-[var(--surface-container-high)] text-muted-foreground transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => removeTask(idx)}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                          className="p-1 rounded hover:bg-[var(--surface-container-high)] text-muted-foreground transition-colors"
                        >
                          {expandedIdx === idx ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded editor */}
                    {expandedIdx === idx && (
                      <div className="border-t border-border px-4 pb-4 pt-3 flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-muted-foreground">Title</label>
                          <Input
                            value={task.title}
                            onChange={e => updateTask(idx, { title: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground">Priority</label>
                            <Select
                              value={task.priority}
                              onValueChange={v => updateTask(idx, { priority: v })}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PRIORITIES.map(p => (
                                  <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground">Department</label>
                            <Select
                              value={task.department}
                              onValueChange={v => updateTask(idx, { department: v })}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {departments.map(d => (
                                  <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground">Due Date</label>
                            <Input
                              type="date"
                              value={task.dueDate ?? ''}
                              onChange={e => updateTask(idx, { dueDate: e.target.value || null })}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        {task.description && (
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground">Description</label>
                            <Textarea
                              rows={2}
                              value={task.description ?? ''}
                              onChange={e => updateTask(idx, { description: e.target.value || null })}
                              className="text-sm resize-none"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button variant="ghost" onClick={handleClose} disabled={creating}>Cancel</Button>
              <Button
                onClick={handleCreateAll}
                disabled={tasks.length === 0 || creating}
                className="gap-2"
              >
                {creating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                ) : (
                  <>Create {tasks.length} Task{tasks.length !== 1 ? 's' : ''}</>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
