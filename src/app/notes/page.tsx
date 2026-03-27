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
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
        <textarea
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="Write a note, meeting takeaway, or idea… AI can convert it to tasks."
          rows={4}
          className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              createNote()
            }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Ctrl+Enter to save</span>
          <div className="flex gap-2">
            {newText.trim().length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openParser(newText.trim())}
                className="gap-1.5"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Convert to Tasks
              </Button>
            )}
            <Button size="sm" onClick={createNote} disabled={saving || !newText.trim()} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {saving ? 'Saving…' : 'New Note'}
            </Button>
          </div>
        </div>
      </div>

      {/* Notes list */}
      {notes === undefined ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <FileText className="h-10 w-10 opacity-30" />
          <p className="text-sm">No notes yet. Write something down.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map(note => (
            <div key={note.id} className="bg-card border border-border rounded-xl p-4 group">
              {editingId === note.id ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={4}
                    autoFocus
                    className="w-full resize-none bg-transparent text-sm text-foreground outline-none"
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
                    className="text-sm text-foreground whitespace-pre-wrap cursor-pointer hover:text-primary transition-colors"
                    onClick={() => { setEditingId(note.id); setEditText(note.content) }}
                    title="Click to edit"
                  >
                    {note.content}
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => openParser(note.content)}
                        title="Convert to tasks"
                      >
                        <Wand2 className="h-3 w-3" />
                        Convert to Tasks
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteNote(note.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
