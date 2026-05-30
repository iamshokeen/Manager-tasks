// src/app/api/messages/route.ts
//
// GET  → list of conversations the caller is part of, each summarising
//        the partner, last message, and unread count.
// POST → send a new message to a recipient.
//
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getVisibleUserIds } from '@/lib/rbac'

interface ConversationRow {
  partnerId: string
  partnerName: string
  partnerRole: string
  partnerAvatarUrl: string | null
  lastBody: string
  lastFromMe: boolean
  lastAt: string
  unread: number
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const me = session.user as { id: string }

  // Pull every message I'm part of, ordered newest-first, so the first
  // occurrence per partner is the latest. Done in raw Prisma + a single
  // JS dedupe pass for clarity.
  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: me.id }, { recipientId: me.id }] },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, senderId: true, recipientId: true, body: true,
      readAt: true, createdAt: true,
    },
  })

  const partnerIds = new Set<string>()
  const lastByPartner = new Map<string, typeof messages[number]>()
  for (const m of messages) {
    const partnerId = m.senderId === me.id ? m.recipientId : m.senderId
    partnerIds.add(partnerId)
    if (!lastByPartner.has(partnerId)) lastByPartner.set(partnerId, m)
  }

  if (partnerIds.size === 0) return NextResponse.json({ data: [] })

  const partners = await prisma.user.findMany({
    where: { id: { in: Array.from(partnerIds) } },
    select: { id: true, name: true, role: true, avatarUrl: true },
  })
  const partnerMap = new Map(partners.map(p => [p.id, p]))

  const unread = await prisma.message.groupBy({
    by: ['senderId'],
    where: { recipientId: me.id, readAt: null },
    _count: { _all: true },
  })
  const unreadMap = new Map(unread.map(u => [u.senderId, u._count._all]))

  const rows: ConversationRow[] = []
  for (const pid of partnerIds) {
    const p = partnerMap.get(pid)
    const last = lastByPartner.get(pid)
    if (!p || !last) continue
    rows.push({
      partnerId: p.id,
      partnerName: p.name,
      partnerRole: String(p.role),
      partnerAvatarUrl: p.avatarUrl,
      lastBody: last.body,
      lastFromMe: last.senderId === me.id,
      lastAt: last.createdAt.toISOString(),
      unread: unreadMap.get(pid) ?? 0,
    })
  }
  rows.sort((a, b) => b.lastAt.localeCompare(a.lastAt))

  return NextResponse.json({ data: rows })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const me = session.user as { id: string; role?: string }

  let body: { recipientId?: string; body?: string } = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  const recipientId = body.recipientId
  const text = (body.body ?? '').trim()
  if (!recipientId) return NextResponse.json({ error: 'recipientId required' }, { status: 400 })
  if (!text) return NextResponse.json({ error: 'body required' }, { status: 400 })
  if (text.length > 4000) return NextResponse.json({ error: 'body too long' }, { status: 400 })
  if (recipientId === me.id) return NextResponse.json({ error: 'cannot message yourself' }, { status: 400 })

  // Visibility — manager chain. SA can DM anyone; everyone else can DM
  // the people they can see in reports (i.e. their chain).
  if (me.role !== 'SUPER_ADMIN') {
    const visible = await getVisibleUserIds(me.id, me.role ?? '')
    if (!visible.has(recipientId)) return NextResponse.json({ error: 'Recipient not in your chain' }, { status: 403 })
  }

  const msg = await prisma.message.create({
    data: { senderId: me.id, recipientId, body: text },
    select: { id: true, senderId: true, recipientId: true, body: true, readAt: true, createdAt: true },
  })
  return NextResponse.json({ data: msg }, { status: 201 })
}
