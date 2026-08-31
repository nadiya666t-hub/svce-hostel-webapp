/**
 * Seeds parent accounts for both dev students.
 * Parent login: student USN + Parent@2024
 */
import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding parent accounts...')
  const hash = await argon2.hash('Parent@2024', { type: argon2.argon2id })

  // Parent for Girikarnika (USN: 1VE25CS048)
  await prisma.parentUser.upsert({
    where: { usn: '1VE25CS048' },
    update: { passwordHash: hash, isActive: true },
    create: { usn: '1VE25CS048', passwordHash: hash, isActive: true },
  })
  console.log('  OK  Parent for Girikarnika: USN=1VE25CS048 / Parent@2024')

  // Parent for Nadia (USN: 1VE25CS020)
  await prisma.parentUser.upsert({
    where: { usn: '1VE25CS020' },
    update: { passwordHash: hash, isActive: true },
    create: { usn: '1VE25CS020', passwordHash: hash, isActive: true },
  })
  console.log('  OK  Parent for Nadia:       USN=1VE25CS020 / Parent@2024')

  console.log('\nDone. Login with student USN + password Parent@2024')
}

main().catch(console.error).finally(() => prisma.$disconnect())
