# Rich-Text Editing + Read-More for Descriptions, Notes & Comments

**Date:** 2026-06-08
**Status:** Approved (user delegated decisions, "go with scalable choices")

## Problem

1. Long descriptions on the project detail page render as an unbroken plain `<p>` (no truncation, no "Show more"). Screenshot shows ~30 lines of unbroken text.
2. Notes, descriptions, and comments are plain text only. User wants formatting: headings, bold/italic/underline, bullets, numbered lists, blockquote, code, strikethrough.

## Decisions (locked)

- **Editor:** extend existing `RichTextEditor` (Tiptap v3, already installed). Add **Heading H1/H2/H3 dropdown**, **Strikethrough**, **Inline code**, **Code block**.
- **No font-size picker.** Headings provide size hierarchy semantically; arbitrary px sizes don't scale to PDF / dark mode / responsive.
- **Read-more:** 6-line CSS line-clamp on rendered HTML, "Show more / Show less" toggle, only shown when content overflows.
- **Storage:** HTML string in existing `String? @db.Text` Prisma fields. No migration.
- **Sanitization:** `isomorphic-dompurify` on render (XSS guard; works server-side for PDF export).
- **Backward compat:** existing plaintext content rendered as-is — `RichTextView` wraps non-HTML in `<p>` automatically.

## Surfaces wired

| Surface | Edit | View |
|---|---|---|
| Project description (edit dialog + detail page) | RichTextEditor | RichTextView (6-line clamp) |
| Task description (full page + slide panel — panel already done) | RichTextEditor | RichTextView (6-line clamp) |
| Task comments | RichTextEditor (compact) | RichTextView (no clamp) |
| Project brainstorm notes | **Plain textarea retained** — input to AI prompt; HTML markup pollutes prompt |

## Components

- `RichTextEditor` (existing, extended) — full toolbar editing component.
- `RichTextView` (new) — read-only renderer with sanitize + optional line-clamp + Show More/Less.

## Backward compat

`RichTextView` detects content type: if it doesn't start with `<`, treat as plain and wrap as `<p>{escaped}</p>`. Existing plaintext rows render unchanged.

## Out of scope

- Mentions (@user) — separate feature.
- Image upload in editor — separate feature.
- Markdown shortcuts — Tiptap StarterKit includes basic ones; we don't customize.
- Font family selector.
