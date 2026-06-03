import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { FastifyBaseLogger } from 'fastify'
import { DatabaseError } from '../utils/errors.js'

type DayOfWeek = Database['public']['Enums']['day_of_week']

// ─── Domain types ──────────────────────────────────────────────────────────────

export interface TimetableSlot {
  id: string
  period_number: number
  start_time: string
  end_time: string
  subject: string
  teacher_id: string | null
  period_type: string
  room_number: string | null
  subject_type: string | null
  class_year: number
  section: string
  is_double_period: boolean | null
}

export interface TeacherSchoolInfo {
  teacherId: string
  fullName: string
  firstName: string
  schoolName: string
  logoUrl: string | null
  brandColor: string
}

export interface ClassAttendanceSummary {
  present: number
  absent: number
  late: number
}

export interface AbsenceStreakStudent {
  neuraId: string
  fullName: string
  consecutiveDays: number
}

// ─── Repository ────────────────────────────────────────────────────────────────

export class TeacherMobileRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: FastifyBaseLogger,
  ) {}

  /** Fetch today's timetable slots for a specific teacher. */
  async getTodayTimetable(
    teacherId: string,
    schoolId: string,
    dayOfWeek: string,
    correlationId: string,
  ): Promise<TimetableSlot[]> {
    this.logger.debug({ correlationId, teacherId, dayOfWeek }, 'TeacherMobileRepo.getTodayTimetable')

    const { data, error } = await (this.supabase as unknown as SupabaseClient)
      .from('timetable_slots')
      .select('id, period_number, start_time, end_time, subject, teacher_id, period_type, room_number, subject_type, class_year, section, is_double_period')
      .eq('school_id', schoolId)
      .eq('teacher_id', teacherId)
      .eq('day_of_week', dayOfWeek as DayOfWeek)
      .order('period_number', { ascending: true })

    if (error) throw new DatabaseError(error.message, { teacherId, dayOfWeek, correlationId })
    return (data ?? []) as TimetableSlot[]
  }

  /** Fetch non-teaching slots (BREAK/LUNCH/ASSEMBLY/FREE) for a class section today. */
  async getClassNonTeachingSlots(
    schoolId: string,
    classYear: number,
    section: string,
    dayOfWeek: string,
    correlationId: string,
  ): Promise<TimetableSlot[]> {
    this.logger.debug({ correlationId, classYear, section, dayOfWeek }, 'getClassNonTeachingSlots')

    const { data, error } = await (this.supabase as unknown as SupabaseClient)
      .from('timetable_slots')
      .select('id, period_number, start_time, end_time, subject, teacher_id, period_type, room_number, subject_type, class_year, section, is_double_period')
      .eq('school_id', schoolId)
      .eq('class_year', classYear)
      .eq('section', section)
      .eq('day_of_week', dayOfWeek as DayOfWeek)
      .in('period_type', ['BREAK', 'LUNCH', 'ASSEMBLY', 'FREE'])
      .order('period_number', { ascending: true })

    if (error) {
      this.logger.warn({ correlationId, error }, 'getClassNonTeachingSlots failed')
      return []
    }
    return (data ?? []) as TimetableSlot[]
  }

  /** Teacher name + school branding (schools.name, not school_name). */
  async getTeacherWithSchool(
    teacherId: string,
    schoolId: string,
    correlationId: string,
  ): Promise<TeacherSchoolInfo> {
    this.logger.debug({ correlationId, teacherId, schoolId }, 'TeacherMobileRepo.getTeacherWithSchool')

    const [teacherResult, schoolResult] = await Promise.all([
      this.supabase
        .from('teachers')
        .select('id, full_name')
        .eq('id', teacherId)
        .single(),
      this.supabase
        .from('schools')
        .select('name')         // DB column is `name`, not `school_name`
        .eq('id', schoolId)
        .single(),
    ])

    if (teacherResult.error) throw new DatabaseError(teacherResult.error.message, { teacherId, correlationId })

    const fullName: string = (teacherResult.data as { full_name: string } | null)?.full_name ?? 'Teacher'
    const firstName = fullName.split(' ').find(w => w.length > 0) ?? fullName

    // Schools table has `name` but no logo_url or brand_color yet.
    // Return sensible defaults — the school store will be updated from this.
    const schoolName: string = (schoolResult.data as { name: string } | null)?.name ?? 'Vikas High School'

    return {
      teacherId,
      fullName,
      firstName,
      schoolName,
      logoUrl: null,           // logo_url not in DB schema yet
      brandColor: '#6366f1',   // brand_color not in DB schema yet — use NeuraLife default
    }
  }

  /** Is this teacher a class teacher, and for which section? */
  async getClassTeacherSection(
    teacherId: string,
    schoolId: string,
    academicYearId: string,
    correlationId: string,
  ): Promise<{ classYear: number; section: string } | null> {
    this.logger.debug({ correlationId, teacherId }, 'TeacherMobileRepo.getClassTeacherSection')

    // teacher_subject_assignments references teacher via the school assignment ID
    const { data: assignData, error: assignError } = await this.supabase
      .from('teacher_school_assignments')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .single()

    if (assignError || !assignData) return null

    const { data: subjectAssign, error: subjectError } = await this.supabase
      .from('teacher_subject_assignments')
      .select('class_year, section')
      .eq('assignment_id', (assignData as { id: string }).id)
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .eq('is_class_teacher', true)
      .limit(1)
      .single()

    if (subjectError || !subjectAssign) return null

    const row = subjectAssign as { class_year: number; section: string }
    return { classYear: row.class_year, section: row.section }
  }

  /** Get neura_ids enrolled in a class section (for joining with attendance). */
  private async getClassNeuraIds(
    schoolId: string,
    academicYearId: string,
    classYear: number,
    section: string,
    correlationId: string,
  ): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('student_yearly_progress')
      .select('neura_id')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .eq('class_year', classYear)
      .eq('section', section)

    if (error) {
      this.logger.warn({ correlationId, error }, 'getClassNeuraIds failed')
      return []
    }
    return (data ?? []).map((r: { neura_id: string }) => r.neura_id)
  }

  /** Check if attendance has been marked for a class section today.
   *  Uses student_yearly_progress to find enrolled students, then queries attendance. */
  async isAttendanceMarked(
    schoolId: string,
    academicYearId: string | null,
    classYear: number,
    section: string,
    today: string,
    correlationId: string,
  ): Promise<boolean> {
    this.logger.debug({ correlationId, classYear, section, today }, 'isAttendanceMarked')

    if (!academicYearId) return false

    const neuraIds = await this.getClassNeuraIds(schoolId, academicYearId, classYear, section, correlationId)
    if (neuraIds.length === 0) return false

    const { count, error } = await this.supabase
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .in('neura_id', neuraIds)
      .eq('attendance_date', today)

    if (error) {
      this.logger.warn({ correlationId, error }, 'isAttendanceMarked failed — defaulting false')
      return false
    }
    return (count ?? 0) > 0
  }

  /** Count attendance status for a class section today (class teacher KPI). */
  async getClassAttendanceCounts(
    schoolId: string,
    academicYearId: string | null,
    classYear: number,
    section: string,
    today: string,
    correlationId: string,
  ): Promise<ClassAttendanceSummary> {
    this.logger.debug({ correlationId, classYear, section }, 'getClassAttendanceCounts')

    if (!academicYearId) return { present: 0, absent: 0, late: 0 }

    const neuraIds = await this.getClassNeuraIds(schoolId, academicYearId, classYear, section, correlationId)
    if (neuraIds.length === 0) return { present: 0, absent: 0, late: 0 }

    const { data, error } = await this.supabase
      .from('attendance')
      .select('status')
      .eq('school_id', schoolId)
      .in('neura_id', neuraIds)
      .eq('attendance_date', today)

    if (error) {
      this.logger.warn({ correlationId, error }, 'getClassAttendanceCounts failed')
      return { present: 0, absent: 0, late: 0 }
    }

    const rows = (data ?? []) as { status: string }[]
    return {
      present: rows.filter(r => r.status === 'PRESENT').length,
      absent:  rows.filter(r => r.status === 'ABSENT').length,
      late:    rows.filter(r => r.status === 'LATE').length,
    }
  }

  /** Count homework assignments due today for this teacher. */
  async getHomeworkDueToday(
    teacherId: string,
    schoolId: string,
    today: string,
    correlationId: string,
  ): Promise<number> {
    this.logger.debug({ correlationId, teacherId, today }, 'getHomeworkDueToday')

    const { count, error } = await this.supabase
      .from('homework')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', teacherId)
      .eq('school_id', schoolId)
      .eq('due_date', today)

    if (error) {
      this.logger.warn({ correlationId, error }, 'getHomeworkDueToday failed')
      return 0
    }
    return count ?? 0
  }

  /** Homework past due_date for alert generation. */
  async getOverdueHomework(
    teacherId: string,
    schoolId: string,
    today: string,
    correlationId: string,
  ): Promise<Array<{ id: string; title: string; class_year: number; section: string; due_date: string }>> {
    this.logger.debug({ correlationId, teacherId }, 'getOverdueHomework')

    const { data, error } = await this.supabase
      .from('homework')
      .select('id, title, class_year, section, due_date')
      .eq('teacher_id', teacherId)
      .eq('school_id', schoolId)
      .lt('due_date', today)
      .order('due_date', { ascending: false })
      .limit(5)

    if (error) {
      this.logger.warn({ correlationId, error }, 'getOverdueHomework failed')
      return []
    }
    return (data ?? []) as Array<{ id: string; title: string; class_year: number; section: string; due_date: string }>
  }

  /** Count enrolled students in a class section (for period student_count). */
  async getStudentCountForClass(
    schoolId: string,
    academicYearId: string,
    classYear: number,
    section: string,
    correlationId: string,
  ): Promise<number> {
    this.logger.debug({ correlationId, classYear, section }, 'getStudentCountForClass')

    const { count, error } = await this.supabase
      .from('student_yearly_progress')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .eq('class_year', classYear)
      .eq('section', section)

    if (error) {
      this.logger.warn({ correlationId, error }, 'getStudentCountForClass failed — returning 0')
      return 0
    }
    return count ?? 0
  }

  /** Find students with 3+ absence days in last 7 days (for ABSENCE_STREAK alert). */
  async getAbsenceStreakStudents(
    schoolId: string,
    academicYearId: string | null,
    classYear: number,
    section: string,
    correlationId: string,
  ): Promise<AbsenceStreakStudent[]> {
    this.logger.debug({ correlationId, classYear, section }, 'getAbsenceStreakStudents')

    if (!academicYearId) return []

    const neuraIds = await this.getClassNeuraIds(schoolId, academicYearId, classYear, section, correlationId)
    if (neuraIds.length === 0) return []

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data, error } = await this.supabase
      .from('attendance')
      .select('neura_id, attendance_date')
      .eq('school_id', schoolId)
      .in('neura_id', neuraIds)
      .eq('status', 'ABSENT' as unknown as never)
      .gte('attendance_date', sevenDaysAgo)
      .order('attendance_date', { ascending: false })

    if (error) {
      this.logger.warn({ correlationId, error }, 'getAbsenceStreakStudents failed')
      return []
    }

    const rows = (data ?? []) as { neura_id: string; attendance_date: string }[]

    // Count distinct absence days per student
    const studentDays: Map<string, Set<string>> = new Map()
    for (const row of rows) {
      const existing = studentDays.get(row.neura_id) ?? new Set<string>()
      existing.add(row.attendance_date)
      studentDays.set(row.neura_id, existing)
    }

    const streakers: Array<{ neuraId: string; days: number }> = []
    for (const [neuraId, days] of studentDays) {
      if (days.size >= 3) streakers.push({ neuraId, days: days.size })
    }

    if (streakers.length === 0) return []

    const { data: students } = await this.supabase
      .from('students')
      .select('neura_id, full_name')
      .in('neura_id', streakers.map(s => s.neuraId))

    const nameMap = new Map(
      (students ?? []).map((s: { neura_id: string; full_name: string }) => [s.neura_id, s.full_name]),
    )

    return streakers.map(s => ({
      neuraId: s.neuraId,
      fullName: nameMap.get(s.neuraId) ?? s.neuraId,
      consecutiveDays: s.days,
    }))
  }

  /** Get current academic year ID for this school. */
  async getCurrentAcademicYearId(schoolId: string, correlationId: string): Promise<string | null> {
    this.logger.debug({ correlationId, schoolId }, 'getCurrentAcademicYearId')

    const { data, error } = await this.supabase
      .from('academic_years')
      .select('id')
      .eq('school_id', schoolId)
      .eq('is_current', true)
      .single()

    if (error || !data) {
      this.logger.warn({ correlationId, error }, 'getCurrentAcademicYearId failed')
      return null
    }
    return (data as { id: string }).id
  }

  /** Check timetable exceptions for today. */
  async getTimetableExceptions(
    schoolId: string,
    teacherId: string,
    today: string,
    correlationId: string,
  ): Promise<Array<{
    period_number: number; exception_type: string; class_year: number; section: string;
    substitute_teacher_id: string | null; original_teacher_id: string | null; subject: string | null;
  }>> {
    this.logger.debug({ correlationId, teacherId, today }, 'getTimetableExceptions')

    const { data, error } = await this.supabase
      .from('timetable_exceptions')
      .select('period_number, exception_type, class_year, section, substitute_teacher_id, original_teacher_id, subject')
      .eq('school_id', schoolId)
      .eq('exception_date', today)

    if (error) {
      this.logger.warn({ correlationId, error }, 'getTimetableExceptions failed — ignoring')
      return []
    }
    return (data ?? []) as Array<{
      period_number: number; exception_type: string; class_year: number; section: string;
      substitute_teacher_id: string | null; original_teacher_id: string | null; subject: string | null;
    }>
  }
}
