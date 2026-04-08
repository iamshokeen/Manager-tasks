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
  { key: 'planning', label: 'Planning', color: '#717c82' },
  { key: 'active', label: 'Active', color: '#0053db' },
  { key: 'review', label: 'Review', color: '#f59e0b' },
  { key: 'closed', label: 'Closed', color: '#10b981' },
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
      className="rounded-xl p-4 hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col gap-3 border border-transparent hover:border-primary/20"
      style={{
        background: 'var(--surface-container-lowest)',
        boxShadow: '0 8px 30px rgba(42,52,57,0.04)',
      }}
    >
      {/* Top row: dept badge + arrow icon */}
      <div className="flex items-start justify-between gap-2">
        {project.department ? (
          <DepartmentBadge department={project.department} />
        ) : (
          <span />
        )}
        <span
          className="text-base leading-none opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--primary)' }}
        >
          ↗
        </span>
      </div>

      {/* Title */}
      <h4
        className="font-headline font-bold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2"
        style={{ color: 'var(--on-surface)' }}
      >
        {project.title}
      </h4>

      {/* Owner */}
      {project.owner && (
        <div className="flex items-center gap-1.5">
          <MemberAvatar name={project.owner.name} size="sm" />
          <span className="text-xs truncate" style={{ color: 'var(--on-surface-variant)' }}>
            {project.owner.name}
          </span>
        </div>
      )}

      {/* Tasks progress */}
      {total > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-tighter" style={{ color: 'var(--on-surface)' }}>
              Progress
            </span>
            <span className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>
              {done}/{total} done
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--surface-container)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: 'var(--primary)' }}
            />
          </div>
        </div>
      )}

      {/* Bottom: stakeholders + due date */}
      <div
        className="flex items-center justify-between pt-3 border-t"
        style={{ borderColor: 'var(--surface-container)' }}
      >
        {(() => {
          const stks = project.stakeholders && project.stakeholders.length > 0
            ? project.stakeholders.map(s => s.stakeholder)
            : project.stakeholder ? [project.stakeholder] : []
          return (
            <div className="flex -space-x-1.5">
              {stks.slice(0, 3).map(s => (
                <div
                  key={s.id}
                  className="w-5 h-5 rounded-full ring-1 ring-surface flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: 'var(--primary)', outline: '1px solid var(--surface-container-lowest)' }}
                  title={s.name}
                >
                  {s.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {stks.length > 3 && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{
                    background: 'var(--surface-container-highest)',
                    color: 'var(--on-surface-variant)',
                  }}
                >
                  +{stks.length - 3}
                </div>
              )}
            </div>
          )
        })()}

        {project.dueDate && (
          <div className="flex items-center gap-1" style={{ color: 'var(--on-surface-variant)' }}>
            <Calendar className="h-3 w-3" />
            <span className="text-[10px]">{formatDate(project.dueDate)}</span>
          </div>
        )}
      </div>
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

  // suppress unused warning
  void defaultStage

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

      {/* 3-column kanban board */}
      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
        {STAGES.filter(col => col.key !== 'closed').map(col => {
          const colProjects = projectsByStage[col.key]
          return (
            <div key={col.key} className="flex flex-col min-h-0">
              {/* Column header */}
              <div
                className="rounded-xl px-3 py-2.5 mb-4 flex items-center justify-between"
                style={{
                  borderTop: `4px solid ${col.color}`,
                  background: 'var(--surface-container-lowest)',
                  boxShadow: '0 4px 12px rgba(42,52,57,0.04)',
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="font-headline font-extrabold text-sm uppercase tracking-widest"
                    style={{ color: 'var(--on-surface)' }}
                  >
                    {col.label}
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: 'var(--surface-container-high)',
                      color: 'var(--on-surface-variant)',
                    }}
                  >
                    {isLoading ? '…' : colProjects.length}
                  </span>
                </div>
                <button
                  onClick={() => openCreateDialog(col.key)}
                  className="transition-colors"
                  style={{ color: 'var(--on-surface-variant)' }}
                  title={`New project in ${col.label}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5">
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
      <div
        className="mt-4 border-t pt-4"
        style={{ borderColor: 'var(--surface-container-highest, #d9e4ea)' }}
      >
        <button
          onClick={() => setArchiveOpen(prev => !prev)}
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'var(--on-surface-variant)' }}
        >
          <Archive className="h-4 w-4" />
          <span>Archive ({closedProjects.length} closed project{closedProjects.length !== 1 ? 's' : ''})</span>
          {archiveOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {archiveOpen && (
          <div className="mt-3 flex flex-col gap-2">
            {closedProjects.length === 0 ? (
              <p className="text-xs pl-6" style={{ color: 'var(--on-surface-variant)' }}>
                No closed projects.
              </p>
            ) : (
              closedProjects.map(project => (
                <div
                  key={project.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border"
                  style={{
                    background: 'var(--surface-container-lowest)',
                    borderColor: 'rgba(169,180,185,0.2)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {project.department && <DepartmentBadge department={project.department} />}
                    <span
                      className="text-sm truncate cursor-pointer hover:underline transition-colors"
                      style={{ color: 'var(--on-surface-variant)' }}
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      {project.title}
                    </span>
                    {project.dueDate && (
                      <span className="text-xs shrink-0" style={{ color: 'var(--on-surface-variant)' }}>
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
                <div
                  className="min-h-[44px] p-2 rounded-lg border space-y-2"
                  style={{ background: 'var(--surface-container-high)', borderColor: 'var(--border, rgba(169,180,185,0.3))' }}
                >
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
