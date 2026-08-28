/**
 * Main development seed.
 * Run: npm run db:seed  (from /server)
 */
import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // ── Academic Year 2025-26 ──────────────────────────────────────────────────
  const ay = await prisma.academicYear.upsert({
    where: { label: '2025-26' },
    update: { isCurrent: true },
    create: {
      label: '2025-26',
      startDate: new Date('2025-06-01'),
      endDate: new Date('2026-05-31'),
      isCurrent: true,
    },
  })
  console.log('  OK  Academic year:', ay.label)

  // ── Semesters for 2025-26 ─────────────────────────────────────────────────
  const sem1 = await prisma.semester.upsert({
    where: { academicYearId_semesterNumber: { academicYearId: ay.id, semesterNumber: 1 } },
    update: {},
    create: {
      academicYearId: ay.id,
      semesterNumber: 1,
      label: '1st Semester',
      startDate: new Date('2025-08-01'),
      endDate: new Date('2025-12-31'),
      isCurrent: false,
    },
  })

  const sem2 = await prisma.semester.upsert({
    where: { academicYearId_semesterNumber: { academicYearId: ay.id, semesterNumber: 2 } },
    update: {},
    create: {
      academicYearId: ay.id,
      semesterNumber: 2,
      label: '2nd Semester',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-05-31'),
      isCurrent: true,   // current date falls in Sem 2
    },
  })
  console.log('  OK  Semesters: Sem 1 (Aug–Dec 2025), Sem 2 (Jan–May 2026) [current]')

  // ── Floors ────────────────────────────────────────────────────────────────
  const floor1 = await prisma.floor.upsert({
    where: { floorNumber: '1st Floor' },
    update: {},
    create: { floorNumber: '1st Floor' },
  })
  for (const fn of ['2nd Floor', '3rd Floor', '4th Floor']) {
    await prisma.floor.upsert({
      where: { floorNumber: fn },
      update: {},
      create: { floorNumber: fn },
    })
  }
  console.log('  OK  Floors: 1st–4th')

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
  console.log('  OK  Rooms: 101, 105')

  // ── Attendance Settings ───────────────────────────────────────────────────
  if (!(await prisma.attendanceSettings.findFirst())) {
    await prisma.attendanceSettings.create({
      data: { latitude: 13.07381, longitude: 77.49467, radiusMeters: 100, isActive: true },
    })
    console.log('  OK  Attendance settings')
  }

  // ── Default Attendance Window ─────────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0)
  await prisma.attendanceWindow.upsert({
    where: { id: 'default-window-seed' },
    update: { date: today },
    create: {
      id: 'default-window-seed',
      date: today,
      startTime: '20:30',
      endTime: '20:40',
      isDefault: true,
      isSpecial: false,
      windowStatus: 'ACTIVE',
    },
  })
  console.log('  OK  Default attendance window: 20:30–20:40')

  // ── Student 1: Girikarnika ─────────────────────────────────────────────────
  const giriHash = await argon2.hash('changeme123', { type: argon2.argon2id })
  const giriUser = await prisma.user.upsert({
    where: { usn: '1VE25CS048' },
    update: {},
    create: { usn: '1VE25CS048', passwordHash: giriHash, role: 'STUDENT', isActive: false },
  })

  const giri = await prisma.student.upsert({
    where: { userId: giriUser.id },
    update: {
      // Populate new master fields on update
      course: 'B.E.',
      branch: 'Computer Science & Engineering',
      admissionYear: 2025,
      gender: 'FEMALE',
      importSource: 'SEED',
      roomId: room105.id,
    },
    create: {
      name: 'Girikarnika',
      userId: giriUser.id,
      roomId: room105.id,           // legacy FK — kept for backward compat
      course: 'B.E.',
      branch: 'Computer Science & Engineering',
      admissionYear: 2025,
      gender: 'FEMALE',
      importSource: 'SEED',
      status: 'ACTIVE',
    },
  })

  // Academic history — link to Semester FK now
  await prisma.studentAcademicHistory.upsert({
    where: { studentId_academicYearId: { studentId: giri.id, academicYearId: ay.id } },
    update: { semesterId: sem2.id, yearNumber: 1 },
    create: {
      studentId: giri.id,
      academicYearId: ay.id,
      semesterId: sem2.id,
      yearNumber: 1,
      yearLabel: '1st Year',
      semesterLabel: '2nd Semester',
    },
  })

  // Hostel allocation — create only if none exists
  const giriAlloc = await prisma.hostelAllocation.findFirst({
    where: { studentId: giri.id, status: 'ACTIVE' },
  })
  if (!giriAlloc) {
    await prisma.hostelAllocation.create({
      data: {
        studentId: giri.id,
        roomId: room105.id,
        allocatedAt: new Date('2025-08-01'),
        status: 'ACTIVE',
        reason: 'Initial hostel allocation',
        allocatedBy: null,
      },
    })
  }

  // Fee
  const giriFee = await prisma.fee.upsert({
    where: { studentId_academicYearId: { studentId: giri.id, academicYearId: ay.id } },
    update: {},
    create: {
      studentId: giri.id,
      academicYearId: ay.id,
      totalAmount: 80000,
      paidAmount: 50000,
      dueDate: new Date('2026-08-30'),
    },
  })
  if (!(await prisma.feePayment.findFirst({ where: { feeId: giriFee.id } }))) {
    await prisma.feePayment.create({
      data: {
        feeId: giriFee.id,
        amount: 50000,
        paidAt: new Date('2025-06-15'),
        reference: 'HMS-PAY-20250615-001',
        status: 'SUCCESS',
      },
    })
  }
  console.log('  OK  Student: Girikarnika (1VE-25CS-048) — Floor 1 Room 105')

  // ── Student 2: Nadia ──────────────────────────────────────────────────────
  const nadiaHash = await argon2.hash('changeme123', { type: argon2.argon2id })
  const nadiaUser = await prisma.user.upsert({
    where: { usn: '1VE25CS020' },
    update: {},
    create: { usn: '1VE25CS020', passwordHash: nadiaHash, role: 'STUDENT', isActive: false },
  })

  const nadia = await prisma.student.upsert({
    where: { userId: nadiaUser.id },
    update: {
      course: 'B.E.',
      branch: 'Computer Science & Engineering',
      admissionYear: 2025,
      gender: 'FEMALE',
      importSource: 'SEED',
      roomId: room101.id,
    },
    create: {
      name: 'Nadia',
      userId: nadiaUser.id,
      roomId: room101.id,
      course: 'B.E.',
      branch: 'Computer Science & Engineering',
      admissionYear: 2025,
      gender: 'FEMALE',
      importSource: 'SEED',
      status: 'ACTIVE',
    },
  })

  await prisma.studentAcademicHistory.upsert({
    where: { studentId_academicYearId: { studentId: nadia.id, academicYearId: ay.id } },
    update: { semesterId: sem2.id, yearNumber: 1 },
    create: {
      studentId: nadia.id,
      academicYearId: ay.id,
      semesterId: sem2.id,
      yearNumber: 1,
      yearLabel: '1st Year',
      semesterLabel: '2nd Semester',
    },
  })

  const nadiaAlloc = await prisma.hostelAllocation.findFirst({
    where: { studentId: nadia.id, status: 'ACTIVE' },
  })
  if (!nadiaAlloc) {
    await prisma.hostelAllocation.create({
      data: {
        studentId: nadia.id,
        roomId: room101.id,
        allocatedAt: new Date('2025-08-01'),
        status: 'ACTIVE',
        reason: 'Initial hostel allocation',
      },
    })
  }

  await prisma.fee.upsert({
    where: { studentId_academicYearId: { studentId: nadia.id, academicYearId: ay.id } },
    update: {},
    create: {
      studentId: nadia.id,
      academicYearId: ay.id,
      totalAmount: 80000,
      paidAmount: 40000,
      dueDate: new Date('2026-08-30'),
    },
  })
  console.log('  OK  Student: Nadia (1VE-25CS-020) — Floor 1 Room 101')

  // ── Notices ───────────────────────────────────────────────────────────────
  for (const n of [
    { title: 'Fee Due Reminder', description: 'Please clear pending fees before 30 August 2026 to avoid late charges.', priority: 'URGENT' as const, category: 'Fees' },
  ]) {
    if (!(await prisma.notice.findFirst({ where: { title: n.title } }))) {
      await prisma.notice.create({ data: { ...n, academicYearId: ay.id } })
    }
  }
  console.log('  OK  Notices')

  // ── Emergency Contacts ────────────────────────────────────────────────────
  for (const c of [
    { name: 'Hostel Warden',    designation: 'Warden',                phone: '+91 98765 43210', email: 'warden@hostel.edu',    category: 'Warden',    sortOrder: 1 },
    { name: 'Hostel Office',    designation: 'Administrative Office', phone: '+91 98765 43211', email: 'office@hostel.edu',    category: 'Admin',     sortOrder: 2 },
    { name: 'Principal',        designation: 'Principal',             phone: '+91 98765 43212', email: 'principal@hostel.edu', category: 'Admin',     sortOrder: 3 },
    { name: 'Dean of Students', designation: 'Dean',                  phone: '+91 98765 43213', email: 'dean@hostel.edu',      category: 'Admin',     sortOrder: 4 },
    { name: 'Campus Security',  designation: 'Security Officer',      phone: '+91 98765 43214',                                category: 'Security',  sortOrder: 5 },
    { name: 'Campus Medical',   designation: 'Medical Officer',       phone: '+91 98765 43215', email: 'medical@hostel.edu',   category: 'Medical',   sortOrder: 6 },
    { name: 'Fire Emergency',   designation: 'Emergency Services',    phone: '101',                                            category: 'Emergency', sortOrder: 7 },
    { name: 'Police',           designation: 'Emergency Services',    phone: '100',                                            category: 'Emergency', sortOrder: 8 },
    { name: 'Ambulance',        designation: 'Emergency Services',    phone: '108',                                            category: 'Emergency', sortOrder: 9 },
  ]) {
    if (!(await prisma.emergencyContact.findFirst({ where: { phone: c.phone } }))) {
      await prisma.emergencyContact.create({ data: c })
    }
  }
  console.log('  OK  Emergency contacts')

  console.log('\nSeed complete.')
  console.log('  Girikarnika  USN:1VE25CS048  1st Floor Room 105  (isActive=false — needs first-time setup)')
  console.log('  Nadia        USN:1VE25CS020  1st Floor Room 101  (isActive=false — needs first-time setup)')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
