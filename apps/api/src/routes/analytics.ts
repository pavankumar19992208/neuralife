import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AnalyticsService } from '../services/analytics.service.js'
import { AnalyticsRepository, todayIST } from '../repositories/analytics.repository.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { cache } from '../lib/cache.js'
import { requireRole } from '../middleware/roleGuard.js'
import { ForbiddenError } from '../utils/errors.js'
import { UserRole } from '../types/common.js'
import type { SchoolHealthScore } from '../types/common.js'
import logger from '../lib/logger.js'

const SchoolIdParamsSchema = z.object({
  schoolId: z.string().min(1),
})

const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/api/v1/analytics/school/:schoolId/health-score',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN]),
      ],
    },
    async (request, reply) => {
      const { schoolId } = SchoolIdParamsSchema.parse(request.params)
      const { school_id: jwtSchoolId, role } = request.jwtPayload
      const { correlationId } = request

      if (role !== UserRole.SUPER_ADMIN && schoolId !== jwtSchoolId) {
        throw new ForbiddenError('Access denied to this school data', { schoolId, correlationId })
      }

      const cacheKey = `health:${schoolId}:${todayIST()}`
      const cached = cache.get<SchoolHealthScore>(cacheKey)
      if (cached) {
        logger.debug({ correlationId, schoolId, cacheHit: true }, 'Health score served from cache')
        return reply.send({ data: cached })
      }

      const repo = new AnalyticsRepository(supabaseAdmin, fastify.log)
      const service = new AnalyticsService(repo)
      const result = await service.getHealthScore(schoolId, jwtSchoolId, role, correlationId)

      cache.set(cacheKey, result, 5 * 60 * 1000)

      logger.info(
        { correlationId, schoolId, score: result.overall_score, band: result.band },
        'Health score computed',
      )

      return reply.send({ data: result })
    },
  )
}

export default analyticsRoutes
