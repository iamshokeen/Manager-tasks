// src/lib/rbac.ts
import type { Role, User } from '@prisma/client'
import { prisma } from './prisma'

const RBAC_SETTING_KEY = 'rbac_rules'

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

// Lightweight check — takes a role string instead of a full User object.
// Use this in API routes where you have session.user.role (no DB call needed).
export function canRole(role: string, resource: string, action: string): boolean {
  const resourceRules = RESOURCE_RULES[resource]
  if (!resourceRules) return false
  const allowed = resourceRules[action]
  if (!allowed) return false
  return allowed.includes(role as Role)
}

// ─── DB-backed rules ──────────────────────────────────────────────────────────

// Returns the effective RBAC rules: DB overrides merged on top of hardcoded defaults.
export async function getResourceRules(): Promise<Record<string, Record<string, Role[]>>> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: RBAC_SETTING_KEY } })
    if (!setting) return RESOURCE_RULES
    const overrides = JSON.parse(setting.value) as Record<string, Record<string, string[]>>
    // Deep merge: DB rules replace the action arrays for each resource
    const merged: Record<string, Record<string, Role[]>> = { ...RESOURCE_RULES }
    for (const [resource, actions] of Object.entries(overrides)) {
      merged[resource] = { ...(merged[resource] ?? {}), ...Object.fromEntries(
        Object.entries(actions).map(([action, roles]) => [action, roles as Role[]])
      )}
    }
    return merged
  } catch {
    return RESOURCE_RULES
  }
}

// Async version of canRole that reads from DB (with hardcoded fallback).
// Use this in API routes so SUPER_ADMIN can configure permissions live.
export async function canRoleAsync(role: string, resource: string, action: string): Promise<boolean> {
  const rules = await getResourceRules()
  const resourceRules = rules[resource]
  if (!resourceRules) return false
  const allowed = resourceRules[action]
  if (!allowed) return false
  return allowed.includes(role as Role)
}

// Save the full rules object to the DB. Called from /api/admin/rbac.
export async function saveResourceRules(rules: Record<string, Record<string, string[]>>): Promise<void> {
  await prisma.setting.upsert({
    where: { key: RBAC_SETTING_KEY },
    update: { value: JSON.stringify(rules) },
    create: { key: RBAC_SETTING_KEY, value: JSON.stringify(rules) },
  })
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

// ─── Manager-chain visibility (used for Task / Project / Note RBAC v2) ───────
//
// Rule (per 2026-05-14 spec): a user can see/edit any resource owned by
// themselves OR by anyone in their downward manager-chain. SA bypasses.
// Orphans (no manager assigned) are invisible to non-SA.

/**
 * Returns every userId in the downward manager-chain rooted at `rootUserId`,
 * including the root itself. BFS over User.manager self-relation.
 */
export async function getDescendantUserIds(rootUserId: string): Promise<Set<string>> {
  const result = new Set<string>([rootUserId])
  let frontier: string[] = [rootUserId]
  // Cap depth to avoid pathological loops in misconfigured org trees.
  for (let depth = 0; depth < 12 && frontier.length > 0; depth++) {
    const reports = await prisma.user.findMany({
      where: { managerId: { in: frontier }, isActive: true },
      select: { id: true },
    })
    const next: string[] = []
    for (const r of reports) {
      if (!result.has(r.id)) {
        result.add(r.id)
        next.push(r.id)
      }
    }
    frontier = next
  }
  return result
}

/**
 * Returns the set of userIds visible to `viewer`. SA → every active user.
 * Otherwise the downward chain of viewer (incl. viewer).
 */
export async function getVisibleUserIds(viewerUserId: string, viewerRole: string): Promise<Set<string>> {
  if (viewerRole === 'SUPER_ADMIN') {
    const all = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } })
    return new Set(all.map((u) => u.id))
  }
  return getDescendantUserIds(viewerUserId)
}

/**
 * True iff actor can manage target (target sits at or below actor in the chain).
 * SA always true.
 */
export async function canManageUser(actorUserId: string, actorRole: string, targetUserId: string): Promise<boolean> {
  if (actorRole === 'SUPER_ADMIN') return true
  if (actorUserId === targetUserId) return true
  const descendants = await getDescendantUserIds(actorUserId)
  return descendants.has(targetUserId)
}

/**
 * Resolve a TeamMember row to its linked User id, if any.
 * TeamMember.userId is a unique nullable FK populated when invited users
 * adopt an existing member row.
 */
export async function userIdFromTeamMember(teamMemberId: string | null | undefined): Promise<string | null> {
  if (!teamMemberId) return null
  const u = await prisma.user.findUnique({
    where: { teamMemberId },
    select: { id: true },
  })
  return u?.id ?? null
}

/**
 * Permission check used by DELETE /api/tasks/[id].
 * Allowed if: SA, OR task.createdByUserId === actor, OR actor manages the assignee.
 */
export async function canDeleteTask(
  actorUserId: string,
  actorRole: string,
  task: { createdByUserId: string | null; assigneeId: string | null }
): Promise<boolean> {
  if (actorRole === 'SUPER_ADMIN') return true
  if (task.createdByUserId && task.createdByUserId === actorUserId) return true
  if (task.assigneeId) {
    const assigneeUserId = await userIdFromTeamMember(task.assigneeId)
    if (assigneeUserId && (await canManageUser(actorUserId, actorRole, assigneeUserId))) return true
  }
  return false
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
