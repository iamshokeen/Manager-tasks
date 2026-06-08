'use client'

import { useCallback, useRef, useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import {
  Paperclip,
  FileText,
  ImageIcon,
  FileSpreadsheet,
  Presentation,
  File as FileIcon,
  Trash2,
  Loader2,
  Upload,
} from 'lucide-react'
import { ACCEPT_ATTR, type AttachmentRow, formatBytes, MAX_UPLOAD_BYTES, ALLOWED_MIME_TYPES } from '@/lib/attachments'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data as AttachmentRow[])

interface AttachmentSectionProps {
  /** Exactly one must be set. */
  taskId?: string
  projectId?: string
  messageId?: string
  /** Optional override label above the list. Default: "Attachments". */
  label?: string
  /** Compact = drop the section heading, smaller chips. */
  compact?: boolean
  className?: string
}

function scopeQuery(p: AttachmentSectionProps): string {
  if (p.taskId) return `taskId=${p.taskId}`
  if (p.projectId) return `projectId=${p.projectId}`
  if (p.messageId) return `messageId=${p.messageId}`
  throw new Error('AttachmentSection requires one of taskId/projectId/messageId')
}

function iconFor(mime: string) {
  if (mime.startsWith('image/')) return <ImageIcon className="h-4 w-4" />
  if (mime === 'application/pdf') return <FileText className="h-4 w-4" />
  if (mime.includes('spreadsheet') || mime === 'text/csv' || mime.includes('excel')) return <FileSpreadsheet className="h-4 w-4" />
  if (mime.includes('presentation') || mime.includes('powerpoint')) return <Presentation className="h-4 w-4" />
  if (mime.startsWith('text/') || mime.includes('word')) return <FileText className="h-4 w-4" />
  return <FileIcon className="h-4 w-4" />
}

export function AttachmentSection(props: AttachmentSectionProps) {
  const { label = 'Attachments', compact = false, className } = props
  const query = scopeQuery(props)
  const { data, mutate, isLoading } = useSWR<AttachmentRow[]>(`/api/attachments?${query}`, fetcher)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const upload = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files)
    if (list.length === 0) return
    setUploading(true)
    let ok = 0, fail = 0
    for (const file of list) {
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(`${file.name}: max ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB`)
        fail++
        continue
      }
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        toast.error(`${file.name}: unsupported type`)
        fail++
        continue
      }
      const fd = new FormData()
      fd.set('file', file)
      if (props.taskId) fd.set('taskId', props.taskId)
      if (props.projectId) fd.set('projectId', props.projectId)
      if (props.messageId) fd.set('messageId', props.messageId)
      try {
        const res = await fetch('/api/attachments', { method: 'POST', body: fd })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error ?? 'Upload failed')
        }
        ok++
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Upload failed')
        fail++
      }
    }
    setUploading(false)
    await mutate()
    if (ok > 0 && fail === 0) toast.success(`${ok} file${ok !== 1 ? 's' : ''} uploaded`)
    else if (ok > 0) toast.warning(`${ok} uploaded, ${fail} failed`)
  }, [props.taskId, props.projectId, props.messageId, mutate])

  async function handleDelete(id: string, filename: string) {
    if (typeof window !== 'undefined' && !window.confirm(`Remove "${filename}"?`)) return
    try {
      const res = await fetch(`/api/attachments/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Attachment removed')
      await mutate()
    } catch {
      toast.error('Failed to remove attachment')
    }
  }

  const attachments = data ?? []

  return (
    <div className={cn('space-y-2', className)}>
      {!compact && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Paperclip size={11} /> {label}
            {attachments.length > 0 && (
              <span className="text-foreground/70 font-bold">({attachments.length})</span>
            )}
          </span>
        </div>
      )}

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files.length > 0) upload(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-pointer transition-all',
          dragOver
            ? 'border-primary/70 bg-primary/5'
            : 'border-border hover:border-primary/40 bg-[var(--surface-container-high)]',
          uploading && 'opacity-60 pointer-events-none',
        )}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
        <span className="text-xs text-muted-foreground">
          {uploading ? 'Uploading…' : 'Drop a file or click to upload'}
          <span className="text-muted-foreground/60"> · up to 10 MB</span>
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) upload(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : attachments.length === 0 ? null : (
        <div className="space-y-1.5">
          {attachments.map(a => (
            <div
              key={a.id}
              className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-container-high)] border border-transparent hover:border-border transition-colors"
            >
              <span className="text-muted-foreground flex-shrink-0">{iconFor(a.mimeType)}</span>
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 text-xs"
              >
                <div className="truncate font-medium text-foreground hover:underline">{a.filename}</div>
                <div className="text-[10px] text-muted-foreground">
                  {formatBytes(a.size)}
                  {a.uploaderName && <> · {a.uploaderName}</>}
                </div>
              </a>
              <button
                type="button"
                onClick={() => handleDelete(a.id, a.filename)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
                title="Remove"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
