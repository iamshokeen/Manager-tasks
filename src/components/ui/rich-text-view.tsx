'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import DOMPurify from 'isomorphic-dompurify'
import { cn } from '@/lib/utils'

interface RichTextViewProps {
  html?: string | null
  /** Soft-clamp the rendered content to N lines, with Show more/less. */
  clampLines?: number
  className?: string
  placeholder?: string
}

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote',
  'a', 'span', 'div',
]
const ALLOWED_ATTR = ['href', 'target', 'rel', 'class']

function looksLikeHtml(s: string) {
  return /<[a-z][\s\S]*?>/i.test(s)
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalize(raw: string): string {
  if (looksLikeHtml(raw)) {
    return DOMPurify.sanitize(raw, { ALLOWED_TAGS, ALLOWED_ATTR })
  }
  // plain text — preserve linebreaks, escape entities
  const escaped = escapeHtml(raw).replace(/\n/g, '<br />')
  return `<p>${escaped}</p>`
}

const PROSE_CLASSES = [
  'prose prose-sm max-w-none text-foreground',
  '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
  '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-foreground',
  '[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2 [&_h2]:text-foreground',
  '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1.5 [&_h3]:text-foreground',
  '[&_p]:my-1.5 [&_p]:leading-relaxed',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5',
  '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5',
  '[&_li]:my-0.5',
  '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:italic',
  '[&_strong]:font-semibold',
  '[&_em]:italic',
  '[&_u]:underline',
  '[&_s]:line-through',
  '[&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.9em] [&_code]:font-mono',
  '[&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:overflow-x-auto [&_pre]:my-2 [&_pre]:text-[0.85em] [&_pre]:font-mono',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_a]:text-primary [&_a]:underline',
]

export function RichTextView({
  html,
  clampLines,
  className,
  placeholder,
}: RichTextViewProps) {
  const raw = (html ?? '').trim()
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    if (!clampLines || !ref.current || expanded) return
    const el = ref.current
    setOverflows(el.scrollHeight - el.clientHeight > 2)
  }, [clampLines, expanded, raw])

  useEffect(() => {
    if (!clampLines || !ref.current) return
    const el = ref.current
    const ro = new ResizeObserver(() => {
      if (expanded) return
      setOverflows(el.scrollHeight - el.clientHeight > 2)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [clampLines, expanded])

  if (!raw) {
    if (!placeholder) return null
    return <p className={cn('text-sm text-muted-foreground italic', className)}>{placeholder}</p>
  }

  const sanitized = normalize(raw)
  const showClamp = !!clampLines && !expanded

  return (
    <div className={cn('w-full', className)}>
      <div
        ref={ref}
        className={cn(...PROSE_CLASSES)}
        style={
          showClamp
            ? {
                display: '-webkit-box',
                WebkitLineClamp: clampLines,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
            : undefined
        }
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
      {clampLines && (overflows || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-1.5 text-xs font-bold text-primary hover:underline"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}
