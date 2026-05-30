// src/app/api/messages/[partnerId]/route.ts
//
// GET    → full chronological thread with a partner.
// PATCH  → mark all messages FROM partner TO me as read.
//
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(req: Request, { params }: { params: Promise<{ partnerId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const me = session.user as { id: string }
  const { partnerId } = await params
  if (!partnerId) return NextResponse.json({ error: 'partnerId required' }, { status: 400 })

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: me.id, recipientId: partnerId },
        { senderId: partnerId, recipientId: me.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, senderId: true, recipientId: true, body: true, readAt: true, createdAt: true },
  })

  const partner = await prisma.user.findUnique({
    where: { id: partnerId },
    select: { id: true, name: true, role: true, avatarUrl: true },
  })

  return NextResponse.json({ data: { partner, messages } })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ partnerId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const me = session.user as { id: string }
  const { partnerId } = await params

  const result = await prisma.message.updateMany({
    where: { senderId: partnerId, recipientId: me.id, readAt: null },
    data: { readAt: new Date() },
  })
  return NextResponse.json({ data: { markedRead: result.count } })
}
