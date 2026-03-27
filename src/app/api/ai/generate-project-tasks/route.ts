// src/app/api/ai/generate-project-tasks/route.ts
// Reads project description + existing tasks, suggests new tasks (~$0.0002/call)
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(req: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { projectId } = await req.json()
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

    const [project, members, settings] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId },
        include: {
          tasks: { select: { title: true, status: true } },
          owner: { select: { name: true } },
        },
      }),
      prisma.teamMember.findMany({
        where: { status: 'active' },
        select: { id: true, name: true, department: true },
      }),
      prisma.setting.findUnique({ where: { key: 'departments' } }),
    ])

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (!project.description?.trim()) {
      return NextResponse.json({ error: 'Project has no description to generate tasks from' }, { status: 400 })
    }

    const departments: string[] = settings?.value
      ? JSON.parse(settings.value)
      : ['Analytics', 'Revenue', 'OTA', 'Marketing', 'Financial Modelling', 'Program Management']

    const assignedByName = (session.user as { name?: string }).name ?? 'Saksham'
    const today = new Date().toISOString().split('T')[0]
    const existingTitles = project.tasks.map(t => t.title).join(', ')

    const systemPrompt = `You extract implementation tasks from a project description. Return ONLY JSON, no markdown.

TEAM (use exact IDs):
${members.map(m => `${m.name} → id:"${m.id}" dept:${m.department}`).join('\n')}

DEPARTMENTS: ${departments.join(', ')}
PROJECT DEPARTMENT: ${project.department}
TODAY: ${today}
${existingTitles ? `ALREADY EXISTING TASKS (do NOT duplicate): ${existingTitles}` : ''}

Output ONLY this JSON:
{"tasks":[{"title":"string","description":"string|null","assigneeId":"string|null","assigneeName":"string|null","isSelfTask":false,"department":"string","priority":"urgent|high|medium|low","dueDate":"YYYY-MM-DD|null"}]}`

    const userPrompt = `Project: "${project.title}"\nDepartment: ${project.department}\nOwner: ${project.owner?.name ?? 'Unassigned'}\n\nDescription:\n${project.description}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 900,
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? ''
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(jsonStr)

    const usage = completion.usage
    if (usage) {
      const cost = (usage.prompt_tokens * 0.00000015) + (usage.completion_tokens * 0.0000006)
      console.log(`[ai/generate-project-tasks] ${usage.prompt_tokens}in + ${usage.completion_tokens}out = $${cost.toFixed(6)}`)
    }

    return NextResponse.json({ tasks: parsed.tasks, assignedByName })
  } catch (e) {
    console.error('AI generate-project-tasks error:', e)
    return NextResponse.json({ error: 'Failed to generate tasks' }, { status: 500 })
  }
}
