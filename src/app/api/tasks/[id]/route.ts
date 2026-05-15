// src/app/api/tasks/[id]/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTask, updateTask, deleteTask } from '@/lib/services/tasks'
import { canDeleteTask, canManageUser, getVisibleUserIds, userIdFromTeamMember } from '@/lib/rbac'

async function checkVisibility(
  user: { id: string; role?: string },
  task: { createdByUserId: string | null; assigneeId: string | null }
): Promise<boolean> {
  if (user.role === 'SUPER_ADMIN') return true
  const visible = await getVisibleUserIds(user.id, user.role ?? '')
  if (task.createdByUserId && visible.has(task.createdByUserId)) return true
  if (task.assigneeId) {
    const assigneeUserId = await userIdFromTeamMember(task.assigneeId)
    if (assigneeUserId && visible.has(assigneeUserId)) return true
  }
  return false
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as { id: string; role?: string }

  try {
    const { id } = await params
    const task = await getTask(id)
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!(await checkVisibility(user, task))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ data: task })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as { id: string; role?: string }

  const { id } = await params
  const existing = await getTask(id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!(await checkVisibility(user, existing))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Edit gate: SA, creator, assignee themselves, or manager-of-assignee.
  let canEdit = user.role === 'SUPER_ADMIN' || existing.createdByUserId === user.id
  if (!canEdit && existing.assigneeId) {
    const assigneeUserId = await userIdFromTeamMember(existing.assigneeId)
    if (assigneeUserId === user.id) canEdit = true
    else if (assigneeUserId) canEdit = await canManageUser(user.id, user.role ?? '', assigneeUserId)
  }
  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    const task = await updateTask(id, body, body._note)
    return NextResponse.json({ data: task })
  } catch {
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as { id: string; role?: string }

  try {
    const { id } = await params
    const existing = await getTask(id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!(await canDeleteTask(user.id, user.role ?? '', existing))) {
      return NextResponse.json({ error: 'Only the task creator, their manager, or Super Admin can delete this task' }, { status: 403 })
    }
    await deleteTask(id)
    return NextResponse.json({ message: 'Deleted' })
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
