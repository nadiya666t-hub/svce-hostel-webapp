import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { getNotices } from '../controllers/noticeController'

const router = Router()

// Notices require login (any authenticated role)
router.get('/', authenticate, getNotices)

export default router
