// src/app/api/messages/contacts/route.ts
//
// People the caller is allowed to DM — the manager chain.
//
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getMessageableUserIds } from '@/lib/rbac'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const me = session.user as { id: string; role?: string }

  let where = {}
  if (me.role !== 'SUPER_ADMIN') {
    const visible = await getMessageableUserIds(me.id, me.role ?? '')
    where = { id: { in: Array.from(visible) }, isActive: true }
  } else {
    where = { isActive: true, NOT: { id: me.id } }
  }
  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, role: true, avatarUrl: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ data: users })
}
