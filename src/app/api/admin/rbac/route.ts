// src/app/api/admin/rbac/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { getResourceRules, saveResourceRules } from '@/lib/rbac'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rules = await getResourceRules()
  return NextResponse.json({ data: rules })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Enforce SUPER_ADMIN always has full access — never allow removing it
  for (const resource of Object.keys(body)) {
    for (const action of Object.keys(body[resource])) {
      const roles: string[] = body[resource][action]
      if (!roles.includes('SUPER_ADMIN')) {
        roles.push('SUPER_ADMIN')
      }
    }
  }

  await saveResourceRules(body)
  return NextResponse.json({ ok: true })
}
