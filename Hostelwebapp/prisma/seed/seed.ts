/**
 * Database seed — creates development student accounts.
 *
 * Run with:  npm run db:seed  (from /server)
 */
import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱  Seeding database…')

  // ── Academic Year ─────────────────────────────────────────────────────────
  const academicYear = await prisma.academicYear.upsert({
    where: { label: '2025-26' },
    update: {},
    create: {
      label: '2025-26',
      startDate: new Date('2025-06-01'),
      endDate: new Date('2026-05-31'),
      isCurrent: true,
    },
  })
  console.log(`  ✔  Academic year: ${academicYear.label}`)

  // ── Floors ────────────────────────────────────────────────────────────────
  const floor1 = await prisma.floor.upsert({
    where: { floorNumber: '1st Floor' },
    update: {},
    create: { floorNumber: '1st Floor' },
  })

  // Seed other floors so the app is ready for them
  for (const fn of ['2nd Floor', '3rd Floor', '4th Floor']) {
    await prisma.floor.upsert({
      where: { floorNumber: fn },
      update: {},
      create: { floorNumber: fn },
    })
  }
  console.log('  ✔  Floors: 1st–4th')

  // ── Rooms ─────────────────────────────────────────────────────────────────
  const room101 = await prisma.room.upsert({
    where: { floorId_roomNumber: { floorId: floor1.id, roomNumber: '101' } },
    update: {},
    create: { floorId: floor1.id, roomNumber: '101', capacity: 2 },
  })

  const room105 = await prisma.room.upsert({
    where: { floorId_roomNumber: { floorId: floor1.id, roomNumber: '105' } },
    update: {},
    create: { floorId: floor1.id, roomNumber: '105', capacity: 2 },
  })
  console.log('  ✔  Rooms: 101, 105')

  // ── Attendance Settings ───────────────────────────────────────────────────
  const existingSettings = await prisma.attendanceSettings.findFirst()
  if (!existingSettings) {
    await prisma.attendanceSettings.create({
      data: {
        latitude: 13.07381,    // Update with actual hostel coordinates
        longitude: 77.49467,
        radiusMeters: 100,
        isActive: true,
      },
    })
    console.log('  ✔  Attendance settings created')
  }

  // ── Default Attendance Window for today ──────────────────────────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  await prisma.attendanceWindow.upsert({
    where: {
      // No unique constraint on date alone — check manually
      id: 'default-window-seed',
    },
    update: {},
    create: {
      id: 'default-window-seed',
      date: today,
      startTime: '20:30',
      endTime: '20:40',
      isDefault: true,
      isSpecial: false,
    },
  })

  // ── Student 1: Girikarnika ────────────────────────────────────────────────
  const giriHash = await argon2.hash('changeme123', { type: argon2.argon2id })

  const giriUser = await prisma.user.upsert({
    where: { usn: '1VE-25CS-048' },
    update: {},
    create: {
      usn: '1VE-25CS-048',
      passwordHash: giriHash,
      role: 'STUDENT',
      isActive: false,  // Will activate on first login / password set
    },
  })

  const giri = await prisma.student.upsert({
    where: { userId: giriUser.id },
    update: {},
    create: {
      name: 'Girikarnika',
      userId: giriUser.id,
      roomId: room105.id,
    },
  })

  await prisma.studentAcademicHistory.upsert({
    where: { studentId_academicYearId: { studentId: giri.id, academicYearId: academicYear.id } },
    update: {},
    create: {
      studentId: giri.id,
      academicYearId: academicYear.id,
      yearLabel: '1st Year',
      semesterLabel: '2nd Semester',
    },
  })

  // Seed a fee record for Girikarnika
  const giriAY = await prisma.fee.upsert({
    where: { studentId_academicYearId: { studentId: giri.id, academicYearId: academicYear.id } },
    update: {},
    create: {
      studentId: giri.id,
      academicYearId: academicYear.id,
      totalAmount: 80000,
      paidAmount: 50000,
      dueDate: new Date('2026-08-30'),
    },
  })

  // Seed a payment
  const refExists = await prisma.feePayment.findFirst({ where: { feeId: giriAY.id } })
  if (!refExists) {
    await prisma.feePayment.create({
      data: {
        feeId: giriAY.id,
        amount: 50000,
        paidAt: new Date('2025-06-15'),
        reference: 'HMS-PAY-20250615-001',
        status: 'SUCCESS',
      },
    })
  }
  console.log(`  ✔  Student: ${giri.name} (${giriUser.usn})`)

  // ── Student 2: Nadia ──────────────────────────────────────────────────────
  const nadiaHash = await argon2.hash('changeme123', { type: argon2.argon2id })

  const nadiaUser = await prisma.user.upsert({
    where: { usn: '1VE-25CS-020' },
    update: {},
    create: {
      usn: '1VE-25CS-020',
      passwordHash: nadiaHash,
      role: 'STUDENT',
      isActive: false,
    },
  })

  const nadia = await prisma.student.upsert({
    where: { userId: nadiaUser.id },
    update: {},
    create: {
      name: 'Nadia',
      userId: nadiaUser.id,
      roomId: room101.id,
    },
  })

  await prisma.studentAcademicHistory.upsert({
    where: { studentId_academicYearId: { studentId: nadia.id, academicYearId: academicYear.id } },
    update: {},
    create: {
      studentId: nadia.id,
      academicYearId: academicYear.id,
      yearLabel: '1st Year',
      semesterLabel: '2nd Semester',
    },
  })

  await prisma.fee.upsert({
    where: { studentId_academicYearId: { studentId: nadia.id, academicYearId: academicYear.id } },
    update: {},
    create: {
      studentId: nadia.id,
      academicYearId: academicYear.id,
      totalAmount: 80000,
      paidAmount: 40000,
      dueDate: new Date('2026-08-30'),
    },
  })
  console.log(`  ✔  Student: ${nadia.name} (${nadiaUser.usn})`)

  // ── Sample Notices ────────────────────────────────────────────────────────
  const notices = [
    {
      title: 'Hostel Closed on Independence Day',
      description: 'The hostel office will be closed on 15 August 2026. Attendance marking will still be active.',
      priority: 'HIGH' as const,
      category: 'Events',
    },
    {
      title: 'Wi-Fi Maintenance — 17 Aug 2026',
      description: 'Wi-Fi will be unavailable from 2 AM to 4 AM on 17 August for scheduled maintenance.',
      priority: 'MEDIUM' as const,
      category: 'Maintenance',
    },
    {
      title: 'Fee Due Reminder',
      description: 'Please clear pending fees before 30 August 2026 to avoid late charges.',
      priority: 'URGENT' as const,
      category: 'Fees',
    },
  ]

  for (const n of notices) {
    const existing = await prisma.notice.findFirst({ where: { title: n.title } })
    if (!existing) {
      await prisma.notice.create({
        data: {
          ...n,
          academicYearId: academicYear.id,
        },
      })
    }
  }
  console.log('  ✔  Notices seeded')

  console.log('\n✅  Seed complete.')
  console.log('\nDev student accounts:')
  console.log('  USN: 1VE-25CS-048  Name: Girikarnika  Room: 105  Floor: 1st Floor')
  console.log('  USN: 1VE-25CS-020  Name: Nadia        Room: 101  Floor: 1st Floor')
  console.log('\nBoth accounts need first-time password setup on login.')
  console.log('(Password is NOT stored as plaintext — Argon2id hashed)')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
