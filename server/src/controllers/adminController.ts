import { Request, Response, NextFunction } from 'express'
import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/prisma'
import { env } from '../config/env'
import { createError } from '../middleware/errorHandler'
import type { AuthRequest } from '../types'

function getISTDateStr() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  return ist.toISOString().slice(0, 10)
}

function signToken(payload: { userId: string; usn: string; role: string }) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] })
}

// ═══ AUTH ════════════════════════════════════════════════════════════════════

export async function adminLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { adminId, password } = req.body as { adminId: string; password: string }
    if (!adminId?.trim() || !password) { next(createError('Admin ID and password required.', 422)); return }

    const normId = adminId.trim().toUpperCase()
    const user = await prisma.user.findUnique({ where: { usn: normId } })
    if (!user || user.role !== 'ADMIN' || !user.isActive) {
      next(createError('Invalid Admin ID or password.', 401)); return
    }
    const valid = await argon2.verify(user.passwordHash, password)
    if (!valid) { next(createError('Invalid Admin ID or password.', 401)); return }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    const token = signToken({ userId: user.id, usn: user.usn, role: user.role })

    res.json({
      success: true,
      data: {
        token,
        admin: { id: user.id, adminId: user.usn, name: 'Admin', role: user.role },
      },
    })
  } catch (err) { next(err) }
}

// ═══ DASHBOARD STATS ════════════════════════════════════════════════════════

export async function getDashboardStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const today = new Date(getISTDateStr() + 'T00:00:00.000Z')

    const [
      totalStudents, activeStudents,
      totalRooms, totalFloors,
      todayPresent, pendingRequests,
      openProblems, pendingFees,
      recentNotices,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { isActive: true } }),
      prisma.room.count(),
      prisma.floor.count(),
      prisma.attendance.count({ where: { date: today, status: { in: ['PRESENT', 'LATE_PRESENT'] } } }),
      prisma.request.count({ where: { status: 'PENDING' } }),
      prisma.problem.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
      prisma.fee.count(),   // all fee records — pending logic done via amount comparison
      prisma.notice.findMany({
        where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, title: true, priority: true, createdAt: true },
      }),
    ])

    const attendancePct = activeStudents > 0 ? Math.round((todayPresent / activeStudents) * 100) : 0

    res.json({
      success: true,
      data: {
        totalStudents, activeStudents, totalRooms, totalFloors,
        todayPresent, attendancePct,
        pendingRequests, openProblems, pendingFees,
        recentNotices,
      },
    })
  } catch (err) { next(err) }
}

// ═══ STUDENTS ════════════════════════════════════════════════════════════════

export async function getStudents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page   = Math.max(1, parseInt(String(req.query.page  ?? '1')))
    const limit  = Math.min(100, parseInt(String(req.query.limit ?? '20')))
    const skip   = (page - 1) * limit
    const search = (req.query.search as string | undefined)?.trim()
    const status = req.query.status as string | undefined

    const where: Record<string, unknown> = {}
    if (status === 'active')   where.isActive = true
    if (status === 'inactive') where.isActive = false
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { user: { usn: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where, skip, take: limit,
        orderBy: { name: 'asc' },
        include: {
          user:  { select: { usn: true, isActive: true, lastLoginAt: true } },
          room:  { include: { floor: true } },
          allocations: {
            where: { status: 'ACTIVE' }, take: 1, orderBy: { allocatedAt: 'desc' },
            include: { room: { include: { floor: true } } },
          },
          academicHistory: {
            take: 1, orderBy: { createdAt: 'desc' },
            include: { academicYear: { select: { label: true } } },
          },
        },
      }),
      prisma.student.count({ where }),
    ])

    const data = students.map(s => {
      const room = s.allocations[0]?.room ?? s.room
      const hist = s.academicHistory[0]
      return {
        id: s.id, name: s.name,
        usn: s.user.usn,
        isActive: s.isActive,
        floor: room?.floor?.floorNumber ?? '—',
        room:  room?.roomNumber ?? '—',
        year:         hist?.yearLabel      ?? '—',
        semester:     hist?.semesterLabel  ?? '—',
        academicYear: hist?.academicYear?.label ?? '—',
        lastLogin: s.user.lastLoginAt ?? null,
        createdAt: s.createdAt,
      }
    })

    res.json({ success: true, data: { students: data, total, page, pageSize: limit } })
  } catch (err) { next(err) }
}

export async function updateStudentStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const { isActive } = req.body as { isActive: boolean }
    const student = await prisma.student.findUnique({ where: { id }, include: { user: true } })
    if (!student) { next(createError('Student not found.', 404)); return }
    await prisma.$transaction([
      prisma.student.update({ where: { id }, data: { isActive } }),
      prisma.user.update({ where: { id: student.userId }, data: { isActive } }),
    ])
    res.json({ success: true, message: `Student ${isActive ? 'activated' : 'deactivated'}.` })
  } catch (err) { next(err) }
}

// ═══ ATTENDANCE ══════════════════════════════════════════════════════════════

export async function getDailyAttendance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const dateStr = (req.query.date as string) || getISTDateStr()
    const dateObj = new Date(dateStr + 'T00:00:00.000Z')

    const [students, records] = await Promise.all([
      prisma.student.findMany({
        where: { isActive: true },
        include: {
          user: { select: { usn: true } },
          room: { include: { floor: true } },
          allocations: {
            where: { status: 'ACTIVE' }, take: 1, orderBy: { allocatedAt: 'desc' },
            include: { room: { include: { floor: true } } },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.attendance.findMany({
        where: { date: dateObj },
        select: { studentId: true, status: true, markedAt: true, locationType: true, distanceFromHostel: true },
      }),
    ])

    const recordMap = new Map(records.map(r => [r.studentId, r]))
    const data = students.map(s => {
      const room = s.allocations[0]?.room ?? s.room
      const record = recordMap.get(s.id)
      return {
        id: s.id, name: s.name, usn: s.user.usn,
        floor: room?.floor?.floorNumber ?? '—',
        room:  room?.roomNumber ?? '—',
        status:       record?.status       ?? 'NOT_SUBMITTED',
        markedAt:     record?.markedAt     ?? null,
        locationType: record?.locationType ?? null,
        distance:     record?.distanceFromHostel ?? null,
      }
    })

    const summary = {
      total: data.length,
      present:      data.filter(d => d.status === 'PRESENT' || d.status === 'LATE_PRESENT').length,
      absent:       data.filter(d => d.status === 'ABSENT').length,
      notSubmitted: data.filter(d => d.status === 'NOT_SUBMITTED').length,
    }

    res.json({ success: true, data: { date: dateStr, summary, students: data } })
  } catch (err) { next(err) }
}

// ═══ NOTICES ════════════════════════════════════════════════════════════════

export async function getNotices(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const notices = await prisma.notice.findMany({
      where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 100,
    })
    res.json({ success: true, data: notices })
  } catch (err) { next(err) }
}

export async function createNotice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, description, category, priority } =
      req.body as { title: string; description: string; category?: string; priority?: string }
    if (!title?.trim() || !description?.trim()) {
      next(createError('Title and description required.', 422)); return
    }
    const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } })
    const notice = await prisma.notice.create({
      data: {
        title: title.trim(), description: description.trim(),
        category: category ?? 'General',
        priority: (priority ?? 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
        isActive: true, academicYearId: currentYear?.id ?? null,
      },
    })
    // Broadcast to all active students
    const students = await prisma.student.findMany({ where: { isActive: true }, select: { id: true } })
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

export async function deleteNotice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.notice.update({ where: { id: req.params.id }, data: { isActive: false } })
    res.json({ success: true, message: 'Notice removed.' })
  } catch (err) { next(err) }
}

// ═══ NOTIFICATIONS ══════════════════════════════════════════════════════════

export async function sendGlobalNotification(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, message } = req.body as { title: string; message: string }
    if (!title?.trim() || !message?.trim()) {
      next(createError('Title and message required.', 422)); return
    }
    // Broadcast to all active students
    const students = await prisma.student.findMany({ where: { isActive: true }, select: { id: true } })
    let count = students.length
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
    res.json({ success: true, message: `Notification sent to ${count} students.`, data: { count } })
  } catch (err) { next(err) }
}

export async function getNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' }, take: 200,
      include: { student: { select: { name: true, user: { select: { usn: true } } } } },
    })
    res.json({ success: true, data: notifications })
  } catch (err) { next(err) }
}

// ═══ ROOMS / FLOORS ════════════════════════════════════════════════════════

export async function getFloorsRooms(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const floors = await prisma.floor.findMany({
      orderBy: { floorNumber: 'asc' },
      include: {
        rooms: {
          orderBy: { roomNumber: 'asc' },
          include: {
            allocations: {
              where: { status: 'ACTIVE' },
              include: { student: { select: { id: true, name: true, user: { select: { usn: true } } } } },
            },
          },
        },
      },
    })

    const data = floors.map(f => ({
      id: f.id,
      floorNumber: f.floorNumber,
      floorName:   f.floorNumber,   // alias — schema has no floorName field
      rooms: f.rooms.map(r => ({
        id:         r.id,
        roomNumber: r.roomNumber,
        capacity:   r.capacity,
        occupied:   r.allocations.length,
        available:  r.capacity - r.allocations.length,
        occupants:  r.allocations.map(a => ({ id: a.student.id, name: a.student.name, usn: a.student.user.usn })),
      })),
    }))

    res.json({ success: true, data })
  } catch (err) { next(err) }
}

// ═══ PROFILE ════════════════════════════════════════════════════════════════

export async function getAdminProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user) { next(createError('Not found.', 404)); return }
    res.json({
      success: true,
      data: { adminId: user.usn, name: 'Admin', role: user.role, lastLoginAt: user.lastLoginAt },
    })
  } catch (err) { next(err) }
}

export async function changeAdminPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string }
    if (!currentPassword || !newPassword) { next(createError('Both fields required.', 422)); return }
    if (newPassword.length < 8) { next(createError('Password must be at least 8 characters.', 422)); return }
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user) { next(createError('Not found.', 404)); return }
    const argon2 = await import('argon2')
    const valid = await argon2.verify(user.passwordHash, currentPassword)
    if (!valid) { next(createError('Current password is incorrect.', 401)); return }
    const hash = await argon2.hash(newPassword, { type: argon2.argon2id })
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } })
    res.json({ success: true, message: 'Password changed successfully.' })
  } catch (err) { next(err) }
}

// ═══ STAFF LIST (for notice targeting) ══════════════════════════════════════

export async function getStaffList(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const [wardens, watchmen, overseers] = await Promise.all([
      prisma.warden.findMany({ where: { isActive: true }, select: { id: true, name: true, user: { select: { usn: true } } } }),
      prisma.watchman.findMany({ where: { isActive: true }, select: { id: true, name: true, user: { select: { usn: true } } } }),
      prisma.overseer.findMany({ where: { isActive: true }, select: { id: true, name: true, user: { select: { usn: true } } } }),
    ])
    res.json({
      success: true,
      data: {
        wardens:   wardens.map(w => ({ id: w.id, name: w.name, usn: w.user.usn, role: 'WARDEN' })),
        watchmen:  watchmen.map(w => ({ id: w.id, name: w.name, usn: w.user.usn, role: 'WATCHMAN' })),
        overseers: overseers.map(o => ({ id: o.id, name: o.name, usn: o.user.usn, role: 'OVERSEER' })),
      },
    })
  } catch (err) { next(err) }
}

// ═══ BROADCAST TO WARDENS ════════════════════════════════════════════════════

export async function sendWardenNotification(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, message } = req.body as { title: string; message: string }
    if (!title?.trim() || !message?.trim()) {
      next(createError('Title and message required.', 422)); return
    }
    // Find all active warden users
    const wardenUsers = await prisma.user.findMany({
      where: { role: 'WARDEN', isActive: true },
      include: { warden: { select: { id: true } } },
    })
    // Store as a notice so wardens see it in their notices section
    const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } })
    await prisma.notice.create({
      data: {
        title:         title.trim(),
        description:   message.trim(),
        category:      'General',
        priority:      'HIGH',
        isActive:      true,
        academicYearId: currentYear?.id ?? null,
      },
    })
    res.json({
      success: true,
      message: `Notification sent to ${wardenUsers.length} warden(s).`,
      data: { count: wardenUsers.length },
    })
  } catch (err) { next(err) }
}

// ═══ STUDENT DETAIL (for rooms modal) ═══════════════════════════════════════

export async function getStudentDetail(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: { select: { usn: true } },
        room: { include: { floor: true } },
        allocations: {
          where: { status: 'ACTIVE' }, take: 1, orderBy: { allocatedAt: 'desc' },
          include: { room: { include: { floor: true } } },
        },
        academicHistory: {
          take: 1, orderBy: { createdAt: 'desc' },
          include: { academicYear: { select: { label: true } } },
        },
        fees: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    })
    if (!student) { next(createError('Student not found.', 404)); return }

    const room = student.allocations[0]?.room ?? student.room
    const hist = student.academicHistory[0]
    const fee  = student.fees[0]

    res.json({
      success: true,
      data: {
        id:          student.id,
        name:        student.name,
        usn:         student.user.usn,
        photoUrl:    student.photoUrl ?? null,
        floor:       room?.floor?.floorNumber ?? '—',
        room:        room?.roomNumber ?? '—',
        year:        hist?.yearLabel     ?? '—',
        semester:    hist?.semesterLabel ?? '—',
        academicYear: hist?.academicYear?.label ?? '—',
        course:      student.course  ?? null,
        branch:      student.branch  ?? null,
        gender:      student.gender  ?? null,
        phone:       student.phone   ?? null,
        bloodGroup:  student.bloodGroup ?? null,
        fee: fee ? {
          paidAmount:    fee.paidAmount,
          pendingAmount: Math.max(0, fee.totalAmount - fee.paidAmount),
        } : null,
      },
    })
  } catch (err) { next(err) }
}
