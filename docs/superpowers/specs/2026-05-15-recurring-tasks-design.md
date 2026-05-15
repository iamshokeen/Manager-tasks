# Recurring Tasks + My Tasks Filters — Design

Date: 2026-05-15

## Goals

1. `/my-tasks` gets the same filter + sort surface as `/tasks`.
2. `/my-tasks` gets a "Show completed" toggle (default OFF).
3. Tasks can be scheduled to repeat — daily, weekly (on selected weekdays),
   or monthly (on a day-of-month or "last day"). A cron generates fresh
   Task rows from the template on each occurrence.

## My Tasks changes

- Reuse the filter panel pattern from `/tasks` (priority chips, due window,
  created window, sort dropdown). No assigned-to/assigned-by here — every
  task on this page is self-assigned by definition.
- Add a "Show completed" toggle (default off) — filters out `status === 'done'`
  client-side when off. When on, completed tasks appear at the bottom of each
  priority group (current "open then done" behavior preserved).

## Recurring tasks — schema

New `RecurringTaskTemplate` model:

```
id                String  @id
title             String
description       String? @db.Text
priority          String  @default("medium")
department        String
assigneeId        String?         // TeamMember
isSelfTask        Boolean @default(false)
projectId         String?
stakeholderId     String?
createdByUserId   String?         // User

frequency         String  // 'daily' | 'weekly' | 'monthly'
interval          Int     @default(1)              // every N units
daysOfWeek        Int[]   @default([])             // 0..6 (weekly only)
dayOfMonth        Int?                             // 1..31 or -1 = last day (monthly only)
dueOffsetDays     Int     @default(0)              // generated task dueDate = runDate + N days

startDate         DateTime
endDate           DateTime?
isActive          Boolean @default(true)
lastGeneratedAt   DateTime?
nextRunAt         DateTime?
```

`Task` adds `fromRecurringId String?` (FK to the template) so we can dedupe
and trace generated rows back to their schedule.

## Generation

`src/lib/services/recurring-tasks.ts`:

- `computeNextRunAt(template, fromDate)` — pure function.
  - daily: `fromDate + interval days`
  - weekly: from fromDate, find next day in `daysOfWeek` within the current
    week; if none, jump by `interval` weeks and pick the first selected day.
  - monthly: from `fromDate`, advance month by `interval`, clamp to
    `dayOfMonth` (or last-day if -1 or month is too short).
- `generateDueTasks()` — loop active templates where `nextRunAt <= now AND
  (endDate IS NULL OR endDate >= now)`. For each:
  1. Create a Task (copy fields, set `fromRecurringId`).
  2. Update template `lastGeneratedAt = nextRunAt`, `nextRunAt =
     computeNextRunAt(template, nextRunAt)`.
  3. If new `nextRunAt > endDate`, set `isActive = false`.

## Cron

- New route `/api/cron/recurring-tasks` (GET). Bearer auth via `CRON_SECRET`.
  Calls `generateDueTasks()`. Add to cron-job.org pointing at this URL daily
  at 00:15 IST.

## API

- `GET  /api/recurring-tasks` — list templates visible to caller (creator,
  manager-of-assignee, or SA — same chain rules).
- `POST /api/recurring-tasks` — SA / Manager / Senior IC / Direct Report can
  create.
- `PATCH/DELETE /api/recurring-tasks/[id]` — creator or SA.

## UI

- New `/schedules` page in sidebar (Work group) — table of templates with
  next-run column, plus create/edit dialog.
- Recurrence config in the dialog:
  - Frequency radio (Daily / Weekly / Monthly)
  - "Every N {unit}" number input
  - If Weekly → Mon/Tue/.../Sun chip toggles
  - If Monthly → "On day N of month" number 1-31 or "Last day" checkbox
  - Start date, optional End date, due offset (days)
- Existing task creators stay unchanged for one-off tasks.

## Out of scope

- Editing a generated task does NOT propagate back to the template.
- Skipping individual occurrences. (Edit/delete the template if needed.)
- Surfacing template metadata on the task detail panel.
