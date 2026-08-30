import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Overseer + Watchman accounts...')

  // ── Overseer ──────────────────────────────────────────────────────────────
  const overseerHash = await argon2.hash('Overseer@2024', { type: argon2.argon2id })
  const overseerUser = await prisma.user.upsert({
    where: { usn: 'OVERSEER001' },
    update: { passwordHash: overseerHash, isActive: true, role: 'OVERSEER' },
    create: { usn: 'OVERSEER001', passwordHash: overseerHash, role: 'OVERSEER', isActive: true },
  })
  await prisma.overseer.upsert({
    where: { userId: overseerUser.id },
    update: {},
    create: {
      userId: overseerUser.id,
      name: 'Hostel Overseer',
      designation: 'Hostel Overseer',
      phone: '+91 98765 43216',
      email: 'overseer@svce.edu',
      isActive: true,
    },
  })
  console.log('  OK  Overseer: OVERSEER001 / Overseer@2024')

  // ── Watchman ──────────────────────────────────────────────────────────────
  const watchmanHash = await argon2.hash('Watchman@2024', { type: argon2.argon2id })
  const watchmanUser = await prisma.user.upsert({
    where: { usn: 'WATCHMAN001' },
    update: { passwordHash: watchmanHash, isActive: true, role: 'WATCHMAN' },
    create: { usn: 'WATCHMAN001', passwordHash: watchmanHash, role: 'WATCHMAN', isActive: true },
  })
  await prisma.watchman.upsert({
    where: { userId: watchmanUser.id },
    update: {},
    create: {
      userId: watchmanUser.id,
      name: 'Hostel Watchman',
      designation: 'Gate Watchman',
      phone: '+91 98765 43217',
      email: 'watchman@svce.edu',
      isActive: true,
    },
  })
  console.log('  OK  Watchman: WATCHMAN001 / Watchman@2024')
  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
