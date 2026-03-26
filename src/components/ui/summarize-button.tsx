'use client'

import { useState } from 'react'
import { Sparkles, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SummarizeButtonProps {
  getText: () => string          // called lazily on click
  onSummary: (s: string) => void // receives the bullet summary
  className?: string
}

export function SummarizeButton({ getText, onSummary, className }: SummarizeButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    const text = getText()
    if (!text?.trim() || text.trim().length < 100) {
      toast.info('Not enough text to summarize')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      const { summary } = await res.json()
      onSummary(summary)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Summarize failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50',
        className
      )}
      title="Summarize with AI"
    >
      {loading
        ? <Loader2 className="h-3 w-3 animate-spin" />
        : <Sparkles className="h-3 w-3" />
      }
      {loading ? 'Summarizing…' : 'Summarize'}
    </button>
  )
}

// Inline summary display with dismiss
export function SummaryCard({ summary, onDismiss }: { summary: string; onDismiss: () => void }) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm relative">
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <p className="text-xs font-medium text-primary mb-1.5">AI Summary</p>
      <div className="text-sm text-foreground whitespace-pre-line leading-relaxed pr-4">{summary}</div>
    </div>
  )
}
