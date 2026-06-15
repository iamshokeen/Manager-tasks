// src/app/api/attachments/[id]/raw/route.ts
//
// GET → same-origin proxy that re-serves an attachment blob with
// `Content-Disposition: inline`. Vercel Blob hard-codes `attachment` on
// HTML responses (anti-XSS), which makes the file download instead of
// render when used as an iframe src. This route forwards the bytes with
// the disposition we actually want, while keeping the file accessible
// only to authenticated users.
//
// The Project Flow embed loads .html flowcharts via this route. The
// iframe stays sandboxed without `allow-same-origin`, so even though
// the URL is same-origin, the iframe gets a unique opaque origin and
// cannot touch host cookies / storage.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const row = await prisma.attachment.findUnique({
    where: { id },
    select: { url: true, filename: true, mimeType: true },
  })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const upstream = await fetch(row.url)
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Upstream fetch failed (${upstream.status})` },
      { status: 502 },
    )
  }

  // Quote-escape so filenames with quotes don't break the header.
  const safeName = row.filename.replace(/["\\]/g, '_')
  const headers = new Headers()
  headers.set('Content-Type', row.mimeType || 'application/octet-stream')
  headers.set('Content-Disposition', `inline; filename="${safeName}"`)
  const len = upstream.headers.get('content-length')
  if (len) headers.set('Content-Length', len)
  // Match the iframe sandbox posture — these are internal-only flowcharts,
  // never indexed or cached by intermediaries.
  headers.set('Cache-Control', 'private, max-age=300')
  headers.set('X-Content-Type-Options', 'nosniff')

  return new Response(upstream.body, { status: 200, headers })
}
