# Reporting Hub — Design Spec
**Date:** 2026-04-13  
**Status:** Approved for implementation planning  
**Scope:** New `/reporting` route + Redash data pipeline + Gamma prompt generator

---

## 1. Goal

Replace the current manual Google Sheets → Kairos metrics flow with a direct Redash Cloud integration, and build a three-tier Reporting Hub that serves VP, CBO, and Founder audiences from a single source of truth — with one-click Gamma prompt generation for each tier.

The existing `/metrics` and `/reports` pages are **unchanged**.

---

## 2. Design Direction

**Visual reference:** Type 3 (Stitch — clean light theme)

- White background, Lohono Stays top nav pattern
- Audience pill toggle: `FOUNDER · CBO · VP`
- Time toggle: `WTD · MTD · QTD · YTD`
- Section tabs: `REVENUE · FUNNEL · SEGMENT MIX · REGION · OCCUPANCY · FORWARD PACE`
- Multi-line revenue chart (FY27 vs Budget vs FY26)
- Segment Mix + Region Mix right panel
- Dark `GENERATE GAMMA PROMPT` CTA — bottom right, persistent

Founder view borrows Type 2's narrative card layout (strategic highlights + operational watchlist).

---

## 3. Data Pipeline

### 3.1 Architecture

```
Redash Cloud (~10-15 raw queries)
      ↓  HTTPS + API key (server-side Vercel env only)
/api/reporting/sync  (daily cron 7 AM IST + on-demand)
      ↓
Transformation layer  (WTD / MTD / QTD / YTD computed in Kairos)
      ↓
Postgres  →  RedashSnapshot table  (raw JSON cache, TTL 24h)
      ↓
/api/reporting?section=funnel&view=mtd&audience=vp
      ↓
Reporting Hub  (/reporting)
      ↓
OpenAI  →  Gamma prompt modal
```

### 3.2 Environment Variables (new)

```
REDASH_API_URL=https://app.redash.io/<slug>
REDASH_API_KEY=<read-only user key>
```

### 3.3 Redash Query Map

| Query ID slot | Raw data it returns | Powers section |
|---|---|---|
| `Q_CHECKIN_REVENUE` | date, location, state, segment, revenue, bedroom_count | Revenue |
| `Q_BOOKING_GMV` | date, segment, location, state, net_revenue, gross_revenue | Revenue |
| `Q_BUDGET_TARGETS` | month, segment, state, budget_leads, budget_prospects, budget_bookings, budget_gross_rev, budget_ci_rev | Revenue (Budget vs Actual) |
| `Q_SALES_FUNNEL` | date, segment, location, state, leads, prospects, bookings | Funnel |
| `Q_OTA_GMV` | date, channel, region, gross_gmv, net_gmv, cancellations | Funnel + Segment Mix |
| `Q_SEGMENT_FUNNEL` | month, segment, leads, prospects, bookings, gmv | Segment Mix |
| `Q_REGION_FUNNEL` | month, region, leads, prospects, bookings, gmv | Region |
| `Q_REGION_REVENUE` | month, region, ci_revenue | Region |
| `Q_OCCUPANCY` | date, location, state, sold_nights, available_nights | Occupancy |
| `Q_ARR` | date, location, segment, revenue, sold_nights | Occupancy (ARR) |
| `Q_FORWARD_PACE` | checkin_date, location, segment, bookings_count, gmv | Forward Pace |
| `Q_LY_CHECKIN` | date, location, state, segment, revenue (last FY) | All (YoY comparison) |
| `Q_LY_FUNNEL` | date, segment, location, leads, prospects, bookings (last FY) | All (YoY comparison) |
| `Q_PROPERTY_REVENUE` | month, property_slug, property_name, location, revenue, sold_nights | Region / Occupancy VP drill-down |
| `Q_PROPERTY_OCCUPANCY` | month, property_slug, available_nights, sold_nights, arr | Occupancy VP drill-down |

Query IDs stored in a new `settings` row or as env vars: `REDASH_QUERY_IDS={"checkin_revenue":42,"booking_gmv":17,...}`

### 3.4 RedashSnapshot Schema

```prisma
model RedashSnapshot {
  id          String   @id @default(cuid())
  queryKey    String   // e.g. "Q_SALES_FUNNEL"
  queryId     Int      // Redash query ID
  rows        Json     // raw array of row objects
  fetchedAt   DateTime @default(now())
  rowCount    Int
  
  @@unique([queryKey])
}
```

### 3.5 Time Period Computation

All periods computed against rows with a `date` column (ISO string or Date). FY = Apr 1 → Mar 31.

| Toggle | Filter logic |
|---|---|
| **WTD** | `date >= Monday of current week` vs same window last week |
| **MTD** | `date >= 1st of current month` vs same day-offset last month |
| **QTD** | `date >= 1st of current quarter (Apr/Jul/Oct/Jan)` vs same period last quarter |
| **YTD** | `date >= Apr 1 of current FY` vs `Apr 1 LY → same calendar date LY` |

The transformation runs in a `lib/services/reporting.ts` service, never in the component.

---

## 4. Route & Page Structure

```
/reporting                          ← Reporting Hub (new)
/api/reporting/sync                 ← POST: trigger Redash sync (cron + manual)
/api/reporting                      ← GET: ?section=&view=&audience=
/api/reporting/gamma                ← POST: OpenAI → generate Gamma prompt
```

---

## 5. Audience Views

### 5.1 Founder View
- 3 large circular progress cards: Revenue attainment · Bookings attainment · L2B% vs target
- "Highlights ✓" column (top 3 positives, auto-derived from data)
- "Watch ⚠" column (top 3 concerns, auto-derived)
- Single CTA: `GENERATE FOUNDER BRIEF FOR GAMMA`
- No section tabs — single scrollable narrative

### 5.2 CBO View
- All 6 sections visible but condensed (no property-level drill-down)
- Revenue chart (line: FY27 vs Budget vs FY26)
- Funnel summary (pipeline cards + conversion rates)
- Segment mix (stacked bar)
- Region summary (bar chart)
- Occupancy % by region
- Forward pace index

### 5.3 VP View
- Full data density — Type 3 design
- All 6 sections fully expanded
- Segment × Region funnel tables
- Property-level occupancy + ARR table
- All time toggles active
- Manual "Refresh from Redash" button

---

## 6. Section Specs

### 6.1 Revenue Section
**KPI bar (4 cards):**
- Check-in Revenue `[view]` — value + delta vs LMTD/Budget
- Booking GMV `[view]`
- YTD Revenue — with Budget attainment %
- YTD vs LY growth index

**Chart:** 3-line (FY27 / Budget / FY26), months Apr–Mar, ₹ Cr y-axis, current month dot highlighted

**Right panel:**
- Segment Mix (horizontal bars: Direct B2C / Partners B2B / OTA)
- Regional Mix (horizontal bars: Goa / Maharashtra / North / South / International)

### 6.2 Funnel Section
**KPI bar (5 cards):** Leads · Prospects · Bookings · L2P% · P2B%  
Each with delta vs LMTD and vs LY

**Funnel visual:** Horizontal funnel (Leads → Prospects → Bookings) with conversion rates between stages

**Tables (VP only):**
- Funnel by Segment: Segment | Leads | Prospects | Bookings | L2P% | P2B% | L2B%
- Funnel by Region: Region | Leads | Prospects | Bookings | L2P% | P2B%

**Attainment bars:** Leads / Prospects / Bookings / CI Revenue vs FY27 targets

### 6.3 Segment Mix Section
Segments: B2C · Travel Agent · OTA · Corporate · B2B Other

Per segment: GMV bar, funnel counts, conversion rates, MoM delta chips

### 6.4 Region Section
Regions: Goa · Maharashtra · North India · South India · International

Per region: CI Revenue bar, funnel summary, top locations (VP: property table)

### 6.5 Occupancy Section
**KPI bar:** Portfolio occupancy % · Sold nights YTD · ARR overall · ARR weekend premium

**Table (VP):** Location | Available Nights | Sold Nights | Occupancy % | ARR | MoM delta

### 6.6 Forward Pace Section
Heatmap-style grid: check-in dates (next 90 days) × regions — colour intensity = booking pace vs LY same window

---

## 7. Gamma Prompt Generator

### 7.1 UI
Floating `GENERATE GAMMA PROMPT ✦` button (dark, bottom-right, persistent across all views).

On click: right-side drawer slides in (Type 3 drawer pattern):
- **3 preset buttons**: Founder Brief · CBO Summary · VP Full Dump
- **Custom Builder**: checkboxes for each section + audience dropdown
- **Output area**: generated prompt + "Copy to Clipboard" + "Regenerate"

### 7.2 API
`POST /api/reporting/gamma`

Request:
```json
{
  "audience": "founder" | "cbo" | "vp",
  "sections": ["revenue", "funnel", ...],
  "view": "mtd" | "ytd" | ...,
  "data": { /* current snapshot of all relevant metrics */ }
}
```

Calls OpenAI `gpt-4o` with a system prompt instructing it to produce a Gamma-ready presentation brief. Data is embedded directly in the user message — no hallucination of numbers.

Output: structured Gamma prompt string (slide titles, content bullets, chart suggestions, narrative tone matching the audience tier).

---

## 8. Security

| Layer | Implementation |
|---|---|
| Redash API key | Vercel env var only — never in client bundle |
| Redash calls | Server-side only (`/api/reporting/sync`) |
| Reporting endpoints | Same RBAC as `/api/metrics` — SUPER_ADMIN, MANAGER, EXEC_VIEWER + KpiVisibility |
| OpenAI key | Already in env (`OPENAI_API_KEY`) — existing pattern |
| Cache fallback | If Redash unreachable, serve last `RedashSnapshot` — never fail silently without showing `fetchedAt` timestamp |
| Redash key type | Must use read-only Redash user's API key — not admin key |

---

## 9. What Stays Unchanged

- `/metrics` page — existing YTD aggregates from Google Sheets sync
- `/reports` page — weekly task reports, email functionality
- `NumberEntry` table — Sheets sync continues as before
- `apps-script/Code.gs` — untouched

---

## 10. Out of Scope

- Property-level detail pages (future)
- Automated Gamma submission (future — API not public)
- Historical chart overlays beyond FY24/25/26 (future)
- Real-time streaming (daily sync is sufficient)
