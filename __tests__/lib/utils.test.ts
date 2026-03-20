// __tests__/lib/utils.test.ts
import { isOverdue, isDueToday, isDueSoon } from '@/lib/utils'

// Use fixed dates to avoid flaky tests
describe('isOverdue', () => {
  it('returns true for a past date', () => {
    const yesterday = new Date(Date.now() - 2 * 24 * 3600 * 1000)
    expect(isOverdue(yesterday)).toBe(true)
  })

  it('returns false for a future date', () => {
    const tomorrow = new Date(Date.now() + 2 * 24 * 3600 * 1000)
    expect(isOverdue(tomorrow)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isOverdue(null)).toBe(false)
  })
})

describe('isDueSoon', () => {
  it('returns true for a date within 24 hours', () => {
    const inTwelveHours = new Date(Date.now() + 12 * 3600 * 1000)
    expect(isDueSoon(inTwelveHours)).toBe(true)
  })

  it('returns false for a date more than 24 hours away', () => {
    const in48Hours = new Date(Date.now() + 48 * 3600 * 1000)
    expect(isDueSoon(in48Hours)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isDueSoon(null)).toBe(false)
  })

  it('returns false for a past date', () => {
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000)
    expect(isDueSoon(yesterday)).toBe(false)
  })
})

describe('isDueToday', () => {
  it('returns false for null', () => {
    expect(isDueToday(null)).toBe(false)
  })

  it('returns false for yesterday', () => {
    const yesterday = new Date(Date.now() - 2 * 24 * 3600 * 1000)
    expect(isDueToday(yesterday)).toBe(false)
  })
})
