// src/app/api/tasks/[id]/activity/route.ts
import { NextResponse } from 'next/server'
import { getTaskActivity, logActivity } from '@/lib/services/tasks'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const activities = await getTaskActivity(id)
  return NextResponse.json({ data: activities })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { note } = await req.json()
  if (!note) return NextResponse.json({ error: 'note is required' }, { status: 400 })
  const activity = await logActivity(id, 'comment', undefined, undefined, note)
  return NextResponse.json({ data: activity }, { status: 201 })
}
