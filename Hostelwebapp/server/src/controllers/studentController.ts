import { Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { createError } from '../middleware/errorHandler'
import type { AuthRequest } from '../types'

// ─── Shared helper ────────────────────────────────────────────────────────────

/**
 * Resolves the full student record for the authenticated user.
 * Room/floor are read from the active HostelAllocation.
 * Falls back to the legacy student.roomId if no allocation exists
 * (backward compatibility — should not happen after seed runs).
 */
async function getStudentForUser(userId: string) {
  const student = await prisma.student.findFirst({
    where: { userId, isActive: true },
    include: {
      // Active hostel allocation → room → floor
      allocations: {
        where: { status: 'ACTIVE' },
        include: { room: { include: { floor: true } } },
        orderBy: { allocatedAt: 'desc' },
        take: 1,
      },
      // Legacy fallback FK
      room: { include: { floor: true } },
      // Most recent academic history entry, with semester details
      academicHistory: {
        include: {
          academicYear: true,
          semester: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!student) throw createError('Student record not found.', 404)
  return student
}

/**
 * Derive the room/floor for a student:
 *   1. Active HostelAllocation (preferred — supports room history)
 *   2. Legacy student.roomId FK (fallback)
 */
function resolveRoom(student: Awaited<ReturnType<typeof getStudentForUser>>) {
  const fromAllocation = student.allocations[0]?.room ?? null
  const fromLegacy = student.room ?? null
  const room = fromAllocation ?? fromLegacy
  return {
    floorNumber: room?.floor?.floorNumber ?? '—',
    roomNumber: room?.roomNumber ?? '—',
  }
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/students/me
 * Returns the full student profile including room, floor, academic info,
 * and the new master fields (course, branch, admissionYear, etc.).
 */
export async function getMyProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const student = await getStudentForUser(req.user!.userId)
    const history = student.academicHistory[0]
    const { floorNumber, roomNumber } = resolveRoom(student)

    res.json({
      success: true,
      data: {
        // Identity
        id: student.id,
        usn: req.user!.usn,
        name: student.name,
        email: student.email,
        phone: student.phone,

        // Academic master
        course: student.course,
        branch: student.branch,
        admissionYear: student.admissionYear,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,

        // Parent
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        parentEmail: student.parentEmail,

        // Address
        address: student.address,
        city: student.city,
        state: student.state,
        pinCode: student.pinCode,

        // Health
        bloodGroup: student.bloodGroup,

        // Hostel placement (from active allocation)
        floorNumber,
        roomNumber,

        // Academic progress
        academicYear: history?.academicYear?.label ?? '—',
        yearNumber: history?.yearNumber ?? 1,
        year: history?.yearLabel ?? '—',
        semester: history?.semesterLabel ?? '—',
        semesterStartDate: history?.semester?.startDate ?? null,
        semesterEndDate: history?.semester?.endDate ?? null,

        // Status
        status: student.status,
        isActive: student.isActive,
        importSource: student.importSource,
        createdAt: student.createdAt,
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/students/me/attendance/summary
 * Lightweight summary used by the dashboard card.
 * Full attendance data is served by /api/attendance/summary.
 */
export async function getAttendanceSummary(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
      select: { id: true },
    })
    if (!student) { next(createError('Student not found.', 404)); return }

    const records = await prisma.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { date: 'desc' },
    })

    const totalDays = records.length
    const presentDays = records.filter(
      r => r.status === 'PRESENT' || r.status === 'LATE_PRESENT' || r.status === 'SPECIAL'
    ).length
    const absentDays = records.filter(r => r.status === 'ABSENT').length
    const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0

    // Last 4 weeks — for the dashboard mini-chart
    const weeklyData = []
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - (w + 1) * 7)
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const wRecs = records.filter(r => {
        const d = new Date(r.date)
        return d >= weekStart && d < weekEnd
      })
      weeklyData.push({
        week: `Week ${4 - w}`,
        present: wRecs.filter(r => r.status !== 'ABSENT').length,
        total: wRecs.length,
      })
    }

    res.json({ success: true, data: { totalDays, presentDays, absentDays, percentage, weeklyData } })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/students/me/fees/current
 */
export async function getCurrentFees(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
      select: { id: true },
    })
    if (!student) { next(createError('Student not found.', 404)); return }

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
        studentId: student.id,
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
          receiptUrl: p.receiptUrl,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/students/me/requests?page=&limit=
 */
export async function getMyRequests(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
      select: { id: true },
    })
    if (!student) { next(createError('Student not found.', 404)); return }

    const page = Math.max(1, parseInt(String(req.query.page ?? '1')))
    const limit = Math.min(50, parseInt(String(req.query.limit ?? '10')))
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
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
      data: { data, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/students/me/problems?page=&limit=
 */
export async function getMyProblems(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
      select: { id: true },
    })
    if (!student) { next(createError('Student not found.', 404)); return }

    const page = Math.max(1, parseInt(String(req.query.page ?? '1')))
    const limit = Math.min(50, parseInt(String(req.query.limit ?? '10')))
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      prisma.problem.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.problem.count({ where: { studentId: student.id } }),
    ])

    res.json({
      success: true,
      data: { data, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    next(err)
  }
}
