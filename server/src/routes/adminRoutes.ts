import { Router } from 'express'
import { body } from 'express-validator'
import { authenticate, requireRole } from '../middleware/auth'
import { authLimiter } from '../middleware/rateLimiter'
import {
  adminLogin,
  getDashboardStats,
  getStudents,
  updateStudentStatus,
  getDailyAttendance,
  getNotices,
  createNotice,
  deleteNotice,
  sendGlobalNotification,
  getNotifications,
  getFloorsRooms,
} from '../controllers/adminController'

const router = Router()

// ── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/login', authLimiter,
  [body('adminId').trim().notEmpty(), body('password').notEmpty()],
  adminLogin
)

// ── All routes below require ADMIN role ──────────────────────────────────────
router.use(authenticate, requireRole('ADMIN'))

router.get('/dashboard/stats',          getDashboardStats)

// Students
router.get('/students',                 getStudents)
router.patch('/students/:id/status',    updateStudentStatus)

// Attendance
router.get('/attendance/daily',         getDailyAttendance)

// Notices
router.get('/notices',                  getNotices)
router.post('/notices',                 createNotice)
router.delete('/notices/:id',           deleteNotice)

// Notifications
router.get('/notifications',            getNotifications)
router.post('/notifications/broadcast', sendGlobalNotification)

// Rooms
router.get('/floors-rooms',             getFloorsRooms)

export default router
