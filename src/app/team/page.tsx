'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, ChevronRight, Search } from 'lucide-react'
import { toast } from 'sonner'

import { useTeam } from '@/hooks/use-team'
import { useDepartments } from '@/hooks/use-departments'
import { PageHeader } from '@/components/ui/page-header'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { DepartmentBadge } from '@/components/ui/department-badge'
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

import { cn, DELEGATION_LEVELS } from '@/lib/utils'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const

const MEMBER_STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  active:   { label: 'Active',   bg: 'var(--primary-container)',  color: 'var(--on-primary-container)' },
  hiring:   { label: 'Hiring',   bg: 'var(--tertiary-container)', color: 'var(--on-tertiary-container)' },
  inactive: { label: 'Inactive', bg: 'var(--surface-container)',  color: 'var(--on-surface-variant)' },
  on_leave: { label: 'On Leave', bg: 'var(--secondary-container)',color: 'var(--on-secondary-container)' },
  exited:   { label: 'Exited',   bg: 'var(--error-container)',    color: 'var(--on-error-container)' },
}

interface MemberSummary {
  id: string
  name: string
  role: string
  department: string
  status: string
  delegationLevel: number
  oneOnOneDay?: string | null
  oneOnOneTime?: string | null
  taskCount?: number
}

interface AddMemberForm {
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

const EMPTY_FORM: AddMemberForm = {
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

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg: 'rgba(16,185,129,0.1)',  color: '#059669', label: 'Active'   },
  hiring:   { bg: 'rgba(248,160,16,0.15)', color: '#865400', label: 'Hiring'   },
  inactive: { bg: 'rgba(169,180,185,0.2)', color: 'var(--outline)', label: 'Inactive' },
  on_leave: { bg: 'rgba(213,227,252,0.4)', color: 'var(--secondary)', label: 'On Leave' },
  exited:   { bg: 'rgba(159,64,61,0.1)',   color: 'var(--error)', label: 'Exited'   },
}

function MemberStatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.inactive
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

function DelegationDots({ level }: { level: number }) {
  const MAX = 5
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: MAX }).map((_, i) => (
        <div
          key={i}
          className="w-2.5 h-1.5 rounded-sm"
          style={{ background: i < level ? 'var(--primary)' : 'rgba(169,180,185,0.3)' }}
        />
      ))}
    </div>
  )
}

function MemberCard({ member, onClick }: { member: MemberSummary; onClick: () => void }) {
  const oneOnOne = member.oneOnOneDay
    ? `${member.oneOnOneDay}${member.oneOnOneTime ? ` @ ${member.oneOnOneTime}` : ''}`
    : null

  return (
    <div
      onClick={onClick}
      className="rounded-xl p-5 flex flex-col gap-4 cursor-pointer group transition-all"
      style={{
        background: 'var(--surface-container-lowest)',
        border: '1px solid rgba(169,180,185,0.05)',
        boxShadow: '0 8px 30px rgb(42,52,57,0.04)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,83,219,0.03)'
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,83,219,0.08)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-container-lowest)'
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(169,180,185,0.05)'
      }}
    >
      {/* Top: avatar + name/role + status */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <MemberAvatar name={member.name} size="lg" className="border-2 border-surface shadow-sm" />
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-bold truncate leading-tight"
              style={{ color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}
            >
              {member.name}
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>
              {member.role}
            </p>
          </div>
        </div>
        <MemberStatusBadge status={member.status} />
      </div>

      {/* Department */}
      <div>
        <DepartmentBadge department={member.department} />
      </div>

      {/* Delegation + 1:1 */}
      <div className="flex flex-col gap-3 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-tight" style={{ color: 'var(--outline)' }}>Delegation</span>
          <DelegationDots level={member.delegationLevel} />
        </div>
        {oneOnOne && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-tight" style={{ color: 'var(--outline)' }}>1:1 Session</span>
            <span className="text-[11px] font-semibold" style={{ color: 'var(--on-surface-variant)' }}>{oneOnOne}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="mt-auto pt-3 flex items-center justify-between"
        style={{ borderTop: '1px solid rgba(169,180,185,0.1)' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--tertiary)' }}>task_alt</span>
          <span className="text-xs font-bold" style={{ color: 'var(--on-surface)' }}>
            {member.taskCount ?? 0}
            <span className="font-normal" style={{ color: 'var(--outline)' }}> Open Tasks</span>
          </span>
        </div>
        <button
          className="p-1.5 rounded-lg transition-all"
          style={{ color: 'var(--outline)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)'
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,83,219,0.05)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--outline)'
            ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          }}
          onClick={e => e.stopPropagation()}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>more_horiz</span>
        </button>
      </div>
    </div>
  )
}

export default function TeamPage() {
  const router = useRouter()
  const { members, mutate, isLoading } = useTeam()
  const { departments } = useDepartments()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<AddMemberForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = (members as MemberSummary[]).filter(m =>
    !search ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase()) ||
    m.department.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.role.trim()) {
      toast.error('Name and role are required')
      return
    }
    if (!form.department) {
      toast.error('Department is required')
      return
    }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        role: form.role.trim(),
        department: form.department,
        status: form.status || 'active',
        delegationLevel: parseInt(form.delegationLevel, 10) || 1,
      }
      if (form.skills.trim()) body.skills = form.skills.trim()
      if (form.oneOnOneDay) body.oneOnOneDay = form.oneOnOneDay
      if (form.oneOnOneTime.trim()) body.oneOnOneTime = form.oneOnOneTime.trim()
      if (form.coachingNotes.trim()) body.coachingNotes = form.coachingNotes.trim()

      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to create member')
      await mutate()
      setDialogOpen(false)
      setForm(EMPTY_FORM)
      toast.success('Team member added')
    } catch {
      toast.error('Failed to add team member')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2
            className="text-4xl font-extrabold tracking-tight mb-2"
            style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' }}
          >
            Team Roster
          </h2>
          <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
            Manage your team members, delegation levels, and 1:1 schedules.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
          style={{ background: 'linear-gradient(135deg, var(--primary), #0048c1)', color: 'var(--on-primary)' }}
        >
          <Plus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      {/* Filter / Search bar */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl"
        style={{ background: 'var(--surface-container-low)', border: '1px solid rgba(169,180,185,0.1)' }}
      >
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1 max-w-xs"
          style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(113,124,130,0.2)' }}
        >
          <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--on-surface-variant)' }} />
          <input
            className="bg-transparent border-none focus:outline-none text-sm w-full"
            style={{ color: 'var(--on-surface)' }}
            placeholder="Quick search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {!isLoading && (
          <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>info</span>
            Total Members: {filtered.length}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl p-5 h-52 animate-pulse"
              style={{ background: 'var(--surface-container-lowest)', boxShadow: 'var(--shadow-card)' }}
            />
          ))}
        </div>
      ) : filtered.length === 0 && (members as MemberSummary[]).length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="Nobody on your team yet."
          description="Add the first person. Build the roster."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add to Your People
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: 'var(--surface-container-lowest)', boxShadow: 'var(--shadow-card)' }}
        >
          <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
            No members match &ldquo;{search}&rdquo;
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map(member => (
            <MemberCard
              key={member.id}
              member={member}
              onClick={() => router.push(`/team/${member.id}`)}
            />
          ))}
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          style={{ background: 'var(--surface-container-lowest)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Add to Your People</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Name *</label>
              <Input
                placeholder="Full name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            {/* Role */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Role *</label>
              <Input
                placeholder="Job title or role"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Department */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Department *</label>
                <Select value={form.department} onValueChange={(v: string | null) => setForm(f => ({ ...f, department: v ?? '' }))}>
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

              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Status</label>
                <Select value={form.status} onValueChange={(v: string | null) => setForm(f => ({ ...f, status: v ?? 'active' }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="hiring">Hiring</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Delegation Level */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Delegation Level</label>
              <Select value={form.delegationLevel} onValueChange={(v: string | null) => setForm(f => ({ ...f, delegationLevel: v ?? '1' }))}>
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
                value={form.skills}
                onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* 1:1 Day */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>1:1 Day</label>
                <Select value={form.oneOnOneDay} onValueChange={(v: string | null) => setForm(f => ({ ...f, oneOnOneDay: v ?? '' }))}>
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
                  value={form.oneOnOneTime}
                  onChange={e => setForm(f => ({ ...f, oneOnOneTime: e.target.value }))}
                />
              </div>
            </div>

            {/* Coaching Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Coaching Notes</label>
              <Textarea
                placeholder="Private notes about this team member…"
                rows={3}
                value={form.coachingNotes}
                onChange={e => setForm(f => ({ ...f, coachingNotes: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setDialogOpen(false); setForm(EMPTY_FORM) }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Adding…' : 'Add to Your People'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
