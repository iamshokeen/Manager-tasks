import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as { id: string; role?: string }
    // Strict: only see your own notes (SUPER_ADMIN sees all)
    const where = user.role === 'SUPER_ADMIN' ? {} : { userId: user.id }
    const notes = await prisma.note.findMany({ where, orderBy: { updatedAt: 'desc' } })
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
    const { content } = await req.json()
    if (!content?.trim()) return NextResponse.json({ error: 'content is required' }, { status: 400 })
    const note = await prisma.note.create({ data: { content: content.trim(), userId: user.id } })
    return NextResponse.json({ data: note }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}
