import { Router } from 'express'
import { body } from 'express-validator'
import { authenticate, requireRole } from '../middleware/auth'
import { authLimiter } from '../middleware/rateLimiter'
import { overseerLogin } from '../controllers/overseerAuthController'
import {
  getDashboardStats, getProblems, getProblemDetail,
  updateProblemStatus, getOverseerProfile,
} from '../controllers/overseerController'

const router = Router()

router.post('/auth/login', authLimiter,
  [body('overseerId').trim().notEmpty(), body('password').notEmpty()],
  overseerLogin
)

router.use(authenticate, requireRole('OVERSEER'))

router.get('/dashboard/stats',        getDashboardStats)
router.get('/profile',                getOverseerProfile)
router.get('/problems',               getProblems)
router.get('/problems/:id',           getProblemDetail)
router.patch('/problems/:id/status',  updateProblemStatus)

export default router
