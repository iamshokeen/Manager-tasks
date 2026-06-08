'use client'

import { useEffect, useState } from 'react'
import { X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useTeam } from '@/hooks/use-team'
import { useStakeholders } from '@/hooks/use-stakeholders'
import { useDepartments } from '@/hooks/use-departments'

type Stage = 'planning' | 'active' | 'review' | 'closed'

const STAGES: Array<{ key: Stage; label: string }> = [
  { key: 'planning', label: 'Planning' },
  { key: 'active', label: 'Active' },
  { key: 'review', label: 'Review' },
  { key: 'closed', label: 'Closed' },
]

interface ProjectFormState {
  title: string
  description: string
  stage: Stage
  department: string
  ownerId: string
  stakeholderIds: string[]
  dueDate: string
}

interface ProjectFormPanelProps {
  open: boolean
  onClose: () => void
  /** When provided, the panel is in edit mode and PATCHes /api/projects/[id]. */
  projectId?: string
  /** Initial values (for edit mode, or to pre-fill create). */
  initial?: Partial<ProjectFormState>
  /** Called after successful create/update with the response payload (if any). */
  onSaved: () => void
}

const EMPTY: ProjectFormState = {
  title: '',
  description: '',
  stage: 'planning',
  department: '',
  ownerId: '',
  stakeholderIds: [],
  dueDate: '',
}

function mergeInitial(initial?: Partial<ProjectFormState>): ProjectFormState {
  return { ...EMPTY, ...(initial ?? {}) }
}

export function ProjectFormPanel({
  open,
  onClose,
  projectId,
  initial,
  onSaved,
}: ProjectFormPanelProps) {
  const isEdit = !!projectId
  const [form, setForm] = useState<ProjectFormState>(() => mergeInitial(initial))
  const [submitting, setSubmitting] = useState(false)

  const currentUser = useCurrentUser()
  const { members } = useTeam()
  const { stakeholders } = useStakeholders()
  const { departments } = useDepartments()

  // Reset form whenever the panel opens (or initial swaps in for edit mode).
  useEffect(() => {
    if (open) setForm(mergeInitial(initial))
  }, [open, initial])

  function toggleStakeholder(id: string) {
    setForm(f => ({
      ...f,
      stakeholderIds: f.stakeholderIds.includes(id)
        ? f.stakeholderIds.filter(s => s !== id)
        : [...f.stakeholderIds, id],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
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

      const url = isEdit ? `/api/projects/${projectId}` : '/api/projects'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(isEdit ? 'Project updated' : 'Project created')
      onSaved()
      onClose()
    } catch {
      toast.error(isEdit ? 'Failed to update project' : 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const memberList = members as Array<{ id: string; name: string }>
  const stkList = stakeholders as Array<{ id: string; name: string }>
  const selectedStakeholders = stkList.filter(s => form.stakeholderIds.includes(s.id))
  const availableStakeholders = stkList.filter(s => !form.stakeholderIds.includes(s.id))

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-[540px] bg-[var(--surface-container)] border-l border-border shadow-2xl">
        {/* Header */}
        <div className="px-7 py-6 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-serif text-xl text-foreground">
                {isEdit ? 'Edit Project' : 'Start a Project'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEdit
                  ? 'Update project details and ownership'
                  : 'Define scope, assign an owner, set a deadline'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5">
            {/* Creating-as banner (create only) */}
            {!isEdit && currentUser && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-primary/5 border border-primary/15 text-sm">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-muted-foreground">Creating as</span>
                <span className="font-medium text-foreground">{currentUser.name}</span>
                <span className="ml-auto text-[10px] text-muted-foreground/60 uppercase tracking-wider">auto</span>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Project Title <span className="text-primary">*</span>
              </label>
              <Input
                placeholder="What's the project?"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="h-12 text-base"
                required
              />
            </div>

            {/* Description (rich text) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Description
              </label>
              <RichTextEditor
                content={form.description}
                onChange={html => setForm(f => ({ ...f, description: html }))}
                placeholder="Mandate, scope, success metrics…"
              />
            </div>

            {/* Owner + Stage */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Owner
                </label>
                <Select
                  value={form.ownerId}
                  onValueChange={v => setForm(f => ({ ...f, ownerId: v ?? '' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {!isEdit && <SelectItem value="__self__">— Me —</SelectItem>}
                    {memberList.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Stage
                </label>
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

            {/* Department + Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Department
                </label>
                <Select
                  value={form.department}
                  onValueChange={v => setForm(f => ({ ...f, department: v ?? '' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {(departments as string[]).map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Due Date
                </label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Stakeholders */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Stakeholders
              </label>
              <div className="min-h-[44px] p-2.5 rounded-xl bg-[var(--surface-container-high)] border border-border space-y-2">
                {selectedStakeholders.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStakeholders.map(s => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300"
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-purple-500/20 flex items-center justify-center text-[8px] font-bold">
                          {s.name.charAt(0).toUpperCase()}
                        </span>
                        {s.name}
                        <button
                          type="button"
                          onClick={() => toggleStakeholder(s.id)}
                          className="hover:text-red-400 transition-colors cursor-pointer ml-0.5"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {availableStakeholders.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {availableStakeholders.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleStakeholder(s.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface-container-highest)] border border-dashed border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all cursor-pointer"
                      >
                        <Plus size={9} />
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
                {stkList.length === 0 && (
                  <p className="text-xs text-muted-foreground">No stakeholders in system yet.</p>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">Click names to add or remove stakeholders</p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-7 py-4 border-t border-border flex items-center justify-end gap-3 flex-shrink-0">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="px-6">
              {submitting ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Project')}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
