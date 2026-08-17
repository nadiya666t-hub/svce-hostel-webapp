import { useState, useEffect, useCallback, useRef } from 'react'
import { attendanceService } from '@/services/attendanceService'
import type {
  AttendanceStatusResponse,
  LocationVerificationResult,
  AttendanceSummary,
  AttendanceRecord,
  WindowState,
} from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PermissionState = 'unknown' | 'requesting' | 'granted' | 'denied'
export type CameraState = 'locked' | 'unlocked' | 'capturing' | 'preview' | 'submitting' | 'done'

export interface LocationState {
  permission: PermissionState
  coords: GeolocationCoordinates | null
  error: string | null
  checking: boolean
  result: LocationVerificationResult | null
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAttendance() {
  // Server status
  const [status, setStatus] = useState<AttendanceStatusResponse | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [statusError, setStatusError] = useState<string | null>(null)

  // Location
  const [location, setLocation] = useState<LocationState>({
    permission: 'unknown',
    coords: null,
    error: null,
    checking: false,
    result: null,
  })

  // Camera
  const [cameraState, setCameraState] = useState<CameraState>('locked')
  const [capturedPhoto, setCapturedPhoto] = useState<{ blob: Blob; url: string; mime: string } | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Summary + history
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  const [history, setHistory] = useState<AttendanceRecord[]>([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyLoading, setHistoryLoading] = useState(false)

  // Live IST clock
  const [currentTime, setCurrentTime] = useState(new Date())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Fetch server status ─────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    setStatusLoading(true)
    setStatusError(null)
    try {
      const res = await attendanceService.getStatus()
      if (res.success && res.data) {
        setStatus(res.data)
        // If already marked, camera is done
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
    // Refresh status every 60 seconds to keep window state current
    const interval = setInterval(fetchStatus, 60_000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  // ── Live clock ──────────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // ── Location permission + GPS ───────────────────────────────────────────────
  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocation((l) => ({ ...l, error: 'Geolocation is not supported by this browser.', permission: 'denied' }))
      return
    }
    setLocation((l) => ({ ...l, permission: 'requesting', checking: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setLocation((l) => ({ ...l, coords: pos.coords, permission: 'granted' }))

        // Verify against backend geofence
        try {
          const res = await attendanceService.verifyLocation(latitude, longitude)
          if (res.success && res.data) {
            setLocation((l) => ({ ...l, result: res.data!, checking: false }))
          } else {
            setLocation((l) => ({ ...l, result: null, checking: false, error: res.message ?? 'Location check failed.' }))
          }
        } catch {
          setLocation((l) => ({ ...l, checking: false, error: 'Unable to verify location with server.' }))
        }
      },
      (err) => {
        const msg =
          err.code === 1 ? 'Location permission denied. Please allow location access.'
          : err.code === 2 ? 'Location unavailable. Check your GPS.'
          : 'Location request timed out.'
        setLocation((l) => ({ ...l, permission: 'denied', checking: false, error: msg }))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [])

  // ── Computed: can camera open? ──────────────────────────────────────────────
  const canOpenCamera = useCallback((): { allowed: boolean; reason: string } => {
    if (!status) return { allowed: false, reason: 'Loading attendance status…' }
    if (status.alreadyMarked || submitSuccess) return { allowed: false, reason: 'Attendance already marked for today.' }
    if (status.windowState === 'NO_WINDOW') return { allowed: false, reason: 'No attendance window configured for today.' }
    if (status.windowState === 'BEFORE')
      return { allowed: false, reason: `Attendance opens at ${status.window?.startTime ?? '20:30'} IST.` }
    if (status.windowState === 'CLOSED')
      return { allowed: false, reason: "Today's attendance window has closed." }
    if (location.permission === 'denied') return { allowed: false, reason: 'Location permission denied.' }
    if (location.checking) return { allowed: false, reason: 'Verifying your location…' }
    if (!location.result?.verified) return { allowed: false, reason: location.result ? `You are ${location.result.distance} m away. Must be within ${location.result.radiusMeters} m of the hostel.` : 'Location not yet verified.' }
    return { allowed: true, reason: '' }
  }, [status, location, submitSuccess])

  // ── Photo capture ───────────────────────────────────────────────────────────
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

  // ── Submit attendance ───────────────────────────────────────────────────────
  const submitAttendance = useCallback(async () => {
    if (!location.coords) { setSubmitError('No GPS coordinates.'); return }
    setCameraState('submitting')
    setSubmitError(null)
    try {
      const res = await attendanceService.submitAttendance({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        photoBlob: capturedPhoto?.blob,
        photoMime: capturedPhoto?.mime,
      })
      if (res.success) {
        setSubmitSuccess(true)
        setCameraState('done')
        if (capturedPhoto) URL.revokeObjectURL(capturedPhoto.url)
        // Refresh status to show today's record
        await fetchStatus()
        // Refresh summary
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
  }, [location.coords, capturedPhoto, fetchStatus])

  // ── Load summary ────────────────────────────────────────────────────────────
  const loadSummary = useCallback(async () => {
    try {
      const res = await attendanceService.getSummary()
      if (res.success && res.data) setSummary(res.data)
    } catch { /* silent */ }
  }, [])

  useEffect(() => { loadSummary() }, [loadSummary])

  // ── Load history ────────────────────────────────────────────────────────────
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

  // ── Derive window state label ───────────────────────────────────────────────
  function windowStateLabel(ws: WindowState | undefined): string {
    if (!ws) return '—'
    if (ws === 'BEFORE') return 'Not yet open'
    if (ws === 'OPEN') return 'Open now'
    if (ws === 'CLOSED') return 'Closed'
    return 'No window today'
  }

  return {
    // status
    status, statusLoading, statusError, fetchStatus,
    // clock
    currentTime,
    // location
    location, requestLocation,
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
  }
}
