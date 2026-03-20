// src/lib/format.ts
const CRORE = 10000000  // 1,00,00,000
const LAKH = 100000     // 1,00,000

export function formatCrore(value: number): string {
  if (value >= CRORE) {
    const crores = value / CRORE
    return `₹${crores % 1 === 0 ? crores : crores.toFixed(1)} Cr`
  }
  const lakhs = value / LAKH
  return `₹${lakhs % 1 === 0 ? lakhs : lakhs.toFixed(1)} L`
}

export function formatLakh(value: number): string {
  const lakhs = value / LAKH
  return `₹${lakhs % 1 === 0 ? lakhs : lakhs.toFixed(2)} L`
}

export function formatIndianCurrency(value: number): string {
  const str = Math.floor(value).toString()
  if (str.length <= 3) return str
  const last3 = str.slice(-3)
  const rest = str.slice(0, -3)
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3
}

export function formatPeriod(period: string): string {
  if (period.includes('-W')) {
    const [year, week] = period.split('-W')
    return `Week ${week}, ${year}`
  }
  const [year, month] = period.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
}

export function getCurrentWeekPeriod(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`
}

export function getCurrentMonthPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
