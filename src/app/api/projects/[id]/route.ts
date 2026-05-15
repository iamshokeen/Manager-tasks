import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getProject, updateProject, deleteProject } from '@/lib/services/projects'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const project = await getProject(id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: project })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const body = await req.json()
    const project = await updateProject(id, body)
    return NextResponse.json({ data: project })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const sessionUser = session.user as { id: string; role?: string }

  const existing = await prisma.project.findUnique({ where: { id }, select: { createdByUserId: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isCreator = existing.createdByUserId === sessionUser.id
  if (sessionUser.role !== 'SUPER_ADMIN' && !isCreator) {
    return NextResponse.json({ error: 'Only Super Admin or the project creator can delete' }, { status: 403 })
  }

  try {
    await deleteProject(id)
    return NextResponse.json({ message: 'Deleted' })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
