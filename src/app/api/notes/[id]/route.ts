import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

async function loadOwned(id: string, userId: string, role?: string) {
  const note = await prisma.note.findUnique({ where: { id } })
  if (!note) return { error: 'not_found' as const }
  if (role !== 'SUPER_ADMIN' && note.userId !== userId) return { error: 'forbidden' as const }
  return { note }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as { id: string; role?: string }
    const { id } = await params
    const owned = await loadOwned(id, user.id, user.role)
    if ('error' in owned) {
      return NextResponse.json({ error: owned.error }, { status: owned.error === 'not_found' ? 404 : 403 })
    }
    const body = await req.json()
    const data: { content?: string; visibility?: string } = {}
    if (typeof body.content === 'string') {
      if (!body.content.trim()) return NextResponse.json({ error: 'content is required' }, { status: 400 })
      data.content = body.content.trim()
    }
    if (body.visibility === 'team' || body.visibility === 'personal') {
      data.visibility = body.visibility
    }
    const note = await prisma.note.update({
      where: { id },
      data,
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    })
    return NextResponse.json({ data: note })
  } catch {
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as { id: string; role?: string }
    const { id } = await params
    const owned = await loadOwned(id, user.id, user.role)
    if ('error' in owned) {
      return NextResponse.json({ error: owned.error }, { status: owned.error === 'not_found' ? 404 : 403 })
    }
    await prisma.note.delete({ where: { id } })
    return NextResponse.json({ message: 'Deleted' })
  } catch {
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}
