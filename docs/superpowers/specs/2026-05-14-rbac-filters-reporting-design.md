# RBAC, Task Filters, and Reporting Rewrite — Design

Date: 2026-05-14
Author: Saksham (drafted with Claude)

## Goals

1. Notes can be marked **personal** or **team** (workspace-wide).
2. Project creation gated to **Super Admin + Manager**; everyone else can still contribute tasks inside existing projects.
3. Task visibility follows the **manager-chain hierarchy** (User.manager). Above sees below; below can't see above. SA bypasses everything; orphans (no manager) are invisible to non-SA.
4. Hide revenue / metrics / current-reports UI from sidebar and route entry points (preserve the code for later).
5. Replace the existing `/reports` implementation with a **people-wise daily/weekly/monthly activity report** (tasks created/completed, comments, status changes, projects).
6. Tasks page: sort and filter by priority, due date, created date, days-until-due, assigned-by, assigned-to, department, stakeholder.
7. Task creator can delete their own task. SA and managers-of-assignee can also delete.

Three sequential PRs:
- **Spec A** — RBAC bundle (notes visibility, project gate, chain-based task visibility, creator delete).
- **Spec B** — Task filters/sorts.
- **Spec C** — Hide existing reports/metrics + new people-wise reports.

---

## Spec A — RBAC

### Schema deltas

- `Note.visibility String @default("personal")` — values: `personal` | `team`.
- `Task.createdByUserId` — already exists, reuse.
- `User.managerId` self-relation — already exists, reuse.
- `TeamMember.user` 1:1 — already exists, reuse.

Apply with `prisma db push`.

### `src/lib/rbac.ts`

```
getDescendantUserIds(rootUserId: string): Promise<Set<string>>
  // BFS over User.manager. Includes root.

getVisibleUserIds(viewerUserId: string, viewerRole: Role): Promise<Set<string>>
  // SA -> all user IDs (active).
  // Else -> getDescendantUserIds(viewerUserId).

canManageUser(actorUserId, actorRole, targetUserId): Promise<boolean>
  // SA always true. Else target in descendants of actor.

canDeleteTask(actorUserId, actorRole, task): Promise<boolean>
  // SA OR createdByUserId === actor OR (assignee.user exists AND canManageUser).
```

### Notes

- `GET /api/notes` returns notes where `userId === me` OR `visibility === 'team'`.
- `POST` accepts `visibility`. Default `personal`.
- `PATCH` / `DELETE` — owner only.
- UI: pill toggle next to each note. Read-only when not owner; "by {name}" badge.

### Project creation gate

- `POST /api/projects` — 403 unless `role ∈ {SUPER_ADMIN, MANAGER}`.
- `DELETE /api/projects/[id]` — 403 unless SA or `createdByUserId === me`.
- `/projects` page: hide "Start a Project" button when role disallows.

### Task visibility / delete

- `GET /api/tasks`: filter to tasks where assignee.user IN `getVisibleUserIds(me)` OR `createdByUserId IN visibleIds` OR `assignee.user is null AND createdByUserId === me`.
- `GET /api/tasks/[id]`: same gate, else 404.
- `PATCH /api/tasks/[id]`: must be visible AND (assignee/creator/manager/SA).
- `DELETE /api/tasks/[id]`: `canDeleteTask`.
- UI: surface delete in task detail panel only when permitted.

---

## Spec B — Task filters + sorts

### UI

`/tasks` page filter bar gets a chevron-collapse "More filters" pop-over with:

- Priority (multi-select: urgent/high/medium/low)
- Department (existing select, retained)
- Assigned to (multi-select: team members, "me", "unassigned")
- Assigned by (multi-select: users)
- Stakeholder (multi-select)
- Due window: any / overdue / today / this week / this month / no date
- Created window: any / today / this week / this month
- Sort by: due date asc, due date desc, priority desc, created desc, created asc, time-until-due, title

State stored in URL query params so filters survive reload and can be shared.

### Backend

- Extend `useTasks` filter shape + `/api/tasks` GET to accept the new params and translate to Prisma `where` / `orderBy`. Existing search and dept filters retained.

---

## Spec C — Hide existing, build new reports

### Hide (preserve code)

Sidebar (`src/components/layout/sidebar.tsx`) — drop the entries:
- REVENUE group (Metrics, Channel Pulse, Check-in GMV)
- Old "Reports" entry under REPORTS (replaced).

Routes under `/metrics`, `/assessment`, `/playbook` remain intact (typing the URL still loads them). Just removed from nav.

### New `/reports`

Replaces the existing page. People-wise activity report.

- Tab strip: **Daily** / **Weekly** / **Monthly** (default Weekly).
- Date selector (defaults to current period).
- One row per visible user (chain-scoped via `getVisibleUserIds`).
- Columns:
  - **Tasks created** (count + drilldown)
  - **Tasks completed** (count)
  - **Tasks in progress** (count)
  - **Tasks overdue** (count, red)
  - **Comments / activity** (count from TaskActivity)
  - **Projects active** (count of projects with at least one of their tasks touched in period)
- Click row → expand to show task titles + statuses.
- Export to CSV.

Old report API routes (`/api/reports/*`) — deleted. Old `/app/reports/*` page — replaced. The Email report cron (weekly digest) stays — it has its own logic.

### Data

Driven by:
- `Task.createdAt`, `Task.completedAt`, `Task.status` within period.
- `TaskActivity.createdAt` within period for "comments / activity".
- `Project.tasks` join for projects-active.

No new tables.

---

## Out of scope (deferred)

- Hierarchy visibility for 1:1s, follow-ups, stakeholders, cadences — they stay as-is.
- KPI / metrics permission rework — KPI module preserved but unused while hidden.
- Notes editing by non-owners when team — owner-only edit kept.
