import type { FastifyRequest, FastifyReply } from 'fastify'
import { ForbiddenError } from '../utils/errors.js'
import type { UserRole } from '../types/common.js'

export function requireRole(roles: UserRole[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const { role } = request.jwtPayload
    if (!roles.includes(role)) {
      throw new ForbiddenError(`Role ${role} is not permitted for this action`)
    }
  }
}
