'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Users, Pencil } from 'lucide-react'

import { useStakeholders } from '@/hooks/use-stakeholders'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
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

interface StakeholderCard {
  id: string
  name: string
  title?: string | null
  priority: string
  frequency?: string | null
  channel?: string | null
  context?: string | null
  _count?: { tasks: number }
}

interface AddStakeholderForm {
  name: string
  title: string
  frequency: string
  channel: string
  priority: string
  context: string
  strategy: string
  email: string
}

const EMPTY_FORM: AddStakeholderForm = {
  name: '',
  title: '',
  frequency: '',
  channel: '',
  priority: 'high',
  context: '',
  strategy: '',
  email: '',
}

export default function StakeholdersPage() {
  const { stakeholders, mutate, isLoading } = useStakeholders()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<AddStakeholderForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<AddStakeholderForm>(EMPTY_FORM)
  const [editSubmitting, setEditSubmitting] = useState(false)

  function openEditDialog(stakeholder: StakeholderCard) {
    setEditingId(stakeholder.id)
    setEditForm({
      name: stakeholder.name,
      title: stakeholder.title ?? '',
      frequency: stakeholder.frequency ?? '',
      channel: stakeholder.channel ?? '',
      priority: stakeholder.priority,
      context: stakeholder.context ?? '',
      strategy: '',
      email: '',
    })
    setEditDialogOpen(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId || !editForm.name.trim()) {
      toast.error('Name is required')
      return
    }
    setEditSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        name: editForm.name.trim(),
        priority: editForm.priority,
      }
      if (editForm.title) body.title = editForm.title
      if (editForm.frequency) body.frequency = editForm.frequency
      if (editForm.channel) body.channel = editForm.channel
      if (editForm.context) body.context = editForm.context
      if (editForm.strategy) body.strategy = editForm.strategy
      if (editForm.email) body.email = editForm.email

      const res = await fetch(`/api/stakeholders/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to update stakeholder')
      await mutate()
      setEditDialogOpen(false)
      setEditingId(null)
      toast.success('Stakeholder updated')
    } catch {
      toast.error('Failed to update stakeholder')
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        priority: form.priority,
      }
      if (form.title) body.title = form.title
      if (form.frequency) body.frequency = form.frequency
      if (form.channel) body.channel = form.channel
      if (form.context) body.context = form.context
      if (form.strategy) body.strategy = form.strategy
      if (form.email) body.email = form.email

      const res = await fetch('/api/stakeholders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to create stakeholder')
      await mutate()
      setDialogOpen(false)
      setForm(EMPTY_FORM)
      toast.success('Stakeholder added')
    } catch {
      toast.error('Failed to add stakeholder')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="The Table"
        description="Stakeholder map and relationship tracker"
        action={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add to The Table
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          Loading…
        </div>
      ) : (stakeholders as StakeholderCard[]).length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="Nobody at the table yet. Fix that."
          description="Add the people who have a seat. Map the relationships."
          action={
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add to The Table
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(stakeholders as StakeholderCard[]).map(stakeholder => (
            <div key={stakeholder.id} className="relative bg-card border border-border rounded-lg p-4 hover:border-[#C9A84C]/50 transition-colors group">
              <button
                onClick={e => { e.preventDefault(); openEditDialog(stakeholder) }}
                className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Edit stakeholder"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <Link href={`/stakeholders/${stakeholder.id}`} className="block">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-foreground">{stakeholder.name}</div>
                  {stakeholder.title && (
                    <div className="text-xs text-muted-foreground mt-0.5">{stakeholder.title}</div>
                  )}
                </div>
                <PriorityBadge priority={stakeholder.priority} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                {stakeholder.frequency && (
                  <div>
                    <span className="text-[#6B7280]">Frequency: </span>
                    {stakeholder.frequency}
                  </div>
                )}
                {stakeholder.channel && (
                  <div>
                    <span className="text-[#6B7280]">Channel: </span>
                    {stakeholder.channel}
                  </div>
                )}
              </div>
              {stakeholder.context && (
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {stakeholder.context}
                </div>
              )}
              {stakeholder._count && stakeholder._count.tasks > 0 && (
                <div className="mt-3 pt-3 border-t border-border text-xs text-[#F59E0B]">
                  {stakeholder._count.tasks} open task{stakeholder._count.tasks !== 1 ? 's' : ''}
                </div>
              )}
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Add Stakeholder Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Add to The Table</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Name *</label>
              <Input
                placeholder="Stakeholder name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Title / Role</label>
                <Input
                  placeholder="e.g. VP of Sales"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <Select
                  value={form.priority}
                  onValueChange={v => setForm(f => ({ ...f, priority: v ?? 'high' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Frequency</label>
                <Input
                  placeholder="e.g. Weekly"
                  value={form.frequency}
                  onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Channel</label>
                <Input
                  placeholder="e.g. Email, Slack"
                  value={form.channel}
                  onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input
                type="email"
                placeholder="stakeholder@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Context</label>
              <Textarea
                placeholder="Background and context about this stakeholder…"
                rows={2}
                value={form.context}
                onChange={e => setForm(f => ({ ...f, context: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Relationship Strategy</label>
              <Textarea
                placeholder="How to engage and manage this relationship…"
                rows={2}
                value={form.strategy}
                onChange={e => setForm(f => ({ ...f, strategy: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Adding…' : 'Add to The Table'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Stakeholder Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Stakeholder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Name *</label>
              <Input
                placeholder="Stakeholder name"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Title / Role</label>
                <Input
                  placeholder="e.g. VP of Sales"
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <Select
                  value={editForm.priority}
                  onValueChange={v => setEditForm(f => ({ ...f, priority: v ?? 'high' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Frequency</label>
                <Input
                  placeholder="e.g. Weekly"
                  value={editForm.frequency}
                  onChange={e => setEditForm(f => ({ ...f, frequency: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Channel</label>
                <Input
                  placeholder="e.g. Email, Slack"
                  value={editForm.channel}
                  onChange={e => setEditForm(f => ({ ...f, channel: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input
                type="email"
                placeholder="stakeholder@example.com"
                value={editForm.email}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Context</label>
              <Textarea
                placeholder="Background and context about this stakeholder…"
                rows={2}
                value={editForm.context}
                onChange={e => setEditForm(f => ({ ...f, context: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Relationship Strategy</label>
              <Textarea
                placeholder="How to engage and manage this relationship…"
                rows={2}
                value={editForm.strategy}
                onChange={e => setEditForm(f => ({ ...f, strategy: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)} disabled={editSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={editSubmitting}>
                {editSubmitting ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
