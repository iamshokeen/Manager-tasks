// src/app/api/ai/summarize/route.ts
// GPT-4o mini — ~$0.0001 per call (300 token output cap)
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getSession } from '@/lib/auth'

const SYSTEM = `You are a summarizer. Return a concise bullet-point summary of the input text. Use 3-5 bullets max. Each bullet starts with "• ". No intro, no outro, just bullets. If the input is too short to summarize (under 100 chars), return the original text unchanged.`

export async function POST(req: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { text } = await req.json()
    if (!text?.trim()) return NextResponse.json({ error: 'text is required' }, { status: 400 })
    if (text.length > 4000) return NextResponse.json({ error: 'Input too long (max 4000 chars)' }, { status: 400 })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: text },
      ],
    })

    const summary = completion.choices[0]?.message?.content?.trim() ?? ''

    const usage = completion.usage
    if (usage) {
      const cost = (usage.prompt_tokens * 0.00000015) + (usage.completion_tokens * 0.0000006)
      console.log(`[ai/summarize] tokens: ${usage.prompt_tokens}in + ${usage.completion_tokens}out = $${cost.toFixed(6)}`)
    }

    return NextResponse.json({ summary })
  } catch (e) {
    console.error('AI summarize error:', e)
    return NextResponse.json({ error: 'Failed to summarize' }, { status: 500 })
  }
}
