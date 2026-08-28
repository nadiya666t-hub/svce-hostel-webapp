/**
 * Seed parent portal accounts.
 * Run: npx tsx --env-file=.env seed/seed-parents.ts
 *
 * Creates one ParentUser per student USN.
 * Password defaults to:  Parent@<USN>  e.g. Parent@1VE25CS048
 * The college should change these via admin panel before handing to parents.
 */
import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()

const PARENTS = [
  { usn: '1VE25CS048', password: 'Parent@1VE25CS048' },
  { usn: '1VE25CS020', password: 'Parent@1VE25CS020' },
]

async function main() {
  console.log('Seeding parent accounts...')
  for (const { usn, password } of PARENTS) {
    const hash = await argon2.hash(password, { type: argon2.argon2id })
    await prisma.parentUser.upsert({
      where: { usn },
      update: {},
      create: { usn, passwordHash: hash, isActive: true },
    })
    console.log(`  OK  Parent: USN=${usn}  password=${password}`)
  }
  console.log('Done.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
