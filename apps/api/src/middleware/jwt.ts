import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { verifyToken } from '../lib/jwt.js'
import { UnauthorizedError } from '../utils/errors.js'
import type { JWTPayload } from '../types/common.js'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    jwtPayload: JWTPayload
  }
}

const jwtPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const auth = request.headers.authorization
      if (!auth?.startsWith('Bearer ')) {
        throw new UnauthorizedError('Missing or invalid Authorization header')
      }
      request.jwtPayload = verifyToken(auth.slice(7))
    },
  )
}

export default fp(jwtPlugin, { name: 'jwt-auth' })
