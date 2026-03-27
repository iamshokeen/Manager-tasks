// src/lib/rate-limit.ts
// In-memory rate limiter for /api/auth/* routes.
// Note: stateless across Vercel invocations — effective within a single warm instance.
// For production multi-instance deployments, replace with Upstash Redis.

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_REQUESTS = 5

// Tighter limit for OTP verify attempts — 5 attempts per 15 min per IP.
// Also invalidate OTP after too many failed attempts (handled in verify-login route).
const OTP_VERIFY_MAX = 5
const OTP_VERIFY_WINDOW_MS = 15 * 60 * 1000

function pruneExpired() {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key)
  }
}

function check(key: string, max: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
  pruneExpired()
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs }
  }

  entry.count += 1
  const remaining = Math.max(0, max - entry.count)
  return {
    allowed: entry.count <= max,
    remaining,
    resetAt: entry.resetAt,
  }
}

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  return check(`auth:${ip}`, MAX_REQUESTS, WINDOW_MS)
}

export function checkOtpVerifyLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  return check(`otp-verify:${ip}`, OTP_VERIFY_MAX, OTP_VERIFY_WINDOW_MS)
}

export function resetOtpVerifyLimit(ip: string) {
  store.delete(`otp-verify:${ip}`)
}

export function getRateLimitIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}
