import './config/env'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import { env } from './config/env'
import { prisma } from './config/prisma'
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
import enrollmentRoutes from './routes/enrollmentRoutes'
import parentRoutes from './routes/parentRoutes'
import adminRoutes from './routes/adminRoutes'
import wardenRoutes from './routes/wardenRoutes'

const app = express()

app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)
    // Allow localhost on any port
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return callback(null, true)
    // Allow any private network IP (192.168.x.x, 172.16-31.x.x, 10.x.x.x)
    const privateNetwork = /^https?:\/\/(192\.168\.|172\.(1[6-9]|2\d|3[01])\.|10\.)\d+\.\d+(:\d+)?$/.test(origin)
    if (privateNetwork) return callback(null, true)
    // Allow known tunnel URLs
    const tunnels = ['loca.lt', 'ngrok.io', 'ngrok-free.app', 'cloudflare.com']
    if (tunnels.some(t => origin.includes(t))) return callback(null, true)
    callback(null, true) // Allow all origins in development
  },
  credentials: true,
}))
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')))
app.use('/api/uploads', express.static(path.join(__dirname, '../../uploads')))
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
app.use('/api/enrollment', enrollmentRoutes)
app.use('/api/parent', parentRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/warden', wardenRoutes)

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

  // ── Daily attendance window auto-creation (runs at 8:00 PM IST every day) ──
  // Creates the default 8:30–8:40 PM window for today if it doesn't exist yet.
  function scheduleWindowCreation() {
    const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000) // IST
    const h = now.getUTCHours(), m = now.getUTCMinutes()
    const msUntil8pm = ((20 - h) * 60 + (0 - m)) * 60 * 1000
    const delay = msUntil8pm > 0 ? msUntil8pm : msUntil8pm + 24 * 60 * 60 * 1000
    setTimeout(async () => {
      try {
        const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
        const dateStr = ist.toISOString().slice(0, 10)
        const dateObj = new Date(dateStr + 'T00:00:00.000Z')
        const existing = await prisma.attendanceWindow.findFirst({
          where: { date: dateObj, isDefault: true, studentId: null, windowStatus: 'ACTIVE' },
        })
        if (!existing) {
          await prisma.attendanceWindow.create({
            data: {
              date: dateObj, startTime: '20:30', endTime: '20:40',
              isDefault: true, isSpecial: false,
              windowStatus: 'ACTIVE', approvedLocation: 'HOSTEL_CAMPUS',
            },
          })
          console.log(`[cron] Auto-created attendance window for ${dateStr}`)
        }
      } catch (e) { console.warn('[cron] Window auto-create failed:', e) }
      scheduleWindowCreation() // reschedule for tomorrow
    }, delay)
    console.log(`[cron] Next attendance window auto-create in ${Math.round(delay/60000)} minutes`)
  }
  scheduleWindowCreation()
  // Prevents Prisma connection from going idle/stale on long uptimes.
  const THIRTY_MIN = 30 * 60 * 1000
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`
      console.log(`[keep-alive] DB ping OK — ${new Date().toISOString()}`)
    } catch (e) {
      console.warn('[keep-alive] DB ping failed:', e)
    }
  }, THIRTY_MIN)

  // ── Auto-restart every 8 hours ───────────────────────────────────────────
  // tsx watch (dev) and pm2/nodemon (prod) will auto-restart on exit(0).
  // This prevents memory leaks and stale connections after long uptimes.
  const EIGHT_HOURS = 8 * 60 * 60 * 1000
  setTimeout(() => {
    console.log('\n🔄  8-hour auto-restart triggered — restarting server...\n')
    process.exit(0)
  }, EIGHT_HOURS)
})

export default app
