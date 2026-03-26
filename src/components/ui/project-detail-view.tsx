'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Edit, Share2, Calendar, User, Building2, Tag, Sparkles, Loader2, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { SummaryCard } from '@/components/ui/summarize-button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { DepartmentBadge } from '@/components/ui/department-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { formatDate, cn } from '@/lib/utils'

interface ProjectDetailViewProps {
  project: {
    id: string
    title: string
    description?: string | null
    stage: string
    department: string
    dueDate?: string | null
    owner?: { id: string; name: string } | null
    stakeholder?: { id: string; name: string } | null
    tasks: Array<{
      id: string
      title: string
      status: string
      priority: string
      dueDate?: string | null
      assignee?: { name: string } | null
    }>
    createdAt: string
  }
  onEdit?: () => void
  onClose?: () => void
}

const STAGE_CONFIG: Record<string, { label: string; className: string }> = {
  planning: {
    label: 'Planning',
    className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  },
  active: {
    label: 'Active',
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  },
  review: {
    label: 'Review',
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  },
  closed: {
    label: 'Closed',
    className: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700',
  },
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

function StageBadge({ stage }: { stage: string }) {
  const config = STAGE_CONFIG[stage] ?? STAGE_CONFIG.planning
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border',
        config.className
      )}
    >
      {config.label}
    </span>
  )
}

const PRIORITIES_LIST = ['urgent', 'high', 'medium', 'low']
const DEPARTMENTS_DEFAULT = ['Analytics', 'Revenue', 'OTA', 'Marketing', 'Financial Modelling', 'Program Management']

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

export function ProjectDetailView({ project, onEdit, onTasksGenerated }: ProjectDetailViewProps & { onTasksGenerated?: () => void }) {
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([])
  const [assignedByName, setAssignedByName] = useState('')
  const [creatingTasks, setCreatingTasks] = useState(false)
  const [expandedTaskIdx, setExpandedTaskIdx] = useState<number | null>(null)

  async function handleAiSummary() {
    setLoadingSummary(true)
    try {
      const res = await fetch('/api/ai/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'project', projectId: project.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setAiSummary(data.summary)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate summary')
    } finally {
      setLoadingSummary(false)
    }
  }

  async function handleGenerateTasks() {
    if (!project.description?.trim()) {
      toast.error('Add a project description first — AI uses it to generate tasks')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/generate-project-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setGeneratedTasks(data.tasks ?? [])
      setAssignedByName(data.assignedByName)
      setGeneratorOpen(true)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate tasks')
    } finally {
      setGenerating(false)
    }
  }

  async function handleCreateGeneratedTasks() {
    setCreatingTasks(true)
    let ok = 0, fail = 0
    for (const task of generatedTasks) {
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
    setCreatingTasks(false)
    setGeneratorOpen(false)
    setGeneratedTasks([])
    onTasksGenerated?.()
    if (fail === 0) toast.success(`${ok} task${ok !== 1 ? 's' : ''} created`)
    else toast.warning(`${ok} created, ${fail} failed`)
  }

  function updateGeneratedTask(idx: number, patch: Partial<GeneratedTask>) {
    setGeneratedTasks(t => t.map((task, i) => i === idx ? { ...task, ...patch } : task))
  }

  async function handleShare() {
    const url = `${window.location.origin}/projects/${project.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  return (
    <>
    <motion.div
      className="flex flex-col gap-6 w-full"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header bar: breadcrumb + actions */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between gap-4 flex-wrap"
      >
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/projects"
            className="hover:text-foreground transition-colors"
          >
            Projects
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[280px]">
            {project.title}
          </span>
        </nav>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAiSummary}
            disabled={loadingSummary}
            className="gap-1.5"
          >
            {loadingSummary ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
            {loadingSummary ? 'Summarizing…' : 'AI Summary'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateTasks}
            disabled={generating}
            className="gap-1.5"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
            {generating ? 'Generating…' : 'Generate Tasks'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="gap-1.5"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
          {onEdit && (
            <Button size="sm" onClick={onEdit} className="gap-1.5">
              <Edit className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>
      </motion.div>

      {/* Title */}
      <motion.h1
        variants={itemVariants}
        className="text-3xl font-bold text-foreground leading-tight"
      >
        {project.title}
      </motion.h1>

      {/* AI Summary card */}
      {aiSummary && (
        <motion.div variants={itemVariants}>
          <SummaryCard summary={aiSummary} onDismiss={() => setAiSummary(null)} />
        </motion.div>
      )}

      {/* Meta grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 md:grid-cols-3 gap-4"
      >
        {/* Status */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Tag className="h-3 w-3" />
            Status
          </span>
          <StageBadge stage={project.stage} />
        </div>

        {/* Owner */}
        {project.owner && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <User className="h-3 w-3" />
              Owner
            </span>
            <div className="flex items-center gap-1.5">
              <MemberAvatar name={project.owner.name} size="sm" />
              <span className="text-sm text-foreground">{project.owner.name}</span>
            </div>
          </div>
        )}

        {/* Due Date */}
        {project.dueDate && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Due Date
            </span>
            <span className="text-sm text-foreground">{formatDate(project.dueDate)}</span>
          </div>
        )}

        {/* Department */}
        {project.department && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Department
            </span>
            <DepartmentBadge department={project.department} />
          </div>
        )}

        {/* Stakeholder */}
        {project.stakeholder && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <User className="h-3 w-3" />
              Stakeholder
            </span>
            <span className="text-sm text-foreground">{project.stakeholder.name}</span>
          </div>
        )}
      </motion.div>

      {/* Description */}
      <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Description
        </h2>
        {project.description ? (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {project.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground/60 italic">No description provided.</p>
        )}
      </motion.div>

      {/* Tasks table */}
      <motion.div variants={itemVariants} className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Tasks ({project.tasks.length})
        </h2>

        {project.tasks.length === 0 ? (
          <div className="flex items-center justify-center py-10 border border-dashed border-border rounded-xl text-sm text-muted-foreground">
            No tasks linked to this project yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Task
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Priority
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Assignee
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Due Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {project.tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                      >
                        {task.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="px-4 py-3">
                      {task.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <MemberAvatar name={task.assignee.name} size="sm" />
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {task.assignee.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {task.dueDate ? formatDate(task.dueDate) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>

    {/* Generate Tasks Dialog */}
    <Dialog open={generatorOpen} onOpenChange={v => !v && setGeneratorOpen(false)}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generated Tasks for &ldquo;{project.title}&rdquo;
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 min-h-0">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{generatedTasks.length}</span> task{generatedTasks.length !== 1 ? 's' : ''} suggested from the project description. Review and create.
          </p>
          {generatedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No tasks extracted. Try adding more detail to the project description.</p>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto pr-1">
              {generatedTasks.map((task, idx) => (
                <div key={idx} className="border border-border rounded-lg bg-[var(--surface-container-low)] overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <PriorityBadge priority={task.priority} />
                        {(task.assigneeName || task.isSelfTask) && (
                          <span className="text-xs text-muted-foreground">→ {task.isSelfTask ? 'Me' : task.assigneeName}</span>
                        )}
                        {task.dueDate && <span className="text-xs text-muted-foreground">due {task.dueDate}</span>}
                        <span className="text-xs text-muted-foreground">{task.department}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setExpandedTaskIdx(expandedTaskIdx === idx ? null : idx)} className="p-1 rounded hover:bg-[var(--surface-container-high)] text-muted-foreground transition-colors">
                        {expandedTaskIdx === idx ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => setGeneratedTasks(t => t.filter((_, i) => i !== idx))} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {expandedTaskIdx === idx && (
                    <div className="border-t border-border px-4 pb-4 pt-3 flex flex-col gap-3">
                      <Input value={task.title} onChange={e => updateGeneratedTask(idx, { title: e.target.value })} className="h-8 text-sm" placeholder="Title" />
                      <div className="grid grid-cols-3 gap-3">
                        <Select value={task.priority} onValueChange={v => updateGeneratedTask(idx, { priority: v ?? task.priority })}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>{PRIORITIES_LIST.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={task.department} onValueChange={v => updateGeneratedTask(idx, { department: v ?? task.department })}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>{DEPARTMENTS_DEFAULT.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="date" value={task.dueDate ?? ''} onChange={e => updateGeneratedTask(idx, { dueDate: e.target.value || null })} className="h-8 text-sm" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter className="pt-1">
            <Button variant="ghost" onClick={() => setGeneratorOpen(false)} disabled={creatingTasks}>Cancel</Button>
            <Button onClick={handleCreateGeneratedTasks} disabled={generatedTasks.length === 0 || creatingTasks} className="gap-2">
              {creatingTasks ? <><Loader2 className="h-4 w-4 animate-spin" />Creating…</> : <><Plus className="h-4 w-4" />Create {generatedTasks.length} Task{generatedTasks.length !== 1 ? 's' : ''}</>}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
