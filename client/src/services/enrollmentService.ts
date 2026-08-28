import api from './api'
import type { ApiResponse } from '@/types'

export const enrollmentService = {
  async getStatus(): Promise<ApiResponse<{ enrolled: boolean; photoUrl: string | null }>> {
    const res = await api.get('/enrollment/status')
    return res.data
  },

  async uploadPhoto(blob: Blob, mime: string): Promise<ApiResponse<{ photoUrl: string }>> {
    const form = new FormData()
    const ext = mime === 'image/png' ? 'png' : 'jpg'
    form.append('photo', blob, `enrollment.${ext}`)
    const res = await api.post('/enrollment/photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },
}
