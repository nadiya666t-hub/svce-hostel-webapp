import { Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { createError } from '../middleware/errorHandler'
import type { AuthRequest } from '../types'

async function resolveOverseer(userId: string) {
  const o = await prisma.overseer.findFirst({ where: { userId, isActive: true } })
  if (!o) throw createError('Overseer record not found.', 404)
  return o
}

// ── GET /api/overseer/dashboard/stats ────────────────────────────────────────
export async function getDashboardStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await resolveOverseer(req.user!.userId)
    const now = new Date()
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

    const [total, newProbs, inProgress, resolved, escalated, overdue] = await Promise.all([
      prisma.overseerProblem.count(),
      prisma.overseerProblem.count({ where: { status: 'NEW' } }),
      prisma.overseerProblem.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.overseerProblem.count({ where: { status: 'RESOLVED' } }),
      prisma.overseerProblem.count({ where: { status: 'ESCALATED' } }),
      prisma.overseerProblem.count({
        where: { status: { notIn: ['RESOLVED', 'REJECTED', 'ESCALATED'] }, deadlineAt: { lt: now } },
      }),
    ])

    // Recent 5 problems
    const recent = await prisma.overseerProblem.findMany({
      take: 5, orderBy: { createdAt: 'desc' },
      include: {
        problem: {
          include: {
            student: {
              include: {
                room: { include: { floor: true } },
                allocations: {
                  where: { status: 'ACTIVE' },
                  include: { room: { include: { floor: true } } },
                  take: 1,
                  orderBy: { allocatedAt: 'desc' },
                },
              },
            },
          },
        },
      },
    })

    const now2 = new Date()
    const recentFormatted = recent.map(p => {
      const student = p.problem.student
      const room = student.allocations[0]?.room ?? student.room
      return {
        id:          p.id,
        status:      p.status,
        category:    p.problem.category,
        studentName: student.name,
        roomNumber:  room?.roomNumber ?? p.problem.roomNumber ?? '—',
        floor:       room?.floor?.floorNumber ?? '—',
        createdAt:   p.createdAt,
        isOverdue:   p.deadlineAt < now2 && !['RESOLVED','REJECTED','ESCALATED'].includes(p.status),
      }
    })

    res.json({
      success: true,
      data: { total, new: newProbs, inProgress, resolved, escalated, overdue, recent: recentFormatted },
    })
  } catch (err) { next(err) }
}

// ── GET /api/overseer/problems ───────────────────────────────────────────────
export async function getProblems(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await resolveOverseer(req.user!.userId)
    const page   = Math.max(1, parseInt(String(req.query.page ?? '1')))
    const limit  = Math.min(50, parseInt(String(req.query.limit ?? '20')))
    const skip   = (page - 1) * limit
    const status = req.query.status as string | undefined
    const search = req.query.search as string | undefined

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const [items, total] = await Promise.all([
      prisma.overseerProblem.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip, take: limit,
        include: {
          problem: {
            include: {
              student: {
                include: {
                  user: { select: { usn: true } },
                  room: { include: { floor: true } },
                },
              },
            },
          },
          attachments: true,
          updates: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.overseerProblem.count({ where }),
    ])

    // Filter by search term if provided
    const filtered = search
      ? items.filter(p => {
          const s = p.problem.student
          const q = search.toLowerCase()
          return (
            s.name.toLowerCase().includes(q) ||
            s.user.usn.toLowerCase().includes(q) ||
            p.problem.category.toLowerCase().includes(q) ||
            p.problem.description.toLowerCase().includes(q)
          )
        })
      : items

    const now = new Date()
    const formatted = filtered.map(p => ({
      id:            p.id,
      problemId:     p.problemId,
      status:        p.status,
      category:      p.problem.category,
      description:   p.problem.description,
      roomNumber:    p.problem.student.room?.roomNumber ?? p.problem.roomNumber,
      floor:         p.problem.student.room?.floor?.floorNumber ?? '—',
      studentName:   p.problem.student.name,
      studentUsn:    p.problem.student.user.usn,
      photoUrl:      p.problem.photoUrl,
      attachments:   p.attachments,
      createdAt:     p.createdAt,
      updatedAt:     p.updatedAt,
      deadlineAt:    p.deadlineAt,
      escalatedAt:   p.escalatedAt,
      resolvedAt:    p.resolvedAt,
      acknowledgedAt:p.acknowledgedAt,
      escalationReason: p.escalationReason,
      lastNote:      p.updates[0]?.comment ?? null,
      isOverdue:     p.deadlineAt < now && !['RESOLVED','REJECTED','ESCALATED'].includes(p.status),
      hoursRemaining:Math.max(0, Math.round((p.deadlineAt.getTime() - now.getTime()) / 3600000)),
    }))

    res.json({ success: true, data: { data: formatted, total, page, pageSize: limit } })
  } catch (err) { next(err) }
}

// ── GET /api/overseer/problems/:id ───────────────────────────────────────────
export async function getProblemDetail(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await resolveOverseer(req.user!.userId)
    const op = await prisma.overseerProblem.findUnique({
      where: { id: req.params.id },
      include: {
        problem: {
          include: {
            student: {
              include: {
                user: { select: { usn: true } },
                room: { include: { floor: true } },
              },
            },
          },
        },
        attachments: true,
        updates: {
          orderBy: { createdAt: 'asc' },
          include: { updatedBy: { select: { name: true } } },
        },
      },
    })
    if (!op) { next(createError('Problem not found.', 404)); return }

    const now = new Date()
    res.json({
      success: true,
      data: {
        id:            op.id,
        status:        op.status,
        category:      op.problem.category,
        description:   op.problem.description,
        roomNumber:    op.problem.student.room?.roomNumber ?? op.problem.roomNumber,
        floor:         op.problem.student.room?.floor?.floorNumber ?? '—',
        studentName:   op.problem.student.name,
        studentUsn:    op.problem.student.user.usn,
        photoUrl:      op.problem.photoUrl,
        attachments:   op.attachments,
        createdAt:     op.createdAt,
        deadlineAt:    op.deadlineAt,
        acknowledgedAt:op.acknowledgedAt,
        resolvedAt:    op.resolvedAt,
        escalatedAt:   op.escalatedAt,
        escalationReason: op.escalationReason,
        rejectReason:  op.rejectReason,
        isOverdue:     op.deadlineAt < now && !['RESOLVED','REJECTED','ESCALATED'].includes(op.status),
        hoursRemaining:Math.max(0, Math.round((op.deadlineAt.getTime() - now.getTime()) / 3600000)),
        updates:       op.updates.map(u => ({
          id:        u.id,
          status:    u.status,
          comment:   u.comment,
          updatedBy: u.updatedBy?.name ?? 'System',
          createdAt: u.createdAt,
        })),
      },
    })
  } catch (err) { next(err) }
}

// ── PATCH /api/overseer/problems/:id/status ──────────────────────────────────
export async function updateProblemStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const overseer = await resolveOverseer(req.user!.userId)
    const { status, comment } = req.body as { status: string; comment?: string }

    const VALID = ['NEW','ACKNOWLEDGED','IN_PROGRESS','RESOLVED','REJECTED','ESCALATED']
    if (!VALID.includes(status)) { next(createError('Invalid status.', 422)); return }

    const op = await prisma.overseerProblem.findUnique({ where: { id: req.params.id } })
    if (!op) { next(createError('Problem not found.', 404)); return }

    const now = new Date()
    const updateData: Record<string, unknown> = { status, updatedAt: now }
    if (status === 'ACKNOWLEDGED' && !op.acknowledgedAt) updateData.acknowledgedAt = now
    if (status === 'RESOLVED') updateData.resolvedAt = now
    if (status === 'ESCALATED') { updateData.escalatedAt = now; updateData.escalationReason = comment ?? 'Escalated by Overseer' }
    if (status === 'REJECTED')  { updateData.rejectedAt = now; updateData.rejectReason = comment }

    const [updated] = await prisma.$transaction([
      prisma.overseerProblem.update({ where: { id: op.id }, data: updateData }),
      prisma.overseerProblemUpdate.create({
        data: {
          overseerProblemId: op.id,
          status: status as 'NEW'|'ACKNOWLEDGED'|'IN_PROGRESS'|'RESOLVED'|'REJECTED'|'ESCALATED',
          comment: comment ?? null,
          updatedById: overseer.id,
        },
      }),
      // Update original Problem status for student visibility
      prisma.problem.update({
        where: { id: op.problemId },
        data: {
          status: status === 'RESOLVED' ? 'RESOLVED'
               : status === 'IN_PROGRESS' ? 'IN_PROGRESS'
               : 'PENDING',
          resolvedAt: status === 'RESOLVED' ? now : undefined,
          resolveNote: (status === 'RESOLVED' || status === 'REJECTED') ? (comment ?? null) : undefined,
        },
      }),
    ])

    res.json({ success: true, message: 'Status updated.', data: { status: updated.status } })
  } catch (err) { next(err) }
}

// ── GET /api/overseer/profile ────────────────────────────────────────────────
export async function getOverseerProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { overseer: true },
    })
    if (!user) { next(createError('Not found.', 404)); return }
    res.json({
      success: true,
      data: {
        overseerId:  user.usn,
        name:        user.overseer?.name,
        designation: user.overseer?.designation,
        email:       user.overseer?.email,
        phone:       user.overseer?.phone,
        lastLoginAt: user.lastLoginAt,
      },
    })
  } catch (err) { next(err) }
}
