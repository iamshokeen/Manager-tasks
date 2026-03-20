'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

import { useOneOnOnes } from '@/hooks/use-one-on-ones'
import { useTeam } from '@/hooks/use-team'
import { PageHeader } from '@/components/ui/page-header'
import { MemberAvatar } from '@/components/ui/member-avatar'
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

import { cn, formatDate } from '@/lib/utils'

const MOOD_CONFIG = {
  great: { label: 'Great', color: '#10B981' },
  good: { label: 'Good', color: '#3B82F6' },
  neutral: { label: 'Neutral', color: '#6B7280' },
  tough: { label: 'Tough', color: '#F59E0B' },
  difficult: { label: 'Difficult', color: '#EF4444' },
} as const

type Mood = keyof typeof MOOD_CONFIG

function MoodBadge({ mood }: { mood: string }) {
  const config = MOOD_CONFIG[mood as Mood] ?? MOOD_CONFIG.neutral
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
      style={{
        backgroundColor: `${config.color}1A`,
        color: config.color,
        borderColor: `${config.color}33`,
      }}
    >
      {config.label}
    </span>
  )
}

interface ActionItemInput {
  action: string
  owner: string
  dueDate: string
}

interface LogForm {
  memberId: string
  date: string
  mood: string
  theirUpdates: string
  myUpdates: string
  feedbackGiven: string
  developmentNotes: string
  actionItems: ActionItemInput[]
}

const today = new Date().toISOString().split('T')[0]

const EMPTY_FORM: LogForm = {
  memberId: '',
  date: today,
  mood: 'good',
  theirUpdates: '',
  myUpdates: '',
  feedbackGiven: '',
  developmentNotes: '',
  actionItems: [],
}

interface OneOnOneRecord {
  id: string
  date: string
  mood: string
  member: { id: string; name: string }
  actionItems: Array<{ id: string; completed: boolean }>
}

export default function OneOnOnesPage() {
  const router = useRouter()
  const [memberFilter, setMemberFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<LogForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const { oneOnOnes, mutate, isLoading } = useOneOnOnes(
    memberFilter !== 'all' ? memberFilter : undefined
  )
  const { members } = useTeam()

  const records = (oneOnOnes as OneOnOneRecord[]).slice().sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  function addActionItem() {
    setForm(f => ({
      ...f,
      actionItems: [...f.actionItems, { action: '', owner: '', dueDate: '' }],
    }))
  }

  function removeActionItem(idx: number) {
    setForm(f => ({
      ...f,
      actionItems: f.actionItems.filter((_, i) => i !== idx),
    }))
  }

  function updateActionItem(idx: number, field: keyof ActionItemInput, value: string) {
    setForm(f => ({
      ...f,
      actionItems: f.actionItems.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.memberId) {
      toast.error('Please select a team member')
      return
    }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        memberId: form.memberId,
        date: form.date,
        mood: form.mood,
      }
      if (form.theirUpdates) body.theirUpdates = form.theirUpdates
      if (form.myUpdates) body.myUpdates = form.myUpdates
      if (form.feedbackGiven) body.feedbackGiven = form.feedbackGiven
      if (form.developmentNotes) body.developmentNotes = form.developmentNotes
      const validItems = form.actionItems.filter(a => a.action.trim())
      if (validItems.length > 0) {
        body.actionItems = {
          create: validItems.map(a => ({
            action: a.action.trim(),
            owner: a.owner.trim() || undefined,
            dueDate: a.dueDate || undefined,
          })),
        }
      }

      const res = await fetch('/api/one-on-ones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to log 1:1')
      await mutate()
      setDialogOpen(false)
      setForm(EMPTY_FORM)
      toast.success('1:1 logged')
    } catch {
      toast.error('Failed to log 1:1')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="One-on-Ones"
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Log 1:1
          </Button>
        }
      />

      {/* Member filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap mb-6">
        <button
          onClick={() => setMemberFilter('all')}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            memberFilter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          All
        </button>
        {(members as Array<{ id: string; name: string }>).map(m => (
          <button
            key={m.id}
            onClick={() => setMemberFilter(m.id)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5',
              memberFilter === m.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <MemberAvatar name={m.name} size="sm" />
            {m.name}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
      ) : records.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No 1:1s logged"
          description="Start by logging your first one-on-one."
          action={
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Log 1:1
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {records.map(record => {
            const completed = record.actionItems.filter(a => a.completed).length
            const total = record.actionItems.length
            return (
              <div
                key={record.id}
                onClick={() => router.push(`/one-on-ones/${record.id}`)}
                className="bg-card border border-border rounded-lg px-4 py-3 cursor-pointer hover:border-ring/40 transition-colors flex items-center gap-4"
              >
                <MemberAvatar name={record.member?.name ?? '?'} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">
                      {record.member?.name ?? 'Unknown'}
                    </span>
                    <span className="text-muted-foreground text-xs">—</span>
                    <MoodBadge mood={record.mood} />
                  </div>
                  {total > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {total} action item{total !== 1 ? 's' : ''} ({completed} completed)
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground">{formatDate(record.date)}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Log 1:1 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log 1:1</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Team Member *</label>
                <Select
                  value={form.memberId}
                  onValueChange={v => setForm(f => ({ ...f, memberId: v ?? '' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select member…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(members as Array<{ id: string; name: string }>).map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Mood</label>
              <Select
                value={form.mood}
                onValueChange={v => setForm(f => ({ ...f, mood: v ?? 'good' }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MOOD_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Their Updates</label>
              <Textarea
                placeholder="What did they share…"
                rows={3}
                value={form.theirUpdates}
                onChange={e => setForm(f => ({ ...f, theirUpdates: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">My Updates / Coaching Points</label>
              <Textarea
                placeholder="What did you share or coach on…"
                rows={3}
                value={form.myUpdates}
                onChange={e => setForm(f => ({ ...f, myUpdates: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Feedback Given (SBI)</label>
              <Textarea
                placeholder="Situation, Behavior, Impact…"
                rows={3}
                value={form.feedbackGiven}
                onChange={e => setForm(f => ({ ...f, feedbackGiven: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Development Notes</label>
              <Textarea
                placeholder="Growth areas, career notes…"
                rows={2}
                value={form.developmentNotes}
                onChange={e => setForm(f => ({ ...f, developmentNotes: e.target.value }))}
              />
            </div>

            {/* Action Items */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Action Items</label>
                <Button type="button" size="sm" variant="ghost" onClick={addActionItem}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Action Item
                </Button>
              </div>
              {form.actionItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">No action items yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {form.actionItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <Input
                            placeholder="Action…"
                            value={item.action}
                            onChange={e => updateActionItem(idx, 'action', e.target.value)}
                          />
                        </div>
                        <div className="col-span-1">
                          <Input
                            placeholder="Owner…"
                            value={item.owner}
                            onChange={e => updateActionItem(idx, 'owner', e.target.value)}
                          />
                        </div>
                        <div className="col-span-1">
                          <Input
                            type="date"
                            value={item.dueDate}
                            onChange={e => updateActionItem(idx, 'dueDate', e.target.value)}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeActionItem(idx)}
                        className="text-muted-foreground hover:text-destructive transition-colors mt-2 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                {submitting ? 'Saving…' : 'Log 1:1'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
