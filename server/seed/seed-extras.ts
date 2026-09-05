/**
 * Seeds emergency contacts and today's attendance window.
 * Run: npx tsx --env-file=.env seed/seed-extras.ts
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding extras...')

  // ── Emergency Contacts ────────────────────────────────────────────────────
  const contacts = [
    { name: 'Hostel Warden', designation: 'Warden', phone: '+91 98765 43210', email: 'warden@hostel.edu', category: 'Warden', sortOrder: 1 },
    { name: 'Hostel Office', designation: 'Administrative Office', phone: '+91 98765 43211', email: 'office@hostel.edu', category: 'Admin', sortOrder: 2 },
    { name: 'Principal', designation: 'Principal', phone: '+91 98765 43212', email: 'principal@hostel.edu', category: 'Admin', sortOrder: 3 },
    { name: 'Dean of Students', designation: 'Dean', phone: '+91 98765 43213', email: 'dean@hostel.edu', category: 'Admin', sortOrder: 4 },
    { name: 'Campus Security', designation: 'Security Officer', phone: '+91 98765 43214', category: 'Security', sortOrder: 5 },
    { name: 'Campus Medical', designation: 'Medical Officer', phone: '+91 98765 43215', email: 'medical@hostel.edu', category: 'Medical', sortOrder: 6 },
    { name: 'Fire Emergency', designation: 'Emergency Services', phone: '101', category: 'Emergency', sortOrder: 7 },
    { name: 'Police', designation: 'Emergency Services', phone: '100', category: 'Emergency', sortOrder: 8 },
    { name: 'Ambulance', designation: 'Emergency Services', phone: '108', category: 'Emergency', sortOrder: 9 },
  ]

  for (const c of contacts) {
    const existing = await prisma.emergencyContact.findFirst({ where: { phone: c.phone } })
    if (!existing) {
      await prisma.emergencyContact.create({ data: c })
      console.log(`  OK  Contact: ${c.name}`)
    } else {
      console.log(`  --  Already exists: ${c.name}`)
    }
  }

  // ── Today's Attendance Window ──────────────────────────────────────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const existingWindow = await prisma.attendanceWindow.findFirst({
    where: { date: today, isDefault: true, studentId: null },
  })

  if (!existingWindow) {
    await prisma.attendanceWindow.create({
      data: {
        date: today,
        startTime: '20:30',
        endTime: '21:00',
        isDefault: true,
        isSpecial: false,
        windowStatus: 'ACTIVE',
      },
    })
    console.log('  OK  Today attendance window: 20:30–20:40')
  } else {
    console.log('  --  Today window already exists:', existingWindow.startTime, '-', existingWindow.endTime)
  }

  console.log('\nDone.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
