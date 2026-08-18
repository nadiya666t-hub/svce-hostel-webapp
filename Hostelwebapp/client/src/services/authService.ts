import api from './api'
import type { AuthResponse, LoginCredentials, SetPasswordPayload, ApiResponse } from '@/types'

export const authService = {
  /**
   * Check if a USN exists and whether it needs password setup.
   */
  async checkUsn(usn: string): Promise<ApiResponse<{ exists: boolean; requiresSetup: boolean }>> {
    const res = await api.get(`/auth/check-usn/${encodeURIComponent(usn)}`)
    return res.data
  },

  /**
   * First-time: set password for a student who has never activated their account.
   */
  async setPassword(payload: SetPasswordPayload): Promise<ApiResponse<AuthResponse>> {
    const res = await api.post('/auth/set-password', payload)
    return res.data
  },

  /**
   * Login with USN + password.
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    const res = await api.post('/auth/login', credentials)
    return res.data
  },

  /**
   * Logout — clears local storage.
   */
  logout() {
    localStorage.removeItem('hms_token')
    localStorage.removeItem('hms_user')
  },

  /**
   * Get the stored token.
   */
  getToken(): string | null {
    return localStorage.getItem('hms_token')
  },

  /**
   * Persist auth data.
   */
  persistAuth(token: string, user: AuthResponse['user']) {
    localStorage.setItem('hms_token', token)
    localStorage.setItem('hms_user', JSON.stringify(user))
  },

  /**
   * Retrieve persisted user (without a server call).
   */
  getPersistedUser(): AuthResponse['user'] | null {
    const raw = localStorage.getItem('hms_user')
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  },
}
