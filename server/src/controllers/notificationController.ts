import { Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { createError } from '../middleware/errorHandler'
import type { AuthRequest } from '../types'

async function resolveStudent(userId: string) {
  const s = await prisma.student.findFirst({ where: { userId, isActive: true }, select: { id: true } })
  if (!s) throw createError('Student not found.', 404)
  return s
}

/** GET /api/notifications?page=&limit=&unread= */
export async function getNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const s = await resolveStudent(req.user!.userId)
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')))
    const limit = Math.min(50, parseInt(String(req.query.limit ?? '20')))
    const skip = (page - 1) * limit
    const unreadOnly = req.query.unread === 'true'

    const where = { studentId: s.id, ...(unreadOnly ? { isRead: false } : {}) }

    const [data, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { studentId: s.id, isRead: false } }),
    ])

    res.json({ success: true, data: { data, total, page, pageSize: limit, totalPages: Math.ceil(total / limit), unreadCount } })
  } catch (err) { next(err) }
}

/** PATCH /api/notifications/:id/read */
export async function markAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const s = await resolveStudent(req.user!.userId)
    const notif = await prisma.notification.findFirst({ where: { id: req.params.id, studentId: s.id } })
    if (!notif) { next(createError('Notification not found.', 404)); return }
    await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } })
    res.json({ success: true, message: 'Marked as read.' })
  } catch (err) { next(err) }
}

/** PATCH /api/notifications/read-all */
export async function markAllAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const s = await resolveStudent(req.user!.userId)
    const { count } = await prisma.notification.updateMany({
      where: { studentId: s.id, isRead: false },
      data: { isRead: true },
    })
    res.json({ success: true, message: `${count} notification(s) marked as read.`, data: { count } })
  } catch (err) { next(err) }
}

/** GET /api/notifications/unread-count */
export async function getUnreadCount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const s = await resolveStudent(req.user!.userId)
    const count = await prisma.notification.count({ where: { studentId: s.id, isRead: false } })
    res.json({ success: true, data: { count } })
  } catch (err) { next(err) }
}
