'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Layers, Calendar, Archive, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

import { useProjects } from '@/hooks/use-projects'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageHeader } from '@/components/ui/page-header'
import { DepartmentBadge } from '@/components/ui/department-badge'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { ProjectFormPanel } from '@/components/ui/project-form-panel'

import { formatDate } from '@/lib/utils'

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
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelInitial, setPanelInitial] = useState<{ stage: Stage }>({ stage: 'planning' })
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [reopening, setReopening] = useState<string | null>(null)

  const { projects, mutate, isLoading } = useProjects()
  const me = useCurrentUser()
  const canCreateProject = me?.role === 'SUPER_ADMIN' || me?.role === 'MANAGER'

  function openCreatePanel(stage: Stage) {
    if (!canCreateProject) {
      toast.error('Only Super Admin and Manager can create projects')
      return
    }
    setPanelInitial({ stage })
    setPanelOpen(true)
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:flex-1 sm:min-h-0">
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
                {canCreateProject && (
                  <button
                    onClick={() => openCreatePanel(col.key)}
                    className="transition-colors"
                    style={{ color: 'var(--on-surface-variant)' }}
                    title={`New project in ${col.label}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
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

      {/* Create Project slide-over panel */}
      <ProjectFormPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        initial={{ stage: panelInitial.stage }}
        onSaved={() => mutate()}
      />
    </div>
  )
}
