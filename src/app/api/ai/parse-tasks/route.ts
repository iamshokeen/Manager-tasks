// src/app/api/ai/parse-tasks/route.ts
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { text } = await req.json()
    if (!text?.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    // Fetch context: team members, departments, stakeholders
    const [members, settings] = await Promise.all([
      prisma.teamMember.findMany({
        where: { status: 'active' },
        select: { id: true, name: true, role: true, department: true },
      }),
      prisma.setting.findUnique({ where: { key: 'departments' } }),
    ])

    const departments: string[] = settings?.value
      ? JSON.parse(settings.value)
      : ['Analytics', 'Revenue', 'OTA', 'Marketing', 'Financial Modelling', 'Program Management']

    const assignedByName = (session.user as { name?: string }).name ?? 'Saksham'

    const systemPrompt = `You are a task-extraction assistant for ${assignedByName}, a people manager.
Your job is to parse natural language input and extract actionable tasks.

TEAM MEMBERS (use exact IDs):
${members.map(m => `- id: "${m.id}" | name: "${m.name}" | role: ${m.role} | dept: ${m.department}`).join('\n')}

DEPARTMENTS: ${departments.join(', ')}

PRIORITIES: urgent, high, medium, low

TODAY'S DATE: ${new Date().toISOString().split('T')[0]}

Rules:
- Extract every distinct task or action item from the input
- Match assignees by name (case-insensitive, partial match ok) to the team member list
- If no assignee mentioned, leave assigneeId null
- Infer department from assignee's dept or from context; default to "Program Management"
- Infer priority from urgency words (urgent/asap/critical → urgent, important → high, default → medium)
- Parse relative due dates (today, tomorrow, next Friday, end of week, etc.) to ISO date strings
- If no due date mentioned, leave dueDate null
- Keep titles concise (max 80 chars), put detail in description
- isSelfTask: true ONLY if the task is for the manager themselves (${assignedByName})

Return ONLY a JSON object in this exact shape, no markdown, no explanation:
{
  "tasks": [
    {
      "title": "string",
      "description": "string or null",
      "assigneeId": "string or null",
      "assigneeName": "string or null",
      "isSelfTask": false,
      "department": "string",
      "priority": "urgent|high|medium|low",
      "dueDate": "YYYY-MM-DD or null"
    }
  ]
}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: text,
        },
      ],
      system: systemPrompt,
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''

    // Strip any accidental markdown fences
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(jsonStr)

    return NextResponse.json({
      tasks: parsed.tasks,
      assignedByName,
    })
  } catch (e) {
    console.error('AI parse-tasks error:', e)
    return NextResponse.json({ error: 'Failed to parse tasks' }, { status: 500 })
  }
}
