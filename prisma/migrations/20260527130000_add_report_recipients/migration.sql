-- Per-user daily-brief routing + auto-send schedule.
ALTER TABLE "User"
  ADD COLUMN "reportEmail"     TEXT,
  ADD COLUMN "reportPhone"     TEXT,
  ADD COLUMN "reportSchedule"  TEXT NOT NULL DEFAULT 'off',
  ADD COLUMN "reportHourIst"   INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN "reportMinuteIst" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reportWeekday"   INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "reportChannels"  TEXT NOT NULL DEFAULT 'email';
