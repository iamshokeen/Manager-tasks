'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Plus, Trash2, Wand2, FileText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { AiTaskParser } from '@/components/ui/ai-task-parser'
import { useDepartments } from '@/hooks/use-departments'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

interface Note {
  id: string
  content: string
  createdAt: string
  updatedAt: string
}

export default function NotesPage() {
  const { data: notes, mutate } = useSWR<Note[]>('/api/notes', fetcher)
  const { departments } = useDepartments()
  const [newText, setNewText] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [parserOpen, setParserOpen] = useState(false)
  const [parserInitText, setParserInitText] = useState('')

  async function createNote() {
    if (!newText.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newText.trim() }),
      })
      if (!res.ok) throw new Error('Failed')
      setNewText('')
      mutate()
    } catch {
      toast.error('Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  async function updateNote(id: string) {
    if (!editText.trim()) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editText.trim() }),
      })
      if (!res.ok) throw new Error('Failed')
      setEditingId(null)
      mutate()
    } catch {
      toast.error('Failed to update note')
    } finally {
      setSavingEdit(false)
    }
  }

  async function deleteNote(id: string) {
    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' })
      mutate()
      toast.success('Note deleted')
    } catch {
      toast.error('Failed to delete note')
    }
  }

  function openParser(content: string) {
    setParserInitText(content)
    setParserOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <PageHeader
        title="Notes"
        description="Quick notes — convert any note into tasks with AI review"
      />

      {/* New note input */}
      <div
        className="rounded-xl p-5 flex flex-col gap-3"
        style={{
          background: 'var(--surface-container-lowest)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <textarea
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="Write a note, meeting takeaway, or idea… AI can convert it to tasks."
          rows={4}
          className="w-full resize-none bg-transparent text-sm outline-none"
          style={{ color: 'var(--on-surface)' }}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              createNote()
            }
          }}
        />
        <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--surface-container-low)' }}>
          <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Ctrl+Enter to save</span>
          <div className="flex gap-2">
            {newText.trim().length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openParser(newText.trim())}
                className="gap-1.5"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>auto_awesome</span>
                Convert to Tasks
              </Button>
            )}
            <button
              onClick={createNote}
              disabled={saving || !newText.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(to right, var(--primary), var(--primary-dim))',
                color: 'var(--on-primary)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
              {saving ? 'Saving…' : 'New Note'}
            </button>
          </div>
        </div>
      </div>

      {/* Notes list */}
      {notes === undefined ? (
        <div className="text-sm py-8 text-center" style={{ color: 'var(--on-surface-variant)' }}>Loading…</div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: 'var(--on-surface-variant)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '40px', opacity: 0.3 }}>description</span>
          <p className="text-sm">No notes yet. Write something down.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map(note => (
            <div
              key={note.id}
              className="rounded-xl p-5 group transition-all"
              style={{
                background: 'var(--surface-container-lowest)',
                boxShadow: '0 8px 30px rgb(42,52,57,0.04)',
              }}
            >
              {editingId === note.id ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={4}
                    autoFocus
                    className="w-full resize-none bg-transparent text-sm outline-none"
                    style={{ color: 'var(--on-surface)' }}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button size="sm" onClick={() => updateNote(note.id)} disabled={savingEdit}>
                      {savingEdit ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p
                    className="text-sm whitespace-pre-wrap cursor-pointer transition-colors"
                    style={{ color: 'var(--on-surface)' }}
                    onClick={() => { setEditingId(note.id); setEditText(note.content) }}
                    title="Click to edit"
                    onMouseEnter={e => { (e.currentTarget as HTMLParagraphElement).style.color = 'var(--primary)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLParagraphElement).style.color = 'var(--on-surface)' }}
                  >
                    {note.content}
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: '1px solid var(--surface-container-low)' }}>
                    <span className="text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>
                      {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="flex items-center gap-1 h-7 px-2 text-xs font-medium rounded-lg transition-colors"
                        style={{ border: '1px solid var(--outline-variant)', color: 'var(--on-surface-variant)' }}
                        onClick={() => openParser(note.content)}
                        title="Convert to tasks"
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-low)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>auto_awesome</span>
                        Convert to Tasks
                      </button>
                      <button
                        className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors"
                        style={{ color: 'var(--on-surface-variant)' }}
                        onClick={() => deleteNote(note.id)}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--error)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(159,64,61,0.05)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--on-surface-variant)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI Task Parser */}
      <AiTaskParser
        open={parserOpen}
        onClose={() => setParserOpen(false)}
        initialText={parserInitText}
        departments={departments}
        onCreated={() => { setParserOpen(false) }}
      />
    </div>
  )
}
