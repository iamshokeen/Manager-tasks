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
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp,.svg'

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
