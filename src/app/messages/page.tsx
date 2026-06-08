'use client'

// In-app DM page.
// Left rail: conversations list + "new message" button.
// Right pane: selected thread + composer.
// Polls every 5s while the page is open so messages feel near-realtime
// without a WebSocket layer.

import useSWR from 'swr'
import { useState, useEffect, useRef } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { toast } from 'sonner'
import {
  MessageSquare, Send, Search, ArrowLeft, RefreshCw, Paperclip, X,
} from 'lucide-react'
import { ACCEPT_ATTR, ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, formatBytes } from '@/lib/attachments'

interface Conversation {
  partnerId: string
  partnerName: string
  partnerRole: string
  partnerAvatarUrl: string | null
  lastBody: string
  lastFromMe: boolean
  lastAt: string
  unread: number
}

interface MessageAttachment {
  id: string
  filename: string
  mimeType: string
  size: number
  url: string
}

interface Message {
  id: string
  senderId: string
  recipientId: string
  body: string
  readAt: string | null
  createdAt: string
  attachments?: MessageAttachment[]
}

interface ThreadResponse {
  partner: { id: string; name: string; role: string; avatarUrl: string | null } | null
  messages: Message[]
}

interface Contact { id: string; name: string; role: string; avatarUrl: string | null }

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

function fmtTime(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) === today.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
  if (sameDay) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
}

function fmtFullTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
  })
}

export default function MessagesPage() {
  const [meId, setMeId] = useState<string | null>(null)
  const [activePartner, setActivePartner] = useState<string | null>(null)
  const [composing, setComposing] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(r => setMeId(r?.data?.id ?? null))
      .catch(() => {})
  }, [])

  const { data: conversations, mutate: mutateConvos } = useSWR<Conversation[]>(
    '/api/messages',
    fetcher,
    { refreshInterval: 5_000 },
  )

  const { data: thread, mutate: mutateThread } = useSWR<ThreadResponse>(
    activePartner ? `/api/messages/${activePartner}` : null,
    fetcher,
    { refreshInterval: 5_000 },
  )

  const { data: contacts } = useSWR<Contact[]>(
    showNew ? '/api/messages/contacts' : null,
    fetcher,
  )

  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  // Mark thread read when it loads or new messages arrive while open.
  useEffect(() => {
    if (!activePartner || !thread) return
    const incomingUnread = thread.messages.some(m => m.senderId === activePartner && !m.readAt)
    if (incomingUnread) {
      fetch(`/api/messages/${activePartner}`, { method: 'PATCH' })
        .then(() => { mutateThread(); mutateConvos() })
        .catch(() => {})
    }
  }, [activePartner, thread, mutateConvos, mutateThread])

  // Auto-scroll thread to bottom on new messages.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [thread?.messages?.length])

  function queueFiles(files: FileList | File[]) {
    const out: File[] = []
    for (const f of Array.from(files)) {
      if (f.size > MAX_UPLOAD_BYTES) {
        toast.error(`${f.name}: max ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB`)
        continue
      }
      if (!ALLOWED_MIME_TYPES.has(f.type)) {
        toast.error(`${f.name}: unsupported type`)
        continue
      }
      out.push(f)
    }
    if (out.length > 0) setPendingFiles(prev => [...prev, ...out])
  }

  async function sendMessage() {
    if (!activePartner) return
    const body = composing.trim()
    const files = pendingFiles
    // Must have either text or at least one file.
    if (!body && files.length === 0) return
    setSending(true)
    setComposing('')
    setPendingFiles([])
    try {
      // Message body cannot be empty server-side; fall back to a single
      // bullet so a file-only message still goes through. The attachments
      // carry the actual content.
      const placeholder = files.length > 0
        ? (files.length === 1 ? files[0].name : `${files.length} files attached`)
        : ''
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: activePartner, body: body || placeholder }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        toast.error(e?.error ?? 'Failed to send')
        setComposing(body) // restore on failure
        setPendingFiles(files)
        return
      }
      const data = await res.json()
      const newMessageId: string | undefined = data?.data?.id
      if (newMessageId && files.length > 0) {
        for (const file of files) {
          const fd = new FormData()
          fd.set('file', file)
          fd.set('messageId', newMessageId)
          try {
            const up = await fetch('/api/attachments', { method: 'POST', body: fd })
            if (!up.ok) {
              const e = await up.json().catch(() => ({}))
              toast.error(`${file.name}: ${e?.error ?? 'upload failed'}`)
            }
          } catch {
            toast.error(`${file.name}: upload failed`)
          }
        }
      }
      mutateThread()
      mutateConvos()
    } catch {
      toast.error('Network error')
      setComposing(body)
      setPendingFiles(files)
    } finally {
      setSending(false)
    }
  }

  function startThread(contactId: string) {
    setActivePartner(contactId)
    setShowNew(false)
    setTimeout(() => composerRef.current?.focus(), 50)
  }

  const filtered = (conversations ?? []).filter(c =>
    !search || c.partnerName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Messages"
        description="In-app DMs with anyone in your chain"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { mutateConvos(); if (activePartner) mutateThread() }} className="gap-1.5">
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
            <Button size="sm" onClick={() => setShowNew(true)} className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> New
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-[320px_1fr] gap-4 flex-1 overflow-hidden">

        {/* Left: conversations */}
        <div className="flex flex-col gap-2 overflow-hidden rounded-lg p-3"
          style={{ background: 'var(--surface-container-low)' }}>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
              style={{ color: 'var(--on-surface-variant)' }} />
            <Input
              placeholder="Search conversations…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-1">
            {!conversations && (
              <p className="text-sm py-6 text-center" style={{ color: 'var(--on-surface-variant)' }}>Loading…</p>
            )}
            {conversations && conversations.length === 0 && (
              <EmptyState icon={<MessageSquare className="h-8 w-8" />} title="No messages yet" description='Hit "New" to start a thread.' />
            )}
            {filtered.map(c => {
              const active = c.partnerId === activePartner
              return (
                <button
                  key={c.partnerId}
                  onClick={() => setActivePartner(c.partnerId)}
                  className="text-left p-2.5 rounded-lg cursor-pointer transition-all hover:brightness-110"
                  style={{
                    background: active ? 'var(--surface-container-high)' : 'var(--surface-container)',
                    boxShadow: active ? 'inset 0 0 0 1px var(--primary)' : undefined,
                  }}
                >
                  <div className="flex items-start gap-2">
                    <MemberAvatar name={c.partnerName} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold truncate" style={{ color: 'var(--on-surface)' }}>
                          {c.partnerName}
                        </span>
                        <span className="text-[10px] font-mono flex-shrink-0 ml-2" style={{ color: 'var(--on-surface-variant)' }}>
                          {fmtTime(c.lastAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-xs truncate flex-1" style={{ color: c.unread > 0 && !c.lastFromMe ? 'var(--on-surface)' : 'var(--on-surface-variant)', fontWeight: c.unread > 0 && !c.lastFromMe ? 600 : 400 }}>
                          {c.lastFromMe ? 'You: ' : ''}{c.lastBody}
                        </span>
                        {c.unread > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}>
                            {c.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: thread */}
        <div className="flex flex-col rounded-lg overflow-hidden" style={{ background: 'var(--surface)' }}>
          {!activePartner ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
              <MessageSquare className="h-10 w-10" style={{ color: 'var(--on-surface-variant)', opacity: 0.4 }} />
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                Pick a conversation or start a new one.
              </p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: '1px solid var(--surface-container)' }}>
                <button
                  onClick={() => setActivePartner(null)}
                  className="lg:hidden p-1 rounded hover:bg-[var(--surface-container)] cursor-pointer"
                  title="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                {thread?.partner && (
                  <>
                    <MemberAvatar name={thread.partner.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold" style={{ color: 'var(--on-surface)' }}>{thread.partner.name}</div>
                      <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--on-surface-variant)' }}>
                        {thread.partner.role.replace('_', ' ').toLowerCase()}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Messages */}
              <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {!thread && (
                  <p className="text-center text-sm" style={{ color: 'var(--on-surface-variant)' }}>Loading…</p>
                )}
                {thread && thread.messages.length === 0 && (
                  <p className="text-center text-sm italic mt-8" style={{ color: 'var(--on-surface-variant)' }}>
                    No messages yet. Say hi.
                  </p>
                )}
                {thread?.messages.map(m => {
                  const fromMe = m.senderId === meId
                  const atts = m.attachments ?? []
                  return (
                    <div key={m.id} className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className="max-w-[70%] px-3 py-2 rounded-lg"
                        style={{
                          background: fromMe ? 'var(--primary)' : 'var(--surface-container)',
                          color: fromMe ? 'var(--on-primary)' : 'var(--on-surface)',
                          borderBottomRightRadius: fromMe ? 2 : 8,
                          borderBottomLeftRadius: fromMe ? 8 : 2,
                        }}
                      >
                        <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>
                        {atts.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {atts.map(a => (
                              <a
                                key={a.id}
                                href={a.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-[11px] underline-offset-2 hover:underline"
                                style={{ opacity: 0.9 }}
                              >
                                <Paperclip className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{a.filename}</span>
                                <span style={{ opacity: 0.7 }}>· {formatBytes(a.size)}</span>
                              </a>
                            ))}
                          </div>
                        )}
                        <div className="text-[10px] font-mono mt-1" style={{ opacity: 0.7 }}>
                          {fmtFullTime(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Composer */}
              <div
                className="flex flex-col gap-2 p-3"
                style={{ borderTop: '1px solid var(--surface-container)' }}
              >
                {pendingFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {pendingFiles.map((f, i) => (
                      <span
                        key={`${f.name}-${i}`}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--surface-container-high)] text-[11px] text-foreground"
                      >
                        <Paperclip className="h-3 w-3" />
                        <span className="max-w-[200px] truncate">{f.name}</span>
                        <span className="text-muted-foreground">{formatBytes(f.size)}</span>
                        <button
                          type="button"
                          onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-muted-foreground hover:text-destructive"
                          title="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-[var(--surface-container-high)] transition-all"
                    title="Attach file"
                    disabled={sending}
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPT_ATTR}
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) queueFiles(e.target.files)
                      e.target.value = ''
                    }}
                  />
                  <Textarea
                    ref={composerRef}
                    value={composing}
                    onChange={e => setComposing(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder="Type a message — Enter to send, Shift+Enter for new line"
                    rows={1}
                    className="flex-1 resize-none text-sm min-h-9 max-h-32"
                    disabled={sending}
                  />
                  <Button
                    size="sm"
                    onClick={sendMessage}
                    disabled={sending || (!composing.trim() && pendingFiles.length === 0)}
                    className="gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" /> {sending ? 'Sending…' : 'Send'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New-thread picker */}
      {showNew && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowNew(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-2xl p-5 shadow-2xl"
            style={{ background: 'var(--surface-container)' }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--on-surface)' }}>Start a new conversation</h3>
            <div className="max-h-[60vh] overflow-y-auto flex flex-col gap-1">
              {!contacts && <p className="text-sm py-4 text-center" style={{ color: 'var(--on-surface-variant)' }}>Loading…</p>}
              {contacts && contacts.length === 0 && (
                <p className="text-sm italic py-4 text-center" style={{ color: 'var(--on-surface-variant)' }}>
                  No one in your chain to message.
                </p>
              )}
              {contacts?.map(c => (
                <button
                  key={c.id}
                  onClick={() => startThread(c.id)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:brightness-110 cursor-pointer text-left"
                  style={{ background: 'var(--surface-container-low)' }}
                >
                  <MemberAvatar name={c.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate" style={{ color: 'var(--on-surface)' }}>{c.name}</div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--on-surface-variant)' }}>
                      {c.role.replace('_', ' ').toLowerCase()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>Cancel</Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
