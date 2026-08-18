import api from './api'
import type {
  ApiResponse,
  AttendanceStatusResponse,
  LocationVerificationResult,
  AttendanceRecord,
  AttendanceSummary,
} from '@/types'

export const attendanceService = {
  /**
   * GET /api/attendance/status
   * Returns server time, today's window, already-marked flag.
   */
  async getStatus(): Promise<ApiResponse<AttendanceStatusResponse>> {
    const res = await api.get('/attendance/status')
    return res.data
  },

  /**
   * POST /api/attendance/verify-location
   * Backend checks whether coords are inside the hostel geofence.
   */
  async verifyLocation(
    latitude: number,
    longitude: number
  ): Promise<ApiResponse<LocationVerificationResult>> {
    const res = await api.post('/attendance/verify-location', { latitude, longitude })
    return res.data
  },

  /**
   * POST /api/attendance/submit
   * Submits attendance with GPS + optional photo blob.
   */
  async submitAttendance(payload: {
    latitude: number
    longitude: number
    photoBlob?: Blob
    photoMime?: string
  }): Promise<ApiResponse<AttendanceRecord>> {
    const form = new FormData()
    form.append('latitude', String(payload.latitude))
    form.append('longitude', String(payload.longitude))
    if (payload.photoBlob) {
      const ext = payload.photoMime === 'image/png' ? 'png' : 'jpg'
      form.append('photo', payload.photoBlob, `attendance.${ext}`)
    }
    const res = await api.post('/attendance/submit', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  /**
   * GET /api/attendance/history?page=&limit=
   */
  async getHistory(
    page = 1,
    limit = 30
  ): Promise<ApiResponse<{ records: AttendanceRecord[]; total: number; totalPages: number; page: number }>> {
    const res = await api.get('/attendance/history', { params: { page, limit } })
    return res.data
  },

  /**
   * GET /api/attendance/summary
   */
  async getSummary(): Promise<ApiResponse<AttendanceSummary>> {
    const res = await api.get('/attendance/summary')
    return res.data
  },
}
