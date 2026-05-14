import { createHash } from 'crypto'
import bcrypt from 'bcryptjs'
import type { FastifyBaseLogger } from 'fastify'
import type { AuthRepository } from '../repositories/auth.repository.js'
import { signAccessToken, signRefreshToken, verifyToken } from '../lib/jwt.js'
import { sendOtp } from '../lib/msg91.js'
import { config } from '../lib/config.js'
import {
  ValidationError,
  UnauthorizedError,
  RateLimitError,
  NotFoundError,
} from '../utils/errors.js'
import { UserRole } from '../types/common.js'
import type { JWTPayload } from '../types/common.js'

const MOBILE_RE = /^\+91[6-9]\d{9}$/
const PIN_RE = /^\d{4,6}$/

interface PinAttemptState {
  count: number
  lockedUntil: Date | null
}

export class AuthService {
  private readonly pinAttempts = new Map<string, PinAttemptState>()

  constructor(
    private readonly repo: AuthRepository,
    private readonly logger: FastifyBaseLogger,
  ) {}

  async requestOtp(
    mobile: string,
    correlationId: string,
  ): Promise<{ message: string; expiresIn: number; devOtp?: string }> {
    if (!MOBILE_RE.test(mobile)) {
      throw new ValidationError('Invalid Indian mobile number. Must start with +91 followed by 10 digits.')
    }

    if (config.ENABLE_RATE_LIMIT === 'true') {
      const recent = await this.repo.countRecentOtpRequests(mobile, 10 * 60 * 1000, correlationId)
      if (recent >= 3) {
        throw new RateLimitError('Too many OTP requests. Try again in 10 minutes.')
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpHash = createHash('sha256').update(otp).digest('hex')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await this.repo.createOtpRequest(mobile, otpHash, expiresAt, correlationId)
    await sendOtp(mobile, otp, correlationId)

    this.logger.info({ correlationId, mobile: mobile.slice(-4) }, 'OTP sent')

    // In dev (SMS disabled), surface the OTP in the response so the login
    // flow can be tested without a real SIM. Never included in production.
    const devOtp = config.ENABLE_SMS_OTP !== 'true' ? otp : undefined
    return { message: 'OTP sent successfully', expiresIn: 600, devOtp }
  }

  async verifyOtp(
    mobile: string,
    otp: string,
    correlationId: string,
  ): Promise<{ accessToken: string; refreshToken: string; role: string; expiresIn: number }> {
    const record = await this.repo.findLatestOtp(mobile, correlationId)
    if (!record) {
      throw new UnauthorizedError('No active OTP found. Request a new one.')
    }

    if (config.ENABLE_RATE_LIMIT === 'true') {
      if (record.locked_until && new Date(record.locked_until) > new Date()) {
        const minutesLeft = Math.ceil((new Date(record.locked_until).getTime() - Date.now()) / 60000)
        throw new RateLimitError(`Too many attempts. Try after ${minutesLeft} minute(s).`)
      }
    }

    const inputHash = createHash('sha256').update(otp).digest('hex')
    if (inputHash !== record.otp_hash) {
      if (config.ENABLE_RATE_LIMIT === 'true') {
        const newCount = await this.repo.incrementOtpAttempt(record.id, correlationId)
        if (newCount >= record.max_attempts) {
          await this.repo.lockOtpUntil(mobile, new Date(Date.now() + 30 * 60 * 1000), correlationId)
          throw new RateLimitError('Too many wrong attempts. Locked for 30 minutes.')
        }
        const remaining = record.max_attempts - newCount
        throw new UnauthorizedError(`Wrong OTP. ${remaining} attempt(s) remaining.`)
      }
      throw new UnauthorizedError('Wrong OTP.')
    }

    if (new Date(record.expires_at) < new Date()) {
      throw new UnauthorizedError('OTP expired. Request a new one.')
    }

    await this.repo.markOtpVerified(record.id, correlationId)

    let payload: Omit<JWTPayload, 'iat' | 'exp' | 'jti'>

    const teacher = await this.repo.findTeacherByMobile(mobile, correlationId)
    if (teacher && teacher.status === 'ACTIVE') {
      payload = {
        sub: teacher.teacher_id,
        role: UserRole[teacher.role as keyof typeof UserRole],
        school_id: teacher.school_id,
        teacher_id: teacher.teacher_id,
      }
    } else {
      const parent = await this.repo.findParentByMobile(mobile, correlationId)
      if (!parent) {
        throw new UnauthorizedError('Mobile number not registered in NeuraLife.')
      }
      payload = {
        sub: mobile,
        role: UserRole.PARENT,
        school_id: parent.primary_school_id,
        linked_neura_ids: parent.neura_ids,
      }
    }

    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken({
      sub: payload.sub,
      role: payload.role,
      school_id: payload.school_id,
    })

    const refreshPayload = verifyToken(refreshToken)
    await this.repo.storeRefreshToken(
      refreshPayload.jti,
      payload.sub,
      payload.role,
      payload.school_id,
      new Date(refreshPayload.exp * 1000),
      correlationId,
    )

    this.logger.info({ correlationId, role: payload.role }, 'OTP verified, tokens issued')
    return { accessToken, refreshToken, role: payload.role, expiresIn: 86400 }
  }

  async refreshTokens(
    token: string,
    correlationId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = verifyToken(token)

    const stored = await this.repo.findRefreshToken(payload.jti, correlationId)
    if (!stored) {
      throw new UnauthorizedError('Refresh token has been revoked.')
    }

    await this.repo.revokeRefreshToken(payload.jti, correlationId)

    const newAccess = signAccessToken({
      sub: payload.sub,
      role: payload.role,
      school_id: payload.school_id,
      ...(payload.teacher_id ? { teacher_id: payload.teacher_id } : {}),
      ...(payload.neura_id ? { neura_id: payload.neura_id } : {}),
      ...(payload.linked_neura_ids ? { linked_neura_ids: payload.linked_neura_ids } : {}),
    })
    const newRefresh = signRefreshToken({
      sub: payload.sub,
      role: payload.role,
      school_id: payload.school_id,
    })

    const newRefreshPayload = verifyToken(newRefresh)
    await this.repo.storeRefreshToken(
      newRefreshPayload.jti,
      payload.sub,
      payload.role,
      payload.school_id,
      new Date(newRefreshPayload.exp * 1000),
      correlationId,
    )

    this.logger.info({ correlationId }, 'Tokens refreshed')
    return { accessToken: newAccess, refreshToken: newRefresh }
  }

  async logout(jti: string, correlationId: string): Promise<void> {
    await this.repo.revokeRefreshToken(jti, correlationId)
    this.logger.info({ correlationId }, 'Session revoked')
  }

  async setPIN(neuraId: string, pin: string, correlationId: string): Promise<void> {
    if (!PIN_RE.test(pin)) {
      throw new ValidationError('PIN must be 4 to 6 digits.')
    }
    const pinHash = await bcrypt.hash(pin, 12)
    await this.repo.updateStudentPin(neuraId, pinHash, correlationId)
    this.logger.info({ correlationId, neuraId }, 'PIN set successfully')
  }

  async verifyPIN(
    neuraId: string,
    pin: string,
    correlationId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const state = this.pinAttempts.get(neuraId)
    if (state?.lockedUntil && state.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((state.lockedUntil.getTime() - Date.now()) / 60000)
      throw new RateLimitError(`PIN locked. Try after ${minutesLeft} minute(s).`)
    }

    const student = await this.repo.findStudentByNeuraId(neuraId, correlationId)
    if (!student) throw new NotFoundError('Student not found.')
    if (!student.pin_hash) throw new UnauthorizedError('PIN not set. Contact school admin.')

    const match = await bcrypt.compare(pin, student.pin_hash)
    if (!match) {
      const current = state?.count ?? 0
      const newCount = current + 1

      if (newCount >= 5) {
        this.pinAttempts.set(neuraId, {
          count: newCount,
          lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
        })
        throw new RateLimitError('Too many wrong PINs. Locked for 15 minutes.')
      }

      this.pinAttempts.set(neuraId, { count: newCount, lockedUntil: null })
      throw new UnauthorizedError(`Wrong PIN. ${5 - newCount} attempt(s) remaining.`)
    }

    this.pinAttempts.delete(neuraId)

    const payload: Omit<JWTPayload, 'iat' | 'exp' | 'jti'> = {
      sub: neuraId,
      role: UserRole.STUDENT,
      school_id: student.school_id,
      neura_id: neuraId,
    }

    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken({
      sub: payload.sub,
      role: payload.role,
      school_id: payload.school_id,
    })

    const refreshPayload = verifyToken(refreshToken)
    await this.repo.storeRefreshToken(
      refreshPayload.jti,
      payload.sub,
      payload.role,
      payload.school_id,
      new Date(refreshPayload.exp * 1000),
      correlationId,
    )

    this.logger.info({ correlationId, neuraId }, 'PIN verified, tokens issued')
    return { accessToken, refreshToken }
  }
}
