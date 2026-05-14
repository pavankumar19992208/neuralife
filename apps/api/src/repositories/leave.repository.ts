import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { Logger } from 'pino'
import { DatabaseError, ValidationError } from '../utils/errors.js'
import type { LeaveApplicationInput } from '../types/common.js'

export class LeaveRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: Logger,
  ) {}

  async getBalancesAndHistory(
    teacherId: string,
    schoolId: string,
    leaveYearLabel: string,
    correlationId: string,
  ): Promise<{
    balances: {
      leave_year_label: string
      cl_entitled: number
      cl_used: number
      sl_entitled: number
      sl_used: number
      el_entitled: number
      el_used: number
      lop_days: number
    } | null
    applications: Array<{
      id: string
      leave_type: string
      from_date: string
      to_date: string
      days_count: number
      reason: string
      status: string | null
      rejection_reason: string | null
      created_at: string | null
      reviewed_at: string | null
    }>
  }> {
    this.logger.debug({ correlationId, teacherId, schoolId }, 'LeaveRepository.getBalancesAndHistory')

    const [balancesResult, applicationsResult] = await Promise.all([
      this.supabase
        .from('leave_balances')
        .select('leave_year_label, cl_entitled, cl_used, sl_entitled, sl_used, el_entitled, el_used, lop_days')
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId)
        .eq('leave_year_label', leaveYearLabel)
        .maybeSingle(),

      this.supabase
        .from('leave_applications')
        .select('id, leave_type, from_date, to_date, days_count, reason, status, rejection_reason, created_at, reviewed_at')
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (balancesResult.error) throw new DatabaseError(balancesResult.error.message, { correlationId, teacherId })
    if (applicationsResult.error) throw new DatabaseError(applicationsResult.error.message, { correlationId, teacherId })

    const lb = balancesResult.data

    return {
      balances: lb
        ? {
            leave_year_label: lb.leave_year_label,
            cl_entitled: lb.cl_entitled ?? 12,
            cl_used: lb.cl_used ?? 0,
            sl_entitled: lb.sl_entitled ?? 10,
            sl_used: lb.sl_used ?? 0,
            el_entitled: lb.el_entitled ?? 8,
            el_used: lb.el_used ?? 0,
            lop_days: lb.lop_days ?? 0,
          }
        : null,
      applications: (applicationsResult.data ?? []).map((a) => ({
        id: a.id,
        leave_type: a.leave_type,
        from_date: a.from_date,
        to_date: a.to_date,
        days_count: a.days_count,
        reason: a.reason,
        status: a.status,
        rejection_reason: a.rejection_reason,
        created_at: a.created_at,
        reviewed_at: a.reviewed_at,
      })),
    }
  }

  async submitApplication(
    teacherId: string,
    schoolId: string,
    input: LeaveApplicationInput,
    leaveYearLabel: string,
    correlationId: string,
  ): Promise<string> {
    this.logger.debug({ correlationId, teacherId, leaveType: input.leave_type }, 'LeaveRepository.submitApplication')

    if (new Date(input.to_date) < new Date(input.from_date)) {
      throw new ValidationError('to_date must be on or after from_date')
    }
    if (input.days_count <= 0) {
      throw new ValidationError('days_count must be greater than 0')
    }

    // Check CL balance if applicable
    if (input.leave_type === 'CL') {
      const { data: lb } = await this.supabase
        .from('leave_balances')
        .select('cl_entitled, cl_used')
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId)
        .eq('leave_year_label', leaveYearLabel)
        .maybeSingle()

      const remaining = (lb?.cl_entitled ?? 12) - (lb?.cl_used ?? 0)
      if (remaining < input.days_count) {
        throw new ValidationError(`Insufficient CL balance. Available: ${remaining} days`)
      }
    }

    const { data, error } = await this.supabase
      .from('leave_applications')
      .insert({
        teacher_id: teacherId,
        school_id: schoolId,
        leave_type: input.leave_type as Database['public']['Enums']['leave_type'],
        from_date: input.from_date,
        to_date: input.to_date,
        days_count: input.days_count,
        reason: input.reason,
        substitute_teacher_id: input.substitute_teacher_id ?? null,
        status: 'PENDING',
      })
      .select('id')
      .single()

    if (error || !data) throw new DatabaseError(error?.message ?? 'Insert failed', { correlationId, teacherId })
    return data.id
  }

  async approveApplication(
    applicationId: string,
    schoolId: string,
    reviewerId: string,
    leaveYearLabel: string,
    correlationId: string,
  ): Promise<void> {
    this.logger.debug({ correlationId, applicationId, schoolId }, 'LeaveRepository.approveApplication')

    const { data: app, error: fetchErr } = await this.supabase
      .from('leave_applications')
      .select('teacher_id, leave_type, days_count, school_id')
      .eq('id', applicationId)
      .eq('school_id', schoolId)
      .single()

    if (fetchErr || !app) throw new DatabaseError('Leave application not found', { applicationId })

    const now = new Date().toISOString()

    // Update application status
    const { error: appErr } = await this.supabase
      .from('leave_applications')
      .update({ status: 'APPROVED', reviewed_by: reviewerId, reviewed_at: now })
      .eq('id', applicationId)

    if (appErr) throw new DatabaseError(appErr.message, { correlationId, applicationId })

    // Increment the appropriate leave_used counter
    const colMap: Record<string, 'cl_used' | 'sl_used' | 'el_used' | 'lop_days'> = {
      CL: 'cl_used',
      SL: 'sl_used',
      EL: 'el_used',
      LOP: 'lop_days',
    }

    const col = colMap[app.leave_type]
    if (col) {
      const { data: lb } = await this.supabase
        .from('leave_balances')
        .select('cl_used, sl_used, el_used, lop_days')
        .eq('teacher_id', app.teacher_id)
        .eq('school_id', schoolId)
        .eq('leave_year_label', leaveYearLabel)
        .maybeSingle()

      if (lb) {
        const days = app.days_count
        const patch =
          col === 'cl_used'
            ? { cl_used: (lb.cl_used ?? 0) + days }
            : col === 'sl_used'
              ? { sl_used: (lb.sl_used ?? 0) + days }
              : col === 'el_used'
                ? { el_used: (lb.el_used ?? 0) + days }
                : { lop_days: (lb.lop_days ?? 0) + days }

        await this.supabase
          .from('leave_balances')
          .update(patch)
          .eq('teacher_id', app.teacher_id)
          .eq('school_id', schoolId)
          .eq('leave_year_label', leaveYearLabel)
      }
    }
  }

  async rejectApplication(
    applicationId: string,
    schoolId: string,
    reviewerId: string,
    rejectionReason: string,
    correlationId: string,
  ): Promise<void> {
    this.logger.debug({ correlationId, applicationId, schoolId }, 'LeaveRepository.rejectApplication')

    const { error } = await this.supabase
      .from('leave_applications')
      .update({
        status: 'REJECTED',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
      })
      .eq('id', applicationId)
      .eq('school_id', schoolId)

    if (error) throw new DatabaseError(error.message, { correlationId, applicationId })
  }
}
