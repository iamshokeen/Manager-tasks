import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const followUp = await prisma.followUp.findUnique({
      where: { id },
      include: {
        teamMember: { select: { id: true, name: true, department: true } },
        stakeholder: { select: { id: true, name: true } },
        task: { select: { id: true, title: true, status: true } },
        project: { select: { id: true, title: true, stage: true } },
        parent: { select: { id: true, title: true } },
        notes: { orderBy: { createdAt: 'asc' } },
        children: {
          include: {
            teamMember: { select: { id: true, name: true } },
            stakeholder: { select: { id: true, name: true } },
            notes: { orderBy: { createdAt: 'asc' } },
            _count: { select: { children: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!followUp) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: followUp })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch follow-up' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const body = await req.json()

    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = body.title
    if (body.description !== undefined) data.description = body.description
    if (body.contactName !== undefined) data.contactName = body.contactName
    if (body.teamMemberId !== undefined) data.teamMemberId = body.teamMemberId || null
    if (body.stakeholderId !== undefined) data.stakeholderId = body.stakeholderId || null
    if (body.status !== undefined) data.status = body.status
    if (body.reminderAt !== undefined) data.reminderAt = body.reminderAt ? new Date(body.reminderAt) : null
    if (body.snoozedUntil !== undefined) data.snoozedUntil = body.snoozedUntil ? new Date(body.snoozedUntil) : null
    if (body.autoRemind !== undefined) data.autoRemind = body.autoRemind
    if (body.taskId !== undefined) data.taskId = body.taskId || null
    if (body.projectId !== undefined) data.projectId = body.projectId || null

    const followUp = await prisma.followUp.update({ where: { id }, data })
    return NextResponse.json({ data: followUp })
  } catch {
    return NextResponse.json({ error: 'Failed to update follow-up' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    await prisma.followUp.delete({ where: { id } })
    return NextResponse.json({ message: 'Deleted' })
  } catch {
    return NextResponse.json({ error: 'Failed to delete follow-up' }, { status: 500 })
  }
}
