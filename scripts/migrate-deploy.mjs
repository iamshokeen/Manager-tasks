// scripts/migrate-deploy.mjs
//
// Wrapper around `prisma migrate deploy` that:
//   1. Skips entirely when there are no pending migrations (the common
//      case — avoids the Neon advisory-lock dance on every build).
//   2. Retries with backoff when the lock IS contended, so two
//      overlapping Vercel deploys don't both bail out at the 10s timeout.
//
// Falls back gracefully when DATABASE_URL is absent (e.g. local lint),
// so missing env doesn't break the build pipeline.

import { spawnSync } from 'node:child_process'

const MAX_RETRIES = 4
const RETRY_DELAY_MS = 6_000

if (!process.env.DATABASE_URL) {
  console.log('[migrate-deploy] No DATABASE_URL set — skipping.')
  process.exit(0)
}

function run(args) {
  return spawnSync('npx', ['prisma', ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    encoding: 'utf8',
  })
}

// Step 1 — status check. If no pending migrations, we're done; no lock needed.
const status = run(['migrate', 'status'])
const statusOut = (status.stdout || '') + (status.stderr || '')
if (
  status.status === 0 &&
  /Database schema is up to date/i.test(statusOut)
) {
  console.log('[migrate-deploy] Schema already up to date — nothing to apply.')
  process.exit(0)
}

// Step 2 — deploy, with retries on advisory-lock contention.
for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  console.log(`[migrate-deploy] Applying pending migrations (attempt ${attempt}/${MAX_RETRIES})…`)
  const deploy = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (deploy.status === 0) {
    console.log('[migrate-deploy] Migrations applied.')
    process.exit(0)
  }
  if (attempt < MAX_RETRIES) {
    console.warn(`[migrate-deploy] Attempt ${attempt} failed (exit ${deploy.status}). Retrying in ${RETRY_DELAY_MS / 1000}s…`)
    await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
  } else {
    console.error('[migrate-deploy] All retries exhausted.')
    process.exit(deploy.status ?? 1)
  }
}
