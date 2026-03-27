// src/app/api/admin/workspaces/[id]/kpi-settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { prisma } from '@/lib/prisma'
import type { Role } from '@prisma/client'

interface KpiSettingInput {
  kpiKey: string
  visibleTo: Role[]
}

interface KpiOverrideInput {
  userId: string
  kpiKey: string
  isVisible: boolean
}

type RequestBody =
  | { type: 'settings'; settings: KpiSettingInput[] }
  | { type: 'overrides'; overrides: KpiOverrideInput[] }

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id: workspaceId } = await params

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    const body = await request.json() as RequestBody

    if (!body.type) {
      return NextResponse.json({ error: 'type is required ("settings" or "overrides")' }, { status: 400 })
    }

    // ── KPI Settings: workspace-level role visibility ──────────────────────────

    if (body.type === 'settings') {
      if (!Array.isArray(body.settings) || body.settings.length === 0) {
        return NextResponse.json({ error: 'settings array is required and must not be empty' }, { status: 400 })
      }

      const upsertOps = body.settings.map((s: KpiSettingInput) =>
        prisma.kpiSetting.upsert({
          where: {
            workspaceId_kpiKey: {
              workspaceId,
              kpiKey: s.kpiKey,
            },
          },
          update: { visibleTo: s.visibleTo },
          create: {
            workspaceId,
            kpiKey: s.kpiKey,
            visibleTo: s.visibleTo,
          },
        })
      )

      const settings = await prisma.$transaction(upsertOps)

      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'kpi_settings_updated',
          metadata: {
            workspaceId,
            keys: body.settings.map((s: KpiSettingInput) => s.kpiKey),
          },
        },
      })

      return NextResponse.json({ settings })
    }

    // ── KPI Overrides: per-user visibility overrides ───────────────────────────

    if (body.type === 'overrides') {
      if (!Array.isArray(body.overrides) || body.overrides.length === 0) {
        return NextResponse.json({ error: 'overrides array is required and must not be empty' }, { status: 400 })
      }

      const upsertOps = body.overrides.map((o: KpiOverrideInput) =>
        prisma.kpiVisibility.upsert({
          where: {
            userId_kpiKey: {
              userId: o.userId,
              kpiKey: o.kpiKey,
            },
          },
          update: { isVisible: o.isVisible },
          create: {
            userId: o.userId,
            kpiKey: o.kpiKey,
            isVisible: o.isVisible,
          },
        })
      )

      await prisma.$transaction(upsertOps)

      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'kpi_overrides_updated',
          metadata: {
            workspaceId,
            count: body.overrides.length,
          },
        },
      })

      return NextResponse.json({ message: 'Saved' })
    }

    return NextResponse.json({ error: 'Invalid type. Use "settings" or "overrides"' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
