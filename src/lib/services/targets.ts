// src/lib/services/targets.ts
import { prisma } from '@/lib/prisma'
import { parse } from 'papaparse'

const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
const MONTH_COLS: Record<string, number> = {
  Apr: 5, May: 6, Jun: 7, Jul: 8, Aug: 9, Sep: 10,
  Oct: 11, Nov: 12, Dec: 13, Jan: 14, Feb: 15, Mar: 16,
}

export interface TargetData {
  ota: {
    leads:    Record<string, number>  // month -> target
    bookings: Record<string, number>
    revenue:  Record<string, number>
    ytd: { leads: number; bookings: number; revenue: number }
  }
  checkin: {
    total:      Record<string, number>
    goa:        Record<string, number>
    maharashtra: Record<string, number>
    north:      Record<string, number>  // Uttarakhand
    ytd: { total: number; goa: number; maharashtra: number; north: number }
  }
}

function parseNum(v: string): number {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}

export function parseTargetsCsv(csvText: string): TargetData {
  const result = parse<string[]>(csvText, { skipEmptyLines: false })
  const rows = result.data

  const ota: TargetData['ota'] = {
    leads: {}, bookings: {}, revenue: {},
    ytd: { leads: 0, bookings: 0, revenue: 0 }
  }
  const checkin: TargetData['checkin'] = {
    total: {}, goa: {}, maharashtra: {}, north: {},
    ytd: { total: 0, goa: 0, maharashtra: 0, north: 0 }
  }

  for (const row of rows) {
    if (!row || row.length < 17) continue
    const region = String(row[0]).trim()
    const metric = String(row[2]).trim()
    const source = String(row[4]).trim()

    // Normalize metric name
    const metricKey = metric.startsWith('Gross Revenue') ? 'Gross Revenue' : metric

    // OTA rows: source === "OTA"
    if (source === 'OTA') {
      for (const [month, col] of Object.entries(MONTH_COLS)) {
        const val = parseNum(String(row[col]))
        if (metricKey === 'Leads') {
          ota.leads[month] = (ota.leads[month] || 0) + val
        } else if (metricKey === 'Bookings') {
          ota.bookings[month] = (ota.bookings[month] || 0) + val
        } else if (metricKey === 'Gross Revenue') {
          ota.revenue[month] = (ota.revenue[month] || 0) + val
        }
      }
    }

    // Check-in GMV: Grand Total row (source === "Grand Total") or regional totals
    if (metricKey === 'Gross Revenue') {
      if (source === 'Grand Total' && region === 'Total') {
        for (const [month, col] of Object.entries(MONTH_COLS)) {
          checkin.total[month] = parseNum(String(row[col]))
        }
      } else if (source === 'Total') {
        const r = region.toLowerCase()
        for (const [month, col] of Object.entries(MONTH_COLS)) {
          const val = parseNum(String(row[col]))
          if (r === 'goa') checkin.goa[month] = val
          else if (r === 'maharashtra') checkin.maharashtra[month] = val
          else if (r === 'uttarakhand') checkin.north[month] = val
        }
      }
    }
  }

  // Compute YTD (sum of all months)
  for (const month of MONTHS) {
    ota.ytd.leads    += ota.leads[month]    || 0
    ota.ytd.bookings += ota.bookings[month] || 0
    ota.ytd.revenue  += ota.revenue[month]  || 0
    checkin.ytd.total       += checkin.total[month]       || 0
    checkin.ytd.goa         += checkin.goa[month]         || 0
    checkin.ytd.maharashtra += checkin.maharashtra[month] || 0
    checkin.ytd.north       += checkin.north[month]       || 0
  }

  return { ota, checkin }
}

export async function getTargets(): Promise<TargetData | null> {
  const setting = await prisma.setting.findUnique({ where: { key: 'targets' } })
  if (!setting) return null
  return JSON.parse(setting.value) as TargetData
}

export async function saveTargets(csvText: string): Promise<TargetData> {
  const data = parseTargetsCsv(csvText)
  await prisma.setting.upsert({
    where: { key: 'targets' },
    update: { value: JSON.stringify(data) },
    create: { key: 'targets', value: JSON.stringify(data) },
  })
  return data
}
