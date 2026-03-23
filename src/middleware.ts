// src/middleware.ts
export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/((?!api/auth|login|_next/static|_next/image|icons|manifest|sw|workbox|favicon).*)',
  ],
}
