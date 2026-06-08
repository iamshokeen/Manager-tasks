'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { Maximize2, Minimize2, ExternalLink, Workflow } from 'lucide-react'
import { type AttachmentRow, isHtmlAttachment } from '@/lib/attachments'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data as AttachmentRow[])

// Sandbox flags — `allow-scripts` lets the flowchart's JS run so click
// targets work; `allow-popups` opens external links in a new tab.
// Deliberately omitted:
//   - allow-same-origin: blocks the iframe from reading the host's
//     cookies / localStorage / parent DOM
//   - allow-forms: nothing in a flowchart should be POSTing anywhere
//   - allow-top-navigation: prevents an iframe redirect from hijacking
//     the parent tab
const IFRAME_SANDBOX = 'allow-scripts allow-popups allow-popups-to-escape-sandbox'

interface ProjectFlowEmbedProps {
  projectId: string
  className?: string
}

export function ProjectFlowEmbed({ projectId, className }: ProjectFlowEmbedProps) {
  const { data } = useSWR<AttachmentRow[]>(
    `/api/attachments?projectId=${projectId}`,
    fetcher,
  )
  const htmlFlows = (data ?? []).filter(isHtmlAttachment)
  // `selectedId` is what the user clicked. We never auto-set it; instead
  // derive the active flow at render time, falling back to the latest
  // upload. This avoids the cascading-render lint hit from setting state
  // inside a list-derived effect.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Escape exits fullscreen.
  useEffect(() => {
    if (!fullscreen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  if (htmlFlows.length === 0) return null

  const active =
    (selectedId && htmlFlows.find(f => f.id === selectedId)) ||
    htmlFlows[htmlFlows.length - 1]

  return (
    <div
      ref={containerRef}
      className={cn(
        fullscreen
          ? 'fixed inset-0 z-50 bg-background p-4 flex flex-col'
          : className,
      )}
    >
      <div
        className={cn(
          'rounded-xl overflow-hidden flex flex-col',
          fullscreen ? 'flex-1' : '',
        )}
        style={{ background: 'var(--surface-container-lowest)', boxShadow: '0 8px 30px rgb(42,52,57,0.04)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-3"
          style={{ borderBottom: '1px solid var(--surface-container)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Workflow className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--primary)' }} />
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--outline)' }}>
              Project Flow
            </span>
            <span className="text-xs text-foreground truncate" title={active.filename}>
              · {active.filename}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <a
              href={active.url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-[var(--surface-container-high)] transition-all"
              title="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={() => setFullscreen(v => !v)}
              className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-[var(--surface-container-high)] transition-all"
              title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
            >
              {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Tab strip (only when multiple flows uploaded) */}
        {htmlFlows.length > 1 && (
          <div
            className="flex items-center gap-1 px-3 py-2 overflow-x-auto"
            style={{ borderBottom: '1px solid var(--surface-container)' }}
          >
            {htmlFlows.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedId(f.id)}
                className={cn(
                  'px-3 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-colors',
                  f.id === active.id
                    ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-[var(--surface-container-high)]',
                )}
                title={f.filename}
              >
                {f.filename.replace(/\.html?$/i, '')}
              </button>
            ))}
          </div>
        )}

        {/* Sandboxed iframe */}
        <iframe
          key={active.id}
          src={active.url}
          title={active.filename}
          sandbox={IFRAME_SANDBOX}
          referrerPolicy="no-referrer"
          className="w-full bg-white"
          style={{ height: fullscreen ? '100%' : 560, border: 'none' }}
          loading="lazy"
        />
      </div>
    </div>
  )
}
