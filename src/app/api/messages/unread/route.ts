// src/app/api/messages/unread/route.ts
// Total unread DM count for the caller — used for the sidebar badge.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ data: { count: 0 } })
  const me = session.user as { id: string }
  const count = await prisma.message.count({
    where: { recipientId: me.id, readAt: null },
  })
  return NextResponse.json({ data: { count } })
}
