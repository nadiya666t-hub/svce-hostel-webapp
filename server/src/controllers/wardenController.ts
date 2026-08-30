import { Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { createError } from '../middleware/errorHandler'
import type { AuthRequest } from '../types'

// ── Helper ────────────────────────────────────────────────────────────────────

function getISTDateStr() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  return ist.toISOString().slice(0, 10)
}

async function resolveWarden(userId: string) {
  const warden = await prisma.warden.findUnique({
    where: { userId },
    select: { id: true, name: true, designation: true },
  })
  if (!warden) throw createError('Warden profile not found.', 404)
  return warden
}

// ═══ DASHBOARD ════════════════════════════════════════════════════════════════

export async function getDashboardStats(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const dateStr = getISTDateStr()
    const todayDate = new Date(dateStr + 'T00:00:00.000Z')

    const [
      totalStudents,
      rooms,
      pendingRequests,
      pendingProblems,
      todayAttendance,
    ] = await Promise.all([
      prisma.student.count({ where: { isActive: true } }),
      prisma.room.findMany({
        include: { _count: { select: { allocations: { where: { status: 'ACTIVE' } } } } },
      }),
      prisma.request.count({ where: { status: 'PENDING' } }),
      prisma.problem.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
      prisma.attendance.findMany({ where: { date: todayDate }, select: { status: true } }),
    ])

    const occupiedRooms = rooms.filter(r => r._count.allocations > 0).length
    const vacantRooms   = rooms.length - occupiedRooms
    const presentToday  = todayAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE_PRESENT').length
    const absentToday   = totalStudents - presentToday

    // 7-day attendance trend
    const trend = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() + 5.5*60*60*1000 - i*24*60*60*1000)
      const ds = d.toISOString().slice(0, 10)
      const dayDate = new Date(ds + 'T00:00:00.000Z')
      const recs = await prisma.attendance.findMany({ where: { date: dayDate }, select: { status: true } })
      const present = recs.filter(r => r.status === 'PRESENT' || r.status === 'LATE_PRESENT').length
      trend.push({ date: ds, label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), present, total: totalStudents })
    }

    res.json({
      success: true,
      data: {
        totalStudents, totalRooms: rooms.length,
        occupiedRooms, vacantRooms,
        pendingRequests, pendingProblems,
        presentToday, absentToday,
        attendanceDate: dateStr,
        trend,
      },
    })
  } catch (err) { next(err) }
}

// ═══ STUDENTS ═════════════════════════════════════════════════════════════════

export async function getAllStudents(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { search, floor, room, academicYear, status } = req.query as Record<string, string>
    const page  = Math.max(1, parseInt(String(req.query.page  ?? '1')))
    const limit = Math.min(100, parseInt(String(req.query.limit ?? '50')))
    const skip  = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status === 'active')   where.isActive = true
    if (status === 'inactive') where.isActive = false

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { user: { usn: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (floor || room) {
      where.allocations = {
        some: {
          status: 'ACTIVE',
          room: {
            ...(room  ? { roomNumber: { contains: room,  mode: 'insensitive' } } : {}),
            ...(floor ? { floor: { floorNumber: { contains: floor, mode: 'insensitive' } } } : {}),
          },
        },
      }
    }

    if (academicYear) {
      where.academicHistory = {
        some: { academicYear: { label: { contains: academicYear } } },
      }
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          user: { select: { usn: true, isActive: true } },
          allocations: {
            where: { status: 'ACTIVE' },
            include: { room: { include: { floor: true } } },
            take: 1,
            orderBy: { allocatedAt: 'desc' },
          },
          academicHistory: {
            include: { academicYear: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.student.count({ where }),
    ])

    res.json({
      success: true,
      data: {
        students: students.map(s => {
          const alloc = s.allocations[0]
          return {
            id:           s.id,
            name:         s.name,
            usn:          s.user.usn,
            email:        s.email,
            phone:        s.phone,
            floor:        alloc?.room.floor.floorNumber ?? '—',
            room:         alloc?.room.roomNumber        ?? '—',
            academicYear: s.academicHistory[0]?.academicYear.label ?? '—',
            status:       s.status,
            isActive:     s.isActive,
            photoUrl:     s.photoUrl,
          }
        }),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) { next(err) }
}

export async function getStudentDetail(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: { select: { usn: true, isActive: true, lastLoginAt: true } },
        allocations: {
          where: { status: 'ACTIVE' },
          include: { room: { include: { floor: true } } },
          take: 1,
        },
        academicHistory: {
          include: { academicYear: true, semester: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        fees: {
          include: { academicYear: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })
    if (!student) { next(createError('Student not found.', 404)); return }

    const alloc = student.allocations[0]
    const history = student.academicHistory[0]
    const fee = student.fees[0]

    res.json({
      success: true,
      data: {
        id: student.id,
        name: student.name,
        usn: student.user.usn,
        email: student.email,
        phone: student.phone,
        course: student.course,
        branch: student.branch,
        admissionYear: student.admissionYear,
        gender: student.gender,
        bloodGroup: student.bloodGroup,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        floor:        alloc?.room.floor.floorNumber ?? '—',
        room:         alloc?.room.roomNumber        ?? '—',
        academicYear: history?.academicYear.label   ?? '—',
        year:         history?.yearLabel            ?? '—',
        semester:     history?.semesterLabel        ?? '—',
        status:       student.status,
        isActive:     student.isActive,
        photoUrl:     student.photoUrl,
        lastLoginAt:  student.user.lastLoginAt,
        fee: fee ? {
          totalAmount:   fee.totalAmount,
          paidAmount:    fee.paidAmount,
          pendingAmount: fee.totalAmount - fee.paidAmount,
          dueDate:       fee.dueDate,
        } : null,
      },
    })
  } catch (err) { next(err) }
}

// ═══ ROOMS ════════════════════════════════════════════════════════════════════

export async function getRooms(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const floors = await prisma.floor.findMany({
      orderBy: { floorNumber: 'asc' },
      include: {
        rooms: {
          orderBy: { roomNumber: 'asc' },
          include: {
            allocations: {
              where: { status: 'ACTIVE' },
              include: {
                student: {
                  include: { user: { select: { usn: true } } },
                },
              },
            },
          },
        },
      },
    })

    res.json({
      success: true,
      data: floors.map(floor => ({
        id:          floor.id,
        floorNumber: floor.floorNumber,
        rooms: floor.rooms.map(room => ({
          id:         room.id,
          roomNumber: room.roomNumber,
          capacity:   room.capacity,
          occupied:   room.allocations.length,
          vacant:     room.capacity - room.allocations.length,
          students: room.allocations.map(a => ({
            id:      a.student.id,
            name:    a.student.name,
            usn:     a.student.user.usn,
            status:  a.student.status,
            photoUrl: a.student.photoUrl,
          })),
        })),
      })),
    })
  } catch (err) { next(err) }
}

// ═══ REQUESTS ═════════════════════════════════════════════════════════════════

export async function getRequests(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { status, search } = req.query as Record<string, string>
    const page  = Math.max(1, parseInt(String(req.query.page  ?? '1')))
    const limit = Math.min(100, parseInt(String(req.query.limit ?? '30')))
    const skip  = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status && status !== 'ALL') where.status = status
    if (search) {
      where.student = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { user: { usn: { contains: search, mode: 'insensitive' } } },
        ],
      }
    }

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where,
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            include: {
              user: { select: { usn: true } },
              allocations: {
                where: { status: 'ACTIVE' },
                include: { room: { include: { floor: true } } },
                take: 1,
              },
            },
          },
        },
      }),
      prisma.request.count({ where }),
    ])

    res.json({
      success: true,
      data: {
        requests: requests.map(r => {
          const alloc = r.student.allocations[0]
          return {
            id:               r.id,
            type:             r.type,
            status:           r.status,
            reason:           r.reason,
            destination:      r.destination,
            additionalDetails: r.additionalDetails,
            fromDate:         r.fromDate,
            toDate:           r.toDate,
            reviewNote:       r.reviewNote,
            reviewedAt:       r.reviewedAt,
            createdAt:        r.createdAt,
            student: {
              id:    r.student.id,
              name:  r.student.name,
              usn:   r.student.user.usn,
              floor: alloc?.room.floor.floorNumber ?? '—',
              room:  alloc?.room.roomNumber        ?? '—',
            },
          }
        }),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) { next(err) }
}

export async function reviewRequest(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params
    const { action, reviewNote } = req.body as { action: 'APPROVED' | 'REJECTED'; reviewNote?: string }

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      next(createError('action must be APPROVED or REJECTED.', 422)); return
    }

    const request = await prisma.request.findUnique({ where: { id }, include: { student: true } })
    if (!request) { next(createError('Request not found.', 404)); return }
    if (request.status !== 'PENDING') {
      next(createError('Request has already been reviewed.', 400)); return
    }

    const updated = await prisma.request.update({
      where: { id },
      data: {
        status:     action,
        reviewNote: reviewNote ?? null,
        reviewedAt: new Date(),
        reviewedBy: req.user!.userId,
      },
    })

    // Notify student
    await prisma.notification.create({
      data: {
        studentId: request.studentId,
        type:    action === 'APPROVED' ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
        title:   action === 'APPROVED' ? 'Request Approved' : 'Request Rejected',
        message: action === 'APPROVED'
          ? `Your ${request.type.replace(/_/g, ' ')} request has been approved.`
          : `Your ${request.type.replace(/_/g, ' ')} request was rejected.${reviewNote ? ' Reason: ' + reviewNote : ''}`,
      },
    })

    res.json({ success: true, message: `Request ${action.toLowerCase()}.`, data: { id: updated.id, status: updated.status } })
  } catch (err) { next(err) }
}

// ═══ PROBLEMS ═════════════════════════════════════════════════════════════════

export async function getProblems(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { status, search } = req.query as Record<string, string>
    const page  = Math.max(1, parseInt(String(req.query.page  ?? '1')))
    const limit = Math.min(100, parseInt(String(req.query.limit ?? '30')))
    const skip  = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status && status !== 'ALL') where.status = status
    if (search) {
      where.student = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { user: { usn: { contains: search, mode: 'insensitive' } } },
        ],
      }
    }

    const [problems, total] = await Promise.all([
      prisma.problem.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            include: {
              user: { select: { usn: true } },
              allocations: {
                where: { status: 'ACTIVE' },
                include: { room: { include: { floor: true } } },
                take: 1,
              },
            },
          },
        },
      }),
      prisma.problem.count({ where }),
    ])

    res.json({
      success: true,
      data: {
        problems: problems.map(p => {
          const alloc = p.student.allocations[0]
          return {
            id:          p.id,
            category:    p.category,
            description: p.description,
            photoUrl:    p.photoUrl,
            roomNumber:  p.roomNumber,
            status:      p.status,
            resolveNote: p.resolveNote,
            resolvedAt:  p.resolvedAt,
            createdAt:   p.createdAt,
            student: {
              id:    p.student.id,
              name:  p.student.name,
              usn:   p.student.user.usn,
              floor: alloc?.room.floor.floorNumber ?? '—',
              room:  alloc?.room.roomNumber        ?? '—',
            },
          }
        }),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) { next(err) }
}

export async function updateProblemStatus(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params
    const { status, resolveNote } = req.body as { status: string; resolveNote?: string }

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED']
    if (!validStatuses.includes(status)) {
      next(createError('Invalid status.', 422)); return
    }

    const problem = await prisma.problem.findUnique({ where: { id } })
    if (!problem) { next(createError('Problem not found.', 404)); return }

    const updated = await prisma.problem.update({
      where: { id },
      data: {
        status:      status as 'PENDING' | 'IN_PROGRESS' | 'RESOLVED',
        resolveNote: resolveNote ?? null,
        resolvedAt:  status === 'RESOLVED' ? new Date() : null,
        resolvedBy:  status === 'RESOLVED' ? req.user!.userId : null,
      },
    })

    // Notify student
    await prisma.notification.create({
      data: {
        studentId: problem.studentId,
        type:    'PROBLEM_STATUS_CHANGED',
        title:   'Problem Status Updated',
        message: `Your ${problem.category.replace(/_/g, ' ')} problem has been updated to ${status.replace(/_/g, ' ')}.${resolveNote ? ' Note: ' + resolveNote : ''}`,
      },
    })

    res.json({ success: true, data: { id: updated.id, status: updated.status } })
  } catch (err) { next(err) }
}

// ═══ ATTENDANCE ═══════════════════════════════════════════════════════════════

export async function getAttendance(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { date, floor, room, studentId, status } = req.query as Record<string, string>
    const dateStr = date ?? getISTDateStr()
    const todayDate = new Date(dateStr + 'T00:00:00.000Z')

    const attendanceWhere: Record<string, unknown> = { date: todayDate }
    if (status && status !== 'ALL') attendanceWhere.status = status
    if (studentId) attendanceWhere.studentId = studentId

    if (floor || room) {
      attendanceWhere.student = {
        allocations: {
          some: {
            status: 'ACTIVE',
            room: {
              ...(room  ? { roomNumber: { contains: room,  mode: 'insensitive' } } : {}),
              ...(floor ? { floor: { floorNumber: { contains: floor, mode: 'insensitive' } } } : {}),
            },
          },
        },
      }
    }

    const [records, totalStudents] = await Promise.all([
      prisma.attendance.findMany({
        where: attendanceWhere,
        orderBy: { markedAt: 'asc' },
        include: {
          student: {
            include: {
              user: { select: { usn: true } },
              allocations: {
                where: { status: 'ACTIVE' },
                include: { room: { include: { floor: true } } },
                take: 1,
              },
            },
          },
        },
      }),
      prisma.student.count({ where: { isActive: true } }),
    ])

    const present = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE_PRESENT').length
    const absent  = records.filter(r => r.status === 'ABSENT').length
    const late    = records.filter(r => r.status === 'LATE_PRESENT').length
    const excused = records.filter(r => r.status === 'EXCUSED').length
    const notSubmitted = totalStudents - records.length

    res.json({
      success: true,
      data: {
        date: dateStr,
        summary: { totalStudents, present, absent, late, excused, notSubmitted,
          percentage: totalStudents > 0 ? Math.round(((present) / totalStudents) * 100) : 0 },
        records: records.map(r => {
          const alloc = r.student.allocations[0]
          return {
            id:               r.id,
            status:           r.status,
            markedAt:         r.markedAt,
            locationType:     r.locationType,
            verifiedLocation: r.verifiedLocation,
            latitude:         r.latitude,
            longitude:        r.longitude,
            gpsAccuracy:      r.gpsAccuracy,
            distanceFromHostel: r.distanceFromHostel,
            photoUrl:         r.photoUrl,
            isSpecialWindow:  r.isSpecialWindow,
            student: {
              id:    r.student.id,
              name:  r.student.name,
              usn:   r.student.user.usn,
              floor: alloc?.room.floor.floorNumber ?? '—',
              room:  alloc?.room.roomNumber        ?? '—',
            },
          }
        }),
      },
    })
  } catch (err) { next(err) }
}

// ═══ SPECIAL ATTENDANCE WINDOWS ═══════════════════════════════════════════════

export async function getSpecialWindows(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { status } = req.query as { status?: string }
    const where: Record<string, unknown> = { isSpecial: true }
    if (status && status !== 'ALL') where.windowStatus = status

    const windows = await prisma.attendanceWindow.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        student: { include: { user: { select: { usn: true } } } },
      },
    })

    res.json({
      success: true,
      data: windows.map(w => ({
        id:               w.id,
        date:             w.date,
        startTime:        w.startTime,
        endTime:          w.endTime,
        reason:           w.reason,
        approvedBy:       w.approvedBy,
        approvedAt:       w.approvedAt,
        windowStatus:     w.windowStatus,
        approvedLocation: w.approvedLocation,
        createdAt:        w.createdAt,
        student: w.student ? {
          id:   w.student.id,
          name: w.student.name,
          usn:  w.student.user.usn,
        } : null,
      })),
    })
  } catch (err) { next(err) }
}

export async function createSpecialWindow(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { studentId, date, startTime, endTime, reason, approvedLocation } =
      req.body as {
        studentId: string; date: string; startTime: string
        endTime: string; reason: string; approvedLocation: string
      }

    if (!studentId || !date || !startTime || !endTime || !reason) {
      next(createError('studentId, date, startTime, endTime and reason are required.', 422)); return
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (!student) { next(createError('Student not found.', 404)); return }

    const warden = await resolveWarden(req.user!.userId)
    const dateObj = new Date(date + 'T00:00:00.000Z')

    // Cancel any existing active special window for same student+date
    await prisma.attendanceWindow.updateMany({
      where: { studentId, date: dateObj, isSpecial: true, windowStatus: 'ACTIVE' },
      data: { windowStatus: 'CANCELLED' },
    })

    const window = await prisma.attendanceWindow.create({
      data: {
        date:             dateObj,
        startTime,
        endTime,
        isDefault:        false,
        isSpecial:        true,
        reason,
        approvedBy:       warden.name,
        approvedAt:       new Date(),
        windowStatus:     'ACTIVE',
        approvedLocation: (approvedLocation as 'HOSTEL_CAMPUS' | 'COLLEGE_CAMPUS') ?? 'HOSTEL_CAMPUS',
        studentId,
      },
    })

    // Notify student
    const locLabel = approvedLocation === 'COLLEGE_CAMPUS' ? 'College Campus' : 'Hostel'
    await prisma.notification.create({
      data: {
        studentId: student.id,
        type:    'ATTENDANCE_UPDATED',
        title:   'Special Attendance Access',
        message: `Warden has granted you special attendance from ${startTime} to ${endTime} IST on ${date} at ${locLabel}. Reason: ${reason}`,
      },
    })

    res.status(201).json({ success: true, data: window })
  } catch (err) { next(err) }
}

export async function cancelSpecialWindow(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params
    const window = await prisma.attendanceWindow.findUnique({ where: { id } })
    if (!window) { next(createError('Window not found.', 404)); return }

    await prisma.attendanceWindow.update({
      where: { id },
      data: { windowStatus: 'CANCELLED' },
    })
    res.json({ success: true, message: 'Special window cancelled.' })
  } catch (err) { next(err) }
}

// ═══ ANNOUNCEMENTS ════════════════════════════════════════════════════════════

export async function getAnnouncements(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    res.json({ success: true, data: announcements })
  } catch (err) { next(err) }
}

export async function createAnnouncement(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { title, message } = req.body as { title?: string; message?: string }
    if (!title?.trim() || !message?.trim()) {
      next(createError('title and message are required.', 422)); return
    }

    const warden = await resolveWarden(req.user!.userId)

    const announcement = await prisma.announcement.create({
      data: {
        title:     title.trim(),
        message:   message.trim(),
        wardenId:  req.user!.userId,
        createdBy: warden.name,
        isActive:  true,
      },
    })

    // Broadcast to ALL active students as notifications
    const students = await prisma.student.findMany({
      where: { isActive: true },
      select: { id: true },
    })

    if (students.length > 0) {
      await prisma.notification.createMany({
        data: students.map(s => ({
          studentId: s.id,
          type:      'IMPORTANT_NOTICE' as const,
          title:     title.trim(),
          message:   message.trim(),
          isRead:    false,
        })),
      })
    }

    res.status(201).json({ success: true, data: announcement })
  } catch (err) { next(err) }
}

export async function deleteAnnouncement(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params
    const ann = await prisma.announcement.findUnique({ where: { id } })
    if (!ann) { next(createError('Announcement not found.', 404)); return }

    await prisma.announcement.update({ where: { id }, data: { isActive: false } })
    res.json({ success: true, message: 'Announcement removed.' })
  } catch (err) { next(err) }
}

// ═══ EMERGENCY CONTACTS ═══════════════════════════════════════════════════════

export async function getEmergencyContacts(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const contacts = await prisma.emergencyContact.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    res.json({ success: true, data: contacts })
  } catch (err) { next(err) }
}

export async function upsertEmergencyContact(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params
    const { name, designation, phone, email, category, sortOrder } =
      req.body as { name: string; designation: string; phone: string; email?: string; category?: string; sortOrder?: number }

    if (!name || !designation || !phone) {
      next(createError('name, designation and phone are required.', 422)); return
    }

    const data = {
      name, designation, phone,
      email:     email     ?? null,
      category:  category  ?? 'General',
      sortOrder: sortOrder ?? 0,
    }

    let contact
    if (id) {
      contact = await prisma.emergencyContact.update({ where: { id }, data })
    } else {
      contact = await prisma.emergencyContact.create({ data: { ...data, isActive: true } })
    }

    res.json({ success: true, data: contact })
  } catch (err) { next(err) }
}

export async function deleteEmergencyContact(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params
    await prisma.emergencyContact.update({ where: { id }, data: { isActive: false } })
    res.json({ success: true, message: 'Contact removed.' })
  } catch (err) { next(err) }
}

// ═══ WARDEN PROFILE ═══════════════════════════════════════════════════════════

export async function getWardenProfile(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const warden = await prisma.warden.findUnique({
      where: { userId: req.user!.userId },
      include: { user: { select: { usn: true, lastLoginAt: true } } },
    })
    if (!warden) { next(createError('Warden not found.', 404)); return }
    res.json({ success: true, data: warden })
  } catch (err) { next(err) }
}

// ═══ ATTENDANCE WINDOWS (default window management) ═══════════════════════════

export async function getDefaultWindows(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const windows = await prisma.attendanceWindow.findMany({
      where: { isDefault: true, studentId: null },
      orderBy: { date: 'desc' },
      take: 30,
    })
    res.json({ success: true, data: windows })
  } catch (err) { next(err) }
}

export async function createDefaultWindow(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { date, startTime, endTime } = req.body as { date: string; startTime: string; endTime: string }
    if (!date || !startTime || !endTime) {
      next(createError('date, startTime and endTime are required.', 422)); return
    }
    const dateObj = new Date(date + 'T00:00:00.000Z')
    // Cancel existing default for same date
    await prisma.attendanceWindow.updateMany({
      where: { date: dateObj, isDefault: true, studentId: null },
      data: { windowStatus: 'CANCELLED' },
    })
    const window = await prisma.attendanceWindow.create({
      data: {
        date: dateObj, startTime, endTime,
        isDefault: true, isSpecial: false,
        windowStatus: 'ACTIVE',
        approvedLocation: 'HOSTEL_CAMPUS',
      },
    })
    res.status(201).json({ success: true, data: window })
  } catch (err) { next(err) }
}

export async function autoCreateTodayWindow(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { dateStr } = getISTNowHelper()
    const dateObj = new Date(dateStr + 'T00:00:00.000Z')
    const existing = await prisma.attendanceWindow.findFirst({
      where: { date: dateObj, isDefault: true, studentId: null, windowStatus: 'ACTIVE' },
    })
    if (existing) { res.json({ success: true, data: existing, created: false }); return }
    const window = await prisma.attendanceWindow.create({
      data: {
        date: dateObj, startTime: '20:30', endTime: '20:40',
        isDefault: true, isSpecial: false,
        windowStatus: 'ACTIVE', approvedLocation: 'HOSTEL_CAMPUS',
      },
    })
    res.status(201).json({ success: true, data: window, created: true })
  } catch (err) { next(err) }
}

function getISTNowHelper() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  return { dateStr: ist.toISOString().slice(0, 10) }
}

// ═══ CHANGE PASSWORD ══════════════════════════════════════════════════════════

import argon2 from 'argon2'

export async function changeWardenPassword(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string }
    if (!currentPassword || !newPassword) {
      next(createError('currentPassword and newPassword are required.', 422)); return
    }
    if (newPassword.length < 8) {
      next(createError('New password must be at least 8 characters.', 422)); return
    }
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user) { next(createError('User not found.', 404)); return }
    const valid = await argon2.verify(user.passwordHash, currentPassword)
    if (!valid) { next(createError('Current password is incorrect.', 401)); return }
    const hash = await argon2.hash(newPassword, { type: argon2.argon2id })
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } })
    res.json({ success: true, message: 'Password changed successfully.' })
  } catch (err) { next(err) }
}

// ═══ STUDENT STATUS MANAGEMENT ════════════════════════════════════════════════

export async function updateStudentStatus(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params
    const { status, isActive } = req.body as { status?: string; isActive?: boolean }
    const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'GRADUATED']
    if (status && !validStatuses.includes(status)) {
      next(createError('Invalid status.', 422)); return
    }
    const student = await prisma.student.findUnique({ where: { id } })
    if (!student) { next(createError('Student not found.', 404)); return }
    const updated = await prisma.student.update({
      where: { id },
      data: {
        ...(status ? { status: status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'GRADUATED' } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    })
    if (isActive !== undefined) {
      await prisma.user.update({ where: { id: student.userId }, data: { isActive } })
    }
    res.json({ success: true, data: { id: updated.id, status: updated.status, isActive: updated.isActive } })
  } catch (err) { next(err) }
}

// ═══ FEE OVERVIEW ═════════════════════════════════════════════════════════════

export async function getFeeOverview(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } })
    if (!currentYear) { res.json({ success: true, data: { fees: [], summary: null } }); return }

    const fees = await prisma.fee.findMany({
      where: { academicYearId: currentYear.id },
      include: {
        student: {
          include: {
            user: { select: { usn: true } },
            allocations: {
              where: { status: 'ACTIVE' },
              include: { room: { include: { floor: true } } },
              take: 1,
            },
          },
        },
      },
      orderBy: { student: { name: 'asc' } },
    })

    const totalAmount  = fees.reduce((s, f) => s + f.totalAmount, 0)
    const totalPaid    = fees.reduce((s, f) => s + f.paidAmount,  0)
    const totalPending = totalAmount - totalPaid
    const fullyPaid    = fees.filter(f => f.paidAmount >= f.totalAmount).length
    const hasPending   = fees.filter(f => f.paidAmount < f.totalAmount).length

    res.json({
      success: true,
      data: {
        academicYear: currentYear.label,
        summary: { totalAmount, totalPaid, totalPending, fullyPaid, hasPending, total: fees.length },
        fees: fees.map(f => {
          const alloc = f.student.allocations[0]
          return {
            id:            f.id,
            totalAmount:   f.totalAmount,
            paidAmount:    f.paidAmount,
            pendingAmount: f.totalAmount - f.paidAmount,
            dueDate:       f.dueDate,
            status:        f.paidAmount >= f.totalAmount ? 'PAID' : 'PENDING',
            student: {
              id:   f.student.id,
              name: f.student.name,
              usn:  f.student.user.usn,
              floor: alloc?.room.floor.floorNumber ?? '—',
              room:  alloc?.room.roomNumber        ?? '—',
            },
          }
        }),
      },
    })
  } catch (err) { next(err) }
}

// ═══ NOTICES MANAGEMENT ═══════════════════════════════════════════════════════

export async function getNotices(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const notices = await prisma.notice.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    res.json({ success: true, data: notices })
  } catch (err) { next(err) }
}

export async function createNotice(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { title, description, category, priority } =
      req.body as { title: string; description: string; category?: string; priority?: string }
    if (!title?.trim() || !description?.trim()) {
      next(createError('title and description are required.', 422)); return
    }
    const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } })
    const notice = await prisma.notice.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        category: category ?? 'General',
        priority: (priority ?? 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
        isActive: true,
        academicYearId: currentYear?.id ?? null,
      },
    })

    // ── Broadcast notification to ALL active students ──────────────────────
    const students = await prisma.student.findMany({
      where: { isActive: true },
      select: { id: true },
    })
    if (students.length > 0) {
      await prisma.notification.createMany({
        data: students.map(s => ({
          studentId: s.id,
          type:      'IMPORTANT_NOTICE' as const,
          title:     `Notice: ${title.trim()}`,
          message:   description.trim(),
          isRead:    false,
        })),
      })
    }

    res.status(201).json({ success: true, data: notice })
  } catch (err) { next(err) }
}

export async function updateNotice(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params
    const { title, description, category, priority } =
      req.body as { title?: string; description?: string; category?: string; priority?: string }
    const notice = await prisma.notice.findUnique({ where: { id } })
    if (!notice) { next(createError('Notice not found.', 404)); return }
    const updated = await prisma.notice.update({
      where: { id },
      data: {
        ...(title       ? { title: title.trim() }           : {}),
        ...(description ? { description: description.trim() } : {}),
        ...(category    ? { category }                      : {}),
        ...(priority    ? { priority: priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' } : {}),
      },
    })
    res.json({ success: true, data: updated })
  } catch (err) { next(err) }
}

export async function deleteNotice(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params
    await prisma.notice.update({ where: { id }, data: { isActive: false } })
    res.json({ success: true, message: 'Notice removed.' })
  } catch (err) { next(err) }
}

// ═══ ENTRY/EXIT RECORDS ═══════════════════════════════════════════════════════

export async function getEntryExitRecords(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { date, search } = req.query as Record<string, string>
    const dateStr = date ?? getISTDateStr()
    const todayDate = new Date(dateStr + 'T00:00:00.000Z')

    const where: Record<string, unknown> = { date: todayDate }
    if (search) {
      where.student = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { user: { usn: { contains: search, mode: 'insensitive' } } },
        ],
      }
    }

    const records = await prisma.entryExitRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        student: {
          include: {
            user: { select: { usn: true } },
            allocations: {
              where: { status: 'ACTIVE' },
              include: { room: { include: { floor: true } } },
              take: 1,
            },
          },
        },
      },
    })

    res.json({
      success: true,
      data: {
        date: dateStr,
        records: records.map(r => {
          const alloc = r.student.allocations[0]
          return {
            id:        r.id,
            date:      r.date,
            entryTime: r.entryTime,
            exitTime:  r.exitTime,
            status:    r.status,
            note:      r.note,
            student: {
              id:    r.student.id,
              name:  r.student.name,
              usn:   r.student.user.usn,
              floor: alloc?.room.floor.floorNumber ?? '—',
              room:  alloc?.room.roomNumber        ?? '—',
            },
          }
        }),
      },
    })
  } catch (err) { next(err) }
}
