import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        approvalStatus: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        teamMemberId: true,
        manager: { select: { id: true, name: true, role: true } },
        _count: { select: { reports: true } },
      },
    })

    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { teamMemberId } = user

    const [tasksCompleted, activeProjects, oneOnOnesCount] = await Promise.all([
      teamMemberId
        ? prisma.task.count({ where: { assigneeId: teamMemberId, status: 'done' } })
        : Promise.resolve(0),
      teamMemberId
        ? prisma.project.count({ where: { stage: { not: 'closed' }, ownerId: teamMemberId } })
        : Promise.resolve(0),
      teamMemberId
        ? prisma.oneOnOne.count({ where: { memberId: teamMemberId } })
        : Promise.resolve(0),
    ])

    const recentActivity = await prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, action: true, metadata: true, createdAt: true },
    })

    // Compute profile completion (0-100)
    const profileCompletion =
      (user.emailVerified ? 34 : 0) +
      (user.approvalStatus === 'APPROVED' ? 33 : 0) +
      (user.isActive ? 33 : 0)

    // Compute account health (0-100)
    const accountHealth =
      (user.isActive ? 34 : 0) +
      (user.approvalStatus === 'APPROVED' ? 33 : 0) +
      (user.emailVerified ? 33 : 0)

    // Compute activity level based on last 30 days (0-100, max at 20 actions)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentCount = await prisma.activityLog.count({
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
    })
    const activityLevel = Math.min(100, Math.round((recentCount / 20) * 100))

    return NextResponse.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        approvalStatus: user.approvalStatus,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        teamMemberId: user.teamMemberId,
        manager: user.manager ?? null,
        tasksCompleted,
        activeProjects,
        teamSize: user._count.reports,
        oneOnOnesCount,
        recentActivity: recentActivity.map(a => ({
          id: a.id,
          action: a.action,
          metadata: a.metadata as Record<string, unknown> | null,
          createdAt: a.createdAt.toISOString(),
        })),
        profileCompletion,
        accountHealth,
        activityLevel,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as { name?: string; avatarUrl?: string | null }

    if (body.name === undefined && body.avatarUrl === undefined) {
      return NextResponse.json({ error: 'At least one field required' }, { status: 400 })
    }
    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }
    if (body.avatarUrl !== undefined && body.avatarUrl !== null) {
      if (typeof body.avatarUrl !== 'string' || body.avatarUrl.length > 2048) {
        return NextResponse.json({ error: 'Invalid avatarUrl' }, { status: 400 })
      }
      if (body.avatarUrl && !body.avatarUrl.startsWith('https://')) {
        return NextResponse.json({ error: 'avatarUrl must use https' }, { status: 400 })
      }
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
      },
      select: { id: true, name: true, email: true, avatarUrl: true },
    })

    return NextResponse.json({ data: updated })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
