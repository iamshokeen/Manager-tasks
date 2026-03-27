import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const { content, authorName } = await req.json()
    if (!content?.trim()) return NextResponse.json({ error: 'content is required' }, { status: 400 })

    const [note] = await prisma.$transaction([
      prisma.followUpNote.create({
        data: {
          followUpId: id,
          content: content.trim(),
          authorName: authorName ?? null,
        },
      }),
      prisma.followUp.update({
        where: { id },
        data: { lastActivityAt: new Date() },
      }),
    ])

    return NextResponse.json({ data: note }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 })
  }
}
