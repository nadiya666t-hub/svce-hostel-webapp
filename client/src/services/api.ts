import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach JWT token to every request
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('hms_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
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
