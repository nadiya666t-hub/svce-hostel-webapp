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

export async function overseerLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.mapped() }); return }

    const { overseerId, password } = req.body as { overseerId: string; password: string }
    const normId = overseerId.trim().toUpperCase()

    const user = await prisma.user.findUnique({ where: { usn: normId }, include: { overseer: true } })
    if (!user || user.role !== 'OVERSEER' || !user.isActive) {
      next(createError('Invalid Overseer ID or password.', 401)); return
    }
    const valid = await argon2.verify(user.passwordHash, password)
    if (!valid) { next(createError('Invalid Overseer ID or password.', 401)); return }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    const token = signToken({ userId: user.id, usn: user.usn, role: user.role })

    res.json({
      success: true,
      data: {
        token,
        overseer: {
          id:          user.id,
          overseerId:  user.usn,
          name:        user.overseer?.name        ?? 'Overseer',
          designation: user.overseer?.designation ?? 'Hostel Overseer',
          email:       user.overseer?.email       ?? null,
          phone:       user.overseer?.phone       ?? null,
          role:        user.role,
        },
      },
    })
  } catch (err) { next(err) }
}
