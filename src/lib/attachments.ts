// src/lib/attachments.ts
//
// Shared constants and helpers for the upload pipeline. Keep MIME types
// in lockstep with the dropzone's `accept` attribute and the server-side
// validator — drift between the two is the usual source of "browse worked
// but server rejected" bugs.

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB

export const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  // PDFs and Office docs
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Plain & CSV
  'text/plain',
  'text/csv',
  // HTML — used by Project Flow embed, rendered in a sandboxed iframe.
  // Self-contained HTML files only; uploaded JS runs but is isolated
  // from the host app (no same-origin, no top-nav, no form submission).
  'text/html',
  // Images
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
])

/**
 * Browser-friendly accept string for the file picker.
 */
export const ACCEPT_ATTR =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.html,.htm,.png,.jpg,.jpeg,.gif,.webp,.svg'

/** True if the attachment's MIME type is text/html — used by ProjectFlowEmbed. */
export function isHtmlAttachment(a: { mimeType: string; filename: string }): boolean {
  if (a.mimeType === 'text/html') return true
  // Some browsers occasionally send '' or 'application/octet-stream' for
  // .html files (e.g. when dragged from a custom file source). Fall back
  // to the extension so the user isn't blocked.
  return /\.html?$/i.test(a.filename)
}

export interface AttachmentRow {
  id: string
  filename: string
  mimeType: string
  size: number
  url: string
  uploaderId: string | null
  uploaderName: string | null
  createdAt: string
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
