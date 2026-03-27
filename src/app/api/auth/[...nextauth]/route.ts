// src/app/api/auth/[...nextauth]/route.ts
// NextAuth has been replaced with custom OTP auth.
// This stub returns 404 to prevent import errors.
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function POST() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
