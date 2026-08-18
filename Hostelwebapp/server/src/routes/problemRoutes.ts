import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth'
import { uploadProblemPhoto } from '../middleware/upload'
import { getProblems, createProblem, getProblemById, createProblemValidators } from '../controllers/problemController'

const router = Router()
router.use(authenticate, requireRole('STUDENT'))

router.get('/', getProblems)
router.get('/:id', getProblemById)
router.post('/', uploadProblemPhoto.single('photo'), createProblemValidators, createProblem)

export default router
