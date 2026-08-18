import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth'
import { getEntryExitRecords } from '../controllers/entryExitController'

const router = Router()
router.use(authenticate, requireRole('STUDENT'))
router.get('/', getEntryExitRecords)
export default router
