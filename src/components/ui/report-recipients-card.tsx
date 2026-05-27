'use client'

// Report Recipients settings panel.
//
// Lists every visible team member with editable inputs for where their
// daily brief should be sent (email + phone) and a per-recipient schedule
// (off / daily / weekly + HH:MM IST + weekday for weekly). Pre-filled
// from User.email and User.phone if no override has been set yet.

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Mail, MessageSquare, Save, Loader2, RefreshCw } from 'lucide-react'

interface RecipientRow {
  userId: string
  name: string
  email: string
  phone: string | null
  reportEmail: string | null
  reportPhone: string | null
  reportSchedule: string
  reportHourIst: number
  reportMinuteIst: number
  reportWeekday: number
  reportChannels: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data as RecipientRow[])

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function ReportRecipientsCard() {
  const { data, isLoading, mutate } = useSWR<RecipientRow[]>('/api/reports/recipients', fetcher)
  const [draft, setDraft] = useState<Record<string, Partial<RecipientRow>>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  // Wipe drafts when fresh data comes in.
  useEffect(() => { setDraft({}) }, [data?.length])

  function update<K extends keyof RecipientRow>(id: string, key: K, value: RecipientRow[K]) {
    setDraft(d => ({ ...d, [id]: { ...d[id], [key]: value } }))
  }
  function row(r: RecipientRow): RecipientRow { return { ...r, ...draft[r.userId] } }
  function isDirty(id: string): boolean { return draft[id] != null && Object.keys(draft[id]!).length > 0 }

  async function save(r: RecipientRow) {
    const merged = row(r)
    setSavingId(r.userId)
    try {
      const res = await fetch('/api/reports/recipients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: r.userId,
          reportEmail: merged.reportEmail ?? null,
          reportPhone: merged.reportPhone ?? null,
          reportSchedule: merged.reportSchedule,
          reportHourIst: merged.reportHourIst,
          reportMinuteIst: merged.reportMinuteIst,
          reportWeekday: merged.reportWeekday,
          reportChannels: merged.reportChannels,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body?.error ?? 'Save failed')
        return
      }
      toast.success(`Saved ${r.name}`)
      await mutate()
    } finally {
      setSavingId(null)
    }
  }

  if (isLoading) return <div className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Loading…</div>
  if (!data || data.length === 0) {
    return <p className="text-sm italic" style={{ color: 'var(--on-surface-variant)' }}>No team members in view.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
          Set where each member&apos;s daily brief is delivered. Recipients are pre-filled from each person&apos;s
          login email and phone — change them if the brief should go to a different inbox or WhatsApp number.
        </p>
        <Button variant="ghost" size="sm" onClick={() => mutate()} className="gap-1.5">
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface-container-low)' }}>
        {data.map((r, idx) => {
          const m = row(r)
          const dirty = isDirty(r.userId)
          return (
            <div
              key={r.userId}
              className="grid gap-3 px-4 py-4"
              style={{
                gridTemplateColumns: '180px 1fr 1fr 1fr 110px',
                borderTop: idx === 0 ? 'none' : '1px solid var(--surface-container)',
              }}
            >
              {/* Name */}
              <div className="flex flex-col justify-center">
                <span className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>{r.name}</span>
                <span className="text-[10px] font-mono" style={{ color: 'var(--on-surface-variant)' }}>{r.email}</span>
              </div>

              {/* Email recipient */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1" style={{ color: 'var(--on-surface-variant)' }}>
                  <Mail className="h-2.5 w-2.5" /> Report Email
                </label>
                <Input
                  type="email"
                  className="h-8 text-xs"
                  placeholder={r.email}
                  value={m.reportEmail ?? ''}
                  onChange={e => update(r.userId, 'reportEmail', e.target.value)}
                />
              </div>

              {/* WhatsApp recipient */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1" style={{ color: 'var(--on-surface-variant)' }}>
                  <MessageSquare className="h-2.5 w-2.5" /> WhatsApp Phone
                </label>
                <Input
                  type="tel"
                  className="h-8 text-xs font-mono"
                  placeholder={r.phone ?? '+919876543210'}
                  value={m.reportPhone ?? ''}
                  onChange={e => update(r.userId, 'reportPhone', e.target.value)}
                />
              </div>

              {/* Schedule */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>
                  Schedule (IST)
                </label>
                <div className="flex items-center gap-1.5">
                  <Select
                    value={m.reportSchedule}
                    onValueChange={v => update(r.userId, 'reportSchedule', (v ?? 'off'))}
                  >
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                  {m.reportSchedule === 'weekly' && (
                    <Select
                      value={String(m.reportWeekday)}
                      onValueChange={v => update(r.userId, 'reportWeekday', Number(v))}
                    >
                      <SelectTrigger className="h-8 text-xs w-[72px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_NAMES.map((d, i) => (
                          <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {m.reportSchedule !== 'off' && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0} max={23}
                      className="h-7 text-xs font-mono w-14"
                      value={m.reportHourIst}
                      onChange={e => update(r.userId, 'reportHourIst', Math.max(0, Math.min(23, Number(e.target.value) || 0)))}
                    />
                    <span className="text-xs font-mono" style={{ color: 'var(--on-surface-variant)' }}>:</span>
                    <Input
                      type="number"
                      min={0} max={59}
                      className="h-7 text-xs font-mono w-14"
                      value={m.reportMinuteIst}
                      onChange={e => update(r.userId, 'reportMinuteIst', Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                    />
                    <Select
                      value={m.reportChannels}
                      onValueChange={v => update(r.userId, 'reportChannels', v ?? 'email')}
                    >
                      <SelectTrigger className="h-7 text-xs flex-1 min-w-[88px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Save */}
              <div className="flex items-center justify-end">
                <Button
                  size="sm"
                  variant={dirty ? 'default' : 'outline'}
                  disabled={!dirty || savingId === r.userId}
                  onClick={() => save(r)}
                  className="gap-1.5"
                >
                  {savingId === r.userId ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Saving</>
                  ) : (
                    <><Save className="h-3 w-3" /> {dirty ? 'Save' : 'Saved'}</>
                  )}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>
        Auto-send currently fires once a day at 23:30 IST (Vercel Hobby plan limit). HH:MM and weekday are stored
        so per-minute precision works automatically when the workspace is upgraded to Pro — for now, weekly briefs
        go on the chosen weekday at 23:30 IST and daily briefs go every night at 23:30 IST.
      </p>
    </div>
  )
}
