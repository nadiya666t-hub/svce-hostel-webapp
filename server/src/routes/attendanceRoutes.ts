import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth'
import { uploadAttendancePhoto } from '../middleware/upload'
import {
  getAttendanceStatus,
  verifyNetwork,
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
router.get('/status',          getAttendanceStatus)
router.get('/window/today',    getTodayWindow)

// Network/Wi-Fi check (replaces GPS location check)
router.post('/verify-network', verifyNetwork)
router.post('/verify-location', verifyLocation) // backwards compat alias

// Submit attendance with photo
router.post('/submit', uploadAttendancePhoto.single('photo'), submitAttendance)

// History + summary
router.get('/history', getAttendanceHistory)
router.get('/summary', getAttendanceSummaryFull)

export default router
