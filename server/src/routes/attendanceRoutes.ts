import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth'
import { uploadAttendancePhoto } from '../middleware/upload'
import {
  getAttendanceStatus,
  verifyLocation,
  submitAttendance,
  getAttendanceHistory,
  getAttendanceSummaryFull,
  getTodayWindow,
} from '../controllers/attendanceController'

const router = Router()

// All attendance routes require a logged-in STUDENT
router.use(authenticate, requireRole('STUDENT'))

// Status + window
router.get('/status', getAttendanceStatus)
router.get('/window/today', getTodayWindow)

// Location check (no photo)
router.post('/verify-location', verifyLocation)

// Submit attendance with optional photo
router.post('/submit', uploadAttendancePhoto.single('photo'), submitAttendance)

// History + summary
router.get('/history', getAttendanceHistory)
router.get('/summary', getAttendanceSummaryFull)

export default router
