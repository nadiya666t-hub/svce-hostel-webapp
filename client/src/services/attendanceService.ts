import api from './api'
import type {
  ApiResponse,
  AttendanceStatusResponse,
  AttendanceSummary,
  AttendanceRecord,
} from '@/types'

export interface NetworkVerificationResult {
  location:       'HOSTEL' | 'COLLEGE' | 'OUTSIDE' | 'UNKNOWN'
  verified:       boolean
  clientIp:       string | null
  message:        string
  hostelNetwork:  string
  collegeNetwork: string | null
}

export const attendanceService = {
  async getStatus(): Promise<ApiResponse<AttendanceStatusResponse>> {
    const res = await api.get('/attendance/status')
    return res.data
  },

  /** Backend network/IP-range check — returns HOSTEL / COLLEGE / OUTSIDE / UNKNOWN */
  async verifyNetwork(): Promise<ApiResponse<NetworkVerificationResult>> {
    const res = await api.post('/attendance/verify-network', {})
    return res.data
  },

  /** Backwards-compat alias for verifyNetwork */
  async verifyLocation(
    _latitude?: number,
    _longitude?: number,
    _gpsAccuracy?: number
  ): Promise<ApiResponse<NetworkVerificationResult>> {
    return this.verifyNetwork()
  },

  /** Submit attendance: multipart/form-data with photo only (no GPS needed) */
  async submitAttendance(payload: {
    photoBlob?: Blob
    photoMime?: string
    // GPS fields accepted but ignored (no longer used for auth)
    latitude?: number
    longitude?: number
    gpsAccuracy?: number
  }): Promise<ApiResponse<AttendanceRecord>> {
    const form = new FormData()
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
