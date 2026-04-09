'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

import { useStakeholders } from '@/hooks/use-stakeholders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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
  name: string; title: string; frequency: string; channel: string
  priority: string; context: string; strategy: string; email: string
}

const EMPTY_FORM: AddStakeholderForm = {
  name: '', title: '', frequency: '', channel: '',
  priority: 'high', context: '', strategy: '', email: '',
}

function priorityConfig(priority: string) {
  switch (priority) {
    case 'critical':
    case 'high':
      return { bg: 'rgba(159,64,61,0.1)', color: 'var(--error)', icon: 'priority_high', label: 'High' }
    case 'medium':
      return { bg: 'rgba(248,160,16,0.15)', color: 'var(--tertiary)', icon: 'adjust', label: 'Med' }
    default:
      return { bg: 'rgba(169,180,185,0.2)', color: 'var(--on-surface-variant)', icon: 'low_priority', label: 'Low' }
  }
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function StakeholdersPage() {
  const { stakeholders, mutate, isLoading } = useStakeholders()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<AddStakeholderForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<AddStakeholderForm>(EMPTY_FORM)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  function openEditDialog(s: StakeholderCard) {
    setEditingId(s.id)
    setEditForm({ name: s.name, title: s.title ?? '', frequency: s.frequency ?? '', channel: s.channel ?? '', priority: s.priority, context: s.context ?? '', strategy: '', email: '' })
    setEditDialogOpen(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { name: form.name.trim(), priority: form.priority }
      if (form.title) body.title = form.title
      if (form.frequency) body.frequency = form.frequency
      if (form.channel) body.channel = form.channel
      if (form.context) body.context = form.context
      if (form.strategy) body.strategy = form.strategy
      if (form.email) body.email = form.email
      const res = await fetch('/api/stakeholders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      await mutate(); setDialogOpen(false); setForm(EMPTY_FORM); toast.success('Stakeholder added')
    } catch { toast.error('Failed to add stakeholder') } finally { setSubmitting(false) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId || !editForm.name.trim()) { toast.error('Name is required'); return }
    setEditSubmitting(true)
    try {
      const body: Record<string, unknown> = { name: editForm.name.trim(), priority: editForm.priority }
      if (editForm.title) body.title = editForm.title
      if (editForm.frequency) body.frequency = editForm.frequency
      if (editForm.channel) body.channel = editForm.channel
      if (editForm.context) body.context = editForm.context
      if (editForm.strategy) body.strategy = editForm.strategy
      if (editForm.email) body.email = editForm.email
      const res = await fetch(`/api/stakeholders/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      await mutate(); setEditDialogOpen(false); setEditingId(null); toast.success('Stakeholder updated')
    } catch { toast.error('Failed to update') } finally { setEditSubmitting(false) }
  }

  const allStakeholders = (stakeholders as StakeholderCard[]) ?? []
  const filtered = allStakeholders.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.title ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const highPriorityCount = allStakeholders.filter(s => s.priority === 'high' || s.priority === 'critical').length
  const filters = ['All Registry', 'Clients', 'Vendors', 'Board Members', 'Regulatory Partners']

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2
            className="text-3xl font-extrabold tracking-tight"
            style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' }}
          >
            Stakeholder Registry
          </h2>
          <p className="mt-2 max-w-md text-sm" style={{ color: 'var(--on-surface-variant)' }}>
            Manage key external relationships, track communication health, and monitor linked deliverables across your ecosystem.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg" style={{ color: 'var(--outline-variant)' }}>search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search stakeholders..."
              className="pl-10 pr-4 py-2 rounded-lg text-sm border-none outline-none focus:ring-2"
              style={{
                background: 'var(--surface-container-low)',
                color: 'var(--on-surface)',
                boxShadow: 'none',
              }}
            />
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(to right, var(--primary), var(--primary-dim))', color: 'var(--on-primary)' }}
          >
            <span className="material-symbols-outlined text-lg">add</span>
            New Stakeholder
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f, i) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
            style={
              (filter === f || (filter === 'all' && i === 0))
                ? { background: 'var(--surface-container-high)', color: 'var(--on-surface)' }
                : { background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)' }
            }
          >
            {f}
          </button>
        ))}
      </div>

      {/* Card Grid */}
      {isLoading ? (
        <div className="text-sm py-20 text-center" style={{ color: 'var(--on-surface-variant)' }}>Loading registry…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: 'var(--on-surface-variant)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.2 }}>groups</span>
          <p className="text-sm">No stakeholders found</p>
          <button
            onClick={() => setDialogOpen(true)}
            className="px-5 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
          >
            Add First Stakeholder
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(s => {
            const pc = priorityConfig(s.priority)
            return (
              <div
                key={s.id}
                className="group rounded-xl p-6 transition-all duration-300 relative overflow-hidden"
                style={{
                  background: 'var(--surface-container-lowest)',
                  boxShadow: '0 2px 8px rgb(42,52,57,0.04)',
                }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 30px rgb(42,52,57,0.06)'
                  ;(e.currentTarget as HTMLDivElement).style.outline = '2px solid rgba(0,83,219,0.1)'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgb(42,52,57,0.04)'
                  ;(e.currentTarget as HTMLDivElement).style.outline = 'none'
                }}
              >
                {/* Edit button */}
                <button
                  onClick={() => openEditDialog(s)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg"
                  style={{ color: 'var(--on-surface-variant)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-low)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>

                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                      style={{
                        background: 'var(--surface-container)',
                        color: 'var(--on-surface-variant)',
                        border: '2px solid var(--surface)',
                        boxShadow: '0 0 0 4px var(--surface-container)',
                      }}
                    >
                      {getInitials(s.name)}
                    </div>
                    <div>
                      <h3
                        className="font-bold text-lg group-hover:transition-colors"
                        style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLHeadingElement).style.color = 'var(--primary)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLHeadingElement).style.color = 'var(--on-surface)' }}
                      >
                        {s.name}
                      </h3>
                      {s.title && (
                        <p className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>{s.title}</p>
                      )}
                      {s.channel && (
                        <p className="text-[11px] font-semibold flex items-center gap-1 mt-0.5" style={{ color: 'var(--secondary)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>corporate_fare</span>
                          {s.channel}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Priority badge */}
                  <span
                    className="px-2 py-1 rounded text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1 shrink-0"
                    style={{ background: pc.bg, color: pc.color }}
                  >
                    <span className="material-symbols-outlined text-xs" style={pc.label !== 'Low' ? { fontVariationSettings: "'FILL' 1" } : {}}>{pc.icon}</span>
                    {pc.label}
                  </span>
                </div>

                {/* Context note */}
                {s.context && (
                  <div className="rounded-lg p-3 mb-4" style={{ background: 'var(--surface-container-low)' }}>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
                      <span className="font-semibold" style={{ color: 'var(--on-surface)' }}>Note: </span>
                      {s.context}
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div
                  className="flex items-center justify-between pt-4"
                  style={{ borderTop: '1px solid var(--surface-container-high)' }}
                >
                  <div className="flex items-center gap-3">
                    {s._count && (
                      <div className="flex items-center gap-1.5" style={{ color: 'var(--on-surface-variant)' }}>
                        <span className="material-symbols-outlined text-lg">assignment</span>
                        <span className="text-xs font-bold">{s._count.tasks} Tasks</span>
                      </div>
                    )}
                    {s.frequency && (
                      <>
                        <div className="w-1 h-1 rounded-full" style={{ background: 'var(--outline-variant)' }} />
                        <div className="text-[11px] font-medium" style={{ color: 'var(--on-surface-variant)' }}>{s.frequency}</div>
                      </>
                    )}
                  </div>
                  <Link
                    href={`/stakeholders/${s.id}`}
                    className="text-xs font-bold flex items-center gap-1 hover:underline"
                    style={{ color: 'var(--primary)' }}
                  >
                    Profile
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer Stats */}
      {allStakeholders.length > 0 && (
        <div
          className="flex justify-between items-center p-6 rounded-xl"
          style={{ background: 'var(--surface-container)' }}
        >
          <div className="flex gap-10">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.1em] mb-1" style={{ color: 'var(--on-surface-variant)' }}>Total Stakeholders</p>
              <p className="text-2xl font-extrabold" style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' }}>{allStakeholders.length}</p>
            </div>
            <div className="h-10 w-px" style={{ background: 'rgba(169,180,185,0.3)' }} />
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.1em] mb-1" style={{ color: 'var(--on-surface-variant)' }}>High Priority</p>
              <p className="text-2xl font-extrabold" style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--error)' }}>{highPriorityCount}</p>
            </div>
            <div className="h-10 w-px" style={{ background: 'rgba(169,180,185,0.3)' }} />
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.1em] mb-1" style={{ color: 'var(--on-surface-variant)' }}>Active Relationships</p>
              <p className="text-2xl font-extrabold" style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--primary)' }}>{allStakeholders.length - highPriorityCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Stakeholder</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Name *</label>
              <Input placeholder="Stakeholder name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Title / Role</label>
                <Input placeholder="e.g. VP of Sales" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Priority</label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v || f.priority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Frequency</label>
                <Input placeholder="e.g. Weekly" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Channel</label>
                <Input placeholder="e.g. Email, Slack" value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Email</label>
              <Input type="email" placeholder="stakeholder@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Context & Notes</label>
              <Textarea placeholder="Background, communication preferences, key concerns…" rows={3} value={form.context} onChange={e => setForm(f => ({ ...f, context: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Adding…' : 'Add Stakeholder'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Stakeholder</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Name *</label>
              <Input placeholder="Stakeholder name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Title / Role</label>
                <Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Priority</label>
                <Select value={editForm.priority} onValueChange={v => setEditForm(f => ({ ...f, priority: v || f.priority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Frequency</label>
                <Input value={editForm.frequency} onChange={e => setEditForm(f => ({ ...f, frequency: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Channel</label>
                <Input value={editForm.channel} onChange={e => setEditForm(f => ({ ...f, channel: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Context & Notes</label>
              <Textarea rows={3} value={editForm.context} onChange={e => setEditForm(f => ({ ...f, context: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)} disabled={editSubmitting}>Cancel</Button>
              <Button type="submit" disabled={editSubmitting}>{editSubmitting ? 'Saving…' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
