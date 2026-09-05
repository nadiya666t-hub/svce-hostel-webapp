/**
 * useAttendance — hook for Wi-Fi network-based attendance system.
 *
 * GPS geofencing has been replaced by server-side IP/network range verification.
 * The backend checks if the client's IP belongs to the hostel Wi-Fi (172.16.0.0/20).
 *
 * Camera is enabled only when:
 *   1. Attendance window is OPEN (server time)
 *   2. Student is connected to approved hostel Wi-Fi (server IP check)
 *   3. Attendance not already marked today
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { attendanceService } from '@/services/attendanceService'
import type { NetworkVerificationResult } from '@/services/attendanceService'
import type {
  AttendanceStatusResponse,
  AttendanceSummary,
  AttendanceRecord,
  WindowState,
} from '@/types'

// ─── Public types ─────────────────────────────────────────────────────────────

export type CameraState = 'locked' | 'capturing' | 'preview' | 'submitting' | 'done'
export type NetworkLocation = 'HOSTEL' | 'COLLEGE' | 'OUTSIDE' | 'UNKNOWN' | null

export interface NetworkState {
  checking:  boolean
  result:    NetworkVerificationResult | null
  location:  NetworkLocation
  verified:  boolean
  error:     string | null
  message:   string | null
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAttendance() {

  // Server status
  const [status,        setStatus]        = useState<AttendanceStatusResponse | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [statusError,   setStatusError]   = useState<string | null>(null)

  // Network / Wi-Fi state (replaces GPS)
  const [network, setNetwork] = useState<NetworkState>({
    checking:  false,
    result:    null,
    location:  null,
    verified:  false,
    error:     null,
    message:   null,
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

        // If status includes network verification result, update network state
        if (res.data.networkVerification) {
          const nv = res.data.networkVerification as NetworkVerificationResult
          setNetwork(n => ({
            ...n,
            location: nv.location as NetworkLocation,
            verified: nv.verified,
            message:  nv.message,
            result:   nv as NetworkVerificationResult,
          }))
        }
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

  // ── Live IST clock ─────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => setCurrentTime(new Date()), 1_000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  // ── Auto-check network when window opens ───────────────────────────────────
  useEffect(() => {
    const ws = status?.windowState
    if (ws === 'OPEN' && prevWindowStateRef.current !== 'OPEN' && !network.checking) {
      checkNetwork()
    }
    prevWindowStateRef.current = ws ?? null
  }, [status?.windowState]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Network verification (calls backend IP check) ─────────────────────────
  const checkNetwork = useCallback(async () => {
    setNetwork(n => ({ ...n, checking: true, error: null }))
    try {
      const res = await attendanceService.verifyNetwork()
      if (res.success && res.data) {
        setNetwork({
          checking:  false,
          result:    res.data,
          location:  res.data.location as NetworkLocation,
          verified:  res.data.verified,
          error:     null,
          message:   res.data.message,
        })
      } else {
        setNetwork(n => ({ ...n, checking: false, error: res.message ?? 'Network check failed.' }))
      }
    } catch {
      setNetwork(n => ({ ...n, checking: false, error: 'Unable to verify network with server.' }))
    }
  }, [])

  // ── Camera open gate ───────────────────────────────────────────────────────
  const canOpenCamera = useCallback((): { allowed: boolean; reason: string } => {
    if (!status) return { allowed: false, reason: 'Loading…' }
    if (status.alreadyMarked || submitSuccess)
      return { allowed: false, reason: 'Attendance already marked for today.' }
    if (status.windowState === 'NO_WINDOW')
      return { allowed: false, reason: 'The attendance camera opens every day from 8:30 PM to 9:00 PM.' }
    if (status.windowState === 'BEFORE')
      return { allowed: false, reason: `Attendance opens at ${status.window?.startTime ?? '8:30 PM'} IST.` }
    if (status.windowState === 'CLOSED')
      return { allowed: false, reason: "Today's attendance window has closed." }
    // Window is OPEN — check network
    if (network.checking)
      return { allowed: false, reason: 'Verifying Wi-Fi connection…' }
    if (!network.result)
      return { allowed: false, reason: 'Connect to SVCE-GH hostel Wi-Fi to mark attendance.' }
    if (!network.verified)
      return { allowed: false, reason: network.message ?? 'Connect to SVCE-GH hostel Wi-Fi to mark attendance.' }
    return { allowed: true, reason: '' }
  }, [status, network, submitSuccess])

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
    if (!capturedPhoto) { setSubmitError('Please take a photo first.'); return }
    setCameraState('submitting')
    setSubmitError(null)
    try {
      const res = await attendanceService.submitAttendance({
        photoBlob: capturedPhoto.blob,
        photoMime: capturedPhoto.mime,
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
  }, [capturedPhoto, fetchStatus]) // eslint-disable-line react-hooks/exhaustive-deps

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

  function windowStateLabel(ws: WindowState | undefined): string {
    if (!ws) return '—'
    if (ws === 'BEFORE')   return 'Not yet open'
    if (ws === 'OPEN')     return 'Open now'
    if (ws === 'CLOSED')   return 'Closed'
    return 'No window today'
  }

  return {
    status, statusLoading, statusError, fetchStatus,
    currentTime,
    // network (replaces GPS)
    network, checkNetwork,
    // legacy GPS aliases (for backward compat with existing UI components)
    gps: {
      permission:       network.verified ? 'granted' : 'unknown',
      coords:           null,
      accuracy:         null,
      error:            network.error,
      checking:         network.checking,
      result:           network.result ? {
        verified:             network.verified,
        verifiedLocation:     network.location ?? 'OUTSIDE',
        hostelDistanceMeters: 0,
        collegeDistanceMeters: 0,
        maxAccuracyMeters:    0,
        gpsAccuracyTooLow:    false,
        message:              network.message ?? '',
      } : null,
      verifiedLocation: network.location ?? null,
    },
    requestLocation: checkNetwork,
    cameraState, setCameraState,
    capturedPhoto, setPhoto, retakePhoto,
    canOpenCamera,
    submitAttendance, submitError, submitSuccess,
    summary, history, historyTotal, historyPage, historyLoading, loadHistory,
    windowStateLabel,
    // Legacy compat
    location: {
      permission: network.verified ? 'granted' : 'unknown',
      coords:     null,
      error:      network.error,
      checking:   network.checking,
      result:     network.result ? { verified: network.verified, distance: 0, radiusMeters: 0, message: network.message ?? '' } : null,
    },
  }
}
