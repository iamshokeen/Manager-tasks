// src/lib/services/brief-shortlink.ts
//
// Short, single-purpose URL slug for a per-user, per-day PDF brief.
// Lives in BriefShortlink. We mint a fresh slug per send so a slug
// is not silently reusable by anyone who sniffed an older one.
//
// Slug shape: 10 url-safe base62 chars. Total link length on
// kairos-ai-hq.vercel.app/r/<10> = ~46 chars — small enough that
// WhatsApp Web won't truncate it.

import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'

const TTL_DAYS = 7
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function makeSlug(): string {
  const bytes = randomBytes(10)
  let out = ''
  for (let i = 0; i < 10; i++) out += ALPHABET[bytes[i] % ALPHABET.length]
  return out
}

export async function mintBriefShortlink(userId: string, dateStr: string): Promise<string> {
  // Collision-tolerant insert. Slug space is 62^10 ≈ 8.4e17 so a single
  // retry handles even adversarial cases.
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = makeSlug()
    try {
      await prisma.briefShortlink.create({
        data: {
          slug, userId, dateStr,
          expiresAt: new Date(Date.now() + TTL_DAYS * 86_400_000),
        },
      })
      return slug
    } catch {
      // Unique constraint violation — try again with a fresh slug.
      continue
    }
  }
  throw new Error('Failed to mint shortlink after retries')
}

export async function resolveBriefShortlink(slug: string): Promise<{ userId: string; dateStr: string } | null> {
  const row = await prisma.briefShortlink.findUnique({ where: { slug } })
  if (!row) return null
  if (row.expiresAt.getTime() < Date.now()) return null
  return { userId: row.userId, dateStr: row.dateStr }
}
