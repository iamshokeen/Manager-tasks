import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as { id: string; role?: string }

    // Notes I own (any visibility) + any team-visibility note (workspace-wide).
    const where =
      user.role === 'SUPER_ADMIN'
        ? {}
        : { OR: [{ userId: user.id }, { visibility: 'team' }] }

    const notes = await prisma.note.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    })
    return NextResponse.json({ data: notes })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as { id: string }
    const body = await req.json()
    const content = String(body.content ?? '')
    if (!content.trim()) return NextResponse.json({ error: 'content is required' }, { status: 400 })
    const visibility = body.visibility === 'team' ? 'team' : 'personal'
    const note = await prisma.note.create({
      data: { content: content.trim(), userId: user.id, visibility },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    })
    return NextResponse.json({ data: note }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}
