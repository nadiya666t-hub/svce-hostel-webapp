import { Router } from 'express'
import { body } from 'express-validator'
import { authenticateParent } from '../middleware/parentAuth'
import { authLimiter } from '../middleware/rateLimiter'
import { parentLogin, checkParentUsn } from '../controllers/parentAuthController'
import {
  getStudentDetails,
  getStudentFees,
  getTodayAttendance,
  getAttendanceHistory,
  getOutgoingHistory,
  getEmergencyContacts,
} from '../controllers/parentController'

const router = Router()

// ── Public auth ───────────────────────────────────────────────────────────────
router.get('/auth/check-usn/:usn', authLimiter, checkParentUsn)

router.post(
  '/auth/login',
  authLimiter,
  [
    body('usn').trim().notEmpty().withMessage('USN is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  parentLogin
)

// ── Protected parent routes ───────────────────────────────────────────────────
router.use(authenticateParent)

router.get('/student',                  getStudentDetails)
router.get('/fees',                     getStudentFees)
router.get('/attendance/today',         getTodayAttendance)
router.get('/attendance/history',       getAttendanceHistory)
router.get('/outgoing',                 getOutgoingHistory)
router.get('/emergency-contacts',       getEmergencyContacts)

export default router
