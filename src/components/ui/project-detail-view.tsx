'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { SummaryCard } from '@/components/ui/summarize-button'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { StatusBadge } from '@/components/ui/status-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { ProjectTaskGenerator } from '@/components/ui/project-task-generator'
import { RichTextView } from '@/components/ui/rich-text-view'
import { AttachmentSection } from '@/components/ui/attachment-section'
import { useDepartments } from '@/hooks/use-departments'
import { formatDate } from '@/lib/utils'

interface ProjectDetailViewProps {
  project: {
    id: string
    title: string
    description?: string | null
    brainstormNotes?: string | null
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
  onAddTask?: () => void
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

const STAGE_STEPS: Record<string, { label: string; done: number; total: number }> = {
  planning:  { label: 'Phase 1: Planning',     done: 2, total: 8 },
  active:    { label: 'Phase 3: Integration',  done: 6, total: 8 },
  review:    { label: 'Phase 4: Review',       done: 7, total: 8 },
  closed:    { label: 'Phase 5: Complete',     done: 8, total: 8 },
}

const KANBAN_COLS = [
  {
    key: 'todo',
    label: 'To Do',
    dot: 'var(--outline-variant)',
    statuses: ['todo', 'backlog', 'open'],
    countBg: 'var(--surface-container-high)',
    countColor: 'var(--on-surface-variant)',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    dot: 'var(--tertiary)',
    statuses: ['in_progress', 'active', 'doing'],
    countBg: 'rgba(134,84,0,0.1)',
    countColor: 'var(--tertiary)',
  },
  {
    key: 'in_review',
    label: 'In Review',
    dot: 'var(--primary)',
    statuses: ['in_review', 'review', 'pending'],
    countBg: 'var(--primary-container)',
    countColor: 'var(--primary)',
  },
  {
    key: 'done',
    label: 'Done',
    dot: '#10b981',
    statuses: ['done', 'completed', 'closed'],
    countBg: 'rgba(16,185,129,0.12)',
    countColor: '#059669',
  },
]

function KanbanCard({
  task,
  isDone,
}: {
  task: ProjectDetailViewProps['project']['tasks'][number]
  isDone: boolean
}) {
  const isUrgent = task.priority === 'urgent'
  return (
    <Link
      href={`/tasks/${task.id}`}
      className="block p-4 rounded-xl group transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{
        background: isDone ? 'rgba(240,244,247,0.5)' : 'var(--surface-container-lowest)',
        boxShadow: isDone ? 'none' : '0 1px 4px rgba(42,52,57,0.06)',
        opacity: isDone ? 0.6 : 1,
        borderLeft: isUrgent ? '4px solid var(--error)' : undefined,
        border: !isUrgent ? '1px solid transparent' : undefined,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider"
          style={
            isUrgent
              ? { background: 'rgba(159,64,61,0.12)', color: 'var(--error)' }
              : { background: 'var(--surface-container)', color: 'var(--on-surface-variant)' }
          }
        >
          {isUrgent ? 'Urgent' : (task.priority ?? 'task')}
        </span>
        {isDone && (
          <span className="material-symbols-outlined text-[18px]" style={{ color: '#10b981' }}>
            check_circle
          </span>
        )}
      </div>
      <h4
        className={`text-sm font-bold mb-3 leading-tight${isDone ? ' line-through' : ''}`}
        style={{ color: isDone ? 'var(--on-surface-variant)' : 'var(--on-surface)' }}
      >
        {task.title}
      </h4>
      <div
        className="flex items-center justify-between pt-3"
        style={{ borderTop: '1px solid var(--surface-container)' }}
      >
        <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--outline)' }}>
          {task.dueDate ? (
            <>
              <span className="material-symbols-outlined text-[14px]">timer</span>
              <span>{formatDate(task.dueDate)}</span>
            </>
          ) : (
            <>
              <StatusBadge status={task.status} />
            </>
          )}
        </div>
        {task.assignee ? (
          <MemberAvatar name={task.assignee.name} size="sm" />
        ) : (
          <span />
        )}
      </div>
    </Link>
  )
}

export function ProjectDetailView({
  project,
  onEdit,
  onTasksGenerated,
  onAddTask,
}: ProjectDetailViewProps & { onTasksGenerated?: () => void }) {
  const { departments } = useDepartments()
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [view, setView] = useState<'board' | 'list' | 'timeline'>('board')

  // Computed stats
  const totalTasks = project.tasks.length
  const doneTasks = project.tasks.filter(t =>
    ['done', 'completed', 'closed'].includes(t.status)
  ).length
  const efficiency = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const circumference = 175.9
  const dashOffset = circumference * (1 - efficiency / 100)
  const stageProgress = STAGE_STEPS[project.stage] ?? STAGE_STEPS.planning

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

  function openGenerator() {
    setGeneratorOpen(true)
  }

  return (
    <>
    <motion.div
      className="flex flex-col gap-8 w-full"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div>
          <nav className="flex items-center gap-1.5 text-xs font-bold mb-3" style={{ color: 'var(--outline)' }}>
            <Link href="/projects" className="hover:underline transition-colors uppercase">
              Projects
            </Link>
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>chevron_right</span>
            <span style={{ color: 'var(--on-surface)' }} className="uppercase truncate max-w-[300px]">
              {project.title.replace(/\s+/g, '_')}
            </span>
          </nav>
          <h1
            className="text-3xl font-extrabold tracking-tight mb-2"
            style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' }}
          >
            {project.title}
          </h1>
          {project.description && (
            <div className="max-w-2xl text-sm" style={{ color: 'var(--on-surface-variant)' }}>
              <RichTextView html={project.description} clampLines={6} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={openGenerator}
            className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors active:scale-[0.98]"
            style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)' }}
          >
            <span className="material-symbols-outlined text-[20px]">psychology</span>
            Generate Tasks
          </button>
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, var(--primary), #0048c1)', color: 'var(--on-primary)' }}
            >
              <span className="material-symbols-outlined text-[20px]">edit</span>
              Modify Project
            </button>
          )}
        </div>
      </motion.div>

      {/* AI Summary card */}
      {aiSummary && (
        <motion.div variants={itemVariants}>
          <SummaryCard summary={aiSummary} onDismiss={() => setAiSummary(null)} />
        </motion.div>
      )}

      {/* Attachments */}
      <motion.div variants={itemVariants}>
        <div
          className="rounded-xl p-5"
          style={{ background: 'var(--surface-container-lowest)', boxShadow: '0 8px 30px rgb(42,52,57,0.04)' }}
        >
          <AttachmentSection projectId={project.id} />
        </div>
      </motion.div>

      {/* Bento Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Project Health AI Widget */}
        <div
          className="lg:col-span-4 flex flex-col justify-between rounded-xl p-6"
          style={{ background: 'var(--surface-container-lowest)', boxShadow: '0 8px 30px rgb(42,52,57,0.04)' }}
        >
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--outline)' }}>
                Project Health AI
              </span>
              <span
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold"
                style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--primary)' }} />
                {project.stage === 'closed' ? 'COMPLETE' : efficiency >= 70 ? 'STABLE' : efficiency >= 40 ? 'AT RISK' : 'CRITICAL'}
              </span>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-16 h-16 rounded-full border-4 flex items-center justify-center relative shrink-0"
                style={{ borderColor: 'var(--primary-container)' }}
              >
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32" cy="32" r="28"
                    fill="transparent"
                    stroke="var(--primary)"
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-lg font-bold" style={{ fontFamily: 'Manrope', color: 'var(--on-surface)' }}>
                  {efficiency}%
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--on-surface)' }}>Efficiency Index</h3>
                <p className="text-xs leading-snug mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>
                  {doneTasks} of {totalTasks} task{totalTasks !== 1 ? 's' : ''} completed.
                </p>
              </div>
            </div>
          </div>
          <div
            className="flex items-start gap-3 p-3 rounded-lg"
            style={{ background: 'var(--surface-container-low)' }}
          >
            <span className="material-symbols-outlined text-[18px] shrink-0" style={{ color: 'var(--primary)' }}>
              auto_awesome
            </span>
            <p className="text-[11px] font-medium leading-relaxed" style={{ color: 'var(--on-surface)' }}>
              {aiSummary
                ? aiSummary.slice(0, 120) + (aiSummary.length > 120 ? '…' : '')
                : 'Click AI Summary for intelligent project analysis and actionable recommendations.'}
            </p>
          </div>
        </div>

        {/* Stage Progress & Metadata */}
        <div
          className="lg:col-span-8 rounded-xl p-6"
          style={{ background: 'var(--surface-container-lowest)', boxShadow: '0 8px 30px rgb(42,52,57,0.04)' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-full">
            <div className="md:col-span-2 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold tracking-widest uppercase mb-4 block" style={{ color: 'var(--outline)' }}>
                  Stage Progress
                </span>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold" style={{ color: 'var(--on-surface)' }}>
                    {stageProgress.label}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                    {stageProgress.done} of {stageProgress.total} steps
                  </span>
                </div>
                <div
                  className="w-full h-2.5 rounded-full overflow-hidden mb-8"
                  style={{ background: 'var(--surface-container-high)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(stageProgress.done / stageProgress.total) * 100}%`,
                      background: 'var(--primary)',
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="text-[10px] font-bold uppercase block mb-1.5" style={{ color: 'var(--outline)' }}>
                    Project Owner
                  </span>
                  {project.owner ? (
                    <div className="flex items-center gap-2">
                      <MemberAvatar name={project.owner.name} size="sm" />
                      <span className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                        {project.owner.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>—</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase block mb-1.5" style={{ color: 'var(--outline)' }}>
                    Stakeholder
                  </span>
                  {project.stakeholder ? (
                    <div className="flex items-center gap-2">
                      <MemberAvatar name={project.stakeholder.name} size="sm" />
                      <span className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                        {project.stakeholder.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>—</span>
                  )}
                </div>
              </div>
            </div>

            {/* Metadata panel */}
            <div
              className="rounded-lg p-4 flex flex-col justify-between"
              style={{ background: 'var(--surface-container-low)' }}
            >
              <div>
                <span className="text-[10px] font-bold uppercase block mb-3" style={{ color: 'var(--outline)' }}>
                  Project Metadata
                </span>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--on-surface-variant)' }}>Status</span>
                    <span className="font-bold capitalize" style={{ color: 'var(--tertiary)' }}>
                      {project.stage.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--on-surface-variant)' }}>Department</span>
                    <span className="font-bold" style={{ color: 'var(--on-surface)' }}>
                      {project.department}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--on-surface-variant)' }}>Created</span>
                    <span className="font-medium" style={{ color: 'var(--on-surface)' }}>
                      {formatDate(project.createdAt)}
                    </span>
                  </div>
                  {project.dueDate && (
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: 'var(--on-surface-variant)' }}>Due Date</span>
                      <span className="font-medium" style={{ color: 'var(--on-surface)' }}>
                        {formatDate(project.dueDate)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handleAiSummary}
                disabled={loadingSummary}
                className="w-full mt-4 py-2 rounded-lg text-[11px] font-bold hover:opacity-80 transition-colors flex items-center justify-center gap-1.5"
                style={{ border: '1px solid rgba(113,124,130,0.2)', color: 'var(--on-surface)', background: 'transparent' }}
              >
                {loadingSummary
                  ? <><Loader2 className="h-3 w-3 animate-spin" /> Analyzing…</>
                  : <><Sparkles className="h-3 w-3" style={{ color: 'var(--primary)' }} /> AI Summary</>}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Kanban / Workflow Section */}
      <motion.div variants={itemVariants}>
        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            <h2
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' }}
            >
              Project Workflow
            </h2>
            <div className="flex items-center rounded-lg p-1" style={{ background: 'var(--surface-container-high)' }}>
              {(['Board', 'List', 'Timeline'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v.toLowerCase() as typeof view)}
                  className="px-4 py-1.5 rounded-md text-xs font-bold transition-colors"
                  style={
                    view === v.toLowerCase()
                      ? { background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                      : { color: 'var(--on-surface-variant)' }
                  }
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAddTask?.()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
              style={{ background: 'var(--surface-container-highest)', color: 'var(--on-surface)' }}
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Task
            </button>
            <button
              onClick={openGenerator}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
              style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)' }}
            >
              <span className="material-symbols-outlined text-[18px]">psychology</span>
              Generate Tasks
            </button>
          </div>
        </div>

        {/* Board view */}
        {view === 'board' && (
          <div className="flex gap-5 overflow-x-auto pb-6 -mx-4 lg:-mx-8 px-4 lg:px-8">
            {KANBAN_COLS.map(col => {
              const colTasks = project.tasks.filter(t => col.statuses.includes(t.status))
              return (
                <div key={col.key} className="min-w-[300px] w-[300px] flex flex-col gap-3 shrink-0">
                  {/* Column header */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.dot }} />
                      <h3 className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--on-surface)' }}>
                        {col.label}
                      </h3>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: col.countBg, color: col.countColor }}
                      >
                        {colTasks.length}
                      </span>
                    </div>
                    <button
                      className="material-symbols-outlined"
                      style={{ color: 'var(--outline-variant)', fontSize: 20 }}
                    >
                      more_horiz
                    </button>
                  </div>

                  {/* Cards */}
                  {colTasks.length === 0 ? (
                    <div
                      className="py-8 rounded-xl text-center text-xs"
                      style={{ color: 'var(--outline)', border: '1px dashed var(--outline-variant)', opacity: 0.5 }}
                    >
                      No tasks
                    </div>
                  ) : (
                    colTasks.map(task => (
                      <KanbanCard key={task.id} task={task} isDone={col.key === 'done'} />
                    ))
                  )}

                  {col.key !== 'done' && (
                    <button
                      className="w-full py-3 rounded-xl text-xs font-bold transition-all"
                      style={{
                        border: '2px dashed rgba(113,124,130,0.3)',
                        color: 'var(--outline)',
                      }}
                    >
                      + Add Task
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* List view */}
        {view === 'list' && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--surface-container-high)' }}>
            {project.tasks.length === 0 ? (
              <div
                className="flex items-center justify-center py-10 text-sm"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                No tasks linked to this project yet.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)' }}>
                    <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--outline)' }}>Task</th>
                    <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--outline)' }}>Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--outline)' }}>Priority</th>
                    <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--outline)' }}>Assignee</th>
                    <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--outline)' }}>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {project.tasks.map((task, i) => (
                    <tr
                      key={task.id}
                      className="transition-colors hover:bg-[var(--surface-container-low)]"
                      style={{
                        borderBottom: i < project.tasks.length - 1 ? '1px solid var(--surface-container)' : undefined,
                      }}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="font-medium hover:underline line-clamp-1"
                          style={{ color: 'var(--on-surface)' }}
                        >
                          {task.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                      <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                      <td className="px-4 py-3">
                        {task.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <MemberAvatar name={task.assignee.name} size="sm" />
                            <span className="text-xs truncate max-w-[120px]" style={{ color: 'var(--on-surface-variant)' }}>
                              {task.assignee.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--outline-variant)' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                          {task.dueDate ? formatDate(task.dueDate) : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Timeline view */}
        {view === 'timeline' && (
          <div
            className="flex items-center justify-center py-16 rounded-xl text-sm"
            style={{ color: 'var(--on-surface-variant)', border: '1px dashed var(--outline-variant)' }}
          >
            <span className="material-symbols-outlined mr-2" style={{ color: 'var(--outline)' }}>timeline</span>
            Timeline view coming soon
          </div>
        )}
      </motion.div>
    </motion.div>

    <ProjectTaskGenerator
      open={generatorOpen}
      onOpenChange={setGeneratorOpen}
      project={{
        id: project.id,
        title: project.title,
        description: project.description,
        brainstormNotes: project.brainstormNotes,
        department: project.department,
      }}
      departments={departments as string[]}
      onTasksCreated={() => onTasksGenerated?.()}
      onNotesSaved={() => onTasksGenerated?.()}
    />
    </>
  )
}
