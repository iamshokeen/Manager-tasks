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
const MOOD_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  great:     { label: 'Great',     bg: 'var(--primary-container)',   color: 'var(--on-primary-container)' },
  good:      { label: 'Good',      bg: 'var(--secondary-container)', color: 'var(--on-secondary-container)' },
  neutral:   { label: 'Neutral',   bg: 'var(--surface-container)',   color: 'var(--on-surface-variant)' },
  concerned: { label: 'Concerned', bg: 'var(--tertiary-container)',  color: 'var(--on-tertiary-container)' },
  tough:     { label: 'Tough',     bg: 'var(--tertiary-container)',  color: 'var(--on-tertiary-container)' },
  difficult: { label: 'Difficult', bg: 'var(--error-container)',     color: 'var(--on-error-container)' },
  bad:       { label: 'Bad',       bg: 'var(--error-container)',     color: 'var(--on-error-container)' },
}

function MoodBadge({ mood }: { mood: string }) {
  const config = MOOD_CONFIG[mood] ?? MOOD_CONFIG.neutral
  return (
    <span
      className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold')}
      style={{ background: config.bg, color: config.color }}
    >
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

const cardStyle: React.CSSProperties = {
  background: 'var(--surface-container-lowest)',
  boxShadow: 'var(--shadow-card)',
  borderRadius: '0.75rem',
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
        <div className="h-6 w-32 animate-pulse rounded" style={{ background: 'var(--surface-container-lowest)' }} />
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 h-56 animate-pulse rounded-xl" style={{ background: 'var(--surface-container-lowest)' }} />
          <div className="col-span-12 lg:col-span-4 h-56 animate-pulse rounded-xl" style={{ background: 'var(--surface-container-lowest)' }} />
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            <div className="h-40 animate-pulse rounded-xl" style={{ background: 'var(--surface-container-lowest)' }} />
            <div className="h-32 animate-pulse rounded-xl" style={{ background: 'var(--surface-container-lowest)' }} />
          </div>
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
            <div className="h-64 animate-pulse rounded-xl" style={{ background: 'var(--surface-container-lowest)' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-8 w-8" style={{ color: 'var(--on-surface-variant)' }} />
        <div className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Team member not found</div>
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
    <div className="flex flex-col gap-6">
      {/* Back nav */}
      <button
        onClick={() => router.push('/team')}
        className="flex items-center gap-1.5 text-sm transition-colors w-fit"
        style={{ color: 'var(--on-surface-variant)' }}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--on-surface)')}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--on-surface-variant)')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Team
      </button>

      {/* ── Profile Header (asymmetric bento) ── */}
      <div className="grid grid-cols-12 gap-6">
        {/* Main Identity Card */}
        <div
          className="col-span-12 lg:col-span-8 p-8 rounded-xl relative overflow-hidden"
          style={cardStyle}
        >
          {/* Decorative blur */}
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"
            style={{ background: 'rgba(0,83,219,0.05)' }}
          />
          <div className="relative flex flex-col md:flex-row items-start gap-8">
            <MemberAvatar name={m.name} size="lg" className="h-24 w-24 text-3xl shrink-0" />
            <div className="flex-1 space-y-4 w-full">
              <div className="flex justify-between items-start flex-wrap gap-3">
                <div>
                  <h1
                    className="text-3xl font-extrabold tracking-tight"
                    style={{ color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}
                  >
                    {m.name}
                  </h1>
                  <p className="font-medium mt-1" style={{ color: 'var(--on-surface-variant)' }}>
                    {m.role} · <span style={{ color: 'var(--on-surface-variant)' }}>{m.department}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div
                  className="p-3 rounded-lg"
                  style={{ background: 'var(--surface-container-low)', borderLeft: '4px solid var(--primary)' }}
                >
                  <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--on-surface-variant)' }}>Open Tasks</div>
                  <div className="text-xl font-bold" style={{ color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}>
                    {openTasks.length}
                  </div>
                </div>
                <div
                  className="p-3 rounded-lg"
                  style={{ background: 'var(--surface-container-low)', borderLeft: '4px solid var(--tertiary)' }}
                >
                  <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--on-surface-variant)' }}>1:1s Logged</div>
                  <div className="text-xl font-bold" style={{ color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}>
                    {(m.oneOnOnes ?? []).length}
                  </div>
                </div>
                <div
                  className="p-3 rounded-lg"
                  style={{ background: 'var(--surface-container-low)', borderLeft: '4px solid var(--secondary-container)' }}
                >
                  <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--on-surface-variant)' }}>Department</div>
                  <div className="text-sm font-bold truncate" style={{ color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}>
                    <DepartmentBadge department={m.department} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delegation Level Sidebar Card */}
        <div
          className="col-span-12 lg:col-span-4 p-8 rounded-xl flex flex-col justify-between"
          style={cardStyle}
        >
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3
                className="font-bold text-lg"
                style={{ color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}
              >
                Delegation Level
              </h3>
            </div>
            <div className="space-y-4">
              <div
                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold"
                style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)' }}
              >
                Lvl {m.delegationLevel}: {delegLabel}
              </div>
              <div className="w-full rounded-full h-2" style={{ background: 'var(--surface-container)' }}>
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${(m.delegationLevel / 4) * 100}%`, background: 'var(--primary)' }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter px-1" style={{ color: 'var(--on-surface-variant)' }}>
                <span>Do</span>
                <span>Research</span>
                <span>Decide</span>
                <span>Own</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
                {delegDesc}
              </p>
            </div>
          </div>
          {(m.oneOnOneDay || m.oneOnOneTime) && (
            <div
              className="mt-6 p-4 rounded-lg"
              style={{ background: 'var(--surface-container-low)' }}
            >
              <div className="text-[10px] uppercase tracking-widest mb-1 font-bold" style={{ color: 'var(--on-surface-variant)' }}>
                1:1 Schedule
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                {[m.oneOnOneDay, m.oneOnOneTime].filter(Boolean).join(' ')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Multi-Grid Content ── */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left column: Skills + Coaching */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Skills */}
          {skillsList.length > 0 && (
            <div className="p-6 rounded-xl" style={cardStyle}>
              <h3
                className="font-bold mb-4"
                style={{ color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}
              >
                Core Competencies
              </h3>
              <div className="flex flex-wrap gap-2">
                {skillsList.map(skill => (
                  <span
                    key={skill}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: 'var(--surface-container)',
                      color: 'var(--on-surface)',
                      border: '1px solid rgba(169,180,185,0.2)',
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Coaching Notes */}
          {m.coachingNotes && (
            <div className="p-6 rounded-xl" style={cardStyle}>
              <h3
                className="font-bold mb-4"
                style={{ color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}
              >
                Coaching Notes
              </h3>
              <div
                className="p-4 rounded-r-lg"
                style={{
                  background: 'rgba(134,84,0,0.05)',
                  borderLeft: '2px solid var(--tertiary)',
                }}
              >
                <p className="text-sm leading-snug whitespace-pre-wrap" style={{ color: 'var(--on-surface)' }}>
                  {m.coachingNotes}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Tasks + 1:1s */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Active Tasks */}
          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--surface-container)' }}
            >
              <h3
                className="font-bold text-base"
                style={{ color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}
              >
                Active Tasks
              </h3>
              <span
                className="text-xs font-semibold rounded-full px-2.5 py-0.5"
                style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}
              >
                {openTasks.length}
              </span>
            </div>

            {openTasks.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<ClipboardList className="h-8 w-8" />}
                  title="No open tasks"
                  description="This team member has no active tasks."
                />
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--surface-container)' }}>
                {openTasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => router.push(`/tasks/${task.id}`)}
                    className="flex items-center gap-4 px-6 py-4 w-full text-left transition-colors"
                    style={{ background: 'transparent' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-low)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--on-surface)' }}>
                        {task.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <PriorityBadge priority={task.priority} />
                      {task.dueDate && (
                        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
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
          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--surface-container)' }}
            >
              <h3
                className="font-bold text-base"
                style={{ color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}
              >
                Recent 1:1s
              </h3>
              <span
                className="text-xs font-semibold rounded-full px-2.5 py-0.5"
                style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}
              >
                {recentOneOnOnes.length}
              </span>
            </div>

            {recentOneOnOnes.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<MessageSquare className="h-8 w-8" />}
                  title="No 1:1s logged yet"
                  description="1:1 sessions with this team member will appear here."
                />
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--surface-container)' }}>
                {recentOneOnOnes.map(oo => {
                  const actionCount = Array.isArray(oo.actionItems)
                    ? oo.actionItems.length
                    : (oo.actionItemsCount ?? 0)
                  return (
                    <button
                      key={oo.id}
                      onClick={() => router.push(`/one-on-ones/${oo.id}`)}
                      className="flex items-center gap-4 px-6 py-4 w-full text-left transition-colors"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-low)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                          {formatDate(oo.date)}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>
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
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          style={{ background: 'var(--surface-container-lowest)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Edit Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Name *</label>
              <Input
                placeholder="Full name"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            {/* Role */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Role *</label>
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
                <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Department</label>
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
                <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Status</label>
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
              <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Delegation Level</label>
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
              <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Skills</label>
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
                <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>1:1 Day</label>
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
                <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>1:1 Time</label>
                <Input
                  placeholder="10:00 AM"
                  value={editForm.oneOnOneTime}
                  onChange={e => setEditForm(f => ({ ...f, oneOnOneTime: e.target.value }))}
                />
              </div>
            </div>

            {/* Coaching Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Coaching Notes</label>
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
