import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { FastifyBaseLogger } from 'fastify'
import { DatabaseError, NotFoundError, ValidationError } from '../utils/errors.js'
import type {
  Exam,
  ExamSubject,
  ExamMark,
  ExamSummary,
  CreateExamInput,
  BulkMarksInput,
  MarksSheet,
  MarksSheetStudent,
  GradeConfig,
} from '../types/common.js'

export class ExamRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: FastifyBaseLogger,
  ) {}

  // ─── Exam CRUD ────────────────────────────────────────────────────────────

  async createExam(
    schoolId: string,
    academicYearId: string,
    input: CreateExamInput,
    createdBy: string,
    correlationId: string,
  ): Promise<Exam> {
    this.logger.debug({ correlationId, schoolId }, 'ExamRepository.createExam')

    const { data: exam, error: examError } = await this.supabase
      .from('exams')
      .insert({
        school_id: schoolId,
        academic_year_id: academicYearId,
        name: input.name.trim(),
        exam_type: input.exam_type,
        description: input.description?.trim() ?? null,
        start_date: input.start_date,
        end_date: input.end_date,
        status: 'DRAFT',
        schedule_type: input.schedule_type ?? 'INDIVIDUAL',
        created_by: createdBy,
        chapter_ids: (input.chapter_ids ?? []) as unknown as never,
      })
      .select('id, school_id, academic_year_id, name, exam_type, description, start_date, end_date, status, created_by, created_at, updated_at, ai_insight, chapter_ids')
      .single()

    if (examError) throw new DatabaseError(examError.message, { correlationId })
    if (!exam) throw new DatabaseError('Exam insert returned no data', { correlationId })

    if (input.subjects.length > 0) {
      const subjectRows = input.subjects.map((s) => ({
        exam_id: exam.id,
        subject: s.subject.trim(),
        class_year: s.class_year,
        section: s.section ?? null,
        max_marks: s.max_marks ?? 100,
        pass_marks: s.pass_marks ?? 35,
        teacher_id: s.teacher_id ?? null,
        exam_date: s.exam_date ?? null,
      }))

      const { error: subError } = await this.supabase
        .from('exam_subjects')
        .insert(subjectRows)

      if (subError) throw new DatabaseError(subError.message, { correlationId, examId: exam.id })
    }

    return exam as Exam
  }

  async listExams(
    schoolId: string,
    academicYearId: string,
    correlationId: string,
    filters: { status?: string; exam_type?: string } = {},
  ): Promise<ExamSummary[]> {
    this.logger.debug({ correlationId, schoolId }, 'ExamRepository.listExams')

    let query = this.supabase
      .from('exams')
      .select(`
        id, school_id, academic_year_id, name, exam_type, description,
        start_date, end_date, status, created_at, ai_insight, chapter_ids,
        exam_subjects(id, class_year)
      `)
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .is('deleted_at', null)
      .order('start_date', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status as Database["public"]["Enums"]["exam_status"])
    if (filters.exam_type) query = query.eq('exam_type', filters.exam_type as Database["public"]["Enums"]["exam_type"])

    const { data, error } = await query
    if (error) throw new DatabaseError(error.message, { correlationId })

    return (data ?? []).map((e) => {
      const rawSubjects = Array.isArray(e.exam_subjects)
        ? (e.exam_subjects as Array<{ id: string; class_year: number }>)
        : []
      const classYears = [...new Set(rawSubjects.map((s) => s.class_year))].sort((a, b) => a - b)
      const class_range = classYears.length === 0
        ? null
        : classYears.length === 1
          ? `${classYears[0]}`
          : `${classYears[0]}-${classYears[classYears.length - 1]}`
      return {
        id: e.id,
        school_id: e.school_id,
        academic_year_id: e.academic_year_id,
        name: e.name,
        exam_type: e.exam_type as Exam['exam_type'],
        description: e.description,
        start_date: e.start_date,
        end_date: e.end_date,
        status: e.status as Exam['status'],
        subjects_count: rawSubjects.length,
        marks_entered_count: 0,
        marks_total_count: 0,
        ai_insight: (e as unknown as { ai_insight: string | null }).ai_insight ?? null,
        chapter_ids: ((e as unknown as { chapter_ids: string[] | null }).chapter_ids ?? []) as string[],
        class_range,
        schedule_type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'BATCH',
        created_at: e.created_at,
      }
    })
  }

  async getExamById(examId: string, schoolId: string, correlationId: string): Promise<Exam & { subjects: ExamSubject[] }> {
    this.logger.debug({ correlationId, examId }, 'ExamRepository.getExamById')

    const { data, error } = await this.supabase
      .from('exams')
      .select(`
        id, school_id, academic_year_id, name, exam_type, description,
        start_date, end_date, status, created_by, created_at, updated_at,
        exam_subjects(id, exam_id, subject, class_year, section, max_marks, pass_marks, teacher_id, exam_date, created_at)
      `)
      .eq('id', examId)
      .eq('school_id', schoolId)
      .is('deleted_at', null)
      .single()

    if (error) throw new DatabaseError(error.message, { correlationId, examId })
    if (!data) throw new NotFoundError('Exam not found', { exam_id: examId })

    const subjects = (data.exam_subjects ?? []) as unknown as ExamSubject[]

    if (subjects.length > 0) {
      const teacherIds = subjects.filter((s) => s.teacher_id).map((s) => s.teacher_id!)
      if (teacherIds.length > 0) {
        const { data: teachers } = await this.supabase
          .from('teachers')
          .select('id, full_name')
          .in('id', teacherIds)

        const teacherMap = new Map((teachers ?? []).map((t) => [t.id, t.full_name]))
        subjects.forEach((s) => {
          if (s.teacher_id) s.teacher_name = teacherMap.get(s.teacher_id) ?? null
        })
      }
    }

    return { ...(data as unknown as Exam), subjects }
  }

  async updateExam(
    examId: string,
    schoolId: string,
    updates: { name?: string; description?: string; start_date?: string; end_date?: string; status?: string },
    correlationId: string,
  ): Promise<Exam> {
    this.logger.debug({ correlationId, examId }, 'ExamRepository.updateExam')

    const { data, error } = await this.supabase
      .from('exams')
      .update({ ...updates as Record<string, unknown>, updated_at: new Date().toISOString() } as never)
      .eq('id', examId)
      .eq('school_id', schoolId)
      .is('deleted_at', null)
      .select('id, school_id, academic_year_id, name, exam_type, description, start_date, end_date, status, created_by, created_at, updated_at')
      .single()

    if (error) throw new DatabaseError(error.message, { correlationId, examId })
    if (!data) throw new NotFoundError('Exam not found', { exam_id: examId })

    return data as Exam
  }

  async softDeleteExam(examId: string, schoolId: string, correlationId: string): Promise<void> {
    this.logger.debug({ correlationId, examId }, 'ExamRepository.softDeleteExam')

    const { error } = await this.supabase
      .from('exams')
      .update({ deleted_at: new Date().toISOString(), status: 'ARCHIVED' })
      .eq('id', examId)
      .eq('school_id', schoolId)

    if (error) throw new DatabaseError(error.message, { correlationId, examId })
  }

  // ─── Subjects ─────────────────────────────────────────────────────────────

  async addSubjects(
    examId: string,
    subjects: CreateExamInput['subjects'],
    correlationId: string,
  ): Promise<ExamSubject[]> {
    this.logger.debug({ correlationId, examId }, 'ExamRepository.addSubjects')

    const rows = subjects.map((s) => ({
      exam_id: examId,
      subject: s.subject.trim(),
      class_year: s.class_year,
      section: s.section ?? null,
      max_marks: s.max_marks ?? 100,
      pass_marks: s.pass_marks ?? 35,
      teacher_id: s.teacher_id ?? null,
    }))

    const { data, error } = await this.supabase
      .from('exam_subjects')
      .upsert(rows, { onConflict: 'exam_id,subject,class_year,section' })
      .select('id, exam_id, subject, class_year, section, max_marks, pass_marks, teacher_id, created_at')

    if (error) throw new DatabaseError(error.message, { correlationId, examId })
    return (data ?? []) as unknown as ExamSubject[]
  }

  // ─── Marks ────────────────────────────────────────────────────────────────

  async getMarksSheet(
    examId: string,
    examSubjectId: string,
    schoolId: string,
    correlationId: string,
  ): Promise<MarksSheet> {
    this.logger.debug({ correlationId, examId, examSubjectId }, 'ExamRepository.getMarksSheet')

    const { data: subject, error: subError } = await this.supabase
      .from('exam_subjects')
      .select('id, exam_id, subject, class_year, section, max_marks, pass_marks, teacher_id, created_at')
      .eq('id', examSubjectId)
      .eq('exam_id', examId)
      .single()

    if (subError) throw new DatabaseError(subError.message, { correlationId })
    if (!subject) throw new NotFoundError('Exam subject not found', { exam_subject_id: examSubjectId })

    const { data: exam, error: examError } = await this.supabase
      .from('exams')
      .select('id, name, exam_type, status')
      .eq('id', examId)
      .eq('school_id', schoolId)
      .single()

    if (examError) throw new DatabaseError(examError.message, { correlationId })
    if (!exam) throw new NotFoundError('Exam not found', { exam_id: examId })

    let studentQuery = this.supabase
      .from('student_yearly_progress')
      .select(`
        neura_id,
        students!inner(neura_id, full_name)
      `)
      .eq('class_year', subject.class_year)

    if (subject.section) {
      studentQuery = studentQuery.eq('section', subject.section)
    }

    // Join enrollment to get school
    const { data: progressRows, error: progError } = await this.supabase
      .from('student_yearly_progress')
      .select(`
        neura_id, section,
        students!inner(neura_id, full_name, status)
      `)
      .eq('class_year', subject.class_year)
      .eq(subject.section ? 'section' : 'class_year', subject.section ?? subject.class_year)

    if (progError) throw new DatabaseError(progError.message, { correlationId })

    const neuraIds = (progressRows ?? []).map((r) => r.neura_id)

    let existingMarks: ExamMark[] = []
    if (neuraIds.length > 0) {
      const { data: marks, error: marksError } = await this.supabase
        .from('exam_marks')
        .select('id, exam_id, exam_subject_id, neura_id, marks_obtained, is_absent, entered_by, entered_at, updated_at')
        .eq('exam_subject_id', examSubjectId)
        .in('neura_id', neuraIds)

      if (marksError) throw new DatabaseError(marksError.message, { correlationId })
      existingMarks = (marks ?? []) as unknown as ExamMark[]
    }

    const marksMap = new Map(existingMarks.map((m) => [m.neura_id, m]))

    const students: MarksSheetStudent[] = (progressRows ?? []).map((row) => {
      const student = row.students as unknown as { neura_id: string; full_name: string; status: string }
      const mark = marksMap.get(row.neura_id)
      const maxMarks = subject.max_marks
      const pct = mark?.marks_obtained != null ? (mark.marks_obtained / maxMarks) * 100 : null
      return {
        neura_id: row.neura_id,
        full_name: student.full_name,
        marks_obtained: mark?.marks_obtained ?? null,
        is_absent: mark?.is_absent ?? false,
        percentage: pct != null ? Math.round(pct * 100) / 100 : null,
        grade: pct != null ? null : null,
        entered_at: mark?.entered_at ?? null,
      }
    })

    return {
      exam: exam as Pick<Exam, 'id' | 'name' | 'exam_type' | 'status'>,
      subject: subject as unknown as ExamSubject,
      students,
    }
  }

  async bulkUpsertMarks(
    examId: string,
    input: BulkMarksInput,
    enteredBy: string,
    correlationId: string,
  ): Promise<number> {
    this.logger.debug({ correlationId, examId }, 'ExamRepository.bulkUpsertMarks')

    const now = new Date().toISOString()
    const rows = input.marks.map((m) => ({
      exam_id: examId,
      exam_subject_id: input.exam_subject_id,
      neura_id: m.neura_id,
      marks_obtained: m.is_absent ? null : m.marks_obtained,
      is_absent: m.is_absent,
      entered_by: enteredBy,
      entered_at: now,
      updated_at: now,
    }))

    const { error } = await this.supabase
      .from('exam_marks')
      .upsert(rows, { onConflict: 'exam_subject_id,neura_id' })

    if (error) throw new DatabaseError(error.message, { correlationId, examId })

    return rows.length
  }

  async updateSingleStudentMark(
    examSubjectId: string,
    neuraId: string,
    updates: { marks_obtained?: number | null; is_absent?: boolean },
    enteredBy: string,
    correlationId: string,
  ): Promise<ExamMark> {
    this.logger.debug({ correlationId, examSubjectId, neuraId }, 'ExamRepository.updateSingleStudentMark')

    const { data, error } = await this.supabase
      .from('exam_marks')
      .update({
        ...updates,
        entered_by: enteredBy,
        entered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('exam_subject_id', examSubjectId)
      .eq('neura_id', neuraId)
      .select('id, exam_id, exam_subject_id, neura_id, marks_obtained, is_absent, entered_by, entered_at, updated_at')
      .single()

    if (error) throw new DatabaseError(error.message, { correlationId })
    if (!data) throw new NotFoundError('Mark not found', { exam_subject_id: examSubjectId, neura_id: neuraId })

    return data as unknown as ExamMark
  }

  // ─── Results Query ────────────────────────────────────────────────────────

  async getExamResults(examId: string, correlationId: string): Promise<Array<{
    neura_id: string
    student_name: string
    class_year: number
    section: string
    total_marks_obtained: number
    total_max_marks: number
    percentage: number
    grade: string
    class_rank: number | null
    overall_rank: number | null
    is_pass: boolean
    subject_results: unknown
    neuracoin_earned: number
    teacher_remarks: string | null
    computed_at: string
  }>> {
    this.logger.debug({ correlationId, examId }, 'ExamRepository.getExamResults')

    const { data, error } = await this.supabase
      .from('exam_results')
      .select(`
        neura_id, total_marks_obtained, total_max_marks, percentage, grade,
        class_rank, overall_rank, is_pass, subject_results,
        neuracoin_earned, teacher_remarks, computed_at, class_year, section,
        students!inner(full_name)
      `)
      .eq('exam_id', examId)
      .order('class_rank', { ascending: true, nullsFirst: false })

    if (error) throw new DatabaseError(error.message, { correlationId, examId })

    return (data ?? []).map((r) => {
      const student = r.students as unknown as { full_name: string }
      return {
        neura_id: r.neura_id,
        student_name: student.full_name,
        class_year: (r as unknown as { class_year: number | null }).class_year ?? 0,
        section: (r as unknown as { section: string | null }).section ?? '',
        total_marks_obtained: Number(r.total_marks_obtained),
        total_max_marks: r.total_max_marks,
        percentage: Number(r.percentage),
        grade: r.grade,
        class_rank: r.class_rank,
        overall_rank: r.overall_rank,
        is_pass: r.is_pass,
        subject_results: r.subject_results,
        neuracoin_earned: r.neuracoin_earned,
        teacher_remarks: r.teacher_remarks,
        computed_at: r.computed_at,
      }
    })
  }

  async getStudentExamHistory(
    neuraId: string,
    schoolId: string,
    correlationId: string,
  ): Promise<Array<{ exam_name: string; exam_type: string; start_date: string; percentage: number; grade: string; class_rank: number | null; is_pass: boolean; neuracoin_earned: number }>> {
    this.logger.debug({ correlationId, neuraId }, 'ExamRepository.getStudentExamHistory')

    const { data, error } = await this.supabase
      .from('exam_results')
      .select(`
        percentage, grade, class_rank, is_pass, neuracoin_earned,
        exams!inner(name, exam_type, start_date, school_id)
      `)
      .eq('neura_id', neuraId)
      .eq('exams.school_id', schoolId)
      .order('exams.start_date', { ascending: false })

    if (error) throw new DatabaseError(error.message, { correlationId })

    return (data ?? []).map((r) => {
      const exam = r.exams as unknown as { name: string; exam_type: string; start_date: string }
      return {
        exam_name: exam.name,
        exam_type: exam.exam_type,
        start_date: exam.start_date,
        percentage: Number(r.percentage),
        grade: r.grade,
        class_rank: r.class_rank,
        is_pass: r.is_pass,
        neuracoin_earned: r.neuracoin_earned,
      }
    })
  }

  // ─── Grade Config ─────────────────────────────────────────────────────────

  async getGradeConfig(schoolId: string, correlationId: string): Promise<GradeConfig[]> {
    this.logger.debug({ correlationId, schoolId }, 'ExamRepository.getGradeConfig')

    const { data, error } = await this.supabase
      .from('grade_config')
      .select('id, school_id, grade_label, min_percentage, max_percentage, grade_points, neuracoin_reward, display_color, sort_order')
      .or(`school_id.eq.${schoolId},school_id.is.null`)
      .order('sort_order')

    if (error) throw new DatabaseError(error.message, { correlationId })

    const configs = (data ?? []) as GradeConfig[]
    // Prefer school-specific config over defaults; deduplicate by grade_label
    const byLabel = new Map<string, GradeConfig>()
    for (const cfg of configs) {
      if (!byLabel.has(cfg.grade_label) || cfg.school_id === schoolId) {
        byLabel.set(cfg.grade_label, cfg)
      }
    }

    return Array.from(byLabel.values()).sort((a, b) => a.sort_order - b.sort_order)
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  async getMarksForExam(examId: string, correlationId: string): Promise<ExamMark[]> {
    this.logger.debug({ correlationId, examId }, 'ExamRepository.getMarksForExam')

    const { data, error } = await this.supabase
      .from('exam_marks')
      .select('id, exam_id, exam_subject_id, neura_id, marks_obtained, is_absent, entered_by, entered_at, updated_at')
      .eq('exam_id', examId)

    if (error) throw new DatabaseError(error.message, { correlationId })
    return (data ?? []) as unknown as ExamMark[]
  }

  async getSubjectsForExam(examId: string, correlationId: string): Promise<ExamSubject[]> {
    const { data, error } = await this.supabase
      .from('exam_subjects')
      .select('id, exam_id, subject, class_year, section, max_marks, pass_marks, teacher_id, created_at')
      .eq('exam_id', examId)
      .order('class_year')
      .order('subject')

    if (error) throw new DatabaseError(error.message, { correlationId })
    return (data ?? []) as unknown as ExamSubject[]
  }

  async getEnrolledStudentIds(
    schoolId: string,
    academicYearId: string,
    classYear: number,
    section: string | null,
    correlationId: string,
  ): Promise<Array<{ neura_id: string; class_year: number; section: string }>> {
    this.logger.debug({ correlationId, schoolId, classYear }, 'ExamRepository.getEnrolledStudentIds')

    let query = this.supabase
      .from('student_yearly_progress')
      .select('neura_id, class_year, section')
      .eq('academic_year_id', academicYearId)
      .eq('class_year', classYear)

    if (section) query = query.eq('section', section)

    const { data, error } = await query
    if (error) throw new DatabaseError(error.message, { correlationId })
    return data ?? []
  }

  async saveExamResults(
    examId: string,
    results: Array<{
      neura_id: string
      class_year: number | null
      section: string | null
      total_marks_obtained: number
      total_max_marks: number
      percentage: number
      grade: string
      class_rank: number | null
      overall_rank: number | null
      is_pass: boolean
      subject_results: unknown
      neuracoin_earned: number
    }>,
    correlationId: string,
  ): Promise<void> {
    this.logger.debug({ correlationId, examId, count: results.length }, 'ExamRepository.saveExamResults')

    const rows = results.map((r) => ({
      exam_id: examId,
      ...r,
      computed_at: new Date().toISOString(),
    }))

    const { error } = await this.supabase
      .from('exam_results')
      .upsert(rows, { onConflict: 'exam_id,neura_id' })

    if (error) throw new DatabaseError(error.message, { correlationId, examId })
  }

  async getReportCardData(
    examId: string,
    neuraId: string,
    schoolId: string,
    correlationId: string,
  ): Promise<{
    result: {
      total_marks_obtained: number
      total_max_marks: number
      percentage: number
      grade: string
      class_rank: number | null
      overall_rank: number | null
      is_pass: boolean
      subject_results: unknown
      neuracoin_earned: number
      teacher_remarks: string | null
    } | null
    exam: { id: string; name: string; exam_type: string; start_date: string; end_date: string; academic_year_label: string }
    school: { id: string; name: string; address: string | null; district: string | null; board: string | null }
    student: { neura_id: string; full_name: string; class_year: number; section: string; date_of_birth: string | null; gender: string | null; parent_name: string | null }
    total_students_in_class: number
  }> {
    this.logger.debug({ correlationId, examId, neuraId }, 'ExamRepository.getReportCardData')

    const [examRes, studentRes, resultRes] = await Promise.all([
      this.supabase
        .from('exams')
        .select(`id, name, exam_type, start_date, end_date, academic_years!inner(year_label)`)
        .eq('id', examId)
        .eq('school_id', schoolId)
        .single(),
      this.supabase
        .from('students')
        .select(`
          neura_id, full_name, date_of_birth, gender,
          student_yearly_progress!inner(class_year, section),
          parent_contacts!inner(parent_name, is_primary)
        `)
        .eq('neura_id', neuraId)
        .single(),
      this.supabase
        .from('exam_results')
        .select('total_marks_obtained, total_max_marks, percentage, grade, class_rank, overall_rank, is_pass, subject_results, neuracoin_earned, teacher_remarks')
        .eq('exam_id', examId)
        .eq('neura_id', neuraId)
        .maybeSingle(),
    ])

    if (examRes.error) throw new DatabaseError(examRes.error.message, { correlationId })
    if (!examRes.data) throw new NotFoundError('Exam not found', { exam_id: examId })
    if (studentRes.error) throw new DatabaseError(studentRes.error.message, { correlationId })
    if (!studentRes.data) throw new NotFoundError('Student not found', { neura_id: neuraId })

    const { data: schoolData } = await this.supabase
      .from('schools')
      .select('id, name, full_address, district, board')
      .eq('id', schoolId)
      .single()

    const examData = examRes.data as unknown as { id: string; name: string; exam_type: string; start_date: string; end_date: string; academic_years: { year_label: string } }
    const studentData = studentRes.data as unknown as {
      neura_id: string; full_name: string; date_of_birth: string | null; gender: string | null
      student_yearly_progress: Array<{ class_year: number; section: string }>
      parent_contacts: Array<{ parent_name: string; is_primary: boolean }>
    }

    const progress = studentData.student_yearly_progress?.[0]
    const primaryParent = studentData.parent_contacts?.find((p) => p.is_primary)

    const { count: totalStudents } = await this.supabase
      .from('exam_results')
      .select('*', { count: 'exact', head: true })
      .eq('exam_id', examId)

    return {
      result: resultRes.data
        ? {
            total_marks_obtained: Number(resultRes.data.total_marks_obtained),
            total_max_marks: resultRes.data.total_max_marks,
            percentage: Number(resultRes.data.percentage),
            grade: resultRes.data.grade,
            class_rank: resultRes.data.class_rank,
            overall_rank: resultRes.data.overall_rank,
            is_pass: resultRes.data.is_pass,
            subject_results: resultRes.data.subject_results,
            neuracoin_earned: resultRes.data.neuracoin_earned,
            teacher_remarks: resultRes.data.teacher_remarks,
          }
        : null,
      exam: {
        id: examData.id,
        name: examData.name,
        exam_type: examData.exam_type,
        start_date: examData.start_date,
        end_date: examData.end_date,
        academic_year_label: examData.academic_years?.year_label ?? '',
      },
      school: {
        id: schoolData?.id ?? schoolId,
        name: schoolData?.name ?? 'School',
        address: schoolData?.full_address ?? null,
        district: schoolData?.district ?? null,
        board: schoolData?.board ?? null,
      },
      student: {
        neura_id: studentData.neura_id,
        full_name: studentData.full_name,
        class_year: progress?.class_year ?? 0,
        section: progress?.section ?? '',
        date_of_birth: studentData.date_of_birth,
        gender: studentData.gender,
        parent_name: primaryParent?.parent_name ?? null,
      },
      total_students_in_class: totalStudents ?? 0,
    }
  }

  async storeAiInsight(examId: string, insight: string, correlationId: string): Promise<void> {
    this.logger.debug({ correlationId, examId }, 'ExamRepository.storeAiInsight')

    const { error } = await this.supabase
      .from('exams')
      .update({ ai_insight: insight } as never)
      .eq('id', examId)

    if (error) throw new DatabaseError(error.message, { correlationId, examId })
  }
}
