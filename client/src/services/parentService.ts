import api from './api'
import type { ApiResponse } from '@/types'

const parentApi = api  // same axios instance; parent JWT is stored under hms_parent_token

export const parentService = {
  async login(usn: string, password: string): Promise<ApiResponse<{ token: string; user: ParentAuthUser }>> {
    const res = await parentApi.post('/parent/auth/login', { usn, password })
    return res.data
  },

  async checkUsn(usn: string): Promise<ApiResponse<{ exists: boolean }>> {
    const res = await parentApi.get(`/parent/auth/check-usn/${encodeURIComponent(usn)}`)
    return res.data
  },

  async getStudent(): Promise<ApiResponse<ParentStudentData>> {
    const res = await parentApi.get('/parent/student', { headers: parentAuthHeader() })
    return res.data
  },

  async getFees(): Promise<ApiResponse<ParentFeeData | null>> {
    const res = await parentApi.get('/parent/fees', { headers: parentAuthHeader() })
    return res.data
  },

  async getTodayAttendance(): Promise<ApiResponse<ParentTodayAttendance>> {
    const res = await parentApi.get('/parent/attendance/today', { headers: parentAuthHeader() })
    return res.data
  },

  async getAttendanceHistory(page = 1, limit = 30): Promise<ApiResponse<{ records: ParentAttendanceRecord[]; total: number; totalPages: number; page: number }>> {
    const res = await parentApi.get('/parent/attendance/history', { params: { page, limit }, headers: parentAuthHeader() })
    return res.data
  },

  async getOutgoing(page = 1): Promise<ApiResponse<{ records: ParentOutgoingRecord[]; total: number; totalPages: number }>> {
    const res = await parentApi.get('/parent/outgoing', { params: { page, limit: 20 }, headers: parentAuthHeader() })
    return res.data
  },

  async getEmergencyContacts(): Promise<ApiResponse<ParentEmergencyContact[]>> {
    const res = await parentApi.get('/parent/emergency-contacts', { headers: parentAuthHeader() })
    return res.data
  },

  persistAuth(token: string, user: ParentAuthUser) {
    localStorage.setItem('hms_parent_token', token)
    localStorage.setItem('hms_parent_user', JSON.stringify(user))
  },

  logout() {
    localStorage.removeItem('hms_parent_token')
    localStorage.removeItem('hms_parent_user')
  },

  getToken(): string | null { return localStorage.getItem('hms_parent_token') },

  getPersistedUser(): ParentAuthUser | null {
    try { return JSON.parse(localStorage.getItem('hms_parent_user') ?? 'null') } catch { return null }
  },
}

function parentAuthHeader() {
  const t = localStorage.getItem('hms_parent_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export interface ParentAuthUser { id: string; usn: string; name: string; role: 'PARENT' }

export interface ParentStudentData {
  id: string; usn: string; name: string; email?: string; phone?: string
  course?: string; branch?: string; admissionYear?: number; gender?: string
  bloodGroup?: string; floorNumber: string; roomNumber: string
  academicYear: string; yearNumber: number; year: string; semester: string
  semesterStartDate?: string; semesterEndDate?: string; status: string; photoUrl?: string
}

export interface ParentFeeData {
  id: string; academicYear: string; totalAmount: number; paidAmount: number
  pendingAmount: number; dueDate: string
  payments: { id: string; amount: number; date: string; reference: string; status: string }[]
}

export interface ParentTodayAttendance {
  date: string; windowStart: string; windowEnd: string
  attendance: { status: string; markedAt: string; locationType: string } | null
}

export interface ParentAttendanceRecord {
  id: string; date: string; markedAt: string; status: string; locationType: string
}

export interface ParentOutgoingRecord {
  id: string; type: string; fromDate: string; toDate: string
  reason: string; destination?: string; status: string; reviewNote?: string; createdAt: string
}

export interface ParentEmergencyContact {
  id: string; name: string; designation: string; phone: string; email?: string; category: string
}
