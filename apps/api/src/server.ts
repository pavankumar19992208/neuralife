import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { ZodError } from 'zod'
import { config } from './lib/config.js'
import logger from './lib/logger.js'
import { supabaseAnon } from './lib/supabase.js'
import correlationIdPlugin from './middleware/correlationId.js'
import jwtPlugin from './middleware/jwt.js'
import authRoutes from './routes/auth.js'
import analyticsRoutes from './routes/analytics.js'
import studentRoutes from './routes/students.js'
import teacherRoutes from './routes/teachers.js'
import attendanceRoutes from './routes/attendance.js'
import feeRoutes from './routes/fees.js'
import contentStudioRoutes from './routes/content-studio.js'
import examRoutes from './routes/exams.js'
import timetableRoutes from './routes/timetable.js'
import salaryRoutes from './routes/salary.js'
import { AppError } from './utils/errors.js'

export async function startServer() {
  const fastify = Fastify({ logger: false, disableRequestLogging: true })

  // 1. Security headers
  await fastify.register(helmet)

  // 2. CORS
  await fastify.register(cors, {
    origin:
      config.NODE_ENV === 'development'
        ? true
        : config.ALLOWED_ORIGINS?.split(',') ?? false,
  } as Parameters<typeof cors>[1])

  // 3. Rate limiting — production only (ENABLE_RATE_LIMIT=true)
  if (config.ENABLE_RATE_LIMIT === 'true') {
    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    })
  }

  // 4. Correlation ID
  await fastify.register(correlationIdPlugin)

  // 5. JWT authenticate decorator
  await fastify.register(jwtPlugin)

  // 6. Request timing hook
  fastify.addHook('onSend', async (request, reply, _payload) => {
    const responseTimeMs = reply.elapsedTime
    logger.info(
      {
        correlationId: request.correlationId,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTimeMs,
      },
      'Request completed',
    )
  })

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    const correlationId = request.correlationId ?? 'unknown'

    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: error.message,
        code: error.code,
        correlationId,
        ...(error.details ? { details: error.details } : {}),
      })
    }

    if (error instanceof ZodError) {
      return reply.code(422).send({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        correlationId,
        details: error.flatten(),
      })
    }

    logger.error({ correlationId, error }, 'Unhandled error')
    return reply.code(500).send({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      correlationId,
    })
  })

  // Health check
  fastify.get('/health', async (_request, reply) => {
    const results = await Promise.allSettled([
      supabaseAnon.from('schools').select('id').limit(1),
    ])

    const healthy = results.every((r) => r.status === 'fulfilled')

    return reply.code(healthy ? 200 : 503).send({
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      checks: {
        database: results[0].status === 'fulfilled' ? 'ok' : 'error',
      },
    })
  })

  // API info
  fastify.get('/api/v1', async () => ({
    version: '1.0.0',
    env: config.NODE_ENV,
  }))

  // Auth routes
  await fastify.register(authRoutes)

  // Analytics routes
  await fastify.register(analyticsRoutes)

  // Student routes
  await fastify.register(studentRoutes)

  // Teacher routes
  await fastify.register(teacherRoutes)

  // Attendance routes
  await fastify.register(attendanceRoutes)

  // Fee routes
  await fastify.register(feeRoutes)

  // Content Studio routes
  await fastify.register(contentStudioRoutes)

  // Exam routes
  await fastify.register(examRoutes)

  // Timetable routes
  await fastify.register(timetableRoutes)

  // Salary routes
  await fastify.register(salaryRoutes)

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down...')
    await fastify.close()
    process.exit(0)
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))

  await fastify.listen({ port: config.PORT, host: '0.0.0.0' })
  logger.info({ port: config.PORT }, `NeuraLife API running on port ${config.PORT}`)
}

startServer().catch((err) => {
  logger.error({ err }, 'Failed to start server')
  process.exit(1)
})
