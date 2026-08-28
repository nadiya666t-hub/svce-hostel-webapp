import { Router } from 'express'
import { body } from 'express-validator'
import { authenticate, requireRole } from '../middleware/auth'
import { authLimiter } from '../middleware/rateLimiter'
import { wardenLogin } from '../controllers/wardenAuthController'
import {
  getDashboardStats, getAllStudents, getStudentDetail, getRooms,
  getRequests, reviewRequest,
  getProblems, updateProblemStatus,
  getAttendance, getSpecialWindows, createSpecialWindow, cancelSpecialWindow,
  getAnnouncements, createAnnouncement, deleteAnnouncement,
  getEmergencyContacts, upsertEmergencyContact, deleteEmergencyContact,
  getWardenProfile,
  // New
  getDefaultWindows, createDefaultWindow, autoCreateTodayWindow,
  changeWardenPassword,
  updateStudentStatus,
  getFeeOverview,
  getNotices, createNotice, updateNotice, deleteNotice,
  getEntryExitRecords,
} from '../controllers/wardenController'

const router = Router()

// ── Public auth ───────────────────────────────────────────────────────────────
router.post('/auth/login', authLimiter,
  [body('wardenId').trim().notEmpty(), body('password').notEmpty()],
  wardenLogin
)

// ── All below require authenticated WARDEN ────────────────────────────────────
router.use(authenticate, requireRole('WARDEN'))

// Dashboard
router.get('/dashboard/stats',            getDashboardStats)

// Profile + password
router.get('/profile',                    getWardenProfile)
router.post('/profile/change-password',   changeWardenPassword)

// Students
router.get('/students',                   getAllStudents)
router.get('/students/:id',               getStudentDetail)
router.patch('/students/:id/status',      updateStudentStatus)

// Rooms
router.get('/rooms',                      getRooms)

// Requests
router.get('/requests',                   getRequests)
router.patch('/requests/:id/review',      reviewRequest)

// Problems
router.get('/problems',                   getProblems)
router.patch('/problems/:id/status',      updateProblemStatus)

// Attendance records
router.get('/attendance',                 getAttendance)

// Entry/exit
router.get('/entry-exit',                 getEntryExitRecords)

// Attendance windows (default)
router.get('/windows',                    getDefaultWindows)
router.post('/windows',                   createDefaultWindow)
router.post('/windows/auto-create-today', autoCreateTodayWindow)

// Special attendance windows
router.get('/special-windows',                  getSpecialWindows)
router.post('/special-windows',                 createSpecialWindow)
router.patch('/special-windows/:id/cancel',     cancelSpecialWindow)

// Announcements
router.get('/announcements',              getAnnouncements)
router.post('/announcements',             createAnnouncement)
router.delete('/announcements/:id',       deleteAnnouncement)

// Notices
router.get('/notices',                    getNotices)
router.post('/notices',                   createNotice)
router.put('/notices/:id',                updateNotice)
router.delete('/notices/:id',             deleteNotice)

// Fees
router.get('/fees',                       getFeeOverview)

// Emergency contacts
router.get('/emergency-contacts',         getEmergencyContacts)
router.post('/emergency-contacts',        (req, res, next) => { req.params.id = ''; upsertEmergencyContact(req, res, next) })
router.put('/emergency-contacts/:id',     upsertEmergencyContact)
router.delete('/emergency-contacts/:id',  deleteEmergencyContact)

export default router
