import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AnalyticsDeepRepository } from '../repositories/analytics-deep.repository.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { requireRole } from '../middleware/roleGuard.js'
import { ValidationError, NotFoundError } from '../utils/errors.js'
import { UserRole } from '../types/common.js'

const CreateBookmarkSchema = z.object({
  url: z.string().min(1).max(500),
  title: z.string().min(1).max(100).trim(),
  icon: z.string().max(50).optional().nullable(),
})

const routes: FastifyPluginAsync = async (fastify) => {
  const repo = new AnalyticsDeepRepository(supabaseAdmin, fastify.log)

  const AUTHED = [
    fastify.authenticate,
    requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]),
  ]

  // GET /api/v1/bookmarks
  fastify.get('/api/v1/bookmarks', { preHandler: AUTHED }, async (request, reply) => {
    const { teacher_id, school_id } = request.jwtPayload
    const { correlationId } = request
    if (!teacher_id) throw new ValidationError('No teacher_id in JWT')

    const bookmarks = await repo.getBookmarks(teacher_id, correlationId)
    return reply.send({ data: bookmarks })
  })

  // POST /api/v1/bookmarks
  fastify.post('/api/v1/bookmarks', { preHandler: AUTHED }, async (request, reply) => {
    const { teacher_id, school_id } = request.jwtPayload
    const { correlationId } = request
    if (!teacher_id) throw new ValidationError('No teacher_id in JWT')

    const body = CreateBookmarkSchema.parse(request.body)

    const count = await repo.countBookmarks(teacher_id, correlationId)
    if (count >= 10) throw new ValidationError('Maximum 10 bookmarks per user')

    const bookmark = await repo.createBookmark(teacher_id, school_id, body.url, body.title, body.icon ?? null, correlationId)

    fastify.log.info({ correlationId, teacher_id, url: body.url }, 'Bookmark created')
    return reply.code(201).send({ data: bookmark })
  })

  // DELETE /api/v1/bookmarks/:id
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/bookmarks/:id',
    { preHandler: AUTHED },
    async (request, reply) => {
      const { teacher_id } = request.jwtPayload
      const { correlationId } = request
      const { id } = request.params
      if (!teacher_id) throw new ValidationError('No teacher_id in JWT')

      await repo.deleteBookmark(id, teacher_id, correlationId)
      return reply.send({ data: { success: true } })
    },
  )
}

export default routes
