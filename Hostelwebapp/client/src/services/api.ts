import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

/**
 * When accessed via the localtunnel public URL (from mobile / any network),
 * the Vite proxy (/api → localhost:5000) does NOT work because the request
 * is coming from outside the machine.
 *
 * So we detect: if the page is served from the tunnel domain, hit the API
 * tunnel directly. Otherwise use the local proxy as normal.
 */
function resolveBaseURL(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    // If opened from the localtunnel public URL, call the API tunnel directly
    if (host.includes('.loca.lt') || host.includes('ngrok') || host.includes('tunnel')) {
      return 'https://gold-keys-pull.loca.lt/api'
    }
  }
  // Local dev — use the Vite proxy
  return import.meta.env.VITE_API_URL || '/api'
}

const api = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    // localtunnel requires this header to skip the browser warning page
    'bypass-tunnel-reminder': 'true',
  },
})

// Attach JWT token to every request
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('hms_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Always send bypass header for tunnel
    config.headers['bypass-tunnel-reminder'] = 'true'
    return config
  },
  (error) => Promise.reject(error)
)

// Handle 401 globally
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hms_token')
      localStorage.removeItem('hms_user')
      window.location.href = '/student/login'
    }
    return Promise.reject(error)
  }
)

export default api
