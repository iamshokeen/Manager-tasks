// prisma/seed.ts
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { PrismaClient, Role } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'saksham.shokeen@lohono.com'

async function main() {
  console.log('Seeding database...')

  // ─── Existing team member seed data ────────────────────────────────────────

  await prisma.teamMember.upsert({
    where: { id: 'seed-analyst' },
    update: {},
    create: {
      id: 'seed-analyst',
      name: 'Junior Analyst / PM',
      role: 'Analytics & Program Management',
      department: 'Analytics',
      status: 'active',
      skills: 'PostgreSQL, N8N Automation, Data Analysis',
      oneOnOneDay: 'Monday',
      oneOnOneTime: '10:00 AM',
      coachingNotes: 'PM responsibilities shared with VP. Strong technically. Coach on stakeholder communication and business judgment.',
      delegationLevel: 2,
    },
  })

  await prisma.teamMember.upsert({
    where: { id: 'seed-revenue-mgr' },
    update: {},
    create: {
      id: 'seed-revenue-mgr',
      name: 'Junior Revenue Manager',
      role: 'Revenue Management — Last-Minute & Weekday',
      department: 'Revenue',
      status: 'hiring',
      skills: 'Last-minute bookings, Weekday occupancy optimization',
      oneOnOneDay: 'Tuesday',
      oneOnOneTime: '10:00 AM',
      coachingNotes: 'Hiring target: May 2026. Focus: weekday fill rates, last-minute inventory liquidation.',
      delegationLevel: 1,
    },
  })

  await prisma.teamMember.upsert({
    where: { id: 'seed-kam1' },
    update: {},
    create: {
      id: 'seed-kam1',
      name: 'OTA KAM #1',
      role: 'Key Account Manager — MakeMyTrip',
      department: 'OTA',
      status: 'active',
      skills: 'MakeMyTrip relationship management, Campaign management, Rate negotiations',
      oneOnOneDay: 'Wednesday',
      oneOnOneTime: '10:00 AM',
      coachingNotes: 'Primary MMT relationship owner. MMT = 80% of OTA revenue. Strategic priority. Delegation level 3.',
      delegationLevel: 3,
    },
  })

  await prisma.teamMember.upsert({
    where: { id: 'seed-kam2' },
    update: {},
    create: {
      id: 'seed-kam2',
      name: 'OTA KAM #2',
      role: 'Key Account Manager — Affiliate OTAs',
      department: 'OTA',
      status: 'active',
      skills: 'Booking.com, Agoda, Airbnb, Marriott, HyperGuest relationship management',
      oneOnOneDay: 'Thursday',
      oneOnOneTime: '10:00 AM',
      coachingNotes: 'Manages all non-MMT OTAs. Focus on diversification. Delegation level 3.',
      delegationLevel: 3,
    },
  })

  await prisma.teamMember.upsert({
    where: { id: 'seed-ota-junior' },
    update: {},
    create: {
      id: 'seed-ota-junior',
      name: 'OTA Junior Resource',
      role: 'OTA Operations & CRM',
      department: 'OTA',
      status: 'active',
      skills: 'CRM data entry, Booking calculations, Operations',
      oneOnOneDay: 'Friday',
      oneOnOneTime: '10:00 AM',
      coachingNotes: 'Records all OTA bookings into CRM. KPIs: accuracy rate, processing speed, zero data discrepancies. Needs clear SOPs.',
      delegationLevel: 1,
    },
  })

  console.log('✓ Team members seeded')

  // Stakeholders
  const stakeholders = [
    { id: 'seed-home-vp', name: 'Home VP', title: 'Vice President', frequency: 'Weekly', channel: '1:1 + Slack', priority: 'critical', context: 'Direct reporting line. PM resource is shared with VP. No surprises ever.', strategy: 'Over-communicate. Send weekly async update (5 bullets max). Pre-wire all decisions.' },
    { id: 'seed-cbo', name: 'CBO', title: 'Chief Business Officer', frequency: 'Bi-weekly', channel: '1:1 Meeting', priority: 'high', context: 'Revenue targets alignment, business strategy, market positioning.', strategy: 'Lead with revenue numbers and business impact.' },
    { id: 'seed-finance-head', name: 'Finance Head', title: 'Head of Finance', frequency: 'Monthly', channel: 'Meeting + Excel', priority: 'high', context: 'Financial modeling reviews, budget approvals.', strategy: 'Be precise. Double-check every number. Bring models in Excel.' },
    { id: 'seed-tech-head', name: 'Tech Dev Head', title: 'Head of Technology', frequency: 'As needed', channel: 'Slack + Meeting', priority: 'medium', context: 'Tech requirements for CRM, automation, integrations.', strategy: 'Be clear on requirements. Bring solutions with specs.' },
    { id: 'seed-cfo', name: 'CFO', title: 'Chief Financial Officer', frequency: 'Monthly', channel: 'Presentation', priority: 'high', context: 'Financial reporting, ROI analysis.', strategy: 'Think ROI. Frame everything as investment vs return.' },
    { id: 'seed-ceo', name: 'CEO / Founder', title: 'CEO & Founder', frequency: 'Monthly', channel: 'Presentation', priority: 'critical', context: 'Strategic updates, key decisions, board-level reporting.', strategy: "Big picture ONLY. 3 bullet points max: What's winning, what needs help, what do you need from them." },
  ]
  for (const s of stakeholders) {
    await prisma.stakeholder.upsert({ where: { id: s.id }, update: {}, create: s })
  }
  console.log('✓ Stakeholders seeded')

  // Cadences (abbreviated — full data preserved from original seed)
  const cadences = [
    { id: 'seed-standup', name: 'Weekly Team Standup', type: 'weekly_standup', day: 'Monday', time: '9:00 AM', duration: 15, scope: 'All Team', description: '15-min standup. Each person shares: done, doing, blocked.' },
    { id: 'seed-ota-review', name: 'OTA Department Review', type: 'dept_review', day: 'Wednesday', time: '2:00 PM', duration: 45, scope: 'OTA Team', description: 'Campaign performance review, MMT updates, booking pipeline.' },
    { id: 'seed-rev-analytics', name: 'Revenue + Analytics Review', type: 'dept_review', day: 'Thursday', time: '2:00 PM', duration: 45, scope: 'Revenue + Analytics', description: 'Dashboard reviews, occupancy metrics, pricing performance.' },
    { id: 'seed-monthly-retro', name: 'Monthly Team Retrospective', type: 'monthly_review', day: 'Last Friday', time: '3:00 PM', duration: 60, scope: 'All Team', description: 'Monthly retro: wins, learnings, next month priorities.' },
    { id: 'seed-quarterly-review', name: 'Quarterly Performance Review', type: 'quarterly_review', day: 'Quarter End', time: 'Full Day', duration: 60, scope: 'Individual', description: 'Formal performance review. Goals assessment, development plan.' },
  ]
  for (const c of cadences) {
    await prisma.cadence.upsert({ where: { id: c.id }, update: {}, create: c })
  }
  console.log('✓ Cadences seeded')

  // ─── Multi-user system seed ─────────────────────────────────────────────────

  // SUPER_ADMIN user (Saksham)
  const saksham = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      role: 'SUPER_ADMIN',
      isActive: true,
      emailVerified: true,
      approvalStatus: 'APPROVED',
    },
    create: {
      email: ADMIN_EMAIL,
      name: 'Saksham',
      role: 'SUPER_ADMIN',
      isActive: true,
      emailVerified: true,
      approvalStatus: 'APPROVED',
    },
  })
  console.log(`✓ SUPER_ADMIN user: ${saksham.email}`)

  // PLATFORM workspace
  const platformWorkspace = await prisma.workspace.upsert({
    where: { slug: 'platform' },
    update: {},
    create: {
      name: 'Lohono Platform',
      slug: 'platform',
      type: 'PLATFORM',
      description: 'Main workspace for the Lohono Command Center platform',
      createdBy: saksham.id,
    },
  })
  console.log(`✓ Workspace: ${platformWorkspace.name}`)

  // Add Saksham as SUPER_ADMIN member of PLATFORM workspace
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: platformWorkspace.id,
        userId: saksham.id,
      },
    },
    update: {},
    create: {
      workspaceId: platformWorkspace.id,
      userId: saksham.id,
      role: 'SUPER_ADMIN',
    },
  })
  console.log('✓ Saksham added to PLATFORM workspace')

  // Default KPI settings for PLATFORM workspace
  const defaultKpiSettings: Array<{ kpiKey: string; visibleTo: Role[] }> = [
    { kpiKey: 'revenue_vs_target', visibleTo: ['SUPER_ADMIN', 'MANAGER', 'SENIOR_IC', 'DIRECT_REPORT'] },
    { kpiKey: 'ota_gmv', visibleTo: ['SUPER_ADMIN', 'MANAGER'] },
    { kpiKey: 'checkin_gmv', visibleTo: ['SUPER_ADMIN', 'MANAGER'] },
    { kpiKey: 'task_board', visibleTo: ['SUPER_ADMIN', 'MANAGER', 'SENIOR_IC', 'DIRECT_REPORT'] },
    { kpiKey: 'team_pulse', visibleTo: ['SUPER_ADMIN', 'MANAGER'] },
    { kpiKey: 'one_on_one_logs', visibleTo: ['SUPER_ADMIN', 'MANAGER', 'DIRECT_REPORT'] },
    { kpiKey: 'stakeholder_crm', visibleTo: ['SUPER_ADMIN', 'MANAGER', 'SENIOR_IC'] },
    { kpiKey: 'cadence_manager', visibleTo: ['SUPER_ADMIN', 'MANAGER'] },
  ]

  for (const setting of defaultKpiSettings) {
    await prisma.kpiSetting.upsert({
      where: {
        workspaceId_kpiKey: {
          workspaceId: platformWorkspace.id,
          kpiKey: setting.kpiKey,
        },
      },
      update: { visibleTo: setting.visibleTo },
      create: {
        workspaceId: platformWorkspace.id,
        kpiKey: setting.kpiKey,
        visibleTo: setting.visibleTo,
      },
    })
  }
  console.log('✓ Default KPI settings seeded for PLATFORM workspace')

  console.log('\nSeed complete ✓')
  console.log(`\nSaksham's account: ${ADMIN_EMAIL}`)
  console.log('Sign in at: /auth/login')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
