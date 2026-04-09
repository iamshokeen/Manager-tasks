'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { AiTaskParser } from '@/components/ui/ai-task-parser'
import { useDepartments } from '@/hooks/use-departments'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

interface Note {
  id: string
  content: string
  createdAt: string
  updatedAt: string
}

function getNoteTitle(content: string): string {
  const firstLine = content.split('\n')[0].trim()
  return firstLine.length > 55 ? firstLine.slice(0, 55) + '…' : firstLine || 'Untitled Note'
}

function getNotePreview(content: string): string {
  const lines = content.split('\n')
  const body = lines.slice(1).join(' ').trim()
  const preview = body || lines[0] || ''
  return preview.length > 110 ? preview.slice(0, 110) + '…' : preview
}

export default function NotesPage() {
  const { data: notes, mutate } = useSWR<Note[]>('/api/notes', fetcher)
  const { departments } = useDepartments()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editorContent, setEditorContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [parserOpen, setParserOpen] = useState(false)
  const [parserInitText, setParserInitText] = useState('')

  const selectedNote = notes?.find(n => n.id === selectedId) ?? null

  useEffect(() => {
    if (notes && notes.length > 0 && !selectedId) {
      setSelectedId(notes[0].id)
      setEditorContent(notes[0].content)
    }
  }, [notes, selectedId])

  function selectNote(note: Note) {
    setSelectedId(note.id)
    setEditorContent(note.content)
  }

  async function createNote() {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Untitled Note\n\nStart writing here...' }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      await mutate()
      if (data.data?.id) {
        setSelectedId(data.data.id)
        setEditorContent(data.data.content)
      }
    } catch {
      toast.error('Failed to create note')
    }
  }

  async function saveNote() {
    if (!selectedId || !editorContent.trim()) return
    setSaving(true)
    try {
      await fetch(`/api/notes/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editorContent }),
      })
      mutate()
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function deleteNote(id: string) {
    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' })
      if (selectedId === id) {
        setSelectedId(null)
        setEditorContent('')
      }
      mutate()
      toast.success('Note deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div
      className="-m-4 lg:-m-8 flex overflow-hidden"
      style={{ height: 'calc(100vh - 56px)' }}
    >
      {/* Left Column: Notes List */}
      <section
        className="w-80 lg:w-96 flex flex-col overflow-hidden shrink-0"
        style={{ background: 'var(--surface-container)' }}
      >
        {/* List header with New Note button */}
        <div className="p-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid rgba(169,180,185,0.15)' }}>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>All Notes</span>
          <button
            onClick={createNote}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
            New Note
          </button>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!notes ? (
            <div className="text-sm py-8 text-center" style={{ color: 'var(--on-surface-variant)' }}>Loading…</div>
          ) : notes.length === 0 ? (
            <div className="text-sm py-8 text-center" style={{ color: 'var(--on-surface-variant)' }}>No notes yet</div>
          ) : (
            notes.map(note => (
              <div
                key={note.id}
                onClick={() => selectNote(note)}
                className="p-4 rounded-xl cursor-pointer transition-all active:scale-[0.99]"
                style={{
                  background: 'var(--surface-container-lowest)',
                  boxShadow: '0 8px 30px rgb(42,52,57,0.04)',
                  borderLeft: selectedId === note.id
                    ? '4px solid var(--primary)'
                    : '4px solid transparent',
                }}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                    {getNoteTitle(note.content)}
                  </h3>
                  <span
                    className="text-[10px] font-medium uppercase tracking-widest shrink-0 ml-2"
                    style={{ color: selectedId === note.id ? 'var(--primary)' : 'var(--on-surface-variant)' }}
                  >
                    {formatDistanceToNow(new Date(note.updatedAt))}
                  </span>
                </div>
                <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--on-surface-variant)' }}>
                  {getNotePreview(note.content)}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Right Column: Note Editor */}
      <section
        className="flex-1 overflow-y-auto p-8"
        style={{ background: 'var(--surface)' }}
      >
        {selectedNote ? (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Editor header */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2" style={{ color: 'var(--on-surface-variant)' }}>
                <span className="material-symbols-outlined text-sm">folder</span>
                <span className="text-xs font-medium uppercase tracking-wider">Notes</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setParserInitText(editorContent); setParserOpen(true) }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors hover:opacity-80"
                  style={{ background: 'rgba(134,84,0,0.1)', color: 'var(--tertiary)' }}
                >
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  AI Parse
                </button>
                <button
                  onClick={() => deleteNote(selectedNote.id)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--on-surface-variant)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--error)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(159,64,61,0.05)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--on-surface-variant)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <span className="material-symbols-outlined text-xl">delete</span>
                </button>
                <div className="h-6 w-px mx-2" style={{ background: 'var(--surface-container-highest)' }} />
                <button
                  onClick={saveNote}
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)' }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            {/* Note content card */}
            <article
              className="rounded-xl p-10 flex flex-col gap-6"
              style={{
                background: '#ffffff',
                boxShadow: '0 4px 20px rgb(42,52,57,0.03)',
                minHeight: '600px',
              }}
            >
              {/* Formatting toolbar */}
              <div
                className="flex gap-4"
                style={{ borderTop: '1px solid var(--surface-container-low)', borderBottom: '1px solid var(--surface-container-low)', padding: '8px 0' }}
              >
                {(['format_bold', 'format_italic', 'format_list_bulleted', 'link', 'image'] as const).map(icon => (
                  <button
                    key={icon}
                    className="p-1.5 rounded transition-colors"
                    style={{ color: 'var(--on-surface-variant)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    <span className="material-symbols-outlined text-lg">{icon}</span>
                  </button>
                ))}
              </div>

              {/* Editor textarea */}
              <textarea
                value={editorContent}
                onChange={e => setEditorContent(e.target.value)}
                className="flex-1 resize-none border-none outline-none leading-loose"
                style={{
                  color: 'var(--on-surface-variant)',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  minHeight: '520px',
                  background: 'transparent',
                }}
                placeholder="Start writing..."
                onKeyDown={e => {
                  if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    saveNote()
                  }
                }}
              />
            </article>

            {/* Footer */}
            <div className="flex items-center justify-between px-2 pb-10">
              <span className="text-xs font-medium italic" style={{ color: 'var(--on-surface-variant)' }}>
                Last edited {formatDistanceToNow(new Date(selectedNote.updatedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4" style={{ color: 'var(--on-surface-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.2 }}>description</span>
            <p className="text-sm">Select a note to start editing</p>
            <button
              onClick={createNote}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
            >
              + New Note
            </button>
          </div>
        )}
      </section>

      <AiTaskParser
        open={parserOpen}
        onClose={() => setParserOpen(false)}
        initialText={parserInitText}
        departments={departments}
        onCreated={() => setParserOpen(false)}
      />
    </div>
  )
}
