'use client'
import { useState } from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'
import useSWR from 'swr'
import { formatDistanceToNow } from 'date-fns'
import { Send } from 'lucide-react'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { RichTextView } from '@/components/ui/rich-text-view'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Comment {
  id: string
  note: string
  authorName: string | null
  createdAt: string
}

function isEmptyHtml(html: string) {
  return !html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

export function TaskComments({ taskId }: { taskId: string }) {
  const currentUser = useCurrentUser()
  const { data, mutate } = useSWR<{ activities: Comment[] }>(
    `/api/tasks/${taskId}/comments`,
    fetcher
  )
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (isEmptyHtml(text)) return
    setSending(true)
    await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: text, authorName: currentUser?.name ?? 'You' }),
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
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-foreground">{c.authorName ?? 'Unknown'}</span>
                  <span className="text-[10px] text-[var(--outline)]">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <RichTextView html={c.note} className="text-sm text-foreground/90" />
              </div>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="flex flex-col gap-2">
        <RichTextEditor
          content={text}
          onChange={setText}
          placeholder="Add a comment…"
          compact
          minHeight={70}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending || isEmptyHtml(text)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-gradient-to-br from-[var(--primary-container)] to-primary text-white text-xs font-bold disabled:opacity-50 hover:opacity-90 transition-all"
          >
            <Send size={14} />
            {sending ? 'Posting…' : 'Comment'}
          </button>
        </div>
      </form>
    </div>
  )
}
