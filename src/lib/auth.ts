// src/lib/auth.ts
// Custom OTP/JWT authentication — replaces NextAuth
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string
  email: string
  role: string
  iat?: number
  exp?: number
}

// ─── OTP helpers ─────────────────────────────────────────────────────────────

export function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function hashOTP(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10)
}

export async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash)
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET env var is not set')
  return new TextEncoder().encode(secret)
}

export async function signJWT(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifyJWT(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set('lcc_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set('lcc_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

// ─── Session compatibility shim (keeps existing routes working) ───────────────

export interface CompatSession {
  user: {
    id: string
    email: string
    name: string
    role: string
    teamMemberId?: string
  }
}

// Lightweight JWT-only check — no DB roundtrip. Use in server components for role gating.
export async function getSessionRole(): Promise<{ userId: string; role: string } | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('lcc_token')?.value
    if (!token) return null
    const payload = await verifyJWT(token)
    if (!payload?.userId || !payload?.role) return null
    return { userId: payload.userId, role: payload.role }
  } catch {
    return null
  }
}

export async function getSession(): Promise<CompatSession | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('lcc_token')?.value
    if (!token) return null

    const payload = await verifyJWT(token)
    if (!payload) return null

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true, teamMemberId: true, isActive: true },
    })
    if (!user || !user.isActive) return null

    // Slide expiry: re-sign if less than 2 days remain
    const exp = (payload.exp ?? 0) * 1000
    if (exp - Date.now() < 2 * 24 * 60 * 60 * 1000) {
      const newToken = await signJWT({ userId: user.id, email: user.email, role: user.role })
      await setAuthCookie(newToken)
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamMemberId: user.teamMemberId ?? undefined,
      },
    }
  } catch {
    return null
  }
}

export async function requireSession(): Promise<CompatSession> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session
}
