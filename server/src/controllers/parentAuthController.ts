import { Request, Response, NextFunction } from 'express'
import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import { validationResult } from 'express-validator'
import { prisma } from '../config/prisma'
import { env } from '../config/env'
import { createError } from '../middleware/errorHandler'

function signParentToken(payload: { parentId: string; usn: string; role: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

function normaliseUsn(raw: string): string {
  return raw.replace(/[-\s]/g, '').toUpperCase()
}

/**
 * POST /api/parent/auth/login
 * Parent logs in with student USN + college-provided password.
 */
export async function parentLogin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(422).json({ success: false, errors: errors.mapped() })
      return
    }

    const { usn, password } = req.body as { usn: string; password: string }
    const normUsn = normaliseUsn(usn)

    const parent = await prisma.parentUser.findUnique({ where: { usn: normUsn } })
    if (!parent || !parent.isActive) {
      next(createError('Invalid USN or password.', 401))
      return
    }

    const valid = await argon2.verify(parent.passwordHash, password)
    if (!valid) {
      next(createError('Invalid USN or password.', 401))
      return
    }

    // Get student name to return in token
    const student = await prisma.student.findFirst({
      where: { user: { usn: normUsn } },
      select: { name: true },
    })

    await prisma.parentUser.update({
      where: { id: parent.id },
      data: { lastLoginAt: new Date() },
    })

    const token = signParentToken({ parentId: parent.id, usn: parent.usn, role: 'PARENT' })

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: parent.id,
          usn: parent.usn,
          name: student?.name ?? 'Parent',
          role: 'PARENT',
        },
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/parent/auth/check-usn/:usn
 * Check if a parent account exists for this USN.
 */
export async function checkParentUsn(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const normUsn = normaliseUsn(req.params.usn)
    const parent = await prisma.parentUser.findUnique({
      where: { usn: normUsn },
      select: { id: true, isActive: true },
    })
    if (!parent) {
      res.status(404).json({ success: false, message: 'No parent account found for this USN. Please contact the hostel office.' })
      return
    }
    res.json({ success: true, data: { exists: true } })
  } catch (err) {
    next(err)
  }
}
