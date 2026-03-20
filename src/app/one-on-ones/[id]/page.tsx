'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, AlertCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { useOneOnOne } from '@/hooks/use-one-on-ones'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

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

interface ActionItem {
  id: string
  action: string
  owner?: string | null
  dueDate?: string | null
  completed: boolean
}

interface OneOnOneDetail {
  id: string
  date: string
  mood: string
  theirUpdates?: string | null
  myUpdates?: string | null
  feedbackGiven?: string | null
  developmentNotes?: string | null
  member: { id: string; name: string }
  actionItems: ActionItem[]
}

interface EditableSectionProps {
  label: string
  value: string
  onSave: (val: string) => Promise<void>
}

function EditableSection({ label, value, onSave }: EditableSectionProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  async function handleBlur() {
    setEditing(false)
    if (draft === value) return
    await onSave(draft)
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <Textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={handleBlur}
          rows={4}
          autoFocus
          placeholder={`Add ${label.toLowerCase()}…`}
        />
      ) : (
        <p
          onClick={() => setEditing(true)}
          className="text-sm text-foreground cursor-text min-h-[40px] whitespace-pre-wrap"
        >
          {value || <span className="text-muted-foreground">None — click to add</span>}
        </p>
      )}
    </div>
  )
}

export default function OneOnOneDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { oneOnOne, mutate, isLoading } = useOneOnOne(id)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [togglingAction, setTogglingAction] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    )
  }

  if (!oneOnOne) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">1:1 not found</div>
        <Button variant="ghost" onClick={() => router.push('/one-on-ones')}>
          <ArrowLeft className="h-4 w-4" />
          Back to One-on-Ones
        </Button>
      </div>
    )
  }

  const record = oneOnOne as OneOnOneDetail
  const completedCount = record.actionItems.filter(a => a.completed).length
  const totalCount = record.actionItems.length

  async function patchField(field: string, value: string) {
    try {
      const res = await fetch(`/api/one-on-ones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) throw new Error()
      await mutate()
      toast.success('Updated')
    } catch {
      toast.error('Failed to update')
    }
  }

  async function handleToggleAction(actionId: string, completed: boolean) {
    setTogglingAction(actionId)
    try {
      const res = await fetch(`/api/one-on-ones/${id}/actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      })
      if (!res.ok) throw new Error()
      await mutate()
    } catch {
      toast.error('Failed to update action item')
    } finally {
      setTogglingAction(null)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/one-on-ones/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('1:1 deleted')
      router.push('/one-on-ones')
    } catch {
      toast.error('Failed to delete')
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Back nav */}
      <button
        onClick={() => router.push('/one-on-ones')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to One-on-Ones
      </button>

      {/* Header card */}
      <div className="bg-card border border-border rounded-lg p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MemberAvatar name={record.member?.name ?? '?'} size="lg" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">{record.member?.name ?? 'Unknown'}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-muted-foreground">{formatDate(record.date)}</span>
              <MoodBadge mood={record.mood} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          <EditableSection
            label="Their Updates"
            value={record.theirUpdates ?? ''}
            onSave={val => patchField('theirUpdates', val)}
          />
          <EditableSection
            label="My Updates / Coaching Points"
            value={record.myUpdates ?? ''}
            onSave={val => patchField('myUpdates', val)}
          />
          <EditableSection
            label="Feedback Given (SBI)"
            value={record.feedbackGiven ?? ''}
            onSave={val => patchField('feedbackGiven', val)}
          />
          <EditableSection
            label="Development Notes"
            value={record.developmentNotes ?? ''}
            onSave={val => patchField('developmentNotes', val)}
          />
        </div>

        {/* Right column — Action Items */}
        <div className="bg-card border border-border rounded-lg p-4 h-fit">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Action Items
            </span>
            {totalCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {completedCount}/{totalCount} completed
              </span>
            )}
          </div>

          {record.actionItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No action items recorded.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {record.actionItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 py-2 border-b border-border last:border-0"
                >
                  <button
                    onClick={() => handleToggleAction(item.id, !item.completed)}
                    disabled={togglingAction === item.id}
                    className={cn(
                      'mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors',
                      item.completed
                        ? 'bg-[#10B981] border-[#10B981]'
                        : 'border-border hover:border-ring'
                    )}
                  >
                    {item.completed && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm',
                      item.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                    )}>
                      {item.action}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {item.owner && (
                        <span className={cn(
                          'text-xs',
                          item.completed ? 'text-muted-foreground/60' : 'text-muted-foreground'
                        )}>
                          Owner: {item.owner}
                        </span>
                      )}
                      {item.dueDate && (
                        <span className={cn(
                          'text-xs',
                          item.completed ? 'text-muted-foreground/60' : 'text-muted-foreground'
                        )}>
                          Due: {formatDate(item.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete 1:1 Record"
        description="This action cannot be undone. The 1:1 record and all its action items will be permanently deleted."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
