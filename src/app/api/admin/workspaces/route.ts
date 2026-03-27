// src/app/api/admin/workspaces/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { prisma } from '@/lib/prisma'
import type { WorkspaceType } from '@prisma/client'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
}

async function uniqueSlug(base: string): Promise<string> {
  const existing = await prisma.workspace.findUnique({ where: { slug: base } })
  if (!existing) return base
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}-${suffix}`
}

// ─── GET: list all workspaces ─────────────────────────────────────────────────

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const workspaces = await prisma.workspace.findMany({
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const formatted = workspaces.map((ws) => ({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      type: ws.type,
      description: ws.description,
      isArchived: ws.isArchived,
      createdBy: ws.createdBy,
      createdAt: ws.createdAt,
      updatedAt: ws.updatedAt,
      memberCount: ws._count.members,
    }))

    return NextResponse.json({ workspaces: formatted })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST: create workspace ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as {
      name: string
      type: WorkspaceType
      description?: string
    }

    if (!body.name || !body.type) {
      return NextResponse.json({ error: 'name and type are required' }, { status: 400 })
    }

    const slug = await uniqueSlug(toSlug(body.name))

    const workspace = await prisma.workspace.create({
      data: {
        name: body.name,
        slug,
        type: body.type,
        description: body.description ?? null,
        createdBy: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'SUPER_ADMIN',
          },
        },
      },
      include: {
        members: true,
        _count: { select: { members: true } },
      },
    })

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'workspace_created',
        metadata: { workspaceId: workspace.id, name: workspace.name },
      },
    })

    return NextResponse.json({ workspace }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
