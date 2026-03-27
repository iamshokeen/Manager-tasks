'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { formatDistanceToNow } from 'date-fns'
import { Send } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Comment {
  id: string
  note: string
  authorName: string | null
  createdAt: string
}

export function TaskComments({ taskId }: { taskId: string }) {
  const { data: session } = useSession()
  const { data, mutate } = useSWR<{ activities: Comment[] }>(
    `/api/tasks/${taskId}/comments`,
    fetcher
  )
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: text, authorName: session?.user?.name ?? 'You' }),
    })
    setText('')
    setSending(false)
    mutate()
  }

  const comments = data?.activities ?? []

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-foreground">Comments</h3>
      {comments.length === 0 ? (
        <p className="text-sm text-[var(--outline)] py-2">No comments yet.</p>
      ) : (
        <div className="space-y-3">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-primary">
                {(c.authorName ?? 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-foreground">{c.authorName ?? 'Unknown'}</span>
                  <span className="text-[10px] text-[var(--outline)]">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">{c.note}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 h-9 rounded-lg bg-[var(--surface-container-low)] px-3 text-sm text-foreground placeholder:text-[var(--outline)] focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all outline-none border-none"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="h-9 w-9 rounded-lg bg-gradient-to-br from-[var(--primary-container)] to-primary text-white flex items-center justify-center disabled:opacity-50 hover:opacity-90 transition-all"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}
