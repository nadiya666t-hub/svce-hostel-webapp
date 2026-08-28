import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth'
import { uploadEnrollmentPhoto as uploadMiddleware } from '../middleware/upload'
import { getEnrollmentStatus, uploadEnrollmentPhoto } from '../controllers/enrollmentController'

const router = Router()

router.use(authenticate, requireRole('STUDENT'))

router.get('/status', getEnrollmentStatus)
router.post('/photo', uploadMiddleware.single('photo'), uploadEnrollmentPhoto)

export default router
