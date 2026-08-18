import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'

/** GET /api/emergency-contacts */
export async function getEmergencyContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contacts = await prisma.emergencyContact.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    res.json({ success: true, data: contacts })
  } catch (err) { next(err) }
}
