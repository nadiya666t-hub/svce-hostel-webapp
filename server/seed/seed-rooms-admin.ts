/**
 * seed-rooms-admin.ts
 * Seeds:
 *  - 3 floors (1st, 2nd, 3rd) with 15 rooms each (101-115, 201-215, 301-315), capacity 3
 *  - Admin user: ADMIN001 / Admin@2024
 */
import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding floors, rooms, and admin user…')

  // ── Floors ──────────────────────────────────────────────────────────────────
  const floorDefs = [
    { floorNumber: '1st Floor', prefix: '1' },
    { floorNumber: '2nd Floor', prefix: '2' },
    { floorNumber: '3rd Floor', prefix: '3' },
  ]

  for (const fd of floorDefs) {
    const floor = await prisma.floor.upsert({
      where:  { floorNumber: fd.floorNumber },
      update: {},
      create: { floorNumber: fd.floorNumber },
    })

    // 15 rooms per floor: 101-115, 201-215, 301-315
    for (let i = 1; i <= 15; i++) {
      const roomNumber = `${fd.prefix}${String(i).padStart(2, '0')}`
      await prisma.room.upsert({
        where:  { floorId_roomNumber: { floorId: floor.id, roomNumber } },
        update: { capacity: 3 },
        create: { floorId: floor.id, roomNumber, capacity: 3 },
      })
    }
    console.log(`  OK  ${fd.floorNumber}: rooms ${fd.prefix}01–${fd.prefix}15 (capacity 3)`)
  }

  // ── Admin user ───────────────────────────────────────────────────────────────
  const adminId   = 'ADMIN001'
  const adminPass = 'Admin@2024'
  const hash      = await argon2.hash(adminPass, { type: argon2.argon2id })

  const existing = await prisma.user.findUnique({ where: { usn: adminId } })
  if (existing) {
    await prisma.user.update({
      where: { usn: adminId },
      data:  { passwordHash: hash, role: 'ADMIN', isActive: true },
    })
    console.log(`  OK  Admin user updated: ${adminId}`)
  } else {
    await prisma.user.create({
      data: {
        usn:          adminId,
        passwordHash: hash,
        role:         'ADMIN',
        isActive:     true,
      },
    })
    console.log(`  OK  Admin user created: ${adminId}`)
  }

  console.log('\nDone.')
  console.log('Admin credentials — ID: ADMIN001  Password: Admin@2024')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
