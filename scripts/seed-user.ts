// scripts/seed-user.ts
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  const hash = await bcrypt.hash('lohono2027', 10)
  const user = await prisma.user.upsert({
    where: { email: 'saksham@lohono.com' },
    update: {},
    create: {
      email: 'saksham@lohono.com',
      name: 'Saksham',
      passwordHash: hash,
      role: 'MANAGER',
    },
  })
  console.log('Manager user created:', user.email)
}

main().catch(console.error).finally(() => prisma.$disconnect())
