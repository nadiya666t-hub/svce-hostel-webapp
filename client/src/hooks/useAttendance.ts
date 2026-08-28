/**
 * useAttendance — central hook for the location-based attendance system.
 *
 * State machine:
 *   BEFORE_WINDOW → window not open yet
 *   WINDOW_ACTIVE_CHECKING_LOCATION → window open, getting GPS
 *   GPS_PERMISSION_REQUIRED → user denied location
 *   GPS_ACCURACY_LOW → accuracy > maxGpsAccuracyMeters
 *   OUTSIDE_GEOFENCE → inside time window but outside both polygons
 *   HOSTEL_VERIFIED → inside hostel polygon ✓
 *   COLLEGE_VERIFIED → inside college polygon ✓
 *   CAMERA_READY → location OK, camera can open
 *   CAPTURED → photo taken, ready to submit
 *   SUBMITTED → submitted to server
 *   ALREADY_MARKED → already submitted today
 *   WINDOW_CLOSED → after 8:40 PM
 *   ERROR → generic error
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { attendanceService } from '@/services/attendanceService'
import type {
  AttendanceStatusResponse,
  LocationVerificationResult,
  AttendanceSummary,
  AttendanceRecord,
  WindowState,
} from '@/types'

// ─── Public types ─────────────────────────────────────────────────────────────

export type AttendancePageState =
  | 'BEFORE_WINDOW'
  | 'WINDOW_ACTIVE_CHECKING_LOCATION'
  | 'GPS_PERMISSION_REQUIRED'
  | 'GPS_ACCURACY_LOW'
  | 'OUTSIDE_GEOFENCE'
  | 'HOSTEL_VERIFIED'
  | 'COLLEGE_VERIFIED'
  | 'CAMERA_READY'
  | 'CAPTURED'
  | 'SUBMITTED'
  | 'ALREADY_MARKED'
  | 'WINDOW_CLOSED'
  | 'NO_WINDOW'
  | 'ERROR'
  | 'LOADING'

export type PermissionState = 'unknown' | 'requesting' | 'granted' | 'denied'
export type CameraState = 'locked' | 'unlocked' | 'capturing' | 'preview' | 'submitting' | 'done'
export type VerifiedLocation = 'HOSTEL' | 'COLLEGE' | 'OUTSIDE' | null

export interface GPSState {
  permission:   PermissionState
  coords:       GeolocationCoordinates | null
  accuracy:     number | null          // metres
  error:        string | null
  checking:     boolean
  result:       LocationVerificationResult | null
  verifiedLocation: VerifiedLocation
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAttendance() {

  // Server status
  const [status,        setStatus]        = useState<AttendanceStatusResponse | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [statusError,   setStatusError]   = useState<string | null>(null)

  // GPS
  const [gps, setGps] = useState<GPSState>({
    permission: 'unknown',
    coords:     null,
    accuracy:   null,
    error:      null,
    checking:   false,
    result:     null,
    verifiedLocation: null,
  })

  // Camera
  const [cameraState,   setCameraState]   = useState<CameraState>('locked')
  const [capturedPhoto, setCapturedPhoto] = useState<{ blob: Blob; url: string; mime: string } | null>(null)
  const [submitError,   setSubmitError]   = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Summary + history
  const [summary,        setSummary]        = useState<AttendanceSummary | null>(null)
  const [history,        setHistory]        = useState<AttendanceRecord[]>([])
  const [historyTotal,   setHistoryTotal]   = useState(0)
  const [historyPage,    setHistoryPage]    = useState(1)
  const [historyLoading, setHistoryLoading] = useState(false)

  // Live IST clock
  const [currentTime, setCurrentTime] = useState(new Date())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Track previous window state to auto-trigger location check when window opens
  const prevWindowStateRef = useRef<WindowState | null>(null)

  // ── Fetch server status ─────────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true)
    setStatusError(null)
    try {
      const res = await attendanceService.getStatus()
      if (res.success && res.data) {
        setStatus(res.data)
        if (res.data.alreadyMarked) setCameraState('done')
      } else {
        setStatusError(res.message ?? 'Failed to load attendance status.')
      }
    } catch {
      setStatusError('Unable to connect to server.')
    } finally {
      setStatusLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 60_000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  // ── Live IST clock (every second) ─────────────────────────────────────────

  useEffect(() => {
    timerRef.current = setInterval(() => setCurrentTime(new Date()), 1_000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  // ── Auto-request location when window opens ────────────────────────────────

  useEffect(() => {
    const ws = status?.windowState
    if (
      ws === 'OPEN' &&
      prevWindowStateRef.current !== 'OPEN' &&
      gps.permission === 'unknown' &&
      !gps.checking
    ) {
      requestLocation()
    }
    prevWindowStateRef.current = ws ?? null
  }, [status?.windowState]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Request GPS location ───────────────────────────────────────────────────

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setGps(g => ({ ...g, permission: 'denied', error: 'Geolocation is not supported by this browser.' }))
      return
    }
    setGps(g => ({ ...g, permission: 'requesting', checking: true, error: null, result: null, verifiedLocation: null }))

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        setGps(g => ({ ...g, coords: pos.coords, accuracy, permission: 'granted' }))

        // Send to backend — backend does polygon check
        try {
          const res = await attendanceService.verifyLocation(latitude, longitude, accuracy)
          if (res.success && res.data) {
            setGps(g => ({
              ...g,
              result: res.data!,
              verifiedLocation: res.data!.verifiedLocation,
              checking: false,
            }))
          } else {
            setGps(g => ({ ...g, result: null, verifiedLocation: null, checking: false, error: res.message ?? 'Location check failed.' }))
          }
        } catch {
          setGps(g => ({ ...g, checking: false, error: 'Unable to verify location with server.' }))
        }
      },
      (err) => {
        const msg =
          err.code === 1 ? 'Location permission denied. Please allow location access in your browser.'
          : err.code === 2 ? 'Location unavailable. Check your GPS is enabled.'
          : 'Location request timed out. Please try again.'
        setGps(g => ({ ...g, permission: 'denied', checking: false, error: msg }))
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 }
    )
  }, [])

  // ── Derived page state ─────────────────────────────────────────────────────

  const pageState: AttendancePageState = (() => {
    if (statusLoading && !status) return 'LOADING'
    if (statusError)              return 'ERROR'
    if (!status)                  return 'LOADING'
    if (status.alreadyMarked || submitSuccess) return 'ALREADY_MARKED'

    const ws = status.windowState
    if (ws === 'NO_WINDOW') return 'NO_WINDOW'
    if (ws === 'BEFORE')    return 'BEFORE_WINDOW'
    if (ws === 'CLOSED')    return 'WINDOW_CLOSED'

    // Window is OPEN — check location
    if (gps.permission === 'denied')   return 'GPS_PERMISSION_REQUIRED'
    if (gps.checking || gps.permission === 'requesting' || gps.permission === 'unknown') return 'WINDOW_ACTIVE_CHECKING_LOCATION'

    if (gps.result?.gpsAccuracyTooLow) return 'GPS_ACCURACY_LOW'

    const loc = gps.verifiedLocation
    if (loc === 'HOSTEL')  return cameraState === 'locked' || cameraState === 'unlocked' ? 'HOSTEL_VERIFIED' : cameraState === 'done' ? 'SUBMITTED' : 'HOSTEL_VERIFIED'
    if (loc === 'COLLEGE') return cameraState === 'locked' || cameraState === 'unlocked' ? 'COLLEGE_VERIFIED' : cameraState === 'done' ? 'SUBMITTED' : 'COLLEGE_VERIFIED'
    if (loc === 'OUTSIDE') return 'OUTSIDE_GEOFENCE'

    return 'WINDOW_ACTIVE_CHECKING_LOCATION'
  })()

  // Camera open gate
  const canOpenCamera = useCallback((): { allowed: boolean; reason: string } => {
    if (!status) return { allowed: false, reason: 'Loading…' }
    if (status.alreadyMarked || submitSuccess) return { allowed: false, reason: 'Attendance already marked for today.' }
    if (status.windowState === 'NO_WINDOW') return { allowed: false, reason: 'The attendance camera will open every day from 8:30 PM to 8:40 PM.' }
    if (status.windowState === 'BEFORE')    return { allowed: false, reason: `Attendance opens at ${status.window?.startTime ?? '8:30 PM'} IST tonight.` }
    if (status.windowState === 'CLOSED')    return { allowed: false, reason: "Today's attendance window was from 8:30 PM to 8:40 PM." }
    if (gps.permission === 'denied')        return { allowed: false, reason: 'Location permission is required for attendance.' }
    if (gps.checking)                       return { allowed: false, reason: 'Verifying your location…' }
    if (gps.result?.gpsAccuracyTooLow)      return { allowed: false, reason: `GPS accuracy too low (${Math.round(gps.accuracy ?? 0)} m). Enable precise location.` }
    if (!gps.result)                        return { allowed: false, reason: 'Location not yet verified. Tap "Check Location".' }
    if (gps.verifiedLocation === 'OUTSIDE') return { allowed: false, reason: 'You are outside both the hostel and college attendance areas.' }
    if (gps.verifiedLocation === 'HOSTEL' || gps.verifiedLocation === 'COLLEGE') return { allowed: true, reason: '' }
    return { allowed: false, reason: 'Location not yet verified.' }
  }, [status, gps, submitSuccess])

  // ── Photo capture ──────────────────────────────────────────────────────────

  const setPhoto = useCallback((blob: Blob, mime: string) => {
    const url = URL.createObjectURL(blob)
    setCapturedPhoto({ blob, url, mime })
    setCameraState('preview')
  }, [])

  const retakePhoto = useCallback(() => {
    if (capturedPhoto) URL.revokeObjectURL(capturedPhoto.url)
    setCapturedPhoto(null)
    setCameraState('capturing')
  }, [capturedPhoto])

  // ── Submit attendance ──────────────────────────────────────────────────────

  const submitAttendance = useCallback(async () => {
    if (!gps.coords) { setSubmitError('No GPS coordinates.'); return }
    setCameraState('submitting')
    setSubmitError(null)
    try {
      const res = await attendanceService.submitAttendance({
        latitude:    gps.coords.latitude,
        longitude:   gps.coords.longitude,
        gpsAccuracy: gps.accuracy ?? undefined,
        photoBlob:   capturedPhoto?.blob,
        photoMime:   capturedPhoto?.mime,
      })
      if (res.success) {
        setSubmitSuccess(true)
        setCameraState('done')
        if (capturedPhoto) URL.revokeObjectURL(capturedPhoto.url)
        await fetchStatus()
        loadSummary()
      } else {
        setSubmitError(res.message ?? 'Submission failed.')
        setCameraState('preview')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setSubmitError(msg ?? 'Submission failed. Please try again.')
      setCameraState('preview')
    }
  }, [gps.coords, gps.accuracy, capturedPhoto, fetchStatus])

  // ── Summary + history ──────────────────────────────────────────────────────

  const loadSummary = useCallback(async () => {
    try {
      const res = await attendanceService.getSummary()
      if (res.success && res.data) setSummary(res.data)
    } catch { /* silent */ }
  }, [])

  useEffect(() => { loadSummary() }, [loadSummary])

  const loadHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true)
    try {
      const res = await attendanceService.getHistory(page, 30)
      if (res.success && res.data) {
        const incoming = res.data.records
        setHistory(page === 1 ? incoming : (prev) => [...prev, ...incoming])
        setHistoryTotal(res.data.total)
        setHistoryPage(page)
      }
    } catch { /* silent */ } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => { loadHistory(1) }, [loadHistory])

  // ── Window state label ─────────────────────────────────────────────────────

  function windowStateLabel(ws: WindowState | undefined): string {
    if (!ws) return '—'
    if (ws === 'BEFORE')    return 'Not yet open'
    if (ws === 'OPEN')      return 'Open now'
    if (ws === 'CLOSED')    return 'Closed'
    return 'No window today'
  }

  return {
    // status
    status, statusLoading, statusError, fetchStatus,
    // clock
    currentTime,
    // gps
    gps, requestLocation,
    // page state machine
    pageState,
    // camera
    cameraState, setCameraState,
    capturedPhoto, setPhoto, retakePhoto,
    canOpenCamera,
    // submit
    submitAttendance, submitError, submitSuccess,
    // summary + history
    summary, history, historyTotal, historyPage, historyLoading, loadHistory,
    // helpers
    windowStateLabel,

    // Legacy compatibility (for existing attendance page)
    location: {
      permission:   gps.permission,
      coords:       gps.coords,
      error:        gps.error,
      checking:     gps.checking,
      result: gps.result ? {
        verified:      gps.verifiedLocation !== 'OUTSIDE' && gps.verifiedLocation !== null,
        distance:      gps.result.hostelDistanceMeters,
        radiusMeters:  gps.result.maxAccuracyMeters,
        message:       gps.result.message,
      } : null,
    },
  }
}
