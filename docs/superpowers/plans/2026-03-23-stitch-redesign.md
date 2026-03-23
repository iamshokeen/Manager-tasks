# Stitch Azure Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current dark-gold theme with the Azure "Elevated Estate" design from the Stitch export — light theme, Royal Blue primary (#004ac6), Material Design 3 surface hierarchy — while fixing the broken mobile layout and adding drag-drop Kanban.

**Architecture:** CSS custom properties are updated first (foundation), then layout components, then page-level JSX. All business logic, hooks, API calls, and Prisma queries are untouched. Mobile is fixed via a responsive app-shell + new bottom-nav component.

**Tech Stack:** Next.js 16, Tailwind v4 (CSS-first), shadcn/ui, next-themes, @dnd-kit/core + @dnd-kit/sortable (new), Inter font (replaces DM Sans), Lucide icons (kept).

---

## Token Reference (Azure M3 → shadcn var mapping)

| M3 Token | Value | Maps to shadcn var |
|---|---|---|
| background | #f7f9fb | `--background` |
| on-surface / on-background | #191c1e | `--foreground` |
| surface-container-lowest | #ffffff | `--card` |
| on-surface-variant | #434655 | `--card-foreground` |
| outline-variant | #c3c6d7 | `--border` |
| primary | #004ac6 | `--primary` |
| on-primary | #ffffff | `--primary-foreground` |
| surface-container-low | #f2f4f6 | `--muted` |
| outline | #737686 | `--muted-foreground` |
| surface-container | #eceef0 | `--accent` |
| on-surface | #191c1e | `--accent-foreground` |
| error | #ba1a1a | `--destructive` |
| surface-bright | #f7f9fb | `--popover` |
| on-surface | #191c1e | `--popover-foreground` |
| outline-variant | #c3c6d7 | `--ring` |
| primary-container | #2563eb | `--color-primary-container` |
| secondary-container | #acbfff | `--color-secondary-container` |
| surface-container-high | #e6e8ea | `--color-surface-container-high` |
| surface-container-highest | #e0e3e5 | `--color-surface-container-highest` |
| surface-dim | #d8dadc | `--color-surface-dim` |

---

## File Map

### Created
- `src/components/layout/mobile-bottom-nav.tsx` — PWA-style bottom nav for mobile (5 key routes)

### Modified
- `src/app/globals.css` — Replace dark-gold vars with Azure M3 tokens; swap font to Inter
- `src/app/layout.tsx` — Remove hardcoded `className="dark"`; add ThemeProvider; update themeColor
- `src/components/layout/app-shell.tsx` — Responsive ml: `lg:ml-64` instead of fixed `ml-[220px]`; include MobileBottomNav
- `src/components/layout/sidebar.tsx` — Azure styling (bg surface-container-low, no borders, primary blue); hidden on mobile (`hidden lg:flex`)
- `src/components/layout/topbar.tsx` — Remove `left-[220px]` offset; glassmorphism (`bg-white/80 backdrop-blur-xl`); responsive
- `src/components/ui/button.tsx` — Gradient primary button; ghost secondary
- `src/components/ui/card.tsx` — White card on surface-container-low bg; no border (use bg-shift elevation)
- `src/components/ui/badge.tsx` — Azure-tinted status badges
- `src/components/ui/input.tsx` — surface-container-low bg; focus transitions to white with primary ring
- `src/components/ui/stat-card.tsx` — Azure stat card style
- `src/components/ui/page-header.tsx` — Azure page header style
- `src/app/page.tsx` — Dashboard JSX: Azure stat cards, bento grid, priority tasks list (logic untouched)
- `src/app/tasks/page.tsx` — Kanban board with dnd-kit drag-drop (API hooks untouched)
- `src/app/my-tasks/page.tsx` — Azure card list styling
- `src/app/team/page.tsx` — Bento hero + team grid
- `src/app/metrics/page.tsx` — Azure metrics cards

---

## Task 1: Git Snapshot

**Files:** none (git only)

- [ ] **Step 1: Tag the current state**

```bash
cd "C:/Users/Saksham Shokeen/Desktop/FY 27/AI projects/Management tool/lohono-command-center"
git add -A
git commit -m "snapshot: pre-azure-redesign checkpoint"
git tag pre-azure-redesign
```

- [ ] **Step 2: Verify tag exists**

```bash
git tag --list
```
Expected: `pre-azure-redesign` in output

---

## Task 2: CSS Foundation — Azure M3 Tokens

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace globals.css with Azure token system**

Replace the entire file with:

```css
/* src/app/globals.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

/* ─── Azure "Elevated Estate" — Light Default ─── */
:root {
  /* Surfaces */
  --background: #f7f9fb;
  --foreground: #191c1e;
  --card: #ffffff;
  --card-foreground: #434655;
  --popover: #f7f9fb;
  --popover-foreground: #191c1e;

  /* Interactive */
  --primary: #004ac6;
  --primary-foreground: #ffffff;
  --secondary: #eceef0;
  --secondary-foreground: #191c1e;
  --muted: #f2f4f6;
  --muted-foreground: #737686;
  --accent: #eceef0;
  --accent-foreground: #191c1e;
  --destructive: #ba1a1a;
  --destructive-foreground: #ffffff;

  /* Structure */
  --border: rgba(195, 198, 215, 0.4);
  --input: #f2f4f6;
  --ring: #004ac6;
  --radius: 0.5rem;

  /* Azure M3 Surface Palette (for direct use in components) */
  --surface-container-lowest: #ffffff;
  --surface-container-low: #f2f4f6;
  --surface-container: #eceef0;
  --surface-container-high: #e6e8ea;
  --surface-container-highest: #e0e3e5;
  --surface-dim: #d8dadc;
  --outline: #737686;
  --outline-variant: #c3c6d7;
  --primary-container: #2563eb;
  --on-primary-container: #eeefff;
  --secondary-container: #acbfff;
  --error-container: #ffdad6;
  --on-error-container: #93000a;

  /* Status colors */
  --color-critical: #ba1a1a;
  --color-high: #bc4800;
  --color-medium: #495c95;
  --color-low: #1a7a4a;

  /* Glass shadow */
  --shadow-glass: 0 20px 40px rgba(0, 74, 198, 0.06);
}

/* ─── Dark override (future use) ─── */
.dark {
  --background: #0d0e12;
  --foreground: #e3e2e8;
  --card: #1e1f24;
  --card-foreground: #e3e2e8;
  --popover: #1e1f24;
  --popover-foreground: #e3e2e8;
  --primary: #b4c5ff;
  --primary-foreground: #00174b;
  --secondary: #2a2b30;
  --secondary-foreground: #e3e2e8;
  --muted: #2a2b30;
  --muted-foreground: #737686;
  --accent: #2a2b30;
  --accent-foreground: #e3e2e8;
  --destructive: #ffb4ab;
  --destructive-foreground: #690005;
  --border: rgba(77, 70, 55, 0.3);
  --input: #2a2b30;
  --ring: #b4c5ff;
  --surface-container-lowest: #0d0e12;
  --surface-container-low: #121318;
  --surface-container: #1e1f24;
  --surface-container-high: #282930;
  --surface-container-highest: #343439;
  --outline: #958d7d;
  --outline-variant: #4d4637;
  --primary-container: #003ea8;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-ring: var(--ring);
  --color-critical: var(--color-critical);
  --color-high: var(--color-high);
  --color-medium-status: var(--color-medium);
  --color-low: var(--color-low);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

* {
  border-color: var(--border);
  box-sizing: border-box;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Thin scrollbar */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--outline-variant); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: var(--outline); }

/* Print / PDF */
@media print {
  aside, header { display: none !important; }
  main, [data-main] { margin-left: 0 !important; padding-top: 0 !important; }
  body { background: #fff !important; color: #111 !important; }
  @page { margin: 1.5cm; }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "style: replace dark-gold tokens with Azure M3 light theme"
```

---

## Task 3: Root Layout — Remove Hardcoded Dark

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Remove `className="dark"` and update themeColor**

Replace:
```tsx
<html lang="en" className="dark">
```
With:
```tsx
<html lang="en">
```

Also update `themeColor`:
```tsx
export const viewport: Viewport = {
  themeColor: '#004ac6',
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "style: remove hardcoded dark class, update themeColor to azure blue"
```

---

## Task 4: Sidebar — Azure Responsive Layout

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Rewrite sidebar with Azure design + hidden on mobile**

Replace the entire file:

```tsx
// src/components/layout/sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FolderKanban, CheckSquare, ListTodo, RefreshCw,
  Users, MessageSquare, Handshake, BarChart3, TrendingUp, Hotel,
  FileText, BookOpen, Settings
} from 'lucide-react'

const NAV_ITEMS = [
  {
    group: 'Overview',
    items: [{ href: '/', label: 'Dashboard', Icon: LayoutDashboard }],
  },
  {
    group: 'Work',
    items: [
      { href: '/projects', label: 'Projects', Icon: FolderKanban },
      { href: '/tasks', label: 'Tasks', Icon: CheckSquare },
      { href: '/my-tasks', label: 'My Tasks', Icon: ListTodo },
      { href: '/cadence', label: 'Cadence', Icon: RefreshCw },
    ],
  },
  {
    group: 'People',
    items: [
      { href: '/team', label: 'Team', Icon: Users },
      { href: '/one-on-ones', label: '1:1s', Icon: MessageSquare },
      { href: '/stakeholders', label: 'Stakeholders', Icon: Handshake },
    ],
  },
  {
    group: 'Assessment',
    items: [
      { href: '/metrics', label: 'Metrics', Icon: BarChart3 },
      { href: '/assessment/ota', label: 'OTA Assessment', Icon: TrendingUp },
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

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 flex-col bg-[var(--surface-container-low)] z-40 print:hidden">
      {/* Brand */}
      <div className="px-6 py-5">
        <h1 className="text-xl font-bold tracking-tighter text-primary">Lohono Stays</h1>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--outline)] font-bold mt-0.5">
          Management Ecosystem
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV_ITEMS.map(({ group, items }) => (
          <div key={group} className="mb-1">
            <div className="px-3 py-2 text-[10px] font-bold tracking-widest text-[var(--outline)] uppercase">
              {group}
            </div>
            {items.map(({ href, label, Icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    active
                      ? 'text-primary bg-white/60 font-semibold'
                      : 'text-[var(--outline)] hover:text-[var(--foreground)] hover:bg-white/40'
                  )}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 1.75} />
                  {label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[var(--outline-variant)]/20">
        <div className="text-[10px] text-[var(--outline)] font-medium">FY27 · Lohono Stays</div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "style: sidebar → Azure design, responsive (hidden on mobile, visible lg+)"
```

---

## Task 5: Topbar — Azure Glassmorphism

**Files:**
- Modify: `src/components/layout/topbar.tsx`

- [ ] **Step 1: Rewrite topbar with Azure glass style + responsive offset**

Replace the entire file:

```tsx
// src/components/layout/topbar.tsx
'use client'
import { usePathname } from 'next/navigation'
import { Search, Bell } from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/projects': 'Projects',
  '/tasks': 'Tasks',
  '/my-tasks': 'My Tasks',
  '/team': 'Team',
  '/one-on-ones': '1:1s',
  '/cadence': 'Cadence',
  '/stakeholders': 'Stakeholders',
  '/reports': 'Reports',
  '/playbook': 'Playbook',
  '/settings': 'Settings',
  '/metrics': 'Metrics',
  '/assessment': 'Assessment',
}

export function Topbar() {
  const pathname = usePathname()
  const baseRoute = '/' + (pathname.split('/')[1] ?? '')
  const title = PAGE_TITLES[baseRoute] ?? 'Lohono CMD'

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-14 z-30 flex items-center justify-between px-5 lg:px-8 bg-white/80 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,74,198,0.06)] print:hidden">
      {/* Left: page title on mobile, breadcrumb area */}
      <div className="flex items-center gap-4">
        <span className="text-base font-black tracking-tight text-foreground lg:hidden">
          Lohono Stays
        </span>
        <h1 className="hidden lg:block text-sm font-semibold text-foreground">{title}</h1>
      </div>

      {/* Right: date badge + search + notifications + PDF */}
      <div className="flex items-center gap-2 lg:gap-3">
        <span className="hidden lg:block text-xs font-medium text-muted-foreground">{today}</span>
        <span className="hidden md:inline-flex text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary">
          FY27 Q4
        </span>
        <button className="w-8 h-8 flex items-center justify-center text-[var(--outline)] hover:text-primary transition-colors rounded-lg hover:bg-primary/5">
          <Search size={16} />
        </button>
        <button className="w-8 h-8 flex items-center justify-center text-[var(--outline)] hover:text-primary transition-colors rounded-lg hover:bg-primary/5 relative">
          <Bell size={16} />
        </button>
        <button
          onClick={() => window.print()}
          className="hidden md:flex text-xs px-2.5 py-1 rounded-lg border border-[var(--outline-variant)]/40 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
          title="Download as PDF"
        >
          ↓ PDF
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/topbar.tsx
git commit -m "style: topbar → Azure glassmorphism, responsive left offset"
```

---

## Task 6: AppShell — Responsive Main Area

**Files:**
- Modify: `src/components/layout/app-shell.tsx`

- [ ] **Step 1: Fix hardcoded ml-[220px] offset**

Replace the entire file:

```tsx
// src/components/layout/app-shell.tsx
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { MobileBottomNav } from './mobile-bottom-nav'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Topbar />
      <main className="pt-14 lg:ml-64 min-h-screen pb-16 lg:pb-0 print:ml-0 print:pt-0">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
      <MobileBottomNav />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/app-shell.tsx
git commit -m "fix: responsive app-shell — removes hardcoded ml-[220px], adds mobile bottom padding"
```

---

## Task 7: Mobile Bottom Nav

**Files:**
- Create: `src/components/layout/mobile-bottom-nav.tsx`

- [ ] **Step 1: Create mobile bottom nav component**

```tsx
// src/components/layout/mobile-bottom-nav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, CheckSquare, FolderKanban, Users, BarChart3 } from 'lucide-react'

const NAV = [
  { href: '/', label: 'Home', Icon: LayoutDashboard },
  { href: '/tasks', label: 'Tasks', Icon: CheckSquare },
  { href: '/projects', label: 'Projects', Icon: FolderKanban },
  { href: '/team', label: 'Team', Icon: Users },
  { href: '/metrics', label: 'Metrics', Icon: BarChart3 },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-[var(--outline-variant)]/20 shadow-[0_-8px_24px_rgba(0,74,198,0.06)] print:hidden">
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {NAV.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[60px] transition-all duration-200',
                active ? 'text-primary' : 'text-[var(--outline)]'
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
              <span className={cn('text-[10px] font-semibold', active ? 'text-primary' : 'text-[var(--outline)]')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/mobile-bottom-nav.tsx
git commit -m "feat: mobile bottom nav — 5 primary routes, Azure glassmorphism style"
```

---

## Task 8: UI Primitives — Azure Tokens

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/stat-card.tsx`

- [ ] **Step 1: Read current button.tsx**

```bash
cat src/components/ui/button.tsx
```

- [ ] **Step 2: Update primary button variant to use gradient**

In `button.tsx`, find the `primary` variant class string and update it:

Current (likely):
```
"bg-primary text-primary-foreground hover:bg-primary/90"
```

Replace with:
```
"bg-gradient-to-br from-[var(--primary-container)] to-primary text-white shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98]"
```

- [ ] **Step 3: Update card.tsx — remove dark border, use shadow-glass**

In `card.tsx`, remove `border` class from the Card root and add:
```
"bg-card shadow-[var(--shadow-glass)] rounded-xl"
```

- [ ] **Step 4: Update input.tsx — Azure style**

In `input.tsx`, update the base classes:
```
"bg-[var(--surface-container-low)] border-none rounded-lg px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none placeholder:text-[var(--outline)]"
```

- [ ] **Step 5: Update stat-card.tsx — Azure card with icon bg**

Read current file, then update the outer wrapper:
- Background: `bg-white` (surface-container-lowest)
- Remove dark borders
- Add `shadow-[var(--shadow-glass)]`
- Primary color for icon background: `bg-primary/5` with `text-primary` icon

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/card.tsx src/components/ui/input.tsx src/components/ui/stat-card.tsx
git commit -m "style: UI primitives → Azure design (gradient buttons, glass cards, clean inputs)"
```

---

## Task 9: Dashboard Page — Azure Layout

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update stat card section**

The dashboard has 4 StatCards for open/overdue/today/week tasks. Update the wrapper grid:
```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
```
Each StatCard should receive updated `className` for Azure look (no change to data props).

- [ ] **Step 2: Update BentoGrid quick-nav section**

Replace the dark-styled bento items. Each BentoCard outer div:
```tsx
className="bg-white rounded-xl p-5 shadow-[var(--shadow-glass)] hover:-translate-y-0.5 transition-all cursor-pointer group"
```
Icon container:
```tsx
className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center mb-3"
```
Icon:
```tsx
className="text-primary"
```

- [ ] **Step 3: Update Priority Tasks list section**

Outer wrapper:
```tsx
className="bg-white rounded-xl p-6 shadow-[var(--shadow-glass)]"
```
Header text: `text-foreground font-bold` (was gold)
Task rows: use `bg-[var(--surface-container-low)]` on hover state

- [ ] **Step 4: Update Team Snapshot section**

Outer wrapper:
```tsx
className="bg-white rounded-xl p-6 shadow-[var(--shadow-glass)]"
```

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "style: dashboard → Azure layout (white cards, glass shadows, blue primary accents)"
```

---

## Task 10: Install @dnd-kit + Drag-Drop Kanban on Tasks Page

**Files:**
- Modify: `src/app/tasks/page.tsx`

- [ ] **Step 1: Install dnd-kit packages**

```bash
cd "C:/Users/Saksham Shokeen/Desktop/FY 27/AI projects/Management tool/lohono-command-center"
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Read current tasks/page.tsx**

```bash
cat src/app/tasks/page.tsx
```

- [ ] **Step 3: Identify the status columns and task mutation hook**

The page should have `useTasks()` hook. Find the mutation that updates task status (likely `updateTask` or a PATCH `/api/tasks/[id]` call). This will be the drop handler target.

- [ ] **Step 4: Add KanbanBoard component inline in tasks/page.tsx**

Add these imports at the top (keep all existing imports):
```tsx
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
```

- [ ] **Step 5: Add SortableTaskCard component**

Add above the page component:
```tsx
function SortableTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-xl p-4 shadow-[var(--shadow-glass)] cursor-grab active:cursor-grabbing hover:-translate-y-0.5 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">
          {task.project ?? 'Task'}
        </span>
        <PriorityBadge priority={task.priority} />
      </div>
      <h4 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
        {task.title}
      </h4>
      {task.dueDate && (
        <div className="mt-3 flex items-center gap-1.5 text-[var(--outline)]">
          <span className="text-xs">{formatDate(task.dueDate)}</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Add Kanban columns + DndContext to page JSX**

Wrap the columns in `DndContext`:
```tsx
const COLUMNS = ['todo', 'in_progress', 'blocked', 'done'] as const
const COLUMN_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  done: 'Done',
}
const COLUMN_COLORS: Record<string, string> = {
  todo: 'var(--outline)',
  in_progress: 'var(--primary)',
  blocked: 'var(--color-critical)',
  done: 'var(--color-low)',
}

// In component body:
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
)

function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event
  if (!over || active.id === over.id) return
  // over.id is the column id if dropped on column, or task id if dropped on task
  const newStatus = COLUMNS.find(c => c === over.id) ??
    tasks.find((t: Task) => t.id === over.id)?.status
  if (newStatus && newStatus !== active.data.current?.status) {
    updateTask(String(active.id), { status: newStatus })
  }
}
```

Board JSX:
```tsx
<DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
  <div className="flex gap-5 overflow-x-auto pb-4">
    {COLUMNS.map(col => {
      const colTasks = tasks.filter((t: Task) => t.status === col)
      return (
        <div key={col} className="flex-1 min-w-[280px]">
          <div className="flex items-center gap-2 mb-4 px-1">
            <span className="w-2 h-2 rounded-full" style={{ background: COLUMN_COLORS[col] }} />
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--outline)]">
              {COLUMN_LABELS[col]}
            </h3>
            <span className="bg-[var(--surface-container-high)] text-[var(--outline)] text-[10px] px-2 py-0.5 rounded-full font-bold ml-auto">
              {colTasks.length}
            </span>
          </div>
          <SortableContext
            id={col}
            items={colTasks.map((t: Task) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 min-h-[120px] rounded-xl p-2 bg-[var(--surface-container-low)]/50">
              {colTasks.map((task: Task) => (
                <SortableTaskCard key={task.id} task={task} />
              ))}
            </div>
          </SortableContext>
        </div>
      )
    })}
  </div>
</DndContext>
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors (or only pre-existing unrelated errors)

- [ ] **Step 8: Commit**

```bash
git add src/app/tasks/page.tsx package.json package-lock.json
git commit -m "feat: drag-drop Kanban board on tasks page with @dnd-kit"
```

---

## Task 11: Remaining Pages — Azure Styling Pass

**Files:**
- Modify: `src/app/my-tasks/page.tsx`
- Modify: `src/app/team/page.tsx`
- Modify: `src/app/metrics/page.tsx`
- Modify: `src/app/projects/page.tsx`

For each page, apply the same Azure styling principles:
- Replace dark backgrounds with `bg-white` / `bg-[var(--surface-container-low)]`
- Replace gold accents with `text-primary` / `bg-primary/10`
- Remove `border-border` hardcoded borders — use background shifts for structure
- Cards: `shadow-[var(--shadow-glass)] rounded-xl`
- Headers: `text-3xl font-extrabold tracking-tight text-foreground`
- Secondary text: `text-[var(--outline)]`
- Active/badge pills: `bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest`

- [ ] **Step 1: Update my-tasks/page.tsx — task list cards**

- [ ] **Step 2: Update team/page.tsx — member cards grid**

Team member card pattern (from Stitch export):
```tsx
<div className="bg-white rounded-xl p-5 shadow-[var(--shadow-glass)] hover:-translate-y-0.5 transition-all">
  <div className="flex items-center gap-3 mb-3">
    <MemberAvatar member={member} size="lg" />
    <div>
      <p className="font-bold text-foreground">{member.name}</p>
      <p className="text-xs text-[var(--outline)]">{member.role}</p>
    </div>
  </div>
  ...
</div>
```

- [ ] **Step 3: Update metrics/page.tsx — KPI cards**

KPI card pattern:
```tsx
<div className="bg-white rounded-xl p-6 shadow-[var(--shadow-glass)]">
  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--outline)] mb-1">{label}</p>
  <p className="text-3xl font-extrabold tracking-tight text-foreground">{value}</p>
  <p className="text-xs text-[var(--outline)] mt-1">{subtext}</p>
</div>
```

- [ ] **Step 4: Update projects/page.tsx — project cards**

- [ ] **Step 5: Commit**

```bash
git add src/app/my-tasks/page.tsx src/app/team/page.tsx src/app/metrics/page.tsx src/app/projects/page.tsx
git commit -m "style: remaining pages → Azure design (white cards, blue accents, responsive grids)"
```

---

## Task 12: Status + Priority Badges — Azure Colors

**Files:**
- Modify: `src/components/ui/status-badge.tsx`
- Modify: `src/components/ui/priority-badge.tsx`

- [ ] **Step 1: Update status badge colors**

Read `src/components/ui/status-badge.tsx`, then update color mappings:
- `todo` → `bg-[var(--surface-container-high)] text-[var(--outline)]`
- `in_progress` → `bg-primary/10 text-primary`
- `blocked` → `bg-[var(--error-container)] text-[var(--on-error-container)]`
- `done` → `bg-green-50 text-green-700`

- [ ] **Step 2: Update priority badge colors**

Read `src/components/ui/priority-badge.tsx`, then update:
- `critical` → `bg-red-50 text-red-700`
- `high` → `bg-orange-50 text-orange-700`
- `medium` → `bg-blue-50 text-blue-700`
- `low` → `bg-green-50 text-green-700`

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/status-badge.tsx src/components/ui/priority-badge.tsx
git commit -m "style: status and priority badges → Azure semantic colors"
```

---

## Task 13: Build Verification

- [ ] **Step 1: Run local build check**

```bash
cd "C:/Users/Saksham Shokeen/Desktop/FY 27/AI projects/Management tool/lohono-command-center"
npm run build
```
Expected: build completes without errors (warnings OK)

- [ ] **Step 2: If build fails, fix TypeScript/import errors**

Common issues:
- Missing `updateTask` function in tasks hook — check what the actual mutation function is named and update Task 10 accordingly
- Import paths — verify all new component imports are correct

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: build errors after Azure redesign"
```

---

## Task 14: Push to Main → Vercel Deploy

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Verify Vercel starts deploying**

Check Vercel dashboard or run:
```bash
# If gh CLI is available:
gh run list --limit 3
```

Expected: deployment triggered, status "queued" or "in_progress"

---

## Notes & Decisions

1. **Icons**: Lucide stays (already installed, familiar, tree-shaken). Material Symbols Outlined (from Stitch) is a Google CDN font — adding it would add a 100kb+ network request. Lucide equivalents are used.

2. **No-line rule**: Applied — structural separations use background color shifts (`bg-[var(--surface-container-low)]` vs `bg-white`), not borders.

3. **Glass shadow formula**: `shadow-[0_20px_40px_rgba(0,74,198,0.06)]` is the Azure "ambient shadow" — blue-tinted like light through glass, not grey.

4. **Drag-drop scope**: Only tasks board in this plan. Projects page drag-drop (reordering within a project) is deferred.

5. **Dark mode**: CSS vars include a `.dark` block for future use. The app is light-only for now. Remove `className="dark"` from layout.tsx makes it always use `:root` (light).

6. **next-themes**: Already installed. Can be wired up in a future iteration if user wants a dark mode toggle.
