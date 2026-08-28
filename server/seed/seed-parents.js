// CommonJS seed script for parent users
const argon2 = require('argon2')
const { PrismaClient } = require('@prisma/client')

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
