'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Layers, Calendar, Archive, ChevronDown, ChevronUp, X } from 'lucide-react'
import { toast } from 'sonner'

import { useProjects } from '@/hooks/use-projects'
import { useTeam } from '@/hooks/use-team'
import { useStakeholders } from '@/hooks/use-stakeholders'
import { useDepartments } from '@/hooks/use-departments'
import { PageHeader } from '@/components/ui/page-header'
import { DepartmentBadge } from '@/components/ui/department-badge'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { cn, formatDate } from '@/lib/utils'

const STAGES = [
  { key: 'planning', label: 'Planning', color: 'border-t-[#6B7280]' },
  { key: 'active', label: 'Active', color: 'border-t-[#3B82F6]' },
  { key: 'review', label: 'Review', color: 'border-t-[#F59E0B]' },
  { key: 'closed', label: 'Closed', color: 'border-t-[#10B981]' },
] as const

type Stage = (typeof STAGES)[number]['key']

interface ProjectData {
  id: string
  title: string
  stage: string
  department?: string | null
  dueDate?: string | null
  owner?: { id: string; name: string } | null
  stakeholder?: { id: string; name: string } | null
  stakeholders?: Array<{ stakeholder: { id: string; name: string } }>
  tasks?: Array<{ id: string; status: string }>
}

interface CreateProjectForm {
  title: string
  department: string
  stage: Stage
  ownerId: string
  stakeholderIds: string[]
  dueDate: string
  description: string
}

const EMPTY_FORM: CreateProjectForm = {
  title: '',
  department: '',
  stage: 'planning',
  ownerId: '',
  stakeholderIds: [],
  dueDate: '',
  description: '',
}

function ProjectCard({ project, onClick }: { project: ProjectData; onClick: () => void }) {
  const tasks = project.tasks ?? []
  const total = tasks.length
  const done = tasks.filter(t => t.status === 'done').length
  const progress = total > 0 ? (done / total) * 100 : 0

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-xl p-5 shadow-[var(--shadow-glass)] hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col gap-2"
    >
      {/* Top row: dept badge + due date */}
      <div className="flex items-center justify-between">
        {project.department ? (
          <DepartmentBadge department={project.department} />
        ) : (
          <span />
        )}
        {project.dueDate && (
          <div className="flex items-center gap-1 text-xs text-[var(--outline)]">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(project.dueDate)}</span>
          </div>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
        {project.title}
      </p>

      {/* Owner */}
      {project.owner && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--outline)]">Owner:</span>
          <MemberAvatar name={project.owner.name} size="sm" />
          <span className="text-xs text-[var(--outline)] truncate">{project.owner.name}</span>
        </div>
      )}

      {/* Tasks progress */}
      {total > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--outline)]">Tasks</span>
            <span className="text-xs text-[var(--outline)]">{done}/{total} done</span>
          </div>
          <div className="h-1.5 bg-[var(--surface-container-high)] rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Stakeholders */}
      {(() => {
        const stks = project.stakeholders && project.stakeholders.length > 0
          ? project.stakeholders.map(s => s.stakeholder)
          : project.stakeholder ? [project.stakeholder] : []
        if (stks.length === 0) return null
        return (
          <div className="flex flex-wrap gap-1">
            {stks.slice(0, 3).map(s => (
              <span key={s.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 truncate max-w-[120px]">
                {s.name}
              </span>
            ))}
            {stks.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{stks.length - 3}</span>
            )}
          </div>
        )
      })()}
    </div>
  )
}

export default function ProjectsPage() {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [defaultStage, setDefaultStage] = useState<Stage>('planning')
  const [form, setForm] = useState<CreateProjectForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [reopening, setReopening] = useState<string | null>(null)

  const { projects, mutate, isLoading } = useProjects()
  const { members } = useTeam()
  const { stakeholders } = useStakeholders()
  const { departments } = useDepartments()

  function openCreateDialog(stage: Stage) {
    setDefaultStage(stage)
    setForm({ ...EMPTY_FORM, stage })
    setDialogOpen(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        stage: form.stage,
      }
      if (form.department) body.department = form.department
      if (form.ownerId && form.ownerId !== '__self__') body.ownerId = form.ownerId
      if (form.stakeholderIds.length > 0) body.stakeholderIds = form.stakeholderIds
      if (form.dueDate) body.dueDate = new Date(form.dueDate).toISOString()
      if (form.description) body.description = form.description

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to create project')
      await mutate()
      setDialogOpen(false)
      setForm(EMPTY_FORM)
      toast.success('Project created')
    } catch {
      toast.error('Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  const projectsByStage: Record<Stage, ProjectData[]> = {
    planning: [],
    active: [],
    review: [],
    closed: [],
  }
  ;(projects as ProjectData[]).forEach(p => {
    const stage = p.stage as Stage
    if (projectsByStage[stage]) {
      projectsByStage[stage].push(p)
    }
  })

  const closedProjects = projectsByStage.closed

  async function handleReopen(projectId: string) {
    setReopening(projectId)
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'active' }),
      })
      if (!res.ok) throw new Error('Failed to reopen project')
      await mutate()
      toast.success('Project reopened as Active')
    } catch {
      toast.error('Failed to reopen project')
    } finally {
      setReopening(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Projects" description="Lifecycle board across all stages" />

      {/* 3-column kanban board (excludes closed — those are in Archive) */}
      <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
        {STAGES.filter(col => col.key !== 'closed').map(col => {
          const colProjects = projectsByStage[col.key]
          return (
            <div key={col.key} className="flex flex-col min-h-0">
              {/* Column header */}
              <div
                className={cn(
                  'bg-card border-t-2 rounded-xl px-3 py-2 mb-3 flex items-center justify-between shadow-[var(--shadow-glass)]',
                  col.color
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{col.label}</span>
                  <span className="text-xs font-semibold bg-[var(--surface-container-low)] text-[var(--outline)] rounded-full px-2 py-0.5">
                    {isLoading ? '…' : colProjects.length}
                  </span>
                </div>
                <button
                  onClick={() => openCreateDialog(col.key)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title={`New project in ${col.label}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-260px)] pr-0.5">
                {colProjects.length === 0 && !isLoading ? (
                  <EmptyState
                    icon={<Layers className="h-7 w-7" />}
                    title="No projects yet. Start one."
                    description={`No ${col.label.toLowerCase()} projects`}
                  />
                ) : (
                  colProjects.map(project => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onClick={() => router.push(`/projects/${project.id}`)}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Archive toggle */}
      <div className="mt-4 border-t border-border pt-4">
        <button
          onClick={() => setArchiveOpen(prev => !prev)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Archive className="h-4 w-4" />
          <span>Archive ({closedProjects.length} closed project{closedProjects.length !== 1 ? 's' : ''})</span>
          {archiveOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {archiveOpen && (
          <div className="mt-3 flex flex-col gap-2">
            {closedProjects.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-6">No closed projects.</p>
            ) : (
              closedProjects.map(project => (
                <div
                  key={project.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 bg-card border border-border rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {project.department && <DepartmentBadge department={project.department} />}
                    <span
                      className="text-sm text-muted-foreground truncate cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      {project.title}
                    </span>
                    {project.dueDate && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDate(project.dueDate)}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReopen(project.id)}
                    disabled={reopening === project.id}
                    className="shrink-0"
                  >
                    {reopening === project.id ? 'Reopening…' : 'Reopen'}
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card max-w-lg">
          <DialogHeader>
            <DialogTitle>Start a Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Title *</label>
              <Input
                placeholder="Project title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Department</label>
                <Select
                  value={form.department}
                  onValueChange={v => setForm(f => ({ ...f, department: v ?? '' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Stage</label>
                <Select
                  value={form.stage}
                  onValueChange={v => setForm(f => ({ ...f, stage: (v ?? 'planning') as Stage }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-start">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Assigned To / Owner</label>
                <Select
                  value={form.ownerId}
                  onValueChange={v => setForm(f => ({ ...f, ownerId: v ?? '' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__self__">— Me (Saksham) —</SelectItem>
                    {(members as Array<{ id: string; name: string }>).map(m => (
                      <SelectItem key={`${m.id}-${m.name}`} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Stakeholders</label>
                <div className="min-h-[44px] p-2 rounded-lg bg-[var(--surface-container-high)] border border-border space-y-2">
                  {form.stakeholderIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(stakeholders as Array<{ id: string; name: string }>)
                        .filter(s => form.stakeholderIds.includes(s.id))
                        .map(s => (
                          <span key={s.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300">
                            {s.name}
                            <button
                              type="button"
                              onClick={() => setForm(f => ({ ...f, stakeholderIds: f.stakeholderIds.filter(id => id !== s.id) }))}
                              className="hover:text-red-400 transition-colors cursor-pointer"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {(stakeholders as Array<{ id: string; name: string }>)
                      .filter(s => !form.stakeholderIds.includes(s.id))
                      .map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, stakeholderIds: [...f.stakeholderIds, s.id] }))}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all cursor-pointer"
                        >
                          <Plus className="h-2.5 w-2.5" /> {s.name}
                        </button>
                      ))}
                  </div>
                  {stakeholders.length === 0 && (
                    <p className="text-xs text-muted-foreground">No stakeholders yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Due Date</label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea
                placeholder="Project description…"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
