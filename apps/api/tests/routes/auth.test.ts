import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import type { FastifyPluginAsync } from 'fastify'
import { buildTestApp } from '../helpers/testApp.js'
import { makeStudentJWT, makeRefreshJWT, makeTeacherJWT } from '../helpers/jwt.js'
import { verifyToken } from '../../src/lib/jwt.js'

// ─── Mock AuthService ──────────────────────────────────────────────────────

const mockSvc = {
  requestOtp: vi.fn(),
  verifyOtp: vi.fn(),
  refreshTokens: vi.fn(),
  logout: vi.fn(),
  setPIN: vi.fn(),
  verifyPIN: vi.fn(),
}

vi.mock('../../src/services/auth.service.js', () => ({
  AuthService: vi.fn().mockImplementation(() => mockSvc),
}))

vi.mock('../../src/repositories/auth.repository.js', () => ({
  AuthRepository: vi.fn().mockImplementation(() => ({})),
}))

vi.mock('../../src/lib/supabase.js', () => ({
  supabaseAdmin: {},
  supabaseAnon: {},
}))

// ─── Load routes after mocks ──────────────────────────────────────────────

async function buildAuthTestApp(): Promise<FastifyInstance> {
  const app = await buildTestApp()
  const { default: authRoutes } = await import('../../src/routes/auth.js') as { default: FastifyPluginAsync }
  await app.register(authRoutes)
  await app.ready()
  return app
}

// ─── Test suites ──────────────────────────────────────────────────────────

describe('POST /api/v1/auth/otp/request', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildAuthTestApp()
  })
  afterAll(async () => { await app.close() })
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 200 for valid Indian mobile', async () => {
    mockSvc.requestOtp.mockResolvedValue({ message: 'OTP sent successfully', expiresIn: 600 })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/request',
      payload: { mobile: '+919876543210' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.message).toBe('OTP sent successfully')
    expect(mockSvc.requestOtp).toHaveBeenCalledWith('+919876543210', expect.any(String))
  })

  it('returns 422 for invalid mobile (no +91)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/request',
      payload: { mobile: '9876543210' },
    })
    expect(res.statusCode).toBe(422)
  })

  it('returns 422 for invalid mobile (+1 prefix)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/request',
      payload: { mobile: '+19876543210' },
    })
    expect(res.statusCode).toBe(422)
  })

  it('returns 422 for too-short mobile', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/request',
      payload: { mobile: '+9187654' },
    })
    expect(res.statusCode).toBe(422)
  })

  it('returns 422 for missing mobile field', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/request',
      payload: {},
    })
    expect(res.statusCode).toBe(422)
  })

  it('returns 429 when service throws RateLimitError', async () => {
    const { RateLimitError } = await import('../../src/utils/errors.js')
    mockSvc.requestOtp.mockRejectedValue(
      new RateLimitError('Too many OTP requests. Try again in 10 minutes.'),
    )

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/request',
      payload: { mobile: '+919876543210' },
    })
    expect(res.statusCode).toBe(429)
  })
})

describe('POST /api/v1/auth/otp/verify', () => {
  let app: FastifyInstance

  beforeAll(async () => { app = await buildAuthTestApp() })
  afterAll(async () => { await app.close() })
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 200 with tokens for correct OTP', async () => {
    mockSvc.verifyOtp.mockResolvedValue({
      accessToken: 'access.token.here',
      refreshToken: 'refresh.token.here',
      role: 'TEACHER',
      expiresIn: 86400,
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/verify',
      payload: { mobile: '+919876543210', otp: '123456' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data).toMatchObject({ role: 'TEACHER', expiresIn: 86400 })
  })

  it('returns 401 for wrong OTP', async () => {
    const { UnauthorizedError } = await import('../../src/utils/errors.js')
    mockSvc.verifyOtp.mockRejectedValue(new UnauthorizedError('Wrong OTP. 4 attempt(s) remaining.'))

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/verify',
      payload: { mobile: '+919876543210', otp: '000000' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 for expired OTP', async () => {
    const { UnauthorizedError } = await import('../../src/utils/errors.js')
    mockSvc.verifyOtp.mockRejectedValue(new UnauthorizedError('OTP expired. Request a new one.'))

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/verify',
      payload: { mobile: '+919876543210', otp: '123456' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 429 after too many wrong attempts', async () => {
    const { RateLimitError } = await import('../../src/utils/errors.js')
    mockSvc.verifyOtp.mockRejectedValue(
      new RateLimitError('Too many wrong attempts. Locked for 30 minutes.'),
    )

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/verify',
      payload: { mobile: '+919876543210', otp: '111111' },
    })
    expect(res.statusCode).toBe(429)
  })

  it('returns 422 for OTP shorter than 6 digits', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/verify',
      payload: { mobile: '+919876543210', otp: '1234' },
    })
    expect(res.statusCode).toBe(422)
  })

  it('returns 422 for non-numeric OTP', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/verify',
      payload: { mobile: '+919876543210', otp: 'abcdef' },
    })
    expect(res.statusCode).toBe(422)
  })
})

describe('POST /api/v1/auth/refresh', () => {
  let app: FastifyInstance

  beforeAll(async () => { app = await buildAuthTestApp() })
  afterAll(async () => { await app.close() })
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 200 with new token pair for valid refresh token', async () => {
    mockSvc.refreshTokens.mockResolvedValue({
      accessToken: 'new.access.token',
      refreshToken: 'new.refresh.token',
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: 'valid.refresh.token.string' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveProperty('accessToken')
  })

  it('returns 401 for invalid/malformed token', async () => {
    const { UnauthorizedError } = await import('../../src/utils/errors.js')
    mockSvc.refreshTokens.mockRejectedValue(new UnauthorizedError('Invalid token'))

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: 'bad.token.here.xxxxxxxxxxx' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 for revoked refresh token', async () => {
    const { UnauthorizedError } = await import('../../src/utils/errors.js')
    mockSvc.refreshTokens.mockRejectedValue(
      new UnauthorizedError('Refresh token has been revoked.'),
    )

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: 'revoked.token.here.xxxxxxxxx' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 422 for missing refreshToken field', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {},
    })
    expect(res.statusCode).toBe(422)
  })
})

describe('DELETE /api/v1/auth/session', () => {
  let app: FastifyInstance

  beforeAll(async () => { app = await buildAuthTestApp() })
  afterAll(async () => { await app.close() })
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 204 for valid authenticated request', async () => {
    mockSvc.logout.mockResolvedValue(undefined)
    const token = makeTeacherJWT()

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/auth/session',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(204)
    expect(mockSvc.logout).toHaveBeenCalledOnce()
  })

  it('returns 401 when Authorization header is missing', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/auth/session',
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 for malformed JWT', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/auth/session',
      headers: { authorization: 'Bearer not.a.real.jwt' },
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('POST /api/v1/auth/pin/verify', () => {
  let app: FastifyInstance

  beforeAll(async () => { app = await buildAuthTestApp() })
  afterAll(async () => { await app.close() })
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 200 with tokens for correct PIN', async () => {
    mockSvc.verifyPIN.mockResolvedValue({
      accessToken: 'student.access.token',
      refreshToken: 'student.refresh.token',
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/pin/verify',
      payload: { neura_id: 'NID-2025-AP-084291', pin: '1234' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveProperty('accessToken')
  })

  it('returns 401 for wrong PIN', async () => {
    const { UnauthorizedError } = await import('../../src/utils/errors.js')
    mockSvc.verifyPIN.mockRejectedValue(new UnauthorizedError('Wrong PIN. 4 attempt(s) remaining.'))

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/pin/verify',
      payload: { neura_id: 'NID-2025-AP-084291', pin: '0000' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 429 after 5 wrong PINs', async () => {
    const { RateLimitError } = await import('../../src/utils/errors.js')
    mockSvc.verifyPIN.mockRejectedValue(
      new RateLimitError('Too many wrong PINs. Locked for 15 minutes.'),
    )

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/pin/verify',
      payload: { neura_id: 'NID-2025-AP-084291', pin: '1111' },
    })
    expect(res.statusCode).toBe(429)
  })

  it('returns 422 for non-numeric PIN', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/pin/verify',
      payload: { neura_id: 'NID-2025-AP-084291', pin: 'abcd' },
    })
    expect(res.statusCode).toBe(422)
  })

  it('returns 422 for PIN too short (< 4 digits)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/pin/verify',
      payload: { neura_id: 'NID-2025-AP-084291', pin: '12' },
    })
    expect(res.statusCode).toBe(422)
  })
})
