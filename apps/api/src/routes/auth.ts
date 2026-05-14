import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AuthRepository } from '../repositories/auth.repository.js'
import { AuthService } from '../services/auth.service.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { requireRole } from '../middleware/roleGuard.js'
import { UserRole } from '../types/common.js'

const OtpRequestSchema = z.object({
  mobile: z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian mobile number'),
})

const OtpVerifySchema = z.object({
  mobile: z.string().min(1),
  otp: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'OTP must be 6 digits'),
})

const RefreshSchema = z.object({
  refreshToken: z.string().min(10),
})

const PinSetSchema = z.object({
  neura_id: z.string().min(10),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4–6 digits'),
})

const PinVerifySchema = z.object({
  neura_id: z.string().min(10),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4–6 digits'),
})

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const repo = new AuthRepository(supabaseAdmin, fastify.log)
  const svc = new AuthService(repo, fastify.log)

  // POST /api/v1/auth/otp/request
  fastify.post('/api/v1/auth/otp/request', async (request, reply) => {
    const correlationId = request.correlationId
    const body = OtpRequestSchema.parse(request.body)
    const result = await svc.requestOtp(body.mobile, correlationId)
    return reply.code(200).send({ data: result })
  })

  // POST /api/v1/auth/otp/verify
  fastify.post('/api/v1/auth/otp/verify', async (request, reply) => {
    const correlationId = request.correlationId
    const body = OtpVerifySchema.parse(request.body)
    const result = await svc.verifyOtp(body.mobile, body.otp, correlationId)
    return reply.code(200).send({ data: result })
  })

  // POST /api/v1/auth/refresh
  fastify.post('/api/v1/auth/refresh', async (request, reply) => {
    const correlationId = request.correlationId
    const body = RefreshSchema.parse(request.body)
    const result = await svc.refreshTokens(body.refreshToken, correlationId)
    return reply.code(200).send({ data: result })
  })

  // DELETE /api/v1/auth/session  (requires valid JWT)
  fastify.delete(
    '/api/v1/auth/session',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { jti } = request.jwtPayload
      await svc.logout(jti, correlationId)
      return reply.code(204).send()
    },
  )

  // POST /api/v1/auth/pin/set  (requires STUDENT JWT)
  fastify.post(
    '/api/v1/auth/pin/set',
    { preHandler: [fastify.authenticate, requireRole([UserRole.STUDENT])] },
    async (request, reply) => {
      const correlationId = request.correlationId
      const body = PinSetSchema.parse(request.body)
      const { neura_id } = request.jwtPayload

      if (neura_id !== body.neura_id) {
        return reply.code(403).send({
          error: 'Students may only set their own PIN',
          code: 'FORBIDDEN',
          correlationId,
        })
      }

      await svc.setPIN(body.neura_id, body.pin, correlationId)
      return reply.code(200).send({ data: { message: 'PIN set successfully' } })
    },
  )

  // POST /api/v1/auth/pin/verify  (no auth required)
  fastify.post('/api/v1/auth/pin/verify', async (request, reply) => {
    const correlationId = request.correlationId
    const body = PinVerifySchema.parse(request.body)
    const result = await svc.verifyPIN(body.neura_id, body.pin, correlationId)
    return reply.code(200).send({ data: result })
  })
}

export default authRoutes
