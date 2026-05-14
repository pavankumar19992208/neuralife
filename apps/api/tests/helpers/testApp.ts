import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'
import correlationIdPlugin from '../../src/middleware/correlationId.js'
import jwtPlugin from '../../src/middleware/jwt.js'
import { AppError } from '../../src/utils/errors.js'

export async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, disableRequestLogging: true })

  await app.register(correlationIdPlugin)
  await app.register(jwtPlugin)

  app.setErrorHandler((error, request, reply) => {
    const correlationId = request.correlationId ?? 'test'

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

    return reply.code(500).send({ error: 'Internal error', code: 'INTERNAL_ERROR', correlationId })
  })

  return app
}
