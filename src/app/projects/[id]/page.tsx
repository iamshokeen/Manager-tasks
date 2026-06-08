'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'

import { useProject } from '@/hooks/use-projects'
import { ProjectDetailView } from '@/components/ui/project-detail-view'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TaskCreatePanel } from '@/components/ui/task-create-panel'
import { ProjectFormPanel } from '@/components/ui/project-form-panel'
import { Button } from '@/components/ui/button'

const STAGE_LABELS: Record<string, string> = {
  planning: 'Planning',
  active: 'Active',
  review: 'Review',
  closed: 'Closed',
}

const STAGE_COLORS: Record<string, string> = {
  planning: '#717c82',
  active: '#0053db',
  review: '#f59e0b',
  closed: '#10b981',
}

type StageKey = 'planning' | 'active' | 'review' | 'closed'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { project, mutate, isLoading } = useProject(id)

  const [editOpen, setEditOpen] = useState(false)
  const [taskPanelOpen, setTaskPanelOpen] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function openEditDialog() {
    if (!project) return
    setEditOpen(true)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete project')
      toast.success('Project deleted')
      router.push('/projects')
    } catch {
      toast.error('Failed to delete project')
      setDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
        Loading…
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Project not found.</p>
        <Link
          href="/projects"
          className="text-sm hover:underline underline-offset-2 transition-colors"
          style={{ color: 'var(--on-surface-variant)' }}
        >
          ← Back to Projects
        </Link>
      </div>
    )
  }

  const stageColor = STAGE_COLORS[project.stage] ?? '#717c82'

  return (
    <div className="flex flex-col gap-6 w-full">

      {/* Stitch-style project header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs font-medium mb-3" style={{ color: 'var(--on-surface-variant)' }}>
            <Link
              href="/projects"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Projects
            </Link>
            <span>/</span>
            <span
              className="font-bold uppercase tracking-widest text-[10px]"
              style={{ color: 'var(--on-surface)' }}
            >
              {project.title}
            </span>
          </nav>

          {/* Title */}
          <h1
            className="font-headline font-extrabold text-3xl tracking-tight mb-2"
            style={{ color: 'var(--on-surface)' }}
          >
            {project.title}
          </h1>

          {/* Stage badge + department */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
              style={{
                background: `${stageColor}18`,
                color: stageColor,
                border: `1px solid ${stageColor}30`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: stageColor }}
              />
              {STAGE_LABELS[project.stage] ?? project.stage}
            </span>
            {project.department && (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{
                  background: 'var(--surface-container)',
                  color: 'var(--on-surface-variant)',
                }}
              >
                {project.department}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTaskPanelOpen(true)}
            className="gap-1.5"
            style={{
              background: 'var(--surface-container-high)',
              borderColor: 'transparent',
            }}
          >
            <Plus className="h-4 w-4" />
            Drop a Task
          </Button>
          <Button
            size="sm"
            onClick={openEditDialog}
            className="gap-1.5"
            style={{
              background: 'var(--primary)',
              color: '#f8f7ff',
              borderColor: 'transparent',
            }}
          >
            Edit Project
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteOpen(true)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main detail view */}
      <ProjectDetailView
        project={project}
        onEdit={openEditDialog}
        onTasksGenerated={() => mutate()}
        onAddTask={() => setTaskPanelOpen(true)}
      />

      {/* Edit Project slide-over panel */}
      <ProjectFormPanel
        open={editOpen}
        onClose={() => setEditOpen(false)}
        projectId={id}
        initial={{
          title: project.title,
          description: project.description ?? '',
          stage: project.stage as StageKey,
          department: project.department ?? '',
          ownerId: project.owner?.id ?? '',
          stakeholderIds: (project as { stakeholders?: Array<{ stakeholder: { id: string } }> }).stakeholders?.map(s => s.stakeholder.id) ?? [],
          dueDate: project.dueDate ? project.dueDate.split('T')[0] : '',
        }}
        onSaved={() => mutate()}
      />

      {/* Task creator — full-featured panel, projectId pre-locked */}
      <TaskCreatePanel
        open={taskPanelOpen}
        onClose={() => setTaskPanelOpen(false)}
        onCreated={() => mutate()}
        lockedProjectId={project.id}
        defaultDepartment={project.department}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Project?"
        description={`"${project.title}" and all its data will be permanently deleted.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
