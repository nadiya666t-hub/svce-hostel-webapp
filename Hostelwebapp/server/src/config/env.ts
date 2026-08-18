import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Resolve .env path — works whether running via tsx (source) or node (dist)
// server/.env is always two levels up from src/config/
const envPath = path.resolve(__dirname, '../../.env')

if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath })
  if (result.error) {
    console.warn('[env] dotenv parse warning:', result.error.message)
  }
} else {
  console.warn('[env] No .env file found at', envPath, '— relying on system environment variables.')
}

function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`[env] Missing required environment variable: ${key}`)
  return val
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '7d'),
  PORT: parseInt(optional('PORT', '5000'), 10),
  NODE_ENV: optional('NODE_ENV', 'development'),
  CLIENT_URL: optional('CLIENT_URL', 'http://localhost:3000'),
  UPLOAD_DIR: optional('UPLOAD_DIR', 'uploads'),
  MAX_FILE_SIZE_MB: parseInt(optional('MAX_FILE_SIZE_MB', '5'), 10),
} as const
