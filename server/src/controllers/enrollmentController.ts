import { Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { createError } from '../middleware/errorHandler'
import type { AuthRequest } from '../types'

/**
 * GET /api/enrollment/status
 * Returns whether the student has completed photo enrollment.
 */
export async function getEnrollmentStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
      select: { id: true, photoUrl: true },
    })
    if (!student) { next(createError('Student not found.', 404)); return }

    res.json({
      success: true,
      data: {
        enrolled: !!student.photoUrl,
        photoUrl: student.photoUrl ?? null,
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/enrollment/photo
 * Upload or re-upload the student's reference photo.
 * Accepts multipart/form-data with field name "photo".
 */
export async function uploadEnrollmentPhoto(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
      select: { id: true, photoUrl: true },
    })
    if (!student) { next(createError('Student not found.', 404)); return }

    const file = (req as AuthRequest & { file?: Express.Multer.File }).file
    if (!file) {
      next(createError('A photo file is required.', 422))
      return
    }

    const photoUrl = `/uploads/enrollment/${file.filename}`

    await prisma.student.update({
      where: { id: student.id },
      data: { photoUrl },
    })

    res.json({
      success: true,
      message: 'Photo enrolled successfully.',
      data: { photoUrl },
    })
  } catch (err) {
    next(err)
  }
}
