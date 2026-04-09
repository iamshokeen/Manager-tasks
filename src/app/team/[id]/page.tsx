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
  boxShadow: '0 8px 30px rgb(42,52,57,0.04)',
  borderRadius: '0.75rem',
}

function TabPanel({
  openTasks,
  recentOneOnOnes,
  onNavigate,
}: {
  openTasks: TaskItem[]
  recentOneOnOnes: OneOnOneItem[]
  onNavigate: (path: string) => void
}) {
  const [tab, setTab] = useState<'tasks' | 'oneOnOnes'>('tasks')
  const tabs = [
    { key: 'tasks', label: 'Active Tasks', count: openTasks.length },
    { key: 'oneOnOnes', label: '1:1 History', count: recentOneOnOnes.length },
  ]

  return (
    <div className="col-span-12 lg:col-span-8 rounded-xl overflow-hidden" style={cardStyle}>
      {/* Tab bar */}
      <div className="flex" style={{ borderBottom: '1px solid var(--surface-container)' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className="px-8 py-4 text-sm font-medium transition-colors relative"
            style={{
              color: tab === t.key ? 'var(--primary)' : 'var(--on-surface-variant)',
              borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
              fontWeight: tab === t.key ? 700 : 500,
            }}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className="ml-2 text-[10px] font-bold rounded-full px-1.5 py-0.5"
                style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tasks tab */}
      {tab === 'tasks' && (
        openTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3" style={{ color: 'var(--on-surface-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', opacity: 0.2 }}>task_alt</span>
            <p className="text-sm">No active tasks assigned.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--surface-container)' }}>
            {openTasks.map(task => (
              <button
                key={task.id}
                onClick={() => onNavigate(`/tasks/${task.id}`)}
                className="flex items-center gap-4 px-6 py-4 w-full text-left transition-colors group"
                style={{ background: 'transparent' }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-low)')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
              >
                <div
                  className="w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 group-hover:border-primary transition-colors"
                  style={{ borderColor: 'rgba(169,180,185,0.4)' }}
                />
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
        )
      )}

      {/* 1:1 History tab */}
      {tab === 'oneOnOnes' && (
        recentOneOnOnes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3" style={{ color: 'var(--on-surface-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', opacity: 0.2 }}>forum</span>
            <p className="text-sm">No 1:1 sessions logged yet.</p>
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
                  onClick={() => onNavigate(`/one-on-ones/${oo.id}`)}
                  className="flex items-center gap-4 px-6 py-4 w-full text-left transition-colors"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-low)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>{formatDate(oo.date)}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>
                      {actionCount} action {actionCount === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  {oo.mood && <MoodBadge mood={oo.mood} />}
                </button>
              )
            })}
          </div>
        )
      )}
    </div>
  )
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
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--on-surface-variant)' }}>
        <button onClick={() => router.push('/team')} className="hover:underline" style={{ color: 'var(--on-surface-variant)' }}>Team</button>
        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>chevron_right</span>
        <span style={{ color: 'var(--on-surface)' }}>Member Profile</span>
        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>chevron_right</span>
        <span style={{ color: 'var(--primary)' }}>{m.name}</span>
      </div>

      {/* ── Profile Header (asymmetric bento) ── */}
      <div className="grid grid-cols-12 gap-6">
        {/* Main Identity Card */}
        <div
          className="col-span-12 lg:col-span-8 p-8 rounded-xl relative overflow-hidden"
          style={cardStyle}
        >
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"
            style={{ background: 'rgba(0,83,219,0.05)' }}
          />
          <div className="relative flex flex-col md:flex-row items-start gap-8">
            {/* Avatar */}
            <div className="relative shrink-0">
              <MemberAvatar name={m.name} size="lg" className="border-4 border-white shadow-lg" style={{ height: '8rem', width: '8rem', fontSize: '1.875rem' }} />
              <button
                onClick={() => setEditOpen(true)}
                className="absolute bottom-1 right-1 bg-white p-1.5 rounded-full shadow-md transition-colors"
                style={{ color: 'var(--on-surface-variant)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-low)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'white' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
              </button>
            </div>
            <div className="flex-1 space-y-4 w-full">
              <div className="flex justify-between items-start flex-wrap gap-3">
                <div>
                  <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}>
                    {m.name}
                  </h1>
                  <p className="font-medium mt-1" style={{ color: 'var(--on-surface-variant)' }}>
                    {m.role} • {m.department}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditOpen(true)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    style={{ border: '1px solid rgba(169,180,185,0.3)', color: 'var(--on-surface-variant)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteOpen(true)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all"
                    style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
                  >
                    Promote
                  </button>
                </div>
              </div>
              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4 pt-2">
                {[
                  { label: 'Open Tasks', value: openTasks.length, border: 'var(--primary)' },
                  { label: '1:1s Logged', value: (m.oneOnOnes ?? []).length, border: 'var(--tertiary)' },
                  { label: 'Delegation Lvl', value: `Lvl ${m.delegationLevel}`, border: 'var(--secondary-container)' },
                ].map(stat => (
                  <div
                    key={stat.label}
                    className="p-3 rounded-lg"
                    style={{ background: 'var(--surface-container-low)', borderLeft: `4px solid ${stat.border}` }}
                  >
                    <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--on-surface-variant)' }}>{stat.label}</div>
                    <div className="text-xl font-bold" style={{ color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Delegation Level Sidebar Card */}
        <div className="col-span-12 lg:col-span-4 p-8 rounded-xl flex flex-col justify-between" style={cardStyle}>
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg" style={{ color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}>
                Delegation Level
              </h3>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>info</span>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-bold px-2 py-1 rounded uppercase"
                  style={{ background: 'rgba(0,83,219,0.1)', color: 'var(--primary)' }}
                >
                  Lvl {m.delegationLevel}: {delegLabel}
                </span>
                <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                  {delegDesc}
                </span>
              </div>
              <input
                type="range" min="1" max="4" value={m.delegationLevel} readOnly
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary"
                style={{ background: 'var(--surface-container)' }}
              />
              <div className="flex justify-between text-[10px] text-outline font-bold px-1 uppercase tracking-tighter">
                <span>Task</span>
                <span>Project</span>
                <span>Division</span>
                <span>Strategic</span>
              </div>
            </div>
          </div>
          <button
            className="w-full mt-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors text-sm"
            style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-highest)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-high)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>history_edu</span>
            View Audit Log
          </button>
        </div>
      </div>

      {/* ── Multi-Grid Content ── */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left column: Skills + Coaching */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Skills */}
          <div className="p-6 rounded-xl" style={cardStyle}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}>
                Core Competencies
              </h3>
              <button onClick={() => setEditOpen(true)}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '22px' }}>add_circle</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skillsList.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>No skills listed. Edit profile to add.</p>
              ) : (
                skillsList.map((skill, i) => (
                  <span
                    key={skill}
                    className="px-3 py-1 rounded-full text-xs font-medium cursor-pointer"
                    style={{
                      background: i === 0 ? 'rgba(0,83,219,0.1)' : 'var(--surface-container)',
                      color: i === 0 ? 'var(--primary)' : 'var(--on-surface)',
                      border: i === 0 ? '1px solid rgba(0,83,219,0.2)' : '1px solid rgba(169,180,185,0.2)',
                      fontWeight: i === 0 ? 700 : 500,
                    }}
                  >
                    {skill}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Coaching Notes */}
          <div className="p-6 rounded-xl" style={cardStyle}>
            <h3 className="font-bold mb-4" style={{ color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}>
              Coaching Notes
            </h3>
            {m.coachingNotes && (
              <div
                className="p-4 rounded-r-lg mb-4"
                style={{ background: 'rgba(134,84,0,0.07)', borderLeft: '2px solid var(--tertiary)' }}
              >
                <div className="text-[10px] text-tertiary font-bold uppercase tracking-wider mb-1">
                  Current Note
                </div>
                <p className="text-sm italic leading-snug whitespace-pre-wrap" style={{ color: 'var(--on-surface)' }}>
                  &quot;{m.coachingNotes}&quot;
                </p>
              </div>
            )}
            <textarea
              className="w-full resize-none rounded-lg p-3 text-sm focus:outline-none focus:ring-2"
              style={{
                background: 'var(--surface)',
                border: '1px solid rgba(169,180,185,0.3)',
                color: 'var(--on-surface)',
              }}
              placeholder="Add a new private coaching note..."
              rows={4}
            />
            <div className="flex justify-end mt-2">
              <button
                className="text-xs font-bold hover:underline"
                style={{ color: 'var(--primary)' }}
                onClick={() => setEditOpen(true)}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Tabbed Tasks + 1:1s */}
        <TabPanel
          openTasks={openTasks}
          recentOneOnOnes={recentOneOnOnes}
          onNavigate={router.push}
        />
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
