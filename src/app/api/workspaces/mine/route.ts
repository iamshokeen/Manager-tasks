// src/app/api/workspaces/mine/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: { workspace: true },
      orderBy: { joinedAt: 'asc' },
    })

    const workspaces = memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      type: m.workspace.type,
      description: m.workspace.description,
      isArchived: m.workspace.isArchived,
      userRole: m.role,
    }))

    return NextResponse.json({ workspaces })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
