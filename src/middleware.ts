// src/middleware.ts
// Runs in Edge Runtime — keep this import-free from jose/bcrypt/prisma.
// JWT cryptographic verification happens in Node.js runtime (getSession/getSessionRole).
// Middleware only gates on cookie presence; actual auth is enforced per-route.
import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const token = req.cookies.get('lcc_token')?.value

  if (!token) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.next()
  response.headers.set('x-pathname', req.nextUrl.pathname)
  return response
}


export const config = {
  matcher: [
    '/((?!api/auth|auth|login|_next/static|_next/image|icons|manifest|sw|workbox|favicon\\.ico|offline).*)',
  ],
}
