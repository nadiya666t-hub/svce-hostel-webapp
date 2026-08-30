import { Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { createError } from '../middleware/errorHandler'
import type { AuthRequest } from '../types'

async function resolveWatchman(userId: string) {
  const w = await prisma.watchman.findFirst({ where: { userId, isActive: true } })
  if (!w) throw createError('Watchman record not found.', 404)
  return w
}

function todayStart() {
  const d = new Date(); d.setHours(0,0,0,0); return d
}
function todayEnd() {
  const d = new Date(); d.setHours(23,59,59,999); return d
}

// ── GET /api/watchman/dashboard/stats ────────────────────────────────────────
export async function getDashboardStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await resolveWatchman(req.user!.userId)
    const start = todayStart()
    const end   = todayEnd()

    const [totalToday, lateToday, visitorsToday, pendingPerms, insideNow, approvedToday, rejectedToday] = await Promise.all([
      prisma.visitorEntry.count({ where: { entryTime: { gte: start, lte: end } } }),
      prisma.lateEntry.count({ where: { date: { gte: start, lte: end } } }),
      prisma.visitorEntry.count({ where: { entryTime: { gte: start, lte: end } } }),
      prisma.visitorEntry.count({ where: { permissionStatus: 'PENDING' } }),
      prisma.visitorEntry.count({ where: { entryStatus: 'INSIDE' } }),
      prisma.visitorEntry.count({ where: { permissionStatus: 'APPROVED', entryTime: { gte: start, lte: end } } }),
      prisma.visitorEntry.count({ where: { permissionStatus: 'REJECTED', entryTime: { gte: start, lte: end } } }),
    ])

    res.json({
      success: true,
      data: { totalToday, lateToday, visitorsToday, pendingPerms, insideNow, approvedToday, rejectedToday },
    })
  } catch (err) { next(err) }
}

// ── GET /api/watchman/visitors ────────────────────────────────────────────────
export async function getVisitors(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await resolveWatchman(req.user!.userId)
    const page  = Math.max(1, parseInt(String(req.query.page ?? '1')))
    const limit = Math.min(50, parseInt(String(req.query.limit ?? '20')))
    const skip  = (page - 1) * limit
    const status = req.query.status as string | undefined
    const date   = req.query.date as string | undefined

    const where: Record<string, unknown> = {}
    if (status) where.permissionStatus = status
    if (date) {
      const d = new Date(date); d.setHours(0,0,0,0)
      const d2 = new Date(date); d2.setHours(23,59,59,999)
      where.entryTime = { gte: d, lte: d2 }
    }

    const [entries, total] = await Promise.all([
      prisma.visitorEntry.findMany({
        where, skip, take: limit,
        orderBy: { entryTime: 'desc' },
        include: {
          visitor: true,
          student: { include: { room: { include: { floor: true } }, user: { select: { usn: true } } } },
        },
      }),
      prisma.visitorEntry.count({ where }),
    ])

    res.json({
      success: true,
      data: {
        data: entries.map(e => ({
          id:               e.id,
          visitorName:      e.visitor.visitorName,
          phone:            e.visitor.phone,
          relationship:     e.visitor.relationship,
          purpose:          e.visitor.purpose,
          studentName:      e.student.name,
          studentUsn:       e.student.user.usn,
          roomNumber:       e.student.room?.roomNumber ?? '—',
          floor:            e.student.room?.floor?.floorNumber ?? '—',
          entryTime:        e.entryTime,
          expectedExitTime: e.expectedExitTime,
          exitTime:         e.exitTime,
          entryStatus:      e.entryStatus,
          permissionStatus: e.permissionStatus,
          approvedBy:       e.approvedBy,
          approvedAt:       e.approvedAt,
          remarks:          e.remarks,
          createdAt:        e.createdAt,
        })),
        total, page, pageSize: limit,
      },
    })
  } catch (err) { next(err) }
}

// ── POST /api/watchman/visitors ───────────────────────────────────────────────
export async function recordVisitor(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const watchman = await resolveWatchman(req.user!.userId)
    const { visitorName, phone, relationship, purpose, studentUsn, expectedExitTime, remarks } =
      req.body as {
        visitorName: string; phone?: string; relationship?: string; purpose?: string
        studentUsn: string; expectedExitTime?: string; remarks?: string
      }

    if (!visitorName?.trim()) { next(createError('Visitor name is required.', 422)); return }
    if (!studentUsn?.trim())  { next(createError('Student USN is required.', 422)); return }

    const student = await prisma.student.findFirst({
      where: { user: { usn: studentUsn.trim().toUpperCase() } },
      include: { user: { select: { usn: true } } },
    })
    if (!student) { next(createError('Student not found.', 404)); return }

    const visitor = await prisma.visitor.create({
      data: {
        visitorName: visitorName.trim(),
        phone:       phone?.trim()        ?? null,
        relationship:relationship?.trim() ?? null,
        purpose:     purpose?.trim()      ?? null,
      },
    })

    const entry = await prisma.visitorEntry.create({
      data: {
        visitorId:        visitor.id,
        studentId:        student.id,
        entryTime:        new Date(),
        expectedExitTime: expectedExitTime ? new Date(expectedExitTime) : null,
        permissionStatus: 'PENDING',
        entryStatus:      'INSIDE',
        remarks:          remarks?.trim() ?? null,
        recordedById:     watchman.id,
      },
    })

    res.status(201).json({ success: true, message: 'Visitor recorded.', data: { entryId: entry.id } })
  } catch (err) { next(err) }
}

// ── PATCH /api/watchman/visitors/:id/exit ────────────────────────────────────
export async function markVisitorExit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await resolveWatchman(req.user!.userId)
    const entry = await prisma.visitorEntry.findUnique({ where: { id: req.params.id } })
    if (!entry) { next(createError('Visitor entry not found.', 404)); return }

    const updated = await prisma.visitorEntry.update({
      where: { id: entry.id },
      data: { exitTime: new Date(), entryStatus: 'EXITED' },
    })
    res.json({ success: true, message: 'Exit recorded.', data: { exitTime: updated.exitTime } })
  } catch (err) { next(err) }
}

// ── PATCH /api/watchman/visitors/:id/permission ──────────────────────────────
export async function updatePermission(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await resolveWatchman(req.user!.userId)
    const { status, approvedBy, remarks } = req.body as {
      status: 'APPROVED' | 'REJECTED'; approvedBy?: string; remarks?: string
    }
    if (!['APPROVED','REJECTED'].includes(status)) { next(createError('Invalid status.', 422)); return }

    const updated = await prisma.visitorEntry.update({
      where: { id: req.params.id },
      data: {
        permissionStatus: status,
        approvedBy:       approvedBy?.trim() ?? null,
        approvedAt:       new Date(),
        remarks:          remarks?.trim()    ?? null,
      },
    })
    res.json({ success: true, data: { permissionStatus: updated.permissionStatus } })
  } catch (err) { next(err) }
}

// ── GET /api/watchman/late-entries ────────────────────────────────────────────
export async function getLateEntries(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await resolveWatchman(req.user!.userId)
    const page  = Math.max(1, parseInt(String(req.query.page ?? '1')))
    const limit = Math.min(50, parseInt(String(req.query.limit ?? '20')))
    const skip  = (page - 1) * limit

    const [entries, total] = await Promise.all([
      prisma.lateEntry.findMany({
        skip, take: limit,
        orderBy: { entryTime: 'desc' },
        include: {
          student: { include: { room: { include: { floor: true } }, user: { select: { usn: true } } } },
        },
      }),
      prisma.lateEntry.count(),
    ])

    res.json({
      success: true,
      data: {
        data: entries.map(e => ({
          id:               e.id,
          date:             e.date,
          entryTime:        e.entryTime,
          reason:           e.reason,
          permissionStatus: e.permissionStatus,
          approvedBy:       e.approvedBy,
          approvedAt:       e.approvedAt,
          remarks:          e.remarks,
          studentName:      e.student.name,
          studentUsn:       e.student.user.usn,
          roomNumber:       e.student.room?.roomNumber ?? '—',
          floor:            e.student.room?.floor?.floorNumber ?? '—',
        })),
        total, page, pageSize: limit,
      },
    })
  } catch (err) { next(err) }
}

// ── POST /api/watchman/late-entries ──────────────────────────────────────────
export async function recordLateEntry(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const watchman = await resolveWatchman(req.user!.userId)
    const { studentUsn, reason, remarks } = req.body as {
      studentUsn: string; reason?: string; remarks?: string
    }
    if (!studentUsn?.trim()) { next(createError('Student USN is required.', 422)); return }

    const student = await prisma.student.findFirst({
      where: { user: { usn: studentUsn.trim().toUpperCase() } },
    })
    if (!student) { next(createError('Student not found.', 404)); return }

    const now = new Date()
    const dateOnly = new Date(now.toISOString().split('T')[0] + 'T00:00:00.000Z')

    const entry = await prisma.lateEntry.create({
      data: {
        studentId:        student.id,
        date:             dateOnly,
        entryTime:        now,
        reason:           reason?.trim()  ?? null,
        remarks:          remarks?.trim() ?? null,
        permissionStatus: 'PENDING',
        recordedById:     watchman.id,
      },
    })
    res.status(201).json({ success: true, message: 'Late entry recorded.', data: { id: entry.id } })
  } catch (err) { next(err) }
}

// ── PATCH /api/watchman/late-entries/:id/permission ──────────────────────────
export async function updateLateEntryPermission(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await resolveWatchman(req.user!.userId)
    const { status, approvedBy, remarks } = req.body as {
      status: 'APPROVED'|'REJECTED'; approvedBy?: string; remarks?: string
    }
    if (!['APPROVED','REJECTED'].includes(status)) { next(createError('Invalid status.', 422)); return }

    const updated = await prisma.lateEntry.update({
      where: { id: req.params.id },
      data: {
        permissionStatus: status,
        approvedBy:       approvedBy?.trim() ?? null,
        approvedAt:       new Date(),
        remarks:          remarks?.trim()    ?? null,
      },
    })
    res.json({ success: true, data: { permissionStatus: updated.permissionStatus } })
  } catch (err) { next(err) }
}

// ── GET /api/watchman/profile ─────────────────────────────────────────────────
export async function getWatchmanProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { watchman: true },
    })
    if (!user) { next(createError('Not found.', 404)); return }
    res.json({
      success: true,
      data: {
        watchmanId:  user.usn,
        name:        user.watchman?.name,
        designation: user.watchman?.designation,
        email:       user.watchman?.email,
        phone:       user.watchman?.phone,
        lastLoginAt: user.lastLoginAt,
      },
    })
  } catch (err) { next(err) }
}
