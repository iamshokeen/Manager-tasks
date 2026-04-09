// src/app/api/ai/email-to-tasks/route.ts
// GPT-4o mini — email thread → structured tasks + detected people (~$0.0006/call at 8k input)
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(req: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { emailText } = await req.json()
    if (!emailText?.trim()) {
      return NextResponse.json({ error: 'emailText is required' }, { status: 400 })
    }
    if (emailText.length > 8000) {
      return NextResponse.json({ error: 'Input too long (max 8000 chars)' }, { status: 400 })
    }

    const [members, stakeholders, settings] = await Promise.all([
      prisma.teamMember.findMany({
        where: { status: 'active' },
        select: { id: true, name: true, department: true },
      }),
      prisma.stakeholder.findMany({
        select: { id: true, name: true, title: true },
      }),
      prisma.setting.findUnique({ where: { key: 'departments' } }),
    ])

    const departments: string[] = settings?.value
      ? JSON.parse(settings.value)
      : ['Analytics', 'Revenue', 'OTA', 'Marketing', 'Financial Modelling', 'Program Management']

    const assignedByName = (session.user as { name?: string }).name ?? 'Saksham'
    const today = new Date().toISOString().split('T')[0]

    const systemPrompt = `You are an email-to-task extraction function. Read the email thread and extract every actionable CTA (call to action) as a separate task. Return ONLY JSON.

TEAM MEMBERS (match names from email to these — use exact IDs):
${members.map(m => `${m.name} → id:"${m.id}" dept:${m.department}`).join('\n')}

STAKEHOLDERS (external people — match by name to detect, no ID needed):
${stakeholders.map(s => `${s.name}${s.title ? ` (${s.title})` : ''}`).join('\n')}

DEPARTMENTS: ${departments.join(', ')}
TODAY: ${today}
ASSIGNER: ${assignedByName}

Rules:
- Each distinct action item = one task, even if same person owns multiple
- "assigneeId" must be a valid team member ID from the list above, or null
- "isSelfTask" = true only if the action belongs to ${assignedByName} themselves
- "detectedPeople" = all names mentioned in the email (team + stakeholders + unknown)
- Infer due dates from phrases like "by Friday", "end of week", "before the call"
- If no due date is mentioned, set dueDate to null
- Pick the tightest reasonable department from the list for each task

Output ONLY this JSON (no markdown, no explanation):
{
  "tasks": [
    {
      "title": "string",
      "description": "string|null",
      "assigneeId": "string|null",
      "assigneeName": "string|null",
      "isSelfTask": false,
      "department": "string",
      "priority": "urgent|high|medium|low",
      "dueDate": "YYYY-MM-DD|null"
    }
  ],
  "detectedPeople": [
    { "name": "string", "role": "team|stakeholder|unknown" }
  ]
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1200,
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: emailText },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? ''
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(jsonStr)

    const usage = completion.usage
    if (usage) {
      const cost = (usage.prompt_tokens * 0.00000015) + (usage.completion_tokens * 0.0000006)
      console.log(`[ai/email-to-tasks] ${usage.prompt_tokens}in + ${usage.completion_tokens}out = $${cost.toFixed(6)}`)
    }

    return NextResponse.json({
      tasks: parsed.tasks ?? [],
      detectedPeople: parsed.detectedPeople ?? [],
      assignedByName,
    })
  } catch (e) {
    console.error('AI email-to-tasks error:', e)
    return NextResponse.json({ error: 'Failed to extract tasks from email' }, { status: 500 })
  }
}
