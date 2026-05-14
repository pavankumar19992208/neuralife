import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { FastifyBaseLogger } from 'fastify'
import { DatabaseError } from '../utils/errors.js'
import type {
  OtpRequest,
  RefreshTokenRecord,
  TeacherAuthRecord,
  ParentAuthRecord,
  StudentAuthRecord,
} from '../types/common.js'

// Row types for tables not yet in generated Database types
interface RefreshTokenRow {
  id: string
  jti: string
  user_id: string
  user_role: string
  school_id: string | null
  expires_at: string
  revoked_at: string | null
  created_at: string | null
}

interface StudentPinRow {
  neura_id: string
  pin_hash: string
  updated_at: string | null
}

export class AuthRepository {
  // Untyped Supabase client for tables (refresh_tokens, student_pins) absent
  // from the generated Database type until next `supabase gen types` run.
  private readonly db: SupabaseClient

  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: FastifyBaseLogger,
  ) {
    this.db = supabase as SupabaseClient
  }

  // Builds a DatabaseError that always has a non-empty message.
  // Supabase/PostgREST can return message:"" on HEAD-count requests, connection
  // resets, or paused-project responses — those would produce silent errors.
  private dbErr(
    error: { message: string; code?: string | null; details?: string | null; hint?: string | null },
    correlationId: string,
    context?: string,
  ): DatabaseError {
    const msg =
      error.message ||
      (error.code ? `Database error (pg: ${error.code})` : 'Database operation failed')

    this.logger.error(
      { correlationId, context, pgCode: error.code, pgDetails: error.details, pgHint: error.hint },
      msg,
    )

    return new DatabaseError(msg, {
      correlationId,
      ...(error.code ? { pgCode: error.code } : {}),
      ...(error.details ? { pgDetails: error.details } : {}),
    })
  }

  // ─── OTP ──────────────────────────────────────────────────────────────────

  async createOtpRequest(
    mobile: string,
    otpHash: string,
    expiresAt: Date,
    correlationId: string,
  ): Promise<OtpRequest> {
    this.logger.debug({ correlationId, mobile: mobile.slice(-4) }, 'AuthRepository.createOtpRequest')

    const { data, error } = await this.supabase
      .from('otp_requests')
      .insert({ mobile, otp_hash: otpHash, expires_at: expiresAt.toISOString() })
      .select('id, mobile, otp_hash, attempt_count, max_attempts, expires_at, verified_at, locked_until, created_at')
      .single()

    if (error) throw this.dbErr(error, correlationId)
    return data as OtpRequest
  }

  async findLatestOtp(mobile: string, correlationId: string): Promise<OtpRequest | null> {
    this.logger.debug({ correlationId, mobile: mobile.slice(-4) }, 'AuthRepository.findLatestOtp')

    const { data, error } = await this.supabase
      .from('otp_requests')
      .select('id, mobile, otp_hash, attempt_count, max_attempts, expires_at, verified_at, locked_until, created_at')
      .eq('mobile', mobile)
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw this.dbErr(error, correlationId)
    return data as OtpRequest | null
  }

  async markOtpVerified(id: string, correlationId: string): Promise<void> {
    this.logger.debug({ correlationId, id }, 'AuthRepository.markOtpVerified')

    const { error } = await this.supabase
      .from('otp_requests')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw this.dbErr(error, correlationId)
  }

  async incrementOtpAttempt(id: string, correlationId: string): Promise<number> {
    this.logger.debug({ correlationId, id }, 'AuthRepository.incrementOtpAttempt')

    const { data: row, error: fetchErr } = await this.supabase
      .from('otp_requests')
      .select('attempt_count')
      .eq('id', id)
      .single()

    if (fetchErr) throw new DatabaseError(fetchErr.message, { correlationId })

    const newCount = ((row?.attempt_count ?? 0) as number) + 1

    const { error: updateErr } = await this.supabase
      .from('otp_requests')
      .update({ attempt_count: newCount })
      .eq('id', id)

    if (updateErr) throw new DatabaseError(updateErr.message, { correlationId })
    return newCount
  }

  async lockOtpUntil(mobile: string, lockedUntil: Date, correlationId: string): Promise<void> {
    this.logger.debug({ correlationId, mobile: mobile.slice(-4) }, 'AuthRepository.lockOtpUntil')

    const { error } = await this.supabase
      .from('otp_requests')
      .update({ locked_until: lockedUntil.toISOString() })
      .eq('mobile', mobile)
      .is('verified_at', null)

    if (error) throw this.dbErr(error, correlationId)
  }

  async countRecentOtpRequests(
    mobile: string,
    windowMs: number,
    correlationId: string,
  ): Promise<number> {
    this.logger.debug({ correlationId, mobile: mobile.slice(-4) }, 'AuthRepository.countRecentOtpRequests')

    const since = new Date(Date.now() - windowMs).toISOString()

    const { count, error } = await this.supabase
      .from('otp_requests')
      .select('id', { count: 'exact', head: true })
      .eq('mobile', mobile)
      .gt('created_at', since)

    if (error) throw this.dbErr(error, correlationId)
    return count ?? 0
  }

  // ─── Refresh tokens ────────────────────────────────────────────────────────

  async storeRefreshToken(
    jti: string,
    userId: string,
    userRole: string,
    schoolId: string | null,
    expiresAt: Date,
    correlationId: string,
  ): Promise<void> {
    this.logger.debug({ correlationId }, 'AuthRepository.storeRefreshToken')

    const { error } = await this.db.from('refresh_tokens').insert({
      jti,
      user_id: userId,
      user_role: userRole,
      school_id: schoolId,
      expires_at: expiresAt.toISOString(),
    })

    if (error) throw this.dbErr(error as { message: string; code?: string | null }, correlationId)
  }

  async findRefreshToken(jti: string, correlationId: string): Promise<RefreshTokenRecord | null> {
    this.logger.debug({ correlationId }, 'AuthRepository.findRefreshToken')

    const { data, error } = await this.db
      .from('refresh_tokens')
      .select('id, jti, user_id, user_role, school_id, expires_at, revoked_at')
      .eq('jti', jti)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (error) throw this.dbErr(error as { message: string; code?: string | null }, correlationId)
    return data as RefreshTokenRow | null
  }

  async revokeRefreshToken(jti: string, correlationId: string): Promise<void> {
    this.logger.debug({ correlationId }, 'AuthRepository.revokeRefreshToken')

    const { error } = await this.db
      .from('refresh_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('jti', jti)

    if (error) throw this.dbErr(error as { message: string; code?: string | null }, correlationId)
  }

  // ─── User lookups ──────────────────────────────────────────────────────────

  async findTeacherByMobile(
    mobile: string,
    correlationId: string,
  ): Promise<TeacherAuthRecord | null> {
    this.logger.debug({ correlationId }, 'AuthRepository.findTeacherByMobile')

    const { data, error } = await this.supabase
      .from('teachers')
      .select(`
        id,
        full_name,
        mobile,
        status,
        teacher_school_assignments!teacher_school_assignments_teacher_id_fkey!inner(school_id, designation, status)
      `)
      .eq('mobile', mobile)
      .eq('status', 'ACTIVE')
      .is('deleted_at', null)
      .eq('teacher_school_assignments.status', 'ACTIVE')
      .limit(1)
      .maybeSingle()

    if (error) throw this.dbErr(error, correlationId)
    if (!data) return null

    const raw = data as unknown as {
      id: string
      full_name: string
      mobile: string
      status: string | null
      teacher_school_assignments: { school_id: string; designation: string; status: string | null }[]
    }

    const assignment = Array.isArray(raw.teacher_school_assignments)
      ? raw.teacher_school_assignments[0]
      : (raw.teacher_school_assignments as { school_id: string; designation: string; status: string | null })

    if (!assignment) return null

    const designation = assignment.designation.toUpperCase()
    let role: TeacherAuthRecord['role'] = 'TEACHER'
    if (designation === 'PRINCIPAL' || designation === 'VP' || designation === 'HM') {
      role = 'PRINCIPAL'
    } else if (designation === 'ADMIN') {
      role = 'SCHOOL_ADMIN'
    }

    return {
      teacher_id: raw.id,
      full_name: raw.full_name,
      mobile: raw.mobile,
      school_id: assignment.school_id,
      role,
      designation: assignment.designation,
      status: raw.status ?? 'ACTIVE',
    }
  }

  async findParentByMobile(
    mobile: string,
    correlationId: string,
  ): Promise<ParentAuthRecord | null> {
    this.logger.debug({ correlationId }, 'AuthRepository.findParentByMobile')

    const { data, error } = await this.supabase
      .from('parent_auth_links')
      .select('neura_id, school_id')
      .eq('mobile', mobile)

    if (error) throw this.dbErr(error, correlationId)
    if (!data || data.length === 0) return null

    const neura_ids = data.map((r) => r.neura_id)
    const school_ids = [...new Set(data.map((r) => r.school_id))]

    return {
      neura_ids,
      school_ids,
      primary_school_id: school_ids[0],
    }
  }

  async findStudentByNeuraId(
    neuraId: string,
    correlationId: string,
  ): Promise<StudentAuthRecord | null> {
    this.logger.debug({ correlationId, neuraId }, 'AuthRepository.findStudentByNeuraId')

    const { data: student, error: studentErr } = await this.supabase
      .from('students')
      .select('neura_id, full_name, status')
      .eq('neura_id', neuraId)
      .is('deleted_at', null)
      .maybeSingle()

    if (studentErr) throw new DatabaseError(studentErr.message, { correlationId })
    if (!student) return null

    const { data: progress, error: progressErr } = await this.supabase
      .from('student_yearly_progress')
      .select('school_id, class_year, section')
      .eq('neura_id', neuraId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (progressErr) throw new DatabaseError(progressErr.message, { correlationId })

    const { data: pinRow, error: pinErr } = await this.db
      .from('student_pins')
      .select('pin_hash')
      .eq('neura_id', neuraId)
      .maybeSingle()

    if (pinErr) throw this.dbErr(pinErr as { message: string; code?: string | null }, correlationId)

    return {
      neura_id: student.neura_id,
      full_name: student.full_name,
      school_id: progress?.school_id ?? '',
      pin_hash: (pinRow as StudentPinRow | null)?.pin_hash ?? null,
      class_year: progress?.class_year ?? 0,
      section: progress?.section ?? '',
      status: student.status ?? 'ACTIVE',
    }
  }

  async updateStudentPin(neuraId: string, pinHash: string, correlationId: string): Promise<void> {
    this.logger.debug({ correlationId, neuraId }, 'AuthRepository.updateStudentPin')

    const { error } = await this.db.from('student_pins').upsert(
      { neura_id: neuraId, pin_hash: pinHash, updated_at: new Date().toISOString() },
      { onConflict: 'neura_id' },
    )

    if (error) throw this.dbErr(error as { message: string; code?: string | null }, correlationId)
  }
}
