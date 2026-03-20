// src/app/api/tasks/[id]/activity/route.ts
import { NextResponse } from 'next/server'
import { getTaskActivity, logActivity } from '@/lib/services/tasks'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const activities = await getTaskActivity(id)
    return NextResponse.json({ data: activities })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { note } = await req.json()
    if (!note) return NextResponse.json({ error: 'note is required' }, { status: 400 })
    const activity = await logActivity(id, 'comment', undefined, undefined, note)
    return NextResponse.json({ data: activity }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 })
  }
}
