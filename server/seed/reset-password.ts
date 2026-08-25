/**
 * Password reset utility.
 * Usage:  npx tsx --env-file=.env seed/reset-password.ts <USN> <newPassword>
 * Example: npx tsx --env-file=.env seed/reset-password.ts 1VE-25CS-048 newpass123
 */
import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  const [, , rawUsn, newPassword] = process.argv

  if (!rawUsn || !newPassword) {
    console.error('Usage: npx tsx --env-file=.env seed/reset-password.ts <USN> <newPassword>')
    process.exit(1)
  }

  if (newPassword.length < 8) {
    console.error('Password must be at least 8 characters.')
    process.exit(1)
  }

  const usn = rawUsn.replace(/[-\s]/g, '').toUpperCase()

  const user = await prisma.user.findUnique({ where: { usn } })
  if (!user) {
    console.error(`No user found with USN: ${rawUsn}`)
    process.exit(1)
  }

  const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id })

  await prisma.user.update({
    where: { usn },
    data: {
      passwordHash,
      isActive: true,   // ensure account is active after reset
    },
  })

  console.log(`Password reset successfully for USN: ${rawUsn}`)
  console.log(`Account is now active. They can log in with the new password.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
