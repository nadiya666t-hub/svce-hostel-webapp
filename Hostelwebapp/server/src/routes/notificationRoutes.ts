import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth'
import { getNotifications, markAsRead, markAllAsRead, getUnreadCount } from '../controllers/notificationController'

const router = Router()
router.use(authenticate, requireRole('STUDENT'))

router.get('/', getNotifications)
router.get('/unread-count', getUnreadCount)
router.patch('/read-all', markAllAsRead)
router.patch('/:id/read', markAsRead)
export default router
