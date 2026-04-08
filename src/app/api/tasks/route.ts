// src/app/api/tasks/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTasks, createTask } from '@/lib/services/tasks'
import { canRoleAsync } from '@/lib/rbac'
import type { TaskFilters } from '@/types'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const filters: TaskFilters = {
    assigneeId: searchParams.get('assigneeId') ?? undefined,
    department: searchParams.get('department') ?? undefined,
    status: (searchParams.get('status') as TaskFilters['status']) ?? undefined,
    priority: (searchParams.get('priority') as TaskFilters['priority']) ?? undefined,
    isSelfTask: searchParams.has('isSelfTask') ? searchParams.get('isSelfTask') === 'true' : undefined,
    projectId: searchParams.get('projectId') ?? undefined,
    stakeholderId: searchParams.get('stakeholderId') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    assignedByName: searchParams.get('assignedByName') ?? undefined,
  }

  // RBAC: contributors can only see tasks assigned to or created by themselves
  const user = session.user as { role?: string; teamMemberId?: string; name?: string }
  const contributorRoles = ['DIRECT_REPORT', 'SENIOR_IC']
  if (contributorRoles.includes(user.role ?? '')) {
    const name = user.name ?? ''
    if (!name) {
      // No name, can't match anything — return empty
      return NextResponse.json({ data: [] })
    }
    filters.contributorFilter = { teamMemberId: user.teamMemberId ?? undefined, name }
  }

  try {
    const tasks = await getTasks(filters)
    return NextResponse.json({ data: tasks })
  } catch (_e) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as { role?: string }).role ?? ''
  if (!await canRoleAsync(role, 'tasks', 'create')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    if (!body.title || !body.department) {
      return NextResponse.json({ error: 'title and department are required' }, { status: 400 })
    }
    const task = await createTask(body)
    return NextResponse.json({ data: task }, { status: 201 })
  } catch (_e) {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
