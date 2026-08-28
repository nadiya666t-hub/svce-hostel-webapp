import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { Request } from 'express'

const UPLOAD_ROOT = path.resolve(__dirname, '../../../uploads')

function imageFileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (allowed.includes(file.mimetype)) cb(null, true)
  else cb(new Error('Only JPEG, PNG or WebP images are allowed.'))
}

// ── Attendance photo ──────────────────────────────────────────────────────────
const attendanceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(UPLOAD_ROOT, 'attendance')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
    cb(null, `att_${uuidv4()}${ext}`)
  },
})

export const uploadAttendancePhoto = multer({
  storage: attendanceStorage, fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
})

// ── Problem photo ─────────────────────────────────────────────────────────────
const problemStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(UPLOAD_ROOT, 'problems')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
    cb(null, `prob_${uuidv4()}${ext}`)
  },
})

export const uploadProblemPhoto = multer({
  storage: problemStorage, fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
})

// ── Student enrollment / reference photo ──────────────────────────────────────
const enrollmentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(UPLOAD_ROOT, 'enrollment')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
    cb(null, `enroll_${uuidv4()}${ext}`)
  },
})

export const uploadEnrollmentPhoto = multer({
  storage: enrollmentStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
})
