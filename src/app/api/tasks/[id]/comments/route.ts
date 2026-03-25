// src/app/api/tasks/[id]/comments/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const activities = await prisma.taskActivity.findMany({
      where: { taskId: id, type: 'comment' },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ activities })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { note, authorName } = await req.json()
    if (!note) return NextResponse.json({ error: 'note is required' }, { status: 400 })
    const activity = await prisma.taskActivity.create({
      data: {
        taskId: id,
        type: 'comment',
        note,
        authorName: authorName ?? null,
        source: 'user',
      },
    })
    return NextResponse.json({ activity }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}
