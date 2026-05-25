-- AlterTable
ALTER TABLE "Task" ADD COLUMN "startDate" TIMESTAMP(3),
                  ADD COLUMN "endDate"   TIMESTAMP(3);

-- Backfill: for existing tasks with a dueDate, treat the dueDate as both
-- the start and the end so legacy rows render as a single-day block in the
-- calendar. Tasks without a dueDate stay null on both sides.
UPDATE "Task" SET "startDate" = "dueDate", "endDate" = "dueDate" WHERE "dueDate" IS NOT NULL;

-- Index for range queries on the calendar.
CREATE INDEX "Task_startDate_endDate_idx" ON "Task" ("startDate", "endDate");
