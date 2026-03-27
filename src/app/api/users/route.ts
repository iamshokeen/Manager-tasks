// src/app/api/users/route.ts
// Legacy user management route — now managed via /api/admin/users
// This endpoint is kept for backward compatibility (read-only GET)
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teamMemberId: true,
        teamMember: {
          select: { name: true },
        },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ data: users })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
