import { Response, NextFunction } from 'express'
import { body, validationResult } from 'express-validator'
import { prisma } from '../config/prisma'
import { createError } from '../middleware/errorHandler'
import type { AuthRequest } from '../types'

async function resolveStudentWithRoom(userId: string) {
  const s = await prisma.student.findFirst({
    where: { userId, isActive: true },
    select: {
      id: true,
      // Active allocation first, legacy FK fallback
      allocations: {
        where: { status: 'ACTIVE' },
        select: { room: { select: { roomNumber: true } } },
        orderBy: { allocatedAt: 'desc' },
        take: 1,
      },
      room: { select: { roomNumber: true } },
    },
  })
  if (!s) throw createError('Student not found.', 404)

  // Prefer active allocation; fall back to legacy FK
  const roomNumber =
    s.allocations[0]?.room?.roomNumber ??
    s.room?.roomNumber ??
    '—'

  return { id: s.id, room: { roomNumber } }
}

/** GET /api/problems?page=&limit=&status= */
export async function getProblems(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const s = await resolveStudentWithRoom(req.user!.userId)
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')))
    const limit = Math.min(50, parseInt(String(req.query.limit ?? '10')))
    const skip = (page - 1) * limit
    const statusFilter = req.query.status as string | undefined

    const where = {
      studentId: s.id,
      ...(statusFilter ? { status: statusFilter as 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.problem.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.problem.count({ where }),
    ])

    res.json({ success: true, data: { data, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) } })
  } catch (err) { next(err) }
}

/** POST /api/problems  (multipart — optional photo) */
export async function createProblem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.mapped() }); return }

    const s = await resolveStudentWithRoom(req.user!.userId)
    const { category, description } = req.body as { category: string; description: string }

    const photoFile = (req as AuthRequest & { file?: Express.Multer.File }).file
    const photoUrl = photoFile ? `/uploads/problems/${photoFile.filename}` : null

    const record = await prisma.problem.create({
      data: {
        studentId: s.id,
        category: category as 'NO_WATER'|'ELECTRICITY'|'CLEANING'|'PLUMBING'|'FURNITURE'|'WIFI'|'OTHER',
        description,
        photoUrl,
        roomNumber: s.room.roomNumber,
        status: 'PENDING',
      },
    })

    // Auto-create OverseerProblem with 48-hour deadline
    const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000)
    await prisma.overseerProblem.create({
      data: {
        problemId:  record.id,
        status:     'NEW',
        deadlineAt: deadline,
      },
    })

    // Notify Overseer(s)
    const overseers = await prisma.overseer.findMany({ where: { isActive: true }, select: { userId: true } })
    // (Overseer notifications are pull-based — Admin/Warden can view. Student gets confirmation.)
    await prisma.notification.create({
      data: {
        studentId: s.id,
        type:      'PROBLEM_STATUS_CHANGED',
        title:     'Problem Submitted',
        message:   `Your ${category.replace(/_/g,' ').toLowerCase()} problem has been submitted. The Overseer will respond within 48 hours.`,
        isRead:    false,
      },
    })

    res.status(201).json({ success: true, message: 'Problem reported.', data: record })
  } catch (err) { next(err) }
}

/** GET /api/problems/:id */
export async function getProblemById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const s = await resolveStudentWithRoom(req.user!.userId)
    const record = await prisma.problem.findFirst({ where: { id: req.params.id, studentId: s.id } })
    if (!record) { next(createError('Problem not found.', 404)); return }
    res.json({ success: true, data: record })
  } catch (err) { next(err) }
}

export const createProblemValidators = [
  body('category').isIn(['NO_WATER','ELECTRICITY','CLEANING','PLUMBING','FURNITURE','WIFI','OTHER'])
    .withMessage('Invalid category.'),
  body('description').trim().isLength({ min: 5, max: 1000 }).withMessage('Description must be 5–1000 characters.'),
]
