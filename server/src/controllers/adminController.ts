import { Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import type { AuthRequest } from '../types'

function getISTDateStr() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  return ist.toISOString().slice(0, 10)
}

/**
 * GET /api/admin/attendance/daily?date=YYYY-MM-DD
 * Returns all students with their attendance status for a given date.
 */
export async function getDailyAttendance(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
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
            where: { status: 'ACTIVE' },
            include: { room: { include: { floor: true } } },
            take: 1,
            orderBy: { allocatedAt: 'desc' },
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
        id: s.id,
        name: s.name,
        usn: s.user.usn,
        floor: room?.floor?.floorNumber ?? '—',
        room: room?.roomNumber ?? '—',
        status: record?.status ?? 'NOT_SUBMITTED',
        markedAt: record?.markedAt ?? null,
        locationType: record?.locationType ?? null,
        distance: record?.distanceFromHostel ?? null,
      }
    })

    const summary = {
      total: data.length,
      present: data.filter(d => d.status === 'PRESENT' || d.status === 'LATE_PRESENT').length,
      absent: data.filter(d => d.status === 'ABSENT').length,
      notSubmitted: data.filter(d => d.status === 'NOT_SUBMITTED').length,
    }

    res.json({ success: true, data: { date: dateStr, summary, students: data } })
  } catch (err) {
    next(err)
  }
}
