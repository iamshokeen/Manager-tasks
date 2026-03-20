// __tests__/lib/format.test.ts
import { formatCrore, formatLakh, formatIndianCurrency, formatPeriod, getCurrentWeekPeriod, getCurrentMonthPeriod } from '@/lib/format'

describe('formatCrore', () => {
  it('formats a crore value', () => {
    expect(formatCrore(850000000)).toBe('₹85 Cr')
  })
  it('formats decimal crores', () => {
    expect(formatCrore(624000000)).toBe('₹62.4 Cr')
  })
  it('formats values under 1 crore as lakhs', () => {
    expect(formatCrore(5000000)).toBe('₹50 L')
  })
})

describe('formatLakh', () => {
  it('formats a lakh value', () => {
    expect(formatLakh(5000000)).toBe('₹50 L')
  })
})

describe('formatIndianCurrency', () => {
  it('formats a large number in Indian notation', () => {
    const result = formatIndianCurrency(10000000)
    expect(result).toBe('1,00,00,000')
  })
})

describe('formatPeriod', () => {
  it('formats a week period', () => {
    expect(formatPeriod('2026-W12')).toBe('Week 12, 2026')
  })
  it('formats a month period', () => {
    expect(formatPeriod('2026-03')).toBe('March 2026')
  })
})

describe('getCurrentWeekPeriod', () => {
  it('returns a valid week period string', () => {
    const result = getCurrentWeekPeriod()
    expect(result).toMatch(/^\d{4}-W\d{2}$/)
  })
})

describe('getCurrentMonthPeriod', () => {
  it('returns a valid month period string', () => {
    const result = getCurrentMonthPeriod()
    expect(result).toMatch(/^\d{4}-\d{2}$/)
  })
})
