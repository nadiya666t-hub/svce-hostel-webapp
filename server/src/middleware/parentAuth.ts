import { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import type { AuthRequest, AuthPayload } from '../types'

/** Verify JWT and require role === PARENT */
export function authenticateParent(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided.' })
    return
  }
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as AuthPayload
    if (payload.role !== 'PARENT') {
      res.status(403).json({ success: false, message: 'Access denied.' })
      return
    }
    req.user = payload
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' })
  }
}
