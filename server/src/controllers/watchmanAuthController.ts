import { Request, Response, NextFunction } from 'express'
import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import { validationResult } from 'express-validator'
import { prisma } from '../config/prisma'
import { env } from '../config/env'
import { createError } from '../middleware/errorHandler'

function signToken(payload: { userId: string; usn: string; role: string }) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] })
}

export async function watchmanLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.mapped() }); return }

    const { watchmanId, password } = req.body as { watchmanId: string; password: string }
    const normId = watchmanId.trim().toUpperCase()

    const user = await prisma.user.findUnique({ where: { usn: normId }, include: { watchman: true } })
    if (!user || user.role !== 'WATCHMAN' || !user.isActive) {
      next(createError('Invalid Watchman ID or password.', 401)); return
    }
    const valid = await argon2.verify(user.passwordHash, password)
    if (!valid) { next(createError('Invalid Watchman ID or password.', 401)); return }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    const token = signToken({ userId: user.id, usn: user.usn, role: user.role })

    res.json({
      success: true,
      data: {
        token,
        watchman: {
          id:          user.id,
          watchmanId:  user.usn,
          name:        user.watchman?.name        ?? 'Watchman',
          designation: user.watchman?.designation ?? 'Gate Watchman',
          email:       user.watchman?.email       ?? null,
          phone:       user.watchman?.phone       ?? null,
          role:        user.role,
        },
      },
    })
  } catch (err) { next(err) }
}
