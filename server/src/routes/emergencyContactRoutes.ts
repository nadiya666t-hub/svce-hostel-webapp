import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { getEmergencyContacts } from '../controllers/emergencyContactController'

const router = Router()
router.get('/', authenticate, getEmergencyContacts)
export default router
