// src/app/api/reports/route.ts
//
// People-wise activity report (2026-05-14 rewrite).
//
// Returns one row per visible user with task / comment / project counts for
// the requested period. Visibility follows the manager chain (SA bypasses).
//
// Old stored-weekly-report flow is retained via /api/cron/weekly-report and
// the email subroute under /api/reports/[id]/email; both call the service
// layer directly and don't depend on this route.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getVisibleUserIds } from '@/lib/rbac'

type Period = 'daily' | 'weekly' | 'monthly'

function parseDate(value: string | null): Date {
  if (!value) return new Date()
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? new Date() : d
}

function rangeFor(period: Period, anchor: Date): { start: Date; end: Date } {
  const d = new Date(anchor)
  d.setHours(0, 0, 0, 0)
  const start = new Date(d)
  const end = new Date(d)
  if (period === 'daily') {
    end.setHours(23, 59, 59, 999)
  } else if (period === 'weekly') {
    const day = start.getDay()
    const diffToMon = (day === 0 ? -6 : 1) - day
    start.setDate(start.getDate() + diffToMon)
    end.setTime(start.getTime())
    end.setDate(end.getDate() + 7)
    end.setMilliseconds(-1)
  } else {
    start.setDate(1)
    end.setTime(start.getTime())
    end.setMonth(end.getMonth() + 1)
    end.setMilliseconds(-1)
  }
  return { start, end }
}

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { id: string; role?: string }
  const { searchParams } = new URL(req.url)
  const period = (searchParams.get('period') as Period) || 'weekly'
  const anchor = parseDate(searchParams.get('date'))
  const { start, end } = rangeFor(period, anchor)
  const expand = searchParams.get('expand') === '1'

  try {
    const visibleSet = await getVisibleUserIds(user.id, user.role ?? '')
    if (visibleSet.size === 0) {
      return NextResponse.json({
        data: {
          period,
          rangeStart: start.toISOString(),
          rangeEnd: end.toISOString(),
          rows: [],
        },
      })
    }
    const visibleIds = Array.from(visibleSet)

    const users = await prisma.user.findMany({
      where: { id: { in: visibleIds }, isActive: true },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true, teamMemberId: true },
      orderBy: { name: 'asc' },
    })

    // Created in range, by createdByUserId
    const created = await prisma.task.findMany({
      where: { createdByUserId: { in: visibleIds }, createdAt: { gte: start, lte: end } },
      select: { id: true, title: true, status: true, createdByUserId: true },
    })
    const createdByUser = new Map<string, typeof created>()
    for (const t of created) {
      if (!t.createdByUserId) continue
      if (!createdByUser.has(t.createdByUserId)) createdByUser.set(t.createdByUserId, [])
      createdByUser.get(t.createdByUserId)!.push(t)
    }

    // Completed in range, attributed to assignee.user else createdByUser
    const completed = await prisma.task.findMany({
      where: {
        status: 'done',
        completedAt: { gte: start, lte: end },
        OR: [
          { createdByUserId: { in: visibleIds } },
          { assignee: { user: { id: { in: visibleIds } } } },
        ],
      },
      select: {
        id: true,
        title: true,
        createdByUserId: true,
        assigneeId: true,
        assignee: { select: { user: { select: { id: true } } } },
      },
    })
    const completedByUser = new Map<string, Array<{ id: string; title: string }>>()
    for (const t of completed) {
      const assigneeUserId = t.assignee?.user?.id ?? null
      const ownerKey = assigneeUserId || t.createdByUserId
      if (!ownerKey || !visibleSet.has(ownerKey)) continue
      if (!completedByUser.has(ownerKey)) completedByUser.set(ownerKey, [])
      completedByUser.get(ownerKey)!.push({ id: t.id, title: t.title })
    }

    // Point-in-time open snapshot (in-progress + overdue + active projects)
    const openTasks = await prisma.task.findMany({
      where: {
        status: { not: 'done' },
        OR: [
          { createdByUserId: { in: visibleIds } },
          { assignee: { user: { id: { in: visibleIds } } } },
        ],
      },
      select: {
        id: true,
        status: true,
        dueDate: true,
        createdByUserId: true,
        projectId: true,
        assignee: { select: { user: { select: { id: true } } } },
      },
    })
    const inProgressByUser = new Map<string, number>()
    const overdueByUser = new Map<string, number>()
    const projectsByUser = new Map<string, Set<string>>()
    for (const t of openTasks) {
      const assigneeUserId = t.assignee?.user?.id ?? null
      const ownerKey = assigneeUserId || t.createdByUserId
      if (!ownerKey || !visibleSet.has(ownerKey)) continue
      if (t.status === 'in_progress') inProgressByUser.set(ownerKey, (inProgressByUser.get(ownerKey) ?? 0) + 1)
      if (t.dueDate && new Date(t.dueDate) < end) {
        overdueByUser.set(ownerKey, (overdueByUser.get(ownerKey) ?? 0) + 1)
      }
      if (t.projectId) {
        if (!projectsByUser.has(ownerKey)) projectsByUser.set(ownerKey, new Set())
        projectsByUser.get(ownerKey)!.add(t.projectId)
      }
    }

    // Comments / activity attribution via authorName == user.name (no
    // authorUserId column yet — best effort).
    const activities = await prisma.taskActivity.findMany({
      where: { createdAt: { gte: start, lte: end }, type: { in: ['comment', 'edit', 'status_change'] } },
      select: { authorName: true },
    })
    const userByName = new Map<string, string>()
    users.forEach((u) => userByName.set(u.name, u.id))
    const commentsByUser = new Map<string, number>()
    for (const a of activities) {
      if (!a.authorName) continue
      const uid = userByName.get(a.authorName)
      if (!uid || !visibleSet.has(uid)) continue
      commentsByUser.set(uid, (commentsByUser.get(uid) ?? 0) + 1)
    }

    const rows = users.map((u) => {
      const createdList = createdByUser.get(u.id) ?? []
      const completedList = completedByUser.get(u.id) ?? []
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatarUrl: u.avatarUrl,
        tasksCreated: createdList.length,
        tasksCompleted: completedList.length,
        tasksInProgress: inProgressByUser.get(u.id) ?? 0,
        tasksOverdue: overdueByUser.get(u.id) ?? 0,
        comments: commentsByUser.get(u.id) ?? 0,
        projectsActive: projectsByUser.get(u.id)?.size ?? 0,
        details: expand
          ? {
              created: createdList.map((t) => ({ id: t.id, title: t.title, status: t.status })),
              completed: completedList,
            }
          : undefined,
      }
    })

    return NextResponse.json({
      data: {
        period,
        rangeStart: start.toISOString(),
        rangeEnd: end.toISOString(),
        rows,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to build report' }, { status: 500 })
  }
}
