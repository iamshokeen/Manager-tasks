// src/app/api/reports/recipients/route.ts
//
// GET   → list every team member the caller can see + their report config
// PATCH → update report config for one user (recipient + schedule)
//
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getVisibleUserIds } from '@/lib/rbac'

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

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const me = session.user as { id: string; role?: string }

  let userIds: string[] | null = null
  if (me.role !== 'SUPER_ADMIN') {
    const visible = await getVisibleUserIds(me.id, me.role ?? '')
    userIds = Array.from(visible)
    if (userIds.length === 0) return NextResponse.json({ data: [] })
  }

  const rows = await prisma.user.findMany({
    where: userIds ? { id: { in: userIds }, isActive: true } : { isActive: true },
    select: {
      id: true, name: true, email: true, phone: true,
      reportEmail: true, reportPhone: true,
      reportSchedule: true, reportHourIst: true, reportMinuteIst: true,
      reportWeekday: true, reportChannels: true,
    },
    orderBy: { name: 'asc' },
  })
  const data: RecipientRow[] = rows.map(r => ({
    userId: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    reportEmail: r.reportEmail,
    reportPhone: r.reportPhone,
    reportSchedule: r.reportSchedule,
    reportHourIst: r.reportHourIst,
    reportMinuteIst: r.reportMinuteIst,
    reportWeekday: r.reportWeekday,
    reportChannels: r.reportChannels,
  }))
  return NextResponse.json({ data })
}

const SCHEDULE_VALUES = new Set(['off', 'daily', 'weekly'])
const CHANNEL_VALUES = new Set(['none', 'email', 'whatsapp', 'both'])

function normalizePhone(raw: string | null | undefined): string | null | undefined {
  if (raw === undefined) return undefined
  if (raw === null || raw === '') return null
  const trimmed = raw.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) {
    throw new Error('phone must be 8–15 digits')
  }
  return trimmed.startsWith('+') ? `+${digits}` : digits
}

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const me = session.user as { id: string; role?: string }

  let body: {
    userId?: string
    reportEmail?: string | null
    reportPhone?: string | null
    reportSchedule?: string
    reportHourIst?: number
    reportMinuteIst?: number
    reportWeekday?: number
    reportChannels?: string
  } = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  if (!body.userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  if (me.role !== 'SUPER_ADMIN') {
    const visible = await getVisibleUserIds(me.id, me.role ?? '')
    if (!visible.has(body.userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const data: Record<string, unknown> = {}
  if (body.reportEmail !== undefined) {
    if (body.reportEmail === null || body.reportEmail === '') data.reportEmail = null
    else {
      const v = body.reportEmail.trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return NextResponse.json({ error: 'invalid reportEmail' }, { status: 400 })
      data.reportEmail = v
    }
  }
  if (body.reportPhone !== undefined) {
    try {
      const norm = normalizePhone(body.reportPhone)
      if (norm !== undefined) data.reportPhone = norm
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'invalid phone' }, { status: 400 })
    }
  }
  if (body.reportSchedule !== undefined) {
    if (!SCHEDULE_VALUES.has(body.reportSchedule)) return NextResponse.json({ error: 'invalid schedule' }, { status: 400 })
    data.reportSchedule = body.reportSchedule
  }
  if (body.reportHourIst !== undefined) {
    const h = Math.trunc(body.reportHourIst)
    if (h < 0 || h > 23) return NextResponse.json({ error: 'hour must be 0–23' }, { status: 400 })
    data.reportHourIst = h
  }
  if (body.reportMinuteIst !== undefined) {
    const m = Math.trunc(body.reportMinuteIst)
    if (m < 0 || m > 59) return NextResponse.json({ error: 'minute must be 0–59' }, { status: 400 })
    data.reportMinuteIst = m
  }
  if (body.reportWeekday !== undefined) {
    const w = Math.trunc(body.reportWeekday)
    if (w < 0 || w > 6) return NextResponse.json({ error: 'weekday must be 0–6' }, { status: 400 })
    data.reportWeekday = w
  }
  if (body.reportChannels !== undefined) {
    if (!CHANNEL_VALUES.has(body.reportChannels)) return NextResponse.json({ error: 'invalid channels' }, { status: 400 })
    data.reportChannels = body.reportChannels
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  const updated = await prisma.user.update({
    where: { id: body.userId },
    data,
    select: {
      id: true, reportEmail: true, reportPhone: true,
      reportSchedule: true, reportHourIst: true, reportMinuteIst: true,
      reportWeekday: true, reportChannels: true,
    },
  })
  return NextResponse.json({ data: updated })
}
