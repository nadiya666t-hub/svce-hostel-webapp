import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth'
import { getDailyAttendance } from '../controllers/adminController'

const router = Router()
// Allow ADMIN and WARDEN to monitor attendance
router.use(authenticate, requireRole('ADMIN', 'WARDEN', 'STUDENT'))  // STUDENT allowed temporarily for demo
router.get('/attendance/daily', getDailyAttendance)
export default router
