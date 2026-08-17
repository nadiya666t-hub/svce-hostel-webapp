import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'

/**
 * GET /api/notices?limit=&page=
 */
export async function getNotices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')))
    const limit = Math.min(50, parseInt(String(req.query.limit ?? '10')))
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      prisma.notice.findMany({
        where: { isActive: true },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.notice.count({ where: { isActive: true } }),
    ])

    res.json({
      success: true,
      data: { data, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    next(err)
  }
}
