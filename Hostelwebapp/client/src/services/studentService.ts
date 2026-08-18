import api from './api'
import type {
  ApiResponse, Student, FeeRecord,
  StudentRequest, StudentProblem,
  Notice, Notification, EntryExitRecord,
  RequestType, ProblemCategory,
} from '@/types'

// ─── Profile ─────────────────────────────────────────────────────────────────
export const studentService = {

  async getProfile(): Promise<ApiResponse<Student>> {
    const r = await api.get('/students/me')
    return r.data
  },

  // ─── Fees ───────────────────────────────────────────────────────────────────
  async getCurrentFees(): Promise<ApiResponse<FeeRecord | null>> {
    const r = await api.get('/students/me/fees/current')
    return r.data
  },

  // ─── Requests ───────────────────────────────────────────────────────────────
  async getRequests(page = 1, limit = 10, status?: string): Promise<ApiResponse<{ data: StudentRequest[]; total: number; totalPages: number }>> {
    const r = await api.get('/requests', { params: { page, limit, ...(status ? { status } : {}) } })
    return r.data
  },

  async createRequest(payload: {
    type: RequestType
    fromDate: string
    toDate: string
    reason: string
    destination?: string
    additionalDetails?: string
  }): Promise<ApiResponse<StudentRequest>> {
    const r = await api.post('/requests', payload)
    return r.data
  },

  // ─── Problems ───────────────────────────────────────────────────────────────
  async getProblems(page = 1, limit = 10, status?: string): Promise<ApiResponse<{ data: StudentProblem[]; total: number; totalPages: number }>> {
    const r = await api.get('/problems', { params: { page, limit, ...(status ? { status } : {}) } })
    return r.data
  },

  async createProblem(payload: {
    category: ProblemCategory
    description: string
    photo?: File
  }): Promise<ApiResponse<StudentProblem>> {
    const form = new FormData()
    form.append('category', payload.category)
    form.append('description', payload.description)
    if (payload.photo) form.append('photo', payload.photo)
    const r = await api.post('/problems', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    return r.data
  },

  // ─── Notices ────────────────────────────────────────────────────────────────
  async getNotices(page = 1, limit = 20): Promise<ApiResponse<{ data: Notice[]; total: number; totalPages: number }>> {
    const r = await api.get('/notices', { params: { page, limit } })
    return r.data
  },

  // ─── Notifications ───────────────────────────────────────────────────────────
  async getNotifications(page = 1, limit = 20): Promise<ApiResponse<{ data: Notification[]; total: number; totalPages: number; unreadCount: number }>> {
    const r = await api.get('/notifications', { params: { page, limit } })
    return r.data
  },

  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    const r = await api.get('/notifications/unread-count')
    return r.data
  },

  async markNotificationRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`)
  },

  async markAllNotificationsRead(): Promise<void> {
    await api.patch('/notifications/read-all')
  },

  // ─── Entry / Exit ────────────────────────────────────────────────────────────
  async getEntryExit(page = 1, limit = 20): Promise<ApiResponse<{ data: EntryExitRecord[]; total: number; totalPages: number }>> {
    const r = await api.get('/entry-exit', { params: { page, limit } })
    return r.data
  },

  // ─── Emergency Contacts ──────────────────────────────────────────────────────
  async getEmergencyContacts(): Promise<ApiResponse<EmergencyContact[]>> {
    const r = await api.get('/emergency-contacts')
    return r.data
  },
}

export interface EmergencyContact {
  id: string
  name: string
  designation: string
  phone: string
  email?: string
  category: string
  sortOrder: number
}
