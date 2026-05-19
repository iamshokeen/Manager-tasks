# Schedules as Tasks — Design

**Date:** 2026-05-19
**Author:** Kairos team (via Claude)
**Status:** Approved (user delegated — proceed to implementation)

## Problem

The `RecurringTaskTemplate` model already exists, the `/schedules` UI saves
templates, and a daily Vercel cron at `/api/cron/recurring-tasks` is wired to
materialize one `Task` row per due template. But from the user's perspective,
schedules don't reliably "come up as tasks":

1. The first concrete `Task` only appears after the daily cron runs at the
   template's `nextRunAt`.
2. If `CRON_SECRET` isn't configured on Vercel, the cron 401s and nothing
   is ever generated.
3. No way to see upcoming occurrences in the task list / calendar in advance.

## Goal

When the user creates or edits a schedule, every occurrence between
`startDate` and `endDate` (or `startDate` and `startDate + 1 year` if no
end date) appears immediately as a real `Task` row, visible everywhere
the task list and calendar render. Edits sync untouched future tasks.
Deletes remove untouched future tasks. The daily cron becomes a thin
horizon-extender for open-ended schedules.

## Approach (A — bulk pre-generate + sync)

### Data model

No schema changes. Identity for a generated task is the pair
`(fromRecurringId, dueDate)` — already present on `Task`.

A task is **managed by the template** when:

- `fromRecurringId === template.id`, AND
- `status === 'todo'`, AND
- `dueDate > now` (in the future).

Anything else (past, completed, started, or user-edited away from `todo`)
is **user-owned** and never touched by sync logic.

### Generation horizon

- If `template.endDate` is set: generate every occurrence in
  `[startDate, endDate]`.
- If `template.endDate` is null: generate every occurrence in
  `[startDate, now + 365 days]`. The daily cron extends this rolling
  1-year window forward.

### New service function: `syncTemplateTasks(templateId, now)`

Single source of truth for materialization. Used by create, edit, and cron.

1. Load template with current recurrence fields.
2. Compute the full occurrence set `[d1, d2, ..., dn]` over the horizon
   using `computeNextRunAt` iteratively (or a new `computeOccurrences`
   helper for batch).
3. Load existing managed tasks for this template (`fromRecurringId =
   template.id AND status = 'todo' AND dueDate > now`).
4. Diff:
   - **Add:** occurrence dates with no existing managed task.
   - **Update:** existing managed tasks whose template-derived fields
     (title, description, priority, department, assignee, project,
     stakeholder) drifted from the template — bring them in line.
   - **Remove:** managed tasks whose `dueDate` isn't in the new
     occurrence set (e.g., user changed Mon → Tue, future Mondays go).
5. Update `template.nextRunAt` to the earliest future occurrence (or
   null if exhausted) and `template.isActive` accordingly.

Wrapped in a transaction.

### POST /api/recurring-tasks

After creating the template, call `syncTemplateTasks(template.id, now)`
instead of conditionally spawning one task via `spawnFirstNow`. Remove
the `spawnFirstNow` branch from the route — it's redundant.

The `/schedules` page already doesn't pass `spawnFirstNow`, so removing
it has no client impact.

### PATCH /api/recurring-tasks/[id]

After applying the patch, call `syncTemplateTasks(id, now)`. This
handles all edit cases: title change, recurrence change, end-date
change, isActive toggle.

When `isActive` flips to `false`, sync deletes future managed tasks
(treating the schedule as paused — past/touched ones stay).

### DELETE /api/recurring-tasks/[id]

Before deleting the template, delete all managed (todo, future) tasks
for it. Postgres `onDelete: SetNull` for `fromRecurringId` already
preserves touched tasks — they just lose their template link.

### Cron `/api/cron/recurring-tasks`

Rewrite to:

1. Find all active templates.
2. For each, call `syncTemplateTasks(template.id, now)`.

This (a) extends the 1-year horizon by one day on each run, (b)
self-heals any drift, (c) generates today's occurrence if for some
reason it didn't already exist.

Result format stays `{ generated: number, ids: string[] }` for
backwards compat; we sum across templates.

### `computeOccurrences` helper

New pure function in `recurring-tasks.ts`:

```ts
function computeOccurrences(input: RecurrenceInput, horizon: Date): Date[]
```

Iteratively calls `computeNextRunAt` advancing by 1 day each step. Caps
at 5000 iterations as a safety belt.

## Edge cases

- **Daily schedule with no end date:** generates 365 tasks. Acceptable
  per user preference; mitigated by the cron only adding 1/day after.
- **User edits title:** all managed future tasks get the new title.
  Past and started tasks keep their old title. (Reasonable: started
  work is "real" and shouldn't be retroactively renamed.)
- **User drags a generated task's dueDate:** that task's `status` is
  still `todo`, but its `dueDate` no longer matches an occurrence.
  Sync will treat it as drift and delete it on next sync. **Mitigation:**
  drift check uses `(fromRecurringId, dueDate)` pair — a task at a
  non-matching dueDate is "orphan" and we leave it alone (don't delete,
  don't update). Only delete managed tasks whose dueDate matches no
  occurrence AND whose all other fields match the template (i.e.,
  truly untouched).
- **User completes a generated task early:** `status` flips to
  `completed`, falls out of the managed set, sync ignores it.
- **Template paused (isActive=false):** sync deletes managed future
  tasks. Resuming regenerates them.
- **`endDate` shortened:** managed tasks past the new end date are
  removed.

## Testing

- Unit tests for `computeOccurrences` covering daily/weekly/monthly,
  intervals, end dates, last-day-of-month.
- Unit tests for `syncTemplateTasks`:
  - first-time generation
  - edit title → updates only managed tasks
  - change Mon → Tue → adds Tues, removes Mons
  - delete template → removes managed, keeps touched
  - pause → removes managed; resume → restores
- Integration: POST schedule → assert N Task rows created. PATCH →
  assert diff applied. DELETE → assert managed tasks gone, touched
  preserved.

## Files

- `src/lib/services/recurring-tasks.ts` — add `computeOccurrences`,
  `syncTemplateTasks`. Keep existing exports.
- `src/app/api/recurring-tasks/route.ts` — call sync on POST, remove
  `spawnFirstNow` branch.
- `src/app/api/recurring-tasks/[id]/route.ts` — call sync on PATCH,
  delete managed tasks on DELETE.
- `src/app/api/cron/recurring-tasks/route.ts` — iterate active
  templates, call sync each.
- `__tests__/recurring-tasks.test.ts` (new) — unit tests.

## Non-goals

- Calendar UI changes — tasks already render there once they exist.
- Notification changes.
- Template versioning / history.
- Per-occurrence overrides (skipping a specific day, etc.).
