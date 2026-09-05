import { Router } from 'express'
import { body } from 'express-validator'
import { authenticate, requireRole } from '../middleware/auth'
import { authLimiter } from '../middleware/rateLimiter'
import { watchmanLogin } from '../controllers/watchmanAuthController'
import {
  getDashboardStats, getVisitors, recordVisitor, markVisitorExit,
  updatePermission, getLateEntries, recordLateEntry,
  updateLateEntryPermission, getWatchmanProfile, getInstructions,
  changeWatchmanPassword,
} from '../controllers/watchmanController'

const router = Router()

router.post('/auth/login', authLimiter,
  [body('watchmanId').trim().notEmpty(), body('password').notEmpty()],
  watchmanLogin
)

router.use(authenticate, requireRole('WATCHMAN'))

router.get('/dashboard/stats',                   getDashboardStats)
router.get('/profile',                           getWatchmanProfile)
router.patch('/profile/password',                changeWatchmanPassword)
router.get('/late-entries',                      getLateEntries)
router.post('/late-entries',                     recordLateEntry)
router.patch('/late-entries/:id/permission',     updateLateEntryPermission)
router.get('/instructions',                      getInstructions)

export default router
