import { Request, Response, NextFunction } from 'express'

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export function createError(message: string, statusCode: number): AppError {
  const error: AppError = new Error(message)
  error.statusCode = statusCode
  error.isOperational = true
  return error
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.statusCode ?? 500
  const message = err.isOperational ? err.message : 'An unexpected error occurred.'

  if (process.env.NODE_ENV !== 'production' && !err.isOperational) {
    console.error('[ERROR]', err)
  }

  res.status(status).json({
    success: false,
    message,
  })
}
