import { Router } from 'express'
import { checkUsn, setPassword, login } from '../controllers/authController'
import { validateSetPassword, validateLogin } from '../validators/authValidators'
import { authLimiter } from '../middleware/rateLimiter'

const router = Router()

router.use(authLimiter)

router.get('/check-usn/:usn', checkUsn)
router.post('/set-password', validateSetPassword, setPassword)
router.post('/login', validateLogin, login)

export default router
