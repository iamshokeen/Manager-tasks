'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Mail, MessageSquare, Clock, Trash2, CheckSquare, Layers } from 'lucide-react'

import { useStakeholder } from '@/hooks/use-stakeholders'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { DepartmentBadge } from '@/components/ui/department-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'

interface TaskItem {
  id: string
  title: string
  priority: string
  status: string
  dueDate?: string | null
}

interface ProjectItem {
  id: string
  title: string
  department?: string | null
  stage: string
}

interface StakeholderDetail {
  id: string
  name: string
  title?: string | null
  priority: string
  frequency?: string | null
  channel?: string | null
  email?: string | null
  context?: string | null
  strategy?: string | null
  tasks?: TaskItem[]
  projects?: ProjectItem[]
}

const STAGE_LABELS: Record<string, string> = {
  planning: 'Planning',
  active: 'Active',
  review: 'Review',
  closed: 'Closed',
}

const STAGE_COLORS: Record<string, string> = {
  planning: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20',
  active: 'bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/20',
  review: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20',
  closed: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20',
}

function formatDate(date: string | null | undefined): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function InlineEditText({
  value,
  placeholder,
  onSave,
}: {
  value: string | null | undefined
  placeholder: string
  onSave: (newValue: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(value ?? '')
  }, [value])

  async function handleBlur() {
    if (draft === (value ?? '')) {
      setEditing(false)
      return
    }
    setSaving(true)
    await onSave(draft)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <textarea
        className="w-full bg-background border border-[#C9A84C]/50 rounded px-2 py-1.5 text-sm text-foreground resize-none focus:outline-none focus:border-[#C9A84C] min-h-[80px]"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleBlur}
        disabled={saving}
        autoFocus
      />
    )
  }

  return (
    <p
      className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors rounded px-1 py-0.5 hover:bg-card min-h-[2rem]"
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      {value || <span className="italic opacity-50">{placeholder}</span>}
    </p>
  )
}

export default function StakeholderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { stakeholder, mutate, isLoading } = useStakeholder(id)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function patchField(field: string, value: string) {
    try {
      const res = await fetch(`/api/stakeholders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) throw new Error('Failed to update')
      await mutate()
      toast.success('Updated')
    } catch {
      toast.error('Failed to update')
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/stakeholders/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Stakeholder deleted')
      router.push('/stakeholders')
    } catch {
      toast.error('Failed to delete')
      setDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        Loading…
      </div>
    )
  }

  if (!stakeholder) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground text-sm">Stakeholder not found.</p>
        <Link href="/stakeholders" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back to Stakeholders</Link>
      </div>
    )
  }

  const sh = stakeholder as StakeholderDetail
  const tasks: TaskItem[] = sh.tasks ?? []
  const projects: ProjectItem[] = sh.projects ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/stakeholders"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Stakeholders
      </Link>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: 40% */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Name / title / priority */}
          <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-xl font-bold text-foreground">{sh.name}</h1>
                {sh.title && <p className="text-sm text-muted-foreground mt-0.5">{sh.title}</p>}
              </div>
              <PriorityBadge priority={sh.priority} />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>

          {/* Contact info */}
          <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Contact Info
            </h2>
            {sh.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${sh.email}`} className="text-[#C9A84C] hover:underline truncate">
                  {sh.email}
                </a>
              </div>
            )}
            {sh.frequency && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">
                  <span className="text-[#6B7280]">Frequency: </span>
                  {sh.frequency}
                </span>
              </div>
            )}
            {sh.channel && (
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">
                  <span className="text-[#6B7280]">Channel: </span>
                  {sh.channel}
                </span>
              </div>
            )}
            {!sh.email && !sh.frequency && !sh.channel && (
              <p className="text-xs text-muted-foreground italic">No contact info recorded.</p>
            )}
          </div>

          {/* Context — inline editable */}
          <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Context
            </h2>
            <InlineEditText
              value={sh.context}
              placeholder="Click to add context…"
              onSave={v => patchField('context', v)}
            />
          </div>

          {/* Strategy — inline editable */}
          <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Relationship Strategy
            </h2>
            <InlineEditText
              value={sh.strategy}
              placeholder="Click to add strategy…"
              onSave={v => patchField('strategy', v)}
            />
          </div>
        </div>

        {/* Right: 60% */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {/* Open Tasks */}
          <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Open Tasks
            </h2>
            {tasks.length === 0 ? (
              <EmptyState
                icon={<CheckSquare className="h-8 w-8" />}
                title="No tasks"
                description="No tasks linked to this stakeholder."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {tasks.map(task => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-[#C9A84C]/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{task.title}</div>
                      {task.dueDate && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Due {formatDate(task.dueDate)}
                        </div>
                      )}
                    </div>
                    <PriorityBadge priority={task.priority} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Projects */}
          <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Projects
            </h2>
            {projects.length === 0 ? (
              <EmptyState
                icon={<Layers className="h-8 w-8" />}
                title="No projects"
                description="No projects linked to this stakeholder."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {projects.map(project => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-[#C9A84C]/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{project.title}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {project.department && (
                        <DepartmentBadge department={project.department} />
                      )}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                          STAGE_COLORS[project.stage] ?? 'bg-card text-muted-foreground border-border'
                        }`}
                      >
                        {STAGE_LABELS[project.stage] ?? project.stage}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Stakeholder?"
        description={`"${sh.name}" and all linked data will be permanently deleted.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
