import { Response, NextFunction } from 'express'
import { body, validationResult } from 'express-validator'
import { prisma } from '../config/prisma'
import { createError } from '../middleware/errorHandler'
import type { AuthRequest } from '../types'

// ─── Helper ───────────────────────────────────────────────────────────────────

async function resolveStudent(userId: string) {
  const s = await prisma.student.findFirst({
    where: { userId, isActive: true },
    select: {
      id: true,
      name: true,
      user: { select: { usn: true } },
      room: { select: { roomNumber: true, floor: { select: { floorNumber: true } } } },
      allocations: {
        where: { status: 'ACTIVE' },
        select: { room: { select: { roomNumber: true, floor: { select: { floorNumber: true } } } } },
        orderBy: { allocatedAt: 'desc' },
        take: 1,
      },
    },
  })
  if (!s) throw createError('Student not found.', 404)
  // prefer active allocation; fall back to legacy roomId FK
  const room = s.allocations[0]?.room ?? s.room
  return { id: s.id, name: s.name, usn: s.user.usn, floorNumber: room?.floor?.floorNumber ?? '—', roomNumber: room?.roomNumber ?? '—' }
}

// ─── GET /api/requests?page=&limit=&status= ───────────────────────────────────

export async function getRequests(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const student = await resolveStudent(req.user!.userId)
    const page  = Math.max(1, parseInt(String(req.query.page  ?? '1')))
    const limit = Math.min(50, parseInt(String(req.query.limit ?? '20')))
    const skip  = (page - 1) * limit
    const statusFilter = req.query.status as string | undefined

    const where = {
      studentId: student.id,
      ...(statusFilter ? { status: statusFilter as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.request.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.request.count({ where }),
    ])

    res.json({
      success: true,
      data: { data, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) { next(err) }
}

// ─── POST /api/requests ───────────────────────────────────────────────────────

export async function createRequest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.mapped() }); return }

    const student = await resolveStudent(req.user!.userId)
    const { type, fromDate, toDate, reason, destination, additionalDetails } = req.body as {
      type: string; fromDate: string; toDate: string
      reason: string; destination?: string; additionalDetails?: string
    }

    const from = new Date(fromDate)
    const to   = new Date(toDate)
    if (to < from) { next(createError('End date cannot be before start date.', 400)); return }

    // Destination required for GOING_HOME and OUTING
    if ((type === 'GOING_HOME' || type === 'OUTING') && !destination?.trim()) {
      next(createError('Destination is required for Going Home and Outing requests.', 422))
      return
    }

    const record = await prisma.request.create({
      data: {
        studentId: student.id,
        type: type as 'GOING_HOME' | 'OUTING' | 'LEAVE' | 'EMERGENCY_LEAVE' | 'OTHER',
        fromDate: from,
        toDate:   to,
        reason:   reason.trim(),
        destination:       destination?.trim() ?? null,
        additionalDetails: additionalDetails?.trim() ?? null,
        status: 'PENDING',
      },
    })

    res.status(201).json({ success: true, message: 'Request submitted successfully.', data: record })
  } catch (err) { next(err) }
}

// ─── GET /api/requests/:id ────────────────────────────────────────────────────

export async function getRequestById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const student = await resolveStudent(req.user!.userId)
    const record = await prisma.request.findFirst({
      where: { id: req.params.id, studentId: student.id },
    })
    if (!record) { next(createError('Request not found.', 404)); return }
    res.json({ success: true, data: record })
  } catch (err) { next(err) }
}

// ─── PATCH /api/requests/:id/cancel ──────────────────────────────────────────
// Student can cancel their own PENDING request.

export async function cancelRequest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const student = await resolveStudent(req.user!.userId)
    const record = await prisma.request.findFirst({
      where: { id: req.params.id, studentId: student.id },
    })
    if (!record) { next(createError('Request not found.', 404)); return }
    if (record.status !== 'PENDING') {
      next(createError(`Cannot cancel a request that is already ${record.status.toLowerCase()}.`, 400))
      return
    }
    const updated = await prisma.request.update({
      where: { id: record.id },
      data: { status: 'CANCELLED', updatedAt: new Date() },
    })
    res.json({ success: true, message: 'Request cancelled.', data: updated })
  } catch (err) { next(err) }
}

// ─── GET /api/requests/student-info ──────────────────────────────────────────
// Returns the student's identity fields for pre-filling the form.

export async function getStudentInfo(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const student = await resolveStudent(req.user!.userId)
    res.json({
      success: true,
      data: {
        name: student.name,
        usn:  student.usn,
        floorNumber: student.floorNumber,
        roomNumber:  student.roomNumber,
      },
    })
  } catch (err) { next(err) }
}

// ─── Validators ───────────────────────────────────────────────────────────────

export const createRequestValidators = [
  body('type')
    .isIn(['GOING_HOME', 'OUTING', 'LEAVE', 'EMERGENCY_LEAVE', 'OTHER'])
    .withMessage('Invalid request type.'),
  body('fromDate')
    .isISO8601().withMessage('Start date must be a valid date.'),
  body('toDate')
    .isISO8601().withMessage('End date must be a valid date.'),
  body('reason')
    .trim().isLength({ min: 5, max: 500 })
    .withMessage('Reason must be 5–500 characters.'),
  body('destination')
    .optional({ checkFalsy: true }).trim().isLength({ max: 200 })
    .withMessage('Destination too long.'),
  body('additionalDetails')
    .optional({ checkFalsy: true }).trim().isLength({ max: 1000 })
    .withMessage('Additional details too long.'),
]
