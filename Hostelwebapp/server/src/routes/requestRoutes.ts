import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth'
import {
  getRequests,
  createRequest,
  getRequestById,
  cancelRequest,
  getStudentInfo,
  createRequestValidators,
} from '../controllers/requestController'

const router = Router()
router.use(authenticate, requireRole('STUDENT'))

router.get('/student-info', getStudentInfo)
router.get('/', getRequests)
router.get('/:id', getRequestById)
router.post('/', createRequestValidators, createRequest)
router.patch('/:id/cancel', cancelRequest)

export default router
