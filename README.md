# Lohono Command Center

> A personal management operating system built for a first-time people manager overseeing 5 direct reports across 6 departments at Lohono Stays — replacing scattered spreadsheets and Slack threads with a single, always-available command center.

**Live:** [lohono-command-center.vercel.app](https://lohono-command-center.vercel.app)

---

## What It Does

This is a full-stack web app (installable as a PWA on Android, iOS, and Windows) that centralises everything a revenue-focused people manager needs day-to-day:

- **Revenue tracking** — FY27 OTA Gross GMV and Check-in revenue actuals vs targets, pulled live from Google Sheets
- **Team management** — profiles, 1:1 logs, open task counts per member
- **Task & project tracking** — prioritised task list with owner assignment and due dates
- **Meeting cadences** — weekly standups, dept reviews, monthly and quarterly reviews with auto-generated prep tasks
- **Stakeholder CRM** — contact list with influence/interest mapping and interaction log
- **Reports** — auto-generated weekly summaries sent via email
- **AI context** — local MCP server that gives Claude Desktop full visibility into the live app (tasks, team pulse, revenue status, risks) via natural language

---

## Why I Built It

I became a people manager for the first time in FY27, managing a team of 5 across OTA revenue, check-in GMV, partnerships, and operations. I had no single place to track what my team was working on, how we were tracking against revenue targets, or prepare for recurring meetings. I spec'd out exactly what I needed and built it using Claude Code — I don't write code, but I directed every product decision, designed the data model, wrote the specs, and reviewed every implementation choice.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | PostgreSQL on Neon (serverless) |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Deployment | Vercel |
| Data sync | Google Apps Script → Sheets → API |
| Email | Resend |
| Cron | cron-job.org (4 scheduled jobs) |
| PWA | @ducanh2912/next-pwa (Workbox) |
| AI context | Model Context Protocol (MCP) server |

---

## Features

### Dashboard
- Live revenue KPIs: Check-in GMV YTD and OTA Gross GMV YTD vs targets
- Attainment % with visual progress indicators
- Quick-nav BentoGrid to all major sections
- Animated shimmer title

### OTA Assessment
- YTD Gross GMV, Net Revenue, MMT channel actuals
- Monthly breakdown table with target vs actual
- % attainment per month

### Check-in GMV Assessment
- YTD revenue with ARR, weekday/weekend split
- Regional breakdown: Goa, Maharashtra, North
- Monthly actuals vs targets

### Metrics
- FY27 KPI dashboard across all revenue streams

### Tasks & Projects
- Full CRUD with priority levels (Critical / High / Medium / Low)
- Assign to team members, set due dates
- Filter by assignee, status, project

### Team
- Member profiles with department, role, and contact info
- Per-member task count and open items
- 1:1 history log

### Cadences
- Pre-seeded recurring meetings (weekly standup, dept review, monthly, quarterly)
- Animated prep item checklist with lead time per item
- One-click prep task generation — creates tasks in the task list before each meeting

### Stakeholders
- Internal and external stakeholder directory
- Influence/interest classification
- Interaction log

### Reports
- Weekly auto-generated summaries
- PDF export on every page via browser print

### Offline / PWA
- Installable on Android, iOS, Windows
- Offline read support for metrics, targets, and numbers via StaleWhileRevalidate caching
- Custom offline fallback page

---

## Architecture

```
Google Sheets (source of truth for actuals)
    ↓ Apps Script (SUMIFS summary tab)
    ↓ POST /api/cron/sync-metrics  ← cron-job.org (daily)
    ↓ Neon PostgreSQL (metrics table)
    ↓ GET /api/metrics  ← Next.js API route
    ↓ SWR client hook  ← React pages
    ↓ Service Worker cache  ← offline support
```

```
MCP Server (local, stdio)
    ↓ 16 tools (get_dashboard_snapshot, get_revenue_status, create_task, etc.)
    ↓ HTTP → Vercel app (with CRON_SECRET auth)
    ↓ Claude Desktop — natural language queries against live data
```

---

## Cron Jobs (cron-job.org)

| Job | Schedule | Endpoint |
|-----|----------|----------|
| Sync metrics from Sheets | Daily 6:00 AM IST | `POST /api/cron/sync-metrics` |
| Weekly email report | Monday 7:00 AM IST | `POST /api/cron/weekly-report` |
| Generate cadence prep tasks | Sunday 8:00 PM IST | `POST /api/cron/prep-tasks` |
| Sync targets | Weekly | `POST /api/cron/sync-targets` |

All jobs send `Authorization: Bearer <CRON_SECRET>` header.

---

## MCP Server

A local MCP server at `lohono-mcp/server.js` gives Claude Desktop 16 tools to query the live app:

```
get_dashboard_snapshot    get_team_pulse         get_revenue_status
get_member_brief          get_stakeholder_brief  get_week_prep
get_ota_performance       get_overdue_tasks      identify_risks
create_task               update_task_status     log_one_on_one
draft_stakeholder_update  trigger_weekly_report  trigger_sheets_sync
trigger_prep_tasks
```

Example: *"What are the overdue tasks this week and who owns them?"* → Claude queries the live DB and responds with a structured summary.

---

## How This Was Built

This project was built entirely through **Claude Code** — Anthropic's AI coding agent. I don't write code. My contribution was:

- Product vision and requirements
- Full feature specification (written in natural language, then refined into technical specs)
- Data model design (what tables, what fields, what relationships)
- Every UX and product decision (what to show, how to display it, what to skip)
- Reviewing and approving every implementation choice
- Debugging and directing fixes when things broke

The implementation — TypeScript, Prisma schema, API routes, React components, service worker config, MCP server — was written by Claude Code following my specs. This is a deliberate demonstration of AI-augmented product development: the value is in the thinking, not the typing.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── tasks/                      # Task management
│   ├── projects/                   # Project tracking
│   ├── team/                       # Team profiles + 1:1s
│   ├── one-on-ones/                # 1:1 meeting logs
│   ├── cadence/                    # Meeting cadences
│   ├── stakeholders/               # Stakeholder CRM
│   ├── metrics/                    # KPI dashboard
│   ├── assessment/
│   │   ├── ota/                    # OTA GMV assessment
│   │   └── checkin/                # Check-in GMV assessment
│   ├── reports/                    # Weekly reports
│   ├── playbook/                   # SOPs and guides
│   ├── offline/                    # PWA offline fallback
│   └── api/                        # 11 API route groups
├── components/
│   ├── layout/                     # Sidebar, topbar, app shell
│   └── ui/                         # AgentPlan, BentoGrid, TextShimmer, StatCard, etc.
├── hooks/                          # SWR data hooks
├── lib/
│   ├── prisma.ts
│   └── services/                   # cadence, targets, numbers, reports
public/
├── manifest.json                   # PWA manifest
└── icons/                          # 192px, 512px, apple-touch-icon
scripts/
└── generate-icons.js               # Sharp-based icon generator
lohono-mcp/
└── server.js                       # MCP server (16 tools)
```

---

## Environment Variables

```env
DATABASE_URL=          # Neon PostgreSQL connection string
DIRECT_URL=            # Neon direct connection (for Prisma migrations)
RESEND_API_KEY=        # Resend email API key
CRON_SECRET=           # Shared secret for cron job auth
NEXT_PUBLIC_APP_URL=   # App base URL (for MCP server)
```
