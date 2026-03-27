// src/app/api/kpi/visibility/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { isKpiVisible } from '@/lib/rbac'

const ALL_KPI_KEYS = [
  'revenue_vs_target',
  'ota_gmv',
  'checkin_gmv',
  'task_board',
  'team_pulse',
  'one_on_one_logs',
  'stakeholder_crm',
  'cadence_manager',
]

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const keysParam = url.searchParams.get('keys')
    const workspaceId = url.searchParams.get('workspaceId') ?? undefined
    const keys = keysParam ? keysParam.split(',').map((k) => k.trim()) : ALL_KPI_KEYS

    const visibility: Record<string, boolean> = {}
    await Promise.all(
      keys.map(async (key) => {
        visibility[key] = await isKpiVisible(user, key, workspaceId)
      })
    )

    return NextResponse.json({ visibility })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
