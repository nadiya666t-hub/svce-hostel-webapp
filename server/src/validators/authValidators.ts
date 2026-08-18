import { body } from 'express-validator'

export const validateSetPassword = [
  body('usn').trim().notEmpty().withMessage('USN is required.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.'),
  body('confirmPassword')
    .custom((val, { req }) => {
      if (val !== (req.body as { password: string }).password) {
        throw new Error('Passwords do not match.')
      }
      return true
    }),
]

export const validateLogin = [
  body('usn').trim().notEmpty().withMessage('USN is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
]
