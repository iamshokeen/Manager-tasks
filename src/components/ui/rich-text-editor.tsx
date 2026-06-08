'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Type,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToolbarButtonProps {
  onClick: () => void
  isActive: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, isActive, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={e => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      className={cn(
        'h-7 w-7 flex items-center justify-center rounded text-sm transition-colors shrink-0',
        isActive
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  editable?: boolean
  compact?: boolean
  minHeight?: number
}

const PROSE_CLASSES = [
  '[&_.ProseMirror]:outline-none',
  '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
  '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground',
  '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
  '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
  '[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0',
  '[&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mt-3 [&_.ProseMirror_h1]:mb-2',
  '[&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mt-3 [&_.ProseMirror_h2]:mb-2',
  '[&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mt-2 [&_.ProseMirror_h3]:mb-1.5',
  '[&_.ProseMirror_p]:my-1.5',
  '[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ul]:my-1.5',
  '[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ol]:my-1.5',
  '[&_.ProseMirror_li]:my-0.5',
  '[&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-border [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:text-muted-foreground [&_.ProseMirror_blockquote]:italic',
  '[&_.ProseMirror_strong]:font-semibold',
  '[&_.ProseMirror_em]:italic',
  '[&_.ProseMirror_u]:underline',
  '[&_.ProseMirror_s]:line-through',
  '[&_.ProseMirror_code]:bg-muted [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:text-[0.9em] [&_.ProseMirror_code]:font-mono',
  '[&_.ProseMirror_pre]:bg-muted [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:rounded-md [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:my-2 [&_.ProseMirror_pre]:text-[0.85em] [&_.ProseMirror_pre]:font-mono',
  '[&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_pre_code]:p-0',
  '[&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline',
]

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Write something…',
  editable = true,
  compact = false,
  minHeight,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
  })

  if (!editable) {
    return (
      <div
        className={cn('prose prose-sm max-w-none text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0')}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }

  const editorMinHeight = minHeight ?? (compact ? 60 : 100)

  return (
    <div className="bg-[var(--surface-container-low)] rounded-lg border border-border">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border flex-wrap">
        <ToolbarButton
          onClick={() => editor?.chain().focus().setParagraph().run()}
          isActive={editor?.isActive('paragraph') ?? false}
          title="Body text"
        >
          <Type className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor?.isActive('heading', { level: 1 }) ?? false}
          title="Heading 1"
        >
          <Heading1 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor?.isActive('heading', { level: 2 }) ?? false}
          title="Heading 2"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor?.isActive('heading', { level: 3 }) ?? false}
          title="Heading 3"
        >
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          isActive={editor?.isActive('bold') ?? false}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          isActive={editor?.isActive('italic') ?? false}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          isActive={editor?.isActive('underline') ?? false}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          isActive={editor?.isActive('strike') ?? false}
          title="Strikethrough"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          isActive={editor?.isActive('bulletList') ?? false}
          title="Bullet list"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          isActive={editor?.isActive('orderedList') ?? false}
          title="Numbered list"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          isActive={editor?.isActive('blockquote') ?? false}
          title="Blockquote"
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleCode().run()}
          isActive={editor?.isActive('code') ?? false}
          title="Inline code"
        >
          <Code className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          isActive={editor?.isActive('codeBlock') ?? false}
          title="Code block"
        >
          <Code2 className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className={cn(
          compact ? 'p-2 text-sm' : 'p-3 text-sm',
          'text-foreground outline-none',
          ...PROSE_CLASSES,
        )}
        style={{ minHeight: editorMinHeight }}
      />
    </div>
  )
}
