// src/app/api/ai/generate-project-tasks/route.ts
// Reads project brainstorm notes (fallback: description), suggests new tasks.
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const TELOS_CONTEXT = `You are Telos, the strategic intelligence layer inside Kairos — a command center for people managers. Your job is to hold the user's purpose while they are heads-down in tasks. You surface what matters, flag what's slipping, and ask the questions the user hasn't thought to ask yet. Be brief. Be sharp. Never be a chatbot.\n\n`

// Hard cap on input to bound cost.
const MAX_NOTES_LENGTH = 6000
// Output budget — enough headroom for ~20-25 detailed tasks.
const MAX_OUTPUT_TOKENS = 4000

export async function POST(req: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { projectId, brainstormNotes: notesOverride, maxTasks } = await req.json()
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

    // Source-of-truth priority: explicit override from the panel > stored notes > description.
    const sourceRaw = (
      typeof notesOverride === 'string' && notesOverride.trim()
        ? notesOverride
        : (project.brainstormNotes?.trim() || project.description?.trim() || '')
    )
    if (!sourceRaw) {
      return NextResponse.json(
        { error: 'Add brainstorm notes (or a project description) so AI has something to work from' },
        { status: 400 }
      )
    }
    const source = sourceRaw.length > MAX_NOTES_LENGTH ? sourceRaw.slice(0, MAX_NOTES_LENGTH) : sourceRaw

    const departments: string[] = settings?.value
      ? JSON.parse(settings.value)
      : ['Analytics', 'Revenue', 'OTA', 'Marketing', 'Financial Modelling', 'Program Management']

    const assignedByName = (session.user as { name?: string }).name ?? 'Saksham'
    const today = new Date().toISOString().split('T')[0]
    const existingTitles = project.tasks.map(t => t.title).join(', ')
    const taskCeiling = Math.min(40, Math.max(1, Number(maxTasks) || 25))

    const systemPrompt = TELOS_CONTEXT + `You extract implementation tasks from brainstorm notes / a project description / a timeline. Return ONLY JSON, no markdown.

TEAM (use exact IDs):
${members.map(m => `${m.name} → id:"${m.id}" dept:${m.department}`).join('\n')}

DEPARTMENTS: ${departments.join(', ')}
PROJECT DEPARTMENT: ${project.department}
TODAY: ${today}
${existingTitles ? `ALREADY EXISTING TASKS (do NOT duplicate): ${existingTitles}` : ''}

Extract every concrete action the notes imply. Cover the whole arc — discovery, planning, build, review, launch, follow-up — wherever the notes suggest it. Do not invent scope that isn't in the notes. Aim for up to ${taskCeiling} tasks; fewer is fine if the notes are short.

For each task, fill 'description' with a 1-2 sentence acceptance criterion when the notes provide enough detail (else null). Assign to the team member whose department best fits, or leave assigneeId null. Set isSelfTask=true only if the note names the user explicitly.

Output ONLY this JSON:
{"tasks":[{"title":"string","description":"string|null","assigneeId":"string|null","assigneeName":"string|null","isSelfTask":false,"department":"string","priority":"urgent|high|medium|low","dueDate":"YYYY-MM-DD|null"}]}`

    const userPrompt = `Project: "${project.title}"\nDepartment: ${project.department}\nOwner: ${project.owner?.name ?? 'Unassigned'}\n${project.dueDate ? `Project Due: ${project.dueDate.toISOString().split('T')[0]}\n` : ''}\nBrainstorm / Timeline notes:\n${source}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: MAX_OUTPUT_TOKENS,
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
      console.log(`[ai/generate-project-tasks] ${usage.prompt_tokens}in + ${usage.completion_tokens}out = $${cost.toFixed(6)} (${(parsed.tasks ?? []).length} tasks)`)
    }

    return NextResponse.json({ tasks: parsed.tasks ?? [], assignedByName })
  } catch (e) {
    console.error('AI generate-project-tasks error:', e)
    return NextResponse.json({ error: 'Failed to generate tasks' }, { status: 500 })
  }
}
