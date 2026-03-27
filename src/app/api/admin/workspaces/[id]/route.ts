// src/app/api/admin/workspaces/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { prisma } from '@/lib/prisma'

// ─── GET: workspace detail ────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                isActive: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        kpiSettings: {
          orderBy: { kpiKey: 'asc' },
        },
        invites: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    return NextResponse.json({ data: workspace })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PATCH: update workspace ──────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    const existing = await prisma.workspace.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    const body = await request.json() as {
      name?: string
      description?: string
      isArchived?: boolean
    }

    const updateData: { name?: string; description?: string; isArchived?: boolean } = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.isArchived !== undefined) updateData.isArchived = body.isArchived

    const workspace = await prisma.workspace.update({
      where: { id },
      data: updateData,
    })

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'workspace_updated',
        metadata: { workspaceId: id, changes: updateData },
      },
    })

    return NextResponse.json({ workspace })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
