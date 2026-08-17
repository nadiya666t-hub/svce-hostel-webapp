import './config/env'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import { env } from './config/env'
import { apiLimiter } from './middleware/rateLimiter'
import { errorHandler } from './middleware/errorHandler'
import authRoutes from './routes/authRoutes'
import studentRoutes from './routes/studentRoutes'
import attendanceRoutes from './routes/attendanceRoutes'
import noticeRoutes from './routes/noticeRoutes'
import requestRoutes from './routes/requestRoutes'
import problemRoutes from './routes/problemRoutes'
import emergencyContactRoutes from './routes/emergencyContactRoutes'
import notificationRoutes from './routes/notificationRoutes'
import entryExitRoutes from './routes/entryExitRoutes'

const app = express()

app.use(helmet())
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://172.16.1.124:3000',
    'https://cool-crabs-love.loca.lt',
    'https://gold-keys-pull.loca.lt',
  ],
  credentials: true,
}))
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')))
app.use('/api', apiLimiter)

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/notices', noticeRoutes)
app.use('/api/requests', requestRoutes)
app.use('/api/problems', problemRoutes)
app.use('/api/emergency-contacts', emergencyContactRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/entry-exit', entryExitRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'HMS API is running.', timestamp: new Date().toISOString() })
})

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' })
})

app.use(errorHandler)

app.listen(env.PORT, () => {
  console.log(`\n🏠  HMS API running on http://localhost:${env.PORT}`)
  console.log(`    Environment: ${env.NODE_ENV}`)
  console.log(`    Health:      http://localhost:${env.PORT}/api/health\n`)
})

export default app
