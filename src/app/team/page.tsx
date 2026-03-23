'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

import { useTeam } from '@/hooks/use-team'
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

import { cn, DEPARTMENTS, DELEGATION_LEVELS } from '@/lib/utils'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const

const MEMBER_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' },
  hiring: { label: 'Hiring', className: 'bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/20' },
  inactive: { label: 'Inactive', className: 'bg-[var(--surface-container-low)] text-[var(--outline)] border-transparent' },
  on_leave: { label: 'On Leave', className: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20' },
  exited: { label: 'Exited', className: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20' },
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

function MemberStatusBadge({ status }: { status: string }) {
  const config = MEMBER_STATUS_CONFIG[status] ?? MEMBER_STATUS_CONFIG.inactive
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', config.className)}>
      {config.label}
    </span>
  )
}

function MemberCard({ member, onClick }: { member: MemberSummary; onClick: () => void }) {
  const delegLabel = DELEGATION_LEVELS[member.delegationLevel as keyof typeof DELEGATION_LEVELS] ?? 'Do'
  const oneOnOne = member.oneOnOneDay
    ? `${member.oneOnOneDay}${member.oneOnOneTime ? ` ${member.oneOnOneTime}` : ''}`
    : null

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl p-5 shadow-[0_20px_40px_rgba(0,74,198,0.06)] hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col gap-3"
    >
      {/* Top: avatar + name/role */}
      <div className="flex items-center gap-3">
        <MemberAvatar name={member.name} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {member.name}
          </p>
          <p className="text-xs text-[var(--outline)] truncate">{member.role}</p>
        </div>
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-2 flex-wrap">
        <DepartmentBadge department={member.department} />
        <MemberStatusBadge status={member.status} />
      </div>

      {/* Divider */}
      <div className="h-px bg-[var(--surface-container-low)]" />

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-[var(--outline)]">
        <div>
          <span className="text-foreground font-medium">Delegation:</span>{' '}
          {delegLabel}
        </div>
        <div>
          <span className="text-foreground font-medium">Tasks:</span>{' '}
          {member.taskCount ?? 0}
        </div>
      </div>

      {/* 1:1 */}
      {oneOnOne && (
        <div className="text-xs text-[var(--outline)]">
          <span className="text-foreground font-medium">1:1:</span> {oneOnOne}
        </div>
      )}

      {/* View profile link */}
      <div className="flex items-center gap-1 text-xs text-primary mt-auto pt-1">
        <span>View Profile</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </div>
  )
}

export default function TeamPage() {
  const router = useRouter()
  const { members, mutate, isLoading } = useTeam()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<AddMemberForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

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
    <div className="flex flex-col">
      <PageHeader
        title="Team"
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Member
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 h-48 animate-pulse shadow-[0_20px_40px_rgba(0,74,198,0.06)]" />
          ))}
        </div>
      ) : (members as MemberSummary[]).length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No team members yet"
          description="Add your first team member to get started."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Member
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(members as MemberSummary[]).map(member => (
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
        <DialogContent className="bg-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Name *</label>
              <Input
                placeholder="Full name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            {/* Role */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Role *</label>
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
                <label className="text-xs font-medium text-muted-foreground">Department *</label>
                <Select value={form.department} onValueChange={(v: string | null) => setForm(f => ({ ...f, department: v ?? '' }))}>
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
              <label className="text-xs font-medium text-muted-foreground">Delegation Level</label>
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
              <label className="text-xs font-medium text-muted-foreground">Skills</label>
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
                <label className="text-xs font-medium text-muted-foreground">1:1 Day</label>
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
                <label className="text-xs font-medium text-muted-foreground">1:1 Time</label>
                <Input
                  placeholder="10:00 AM"
                  value={form.oneOnOneTime}
                  onChange={e => setForm(f => ({ ...f, oneOnOneTime: e.target.value }))}
                />
              </div>
            </div>

            {/* Coaching Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Coaching Notes</label>
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
                {submitting ? 'Adding…' : 'Add Member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
