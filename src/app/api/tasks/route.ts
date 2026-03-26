// src/app/api/tasks/route.ts
import { NextResponse } from 'next/server'
import { getTasks, createTask } from '@/lib/services/tasks'
import type { TaskFilters } from '@/types'

export async function GET(req: Request) {
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
  try {
    const tasks = await getTasks(filters)
    return NextResponse.json({ data: tasks })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body.title || !body.department) {
      return NextResponse.json({ error: 'title and department are required' }, { status: 400 })
    }
    const task = await createTask(body)
    return NextResponse.json({ data: task }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
