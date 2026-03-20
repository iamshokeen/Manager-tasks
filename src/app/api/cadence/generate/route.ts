import { NextResponse } from 'next/server'
import { generatePrepTasks } from '@/lib/services/cadence'

export async function POST(req: Request) {
  try {
    const { cadenceId } = await req.json()
    if (!cadenceId) return NextResponse.json({ error: 'cadenceId is required' }, { status: 400 })
    const count = await generatePrepTasks(cadenceId)
    return NextResponse.json({ created: count })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to generate prep tasks' }, { status: 500 })
  }
}
