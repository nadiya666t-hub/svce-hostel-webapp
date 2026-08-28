import { Request, Response, NextFunction } from 'express'
import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import { validationResult } from 'express-validator'
import { prisma } from '../config/prisma'
import { env } from '../config/env'
import { createError } from '../middleware/errorHandler'

function signToken(payload: { userId: string; usn: string; role: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

function normaliseId(raw: string): string {
  return raw.trim().toUpperCase()
}

/**
 * POST /api/warden/auth/login
 * Warden logs in with Warden ID (usn) + password.
 * Only WARDEN role users are accepted.
 */
export async function wardenLogin(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(422).json({ success: false, errors: errors.mapped() })
      return
    }

    const { wardenId, password } = req.body as { wardenId: string; password: string }
    const normId = normaliseId(wardenId)

    const user = await prisma.user.findUnique({
      where: { usn: normId },
      include: { warden: true },
    })

    if (!user || user.role !== 'WARDEN' || !user.isActive) {
      next(createError('Invalid Warden ID or password.', 401))
      return
    }

    const valid = await argon2.verify(user.passwordHash, password)
    if (!valid) {
      next(createError('Invalid Warden ID or password.', 401))
      return
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const token = signToken({ userId: user.id, usn: user.usn, role: user.role })

    res.json({
      success: true,
      data: {
        token,
        warden: {
          id:          user.id,
          wardenId:    user.usn,
          name:        user.warden?.name        ?? 'Warden',
          designation: user.warden?.designation ?? 'Hostel Warden',
          email:       user.warden?.email       ?? null,
          phone:       user.warden?.phone       ?? null,
          role:        user.role,
        },
      },
    })
  } catch (err) {
    next(err)
  }
}
