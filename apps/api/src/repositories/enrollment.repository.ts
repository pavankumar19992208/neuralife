import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { Logger } from 'pino'
import { DatabaseError, NotFoundError } from '../utils/errors.js'
import type { AdmitStudentInput } from '../types/common.js'

export class EnrollmentRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: Logger,
  ) {}

  async getCurrentAcademicYear(schoolId: string, correlationId: string): Promise<string> {
    this.logger.debug({ correlationId, schoolId }, 'EnrollmentRepository.getCurrentAcademicYear')

    const { data, error } = await this.supabase
      .from('academic_years')
      .select('id')
      .eq('school_id', schoolId)
      .eq('is_current', true)
      .limit(1)
      .single()

    if (error || !data) {
      this.logger.error({ correlationId, schoolId, error }, 'No active academic year found')
      throw new NotFoundError('No active academic year. Set up school calendar first.', {
        schoolId,
      })
    }

    return data.id
  }

  async enroll(
    neuraId: string,
    schoolId: string,
    academicYearId: string,
    classYear: number,
    section: string,
    medium: 'ENGLISH' | 'TELUGU',
    board: string,
    correlationId: string,
  ): Promise<void> {
    this.logger.debug({ correlationId, neuraId, schoolId, classYear, section }, 'EnrollmentRepository.enroll')

    // Fetch year_label for student_yearly_progress
    const { data: ay, error: ayError } = await this.supabase
      .from('academic_years')
      .select('year_label')
      .eq('id', academicYearId)
      .single()

    if (ayError || !ay) {
      throw new DatabaseError('Failed to fetch academic year label', { correlationId, academicYearId })
    }

    const [enrollResult, progressResult] = await Promise.all([
      this.supabase.from('school_enrollments').insert({
        neura_id: neuraId,
        school_id: schoolId,
        enrolled_at: new Date().toISOString(),
        status: 'ACTIVE',
      }),

      this.supabase.from('student_yearly_progress').insert({
        neura_id: neuraId,
        school_id: schoolId,
        academic_year_id: academicYearId,
        academic_year_label: ay.year_label,
        class_year: classYear,
        section,
        medium: medium as Database['public']['Enums']['medium_type'],
        board: board as Database['public']['Enums']['board_type'],
      }),
    ])

    if (enrollResult.error) {
      throw new DatabaseError(enrollResult.error.message, { correlationId, neuraId })
    }
    if (progressResult.error) {
      throw new DatabaseError(progressResult.error.message, { correlationId, neuraId })
    }
  }

  async addParentContacts(
    neuraId: string,
    schoolId: string,
    parents: AdmitStudentInput['parents'],
    correlationId: string,
  ): Promise<void> {
    this.logger.debug({ correlationId, neuraId, parentCount: parents.length }, 'EnrollmentRepository.addParentContacts')

    await Promise.all(
      parents.map(async (parent) => {
        const [contactResult, authLinkResult] = await Promise.all([
          this.supabase.from('parent_contacts').insert({
            neura_id: neuraId,
            school_id: schoolId,
            parent_name: parent.parent_name.trim(),
            relationship: parent.relationship,
            mobile: parent.mobile,
            email: parent.email ?? null,
            is_primary: parent.is_primary,
            can_login: true,
          }),

          this.supabase
            .from('parent_auth_links')
            .upsert(
              { mobile: parent.mobile, neura_id: neuraId, school_id: schoolId },
              { onConflict: 'mobile,neura_id', ignoreDuplicates: true },
            ),
        ])

        if (contactResult.error) {
          throw new DatabaseError(contactResult.error.message, { correlationId, neuraId })
        }
        if (authLinkResult.error) {
          throw new DatabaseError(authLinkResult.error.message, { correlationId, neuraId })
        }
      }),
    )
  }

  async createConsentRecord(
    neuraId: string,
    schoolId: string,
    admittedByTeacherId: string,
    correlationId: string,
  ): Promise<void> {
    this.logger.debug({ correlationId, neuraId, admittedByTeacherId }, 'EnrollmentRepository.createConsentRecord')

    const { error } = await this.supabase.from('consent_records').insert({
      neura_id: neuraId,
      consent_type: 'ENROLLMENT_PRINCIPAL',
      consented_by_role: 'PRINCIPAL',
      consented_by_id: admittedByTeacherId,
      school_id: schoolId,
      consent_text_version: '1.0',
      consented_at: new Date().toISOString(),
    })

    if (error) {
      throw new DatabaseError(error.message, { correlationId, neuraId })
    }
  }
}
