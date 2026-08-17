import { Response, NextFunction } from 'express'
import { Request } from 'express'
import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import { validationResult } from 'express-validator'
import { prisma } from '../config/prisma'
import { env } from '../config/env'
import { createError } from '../middleware/errorHandler'

function signToken(payload: { userId: string; usn: string; role: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] })
}

/**
 * GET /api/auth/check-usn/:usn
 * Returns whether USN exists and whether it needs first-time setup.
 */
export async function checkUsn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { usn } = req.params
    const user = await prisma.user.findUnique({
      where: { usn: usn.toUpperCase() },
      select: { id: true, isActive: true },
    })

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'USN not found. Please contact the hostel office.',
      })
      return
    }

    res.json({
      success: true,
      data: {
        exists: true,
        requiresSetup: !user.isActive,
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/set-password
 * First-time account activation — set password and activate.
 */
export async function setPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(422).json({ success: false, errors: errors.mapped() })
      return
    }

    const { usn, password } = req.body as { usn: string; password: string }

    const user = await prisma.user.findUnique({
      where: { usn: usn.toUpperCase() },
      include: { student: true },
    })

    if (!user) {
      next(createError('USN not found.', 404))
      return
    }

    if (user.isActive) {
      next(createError('Account is already activated. Please login normally.', 400))
      return
    }

    // Hash with Argon2id
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id })

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, isActive: true },
      include: { student: true },
    })

    const token = signToken({ userId: updated.id, usn: updated.usn, role: updated.role })

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: updated.id,
          usn: updated.usn,
          name: updated.student?.name ?? 'Student',
          role: updated.role,
        },
        requiresPasswordSetup: false,
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(422).json({ success: false, errors: errors.mapped() })
      return
    }

    const { usn, password } = req.body as { usn: string; password: string }

    const user = await prisma.user.findUnique({
      where: { usn: usn.toUpperCase() },
      include: { student: true },
    })

    if (!user) {
      // Intentionally vague to prevent user enumeration
      next(createError('Invalid USN or password.', 401))
      return
    }

    if (!user.isActive) {
      next(createError('Account not activated. Please set your password first.', 401))
      return
    }

    const valid = await argon2.verify(user.passwordHash, password)
    if (!valid) {
      next(createError('Invalid USN or password.', 401))
      return
    }

    const token = signToken({ userId: user.id, usn: user.usn, role: user.role })

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          usn: user.usn,
          name: user.student?.name ?? 'Student',
          role: user.role,
        },
        requiresPasswordSetup: false,
      },
    })
  } catch (err) {
    next(err)
  }
}
