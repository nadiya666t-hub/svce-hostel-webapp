import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth'
import {
  getMyProfile,
  getAttendanceSummary,
  getCurrentFees,
  getMyRequests,
  getMyProblems,
} from '../controllers/studentController'

const router = Router()

// All student routes require authentication + STUDENT role
router.use(authenticate, requireRole('STUDENT'))

router.get('/me', getMyProfile)
router.get('/me/attendance/summary', getAttendanceSummary)
router.get('/me/fees/current', getCurrentFees)
router.get('/me/requests', getMyRequests)
router.get('/me/problems', getMyProblems)

export default router
