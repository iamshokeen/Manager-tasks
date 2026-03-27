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

// Prune expired entries periodically to avoid memory leaks
function pruneExpired() {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key)
  }
}

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  pruneExpired()
  const now = Date.now()
  const key = `auth:${ip}`
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt: now + WINDOW_MS }
  }

  entry.count += 1
  const remaining = Math.max(0, MAX_REQUESTS - entry.count)
  return {
    allowed: entry.count <= MAX_REQUESTS,
    remaining,
    resetAt: entry.resetAt,
  }
}

export function getRateLimitIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}
