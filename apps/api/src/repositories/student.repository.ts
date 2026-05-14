import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { Logger } from 'pino'
import { DatabaseError, NotFoundError, ValidationError } from '../utils/errors.js'
import type {
  StudentDetail,
  StudentListItem,
  StudentListFilters,
  AdmitStudentInput,
  UpdateStudentInput,
} from '../types/common.js'

function bandFromClassYear(classYear: number): Database['public']['Enums']['age_band'] {
  if (classYear <= 3) return 'FOUNDATION'
  if (classYear <= 6) return 'ELEMENTARY'
  if (classYear <= 8) return 'MIDDLE'
  return 'SECONDARY'
}

// Shape of the embedded students object returned from student_yearly_progress queries
interface EmbeddedStudent {
  full_name: string
  date_of_birth: string
  gender: string | null
  status: string | null
  band: string | null
  deleted_at: string | null
}

export class StudentRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: Logger,
  ) {}

  async generateNeuraId(schoolId: string, correlationId: string): Promise<string> {
    this.logger.debug({ correlationId, schoolId }, 'StudentRepository.generateNeuraId')

    const { data: school, error: schoolError } = await this.supabase
      .from('schools')
      .select('state')
      .eq('id', schoolId)
      .limit(1)
      .single()

    if (schoolError || !school) {
      throw new NotFoundError('School not found', { schoolId, correlationId })
    }

    const stateCode = school.state.toUpperCase()
    if (stateCode !== 'AP' && stateCode !== 'TS') {
      throw new ValidationError('School state must be AP or TS for NeuraID generation', {
        state: school.state,
      })
    }

    const currentYear = new Date().getFullYear()

    // Atomic upsert via Postgres function — not yet in generated types, cast required
    const { data: seq, error: seqError } = await (this.supabase as unknown as {
      rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: number | null; error: unknown }>
    }).rpc('increment_school_sequence', { p_state_code: stateCode, p_year: currentYear })

    if (seqError || seq === null) {
      throw new DatabaseError('Failed to generate NeuraID sequence', { correlationId, seqError })
    }

    return `NID-${currentYear}-${stateCode}-${String(seq).padStart(6, '0')}`
  }

  async getSchoolBoard(schoolId: string, correlationId: string): Promise<string> {
    this.logger.debug({ correlationId, schoolId }, 'StudentRepository.getSchoolBoard')

    const { data, error } = await this.supabase
      .from('schools')
      .select('board')
      .eq('id', schoolId)
      .single()

    if (error || !data) throw new NotFoundError('School not found', { schoolId, correlationId })
    return data.board ?? 'SCERT_AP'
  }

  async findByNeuraId(
    neuraId: string,
    schoolId: string,
    correlationId: string,
  ): Promise<StudentDetail | null> {
    this.logger.debug({ correlationId, neuraId, schoolId }, 'StudentRepository.findByNeuraId')

    const [studentResult, enrollmentResult, progressResult, parentsResult, masteryResult] =
      await Promise.all([
        this.supabase
          .from('students')
          .select(
            'neura_id, full_name, date_of_birth, gender, blood_group, caste_category, status, band, data_consent_given, deleted_at',
          )
          .eq('neura_id', neuraId)
          .is('deleted_at', null)
          .single(),

        this.supabase
          .from('school_enrollments')
          .select('admission_number, enrolled_at, school_id')
          .eq('neura_id', neuraId)
          .eq('school_id', schoolId)
          .eq('status', 'ACTIVE')
          .single(),

        this.supabase
          .from('student_yearly_progress')
          .select('class_year, section, medium, board, smartpad_id')
          .eq('neura_id', neuraId)
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),

        this.supabase
          .from('parent_contacts')
          .select('parent_name, relationship, mobile, is_primary')
          .eq('neura_id', neuraId)
          .eq('school_id', schoolId),

        this.supabase
          .from('calibrated_mastery_scores')
          .select('subject, calibrated_percentile, classification, computed_date')
          .eq('neura_id', neuraId)
          .eq('school_id', schoolId)
          .order('computed_date', { ascending: false }),
      ])

    if (studentResult.error || !studentResult.data) return null
    if (enrollmentResult.error || !enrollmentResult.data) return null

    const s = studentResult.data
    const enroll = enrollmentResult.data
    const progress = progressResult.data
    const parents = parentsResult.data ?? []

    // Latest record per subject
    const masteryMap = new Map<
      string,
      { subject: string; latest_percentile: number | null; classification: string | null; computed_date: string | null }
    >()
    for (const m of masteryResult.data ?? []) {
      if (!masteryMap.has(m.subject)) {
        masteryMap.set(m.subject, {
          subject: m.subject,
          latest_percentile: m.calibrated_percentile,
          classification: m.classification,
          computed_date: m.computed_date,
        })
      }
    }

    return {
      neura_id: s.neura_id,
      full_name: s.full_name,
      date_of_birth: s.date_of_birth,
      gender: s.gender,
      blood_group: s.blood_group,
      caste_category: s.caste_category,
      status: s.status ?? 'ACTIVE',
      band: s.band,
      data_consent_given: s.data_consent_given ?? false,
      enrollment: {
        admission_number: enroll.admission_number,
        enrolled_at: enroll.enrolled_at,
        school_id: enroll.school_id,
      },
      yearly_progress: progress
        ? {
            class_year: progress.class_year,
            section: progress.section,
            medium: progress.medium,
            board: progress.board,
            smartpad_id: progress.smartpad_id,
          }
        : null,
      parents: parents.map((p) => ({
        parent_name: p.parent_name,
        relationship: p.relationship,
        mobile: p.mobile,
        is_primary: p.is_primary ?? false,
      })),
      mastery_summary: Array.from(masteryMap.values()),
    }
  }

  async findBySchool(
    schoolId: string,
    filters: StudentListFilters,
    page: number,
    limit: number,
    correlationId: string,
  ): Promise<{ students: StudentListItem[]; total: number }> {
    this.logger.debug({ correlationId, schoolId, filters, page, limit }, 'StudentRepository.findBySchool')

    if (limit > 100) {
      throw new ValidationError('Limit cannot exceed 100', { limit })
    }

    // Step 1: All active enrolled neura_ids for this school
    const { data: enrollments, error: enrollError } = await this.supabase
      .from('school_enrollments')
      .select('neura_id')
      .eq('school_id', schoolId)
      .eq('status', 'ACTIVE')

    if (enrollError) throw new DatabaseError(enrollError.message, { correlationId, schoolId })
    const activeIds = (enrollments ?? []).map((e) => e.neura_id)
    if (activeIds.length === 0) return { students: [], total: 0 }

    // Step 2: student_yearly_progress with embedded student data
    let ypQuery = this.supabase
      .from('student_yearly_progress')
      .select(
        'neura_id, class_year, section, medium, smartpad_id, students!inner(full_name, date_of_birth, gender, status, band, deleted_at)',
      )
      .eq('school_id', schoolId)
      .in('neura_id', activeIds)

    if (filters.class_year !== undefined) ypQuery = ypQuery.eq('class_year', filters.class_year)
    if (filters.section !== undefined) ypQuery = ypQuery.eq('section', filters.section)

    const { data: ypData, error: ypError } = await ypQuery
    if (ypError) throw new DatabaseError(ypError.message, { correlationId, schoolId })

    // Step 3: JS-level filters for status, band, search, and soft-delete guard
    const rows = (ypData ?? []) as Array<{
      neura_id: string
      class_year: number
      section: string
      medium: string
      smartpad_id: string | null
      students: EmbeddedStudent | EmbeddedStudent[]
    }>

    const filtered = rows.filter((row) => {
      const stu = Array.isArray(row.students) ? row.students[0] : row.students
      if (!stu || stu.deleted_at) return false
      if (filters.status !== undefined && stu.status !== filters.status) return false
      if (filters.band !== undefined && stu.band !== filters.band) return false
      if (
        filters.search !== undefined &&
        !stu.full_name.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false
      return true
    })

    const total = filtered.length
    const paginated = filtered.slice((page - 1) * limit, page * limit)
    if (paginated.length === 0) return { students: [], total }

    // Step 4: SmartPad last_sync_at + mastery classification (parallel)
    const paginatedIds = paginated.map((r) => r.neura_id)

    const [smartpadResult, masteryResult] = await Promise.all([
      this.supabase
        .from('smartpad_devices')
        .select('assigned_neura_id, last_sync_at')
        .eq('school_id', schoolId)
        .in('assigned_neura_id', paginatedIds),

      this.supabase
        .from('calibrated_mastery_scores')
        .select('neura_id, classification, computed_date')
        .eq('school_id', schoolId)
        .in('neura_id', paginatedIds)
        .order('computed_date', { ascending: false }),
    ])

    const smartpadMap = new Map<string, string | null>()
    for (const d of smartpadResult.data ?? []) {
      if (d.assigned_neura_id && !smartpadMap.has(d.assigned_neura_id)) {
        smartpadMap.set(d.assigned_neura_id, d.last_sync_at)
      }
    }

    const masteryMap = new Map<string, string | null>()
    for (const m of masteryResult.data ?? []) {
      if (!masteryMap.has(m.neura_id)) {
        masteryMap.set(m.neura_id, m.classification)
      }
    }

    const students: StudentListItem[] = paginated.map((row) => {
      const stu = Array.isArray(row.students) ? row.students[0] : row.students
      return {
        neura_id: row.neura_id,
        full_name: stu.full_name,
        date_of_birth: stu.date_of_birth,
        gender: stu.gender,
        status: stu.status ?? 'ACTIVE',
        band: stu.band,
        class_year: row.class_year,
        section: row.section,
        medium: row.medium,
        smartpad_id: row.smartpad_id,
        last_sync_at: smartpadMap.get(row.neura_id) ?? null,
        mastery_classification: masteryMap.get(row.neura_id) ?? null,
      }
    })

    return { students, total }
  }

  async createStudent(
    data: AdmitStudentInput & { neura_id: string; school_id: string },
    correlationId: string,
  ): Promise<void> {
    this.logger.debug({ correlationId, neura_id: data.neura_id }, 'StudentRepository.createStudent')

    const { error } = await this.supabase.from('students').insert({
      neura_id: data.neura_id,
      full_name: data.full_name.trim(),
      date_of_birth: data.date_of_birth,
      gender: data.gender ?? null,
      blood_group: data.blood_group ?? null,
      caste_category:
        (data.caste_category as Database['public']['Enums']['fee_category']) ?? null,
      aadhaar_hash: data.aadhaar_hash ?? null,
      band: bandFromClassYear(data.class_year),
      status: 'ACTIVE' as Database['public']['Enums']['student_status'],
      data_consent_given: true,
      consent_version: '1.0',
    })

    if (error) {
      if (error.code === '23505' && error.message.toLowerCase().includes('aadhaar')) {
        throw new ValidationError('A student with this Aadhaar is already enrolled', {
          field: 'aadhaar_hash',
        })
      }
      throw new DatabaseError(error.message, { correlationId, neura_id: data.neura_id })
    }
  }

  async updateStudent(
    neuraId: string,
    schoolId: string,
    updates: UpdateStudentInput,
    correlationId: string,
  ): Promise<void> {
    this.logger.debug({ correlationId, neuraId, schoolId }, 'StudentRepository.updateStudent')

    const { data: enrollment, error: enrollError } = await this.supabase
      .from('school_enrollments')
      .select('neura_id')
      .eq('neura_id', neuraId)
      .eq('school_id', schoolId)
      .eq('status', 'ACTIVE')
      .single()

    if (enrollError || !enrollment) {
      throw new NotFoundError('Student not found in this school', { neura_id: neuraId, schoolId })
    }

    const { error } = await this.supabase
      .from('students')
      .update({
        ...(updates.full_name !== undefined && { full_name: updates.full_name }),
        ...(updates.date_of_birth !== undefined && { date_of_birth: updates.date_of_birth }),
        ...(updates.gender !== undefined && { gender: updates.gender }),
        ...(updates.blood_group !== undefined && { blood_group: updates.blood_group }),
        ...(updates.caste_category !== undefined && {
          caste_category: updates.caste_category as Database['public']['Enums']['fee_category'],
        }),
        updated_at: new Date().toISOString(),
      })
      .eq('neura_id', neuraId)
      .is('deleted_at', null)

    if (error) {
      throw new DatabaseError(error.message, { correlationId, neuraId })
    }
  }

  async softDeleteStudent(
    neuraId: string,
    schoolId: string,
    correlationId: string,
  ): Promise<void> {
    this.logger.debug({ correlationId, neuraId, schoolId }, 'StudentRepository.softDeleteStudent')

    const { data: enrollment } = await this.supabase
      .from('school_enrollments')
      .select('neura_id')
      .eq('neura_id', neuraId)
      .eq('school_id', schoolId)
      .eq('status', 'ACTIVE')
      .single()

    if (!enrollment) {
      throw new NotFoundError('Student not found in this school', { neura_id: neuraId })
    }

    const now = new Date().toISOString()

    const [deleteResult] = await Promise.all([
      this.supabase
        .from('students')
        .update({ deleted_at: now, status: 'DEACTIVATED' as Database['public']['Enums']['student_status'] })
        .eq('neura_id', neuraId),

      this.supabase
        .from('smartpad_devices')
        .update({ assigned_neura_id: null })
        .eq('assigned_neura_id', neuraId),

      this.supabase
        .from('parent_auth_links')
        .delete()
        .eq('neura_id', neuraId),

      this.supabase
        .from('school_enrollments')
        .update({ status: 'EXITED', exited_at: now })
        .eq('neura_id', neuraId)
        .eq('school_id', schoolId),
    ])

    if (deleteResult.error) {
      throw new DatabaseError(deleteResult.error.message, { correlationId, neuraId })
    }
  }
}
