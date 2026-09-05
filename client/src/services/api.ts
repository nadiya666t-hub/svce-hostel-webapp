import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

/** Pick the right token based on the URL being called */
function getTokenForUrl(url: string): string | null {
  if (url.includes('/overseer')) return localStorage.getItem('hms_overseer_token')
  if (url.includes('/watchman')) return localStorage.getItem('hms_watchman_token')
  if (url.includes('/warden'))   return localStorage.getItem('hms_warden_token')
  if (url.includes('/parent'))   return localStorage.getItem('hms_parent_token')
  if (url.includes('/admin'))    return localStorage.getItem('hms_admin_token')
  return localStorage.getItem('hms_token') // student
}

/** Pick the right login redirect based on URL */
function getLoginRedirectForUrl(url: string): string {
  if (url.includes('/overseer')) return '/overseer/login'
  if (url.includes('/watchman')) return '/watchman/login'
  if (url.includes('/warden'))   return '/warden/login'
  if (url.includes('/parent'))   return '/parent/login'
  if (url.includes('/admin'))    return '/admin/login'
  return '/student/login'
}

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getTokenForUrl(config.url ?? '')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const url = error.config?.url ?? ''
      const redirect = getLoginRedirectForUrl(url)
      // Clear only the relevant token
      if (url.includes('/admin')) {
        localStorage.removeItem('hms_admin_token')
        localStorage.removeItem('hms_admin_user')
      } else if (url.includes('/overseer')) {
        localStorage.removeItem('hms_overseer_token')
        localStorage.removeItem('hms_overseer_user')
      } else if (url.includes('/watchman')) {
        localStorage.removeItem('hms_watchman_token')
        localStorage.removeItem('hms_watchman_user')
      } else if (url.includes('/warden')) {
        localStorage.removeItem('hms_warden_token')
        localStorage.removeItem('hms_warden_user')
      } else if (url.includes('/parent')) {
        localStorage.removeItem('hms_parent_token')
        localStorage.removeItem('hms_parent_user')
      } else {
        localStorage.removeItem('hms_token')
        localStorage.removeItem('hms_user')
      }
      // Only redirect for non-login endpoints (avoid redirect loop on login itself)
      if (!url.includes('/auth/login')) {
        window.location.href = redirect
      }
    }
    return Promise.reject(error)
  }
)

export default api
