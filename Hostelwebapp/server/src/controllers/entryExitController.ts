import { Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { createError } from '../middleware/errorHandler'
import type { AuthRequest } from '../types'

async function resolveStudent(userId: string) {
  const s = await prisma.student.findFirst({ where: { userId, isActive: true }, select: { id: true } })
  if (!s) throw createError('Student not found.', 404)
  return s
}

/** GET /api/entry-exit?page=&limit= */
export async function getEntryExitRecords(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const s = await resolveStudent(req.user!.userId)
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')))
    const limit = Math.min(60, parseInt(String(req.query.limit ?? '20')))
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      prisma.entryExitRecord.findMany({
        where: { studentId: s.id },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.entryExitRecord.count({ where: { studentId: s.id } }),
    ])

    res.json({ success: true, data: { data, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) } })
  } catch (err) { next(err) }
}
