import { Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { createError } from '../middleware/errorHandler'
import { ATTENDANCE_CONFIG } from '../config/attendanceConfig'
import { checkGeofence, haversineMetres, isValidCoordinate } from '../utils/geofence'
import type { AuthRequest } from '../types'

// ─── IST helpers ─────────────────────────────────────────────────────────────

function getISTNow() {
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
  const hh = ist.getUTCHours()
  const mm = ist.getUTCMinutes()
  const ss = ist.getUTCSeconds()
  const currentMinutes = hh * 60 + mm
  const dateStr = ist.toISOString().slice(0, 10)
  return { now, ist, hh, mm, ss, currentMinutes, dateStr }
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** Resolve the authenticated student record */
async function resolveStudent(userId: string) {
  const student = await prisma.student.findFirst({
    where: { userId, isActive: true },
    select: {
      id: true,
      name: true,
      room: { select: { roomNumber: true, floor: { select: { floorNumber: true } } } },
    },
  })
  if (!student) throw createError('Student record not found.', 404)
  return student
}

// ─── GET /api/attendance/status ───────────────────────────────────────────────
export async function getAttendanceStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const student = await resolveStudent(req.user!.userId)
    const { currentMinutes, dateStr, hh, mm, ss } = getISTNow()

    const todayDate = new Date(dateStr + 'T00:00:00.000Z')

    // Use config-based window (fixed 20:30–20:40 IST)
    const startMinutes = timeToMinutes(ATTENDANCE_CONFIG.attendanceStart)
    const endMinutes   = timeToMinutes(ATTENDANCE_CONFIG.attendanceEnd)

    // Also try DB window override (special per-student or default)
    const specialWindow = await prisma.attendanceWindow.findFirst({
      where: { date: todayDate, isSpecial: true, studentId: student.id, windowStatus: 'ACTIVE' },
    })
    const defaultWindow = await prisma.attendanceWindow.findFirst({
      where: { date: todayDate, isDefault: true, studentId: null },
    })
    const activeWindow = specialWindow ?? defaultWindow

    // Determine effective start/end (DB window overrides config if present)
    const effectiveStart = activeWindow ? timeToMinutes(activeWindow.startTime) : startMinutes
    const effectiveEnd   = activeWindow ? timeToMinutes(activeWindow.endTime)   : endMinutes
    const effectiveStartStr = activeWindow?.startTime ?? ATTENDANCE_CONFIG.attendanceStart
    const effectiveEndStr   = activeWindow?.endTime   ?? ATTENDANCE_CONFIG.attendanceEnd

    // Check if already marked today
    const existingAttendance = await prisma.attendance.findFirst({
      where: { studentId: student.id, date: todayDate },
    })

    let windowState: 'BEFORE' | 'OPEN' | 'CLOSED' | 'NO_WINDOW' = 'BEFORE'
    if (currentMinutes < effectiveStart)                              windowState = 'BEFORE'
    else if (currentMinutes >= effectiveStart && currentMinutes <= effectiveEnd) windowState = 'OPEN'
    else                                                              windowState = 'CLOSED'

    res.json({
      success: true,
      data: {
        serverTime: {
          iso: new Date().toISOString(),
          istDisplay: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`,
          date: dateStr,
        },
        // Expose geofence config so client can show approximate locations
        geofenceConfig: {
          hostelCentre: ATTENDANCE_CONFIG.hostelCentre,
          collegeCentre: ATTENDANCE_CONFIG.collegeCentre,
          maxGpsAccuracyMeters: ATTENDANCE_CONFIG.maxGpsAccuracyMeters,
        },
        window: {
          startTime: effectiveStartStr,
          endTime: effectiveEndStr,
          isSpecial: !!specialWindow,
          reason: specialWindow?.reason ?? null,
          id: activeWindow?.id ?? null,
          approvedLocation: activeWindow?.approvedLocation ?? 'HOSTEL_CAMPUS',
        },
        windowState,
        alreadyMarked: !!existingAttendance,
        todayRecord: existingAttendance
          ? {
              status: existingAttendance.status,
              markedAt: existingAttendance.markedAt,
              locationType: existingAttendance.locationType,
              distanceFromHostel: existingAttendance.distanceFromHostel,
              verifiedLocation: existingAttendance.verifiedLocation ?? null,
            }
          : null,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─── GET /api/attendance/window/today ─────────────────────────────────────────
export async function getTodayWindow(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { currentMinutes, dateStr } = getISTNow()
    const todayDate = new Date(dateStr + 'T00:00:00.000Z')
    const defaultWindow = await prisma.attendanceWindow.findFirst({
      where: { date: todayDate, isDefault: true, studentId: null },
    })
    const startMinutes = timeToMinutes(ATTENDANCE_CONFIG.attendanceStart)
    const endMinutes   = timeToMinutes(ATTENDANCE_CONFIG.attendanceEnd)
    const effectiveStart = defaultWindow ? timeToMinutes(defaultWindow.startTime) : startMinutes
    const effectiveEnd   = defaultWindow ? timeToMinutes(defaultWindow.endTime)   : endMinutes

    let windowState: 'BEFORE' | 'OPEN' | 'CLOSED' = 'BEFORE'
    if (currentMinutes < effectiveStart)                               windowState = 'BEFORE'
    else if (currentMinutes >= effectiveStart && currentMinutes <= effectiveEnd) windowState = 'OPEN'
    else                                                               windowState = 'CLOSED'

    res.json({
      success: true,
      data: {
        startTime: defaultWindow?.startTime ?? ATTENDANCE_CONFIG.attendanceStart,
        endTime: defaultWindow?.endTime ?? ATTENDANCE_CONFIG.attendanceEnd,
        windowState,
      },
    })
  } catch (err) { next(err) }
}

// ─── POST /api/attendance/verify-location ─────────────────────────────────────
/**
 * Client sends GPS coords — backend returns HOSTEL / COLLEGE / OUTSIDE.
 * Does NOT create an attendance record.
 * Backend NEVER trusts client-provided verifiedLocation.
 */
export async function verifyLocation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { latitude, longitude, gpsAccuracy } = req.body as {
      latitude?: number
      longitude?: number
      gpsAccuracy?: number
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      next(createError('latitude and longitude are required numbers.', 422))
      return
    }

    if (!isValidCoordinate(latitude, longitude)) {
      next(createError('Coordinates are outside the valid range.', 422))
      return
    }

    // GPS accuracy check
    const accuracy = typeof gpsAccuracy === 'number' ? gpsAccuracy : null
    const maxAccuracy = ATTENDANCE_CONFIG.maxGpsAccuracyMeters
    if (accuracy !== null && accuracy > maxAccuracy) {
      res.json({
        success: true,
        data: {
          verifiedLocation: 'OUTSIDE' as const,
          verified: false,
          gpsAccuracyTooLow: true,
          accuracy,
          maxAccuracyMeters: maxAccuracy,
          hostelDistanceMeters: Math.round(
            haversineMetres(latitude, longitude, ATTENDANCE_CONFIG.hostelCentre.lat, ATTENDANCE_CONFIG.hostelCentre.lng)
          ),
          message: `GPS accuracy is ${Math.round(accuracy)} m (max ${maxAccuracy} m). Enable precise location and try again.`,
        },
      })
      return
    }

    // Polygon geofence check: HOSTEL → COLLEGE → OUTSIDE
    const verifiedLocation = checkGeofence(latitude, longitude)
    const verified = verifiedLocation !== 'OUTSIDE'

    const hostelDist = Math.round(
      haversineMetres(latitude, longitude, ATTENDANCE_CONFIG.hostelCentre.lat, ATTENDANCE_CONFIG.hostelCentre.lng)
    )
    const collegeDist = Math.round(
      haversineMetres(latitude, longitude, ATTENDANCE_CONFIG.collegeCentre.lat, ATTENDANCE_CONFIG.collegeCentre.lng)
    )

    res.json({
      success: true,
      data: {
        verifiedLocation,
        verified,
        gpsAccuracyTooLow: false,
        accuracy,
        maxAccuracyMeters: maxAccuracy,
        hostelDistanceMeters: hostelDist,
        collegeDistanceMeters: collegeDist,
        message: verified
          ? `Location verified: ${verifiedLocation}`
          : `You are outside both approved attendance areas. Hostel: ${hostelDist}m, College: ${collegeDist}m.`,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─── POST /api/attendance/submit ──────────────────────────────────────────────
/**
 * Full server-side validation. The client MUST NOT be trusted for:
 *  - verifiedLocation
 *  - attendanceStatus
 *  - cameraEnabled
 * Backend independently validates: time, geofence, accuracy, identity, duplicate.
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

    // ── 1. Duplicate check ────────────────────────────────────────────────────
    const existing = await prisma.attendance.findFirst({
      where: { studentId: student.id, date: todayDate },
    })
    if (existing) {
      next(createError('Attendance already marked for today.', 409))
      return
    }

    // ── 2. Server-side time validation (IST, Asia/Kolkata) ────────────────────
    // Check DB window override first, fall back to config
    const specialWindow = await prisma.attendanceWindow.findFirst({
      where: { date: todayDate, isSpecial: true, studentId: student.id, windowStatus: 'ACTIVE' },
    })
    const defaultWindow = await prisma.attendanceWindow.findFirst({
      where: { date: todayDate, isDefault: true, studentId: null },
    })
    const activeWindow = specialWindow ?? defaultWindow

    const effectiveStart = activeWindow
      ? timeToMinutes(activeWindow.startTime)
      : timeToMinutes(ATTENDANCE_CONFIG.attendanceStart)
    const effectiveEnd = activeWindow
      ? timeToMinutes(activeWindow.endTime)
      : timeToMinutes(ATTENDANCE_CONFIG.attendanceEnd)
    const startStr = activeWindow?.startTime ?? ATTENDANCE_CONFIG.attendanceStart
    const endStr   = activeWindow?.endTime   ?? ATTENDANCE_CONFIG.attendanceEnd

    if (currentMinutes < effectiveStart) {
      next(createError(`Attendance window has not opened yet. Opens at ${startStr} IST.`, 400))
      return
    }
    if (currentMinutes > effectiveEnd) {
      next(createError(`Attendance window has closed. It was ${startStr}–${endStr} IST.`, 400))
      return
    }

    // ── 3. GPS coordinates — required ─────────────────────────────────────────
    const latitude   = typeof req.body.latitude   === 'string' ? parseFloat(req.body.latitude)   : req.body.latitude
    const longitude  = typeof req.body.longitude  === 'string' ? parseFloat(req.body.longitude)  : req.body.longitude
    const gpsAccuracy = typeof req.body.gpsAccuracy === 'string' ? parseFloat(req.body.gpsAccuracy) : req.body.gpsAccuracy

    if (typeof latitude !== 'number' || isNaN(latitude) || typeof longitude !== 'number' || isNaN(longitude)) {
      next(createError('GPS coordinates are required.', 422))
      return
    }

    if (!isValidCoordinate(latitude, longitude)) {
      next(createError('Submitted coordinates are invalid or outside the valid range.', 422))
      return
    }

    // ── 4. GPS accuracy validation ────────────────────────────────────────────
    const maxAccuracy = ATTENDANCE_CONFIG.maxGpsAccuracyMeters
    if (typeof gpsAccuracy === 'number' && !isNaN(gpsAccuracy) && gpsAccuracy > maxAccuracy) {
      next(createError(
        `GPS accuracy too low (${Math.round(gpsAccuracy)} m). Must be ≤ ${maxAccuracy} m. Enable precise location.`,
        400
      ))
      return
    }

    // ── 5. Backend polygon geofence check (HOSTEL → COLLEGE → OUTSIDE) ────────
    // Never trust client-sent verifiedLocation — always recompute on server.
    const verifiedLocation = checkGeofence(latitude, longitude)

    // College campus window: if warden approved a special window with COLLEGE_CAMPUS,
    // we accept college location even if not inside hostel polygon.
    const windowApprovedLocation = activeWindow?.approvedLocation ?? 'HOSTEL_CAMPUS'
    const locationAccepted =
      verifiedLocation === 'HOSTEL' ||
      (verifiedLocation === 'COLLEGE' && windowApprovedLocation === 'COLLEGE_CAMPUS') ||
      verifiedLocation === 'COLLEGE' // Allow college as priority 2 per spec

    if (!locationAccepted) {
      const hostelDist = Math.round(
        haversineMetres(latitude, longitude, ATTENDANCE_CONFIG.hostelCentre.lat, ATTENDANCE_CONFIG.hostelCentre.lng)
      )
      const collegeDist = Math.round(
        haversineMetres(latitude, longitude, ATTENDANCE_CONFIG.collegeCentre.lat, ATTENDANCE_CONFIG.collegeCentre.lng)
      )
      next(createError(
        `Location not verified. You are outside both approved areas. Hostel: ${hostelDist}m away, College: ${collegeDist}m away.`,
        400
      ))
      return
    }

    // ── 6. Photo — required ───────────────────────────────────────────────────
    const photoFile = (req as AuthRequest & { file?: Express.Multer.File }).file
    if (!photoFile) {
      next(createError('A live photo is required to mark attendance.', 422))
      return
    }
    const photoUrl      = `/uploads/attendance/${photoFile.filename}`
    const photoFilename = photoFile.filename

    // ── 7. Distances for record ───────────────────────────────────────────────
    const hostelDist = Math.round(
      haversineMetres(latitude, longitude, ATTENDANCE_CONFIG.hostelCentre.lat, ATTENDANCE_CONFIG.hostelCentre.lng)
    )

    // ── 8. Determine attendance status ────────────────────────────────────────
    const attendanceStatus = specialWindow ? 'LATE_PRESENT' : 'PRESENT'

    // ── 9. Store attendance record ────────────────────────────────────────────
    const record = await prisma.attendance.create({
      data: {
        studentId:             student.id,
        date:                  todayDate,
        markedAt:              new Date(),
        status:                attendanceStatus,
        locationType:          'VERIFIED',
        latitude,
        longitude,
        gpsAccuracy:           typeof gpsAccuracy === 'number' && !isNaN(gpsAccuracy) ? gpsAccuracy : null,
        verifiedLocation,
        distanceFromHostel:    hostelDist,
        photoUrl,
        photoFilename,
        isSpecialWindow:       !!specialWindow,
        specialWindowReason:   specialWindow?.reason ?? null,
        attendanceWindowId:    activeWindow?.id ?? null,
      },
    })

    // ── 10. Mark special window as USED ───────────────────────────────────────
    if (specialWindow) {
      await prisma.attendanceWindow.update({
        where: { id: specialWindow.id },
        data: { windowStatus: 'USED' },
      })
    }

    // ── 11. Notification ──────────────────────────────────────────────────────
    await prisma.notification.create({
      data: {
        studentId: student.id,
        type:    'ATTENDANCE_UPDATED',
        title:   'Attendance Marked',
        message: `Your attendance for ${dateStr} has been recorded at ${verifiedLocation}.`,
      },
    })

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully.',
      data: {
        id:               record.id,
        date:             dateStr,
        markedAt:         record.markedAt,
        status:           record.status,
        locationType:     record.locationType,
        verifiedLocation: record.verifiedLocation,
        distanceFromHostel: record.distanceFromHostel,
        isSpecialWindow:  record.isSpecialWindow,
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
    const page  = Math.max(1, parseInt(String(req.query.page  ?? '1')))
    const limit = Math.min(60, parseInt(String(req.query.limit ?? '30')))
    const skip  = (page - 1) * limit

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where: { studentId: student.id },
        orderBy: { date: 'desc' },
        skip, take: limit,
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
          verifiedLocation: r.verifiedLocation,
          latitude: r.latitude,
          longitude: r.longitude,
          gpsAccuracy: r.gpsAccuracy,
          distanceFromHostel: r.distanceFromHostel,
          photoUrl: r.photoUrl,
          isSpecialWindow: r.isSpecialWindow,
          specialWindowReason: r.specialWindowReason,
          excuseReason: r.excuseReason,
          window: r.attendanceWindow
            ? { startTime: r.attendanceWindow.startTime, endTime: r.attendanceWindow.endTime, isSpecial: r.attendanceWindow.isSpecial }
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

    const totalDays    = records.length
    const presentDays  = records.filter((r) => r.status === 'PRESENT').length
    const lateDays     = records.filter((r) => r.status === 'LATE_PRESENT').length
    const absentDays   = records.filter((r) => r.status === 'ABSENT').length
    const excusedDays  = records.filter((r) => r.status === 'EXCUSED').length
    const effectivePresent = presentDays + lateDays + excusedDays
    const percentage = totalDays > 0 ? Math.round((effectivePresent / totalDays) * 100) : 0

    // Weekly data — last 8 weeks
    const weeklyData = []
    for (let w = 7; w >= 0; w--) {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - w * 7 - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      const weekRecs = records.filter((r) => { const d = new Date(r.date); return d >= weekStart && d < weekEnd })
      const label = weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      weeklyData.push({
        week: label,
        present: weekRecs.filter((r) => r.status === 'PRESENT' || r.status === 'LATE_PRESENT').length,
        absent:  weekRecs.filter((r) => r.status === 'ABSENT').length,
        total:   weekRecs.length,
      })
    }

    // Monthly data — last 6 months
    const monthlyData = []
    for (let m = 5; m >= 0; m--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - m)
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
      const monthEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const monthRecs  = records.filter((r) => { const rd = new Date(r.date); return rd >= monthStart && rd < monthEnd })
      monthlyData.push({
        month:   d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        present: monthRecs.filter((r) => r.status === 'PRESENT' || r.status === 'LATE_PRESENT').length,
        absent:  monthRecs.filter((r) => r.status === 'ABSENT').length,
        total:   monthRecs.length,
      })
    }

    res.json({
      success: true,
      data: {
        totalDays, presentDays, lateDays, absentDays, excusedDays, percentage,
        weeklyData, monthlyData,
      },
    })
  } catch (err) {
    next(err)
  }
}
