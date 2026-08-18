import type { Request } from 'express'

export interface AuthPayload {
  userId: string
  usn: string
  role: string
}

export interface AuthRequest extends Request {
  user?: AuthPayload
}
