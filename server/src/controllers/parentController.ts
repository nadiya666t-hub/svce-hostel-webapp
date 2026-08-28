import { Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { createError } from '../middleware/errorHandler'
import type { AuthRequest } from '../types'

/** Resolve the student linked to the authenticated parent's USN */
async function resolveStudentForParent(usn: string) {
  const student = await prisma.student.findFirst({
    where: { user: { usn } },
    include: {
      user: { select: { usn: true, isActive: true } },
      allocations: {
        where: { status: 'ACTIVE' },
        include: { room: { include: { floor: true } } },
        orderBy: { allocatedAt: 'desc' },
        take: 1,
      },
      room: { include: { floor: true } },
      academicHistory: {
        include: { academicYear: true, semester: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })
  if (!student) throw createError('Student record not found.', 404)
  return student
}

function resolveRoom(student: Awaited<ReturnType<typeof resolveStudentForParent>>) {
  const room = student.allocations[0]?.room ?? student.room ?? null
  return {
    floorNumber: room?.floor?.floorNumber ?? '—',
    roomNumber: room?.roomNumber ?? '—',
  }
}

// ─── GET /api/parent/student ──────────────────────────────────────────────────
export async function getStudentDetails(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const student = await resolveStudentForParent(req.user!.usn)
    const history = student.academicHistory[0]
    const { floorNumber, roomNumber } = resolveRoom(student)

    res.json({
      success: true,
      data: {
        id: student.id,
        usn: student.user.usn,
        name: student.name,
        email: student.email,
        phone: student.phone,
        course: student.course,
        branch: student.branch,
        admissionYear: student.admissionYear,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
        bloodGroup: student.bloodGroup,
        floorNumber,
        roomNumber,
        academicYear: history?.academicYear?.label ?? '—',
        yearNumber: history?.yearNumber ?? 1,
        year: history?.yearLabel ?? '—',
        semester: history?.semesterLabel ?? '—',
        semesterStartDate: history?.semester?.startDate ?? null,
        semesterEndDate: history?.semester?.endDate ?? null,
        status: student.status,
        photoUrl: student.photoUrl ?? null,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─── GET /api/parent/fees ─────────────────────────────────────────────────────
export async function getStudentFees(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const student = await resolveStudentForParent(req.user!.usn)

    const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } })
    if (!currentYear) { res.json({ success: true, data: null }); return }

    const fee = await prisma.fee.findFirst({
      where: { studentId: student.id, academicYearId: currentYear.id },
      include: { payments: { orderBy: { paidAt: 'desc' } } },
    })
    if (!fee) { res.json({ success: true, data: null }); return }

    res.json({
      success: true,
      data: {
        id: fee.id,
        academicYear: currentYear.label,
        totalAmount: fee.totalAmount,
        paidAmount: fee.paidAmount,
        pendingAmount: fee.totalAmount - fee.paidAmount,
        dueDate: fee.dueDate,
        payments: fee.payments.map(p => ({
          id: p.id,
          amount: p.amount,
          date: p.paidAt,
          reference: p.reference,
          status: p.status,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─── GET /api/parent/attendance/today ────────────────────────────────────────
export async function getTodayAttendance(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const student = await resolveStudentForParent(req.user!.usn)

    // IST date
    const now = new Date()
    const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
    const dateStr = ist.toISOString().slice(0, 10)
    const todayDate = new Date(dateStr + 'T00:00:00.000Z')

    const record = await prisma.attendance.findFirst({
      where: { studentId: student.id, date: todayDate },
      include: { attendanceWindow: true },
    })

    // Window info
    const window = await prisma.attendanceWindow.findFirst({
      where: { date: todayDate, isDefault: true, studentId: null },
    })

    res.json({
      success: true,
      data: {
        date: dateStr,
        windowStart: window?.startTime ?? '20:30',
        windowEnd: window?.endTime ?? '20:40',
        attendance: record
          ? {
              status: record.status,
              markedAt: record.markedAt,
              locationType: record.locationType,
            }
          : null,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─── GET /api/parent/attendance/history ──────────────────────────────────────
export async function getAttendanceHistory(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const student = await resolveStudentForParent(req.user!.usn)
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')))
    const limit = Math.min(60, parseInt(String(req.query.limit ?? '30')))
    const skip = (page - 1) * limit

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where: { studentId: student.id },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.attendance.count({ where: { studentId: student.id } }),
    ])

    res.json({
      success: true,
      data: {
        records: records.map(r => ({
          id: r.id,
          date: r.date,
          markedAt: r.markedAt,
          status: r.status,
          locationType: r.locationType,
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─── GET /api/parent/outgoing ─────────────────────────────────────────────────
export async function getOutgoingHistory(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const student = await resolveStudentForParent(req.user!.usn)
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')))
    const limit = Math.min(50, parseInt(String(req.query.limit ?? '20')))
    const skip = (page - 1) * limit

    const [records, total] = await Promise.all([
      prisma.request.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.request.count({ where: { studentId: student.id } }),
    ])

    res.json({
      success: true,
      data: {
        records: records.map(r => ({
          id: r.id,
          type: r.type,
          fromDate: r.fromDate,
          toDate: r.toDate,
          reason: r.reason,
          destination: r.destination,
          status: r.status,
          reviewNote: r.reviewNote,
          createdAt: r.createdAt,
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─── GET /api/parent/emergency-contacts ──────────────────────────────────────
export async function getEmergencyContacts(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const contacts = await prisma.emergencyContact.findMany({
      where: {
        isActive: true,
        category: { in: ['Warden', 'Admin'] },
        designation: { notIn: ['Principal', 'Dean'] },
      },
      orderBy: { sortOrder: 'asc' },
    })
    res.json({ success: true, data: contacts })
  } catch (err) {
    next(err)
  }
}
