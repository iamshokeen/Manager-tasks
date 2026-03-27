import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const { mode, existingTaskId, title, priority, department, assigneeId, dueDate } = await req.json()

    const followUp = await prisma.followUp.findUnique({
      where: { id },
      include: { notes: { orderBy: { createdAt: 'asc' } } },
    })
    if (!followUp) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const historyComment = followUp.notes.map(n =>
      `[${new Date(n.createdAt).toLocaleDateString()} · ${n.authorName ?? 'System'}]: ${n.content}`
    ).join('\n\n')

    let taskId: string

    if (mode === 'link' && existingTaskId) {
      // Link to existing task — add follow-up history as comments
      taskId = existingTaskId
    } else {
      // Create new task
      const assignedByName = (session.user as { name?: string }).name ?? 'System'
      const task = await prisma.task.create({
        data: {
          title: title || followUp.title,
          description: followUp.description || null,
          department: department || 'Program Management',
          priority: priority || 'medium',
          assignedByName,
          assigneeId: assigneeId || null,
          dueDate: dueDate ? new Date(dueDate) : null,
          source: 'follow_up',
        },
      })
      taskId = task.id
    }

    // Add follow-up history as task comments
    if (historyComment) {
      await prisma.taskActivity.create({
        data: {
          taskId,
          type: 'comment',
          note: `Follow-up history:\n\n${historyComment}`,
          authorName: 'System (Follow-up)',
          source: 'system',
        },
      })
    }

    // Mark follow-up as converted
    await prisma.followUp.update({
      where: { id },
      data: { status: 'converted', convertedTaskId: taskId, taskId },
    })

    return NextResponse.json({ data: { taskId } })
  } catch (e) {
    console.error('Convert follow-up error:', e)
    return NextResponse.json({ error: 'Failed to convert' }, { status: 500 })
  }
}
