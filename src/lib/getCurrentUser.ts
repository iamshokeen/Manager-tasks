// src/lib/getCurrentUser.ts
import { cookies } from 'next/headers'
import { verifyJWT } from './auth'
import { prisma } from './prisma'
import type { User } from '@prisma/client'

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('lcc_token')?.value
    if (!token) return null

    const payload = await verifyJWT(token)
    if (!payload?.userId) return null

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })
    if (!user || !user.isActive) return null
    return user
  } catch {
    return null
  }
}
