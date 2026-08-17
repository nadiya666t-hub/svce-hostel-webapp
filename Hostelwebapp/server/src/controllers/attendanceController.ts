import { Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { createError } from '../middleware/errorHandler'
import type { AuthRequest } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get current IST time components */
function getISTNow() {
  const now = new Date()
  // IST = UTC + 5:30
  const istOffset = 5.5 * 60 * 60 * 1000
  const ist = new Date(now.getTime() + istOffset)
  const hh = ist.getUTCHours()
  const mm = ist.getUTCMinutes()
  const ss = ist.getUTCSeconds()
  const currentMinutes = hh * 60 + mm // total minutes since midnight IST
  // IST date string YYYY-MM-DD
  const dateStr = ist.toISOString().slice(0, 10)
  return { now, ist, hh, mm, ss, currentMinutes, dateStr }
}

/** Parse "HH:mm" into minutes since midnight */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** Haversine distance in metres between two lat/lng points */
function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Resolve the authenticated student record (throws 404 if not found) */
async function resolveStudent(userId: string) {
  const student = await prisma.student.findFirst({
    where: { userId, isActive: true },
    select: { id: true, name: true, room: { select: { roomNumber: true, floor: { select: { floorNumber: true } } } } },
  })
  if (!student) throw createError('Student record not found.', 404)
  return student
}

// ─── GET /api/attendance/status ───────────────────────────────────────────────
/**
 * Returns the server time, the active attendance window for today,
 * whether the student already marked attendance today, and hostel location.
 */
export async function getAttendanceStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const student = await resolveStudent(req.user!.userId)
    const { currentMinutes, dateStr, hh, mm, ss } = getISTNow()

    // Fetch active hostel settings
    const settings = await prisma.attendanceSettings.findFirst({ where: { isActive: true } })
    if (!settings) {
      next(createError('Attendance settings not configured. Contact the hostel office.', 503))
      return
    }

    // Find attendance window for today applicable to this student
    // Priority: special window for this student > default window for today
    const todayDate = new Date(dateStr + 'T00:00:00.000Z')

    const specialWindow = await prisma.attendanceWindow.findFirst({
      where: {
        date: todayDate,
        isSpecial: true,
        studentId: student.id,
        windowStatus: 'ACTIVE',
      },
    })

    const defaultWindow = await prisma.attendanceWindow.findFirst({
      where: {
        date: todayDate,
        isDefault: true,
        studentId: null,
      },
    })

    const activeWindow = specialWindow ?? defaultWindow

    // Check if already marked today
    const existingAttendance = await prisma.attendance.findFirst({
      where: { studentId: student.id, date: todayDate },
    })

    // Determine window state
    let windowState: 'BEFORE' | 'OPEN' | 'CLOSED' | 'NO_WINDOW' = 'NO_WINDOW'
    if (activeWindow) {
      const start = timeToMinutes(activeWindow.startTime)
      const end = timeToMinutes(activeWindow.endTime)
      if (currentMinutes < start) windowState = 'BEFORE'
      else if (currentMinutes >= start && currentMinutes <= end) windowState = 'OPEN'
      else windowState = 'CLOSED'
    }

    res.json({
      success: true,
      data: {
        serverTime: {
          iso: new Date().toISOString(),
          istDisplay: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`,
          date: dateStr,
        },
        hostelLocation: {
          latitude: settings.latitude,
          longitude: settings.longitude,
          radiusMeters: settings.radiusMeters,
        },
        window: activeWindow
          ? {
              id: activeWindow.id,
              startTime: activeWindow.startTime,
              endTime: activeWindow.endTime,
              isSpecial: activeWindow.isSpecial,
              reason: activeWindow.reason ?? null,
            }
          : null,
        windowState,
        alreadyMarked: !!existingAttendance,
        todayRecord: existingAttendance
          ? {
              status: existingAttendance.status,
              markedAt: existingAttendance.markedAt,
              locationType: existingAttendance.locationType,
              distanceFromHostel: existingAttendance.distanceFromHostel,
            }
          : null,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─── POST /api/attendance/verify-location ─────────────────────────────────────
/**
 * Student sends their GPS coordinates; backend checks geofence.
 * Does NOT mark attendance — only verification.
 */
export async function verifyLocation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { latitude, longitude } = req.body as { latitude?: number; longitude?: number }
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      next(createError('latitude and longitude are required numbers.', 422))
      return
    }

    const settings = await prisma.attendanceSettings.findFirst({ where: { isActive: true } })
    if (!settings) {
      next(createError('Attendance settings not configured.', 503))
      return
    }

    const distance = haversineMetres(latitude, longitude, settings.latitude, settings.longitude)
    const verified = distance <= settings.radiusMeters

    res.json({
      success: true,
      data: {
        verified,
        distance: Math.round(distance),
        radiusMeters: settings.radiusMeters,
        message: verified
          ? 'Location verified. You are within the hostel attendance area.'
          : `You are ${Math.round(distance)} m away. Must be within ${settings.radiusMeters} m.`,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─── POST /api/attendance/submit ──────────────────────────────────────────────
/**
 * Submit attendance with photo + GPS.
 * Backend re-validates: time window, geofence, duplicate.
 */
export async function submitAttendance(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const student = await resolveStudent(req.user!.userId)
    const { currentMinutes, dateStr } = getISTNow()
    const todayDate = new Date(dateStr + 'T00:00:00.000Z')

    // 1 ── Duplicate check
    const existing = await prisma.attendance.findFirst({
      where: { studentId: student.id, date: todayDate },
    })
    if (existing) {
      next(createError('Attendance already marked for today.', 409))
      return
    }

    // 2 ── Find applicable window
    const specialWindow = await prisma.attendanceWindow.findFirst({
      where: { date: todayDate, isSpecial: true, studentId: student.id, windowStatus: 'ACTIVE' },
    })
    const defaultWindow = await prisma.attendanceWindow.findFirst({
      where: { date: todayDate, isDefault: true, studentId: null },
    })
    const activeWindow = specialWindow ?? defaultWindow

    if (!activeWindow) {
      next(createError('No attendance window configured for today.', 400))
      return
    }

    // 3 ── Time validation (server time, IST)
    const start = timeToMinutes(activeWindow.startTime)
    const end = timeToMinutes(activeWindow.endTime)
    if (currentMinutes < start) {
      next(createError(`Attendance window has not opened yet. Opens at ${activeWindow.startTime} IST.`, 400))
      return
    }
    if (currentMinutes > end) {
      next(createError(`Attendance window has closed. It was ${activeWindow.startTime}–${activeWindow.endTime} IST.`, 400))
      return
    }

    // 4 ── GPS / geofence validation
    const { latitude, longitude } = req.body as { latitude?: number; longitude?: number }
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      next(createError('GPS coordinates are required.', 422))
      return
    }

    const settings = await prisma.attendanceSettings.findFirst({ where: { isActive: true } })
    if (!settings) {
      next(createError('Attendance settings not configured.', 503))
      return
    }

    const distance = haversineMetres(latitude, longitude, settings.latitude, settings.longitude)
    const locationVerified = distance <= settings.radiusMeters

    if (!locationVerified) {
      next(createError(`Location not verified. You are ${Math.round(distance)} m away (max ${settings.radiusMeters} m).`, 400))
      return
    }

    // 5 ── Photo — REQUIRED. Student must take a live photo on their phone.
    const photoFile = (req as AuthRequest & { file?: Express.Multer.File }).file
    if (!photoFile) {
      next(createError('A live photo is required to mark attendance. Please take a photo using your camera.', 422))
      return
    }
    const photoUrl = `/uploads/attendance/${photoFile.filename}`
    const photoFilename = photoFile.filename

    // 6 ── Determine status
    const attendanceStatus = specialWindow ? 'LATE_PRESENT' : 'PRESENT'

    // 7 ── Store
    const record = await prisma.attendance.create({
      data: {
        studentId: student.id,
        date: todayDate,
        markedAt: new Date(),
        status: attendanceStatus,
        locationType: 'VERIFIED',
        latitude,
        longitude,
        distanceFromHostel: Math.round(distance),
        photoUrl,
        photoFilename,
        isSpecialWindow: !!specialWindow,
        specialWindowReason: specialWindow?.reason ?? null,
        attendanceWindowId: activeWindow.id,
      },
    })

    // 8 ── If special window was used, mark it as USED
    if (specialWindow) {
      await prisma.attendanceWindow.update({
        where: { id: specialWindow.id },
        data: { windowStatus: 'USED' },
      })
    }

    // 9 ── Create notification
    await prisma.notification.create({
      data: {
        studentId: student.id,
        type: 'ATTENDANCE_UPDATED',
        title: 'Attendance Marked',
        message: `Your attendance for ${dateStr} has been recorded at ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })}.`,
      },
    })

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully.',
      data: {
        id: record.id,
        date: dateStr,
        markedAt: record.markedAt,
        status: record.status,
        locationType: record.locationType,
        distance: record.distanceFromHostel,
        isSpecialWindow: record.isSpecialWindow,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─── GET /api/attendance/history ──────────────────────────────────────────────
export async function getAttendanceHistory(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const student = await resolveStudent(req.user!.userId)
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')))
    const limit = Math.min(60, parseInt(String(req.query.limit ?? '30')))
    const skip = (page - 1) * limit

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where: { studentId: student.id },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        include: { attendanceWindow: true },
      }),
      prisma.attendance.count({ where: { studentId: student.id } }),
    ])

    res.json({
      success: true,
      data: {
        records: records.map((r) => ({
          id: r.id,
          date: r.date,
          markedAt: r.markedAt,
          status: r.status,
          locationType: r.locationType,
          latitude: r.latitude,
          longitude: r.longitude,
          distanceFromHostel: r.distanceFromHostel,
          photoUrl: r.photoUrl,
          isSpecialWindow: r.isSpecialWindow,
          specialWindowReason: r.specialWindowReason,
          excuseReason: r.excuseReason,
          window: r.attendanceWindow
            ? {
                startTime: r.attendanceWindow.startTime,
                endTime: r.attendanceWindow.endTime,
                isSpecial: r.attendanceWindow.isSpecial,
              }
            : null,
        })),
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─── GET /api/attendance/summary ─────────────────────────────────────────────
export async function getAttendanceSummaryFull(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const student = await resolveStudent(req.user!.userId)

    const records = await prisma.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { date: 'asc' },
    })

    const totalDays = records.length
    const presentDays = records.filter((r) => r.status === 'PRESENT').length
    const lateDays = records.filter((r) => r.status === 'LATE_PRESENT').length
    const absentDays = records.filter((r) => r.status === 'ABSENT').length
    const excusedDays = records.filter((r) => r.status === 'EXCUSED').length
    const effectivePresent = presentDays + lateDays + excusedDays
    const percentage =
      totalDays > 0 ? Math.round((effectivePresent / totalDays) * 100) : 0

    // Weekly data — last 8 weeks
    const weeklyData = []
    for (let w = 7; w >= 0; w--) {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - w * 7 - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const weekRecs = records.filter((r) => {
        const d = new Date(r.date)
        return d >= weekStart && d < weekEnd
      })
      const label = weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      weeklyData.push({
        week: label,
        present: weekRecs.filter((r) => r.status !== 'ABSENT').length,
        absent: weekRecs.filter((r) => r.status === 'ABSENT').length,
        total: weekRecs.length,
      })
    }

    // Monthly data — last 6 months
    const monthlyData = []
    for (let m = 5; m >= 0; m--) {
      const d = new Date()
      d.setMonth(d.getMonth() - m, 1)
      d.setHours(0, 0, 0, 0)
      const monthEnd = new Date(d)
      monthEnd.setMonth(monthEnd.getMonth() + 1)

      const monthRecs = records.filter((r) => {
        const rd = new Date(r.date)
        return rd >= d && rd < monthEnd
      })
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
      monthlyData.push({
        month: label,
        present: monthRecs.filter((r) => r.status !== 'ABSENT').length,
        absent: monthRecs.filter((r) => r.status === 'ABSENT').length,
        total: monthRecs.length,
      })
    }

    res.json({
      success: true,
      data: {
        totalDays,
        presentDays,
        lateDays,
        absentDays,
        excusedDays,
        percentage,
        weeklyData,
        monthlyData,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─── GET /api/attendance/window/today ────────────────────────────────────────
/**
 * Returns just the attendance window(s) for today — used by the frontend
 * to display timing without needing full status.
 */
export async function getTodayWindow(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const student = await resolveStudent(req.user!.userId)
    const { dateStr } = getISTNow()
    const todayDate = new Date(dateStr + 'T00:00:00.000Z')

    const special = await prisma.attendanceWindow.findFirst({
      where: { date: todayDate, isSpecial: true, studentId: student.id, windowStatus: 'ACTIVE' },
    })
    const def = await prisma.attendanceWindow.findFirst({
      where: { date: todayDate, isDefault: true, studentId: null },
    })

    res.json({
      success: true,
      data: {
        specialWindow: special
          ? { startTime: special.startTime, endTime: special.endTime, reason: special.reason }
          : null,
        defaultWindow: def
          ? { startTime: def.startTime, endTime: def.endTime }
          : null,
        activeWindow: special ?? def,
      },
    })
  } catch (err) {
    next(err)
  }
}
