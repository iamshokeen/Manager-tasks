# Kairos — Full Application Specification
> Version: 2026-03-28 · Stack: Next.js 16 · React 19 · PostgreSQL (Neon) · Prisma 7 · Tailwind v4 · shadcn/ui

---

## 0. App Identity

| Field | Value |
|-------|-------|
| App name | Kairos |
| AI layer | Telos |
| Tagline | "Know the moment. Own the purpose." |
| Brand voice | Sharp operator. Short sentences. Active verbs. No corporate fluff. |
| Primary user | Saksham Shokeen, Head of Revenue Strategy, Lohono Stays |
| Primary purpose | Personal manager OS — replaces scattered spreadsheets + Slack threads |
| Live URL | https://lohono-command-center.vercel.app |
| GitHub | https://github.com/iamshokeen/Manager-tasks |
| Deployment | Vercel (auto-deploy on push to main) |
| Push command | `git push origin master:main` |

---

## 1. Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.2 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | PostgreSQL on Neon (serverless) |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Auth | Custom OTP/JWT (jose + bcryptjs) — NextAuth removed |
| Email | Resend (transactional), Nodemailer + Gmail SMTP (weekly reports) |
| AI | Anthropic Claude (summarize, parse-tasks, progress) |
| Animations | Framer Motion v12 |
| Theme | next-themes v0.4 |
| Data fetching | SWR v2 |
| Rich text | TipTap |
| Drag & drop | @dnd-kit/core |
| Cron jobs | cron-job.org (external — Vercel Hobby limit) |
| PWA | manifest + offline fallback |
| Notifications | sonner (toast) |
| Charts | Recharts |
| Icons | Lucide React |
| DB schema changes | `prisma db push` (Neon pooler can't run `migrate dev`) |

---

## 2. Database Schema — Complete

### Enums

```
Role:           SUPER_ADMIN | MANAGER | SENIOR_IC | DIRECT_REPORT | EXEC_VIEWER | GUEST
ApprovalStatus: PENDING | APPROVED | REJECTED
InviteStatus:   PENDING | ACCEPTED | EXPIRED
WorkspaceType:  PLATFORM | DEPARTMENT | PROJECT | PERSONAL
```

### User
```
id                  cuid PK
email               String UNIQUE           — auth identifier
name                String                  — display name
avatarUrl           String?                 — profile image URL
role                Role  default=DIRECT_REPORT
isActive            Boolean default=true
emailVerified       Boolean default=false
verifyToken         String?                 — bcrypt hash of OTP
verifyExpiry        DateTime?
approvalStatus      ApprovalStatus default=PENDING
approvedBy          String?                 — userId of approver
approvedAt          DateTime?
lastLoginAt         DateTime?
onboardingCompleted Boolean default=false
managerId           String?                 — FK → User (self-relation)
manager             User?                   → (managerId)
reports             User[]                  ← (reports of this manager)
teamMemberId        String? UNIQUE          — legacy link to TeamMember row
teamMember          TeamMember?
workspaceMemberships WorkspaceMember[]
sentInvites         Invite[]
kpiOverrides        KpiVisibility[]
activityLogs        ActivityLog[]
kpiAccessRequest    KpiAccessRequest?
createdAt / updatedAt
```

### Workspace
```
id          cuid PK
name        String
slug        String UNIQUE
type        WorkspaceType
description String?
isArchived  Boolean default=false
createdBy   String              — userId
members     WorkspaceMember[]
invites     Invite[]
kpiSettings KpiSetting[]
createdAt / updatedAt
```

### WorkspaceMember
```
id          cuid PK
workspaceId String FK→Workspace
userId      String FK→User
role        Role
joinedAt    DateTime default=now
UNIQUE(workspaceId, userId)
```

### Invite
```
id          cuid PK
email       String              — invitee email
workspaceId String? FK→Workspace
role        Role
token       String UNIQUE       — cuid invite token
status      InviteStatus default=PENDING
expiresAt   DateTime
sentById    String FK→User
createdAt
```

### KpiSetting
```
id          cuid PK
workspaceId String FK→Workspace
kpiKey      String              — e.g. "revenue_vs_target"
visibleTo   Role[]              — array of allowed roles
updatedAt
UNIQUE(workspaceId, kpiKey)
```

### KpiVisibility (per-user override)
```
id      cuid PK
userId  String FK→User
kpiKey  String
isVisible Boolean default=true
UNIQUE(userId, kpiKey)
```

### KpiAccessRequest
```
id      cuid PK
userId  String UNIQUE FK→User
status  String              — "pending" | "approved" | "denied"
note    String?
createdAt / updatedAt
```

### ActivityLog
```
id        cuid PK
userId    String FK→User
action    String              — e.g. "task_created", "workspace_created"
metadata  Json?               — context data (taskId, title, etc.)
createdAt
```

### TeamMember
```
id              cuid PK
name            String
role            String              — job role (not app Role)
department      String
status          String default="active"   — active|hiring|inactive|on_leave|exited
skills          String?             — comma-separated
oneOnOneDay     String?             — e.g. "Monday"
oneOnOneTime    String?             — e.g. "10:00 AM"
coachingNotes   Text?
hireDate        DateTime?
delegationLevel Int default=1       — 1=Do, 2=Research, 3=Decide, 4=Own
user            User?               — linked app user
tasks           Task[]
oneOnOnes       OneOnOne[]
emailThreads    EmailThread[]
projects        Project[]
followUps       FollowUp[]
createdAt / updatedAt
```

### OneOnOne
```
id              cuid PK
memberId        String FK→TeamMember (onDelete: Cascade)
date            DateTime
mood            String default="neutral"
theirUpdates    Text?
myUpdates       Text?
feedbackGiven   Text?
developmentNotes Text?
actionItems     OneOnOneAction[]
createdAt
```

### OneOnOneAction
```
id          cuid PK
oneOnOneId  String FK→OneOnOne (onDelete: Cascade)
action      String
owner       String
dueDate     DateTime?
completed   Boolean default=false
completedAt DateTime?
createdAt
```

### Project
```
id            cuid PK
title         String
description   Text?
department    String
stage         String default="planning"   — planning|active|review|closed
ownerId       String? FK→TeamMember (onDelete: SetNull)
stakeholderId String? FK→Stakeholder (legacy single)
stakeholders  ProjectStakeholder[]        — many-to-many
dueDate       DateTime?
tasks         Task[]
followUps     FollowUp[]
createdAt / updatedAt
```

### Task
```
id             cuid PK
title          String
description    Text?
assigneeId     String? FK→TeamMember (onDelete: SetNull)
isSelfTask     Boolean default=false
projectId      String? FK→Project (onDelete: SetNull)
department     String
priority       String default="medium"    — critical|high|medium|low
status         String default="todo"      — todo|in_progress|review|blocked|done
dueDate        DateTime?
completedAt    DateTime?
stakeholderId  String? FK→Stakeholder (legacy)
stakeholders   TaskStakeholder[]          — many-to-many
cadenceId      String? FK→Cadence (onDelete: SetNull)
emailThreads   TaskEmailLink[]
activities     TaskActivity[]
source         String default="manual"    — manual|ai|email
tags           String[] default=[]
assignedByName String?
followUps      FollowUp[]
createdAt / updatedAt
```

### TaskActivity
```
id          cuid PK
taskId      String FK→Task (onDelete: Cascade)
type        String              — status_change|comment|assigned|priority_change|etc
from        String?
to          String?
note        Text?
source      String default="user"
authorName  String?
createdAt
```

### TaskStakeholder (junction)
```
taskId        String FK→Task (onDelete: Cascade)
stakeholderId String FK→Stakeholder (onDelete: Cascade)
PK(taskId, stakeholderId)
```

### Stakeholder
```
id        cuid PK
name      String
title     String?
frequency String              — weekly|monthly|quarterly|as_needed
channel   String              — email|call|meeting|slack
priority  String default="high"  — critical|high|medium|low
context   Text?
strategy  Text?
email     String?
tasks     Task[]
projects  Project[]
taskLinks TaskStakeholder[]
projectLinks ProjectStakeholder[]
followUps FollowUp[]
createdAt / updatedAt
```

### ProjectStakeholder (junction)
```
projectId     String FK→Project (onDelete: Cascade)
stakeholderId String FK→Stakeholder (onDelete: Cascade)
PK(projectId, stakeholderId)
```

### Cadence
```
id          cuid PK
name        String              — e.g. "Weekly Standup"
type        String              — standup|review|sync|check-in
day         String              — Monday|Tuesday|etc
time        String              — "10:00 AM"
duration    Int default=30      — minutes
scope       String              — team|individual|cross-team
description Text?
isActive    Boolean default=true
prepItems   CadencePrepItem[]
tasks       Task[]
createdAt / updatedAt
```

### CadencePrepItem
```
id          cuid PK
cadenceId   String FK→Cadence (onDelete: Cascade)
title       String
assigneeId  String?
department  String?
leadTimeDays Int default=1
createdAt
```

### EmailThread
```
id            cuid PK
gmailThreadId String UNIQUE
subject       String
from          String
to            String[]
lastMessageAt DateTime
snippet       Text?
status        String default="open"
priority      String default="medium"
assigneeId    String? FK→TeamMember (onDelete: SetNull)
tasks         TaskEmailLink[]
labels        String[] default=[]
isStarred     Boolean default=false
createdAt / updatedAt
```

### TaskEmailLink (junction)
```
id            cuid PK
taskId        String FK→Task (onDelete: Cascade)
emailThreadId String FK→EmailThread (onDelete: Cascade)
createdAt
UNIQUE(taskId, emailThreadId)
```

### FollowUp
```
id              cuid PK
title           String
description     Text?
contactName     String
teamMemberId    String? FK→TeamMember (onDelete: SetNull)
stakeholderId   String? FK→Stakeholder (onDelete: SetNull)
status          String default="open"   — open|snoozed|closed|converted
parentId        String? FK→FollowUp (self-relation "FollowUpTree", onDelete: Cascade)
children        FollowUp[]
reminderAt      DateTime?
snoozedUntil    DateTime?
autoRemind      Boolean default=true
lastActivityAt  DateTime default=now
taskId          String? FK→Task (onDelete: SetNull)
projectId       String? FK→Project (onDelete: SetNull)
convertedTaskId String?
notes           FollowUpNote[]
createdAt / updatedAt
```

### FollowUpNote
```
id          cuid PK
followUpId  String FK→FollowUp (onDelete: Cascade)
content     Text
authorName  String?
createdAt
```

### Note
```
id      cuid PK
content Text
createdAt / updatedAt
```

### NumberEntry (metrics)
```
id        cuid PK
metric    String              — e.g. "ci_revenue_ytd"
value     Float
period    String              — "2026-01" | "2026-W05"
source    String default="sheets"
syncedAt  DateTime?
createdAt
UNIQUE(metric, period)
```

### Report
```
id        cuid PK
type      String              — "weekly"
period    String              — "2026-W12"
data      Json
emailedAt DateTime?
createdAt
UNIQUE(type, period)
```

### Setting
```
id        cuid PK
key       String UNIQUE       — e.g. "app_name", "fy27_targets", "departments"
value     Text
updatedAt
```

---

## 3. Authentication & Session System

### Flow
1. User enters email → `POST /api/auth/login`
   - Checks: user exists, `isActive`, `approvalStatus === APPROVED`, `emailVerified`
   - If PENDING: redirect to `/auth/pending`
   - If REJECTED: redirect to `/auth/rejected`
   - If OK: generate 6-digit OTP, hash (bcrypt), store in `verifyToken` + `verifyExpiry` (+15 min)
   - Email OTP to user via Resend
2. User enters OTP → `POST /api/auth/verify-login`
   - Verify bcrypt hash, check expiry
   - If valid: `signJWT({ userId, email, role })`, `setAuthCookie(token)`, update `lastLoginAt`
3. All subsequent requests: cookie `lcc_token` (httpOnly, secure, sameSite: lax, 7-day expiry)
4. Sliding expiry: re-sign JWT if <2 days remain (handled in `getSession()`)
5. Logout: `POST /api/auth/logout` → `clearAuthCookie()` → redirect to `/auth/login`

### Session Functions (usage pattern)
```
API routes:         getSession()       — full DB lookup, use everywhere in API
Server components:  getSessionRole()   — JWT-only, no DB (fast, for layout/nav)
Client components:  useCurrentUser()   — SWR hook → /api/auth/me
```

### JWT Payload
```json
{ "userId": "...", "email": "...", "role": "MANAGER", "iat": 0, "exp": 0 }
```

### Cookie: `lcc_token`
- httpOnly: true
- secure: true (prod)
- sameSite: lax
- path: /
- maxAge: 604800 (7 days)

### Multi-User Registration Flow
1. Admin sends invite: `POST /api/admin/invites` → creates Invite record, emails token link
2. User clicks invite link → `/auth/accept-invite?token=xxx`
3. `GET /api/auth/invite/[token]` → validates token, returns invite metadata
4. User submits name → `POST /api/auth/accept-invite` → creates User (PENDING), marks invite ACCEPTED
5. Admin approves in `/dashboard/admin/approvals` → `POST /api/admin/approvals/[id]/approve`
   - Sets `approvalStatus = APPROVED`, sets role from invite
   - Sends approval email
6. User can now log in via OTP

### New User Self-Registration
- `GET /auth/request-access` → form
- `POST /api/auth/request-access` → creates User with `approvalStatus: PENDING`, emails admin
- Admin sees in Approvals queue

---

## 4. RBAC — Role-Based Access Control

### Roles (hierarchy, highest to lowest)
```
SUPER_ADMIN    — full access, admin panel, all data
MANAGER        — all operational data, team management
SENIOR_IC      — tasks, projects, stakeholders (read-only for some)
DIRECT_REPORT  — own tasks only, limited views
EXEC_VIEWER    — summary/read-only views, no edits
GUEST          — minimal access
```

### Resource Permissions Matrix
```
Resource            view                          create/edit               delete
─────────────────   ─────────────────────────     ──────────────────────    ─────────
tasks               ALL roles                     SA, MG, SIC, DR           SA, MG
projects            ALL except EV, G              SA, MG, SIC               SA, MG
one_on_ones         SA, MG, SIC, DR               SA, MG                    SA, MG
team_pulse          SA, MG                        SA, MG                    —
stakeholder_crm     SA, MG, SIC                   SA, MG                    SA, MG
revenue/metrics     ALL                           SA, MG                    —
users/admin         SA only                       SA only                   SA only
workspaces          SA (admin), members (own)     SA                        SA
```

### Data Scope by Role
```
SUPER_ADMIN    → all data across entire system
MANAGER        → own data + direct reports (by User.reports[] relation)
SENIOR_IC      → own data only (tasks assigned to self)
DIRECT_REPORT  → own tasks only (enforced at API level)
EXEC_VIEWER    → summary aggregates only
GUEST          → read-only summary only
```

### Sidebar Visibility Rules
```
Route hidden for these roles:
/cadence           → DIRECT_REPORT, EXEC_VIEWER, GUEST
/one-on-ones       → EXEC_VIEWER, GUEST
/stakeholders      → DIRECT_REPORT, EXEC_VIEWER, GUEST
/assessment/ota    → DIRECT_REPORT, SENIOR_IC, EXEC_VIEWER, GUEST
/assessment/checkin → DIRECT_REPORT, SENIOR_IC, EXEC_VIEWER, GUEST
/metrics           → EXEC_VIEWER, GUEST
/reports           → EXEC_VIEWER, GUEST
/projects          → EXEC_VIEWER, GUEST
Admin section      → SUPER_ADMIN only
```

### KPI Visibility (3-tier)
1. `KpiVisibility` table — per-user override (highest priority)
2. `KpiSetting` table — per-workspace, per-role defaults
3. Hardcoded defaults:
   ```
   revenue_vs_target  → SA, MG, SIC, DR
   ota_gmv            → SA, MG
   checkin_gmv        → SA, MG
   task_board         → SA, MG, SIC, DR
   team_pulse         → SA, MG
   one_on_one_logs    → SA, MG, DR
   stakeholder_crm    → SA, MG, SIC
   cadence_manager    → SA, MG
   ```

---

## 5. All Pages & Interactions

### `/` — Dashboard (Kairos Home)
**Access:** All roles
**Data fetched:** tasks (priority queue), team overview, KPI metrics summary, open loops alert
**Interactions:**
- View priority tasks sorted by due date + priority
- Quick-add task (opens task dialog)
- BacklogAlert banner: shows overdue follow-ups if any
- KPIs shown based on user's KPI visibility settings
- Click team member → `/team/[id]`
- Click task → task detail sheet (right-panel slide)

---

### `/auth/login` — Login
**Access:** Public
**Interactions:**
1. Enter email → `POST /api/auth/login`
2. Enter 6-digit OTP → `POST /api/auth/verify-login`
3. Redirects: `/` on success, `/auth/pending` if pending, `/auth/rejected` if rejected

### `/auth/pending` — Awaiting Approval
**Access:** Public
**Interactions:** Static page, shows waiting message. "Check again" button re-checks status.

### `/auth/rejected` — Access Denied
**Access:** Public
**Interactions:** Static message. Link to re-apply.

### `/auth/request-access` — Request Access
**Access:** Public
**Interactions:** Form: name + email. `POST /api/auth/request-access`.

### `/auth/accept-invite` — Accept Invite
**Access:** Public (token-gated)
**Interactions:**
- Page loads token from URL
- Fetches invite details
- User enters name, accepts terms
- `POST /api/auth/accept-invite`

---

### `/projects` — Projects
**Access:** SA, MG, SIC, DR (hidden for EV, G)
**Layout:** Kanban by stage (Planning → Active → Review) + archived bar
**Data fetched:** All projects via `useProjects()`
**Interactions:**
- "Start a Project" button → opens Create Project dialog
  - Fields: title, department, stage, ownerId (team member), stakeholderId, dueDate, description
  - On save: `POST /api/projects`
- Filter by department, stage
- Drag project card between columns (stage update)
- Click project card → `/projects/[id]`
- ProjectCard shows: title, department badge, stage, owner avatar, task count progress bar, due date

### `/projects/[id]` — Project Detail
**Access:** SA, MG, SIC, DR
**Data fetched:** `/api/projects/[id]`
**Interactions:**
- Edit project title, description, stage, due date inline
- View associated tasks (list view)
- Add task to project
- View stakeholders linked to project
- Delete project (SA, MG only)

---

### `/tasks` — Tasks (Kanban Board)
**Access:** All roles
**Layout:** Kanban columns: Todo | In Progress | Review | Blocked | Done (archived bar)
**Data fetched:** `useTask()` + filters
**Interactions:**
- Drag task between columns → `PATCH /api/tasks/[id]` status update
- "Drop a Task" button → opens task creation dialog
  - Fields: title, department, assignee, priority, dueDate, status, projectId, stakeholderId, description
- Filter by: assignee, department, priority, status
- Search bar → debounced title search
- Click task card → task detail **Sheet** (slide from right)
  - Sheet fetches `/api/tasks/[id]`
  - Inline edit: status, priority, department (Select dropdowns)
  - TipTap rich text description editor
  - Task comments thread (`TaskActivity` records with type="comment")
  - Activity log (status changes, assignments)
  - "System" shown for null authorName
- DIRECT_REPORT: sees only their assigned tasks
- Done column hidden; "archive" bar at bottom shows done count

### `/my-tasks` — My Tasks
**Access:** All roles
**Layout:** List view of tasks assigned to current user
**Data fetched:** `/api/tasks?assigneeId=[myTeamMemberId]`
**Interactions:** Same task detail sheet as `/tasks`. Filter by priority, due date.

---

### `/cadence` — Rounds (Meeting Cadences)
**Access:** SA, MG (hidden for DR, EV, G)
**Layout:** List of cadence cards
**Data fetched:** `useCadences()`
**Interactions:**
- "Set a Round" → Create Cadence dialog
  - Fields: name, type, day, time, duration, scope, description
- Click cadence → expand detail:
  - Edit fields inline
  - Manage prep items (add/remove/assign with lead time)
  - Associated tasks list
- Toggle active/inactive
- Delete cadence (SA, MG)

---

### `/notes` — Notes
**Access:** All roles
**Layout:** Grid of note cards
**Data fetched:** `GET /api/notes`
**Interactions:**
- New note button → inline editor
- Edit note → TipTap editor
- Delete note
- Search/filter notes

---

### `/follow-ups` — Open Loops
**Access:** All roles
**Layout:** Two-panel — left tree list, right detail panel
**Data fetched:** `GET /api/follow-ups`
**Interactions:**
- "Open a Loop" → Create dialog
  - Fields: title, contactName, teamMemberId, stakeholderId, reminderAt, autoRemind, description
  - On save: `POST /api/follow-ups`
- Left panel: tree list (parent/child nesting shown as indented items)
- Right panel: detail view
  - Edit fields
  - Add notes (`POST /api/follow-ups/[id]/notes`)
  - Snooze → set snoozedUntil date
  - Close loop → status = closed
  - Reopen → status = open
  - Spawn child → "Open a Loop" with parentId set
  - Convert to Task → `POST /api/follow-ups/[id]/convert`
- BacklogAlert banner: shows count of overdue auto-remind loops on all pages

---

### `/team` — Your People
**Access:** All roles (limited for DR, EV, G)
**Layout:** Grid of member cards
**Data fetched:** `useTeam()`
**Interactions:**
- "Add to Your People" (SA, MG) → Create Member dialog
  - Fields: name, role, department, status, delegationLevel, skills, oneOnOneDay, oneOnOneTime, coachingNotes
- Member card shows: name, role, department badge, status badge, task count, delegation level
- Click card → `/team/[id]`
- Quick actions on card: "View Profile", "Assign Task", "Log 1:1"

### `/team/[id]` — Team Member Profile
**Access:** SA, MG
**Data fetched:** `/api/team/[id]`
**Interactions:**
- View all tasks assigned to member
- View 1:1 history
- Edit member details inline
- Link/unlink User account (teamMemberId association)

---

### `/one-on-ones` — 1:1s
**Access:** SA, MG, SIC, DR
**Layout:** Timeline list grouped by member
**Data fetched:** `useOneOnOnes()`
**Interactions:**
- Filter by team member
- "Log 1:1" → Create dialog
  - Fields: memberId, date, mood, theirUpdates, myUpdates, feedbackGiven, developmentNotes
- Click 1:1 card → `/one-on-ones/[id]`

### `/one-on-ones/[id]` — 1:1 Detail
**Access:** SA, MG, SIC, DR
**Data fetched:** `/api/one-on-ones/[id]`
**Interactions:**
- Edit all fields inline
- Add/edit/complete action items
- `PATCH /api/one-on-ones/[id]/actions/[actionId]`

---

### `/stakeholders` — The Table
**Access:** SA, MG, SIC (hidden for DR, EV, G)
**Layout:** Grid/list of stakeholder cards
**Data fetched:** `useStakeholders()`
**Interactions:**
- "Add to The Table" → Create dialog
  - Fields: name, title, frequency, channel, priority, context, strategy, email
- Filter by priority, frequency
- Click card → `/stakeholders/[id]`

### `/stakeholders/[id]` — Stakeholder Detail
**Data fetched:** `/api/stakeholders/[id]`
**Interactions:**
- Edit all fields
- View linked tasks + projects
- Add engagement note

---

### `/metrics` — Metrics (KPI Dashboard)
**Access:** SA, MG (hidden for EV, G)
**Layout:** KPI cards + trend charts
**Data fetched:** `/api/metrics`, `/api/numbers`
**KPIs shown (role/visibility gated):**
- Revenue YTD vs Target
- OTA Gross GMV YTD
- Check-in GMV YTD
- Task completion rate
- Open loops count
- Team pulse indicators
**Interactions:**
- Request KPI access (for lower roles) → `POST /api/kpi-access/request`
- Period selector (weekly/monthly)

---

### `/assessment/ota` — Channel Pulse
**Access:** SA, MG (hidden for DR, SIC, EV, G)
**Layout:** OTA performance dashboard
**Data fetched:** `/api/targets`, `/api/numbers`
**Interactions:**
- View OTA channel breakdown (Airbnb, Booking, MakeMyTrip, etc.)
- Revenue vs target by channel
- Period comparison

### `/assessment/checkin` — Check-in GMV
**Access:** SA, MG
**Layout:** Check-in revenue dashboard
**Data fetched:** `/api/targets`, `/api/numbers`
**Interactions:**
- Check-in GMV actuals vs targets
- Property-level breakdown
- Weekly/monthly view

---

### `/reports` — Reports
**Access:** SA, MG (hidden for EV, G)
**Data fetched:** `GET /api/reports`
**Interactions:**
- View generated weekly reports
- "Email Report" → `POST /api/reports/[id]/email`
- Generate new report manually
- Reports auto-generated by cron (`POST /api/cron/weekly-report`)
- Email subject format: "Your Kairos Brief — Week of [DATE]"

---

### `/playbook` — Playbook
**Access:** All roles
**Layout:** Documentation/reference pages
**Interactions:** Static reference content, search

---

### `/settings` — Settings
**Access:** All roles
**Data fetched:** `/api/settings/departments`
**Interactions:**
- Edit department list (`POST /api/settings/departments`)
- App preferences (theme, notifications)
- KPI visibility toggles (user-level, if permitted)
- View workspace memberships

---

### `/profile` — Profile
**Access:** All roles (own profile only)
**Data fetched:** `GET /api/profile`
**Sections:**
- **Hero Card:** Avatar, name (inline editable), role badge, email, "Since [date]", profile completion bar, stats (Tasks Done / Active Projects / Your People)
- **Account Details:** Role, Approval Status, Email Verified, Last Login, Member Since
- **Profile Health:** Hover-expand card with animated bars: Profile Completion %, Activity Level %, Account Health %
- **Quick Actions:** Theme toggle (light/dark), Settings link, Activity Log link (SA only), Sign Out
- **Recent Activity:** Last 5 ActivityLog entries
**Interactions:**
- Click "Edit Profile" → name input appears inline with Check/X buttons
- Save: `PATCH /api/profile` `{ name }`
- Theme toggle: updates next-themes
- Sign out: `POST /api/auth/logout` → redirect to `/auth/login`

---

### `/dashboard/admin/users` — User Management
**Access:** SUPER_ADMIN only
**Data fetched:** `GET /api/admin/users`
**Interactions:**
- List all users with filters (role, approvalStatus, search)
- Change user role → `PATCH /api/admin/users/[id]`
- Deactivate/activate user
- Delete user → `DELETE /api/users/[id]`
- Invite user → `POST /api/admin/invites`

### `/dashboard/admin/approvals` — Approvals Queue
**Access:** SUPER_ADMIN only
**Data fetched:** `GET /api/admin/approvals`
**Interactions:**
- List PENDING users
- Approve: `POST /api/admin/approvals/[id]/approve` → sends approval email
- Reject: `POST /api/admin/approvals/[id]/reject`

### `/dashboard/admin/workspaces` — Workspace Management
**Access:** SUPER_ADMIN only
**Data fetched:** `GET /api/admin/workspaces`
**Interactions:**
- Create workspace (name, slug, type, description)
- Click workspace → `/dashboard/admin/workspaces/[id]`

### `/dashboard/admin/workspaces/[id]` — Workspace Detail
**Access:** SUPER_ADMIN only
**Interactions:**
- Edit workspace fields
- Manage members (add/remove, change role)
- Configure KPI visibility settings by role

### `/dashboard/admin/activity-log` — Activity Audit Log
**Access:** SUPER_ADMIN only
**Data fetched:** `GET /api/admin/activity-log`
**Interactions:**
- Paginated list of all ActivityLog entries
- Filter by userId, action type, date range

---

## 6. API Routes — Complete Reference

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | Public | Send OTP; validates user status |
| POST | `/api/auth/verify-login` | Public | Verify OTP, set JWT cookie |
| POST | `/api/auth/logout` | Any | Clear cookie |
| GET | `/api/auth/me` | JWT | `{ data: { id, email, name, role, teamMemberId } }` |
| POST | `/api/auth/request-access` | Public | Create PENDING user |
| POST | `/api/auth/verify-email` | Public | Verify email token |
| GET | `/api/auth/invite/[token]` | Public | Get invite metadata |
| POST | `/api/auth/accept-invite` | Public | Accept invite, create user |

### Tasks

| Method | Path | Auth | Body/Query |
|--------|------|------|------------|
| GET | `/api/tasks` | JWT | `?assigneeId, status, priority, department, search, isSelfTask, projectId` |
| POST | `/api/tasks` | JWT | `{ title, department, assigneeId?, priority?, status?, dueDate?, projectId?, description? }` |
| GET | `/api/tasks/[id]` | JWT | — |
| PATCH | `/api/tasks/[id]` | JWT | Any task fields |
| DELETE | `/api/tasks/[id]` | SA/MG | — |
| GET | `/api/tasks/[id]/activity` | JWT | — |
| GET | `/api/tasks/[id]/comments` | JWT | — |
| POST | `/api/tasks/[id]/comments` | JWT | `{ content, authorName }` |
| POST | `/api/tasks/[id]/email` | JWT | — |

### Projects

| Method | Path | Auth | Body/Query |
|--------|------|------|------------|
| GET | `/api/projects` | JWT | `?stage, department` |
| POST | `/api/projects` | JWT | `{ title, department, stage?, ownerId?, stakeholderId?, dueDate?, description? }` |
| GET | `/api/projects/[id]` | JWT | — |
| PATCH | `/api/projects/[id]` | JWT | Any project fields |
| DELETE | `/api/projects/[id]` | SA/MG | — |

### Team

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/team` | JWT | All members |
| POST | `/api/team` | SA/MG | Create member |
| GET | `/api/team/[id]` | JWT | Member + tasks + 1:1s |
| PATCH | `/api/team/[id]` | SA/MG | Update member |

### One-on-Ones

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/one-on-ones` | JWT | `?memberId` |
| POST | `/api/one-on-ones` | JWT | `{ memberId, date, mood, ... }` |
| GET | `/api/one-on-ones/[id]` | JWT | Full detail + actions |
| PATCH | `/api/one-on-ones/[id]` | JWT | Update session |
| PATCH | `/api/one-on-ones/[id]/actions/[actionId]` | JWT | Toggle action item |

### Stakeholders

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/stakeholders` | JWT | All |
| POST | `/api/stakeholders` | SA/MG | Create |
| GET | `/api/stakeholders/[id]` | JWT | With tasks + projects |
| PATCH | `/api/stakeholders/[id]` | SA/MG | Update |
| DELETE | `/api/stakeholders/[id]` | SA/MG | Delete |

### Cadences

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/cadence` | JWT | All |
| POST | `/api/cadence` | SA/MG | Create |
| GET | `/api/cadence/[id]` | JWT | With prep items |
| PATCH | `/api/cadence/[id]` | SA/MG | Update |
| DELETE | `/api/cadence/[id]` | SA/MG | Delete |
| POST | `/api/cadence/generate` | SA/MG | AI generation |

### Follow-Ups

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/follow-ups` | JWT | All with tree structure |
| POST | `/api/follow-ups` | JWT | Create |
| GET | `/api/follow-ups/[id]` | JWT | Detail + notes |
| PATCH | `/api/follow-ups/[id]` | JWT | Update (snooze, close, etc.) |
| DELETE | `/api/follow-ups/[id]` | JWT | Delete |
| POST | `/api/follow-ups/[id]/convert` | JWT | Convert to task |
| GET/POST | `/api/follow-ups/[id]/notes` | JWT | Notes CRUD |

### Notes

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/notes` | JWT |
| POST | `/api/notes` | JWT |
| GET | `/api/notes/[id]` | JWT |
| PATCH | `/api/notes/[id]` | JWT |
| DELETE | `/api/notes/[id]` | JWT |

### Metrics & Data

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/metrics` | JWT | KPI values |
| GET | `/api/numbers` | JWT | `{ weekly: [], monthly: [] }` |
| POST | `/api/numbers/sync` | JWT | Sync from Sheets |
| GET | `/api/targets` | JWT | FY27 targets JSON |
| POST | `/api/targets/upload` | SA/MG | Upload new targets |

### Reports

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/reports` | SA/MG |
| POST | `/api/reports` | SA/MG |
| POST | `/api/reports/[id]/email` | SA/MG |

### AI

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/ai/parse-tasks` | JWT | Parse text → `[{ title, department, assigneeId, priority, dueDate }]` |
| POST | `/api/ai/summarize` | JWT | Summarize text content |
| POST | `/api/ai/progress` | JWT | Telos persona progress report |
| POST | `/api/ai/generate-project-tasks` | JWT | Telos: decompose project → tasks |

**AI Personas:**
- `parse-tasks` + `summarize` → strict extraction, no persona
- `progress` + `generate-project-tasks` → Telos persona (sharp, concise, operator voice)

### Admin (SUPER_ADMIN only)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/admin/users` | List with filters |
| PATCH | `/api/admin/users/[id]` | role, approval, isActive |
| DELETE | `/api/users/[id]` | Delete user |
| GET | `/api/admin/approvals` | PENDING list |
| POST | `/api/admin/approvals/[id]/approve` | Approve + email |
| POST | `/api/admin/approvals/[id]/reject` | Reject |
| GET/POST | `/api/admin/workspaces` | List/create workspaces |
| GET/PATCH/DELETE | `/api/admin/workspaces/[id]` | Workspace CRUD |
| GET/POST | `/api/admin/workspaces/[id]/members` | Member management |
| GET/PATCH | `/api/admin/workspaces/[id]/kpi-settings` | KPI config |
| GET/POST | `/api/admin/invites` | Invite management |
| GET | `/api/admin/activity-log` | Audit log |
| GET | `/api/admin/kpi-requests` | KPI access requests |

### Profile, Settings, Workspaces

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/profile` | Full profile + computed stats |
| PATCH | `/api/profile` | `{ name?, avatarUrl? }` |
| POST | `/api/user/onboarding` | Mark onboarding complete |
| GET | `/api/settings/departments` | Departments list |
| POST | `/api/settings/departments` | Update departments |
| GET | `/api/workspaces/mine` | User's workspaces |
| GET | `/api/activity` | Activity feed |

### KPI

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/kpi/visibility` | User KPI settings |
| POST | `/api/kpi/visibility` | Update user override |
| POST | `/api/kpi-access/request` | Request access |

### Cron (called by cron-job.org)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/cron/prep-tasks` | Generate prep items for upcoming cadences |
| POST | `/api/cron/reminders` | FollowUp auto-remind alerts |
| POST | `/api/cron/sheets-sync` | Sync NumberEntry from Google Sheets |
| POST | `/api/cron/weekly-report` | Generate + email weekly Kairos Brief |

---

## 7. API Response Format (Universal)

All API routes wrap responses in `{ data: ... }`. Client-side fetchers **must** unwrap:
```typescript
const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)
```

Errors return: `{ error: "message" }` with appropriate HTTP status code.

---

## 8. Layout & Navigation

### Desktop Layout
```
┌─────────────────────────────────────────────────────────┐
│ TOPBAR (fixed, h-14, left-64 on desktop)                │
│ [Page Title]              [Date] [FY27Q4] [⌘K] [🔔] [PDF] [→] │
├──────────────┬──────────────────────────────────────────┤
│ SIDEBAR      │ MAIN CONTENT                             │
│ (fixed w-64) │ (pt-14 + lg:ml-64)                       │
│              │                                          │
│ K Kairos     │ p-4 lg:p-8                               │
│ ...tagline   │                                          │
│              │                                          │
│ [nav groups] │                                          │
│              │                                          │
│ ─────────    │                                          │
│ Profile link │                                          │
│ FY27·Kairos  │                                          │
└──────────────┴──────────────────────────────────────────┘
```

### Mobile Layout
```
┌─────────────────────────┐
│ TOPBAR (full width)     │
├─────────────────────────┤
│ MAIN CONTENT            │
│ (pt-14, pb-16)          │
│                         │
└─────────────────────────┘
│ BOTTOM NAV (fixed)      │
│ Home Tasks Proj Team M  │
└─────────────────────────┘
```

### Command Palette (⌘K)
- Global search across tasks, projects, team members, stakeholders
- Keyboard navigation
- Direct jump to any page

---

## 9. Theme System

**Azure "Elevated Estate" Design Language**

### Light Mode (default)
```css
--background:         #f7f9fb
--foreground:         #191c1e
--card:               #ffffff
--card-foreground:    #434655
--primary:            #004ac6
--primary-foreground: #ffffff
--secondary:          #eceef0
--muted-foreground:   #737686
--border:             rgba(195,198,215,0.4)
--outline:            #737686
--outline-variant:    #c3c6d7
--shadow-glass:       0 20px 40px rgba(0,74,198,0.06)
--surface-container-low: #f2f4f6
--surface-container:     #eceef0
--surface-container-high: #e6e8ea
```

### Dark Mode
```css
--background:  #0d0e12
--foreground:  #e3e2e8
--primary:     #b4c5ff
--card:        #1a1c22
```

**20-theme system** — themes stored in globals.css.
**Theme storage:** `localStorage['lohono-theme']`
**Card rule:** Use `bg-card` not `bg-white` for theme compatibility.
**Shadow rule:** Use `shadow-[var(--shadow-glass)]` on all elevated cards.

---

## 10. Key Component Inventory

### Layout Components
| Component | File | Purpose |
|-----------|------|---------|
| AppShell | `layout/app-shell.tsx` | Root wrapper, renders all layout components |
| Sidebar | `layout/sidebar.tsx` | Fixed left nav, role-filtered |
| Topbar | `layout/topbar.tsx` | Fixed top bar, page title, actions |
| MobileBottomNav | `layout/mobile-bottom-nav.tsx` | Mobile nav (hidden on desktop) |
| ConditionalShell | `layout/conditional-shell.tsx` | Hide shell on auth routes |
| WorkspaceSwitcher | `layout/workspace-switcher.tsx` | Workspace context switcher |
| CommandPalette | `ui/command-palette.tsx` | Global ⌘K search |
| OnboardingController | Onboarding flow | Step-by-step guided tour |
| OnboardingModal | Onboarding modal | Modal for onboarding steps |
| FloatingTourBanner | Tour reminder | Floating banner for incomplete onboarding |

### UI Components (src/components/ui/)
| Component | Purpose |
|-----------|---------|
| PageHeader | Page title + description + optional action button |
| Button | Primary/secondary/ghost/destructive variants |
| Input, Textarea | Form inputs |
| Select | Dropdown select |
| Dialog | Modal dialog |
| Sheet | Right-panel slide-in |
| Badge | Colored status/role pills |
| Card | Elevated container |
| Avatar | User avatar with fallback |
| MemberAvatar | Team member avatar |
| DepartmentBadge | Department colored pill |
| StatusBadge | Task/project status pill |
| PriorityBadge | Priority colored indicator |
| EmptyState | Empty list placeholder |
| StatCard | KPI stat card (label + value + sub) |
| BacklogAlert | Overdue follow-up alert banner |
| Checkbox | Checkbox input |
| DropdownMenu | Context menu |
| ConfirmDialog | Confirmation modal |
| ScrollArea | Scrollable container |
| Separator | Divider line |
| Form, Label | Form scaffolding |
| Sonner | Toast notifications |
| BentoGrid | Dashboard grid layout |
| RichTextEditor | TipTap wrapper |
| AITaskParser | AI-powered task input panel |
| SummarizeButton | AI summarize trigger |
| AgentPlan | AI agent plan display |
| ProjectDetailView | Full project detail component |
| AIParsedTaskPreview | Preview of AI-parsed tasks before creating |

---

## 11. Data Patterns

### SWR Fetcher (universal pattern)
```typescript
const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)
// All API responses: { data: ... }
// SWR v2: mutate({ revalidate: false })
```

### Form Submission Pattern
```typescript
async function handleSubmit() {
  setSaving(true)
  try {
    const res = await fetch('/api/resource', { method: 'POST', headers: {...}, body: JSON.stringify(data) })
    if (!res.ok) throw new Error()
    await mutate() // SWR revalidate
    toast.success('Done')
  } catch {
    toast.error('Failed')
  } finally {
    setSaving(false)
  }
}
```

### Auth Pattern in API Routes
```typescript
// Standard API auth:
const session = await getSession()
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// Admin routes:
if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
```

### Neon/Prisma Pattern
```typescript
// Must use adapter, NOT bare new PrismaClient()
import { prisma } from '@/lib/prisma'
// Schema changes: prisma db push (not migrate dev)
```

---

## 12. Multi-User Scenarios & Edge Cases

### Current State (2026-03-28)
- Only 1 active user: saksham.shokeen@lohono.com (SUPER_ADMIN, APPROVED)
- Multi-user auth code complete but untested with real second user
- `onboardingCompleted` field added to User but onboarding flow is next priority

### Known Multi-User Gaps to Spec
1. **User → TeamMember linking:** When a DIRECT_REPORT logs in, their `teamMemberId` must be set to see "their" tasks. This link is currently manual (admin sets it). No automated linking flow exists.
2. **Task scoping:** `DIRECT_REPORT` tasks filtered at API: `filters.assigneeId = user.teamMemberId`. If `teamMemberId` is null, they see ALL tasks — security gap.
3. **Data isolation:** No workspace-level data isolation yet. All tasks/projects/stakeholders are global. Workspace model exists but isn't applied to content routing.
4. **Manager hierarchy:** `User.managerId` (self-relation) exists but isn't used for data scoping yet. `getScopeResult` returns team scope but the manager relationship uses `reports` (users where managerId = me), not TeamMember.
5. **Invite role assignment:** Invited users get role from Invite record but their TeamMember link isn't auto-created.
6. **KPI access requests:** `KpiAccessRequest` model exists, `/api/kpi-access/request` exists, but the admin review flow (approve/deny) UI may be incomplete.
7. **Workspace membership:** `WorkspaceMember` records needed for workspace-gated content but workspace content routing isn't enforced.
8. **Onboarding:** `onboardingCompleted` field in schema but the onboarding flow hasn't been fully shipped.

### Role Behavior (confirmed working)
- Sidebar items filtered by role ✓
- DIRECT_REPORT: `filters.assigneeId = teamMemberId` in tasks API ✓
- SUPER_ADMIN: Admin nav section visible ✓
- KPI visibility: 3-tier check implemented ✓

---

## 13. Cron Jobs (via cron-job.org)

| Job | Endpoint | Frequency | Purpose |
|-----|----------|-----------|---------|
| Weekly Report | `/api/cron/weekly-report` | Friday 6PM IST | Generate + email Kairos Brief |
| Sheets Sync | `/api/cron/sheets-sync` | Daily | Pull metrics from Google Sheets |
| Reminders | `/api/cron/reminders` | Daily 9AM IST | FollowUp auto-remind alerts |
| Prep Tasks | `/api/cron/prep-tasks` | Daily 8AM IST | Create prep items for upcoming cadences |

**Note:** Vercel Hobby plan = 2 cron limit. All crons run from cron-job.org. `vercel.json` is `{}` (no crons).

---

## 14. Google Sheets Integration

- Apps Script on Google Sheets side pushes to `/api/numbers/sync`
- Payload: `{ metric: string, value: number, period: string }[]`
- Upserts `NumberEntry` records
- Synced at: daily via cron + manual "Sync" button in metrics page

---

## 15. Email Setup

| Purpose | Service | From address |
|---------|---------|--------------|
| OTP / Invites / Approvals | Resend | hello@kairos.app (or configured) |
| Weekly Reports | Nodemailer + Gmail SMTP | saksham.shokeen@lohono.com |

**Weekly report subject:** `Your Kairos Brief — Week of [DATE]`

---

## 16. Environment Variables

```
DATABASE_URL            — Neon PostgreSQL connection string (pooler)
DIRECT_URL              — Neon direct connection (for migrations)
JWT_SECRET              — HS256 signing secret (min 32 chars)
RESEND_API_KEY          — Resend email API key
OPENAI_API_KEY          — OpenAI API key (sk-proj-... format, NOT proj_... project key)
ANTHROPIC_API_KEY       — Anthropic Claude API key
SMTP_HOST               — smtp.gmail.com
SMTP_PORT               — 587
SMTP_USER               — saksham.shokeen@lohono.com
SMTP_PASS               — Google App Password (16-char, no spaces)
NEXT_PUBLIC_APP_URL     — https://lohono-command-center.vercel.app
CRON_SECRET             — Secret header for cron auth
```

---

## 17. File Structure Overview

```
lohono-command-center/
├── prisma/
│   └── schema.prisma           — Full DB schema
├── src/
│   ├── app/                    — Next.js App Router pages + API
│   │   ├── layout.tsx          — Root layout (AppShell wrapper)
│   │   ├── page.tsx            — Dashboard home
│   │   ├── api/                — All API routes
│   │   ├── auth/               — Auth pages
│   │   ├── profile/            — User profile page
│   │   ├── dashboard/admin/    — Admin pages (SUPER_ADMIN)
│   │   ├── tasks/ projects/ team/ stakeholders/ ...
│   │   └── globals.css         — Azure M3 tokens + 20 themes
│   ├── components/
│   │   ├── layout/             — Shell, Sidebar, Topbar, etc.
│   │   └── ui/                 — All reusable UI components
│   ├── hooks/                  — SWR data hooks
│   ├── lib/
│   │   ├── auth.ts             — JWT/OTP auth
│   │   ├── prisma.ts           — DB client
│   │   ├── rbac.ts             — Permissions
│   │   ├── utils.ts            — cn(), dates, constants
│   │   ├── format.ts           — Indian number formatting
│   │   ├── mailer.ts           — Resend email
│   │   └── services/           — Business logic (tasks, etc.)
│   └── types/                  — TypeScript types
├── KAIROS_FULL_SPEC.md         — This document
└── package.json
```

---

## 18. Key Constants (src/lib/utils.ts)

```typescript
DEPARTMENTS = ['Analytics', 'Revenue', 'OTA', 'Marketing', 'Financial Modelling', 'Program Management']

PROJECT_STAGES = ['planning', 'active', 'review', 'closed']

TASK_STATUSES = ['todo', 'in_progress', 'review', 'blocked', 'done']

PRIORITIES = ['critical', 'high', 'medium', 'low']

DELEGATION_LEVELS = {
  1: 'Do (Tell me what to do)',
  2: 'Research (Bring options)',
  3: 'Decide (Recommend + execute)',
  4: 'Own (Full accountability)',
}
```

---

## 19. Upcoming Work (Priority Order)

1. **Onboarding tutorial** — role-specific, `onboardingCompleted` field ready
2. **First non-admin user** — validate full invite → approve → login → task-scoping flow
3. **User → TeamMember auto-link** — when user is approved and TeamMember name matches, offer to link
4. **Task scoping security fix** — if `teamMemberId` is null for DIRECT_REPORT, don't return all tasks
5. **Logo swap** — swap K lettermark for real logo when supplied
6. **Projects sidebar direct access** — pin active projects in sidebar
7. **Quick-access notes panel** — global floating shortcut
8. **AI Employee System** — long-term, own planning session required

---

*Generated: 2026-03-28 · For internal use / brainstorming only*
