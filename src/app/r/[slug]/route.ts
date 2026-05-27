// src/app/r/[slug]/route.ts
//
// Resolves a short brief URL (slug) and streams the matching PDF.
// Open to unauthenticated callers — the slug itself is the bearer
// credential, scoped to a single user + date and expiring in 7 days.
//
import { NextResponse } from 'next/server'
import { resolveBriefShortlink } from '@/lib/services/brief-shortlink'
import { getMemberReport } from '@/lib/services/member-report'
import { renderMemberReportPdf } from '@/lib/services/member-report-pdf'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  const resolved = await resolveBriefShortlink(slug)
  if (!resolved) return NextResponse.json({ error: 'Link expired or invalid' }, { status: 404 })

  // Treat the slug's date as IST noon to avoid TZ edge cases.
  const anchor = new Date(`${resolved.dateStr}T12:00:00+05:30`)
  if (Number.isNaN(anchor.getTime())) {
    return NextResponse.json({ error: 'Bad slug date' }, { status: 500 })
  }

  const report = await getMemberReport(resolved.userId, anchor)
  if (!report) return NextResponse.json({ error: 'Brief not available' }, { status: 404 })

  let pdf: Buffer
  try {
    pdf = await renderMemberReportPdf(report)
  } catch (e) {
    console.error('[r/slug] render', slug, e)
    return NextResponse.json({ error: 'Failed to render PDF' }, { status: 500 })
  }

  const filename = `kairos-brief-${report.member.name.replace(/\s+/g, '-').toLowerCase()}-${resolved.dateStr}.pdf`
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
