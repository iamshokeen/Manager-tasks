// src/lib/ist-dates.ts
//
// Kairos serves an India-based team. Anything that involves "today /
// this week / this month" must be reckoned in IST (UTC+5:30) — the
// server runs in UTC on Vercel, so using the local Date math
// (getDate / setHours / etc.) silently shifts every boundary by
// 5.5 hours, which means a task marked done in the morning IST can
// fall outside the server's UTC "today" window.
//
// All helpers here take or return UTC `Date` instants — only the
// reasoning is IST-shifted.

export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

export function istParts(anchor: Date): { y: number; m: number; d: number; dow: number } {
  const shifted = new Date(anchor.getTime() + IST_OFFSET_MS)
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth(),
    d: shifted.getUTCDate(),
    dow: shifted.getUTCDay(),
  }
}

export function istMidnight(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - IST_OFFSET_MS)
}

export function istDayBounds(anchor: Date): { start: Date; end: Date } {
  const { y, m, d } = istParts(anchor)
  return {
    start: istMidnight(y, m, d),
    end: new Date(istMidnight(y, m, d + 1).getTime() - 1),
  }
}

export function istWeekBounds(anchor: Date): { start: Date; end: Date } {
  const { y, m, d, dow } = istParts(anchor)
  return {
    start: istMidnight(y, m, d - dow),
    end: new Date(istMidnight(y, m, d - dow + 7).getTime() - 1),
  }
}

export function istMonthBounds(anchor: Date): { start: Date; end: Date } {
  const { y, m } = istParts(anchor)
  return {
    start: istMidnight(y, m, 1),
    end: new Date(istMidnight(y, m + 1, 1).getTime() - 1),
  }
}

export function istDayKey(anchor: Date): string {
  const { y, m, d } = istParts(anchor)
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// Add N IST calendar days to an instant (returns an instant N×24h later;
// IST has no DST so day arithmetic is uniform). Caller-side cells should
// be built from istMidnight(...) so they line up on IST boundaries.
export function addIstDays(anchor: Date, n: number): Date {
  return new Date(anchor.getTime() + n * 86_400_000)
}
