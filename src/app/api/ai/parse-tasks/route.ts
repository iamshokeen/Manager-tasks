// src/app/api/ai/parse-tasks/route.ts
// Uses GPT-4o mini — strict task extraction only, ~$0.0003 per call
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

    const { text } = await req.json()
    if (!text?.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }
    // Hard cap on input length to bound cost
    if (text.length > 2000) {
      return NextResponse.json({ error: 'Input too long (max 2000 chars)' }, { status: 400 })
    }

    const [members, settings] = await Promise.all([
      prisma.teamMember.findMany({
        where: { status: 'active' },
        select: { id: true, name: true, department: true },
      }),
      prisma.setting.findUnique({ where: { key: 'departments' } }),
    ])

    const departments: string[] = settings?.value
      ? JSON.parse(settings.value)
      : ['Analytics', 'Revenue', 'OTA', 'Marketing', 'Financial Modelling', 'Program Management']

    const assignedByName = (session.user as { name?: string }).name ?? 'Saksham'
    const today = new Date().toISOString().split('T')[0]

    const systemPrompt = `You are a task-extraction function. You ONLY extract action items from text and return JSON. You do NOT answer questions, give advice, or do any analysis. If the input is not task-related text, return {"tasks":[]}.

TEAM (use exact IDs):
${members.map(m => `${m.name} → id:"${m.id}" dept:${m.department}`).join('\n')}

DEPARTMENTS: ${departments.join(', ')}
TODAY: ${today}
ASSIGNER: ${assignedByName}

Output ONLY this JSON (no markdown):
{"tasks":[{"title":"string","description":"string|null","assigneeId":"string|null","assigneeName":"string|null","isSelfTask":false,"department":"string","priority":"urgent|high|medium|low","dueDate":"YYYY-MM-DD|null"}]}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 800,       // hard cap — caps output cost at ~$0.00048
      temperature: 0,        // deterministic, no creativity needed
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? ''
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(jsonStr)

    // Log token usage for monitoring
    const usage = completion.usage
    if (usage) {
      const cost = (usage.prompt_tokens * 0.00000015) + (usage.completion_tokens * 0.0000006)
      console.log(`[ai/parse-tasks] tokens: ${usage.prompt_tokens}in + ${usage.completion_tokens}out = $${cost.toFixed(6)}`)
    }

    return NextResponse.json({ tasks: parsed.tasks, assignedByName })
  } catch (e) {
    console.error('AI parse-tasks error:', e)
    return NextResponse.json({ error: 'Failed to parse tasks' }, { status: 500 })
  }
}
