import api from './api'
import type {
  ApiResponse,
  AttendanceStatusResponse,
  LocationVerificationResult,
  AttendanceRecord,
  AttendanceSummary,
} from '@/types'

export const attendanceService = {
  async getStatus(): Promise<ApiResponse<AttendanceStatusResponse>> {
    const res = await api.get('/attendance/status')
    return res.data
  },

  /** Backend polygon geofence check — returns HOSTEL / COLLEGE / OUTSIDE */
  async verifyLocation(
    latitude: number,
    longitude: number,
    gpsAccuracy?: number
  ): Promise<ApiResponse<LocationVerificationResult>> {
    const res = await api.post('/attendance/verify-location', { latitude, longitude, gpsAccuracy })
    return res.data
  },

  /** Submit attendance: multipart/form-data with GPS + gpsAccuracy + photo */
  async submitAttendance(payload: {
    latitude: number
    longitude: number
    gpsAccuracy?: number
    photoBlob?: Blob
    photoMime?: string
  }): Promise<ApiResponse<AttendanceRecord>> {
    const form = new FormData()
    form.append('latitude',    String(payload.latitude))
    form.append('longitude',   String(payload.longitude))
    if (typeof payload.gpsAccuracy === 'number') {
      form.append('gpsAccuracy', String(payload.gpsAccuracy))
    }
    if (payload.photoBlob) {
      const ext = payload.photoMime === 'image/png' ? 'png' : 'jpg'
      form.append('photo', payload.photoBlob, `attendance.${ext}`)
    }
    const res = await api.post('/attendance/submit', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  async getHistory(page = 1, limit = 30): Promise<ApiResponse<{
    records: AttendanceRecord[]
    total: number
    totalPages: number
    page: number
  }>> {
    const res = await api.get('/attendance/history', { params: { page, limit } })
    return res.data
  },

  async getSummary(): Promise<ApiResponse<AttendanceSummary>> {
    const res = await api.get('/attendance/summary')
    return res.data
  },
}
