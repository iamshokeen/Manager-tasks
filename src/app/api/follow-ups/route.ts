import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = session.user as { id: string; role?: string; teamMemberId?: string }

    // Ownership isolation: only see follow-ups you created or that involve you directly
    const ownershipWhere = user.role === 'SUPER_ADMIN'
      ? {}
      : {
          OR: [
            { createdByUserId: user.id },
            ...(user.teamMemberId ? [{ teamMember: { user: { id: user.id } } }] : []),
          ],
        }

    const followUps = await prisma.followUp.findMany({
      include: {
        teamMember: { select: { id: true, name: true, department: true } },
        stakeholder: { select: { id: true, name: true } },
        task: { select: { id: true, title: true, status: true } },
        project: { select: { id: true, title: true, stage: true } },
        notes: { orderBy: { createdAt: 'asc' } },
        children: {
          include: {
            teamMember: { select: { id: true, name: true } },
            stakeholder: { select: { id: true, name: true } },
            notes: { orderBy: { createdAt: 'asc' } },
            children: {
              include: {
                teamMember: { select: { id: true, name: true } },
                stakeholder: { select: { id: true, name: true } },
                notes: { orderBy: { createdAt: 'asc' } },
                _count: { select: { children: true } },
              },
            },
          },
        },
      },
      where: { parentId: null, ...ownershipWhere },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: followUps })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch follow-ups' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { title, description, contactName, teamMemberId, stakeholderId,
      parentId, reminderAt, autoRemind, taskId, projectId } = body

    if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 })
    if (!contactName?.trim()) return NextResponse.json({ error: 'contactName is required' }, { status: 400 })

    const sessionUser = session.user as { id: string }
    const followUp = await prisma.followUp.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        contactName: contactName.trim(),
        teamMemberId: teamMemberId || null,
        stakeholderId: stakeholderId || null,
        parentId: parentId || null,
        reminderAt: reminderAt ? new Date(reminderAt) : null,
        autoRemind: autoRemind ?? true,
        taskId: taskId || null,
        projectId: projectId || null,
        createdByUserId: sessionUser.id,
      },
      include: {
        teamMember: { select: { id: true, name: true } },
        stakeholder: { select: { id: true, name: true } },
        notes: true,
        children: true,
      },
    })

    return NextResponse.json({ data: followUp }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create follow-up' }, { status: 500 })
  }
}
