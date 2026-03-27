// src/lib/rbac.ts
import type { Role, User } from '@prisma/client'
import { prisma } from './prisma'

// ─── Resource access rules ────────────────────────────────────────────────────

const RESOURCE_RULES: Record<string, Record<string, Role[]>> = {
  revenue: {
    view: ['SUPER_ADMIN', 'MANAGER', 'SENIOR_IC', 'DIRECT_REPORT', 'EXEC_VIEWER', 'GUEST'],
    edit: ['SUPER_ADMIN', 'MANAGER'],
  },
  tasks: {
    view: ['SUPER_ADMIN', 'MANAGER', 'SENIOR_IC', 'DIRECT_REPORT', 'EXEC_VIEWER', 'GUEST'],
    create: ['SUPER_ADMIN', 'MANAGER', 'SENIOR_IC', 'DIRECT_REPORT'],
    edit: ['SUPER_ADMIN', 'MANAGER', 'SENIOR_IC', 'DIRECT_REPORT'],
    delete: ['SUPER_ADMIN', 'MANAGER'],
  },
  one_on_ones: {
    view: ['SUPER_ADMIN', 'MANAGER', 'SENIOR_IC', 'DIRECT_REPORT'],
    create: ['SUPER_ADMIN', 'MANAGER'],
    edit: ['SUPER_ADMIN', 'MANAGER'],
    delete: ['SUPER_ADMIN', 'MANAGER'],
  },
  team_pulse: {
    view: ['SUPER_ADMIN', 'MANAGER'],
    edit: ['SUPER_ADMIN', 'MANAGER'],
  },
  stakeholder_crm: {
    view: ['SUPER_ADMIN', 'MANAGER', 'SENIOR_IC'],
    edit: ['SUPER_ADMIN', 'MANAGER'],
  },
  users: {
    view: ['SUPER_ADMIN'],
    edit: ['SUPER_ADMIN'],
  },
  admin: {
    view: ['SUPER_ADMIN'],
    edit: ['SUPER_ADMIN'],
    create: ['SUPER_ADMIN'],
    delete: ['SUPER_ADMIN'],
  },
}

export function canAccess(user: User, resource: string, action: string): boolean {
  const resourceRules = RESOURCE_RULES[resource]
  if (!resourceRules) return false
  const allowed = resourceRules[action]
  if (!allowed) return false
  return allowed.includes(user.role)
}

// ─── Scope WHERE clause ───────────────────────────────────────────────────────

export type ScopeResult =
  | { type: 'all' }
  | { type: 'team'; userIds: string[] }
  | { type: 'self'; userId: string }
  | { type: 'summary' }

export async function getScopeResult(user: User): Promise<ScopeResult> {
  if (user.role === 'SUPER_ADMIN') {
    return { type: 'all' }
  }

  if (user.role === 'MANAGER') {
    const reports = await prisma.user.findMany({
      where: { managerId: user.id },
      select: { id: true },
    })
    return { type: 'team', userIds: [user.id, ...reports.map((r) => r.id)] }
  }

  if (user.role === 'SENIOR_IC' || user.role === 'DIRECT_REPORT') {
    return { type: 'self', userId: user.id }
  }

  return { type: 'summary' }
}

// Returns a Prisma-compatible WHERE clause fragment keyed by userId field
export async function scopeWhereClause(
  user: User,
  userIdField = 'userId'
): Promise<Record<string, unknown>> {
  const scope = await getScopeResult(user)

  if (scope.type === 'all') return {}
  if (scope.type === 'team') return { [userIdField]: { in: scope.userIds } }
  if (scope.type === 'self') return { [userIdField]: scope.userId }
  // summary — no rows by default; caller must handle
  return { id: 'NONE_EXEC_VIEWER' }
}

// ─── KPI visibility ───────────────────────────────────────────────────────────

const DEFAULT_KPI_VISIBILITY: Record<string, Role[]> = {
  revenue_vs_target: ['SUPER_ADMIN', 'MANAGER', 'SENIOR_IC', 'DIRECT_REPORT'],
  ota_gmv: ['SUPER_ADMIN', 'MANAGER'],
  checkin_gmv: ['SUPER_ADMIN', 'MANAGER'],
  task_board: ['SUPER_ADMIN', 'MANAGER', 'SENIOR_IC', 'DIRECT_REPORT'],
  team_pulse: ['SUPER_ADMIN', 'MANAGER'],
  one_on_one_logs: ['SUPER_ADMIN', 'MANAGER', 'DIRECT_REPORT'],
  stakeholder_crm: ['SUPER_ADMIN', 'MANAGER', 'SENIOR_IC'],
  cadence_manager: ['SUPER_ADMIN', 'MANAGER'],
}

export async function isKpiVisible(
  user: User,
  kpiKey: string,
  workspaceId?: string
): Promise<boolean> {
  // 1. Per-user override
  const override = await prisma.kpiVisibility.findUnique({
    where: { userId_kpiKey: { userId: user.id, kpiKey } },
  })
  if (override !== null) return override.isVisible

  // 2. Workspace-level KPI setting
  if (workspaceId) {
    const setting = await prisma.kpiSetting.findUnique({
      where: { workspaceId_kpiKey: { workspaceId, kpiKey } },
    })
    if (setting) return setting.visibleTo.includes(user.role)
  }

  // 3. Default role-based visibility
  const defaultRoles = DEFAULT_KPI_VISIBILITY[kpiKey]
  if (!defaultRoles) return false
  return defaultRoles.includes(user.role)
}
