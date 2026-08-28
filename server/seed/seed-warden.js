// Seed warden account
// Run: node -e "require('dotenv').config({path:'.env'}); require('./seed/seed-warden.js')"
const argon2 = require('argon2')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding warden account...')
  const hash = await argon2.hash('Warden@2024', { type: argon2.argon2id })

  const user = await prisma.user.upsert({
    where: { usn: 'WARDEN001' },
    update: { passwordHash: hash, isActive: true, role: 'WARDEN' },
    create: {
      usn: 'WARDEN001',
      passwordHash: hash,
      role: 'WARDEN',
      isActive: true,
    },
  })

  await prisma.warden.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      name: 'Hostel Warden',
      designation: 'Hostel Warden',
      phone: '+91 98765 43210',
      email: 'warden@svce.edu',
      isActive: true,
    },
  })

  console.log('  OK  Warden: USN=WARDEN001  password=Warden@2024')
  console.log('Done.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
