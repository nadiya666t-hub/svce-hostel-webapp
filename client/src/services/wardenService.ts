import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/warden` : '/api/warden'

const wardenApi = axios.create({ baseURL: BASE, timeout: 15000 })

wardenApi.interceptors.request.use(cfg => {
  const token = localStorage.getItem('hms_warden_token')
  if (token && cfg.headers) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

wardenApi.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('hms_warden_token')
      localStorage.removeItem('hms_warden_user')
      window.location.href = '/warden/login'
    }
    return Promise.reject(err)
  }
)

export interface WardenUser {
  id: string; wardenId: string; name: string
  designation: string; email: string | null; phone: string | null; role: string
}

export const wardenService = {
  async login(wardenId: string, password: string) {
    const res = await wardenApi.post('/auth/login', { wardenId, password })
    return res.data
  },
  persistAuth(token: string, warden: WardenUser) {
    localStorage.setItem('hms_warden_token', token)
    localStorage.setItem('hms_warden_user', JSON.stringify(warden))
  },
  logout() {
    localStorage.removeItem('hms_warden_token')
    localStorage.removeItem('hms_warden_user')
  },
  getToken() { return localStorage.getItem('hms_warden_token') },
  getPersistedUser(): WardenUser | null {
    try { return JSON.parse(localStorage.getItem('hms_warden_user') ?? 'null') } catch { return null }
  },

  // Dashboard
  async getDashboardStats()   { const r = await wardenApi.get('/dashboard/stats'); return r.data },
  // Profile
  async getProfile()                 { const r = await wardenApi.get('/profile'); return r.data },
  async changePassword(currentPassword: string, newPassword: string) {
    const r = await wardenApi.post('/profile/change-password', { currentPassword, newPassword }); return r.data
  },
  // Students
  async getStudents(params = {}) { const r = await wardenApi.get('/students', { params }); return r.data },
  async getStudent(id: string)   { const r = await wardenApi.get(`/students/${id}`); return r.data },
  async updateStudentStatus(id: string, data: { status?: string; isActive?: boolean }) {
    const r = await wardenApi.patch(`/students/${id}/status`, data); return r.data
  },
  // Rooms
  async getRooms()               { const r = await wardenApi.get('/rooms'); return r.data },
  // Requests
  async getRequests(params = {}) { const r = await wardenApi.get('/requests', { params }); return r.data },
  async reviewRequest(id: string, action: 'APPROVED' | 'REJECTED', reviewNote?: string) {
    const r = await wardenApi.patch(`/requests/${id}/review`, { action, reviewNote }); return r.data
  },
  // Problems
  async getProblems(params = {}) { const r = await wardenApi.get('/problems', { params }); return r.data },
  async updateProblemStatus(id: string, status: string, resolveNote?: string) {
    const r = await wardenApi.patch(`/problems/${id}/status`, { status, resolveNote }); return r.data
  },
  // Attendance
  async getAttendance(params = {}) { const r = await wardenApi.get('/attendance', { params }); return r.data },
  // Entry/Exit
  async getEntryExit(params = {}) { const r = await wardenApi.get('/entry-exit', { params }); return r.data },
  // Attendance windows
  async getDefaultWindows()        { const r = await wardenApi.get('/windows'); return r.data },
  async createDefaultWindow(data: { date: string; startTime: string; endTime: string }) {
    const r = await wardenApi.post('/windows', data); return r.data
  },
  async autoCreateTodayWindow()   { const r = await wardenApi.post('/windows/auto-create-today'); return r.data },
  // Special windows
  async getSpecialWindows(params = {}) { const r = await wardenApi.get('/special-windows', { params }); return r.data },
  async createSpecialWindow(data: object) { const r = await wardenApi.post('/special-windows', data); return r.data },
  async cancelSpecialWindow(id: string) { const r = await wardenApi.patch(`/special-windows/${id}/cancel`); return r.data },
  // Announcements
  async getAnnouncements()           { const r = await wardenApi.get('/announcements'); return r.data },
  async createAnnouncement(data: { title: string; message: string }) { const r = await wardenApi.post('/announcements', data); return r.data },
  async deleteAnnouncement(id: string) { const r = await wardenApi.delete(`/announcements/${id}`); return r.data },
  // Notices
  async getNotices()                 { const r = await wardenApi.get('/notices'); return r.data },
  async createNotice(data: object)   { const r = await wardenApi.post('/notices', data); return r.data },
  async updateNotice(id: string, data: object) { const r = await wardenApi.put(`/notices/${id}`, data); return r.data },
  async deleteNotice(id: string)     { const r = await wardenApi.delete(`/notices/${id}`); return r.data },
  // Fees
  async getFeeOverview()             { const r = await wardenApi.get('/fees'); return r.data },
  // Emergency contacts
  async getEmergencyContacts()       { const r = await wardenApi.get('/emergency-contacts'); return r.data },
  async saveContact(data: object, id?: string) {
    if (id) { const r = await wardenApi.put(`/emergency-contacts/${id}`, data); return r.data }
    const r = await wardenApi.post('/emergency-contacts', data); return r.data
  },
  async deleteContact(id: string)    { const r = await wardenApi.delete(`/emergency-contacts/${id}`); return r.data },
}
