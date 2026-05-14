import fp from 'fastify-plugin'
import { randomUUID } from 'crypto'
import type { FastifyPluginAsync } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string
  }
}

const correlationIdPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    const id =
      (request.headers['x-correlation-id'] as string | undefined) ?? randomUUID()
    request.correlationId = id
    void reply.header('x-correlation-id', id)
  })
}

export default fp(correlationIdPlugin, { name: 'correlation-id' })
