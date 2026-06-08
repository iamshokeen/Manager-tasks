// src/app/api/attachments/route.ts
//
// POST  → upload a file (multipart/form-data) to Vercel Blob and create
//         an Attachment row linked to a Task / Project / Message.
// GET   → list attachments for the given scope (?taskId / ?projectId / ?messageId).
//
import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from '@/lib/attachments'

export const runtime = 'nodejs'

type Scope = { taskId?: string; projectId?: string; messageId?: string }

function pickScope(form: FormData | URLSearchParams): Scope | null {
  const taskId = (form.get('taskId') as string | null) ?? undefined
  const projectId = (form.get('projectId') as string | null) ?? undefined
  const messageId = (form.get('messageId') as string | null) ?? undefined
  const set = [taskId, projectId, messageId].filter(Boolean)
  if (set.length !== 1) return null
  return { taskId, projectId, messageId }
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const me = session.user as { id: string }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  const scope = pickScope(form)
  if (!scope) {
    return NextResponse.json(
      { error: 'Provide exactly one of taskId, projectId, messageId' },
      { status: 400 },
    )
  }

  const file = form.get('file')
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'file required' }, { status: 400 })
  }
  const blob = file as File
  if (blob.size === 0) return NextResponse.json({ error: 'empty file' }, { status: 400 })
  if (blob.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB)` },
      { status: 413 },
    )
  }
  if (!ALLOWED_MIME_TYPES.has(blob.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${blob.type || 'unknown'}` }, { status: 415 })
  }

  // Path: <scope>/<entityId>/<timestamp>-<filename>. The entityId folder
  // keeps audits per-resource tidy and gives us a cheap delete-by-prefix
  // hook if we ever need to GC.
  const scopeKey = scope.taskId ? `tasks/${scope.taskId}` :
                   scope.projectId ? `projects/${scope.projectId}` :
                   `messages/${scope.messageId}`
  const safeName = blob.name.replace(/[^\w.\-]+/g, '_').slice(-120)
  const pathname = `${scopeKey}/${Date.now()}-${safeName}`

  let putRes: { url: string }
  try {
    putRes = await put(pathname, blob, {
      access: 'public',
      contentType: blob.type,
      addRandomSuffix: false,
    })
  } catch (e) {
    console.error('[upload] blob put failed', e)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const row = await prisma.attachment.create({
    data: {
      filename: blob.name,
      mimeType: blob.type,
      size: blob.size,
      url: putRes.url,
      uploaderId: me.id,
      taskId: scope.taskId ?? null,
      projectId: scope.projectId ?? null,
      messageId: scope.messageId ?? null,
    },
    include: { uploader: { select: { name: true } } },
  })

  return NextResponse.json({
    data: {
      id: row.id,
      filename: row.filename,
      mimeType: row.mimeType,
      size: row.size,
      url: row.url,
      uploaderId: row.uploaderId,
      uploaderName: row.uploader?.name ?? null,
      createdAt: row.createdAt.toISOString(),
    },
  }, { status: 201 })
}

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const scope = pickScope(url.searchParams)
  if (!scope) {
    return NextResponse.json(
      { error: 'Provide exactly one of taskId, projectId, messageId' },
      { status: 400 },
    )
  }

  const rows = await prisma.attachment.findMany({
    where: {
      taskId: scope.taskId ?? null,
      projectId: scope.projectId ?? null,
      messageId: scope.messageId ?? null,
    },
    include: { uploader: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({
    data: rows.map(r => ({
      id: r.id,
      filename: r.filename,
      mimeType: r.mimeType,
      size: r.size,
      url: r.url,
      uploaderId: r.uploaderId,
      uploaderName: r.uploader?.name ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  })
}
