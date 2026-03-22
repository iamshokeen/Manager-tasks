// src/lib/services/numbers.ts
import { prisma } from '@/lib/prisma'
import { getCurrentWeekPeriod, getCurrentMonthPeriod } from '@/lib/format'

export async function getCurrentMetrics() {
  const weekPeriod = getCurrentWeekPeriod()
  const monthPeriod = getCurrentMonthPeriod()

  const [weekly, monthly] = await Promise.all([
    prisma.numberEntry.findMany({ where: { period: weekPeriod } }),
    prisma.numberEntry.findMany({ where: { period: monthPeriod } }),
  ])

  return { weekly, monthly }
}

export async function upsertMetric(metric: string, value: number, period: string, source = 'manual') {
  return prisma.numberEntry.upsert({
    where: { metric_period: { metric, period } },
    update: { value, source, syncedAt: new Date() },
    create: { metric, value, period, source, syncedAt: new Date() },
  })
}

export async function syncFromSheets(): Promise<number> {
  const url = process.env.SHEETS_SCRIPT_URL
  const token = process.env.SHEETS_SCRIPT_TOKEN
  if (!url || !token) throw new Error('SHEETS_SCRIPT_URL and SHEETS_SCRIPT_TOKEN must be set')

  const res = await fetch(`${url}?action=getMetrics&token=${token}`)
  if (!res.ok) throw new Error(`Sheets sync failed: ${res.statusText}`)

  const json = await res.json()
  if (!Array.isArray(json.metrics)) throw new Error('Sheets sync: invalid response — expected metrics array')

  const valid = json.metrics.filter((entry: any) => {
    if (typeof entry.metric !== 'string' || typeof entry.value !== 'number' || typeof entry.period !== 'string') {
      console.warn('Sheets sync: skipping malformed entry', entry)
      return false
    }
    return true
  })

  await Promise.all(valid.map((entry: any) => upsertMetric(entry.metric, entry.value, entry.period, 'sheets')))
  return valid.length
}
