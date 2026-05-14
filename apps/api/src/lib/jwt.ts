import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { config } from './config.js'
import { UnauthorizedError } from '../utils/errors.js'
import type { JWTPayload } from '../types/common.js'

function parseKey(raw: string): string {
  return raw.replace(/\\n/g, '\n')
}

export function signAccessToken(
  payload: Omit<JWTPayload, 'iat' | 'exp' | 'jti'>,
): string {
  return jwt.sign({ ...payload, jti: randomUUID() }, parseKey(config.JWT_PRIVATE_KEY), {
    algorithm: 'RS256',
    expiresIn: '24h',
  })
}

export function signRefreshToken(
  payload: Pick<JWTPayload, 'sub' | 'role' | 'school_id'>,
): string {
  return jwt.sign({ ...payload, jti: randomUUID() }, parseKey(config.JWT_PRIVATE_KEY), {
    algorithm: 'RS256',
    expiresIn: '30d',
  })
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, parseKey(config.JWT_PUBLIC_KEY), {
      algorithms: ['RS256'],
    }) as JWTPayload
  } catch (err) {
    const msg = err instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token'
    throw new UnauthorizedError(msg)
  }
}
