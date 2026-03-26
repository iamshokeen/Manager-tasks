// src/app/api/ai/progress/route.ts
// mode=comments: progress report from task comment thread (~$0.00008)
// mode=project:  project health summary (~$0.00012)
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { mode, taskId, projectId } = await req.json()

    // ── Comments progress report ─────────────────────────────────────────────
    if (mode === 'comments') {
      if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 })

      const [task, comments] = await Promise.all([
        prisma.task.findUnique({
          where: { id: taskId },
          select: { title: true, status: true, priority: true, dueDate: true, description: true },
        }),
        prisma.taskActivity.findMany({
          where: { taskId, type: 'comment' },
          orderBy: { createdAt: 'asc' },
          select: { note: true, authorName: true, createdAt: true },
        }),
      ])

      if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      if (comments.length < 2) {
        return NextResponse.json({ summary: '• Not enough comments yet to generate a progress report.' })
      }

      const thread = comments
        .map(c => `[${c.authorName ?? 'Unknown'} · ${new Date(c.createdAt).toLocaleDateString()}]: ${c.note}`)
        .join('\n')

      const prompt = `Task: "${task.title}" | Status: ${task.status} | Priority: ${task.priority}${task.dueDate ? ` | Due: ${new Date(task.dueDate).toLocaleDateString()}` : ''}\n\nComment thread:\n${thread}`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 250,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'Summarize the progress of this task based on the comment thread. Output 3-4 bullet points covering: what has been done, any blockers, and next steps. Start each bullet with "• ". Be factual and brief.',
          },
          { role: 'user', content: prompt },
        ],
      })

      const summary = completion.choices[0]?.message?.content?.trim() ?? ''
      logCost(completion.usage, 'progress/comments')
      return NextResponse.json({ summary })
    }

    // ── Project health summary ───────────────────────────────────────────────
    if (mode === 'project') {
      if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          owner: { select: { name: true } },
          tasks: { select: { status: true, priority: true, dueDate: true, title: true } },
        },
      })

      if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

      const now = new Date()
      const tasks = project.tasks
      const total = tasks.length
      const done = tasks.filter(t => t.status === 'done').length
      const inProgress = tasks.filter(t => t.status === 'in_progress').length
      const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done').length
      const pct = total > 0 ? Math.round((done / total) * 100) : 0

      if (total === 0) {
        return NextResponse.json({ summary: '• No tasks created for this project yet.' })
      }

      const taskList = tasks
        .slice(0, 20)
        .map(t => `- [${t.status}] ${t.title}${t.dueDate && new Date(t.dueDate) < now && t.status !== 'done' ? ' ⚠️ OVERDUE' : ''}`)
        .join('\n')

      const prompt = `Project: "${project.title}" | Stage: ${project.stage} | Owner: ${project.owner?.name ?? 'Unassigned'}${project.dueDate ? ` | Due: ${new Date(project.dueDate).toLocaleDateString()}` : ''}\nProgress: ${done}/${total} tasks done (${pct}%) | ${inProgress} in progress | ${overdue} overdue\n\nTasks:\n${taskList}`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'Give a concise project health summary in 4-5 bullet points. Cover: overall progress, risks or blockers, overdue items if any, and recommended next steps. Start each bullet with "• ".',
          },
          { role: 'user', content: prompt },
        ],
      })

      const summary = completion.choices[0]?.message?.content?.trim() ?? ''
      logCost(completion.usage, 'progress/project')
      return NextResponse.json({ summary })
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  } catch (e) {
    console.error('AI progress error:', e)
    return NextResponse.json({ error: 'Failed to generate progress report' }, { status: 500 })
  }
}

function logCost(usage: { prompt_tokens: number; completion_tokens: number } | undefined, label: string) {
  if (!usage) return
  const cost = (usage.prompt_tokens * 0.00000015) + (usage.completion_tokens * 0.0000006)
  console.log(`[ai/${label}] ${usage.prompt_tokens}in + ${usage.completion_tokens}out = $${cost.toFixed(6)}`)
}
