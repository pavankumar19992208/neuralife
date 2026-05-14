import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { Logger } from 'pino'
import { DatabaseError, NotFoundError, ValidationError } from '../utils/errors.js'
import type {
  CreateTeacherInput,
  UpdateTeacherInput,
  TeacherListItem,
  TeacherDetail,
} from '../types/common.js'

export class TeacherRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: Logger,
  ) {}

  async computeLeaveYearLabel(schoolId: string, correlationId: string): Promise<string> {
    this.logger.debug({ correlationId, schoolId }, 'TeacherRepository.computeLeaveYearLabel')

    const { data: school } = await this.supabase
      .from('schools')
      .select('leave_year_start_month')
      .eq('id', schoolId)
      .single()

    const startMonth = school?.leave_year_start_month ?? 6
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // 1-indexed

    if (startMonth === 1) {
      return String(currentYear)
    }

    // If we haven't reached the start month yet this year, the leave year started last year
    const leaveYearStartYear = currentMonth >= startMonth ? currentYear : currentYear - 1
    const shortNext = String(leaveYearStartYear + 1).slice(-2)
    return `${leaveYearStartYear}-${shortNext}`
  }

  async findBySchool(
    schoolId: string,
    academicYearId: string,
    page: number,
    limit: number,
    correlationId: string,
  ): Promise<{ teachers: TeacherListItem[]; total: number }> {
    this.logger.debug({ correlationId, schoolId, page, limit }, 'TeacherRepository.findBySchool')

    const { data: assignments, error } = await this.supabase
      .from('teacher_school_assignments')
      .select('id, teacher_id, designation, employment_type, joining_date, employee_id, status')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .eq('status', 'ACTIVE')

    if (error) throw new DatabaseError(error.message, { correlationId, schoolId })
    if (!assignments || assignments.length === 0) return { teachers: [], total: 0 }

    const total = assignments.length
    const paginated = assignments.slice((page - 1) * limit, page * limit)
    if (paginated.length === 0) return { teachers: [], total }

    const assignmentIds = paginated.map((a) => a.id)
    const teacherIds = paginated.map((a) => a.teacher_id)

    const yearLabel = await this.computeLeaveYearLabel(schoolId, correlationId)

    const [teachersResult, subjectsResult, leavesResult] = await Promise.all([
      this.supabase
        .from('teachers')
        .select('id, full_name, mobile, status, deleted_at')
        .in('id', teacherIds)
        .is('deleted_at', null),

      this.supabase
        .from('teacher_subject_assignments')
        .select('assignment_id, subject, class_year, section, is_class_teacher')
        .in('assignment_id', assignmentIds),

      this.supabase
        .from('leave_balances')
        .select('teacher_id, cl_entitled, cl_used, sl_entitled, sl_used')
        .eq('school_id', schoolId)
        .eq('leave_year_label', yearLabel)
        .in('teacher_id', teacherIds),
    ])

    if (teachersResult.error) throw new DatabaseError(teachersResult.error.message, { correlationId })

    const teacherMap = new Map(
      (teachersResult.data ?? []).map((t) => [t.id, t]),
    )
    const subjectsByAssignment = new Map<string, typeof subjectsResult.data>()
    for (const s of subjectsResult.data ?? []) {
      const list = subjectsByAssignment.get(s.assignment_id) ?? []
      list.push(s)
      subjectsByAssignment.set(s.assignment_id, list)
    }
    const leaveMap = new Map(
      (leavesResult.data ?? []).map((l) => [l.teacher_id, l]),
    )

    const teachers: TeacherListItem[] = paginated
      .filter((a) => teacherMap.has(a.teacher_id))
      .map((a) => {
        const t = teacherMap.get(a.teacher_id)!
        const subs = subjectsByAssignment.get(a.id) ?? []
        const lb = leaveMap.get(a.teacher_id)

        const classTeacherSub = subs.find((s) => s.is_class_teacher)
        const classTeacherOf = classTeacherSub
          ? `${classTeacherSub.class_year}-${classTeacherSub.section}`
          : null

        return {
          teacher_id: a.teacher_id,
          full_name: t.full_name,
          mobile: t.mobile,
          designation: a.designation,
          employment_type: a.employment_type ?? 'REGULAR',
          status: t.status ?? 'ACTIVE',
          subjects: [...new Set(subs.map((s) => s.subject))],
          class_teacher_of: classTeacherOf,
          cl_remaining: (lb?.cl_entitled ?? 12) - (lb?.cl_used ?? 0),
          sl_remaining: (lb?.sl_entitled ?? 10) - (lb?.sl_used ?? 0),
        }
      })

    return { teachers, total }
  }

  async findById(
    teacherId: string,
    schoolId: string,
    correlationId: string,
  ): Promise<TeacherDetail | null> {
    this.logger.debug({ correlationId, teacherId, schoolId }, 'TeacherRepository.findById')

    const yearLabel = await this.computeLeaveYearLabel(schoolId, correlationId)

    const [teacherResult, assignmentResult] = await Promise.all([
      this.supabase
        .from('teachers')
        .select(
          'id, full_name, mobile, email, date_of_birth, gender, pan_number, teaching_qualification, status, deleted_at',
        )
        .eq('id', teacherId)
        .is('deleted_at', null)
        .single(),

      this.supabase
        .from('teacher_school_assignments')
        .select('id, designation, employment_type, joining_date, employee_id, status')
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (teacherResult.error || !teacherResult.data) return null
    if (!assignmentResult.data) return null

    const t = teacherResult.data
    const a = assignmentResult.data

    const [subjectsResult, leaveResult] = await Promise.all([
      this.supabase
        .from('teacher_subject_assignments')
        .select('class_year, section, subject, is_class_teacher')
        .eq('assignment_id', a.id),

      this.supabase
        .from('leave_balances')
        .select('leave_year_label, cl_entitled, cl_used, sl_entitled, sl_used, el_entitled, el_used, lop_days')
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId)
        .eq('leave_year_label', yearLabel)
        .maybeSingle(),
    ])

    const lb = leaveResult.data

    return {
      teacher_id: t.id,
      full_name: t.full_name,
      mobile: t.mobile,
      email: t.email,
      date_of_birth: t.date_of_birth,
      gender: t.gender,
      pan_number: t.pan_number,
      teaching_qualification: t.teaching_qualification,
      status: t.status ?? 'ACTIVE',
      designation: a.designation,
      employment_type: a.employment_type ?? 'REGULAR',
      joining_date: a.joining_date,
      employee_id: a.employee_id,
      subject_assignments: (subjectsResult.data ?? []).map((s) => ({
        class_year: s.class_year,
        section: s.section,
        subject: s.subject,
        is_class_teacher: s.is_class_teacher ?? false,
      })),
      leave_balances: lb
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
    }
  }

  async createTeacher(
    data: CreateTeacherInput,
    schoolId: string,
    academicYearId: string,
    correlationId: string,
  ): Promise<{ teacher_id: string }> {
    this.logger.debug({ correlationId, schoolId, full_name: data.full_name }, 'TeacherRepository.createTeacher')

    // Step 1: Check class teacher conflicts
    for (const sa of data.subject_assignments) {
      if (sa.is_class_teacher) {
        const { data: existing } = await this.supabase
          .from('teacher_subject_assignments')
          .select('id')
          .eq('school_id', schoolId)
          .eq('academic_year_id', academicYearId)
          .eq('class_year', sa.class_year)
          .eq('section', sa.section)
          .eq('is_class_teacher', true)
          .limit(1)
          .maybeSingle()

        if (existing) {
          throw new ValidationError(
            `Another teacher is already class teacher for Class ${sa.class_year}-${sa.section}`,
          )
        }
      }
    }

    // Step 2: Insert teacher
    const { data: teacher, error: teacherError } = await this.supabase
      .from('teachers')
      .insert({
        full_name: data.full_name.trim(),
        mobile: data.mobile,
        email: data.email ?? null,
        date_of_birth: data.date_of_birth ?? null,
        gender: data.gender ?? null,
        pan_number: data.pan_number ?? null,
        aadhaar_hash: data.aadhaar_hash ?? null,
        teaching_qualification: data.teaching_qualification ?? null,
        status: 'ACTIVE',
      })
      .select('id')
      .single()

    if (teacherError || !teacher) {
      if (teacherError?.code === '23505') {
        throw new ValidationError('A teacher with this mobile number already exists', {
          field: 'mobile',
        })
      }
      throw new DatabaseError(teacherError?.message ?? 'Teacher insert failed', { correlationId })
    }

    const teacherId = teacher.id

    // Step 3: Insert school assignment
    const { data: assignment, error: assignError } = await this.supabase
      .from('teacher_school_assignments')
      .insert({
        teacher_id: teacherId,
        school_id: schoolId,
        academic_year_id: academicYearId,
        designation: data.designation,
        employment_type: data.employment_type as Database['public']['Enums']['employment_type'],
        joining_date: data.joining_date,
        employee_id: data.employee_id ?? null,
        status: 'ACTIVE',
      })
      .select('id')
      .single()

    if (assignError || !assignment) {
      throw new DatabaseError(assignError?.message ?? 'Assignment insert failed', { correlationId, teacherId })
    }

    const assignmentId = assignment.id

    // Step 4: Insert subject assignments
    if (data.subject_assignments.length > 0) {
      const { error: subError } = await this.supabase
        .from('teacher_subject_assignments')
        .insert(
          data.subject_assignments.map((sa) => ({
            assignment_id: assignmentId,
            school_id: schoolId,
            academic_year_id: academicYearId,
            class_year: sa.class_year,
            section: sa.section,
            subject: sa.subject,
            is_class_teacher: sa.is_class_teacher,
          })),
        )

      if (subError) {
        throw new DatabaseError(subError.message, { correlationId, teacherId })
      }
    }

    // Step 5: Create leave balance row
    const yearLabel = await this.computeLeaveYearLabel(schoolId, correlationId)
    const { error: leaveError } = await this.supabase.from('leave_balances').insert({
      teacher_id: teacherId,
      school_id: schoolId,
      leave_year_label: yearLabel,
      cl_entitled: 12,
      cl_used: 0,
      sl_entitled: 10,
      sl_used: 0,
      el_entitled: 8,
      el_used: 0,
      lop_days: 0,
    })

    if (leaveError) {
      this.logger.warn({ correlationId, teacherId, leaveError }, 'Leave balance insert failed (non-fatal)')
    }

    return { teacher_id: teacherId }
  }

  async updateTeacher(
    teacherId: string,
    schoolId: string,
    updates: UpdateTeacherInput,
    correlationId: string,
  ): Promise<void> {
    this.logger.debug({ correlationId, teacherId, schoolId }, 'TeacherRepository.updateTeacher')

    const { data: assignment, error: aErr } = await this.supabase
      .from('teacher_school_assignments')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('school_id', schoolId)
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (aErr || !assignment) {
      throw new NotFoundError('Teacher not found in this school', { teacherId, schoolId })
    }

    const { error } = await this.supabase
      .from('teachers')
      .update({
        ...(updates.full_name !== undefined && { full_name: updates.full_name }),
        ...(updates.email !== undefined && { email: updates.email }),
        ...(updates.date_of_birth !== undefined && { date_of_birth: updates.date_of_birth }),
        ...(updates.gender !== undefined && { gender: updates.gender }),
        ...(updates.pan_number !== undefined && { pan_number: updates.pan_number }),
        ...(updates.teaching_qualification !== undefined && {
          teaching_qualification: updates.teaching_qualification,
        }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', teacherId)

    if (error) throw new DatabaseError(error.message, { correlationId, teacherId })
  }

  async softDeleteTeacher(teacherId: string, schoolId: string, correlationId: string): Promise<void> {
    this.logger.debug({ correlationId, teacherId, schoolId }, 'TeacherRepository.softDeleteTeacher')

    const now = new Date().toISOString()

    const [deleteResult, assignResult] = await Promise.all([
      this.supabase
        .from('teachers')
        .update({ deleted_at: now, status: 'RESIGNED' })
        .eq('id', teacherId),

      this.supabase
        .from('teacher_school_assignments')
        .update({ status: 'RESIGNED', exit_date: now })
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId),
    ])

    if (deleteResult.error) throw new DatabaseError(deleteResult.error.message, { correlationId, teacherId })
    if (assignResult.error) throw new DatabaseError(assignResult.error.message, { correlationId, teacherId })
  }

  async getSubjectAssignments(
    teacherId: string,
    schoolId: string,
    correlationId: string,
  ): Promise<Array<{ subject: string; class_year: number; section: string; is_class_teacher: boolean }>> {
    this.logger.debug({ correlationId, teacherId, schoolId }, 'TeacherRepository.getSubjectAssignments')

    const { data, error } = await this.supabase
      .from('teacher_subject_assignments')
      .select('subject, class_year, section, is_class_teacher, teacher_school_assignments!inner(teacher_id)')
      .eq('school_id', schoolId)
      .eq('teacher_school_assignments.teacher_id', teacherId)

    if (error) throw new DatabaseError(error.message, { correlationId, teacherId })
    return (data ?? []).map((a) => ({
      subject: a.subject,
      class_year: a.class_year,
      section: a.section,
      is_class_teacher: a.is_class_teacher ?? false,
    }))
  }
}
