'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit2, Trash2, ClipboardList, MessageSquare, Calendar, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

import { useTeamMember } from '@/hooks/use-team'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { DepartmentBadge } from '@/components/ui/department-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
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

import { cn, DEPARTMENTS, DELEGATION_LEVELS, formatDate } from '@/lib/utils'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const

// Delegation level descriptions
const DELEGATION_DESCRIPTIONS: Record<number, string> = {
  1: 'You decide and do',
  2: 'They research, you decide',
  3: 'They decide, you approve',
  4: 'They own it completely',
}

// Mood badge config
const MOOD_CONFIG: Record<string, { label: string; className: string }> = {
  great: { label: 'Great', className: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' },
  good: { label: 'Good', className: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20' },
  neutral: { label: 'Neutral', className: 'bg-[#1E2028] text-[#6B7280] border-[#6B7280]/20' },
  concerned: { label: 'Concerned', className: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20' },
  tough: { label: 'Tough', className: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20' },
  difficult: { label: 'Difficult', className: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20' },
  bad: { label: 'Bad', className: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20' },
}

function MoodBadge({ mood }: { mood: string }) {
  const config = MOOD_CONFIG[mood] ?? MOOD_CONFIG.neutral
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', config.className)}>
      {config.label}
    </span>
  )
}

interface TaskItem {
  id: string
  title: string
  priority: string
  dueDate?: string | null
  status?: string
}

interface OneOnOneItem {
  id: string
  date: string
  mood?: string | null
  actionItems?: unknown[]
  actionItemsCount?: number
}

interface MemberDetail {
  id: string
  name: string
  role: string
  department: string
  status: string
  delegationLevel: number
  skills?: string | null
  oneOnOneDay?: string | null
  oneOnOneTime?: string | null
  coachingNotes?: string | null
  tasks?: TaskItem[]
  oneOnOnes?: OneOnOneItem[]
}

interface EditMemberForm {
  name: string
  role: string
  department: string
  status: string
  delegationLevel: string
  skills: string
  oneOnOneDay: string
  oneOnOneTime: string
  coachingNotes: string
}

const EMPTY_EDIT_FORM: EditMemberForm = {
  name: '',
  role: '',
  department: '',
  status: 'active',
  delegationLevel: '1',
  skills: '',
  oneOnOneDay: '',
  oneOnOneTime: '',
  coachingNotes: '',
}

export default function TeamMemberPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { member, mutate, isLoading } = useTeamMember(id)

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<EditMemberForm>(EMPTY_EDIT_FORM)
  const [submitting, setSubmitting] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Populate edit form when member data loads
  useEffect(() => {
    if (member) {
      const m = member as MemberDetail
      setEditForm({
        name: m.name ?? '',
        role: m.role ?? '',
        department: m.department ?? '',
        status: m.status ?? 'active',
        delegationLevel: String(m.delegationLevel ?? 1),
        skills: m.skills ?? '',
        oneOnOneDay: m.oneOnOneDay ?? '',
        oneOnOneTime: m.oneOnOneTime ?? '',
        coachingNotes: m.coachingNotes ?? '',
      })
    }
  }, [member])

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editForm.name.trim() || !editForm.role.trim()) {
      toast.error('Name and role are required')
      return
    }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        name: editForm.name.trim(),
        role: editForm.role.trim(),
        department: editForm.department,
        status: editForm.status,
        delegationLevel: parseInt(editForm.delegationLevel, 10) || 1,
        skills: editForm.skills.trim() || null,
        oneOnOneDay: editForm.oneOnOneDay || null,
        oneOnOneTime: editForm.oneOnOneTime.trim() || null,
        coachingNotes: editForm.coachingNotes.trim() || null,
      }
      const res = await fetch(`/api/team/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to update member')
      await mutate()
      setEditOpen(false)
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/team/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Team member removed')
      router.push('/team')
    } catch {
      toast.error('Failed to delete team member')
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-6 w-32 animate-pulse bg-card rounded" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1 flex flex-col gap-4">
            <div className="h-48 animate-pulse bg-card rounded-lg" />
            <div className="h-32 animate-pulse bg-card rounded-lg" />
            <div className="h-24 animate-pulse bg-card rounded-lg" />
          </div>
          <div className="col-span-2 flex flex-col gap-4">
            <div className="h-64 animate-pulse bg-card rounded-lg" />
            <div className="h-48 animate-pulse bg-card rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">Team member not found</div>
        <Button variant="ghost" onClick={() => router.push('/team')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Team
        </Button>
      </div>
    )
  }

  const m = member as MemberDetail
  const delegLabel = DELEGATION_LEVELS[m.delegationLevel as keyof typeof DELEGATION_LEVELS] ?? 'Do'
  const delegDesc = DELEGATION_DESCRIPTIONS[m.delegationLevel] ?? ''
  const openTasks = (m.tasks ?? []).filter(t => t.status !== 'done')
  const recentOneOnOnes = (m.oneOnOnes ?? []).slice(0, 5)
  const skillsList = m.skills
    ? m.skills.split(',').map(s => s.trim()).filter(Boolean)
    : []

  return (
    <div className="flex flex-col">
      {/* Back nav */}
      <button
        onClick={() => router.push('/team')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Team
      </button>

      <div className="grid grid-cols-3 gap-6">
        {/* ── Left column ── */}
        <div className="col-span-1 flex flex-col gap-4">
          {/* Identity card */}
          <div className="bg-card border border-border rounded-lg p-4 flex flex-col items-center text-center gap-3">
            <MemberAvatar name={m.name} size="lg" className="h-16 w-16 text-xl" />
            <div>
              <h1 className="text-base font-semibold text-foreground">{m.name}</h1>
              <p className="text-sm text-muted-foreground">{m.role}</p>
            </div>
            <DepartmentBadge department={m.department} />

            {/* Action buttons */}
            <div className="flex gap-2 mt-1 w-full">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setEditOpen(true)}
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Delegation level card */}
          <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delegation Level</span>
            <p className="text-lg font-semibold text-foreground">
              Level {m.delegationLevel} — {delegLabel}
            </p>
            <p className="text-xs text-muted-foreground">{delegDesc}</p>
          </div>

          {/* 1:1 Schedule */}
          {(m.oneOnOneDay || m.oneOnOneTime) && (
            <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">1:1 Schedule</span>
              <p className="text-sm text-foreground">
                {[m.oneOnOneDay, m.oneOnOneTime].filter(Boolean).join(' ')}
              </p>
            </div>
          )}

          {/* Skills */}
          {skillsList.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Skills</span>
              <div className="flex flex-wrap gap-1.5">
                {skillsList.map(skill => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-border"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Coaching Notes */}
          {m.coachingNotes && (
            <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Coaching Notes</span>
              <p className="text-sm text-foreground whitespace-pre-wrap">{m.coachingNotes}</p>
            </div>
          )}
        </div>

        {/* ── Right column ── */}
        <div className="col-span-2 flex flex-col gap-4">
          {/* Active Tasks */}
          <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Tasks</span>
              <span className="text-xs font-semibold bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                {openTasks.length}
              </span>
            </div>

            {openTasks.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-8 w-8" />}
                title="No open tasks"
                description="This team member has no active tasks."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {openTasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => router.push(`/tasks/${task.id}`)}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:border-ring/40 transition-colors text-left w-full"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <PriorityBadge priority={task.priority} />
                      {task.dueDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(task.dueDate)}</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recent 1:1s */}
          <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent 1:1s</span>
              <span className="text-xs font-semibold bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                {recentOneOnOnes.length}
              </span>
            </div>

            {recentOneOnOnes.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="h-8 w-8" />}
                title="No 1:1s logged yet"
                description="1:1 sessions with this team member will appear here."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {recentOneOnOnes.map(oo => {
                  const actionCount = Array.isArray(oo.actionItems)
                    ? oo.actionItems.length
                    : (oo.actionItemsCount ?? 0)
                  return (
                    <button
                      key={oo.id}
                      onClick={() => router.push(`/one-on-ones/${oo.id}`)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:border-ring/40 transition-colors text-left w-full"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{formatDate(oo.date)}</p>
                        <p className="text-xs text-muted-foreground">
                          {actionCount} action {actionCount === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                      {oo.mood && (
                        <div className="shrink-0">
                          <MoodBadge mood={oo.mood} />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Remove Team Member"
        description={`Remove ${m.name} from the team? This cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleting}
      />

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Name *</label>
              <Input
                placeholder="Full name"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            {/* Role */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Role *</label>
              <Input
                placeholder="Job title or role"
                value={editForm.role}
                onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Department */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Department</label>
                <Select value={editForm.department} onValueChange={(v: string | null) => setEditForm(f => ({ ...f, department: v ?? '' }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={editForm.status} onValueChange={(v: string | null) => setEditForm(f => ({ ...f, status: v ?? 'active' }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="hiring">Hiring</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="exited">Exited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Delegation Level */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Delegation Level</label>
              <Select value={editForm.delegationLevel} onValueChange={(v: string | null) => setEditForm(f => ({ ...f, delegationLevel: v ?? '1' }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 — Do</SelectItem>
                  <SelectItem value="2">2 — Research</SelectItem>
                  <SelectItem value="3">3 — Decide</SelectItem>
                  <SelectItem value="4">4 — Own</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Skills */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Skills</label>
              <Textarea
                placeholder="e.g. SQL, Python, Excel (comma-separated)"
                rows={2}
                value={editForm.skills}
                onChange={e => setEditForm(f => ({ ...f, skills: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* 1:1 Day */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">1:1 Day</label>
                <Select value={editForm.oneOnOneDay} onValueChange={(v: string | null) => setEditForm(f => ({ ...f, oneOnOneDay: v ?? '' }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 1:1 Time */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">1:1 Time</label>
                <Input
                  placeholder="10:00 AM"
                  value={editForm.oneOnOneTime}
                  onChange={e => setEditForm(f => ({ ...f, oneOnOneTime: e.target.value }))}
                />
              </div>
            </div>

            {/* Coaching Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Coaching Notes</label>
              <Textarea
                placeholder="Private notes about this team member…"
                rows={3}
                value={editForm.coachingNotes}
                onChange={e => setEditForm(f => ({ ...f, coachingNotes: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
