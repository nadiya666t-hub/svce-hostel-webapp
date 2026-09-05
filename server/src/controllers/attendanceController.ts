import { Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { createError } from '../middleware/errorHandler'
import { ATTENDANCE_CONFIG } from '../config/attendanceConfig'
import { getNetworkVerification } from '../utils/networkCheck'
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

    const startMinutes = timeToMinutes(ATTENDANCE_CONFIG.attendanceStart)
    const endMinutes   = timeToMinutes(ATTENDANCE_CONFIG.attendanceEnd)

    // DB window override (special per-student or default for today)
    const specialWindow = await prisma.attendanceWindow.findFirst({
      where: { date: todayDate, isSpecial: true, studentId: student.id, windowStatus: 'ACTIVE' },
    })
    const defaultWindow = await prisma.attendanceWindow.findFirst({
      where: { date: todayDate, isDefault: true, studentId: null },
    })
    const activeWindow = specialWindow ?? defaultWindow

    const effectiveStart    = activeWindow ? timeToMinutes(activeWindow.startTime) : startMinutes
    const effectiveEnd      = activeWindow ? timeToMinutes(activeWindow.endTime)   : endMinutes
    const effectiveStartStr = activeWindow?.startTime ?? ATTENDANCE_CONFIG.attendanceStart
    const effectiveEndStr   = activeWindow?.endTime   ?? ATTENDANCE_CONFIG.attendanceEnd

    // Check if already marked today
    const existingAttendance = await prisma.attendance.findFirst({
      where: { studentId: student.id, date: todayDate },
    })

    let windowState: 'BEFORE' | 'OPEN' | 'CLOSED' | 'NO_WINDOW' = 'BEFORE'
    if (currentMinutes < effectiveStart)                                              windowState = 'BEFORE'
    else if (currentMinutes >= effectiveStart && currentMinutes <= effectiveEnd)      windowState = 'OPEN'
    else                                                                              windowState = 'CLOSED'

    // Network verification (server-side, based on client IP)
    const netVerification = getNetworkVerification(req)

    res.json({
      success: true,
      data: {
        serverTime: {
          iso: new Date().toISOString(),
          istDisplay: `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`,
          date: dateStr,
        },
        networkConfig: {
          hostelNetwork:  ATTENDANCE_CONFIG.hostelWifiNetwork,
          collegeNetwork: ATTENDANCE_CONFIG.collegeWifiNetwork ?? null,
          message: 'Connect to SVCE-GH Wi-Fi (172.16.0.0/20) to mark attendance.',
        },
        // Network verification result from server
        networkVerification: {
          location:  netVerification.location,
          verified:  netVerification.verified,
          message:   netVerification.message,
        },
        window: {
          startTime:       effectiveStartStr,
          endTime:         effectiveEndStr,
          isSpecial:       !!specialWindow,
          reason:          specialWindow?.reason ?? null,
          id:              activeWindow?.id ?? null,
          approvedLocation: activeWindow?.approvedLocation ?? 'HOSTEL_CAMPUS',
        },
        windowState,
        alreadyMarked: !!existingAttendance,
        todayRecord: existingAttendance ? {
          status:             existingAttendance.status,
          markedAt:           existingAttendance.markedAt,
          locationType:       existingAttendance.locationType,
          networkLocation:    existingAttendance.verifiedLocation ?? null,
          distanceFromHostel: existingAttendance.distanceFromHostel,
          verifiedLocation:   existingAttendance.verifiedLocation ?? null,
          photoUrl:           existingAttendance.photoUrl ?? null,
        } : null,
      },
    })
  } catch (err) { next(err) }
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
        endTime:   defaultWindow?.endTime   ?? ATTENDANCE_CONFIG.attendanceEnd,
        windowState,
      },
    })
  } catch (err) { next(err) }
}

// ─── POST /api/attendance/verify-network ──────────────────────────────────────
/**
 * Client requests network verification — backend checks if client IP
 * belongs to the configured hostel/college Wi-Fi network.
 * No GPS required.
 */
export async function verifyNetwork(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = getNetworkVerification(req)
    res.json({
      success: true,
      data: {
        location:       result.location,
        verified:       result.verified,
        clientIp:       result.clientIp,
        message:        result.message,
        hostelNetwork:  result.hostelNetwork,
        collegeNetwork: result.collegeNetwork,
      },
    })
  } catch (err) { next(err) }
}

// ─── POST /api/attendance/verify-location (kept for backwards compat) ─────────
export async function verifyLocation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Redirect to network verification
  return verifyNetwork(req, res, next)
}

// ─── POST /api/attendance/submit ──────────────────────────────────────────────
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
    if (existing) { next(createError('Attendance already marked for today.', 409)); return }

    // ── 2. Server-side time validation ────────────────────────────────────────
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
      next(createError(`Attendance window has not opened yet. Opens at ${startStr} IST.`, 400)); return
    }
    if (currentMinutes > effectiveEnd) {
      next(createError(`Attendance window has closed. It was ${startStr}–${endStr} IST.`, 400)); return
    }

    // ── 3. Server-side network verification (Wi-Fi / IP range check) ──────────
    const netResult = getNetworkVerification(req)
    if (!netResult.verified) {
      next(createError(netResult.message, 403)); return
    }

    // ── 4. Photo — required ───────────────────────────────────────────────────
    const photoFile = (req as AuthRequest & { file?: Express.Multer.File }).file
    if (!photoFile) {
      next(createError('A live photo is required to mark attendance.', 422)); return
    }
    const photoUrl      = `/uploads/attendance/${photoFile.filename}`
    const photoFilename = photoFile.filename

    // ── 5. Determine attendance status ────────────────────────────────────────
    const attendanceStatus = specialWindow ? 'LATE_PRESENT' : 'PRESENT'

    // ── 6. Store attendance record ────────────────────────────────────────────
    const record = await prisma.attendance.create({
      data: {
        studentId:           student.id,
        date:                todayDate,
        markedAt:            new Date(),
        status:              attendanceStatus,
        locationType:        'VERIFIED',
        latitude:            null,
        longitude:           null,
        gpsAccuracy:         null,
        verifiedLocation:    netResult.location,
        distanceFromHostel:  null,
        photoUrl,
        photoFilename,
        isSpecialWindow:     !!specialWindow,
        specialWindowReason: specialWindow?.reason ?? null,
        attendanceWindowId:  activeWindow?.id ?? null,
      },
    })

    // ── 7. Mark special window as USED ────────────────────────────────────────
    if (specialWindow) {
      await prisma.attendanceWindow.update({
        where: { id: specialWindow.id },
        data:  { windowStatus: 'USED' },
      })
    }

    // ── 8. Notification ───────────────────────────────────────────────────────
    await prisma.notification.create({
      data: {
        studentId: student.id,
        type:      'ATTENDANCE_UPDATED',
        title:     'Attendance Marked',
        message:   `Your attendance for ${dateStr} has been recorded. Connected via ${netResult.location} network.`,
      },
    })

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully.',
      data: {
        id:              record.id,
        date:            dateStr,
        markedAt:        record.markedAt,
        status:          record.status,
        locationType:    record.locationType,
        networkLocation: netResult.location,
        isSpecialWindow: record.isSpecialWindow,
        photoUrl,
      },
    })
  } catch (err) { next(err) }
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
        where:   { studentId: student.id },
        orderBy: { date: 'desc' },
        skip, take: limit,
        include: { attendanceWindow: true },
      }),
      prisma.attendance.count({ where: { studentId: student.id } }),
    ])

    res.json({
      success: true,
      data: {
        records: records.map(r => ({
          id:                  r.id,
          date:                r.date,
          markedAt:            r.markedAt,
          status:              r.status,
          locationType:        r.locationType,
          verifiedLocation:    r.verifiedLocation,
          latitude:            r.latitude,
          longitude:           r.longitude,
          gpsAccuracy:         r.gpsAccuracy,
          distanceFromHostel:  r.distanceFromHostel,
          photoUrl:            r.photoUrl,
          isSpecialWindow:     r.isSpecialWindow,
          specialWindowReason: r.specialWindowReason,
          excuseReason:        r.excuseReason,
          window: r.attendanceWindow ? {
            startTime: r.attendanceWindow.startTime,
            endTime:   r.attendanceWindow.endTime,
            isSpecial: r.attendanceWindow.isSpecial,
          } : null,
        })),
        total,
        page,
        pageSize:   limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) { next(err) }
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
      where:   { studentId: student.id },
      orderBy: { date: 'asc' },
      select:  { date: true, status: true, markedAt: true },
    })

    const presentDays = records.filter(r => r.status === 'PRESENT').length
    const lateDays    = records.filter(r => r.status === 'LATE_PRESENT').length
    const absentDays  = records.filter(r => r.status === 'ABSENT').length
    const excusedDays = records.filter(r => r.status === 'EXCUSED').length
    const totalDays   = records.length
    const percentage  = totalDays > 0 ? Math.round(((presentDays + lateDays + excusedDays) / totalDays) * 100) : 0

    // Weekly data (last 8 weeks)
    const weeklyMap = new Map<string, { present: number; absent: number; late: number }>()
    for (const r of records) {
      const d = new Date(r.date)
      const start = new Date(d); start.setDate(d.getDate() - d.getDay())
      const key = start.toISOString().slice(0, 10)
      if (!weeklyMap.has(key)) weeklyMap.set(key, { present: 0, absent: 0, late: 0 })
      const w = weeklyMap.get(key)!
      if (r.status === 'PRESENT') w.present++
      else if (r.status === 'LATE_PRESENT') { w.present++; w.late++ }
      else w.absent++
    }
    const weeklyData = Array.from(weeklyMap.entries())
      .sort(([a],[b]) => a.localeCompare(b))
      .slice(-8)
      .map(([date, v], i) => ({
        week:    `W${i + 1}`,
        date,
        present: v.present,
        absent:  v.absent,
        late:    v.late,
      }))

    // Monthly data (last 6 months)
    const monthlyMap = new Map<string, { present: number; absent: number }>()
    for (const r of records) {
      const key = r.date.toISOString().slice(0, 7)
      if (!monthlyMap.has(key)) monthlyMap.set(key, { present: 0, absent: 0 })
      const m = monthlyMap.get(key)!
      if (r.status === 'PRESENT' || r.status === 'LATE_PRESENT' || r.status === 'EXCUSED') m.present++
      else m.absent++
    }
    const monthlyData = Array.from(monthlyMap.entries())
      .sort(([a],[b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, v]) => ({
        month:   new Date(key + '-01').toLocaleDateString('en-IN', { month: 'short' }),
        key,
        present: v.present,
        absent:  v.absent,
      }))

    res.json({
      success: true,
      data: {
        totalDays, presentDays, lateDays, absentDays, excusedDays, percentage,
        weeklyData, monthlyData,
      },
    })
  } catch (err) { next(err) }
}
