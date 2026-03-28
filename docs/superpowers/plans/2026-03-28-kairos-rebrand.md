# Kairos Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the app from "Lohono Command Center" to "Kairos", rename all internal sections per the new brand identity, rewrite all copy in brand voice (sharp operator, active verbs, no corporate fluff), and inject the Telos AI persona into all AI system prompts.

**Architecture:** Pure copy/string change pass — no DB schema changes, no API route renames, no RBAC changes. Every change is UI-layer or config-layer. Changes are grouped by file so each task is one file or one tight cluster of related files.

**Tech Stack:** Next.js 16, TypeScript, React Email (`@react-email/components`), OpenAI (`openai` SDK), PWA manifest JSON.

---

## Section Rename Reference

| Old | New |
|-----|-----|
| Cadence / Cadences | Rounds |
| Follow-ups | Open Loops |
| Stakeholders | The Table |
| OTA Assessment | Channel Pulse |
| Team | Your People |
| Dashboard / Command Center | Kairos |
| Management Ecosystem | (tagline) Know the moment. Own the purpose. |

## CTA Rename Reference

| Old | New |
|-----|-----|
| Add Task | Drop a Task |
| Add Member | Add to Your People |
| Create Follow-up | Open a Loop |
| Schedule Cadence | Set a Round |
| Add Stakeholder | Add to The Table |
| Submit / Submit Request | Lock It In |
| Save | Done |

---

## Task 1: Core Metadata & PWA Manifest

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `public/manifest.json`

- [ ] **Step 1: Update layout.tsx metadata**

Replace in `src/app/layout.tsx`:
```tsx
export const metadata: Metadata = {
  title: 'Kairos',
  description: 'Kairos — the command center for managers who know why the work matters.',
  manifest: '/manifest.json',
  icons: { apple: '/icons/apple-touch-icon.png' },
}
```

- [ ] **Step 2: Update manifest.json**

Replace entire `public/manifest.json`:
```json
{
  "name": "Kairos",
  "short_name": "Kairos",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0A0B0F",
  "theme_color": "#004ac6",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

- [ ] **Step 3: Commit**
```bash
git add src/app/layout.tsx public/manifest.json
git commit -m "rebrand: update app metadata and PWA manifest to Kairos"
```

---

## Task 2: Sidebar — Brand, Nav Labels & Footer

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Update brand block (logo letter, app name, tagline, footer)**

Replace the `{/* Brand */}` block (lines 122–133):
```tsx
{/* Brand */}
<div className="px-4 py-5 flex items-center gap-3 min-w-0">
  <span className="text-xl font-bold tracking-tighter text-primary shrink-0">K</span>
  {expanded && (
    <div className="min-w-0">
      <h1 className="text-xl font-bold tracking-tighter text-primary whitespace-nowrap">Kairos</h1>
      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--outline)] font-bold mt-0.5 whitespace-nowrap">
        Know the moment. Own the purpose.
      </p>
    </div>
  )}
</div>
```

- [ ] **Step 2: Update nav labels in BASE_NAV**

Replace the `BASE_NAV` array:
```tsx
const BASE_NAV: NavGroup[] = [
  {
    group: 'Overview',
    items: [{ href: '/', label: 'Kairos', Icon: LayoutDashboard }],
  },
  {
    group: 'Work',
    items: [
      { href: '/projects', label: 'Projects', Icon: FolderKanban },
      { href: '/tasks', label: 'Tasks', Icon: CheckSquare },
      { href: '/my-tasks', label: 'My Tasks', Icon: ListTodo },
      { href: '/cadence', label: 'Rounds', Icon: RefreshCw },
      { href: '/notes', label: 'Notes', Icon: StickyNote },
      { href: '/follow-ups', label: 'Open Loops', Icon: Bell },
    ],
  },
  {
    group: 'People',
    items: [
      { href: '/team', label: 'Your People', Icon: Users },
      { href: '/one-on-ones', label: '1:1s', Icon: MessageSquare },
      { href: '/stakeholders', label: 'The Table', Icon: Handshake },
    ],
  },
  {
    group: 'Revenue',
    items: [
      { href: '/metrics', label: 'Metrics', Icon: BarChart3 },
      { href: '/assessment/ota', label: 'Channel Pulse', Icon: TrendingUp },
      { href: '/assessment/checkin', label: 'Check-in GMV', Icon: Hotel },
    ],
  },
  {
    group: 'Reports',
    items: [{ href: '/reports', label: 'Reports', Icon: FileText }],
  },
  {
    group: 'Reference',
    items: [
      { href: '/playbook', label: 'Playbook', Icon: BookOpen },
      { href: '/settings', label: 'Settings', Icon: Settings },
    ],
  },
]
```

- [ ] **Step 3: Update footer text**

Replace footer div (line 171):
```tsx
<div className="text-[10px] text-[var(--outline)] font-medium whitespace-nowrap">FY27 · Kairos</div>
```

- [ ] **Step 4: Commit**
```bash
git add src/components/layout/sidebar.tsx
git commit -m "rebrand: rename nav labels and sidebar brand to Kairos"
```

---

## Task 3: Topbar — Page Titles & Mobile Brand

**Files:**
- Modify: `src/components/layout/topbar.tsx`

- [ ] **Step 1: Update PAGE_TITLES map and mobile brand**

Replace the `PAGE_TITLES` constant and the mobile brand span:
```tsx
const PAGE_TITLES: Record<string, string> = {
  '/': 'Kairos',
  '/projects': 'Projects',
  '/tasks': 'Tasks',
  '/my-tasks': 'My Tasks',
  '/team': 'Your People',
  '/one-on-ones': '1:1s',
  '/cadence': 'Rounds',
  '/stakeholders': 'The Table',
  '/reports': 'Reports',
  '/playbook': 'Playbook',
  '/settings': 'Settings',
  '/metrics': 'Metrics',
  '/assessment': 'Channel Pulse',
}
```

Replace the mobile brand span (currently `Lohono Stays`):
```tsx
<span className="text-base font-black tracking-tight text-foreground lg:hidden">
  Kairos
</span>
```

Replace the fallback title (currently `'Lohono CMD'`):
```tsx
const title = PAGE_TITLES[baseRoute] ?? 'Kairos'
```

- [ ] **Step 2: Commit**
```bash
git add src/components/layout/topbar.tsx
git commit -m "rebrand: update topbar page titles to Kairos brand names"
```

---

## Task 4: Team Page → "Your People"

**Files:**
- Modify: `src/app/team/page.tsx`

- [ ] **Step 1: Update page header, empty state, and dialog**

Find and replace these strings in `src/app/team/page.tsx`:

| Old | New |
|-----|-----|
| `title="Team"` | `title="Your People"` |
| `Add Member` (button text, all occurrences) | `Add to Your People` |
| `"No team members yet"` | `"Nobody on your team yet."` |
| `"Add your first team member to get started."` | `"Add the first person. Build the roster."` |
| `Add Team Member` (dialog title) | `Add to Your People` |

- [ ] **Step 2: Commit**
```bash
git add src/app/team/page.tsx
git commit -m "rebrand: rename Team page copy to Your People"
```

---

## Task 5: Follow-ups Page → "Open Loops"

**Files:**
- Modify: `src/app/follow-ups/page.tsx`

- [ ] **Step 1: Update page header, CTAs, and empty states**

Find and replace in `src/app/follow-ups/page.tsx`:

| Old | New |
|-----|-----|
| `Follow-ups` (page title / heading) | `Open Loops` |
| `Follow-up` (singular references in headings/labels) | `Loop` |
| `Create Follow-up` (button text) | `Open a Loop` |
| `New Follow-up` (dialog title if present) | `Open a Loop` |
| Any empty state title like `"No follow-ups"` | `"Nothing open. Rare. Enjoy it."` |
| Any empty state description for follow-ups | `"Track anything unresolved. Close them fast."` |

- [ ] **Step 2: Commit**
```bash
git add src/app/follow-ups/page.tsx
git commit -m "rebrand: rename Follow-ups page copy to Open Loops"
```

---

## Task 6: Stakeholders Page → "The Table"

**Files:**
- Modify: `src/app/stakeholders/page.tsx`
- Modify: `src/app/stakeholders/[id]/page.tsx`

- [ ] **Step 1: Update stakeholders/page.tsx**

Find and replace in `src/app/stakeholders/page.tsx`:

| Old | New |
|-----|-----|
| `Stakeholders` (page title / heading) | `The Table` |
| `Stakeholder` (singular in headings) | `Contact` |
| `Add Stakeholder` (button) | `Add to The Table` |
| `New Stakeholder` (dialog title) | `Add to The Table` |
| Empty state title like `"No stakeholders"` | `"Nobody at the table yet. Fix that."` |
| Empty state description | `"Add the people who have a seat. Map the relationships."` |

- [ ] **Step 2: Update stakeholders/[id]/page.tsx**

Replace page-level heading `Stakeholders` breadcrumb or title → `The Table`.
Replace `Stakeholder` in any heading/label with `Contact` where it refers to the record type.
Add `// KAIROS-TODO` comment on any internal API label like `stakeholder` that wasn't changed (it's in the route, not the UI).

- [ ] **Step 3: Commit**
```bash
git add src/app/stakeholders/page.tsx src/app/stakeholders/[id]/page.tsx
git commit -m "rebrand: rename Stakeholders page copy to The Table"
```

---

## Task 7: Cadence Page → "Rounds"

**Files:**
- Modify: `src/app/cadence/page.tsx`

- [ ] **Step 1: Update cadence/page.tsx**

Find and replace in `src/app/cadence/page.tsx`:

| Old | New |
|-----|-----|
| `Cadence` / `Cadences` (headings, labels) | `Rounds` / `Round` |
| `Schedule Cadence` (button) | `Set a Round` |
| `Add Cadence` (button if present) | `Set a Round` |
| Empty state title | `"No rounds scheduled. Set the rhythm."` |
| Empty state description | `"Recurring meetings, auto-scheduled. Never miss a beat."` |

- [ ] **Step 2: Commit**
```bash
git add src/app/cadence/page.tsx
git commit -m "rebrand: rename Cadence page copy to Rounds"
```

---

## Task 8: OTA Assessment Page → "Channel Pulse"

**Files:**
- Modify: `src/app/assessment/ota/page.tsx`

- [ ] **Step 1: Update ota/page.tsx headings**

Find and replace in `src/app/assessment/ota/page.tsx`:

| Old | New |
|-----|-----|
| `OTA Assessment` (page title) | `Channel Pulse` |
| `"FY 2026-27 — Targets vs Actuals"` (subtitle) | `"FY 2026-27 — How your revenue channels are performing."` |

- [ ] **Step 2: Commit**
```bash
git add src/app/assessment/ota/page.tsx
git commit -m "rebrand: rename OTA Assessment heading to Channel Pulse"
```

---

## Task 9: Tasks Page CTA

**Files:**
- Modify: `src/app/tasks/page.tsx`

- [ ] **Step 1: Update button text**

Find and replace in `src/app/tasks/page.tsx`:

| Old | New |
|-----|-----|
| `Add Task` (button text) | `Drop a Task` |
| `New Task` (dialog title if present) | `Drop a Task` |
| Empty state title (if any) | `"Nothing queued. Add the first task."` |

- [ ] **Step 2: Commit**
```bash
git add src/app/tasks/page.tsx
git commit -m "rebrand: update Tasks page CTA copy"
```

---

## Task 10: Projects Page CTA & Empty State

**Files:**
- Modify: `src/app/projects/page.tsx`
- Modify: `src/app/projects/[id]/page.tsx`

- [ ] **Step 1: Update projects/page.tsx**

Find and replace:

| Old | New |
|-----|-----|
| `Add Project` (button) | `Start a Project` |
| `New Project` (dialog title) | `Start a Project` |
| Empty state title | `"No projects yet. Start one."` |

- [ ] **Step 2: Update projects/[id]/page.tsx**

Find and replace:

| Old | New |
|-----|-----|
| `Add Task` (button inside project) | `Drop a Task` |
| `New Task` (dialog title) | `Drop a Task` |

- [ ] **Step 3: Commit**
```bash
git add src/app/projects/page.tsx src/app/projects/[id]/page.tsx
git commit -m "rebrand: update Projects page CTA copy"
```

---

## Task 11: My Tasks & Notes Pages

**Files:**
- Modify: `src/app/my-tasks/page.tsx`
- Modify: `src/app/notes/page.tsx`

- [ ] **Step 1: Update my-tasks/page.tsx**

Find and replace:

| Old | New |
|-----|-----|
| `Add Task` (button) | `Drop a Task` |
| Empty state title (e.g. `"No tasks assigned"`) | `"Nothing assigned to you. Good."` |
| Empty state description | `"Tasks assigned to you land here."` |

- [ ] **Step 2: Update notes/page.tsx**

Find and replace:

| Old | New |
|-----|-----|
| `Add Note` (button if present) | `New Note` |
| Empty state title | `"No notes yet. Write something down."` |

- [ ] **Step 3: Commit**
```bash
git add src/app/my-tasks/page.tsx src/app/notes/page.tsx
git commit -m "rebrand: update My Tasks and Notes copy"
```

---

## Task 12: Auth Pages

**Files:**
- Modify: `src/app/auth/login/page.tsx`
- Modify: `src/app/auth/request-access/page.tsx`
- Modify: `src/app/auth/pending/page.tsx`
- Modify: `src/app/auth/rejected/page.tsx`

- [ ] **Step 1: Update login page**

Find and replace in `src/app/auth/login/page.tsx`:

| Old | New |
|-----|-----|
| `Lohono Command Center` (heading if present) | `Kairos` |
| Any tagline | `"Know the moment. Own the purpose."` |

- [ ] **Step 2: Update request-access/page.tsx**

Find and replace:

| Old | New |
|-----|-----|
| `Submit Request` / `Submit` (button) | `Lock It In` |
| Any `Lohono Command Center` reference | `Kairos` |

- [ ] **Step 3: Update pending/page.tsx and rejected/page.tsx**

Find and replace any `Lohono Command Center` → `Kairos` in both files.

- [ ] **Step 4: Commit**
```bash
git add src/app/auth/login/page.tsx src/app/auth/request-access/page.tsx src/app/auth/pending/page.tsx src/app/auth/rejected/page.tsx
git commit -m "rebrand: update auth pages to Kairos brand"
```

---

## Task 13: Dashboard Page (Kairos home)

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update welcome/header copy**

Find and replace in `src/app/page.tsx`:

| Old | New |
|-----|-----|
| `Dashboard` (page heading if hardcoded) | `Kairos` |
| Any welcome message | `"Welcome to Kairos. Let's see what's open."` |
| Any empty state | Brand-voice equivalent (e.g. `"Nothing here yet. That won't last long."`) |

- [ ] **Step 2: Commit**
```bash
git add src/app/page.tsx
git commit -m "rebrand: update Dashboard page copy to Kairos"
```

---

## Task 14: Email Templates

**Files:**
- Modify: `emails/workspace-invite.tsx`
- Modify: `emails/access-approved.tsx`
- Modify: `emails/access-rejected.tsx`
- Modify: `emails/access-request-admin.tsx`
- Modify: `emails/login-otp.tsx`
- Modify: `emails/verify-email.tsx`

- [ ] **Step 1: Update workspace-invite.tsx**

Replace lines 27 and 33 (two `Lohono Command Center` references):
```tsx
<Preview>{inviterName} invited you to {workspaceName} on Kairos</Preview>
```
```tsx
<strong>{inviterName}</strong> has invited you to join{' '}
<strong>{workspaceName}</strong> on Kairos as a <strong>{role}</strong>.
```

- [ ] **Step 2: Update remaining email templates**

In each of `access-approved.tsx`, `access-rejected.tsx`, `access-request-admin.tsx`, `login-otp.tsx`, `verify-email.tsx`:
- Find any `Lohono Command Center` → replace with `Kairos`
- Find any `Lohono Stays` in email body/footer (not business context) → replace with `Kairos`
- Add `// KAIROS-TODO` comment on any line that has business-specific Lohono references that can't safely be changed

- [ ] **Step 3: Commit**
```bash
git add emails/
git commit -m "rebrand: update email templates to Kairos brand name"
```

---

## Task 15: Telos AI System Prompts

**Files:**
- Modify: `src/app/api/ai/summarize/route.ts`
- Modify: `src/app/api/ai/parse-tasks/route.ts`
- Modify: `src/app/api/ai/progress/route.ts`
- Modify: `src/app/api/ai/generate-project-tasks/route.ts`

> Note: These are functional system prompts (task-extraction, summarization) — they don't become the Telos persona. Telos persona is prepended as context only on output-facing calls (progress, generate-project-tasks). Pure extraction routes (parse-tasks, summarize) keep their strict functional prompts to avoid hallucination.

- [ ] **Step 1: Update progress/route.ts — inject Telos context**

In `src/app/api/ai/progress/route.ts`, prepend the Telos context to the existing system prompt string:
```ts
const TELOS_CONTEXT = `You are Telos, the strategic intelligence layer inside Kairos — a command center for people managers. Your job is to hold the user's purpose while they are heads-down in tasks. You surface what matters, flag what's slipping, and ask the questions the user hasn't thought to ask yet. Be brief. Be sharp. Never be a chatbot.\n\n`
```
Then use `TELOS_CONTEXT + existingPrompt` in the messages array.

- [ ] **Step 2: Update generate-project-tasks/route.ts — inject Telos context**

Same pattern: define `TELOS_CONTEXT` constant and prepend to the existing `systemPrompt`.

- [ ] **Step 3: Add KAIROS-TODO comments to summarize and parse-tasks**

In `src/app/api/ai/summarize/route.ts`, add above the SYSTEM const:
```ts
// KAIROS-TODO: Telos persona not applied here — this is a strict extraction route. Keep as-is.
```

Same for `src/app/api/ai/parse-tasks/route.ts`.

- [ ] **Step 4: Commit**
```bash
git add src/app/api/ai/
git commit -m "rebrand: inject Telos AI persona into output-facing AI routes"
```

---

## Task 16: Weekly Report Email Subject

**Files:**
- Modify: `src/app/api/cron/weekly-report/route.ts` (or wherever the email subject is set)

- [ ] **Step 1: Find and update the email subject line**

Search for the weekly report subject line. Replace:
```ts
// Old (any variant of "Weekly Report" or "Lohono" in subject)
// New:
subject: `Your Kairos Brief — Week of ${weekLabel}`
```
Add `// KAIROS-TODO` if the subject line isn't found in this file.

- [ ] **Step 2: Commit**
```bash
git add src/app/api/cron/weekly-report/route.ts
git commit -m "rebrand: update weekly report email subject to Kairos Brief"
```

---

## Task 17: README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite README header**

Replace the top section of `README.md`:
```markdown
# Kairos

> The command center for managers who know why the work matters. Built for a people manager overseeing 5 direct reports across 6 departments — replacing scattered spreadsheets and Slack threads with one always-available operating system.

**Live:** [lohono-command-center.vercel.app](https://lohono-command-center.vercel.app)

---
```

- [ ] **Step 2: Replace section names in features list**

| Old | New |
|-----|-----|
| Meeting cadences | Rounds |
| Stakeholder CRM | The Table |
| OTA Assessment | Channel Pulse |
| Team management | Your People |

- [ ] **Step 3: Add changelog entry**

Add to the top of the README (or a CHANGELOG section if one exists):
```markdown
## Changelog

### v2.0 — Kairos rebrand
- App renamed from "Lohono Command Center" to **Kairos**
- AI layer renamed to **Telos** — Telos persona injected into output-facing AI routes
- Section renames: Cadences → Rounds, Follow-ups → Open Loops, Stakeholders → The Table, OTA Assessment → Channel Pulse, Team → Your People
- All UI copy rewritten in brand voice: sharp, active, operator-toned
```

- [ ] **Step 4: Commit**
```bash
git add README.md
git commit -m "rebrand: update README to Kairos v2.0"
```

---

## Task 18: Scan & Flag Remaining Occurrences

- [ ] **Step 1: Run grep for any remaining old brand strings**
```bash
grep -r "Lohono Command Center" src/ emails/ public/ --include="*.tsx" --include="*.ts" --include="*.json" -l
grep -r "Management Ecosystem" src/ --include="*.tsx" --include="*.ts" -l
grep -ri "lohono cmd" src/ emails/ --include="*.tsx" --include="*.ts" -l
```

- [ ] **Step 2: For each file found, add `// KAIROS-TODO` comment** on the line if it can't be safely changed (e.g. API route paths, cron-consumed endpoints, env var references).

- [ ] **Step 3: Final commit**
```bash
git add -A
git commit -m "rebrand: add KAIROS-TODO markers for remaining unsafe changes"
```

---

## Self-Review Checklist

- [x] App title & meta description → Task 1
- [x] PWA manifest name/short_name → Task 1
- [x] Sidebar logo letter, app name, tagline, footer → Task 2
- [x] All nav labels (Cadence→Rounds, Follow-ups→Open Loops, Stakeholders→The Table, OTA Assessment→Channel Pulse, Team→Your People, Dashboard→Kairos) → Task 2
- [x] Topbar page titles map + mobile brand + fallback → Task 3
- [x] Team page CTAs + empty states → Task 4
- [x] Follow-ups page CTAs + empty states → Task 5
- [x] Stakeholders page CTAs + empty states → Task 6
- [x] Cadence page CTAs + empty states → Task 7
- [x] OTA Assessment heading + subtitle → Task 8
- [x] Tasks page CTAs → Task 9
- [x] Projects page CTAs → Task 10
- [x] My Tasks + Notes pages → Task 11
- [x] Auth pages (login, request-access, pending, rejected) → Task 12
- [x] Dashboard welcome copy → Task 13
- [x] All email templates → Task 14
- [x] Telos AI persona in output-facing AI routes → Task 15
- [x] Weekly report email subject → Task 16
- [x] README v2.0 → Task 17
- [x] Grep scan + KAIROS-TODO markers → Task 18
- [x] Do NOT change: DB table names, API route paths, RBAC roles, cron-consumed endpoints
