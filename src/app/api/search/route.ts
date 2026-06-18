// Universal search across tasks, projects, team, stakeholders, follow-ups,
// and notes. Used by the command palette (⌘K). Returns small, capped result
// sets so the payload stays under ~6KB even on a busy query.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getVisibleUserIds } from '@/lib/rbac'

type Hit = {
  type: 'task' | 'project' | 'person' | 'stakeholder' | 'loop' | 'note'
  id: string
  title: string
  subtitle?: string
  href: string
  meta?: string
}

const PER_TYPE_LIMIT = 5

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as { id: string; role?: string }

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') ?? '').trim()
  if (!q || q.length < 1) return NextResponse.json({ data: [] as Hit[] })

  const ic = { contains: q, mode: 'insensitive' as const }

  // Task visibility: SUPER_ADMIN sees all; everyone else respects the chain.
  let visibleUserIds: string[] | null = null
  if (user.role !== 'SUPER_ADMIN') {
    const set = await getVisibleUserIds(user.id, user.role ?? '')
    visibleUserIds = Array.from(set)
  }

  const [tasks, projects, people, stakeholders, loops, notes] = await Promise.all([
    prisma.task.findMany({
      where: {
        AND: [
          { OR: [{ title: ic }, { description: ic }] },
          visibleUserIds
            ? { OR: [{ createdByUserId: { in: visibleUserIds } }, { assignee: { user: { id: { in: visibleUserIds } } } }] }
            : {},
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: PER_TYPE_LIMIT,
      select: { id: true, title: true, status: true, priority: true, department: true },
    }),
    prisma.project.findMany({
      where: { OR: [{ title: ic }, { description: ic }] },
      orderBy: { updatedAt: 'desc' },
      take: PER_TYPE_LIMIT,
      select: { id: true, title: true, stage: true, department: true },
    }),
    prisma.teamMember.findMany({
      where: { OR: [{ name: ic }, { role: ic }, { department: ic }] },
      orderBy: { name: 'asc' },
      take: PER_TYPE_LIMIT,
      select: { id: true, name: true, role: true, department: true },
    }),
    prisma.stakeholder.findMany({
      where: { OR: [{ name: ic }, { title: ic }] },
      orderBy: { name: 'asc' },
      take: PER_TYPE_LIMIT,
      select: { id: true, name: true, title: true, priority: true },
    }),
    prisma.followUp.findMany({
      where: { OR: [{ title: ic }, { contactName: ic }, { description: ic }] },
      orderBy: { lastActivityAt: 'desc' },
      take: PER_TYPE_LIMIT,
      select: { id: true, title: true, contactName: true, status: true },
    }),
    prisma.note.findMany({
      where: {
        AND: [
          { content: ic },
          user.role === 'SUPER_ADMIN'
            ? {}
            : { OR: [{ userId: user.id }, { visibility: 'team' }] },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: PER_TYPE_LIMIT,
      select: { id: true, content: true, visibility: true },
    }),
  ])

  const hits: Hit[] = [
    ...tasks.map<Hit>((t) => ({
      type: 'task',
      id: t.id,
      title: t.title,
      subtitle: `${cap(t.status)} · ${cap(t.priority)}`,
      href: `/tasks?task=${t.id}`,
      meta: t.department,
    })),
    ...projects.map<Hit>((p) => ({
      type: 'project',
      id: p.id,
      title: p.title,
      subtitle: cap(p.stage),
      href: `/projects/${p.id}`,
      meta: p.department,
    })),
    ...people.map<Hit>((m) => ({
      type: 'person',
      id: m.id,
      title: m.name,
      subtitle: m.role,
      href: `/team/${m.id}`,
      meta: m.department,
    })),
    ...stakeholders.map<Hit>((s) => ({
      type: 'stakeholder',
      id: s.id,
      title: s.name,
      subtitle: s.title ?? undefined,
      href: `/stakeholders`,
      meta: cap(s.priority),
    })),
    ...loops.map<Hit>((f) => ({
      type: 'loop',
      id: f.id,
      title: f.title,
      subtitle: f.contactName,
      href: `/follow-ups?id=${f.id}`,
      meta: cap(f.status),
    })),
    ...notes.map<Hit>((n) => ({
      type: 'note',
      id: n.id,
      title: snippet(n.content),
      subtitle: cap(n.visibility),
      href: `/notes#${n.id}`,
    })),
  ]

  return NextResponse.json({ data: hits })
}

function cap(s: string) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')
}

function snippet(s: string) {
  const stripped = s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return stripped.length > 60 ? stripped.slice(0, 57) + '…' : stripped
}
