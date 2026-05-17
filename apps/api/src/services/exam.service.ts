import type { FastifyBaseLogger } from 'fastify'
import { ValidationError, ForbiddenError, NotFoundError } from '../utils/errors.js'
import { ExamRepository } from '../repositories/exam.repository.js'
import { NeuraCoinRepository } from '../repositories/neuracoin.repository.js'
import { SyllabusRepository } from '../repositories/syllabus.repository.js'
import { generateInsight } from '../lib/claude.js'
import type {
  Exam,
  ExamSubject,
  ExamResult,
  ExamResultSubject,
  ExamSummary,
  CreateExamInput,
  BulkMarksInput,
  MarksSheet,
  GradeConfig,
  ExamAnalytics,
  ReportCardData,
  BatchPrepareResult,
  ExamType,
} from '../types/common.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BOARD_EXAM_DEFAULTS: Record<string, Record<string, { max: number; pass: number }>> = {
  SCERT_AP: { FA1:{max:20,pass:8}, FA2:{max:20,pass:8}, FA3:{max:20,pass:8}, FA4:{max:20,pass:8}, SA1:{max:80,pass:32}, SA2:{max:80,pass:32}, UNIT_TEST:{max:20,pass:7}, PTM:{max:0,pass:0} },
  SCERT_TS: { FA1:{max:20,pass:8}, FA2:{max:20,pass:8}, FA3:{max:20,pass:8}, FA4:{max:20,pass:8}, SA1:{max:80,pass:32}, SA2:{max:80,pass:32}, UNIT_TEST:{max:20,pass:7}, PTM:{max:0,pass:0} },
  CBSE:     { FA1:{max:40,pass:13}, FA2:{max:40,pass:13}, FA3:{max:40,pass:13}, FA4:{max:40,pass:13}, SA1:{max:80,pass:26}, SA2:{max:80,pass:26}, UNIT_TEST:{max:25,pass:8}, PTM:{max:0,pass:0} },
}

function getBoardDefaults(board: string, examType: string): { max: number; pass: number } {
  return BOARD_EXAM_DEFAULTS[board]?.[examType] ?? { max: 100, pass: 35 }
}

function getWorkingDays(start: string, end: string): string[] {
  const days: string[] = []
  const d = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  while (d <= e) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) days.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return days
}

export class ExamService {
  constructor(
    private readonly examRepo: ExamRepository,
    private readonly coinRepo: NeuraCoinRepository,
    private readonly syllabusRepo: SyllabusRepository,
    private readonly logger: FastifyBaseLogger,
  ) {}

  async createExam(
    schoolId: string,
    academicYearId: string,
    input: CreateExamInput,
    createdBy: string,
    correlationId: string,
  ): Promise<Exam & { subjects: ExamSubject[] }> {
    this.logger.info({ correlationId, schoolId, exam_type: input.exam_type }, 'ExamService.createExam')

    if (new Date(input.end_date) < new Date(input.start_date)) {
      throw new ValidationError('end_date must be on or after start_date')
    }

    const exam = await this.examRepo.createExam(schoolId, academicYearId, input, createdBy, correlationId)
    return this.examRepo.getExamById(exam.id, schoolId, correlationId)
  }

  async prepareBatch(
    schoolId: string,
    academicYearId: string,
    board: string,
    classFrom: number,
    classTo: number,
    examType: ExamType,
    startDate: string,
    endDate: string,
    correlationId: string,
  ): Promise<BatchPrepareResult> {
    this.logger.info({ correlationId, schoolId, board, classFrom, classTo, examType }, 'ExamService.prepareBatch')

    const classSections = await this.syllabusRepo.getClassSections(
      schoolId, academicYearId, classFrom, classTo, correlationId,
    )
    if (classSections.length === 0) {
      throw new ValidationError('No active class sections found in the specified class range')
    }

    const uniqueGrades = [...new Set(classSections.map((cs) => cs.class_year))]
    const gradeSubjectsMap = new Map<number, string[]>()
    await Promise.all(
      uniqueGrades.map(async (grade) => {
        const subjects = await this.syllabusRepo.getSubjectsForGrade(board, grade, correlationId)
        gradeSubjectsMap.set(grade, subjects)
      }),
    )

    // All unique subjects across grades, sorted alphabetically for consistent date assignment
    const allSubjects = [...new Set([...gradeSubjectsMap.values()].flat())].sort()
    const workingDays = getWorkingDays(startDate, endDate)

    // Assign one working day per subject
    const subjectDateMap = new Map<string, string>()
    allSubjects.forEach((subject, idx) => {
      subjectDateMap.set(subject, workingDays[idx % workingDays.length] ?? startDate)
    })

    const defaults = getBoardDefaults(board, examType)

    const sections = await Promise.all(
      classSections.map(async (cs) => {
        const gradeSubjects = gradeSubjectsMap.get(cs.class_year) ?? []
        const subjects = await Promise.all(
          gradeSubjects.map(async (subject) => {
            const chapterIds = await this.syllabusRepo.autoSelectChapters(
              board, cs.class_year, subject, examType, correlationId,
            )
            return {
              subject,
              exam_date: subjectDateMap.get(subject) ?? startDate,
              chapter_ids: chapterIds,
              max_marks: defaults.max,
              pass_marks: defaults.pass,
            }
          }),
        )
        return { class_year: cs.class_year, section: cs.section, subjects }
      }),
    )

    return { sections, working_days: workingDays }
  }

  async listExams(
    schoolId: string,
    academicYearId: string,
    correlationId: string,
    filters: { status?: string; exam_type?: string } = {},
  ): Promise<ExamSummary[]> {
    return this.examRepo.listExams(schoolId, academicYearId, correlationId, filters)
  }

  async getExam(examId: string, schoolId: string, correlationId: string) {
    return this.examRepo.getExamById(examId, schoolId, correlationId)
  }

  async updateExam(
    examId: string,
    schoolId: string,
    updates: { name?: string; description?: string; start_date?: string; end_date?: string },
    correlationId: string,
  ): Promise<Exam> {
    const exam = await this.examRepo.getExamById(examId, schoolId, correlationId)

    if (exam.status === 'PUBLISHED' || exam.status === 'ARCHIVED') {
      throw new ValidationError('Cannot edit a published or archived exam')
    }

    if (updates.start_date && updates.end_date) {
      if (new Date(updates.end_date) < new Date(updates.start_date)) {
        throw new ValidationError('end_date must be on or after start_date')
      }
    }

    return this.examRepo.updateExam(examId, schoolId, updates, correlationId)
  }

  async deleteExam(examId: string, schoolId: string, correlationId: string): Promise<void> {
    const exam = await this.examRepo.getExamById(examId, schoolId, correlationId)

    if (exam.status === 'PUBLISHED') {
      throw new ValidationError('Cannot delete a published exam')
    }

    await this.examRepo.softDeleteExam(examId, schoolId, correlationId)
  }

  async getMarksSheet(
    examId: string,
    examSubjectId: string,
    schoolId: string,
    teacherId: string | undefined,
    role: string,
    correlationId: string,
  ): Promise<MarksSheet> {
    const sheet = await this.examRepo.getMarksSheet(examId, examSubjectId, schoolId, correlationId)

    // Teachers can only view their assigned subjects
    if (role === 'TEACHER' && teacherId) {
      if (sheet.subject.teacher_id && sheet.subject.teacher_id !== teacherId) {
        throw new ForbiddenError('You are not assigned to this exam subject')
      }
    }

    return sheet
  }

  async submitMarks(
    examId: string,
    schoolId: string,
    input: BulkMarksInput,
    enteredBy: string,
    teacherId: string | undefined,
    role: string,
    correlationId: string,
  ): Promise<{ saved: number }> {
    const exam = await this.examRepo.getExamById(examId, schoolId, correlationId)

    if (exam.status === 'PUBLISHED' || exam.status === 'ARCHIVED') {
      throw new ValidationError('Cannot enter marks for a published or archived exam')
    }

    // Verify teacher is assigned to this subject
    const subject = exam.subjects.find((s) => s.id === input.exam_subject_id)
    if (!subject) {
      throw new NotFoundError('Exam subject not found in this exam', { exam_subject_id: input.exam_subject_id })
    }

    if (role === 'TEACHER' && teacherId && subject.teacher_id && subject.teacher_id !== teacherId) {
      throw new ForbiddenError('You are not assigned to this exam subject')
    }

    // Validate marks values
    for (const m of input.marks) {
      if (!m.is_absent && m.marks_obtained != null) {
        if (m.marks_obtained < 0) throw new ValidationError('Marks cannot be negative')
        if (m.marks_obtained > subject.max_marks) {
          throw new ValidationError(`Marks cannot exceed max marks (${subject.max_marks})`)
        }
      }
    }

    const saved = await this.examRepo.bulkUpsertMarks(examId, input, enteredBy, correlationId)

    // Auto-transition status to MARKS_PENDING if it was DRAFT or SCHEDULED
    if (exam.status === 'DRAFT' || exam.status === 'SCHEDULED') {
      await this.examRepo.updateExam(examId, schoolId, { status: 'MARKS_PENDING' }, correlationId)
    }

    return { saved }
  }

  async updateStudentMark(
    examId: string,
    examSubjectId: string,
    neuraId: string,
    schoolId: string,
    updates: { marks_obtained?: number | null; is_absent?: boolean },
    enteredBy: string,
    teacherId: string | undefined,
    role: string,
    correlationId: string,
  ) {
    const exam = await this.examRepo.getExamById(examId, schoolId, correlationId)

    if (exam.status === 'PUBLISHED' || exam.status === 'ARCHIVED') {
      throw new ValidationError('Cannot edit marks for a published or archived exam')
    }

    const subject = exam.subjects.find((s) => s.id === examSubjectId)
    if (!subject) throw new NotFoundError('Exam subject not found', { exam_subject_id: examSubjectId })

    if (role === 'TEACHER' && teacherId && subject.teacher_id && subject.teacher_id !== teacherId) {
      throw new ForbiddenError('You are not assigned to this exam subject')
    }

    if (!updates.is_absent && updates.marks_obtained != null) {
      if (updates.marks_obtained < 0) throw new ValidationError('Marks cannot be negative')
      if (updates.marks_obtained > subject.max_marks) {
        throw new ValidationError(`Marks cannot exceed max marks (${subject.max_marks})`)
      }
    }

    return this.examRepo.updateSingleStudentMark(examSubjectId, neuraId, updates, enteredBy, correlationId)
  }

  async publishExam(
    examId: string,
    schoolId: string,
    correlationId: string,
  ): Promise<{ results_count: number; total_neuracoin: number }> {
    this.logger.info({ correlationId, examId }, 'ExamService.publishExam — computing results')

    const exam = await this.examRepo.getExamById(examId, schoolId, correlationId)

    if (exam.status === 'PUBLISHED') {
      throw new ValidationError('Exam is already published')
    }

    const [subjects, allMarks, gradeConfig] = await Promise.all([
      this.examRepo.getSubjectsForExam(examId, correlationId),
      this.examRepo.getMarksForExam(examId, correlationId),
      this.examRepo.getGradeConfig(schoolId, correlationId),
    ])

    // Build a set of all student neura_ids who have marks
    const studentsWithMarks = new Set(allMarks.map((m) => m.neura_id))

    // Group marks by neura_id
    const marksByStudent = new Map<string, typeof allMarks>()
    for (const mark of allMarks) {
      const list = marksByStudent.get(mark.neura_id) ?? []
      list.push(mark)
      marksByStudent.set(mark.neura_id, list)
    }

    // Build subject map
    const subjectMap = new Map(subjects.map((s) => [s.id, s]))

    const computedResults: Array<{
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
      subject_results: ExamResultSubject[]
      neuracoin_earned: number
    }> = []

    // Per-student computation
    for (const [neuraId, marks] of marksByStudent) {
      // Derive class_year + section from the first subject the student has marks in
      const firstSub = subjectMap.get(marks[0]?.exam_subject_id ?? '')
      const classYear = firstSub?.class_year ?? null
      const section = firstSub?.section ?? null

      const subjectResults: ExamResultSubject[] = marks.map((m) => {
        const sub = subjectMap.get(m.exam_subject_id)
        const maxMarks = sub?.max_marks ?? 100
        const passMarks = sub?.pass_marks ?? 35
        const obtained = m.is_absent ? 0 : (m.marks_obtained ?? 0)
        const pct = maxMarks > 0 ? (obtained / maxMarks) * 100 : 0
        const grade = m.is_absent ? 'AB' : resolveGrade(pct, gradeConfig)
        const isPass = !m.is_absent && obtained >= passMarks

        return {
          subject: sub?.subject ?? 'Unknown',
          max_marks: maxMarks,
          marks_obtained: m.is_absent ? null : m.marks_obtained,
          is_absent: m.is_absent,
          percentage: m.is_absent ? null : Math.round(pct * 100) / 100,
          grade,
          is_pass: isPass,
          subject_rank: null, // filled in later
        }
      })

      const totalMax = subjectResults.reduce((s, r) => s + r.max_marks, 0)
      const totalObtained = subjectResults.reduce((s, r) => s + (r.marks_obtained ?? 0), 0)
      const pct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0
      const roundedPct = Math.round(pct * 100) / 100
      const grade = resolveGrade(roundedPct, gradeConfig)
      const isPass = subjectResults.every((r) => r.is_absent || r.is_pass)
      const gradeCfg = gradeConfig.find((g) => g.grade_label === grade)
      const coinBase = gradeCfg?.neuracoin_reward ?? 0

      computedResults.push({
        neura_id: neuraId,
        class_year: classYear,
        section,
        total_marks_obtained: totalObtained,
        total_max_marks: totalMax,
        percentage: roundedPct,
        grade,
        class_rank: null,
        overall_rank: null,
        is_pass: isPass,
        subject_results: subjectResults,
        neuracoin_earned: coinBase,
      })
    }

    // Assign overall ranks (sort by percentage descending)
    computedResults.sort((a, b) => b.percentage - a.percentage)
    computedResults.forEach((r, i) => { r.overall_rank = i + 1 })

    // Assign subject toppers — bonus coins for rank 1 per subject
    const subjectNames = [...new Set(subjects.map((s) => s.subject))]
    for (const subjectName of subjectNames) {
      let topPct = -1
      let toppers: string[] = []
      for (const r of computedResults) {
        const sr = r.subject_results.find((s) => s.subject === subjectName)
        if (sr?.percentage != null && sr.percentage > topPct) {
          topPct = sr.percentage
          toppers = [r.neura_id]
        } else if (sr?.percentage != null && sr.percentage === topPct) {
          toppers.push(r.neura_id)
        }
      }
      for (const r of computedResults) {
        const sr = r.subject_results.find((s) => s.subject === subjectName)
        if (toppers.includes(r.neura_id)) {
          if (sr) sr.subject_rank = 1
          // Only award bonus coins to passing students
          if (r.is_pass && topPct >= 35) {
            r.neuracoin_earned += 25
          }
        }
      }
    }

    // Save results
    await this.examRepo.saveExamResults(examId, computedResults, correlationId)

    // Credit NeuraCoin
    const coinEntries = computedResults
      .filter((r) => r.neuracoin_earned > 0)
      .map((r) => ({
        neura_id: r.neura_id,
        school_id: schoolId,
        transaction_type: 'EXAM_REWARD' as const,
        amount: r.neuracoin_earned,
        reference_id: null,
        reference_type: 'EXAM_RESULT',
        description: `${exam.name} — ${r.grade} — ${r.percentage.toFixed(1)}%`,
      }))

    if (coinEntries.length > 0) {
      await this.coinRepo.creditBulk(coinEntries, correlationId)
    }

    // Mark exam as published
    await this.examRepo.updateExam(examId, schoolId, { status: 'PUBLISHED' }, correlationId)

    const totalCoin = computedResults.reduce((s, r) => s + r.neuracoin_earned, 0)
    this.logger.info({ correlationId, examId, results: computedResults.length, totalCoin }, 'Exam published')

    // Fire-and-forget AI insight via Bedrock (non-blocking)
    this.generateExamInsight(exam, computedResults.length, correlationId)
      .then((insight) => this.examRepo.storeAiInsight(examId, insight, correlationId))
      .catch((err) => this.logger.warn({ correlationId, examId, err }, 'AI insight generation failed (non-critical)'))

    return { results_count: computedResults.length, total_neuracoin: totalCoin }
  }

  private async generateExamInsight(
    exam: Exam & { subjects: ExamSubject[] },
    resultsCount: number,
    correlationId: string,
  ): Promise<string> {
    const subjectList = exam.subjects.map((s) => `${s.subject} (Class ${s.class_year})`).join(', ')
    const prompt = `You are an educational analytics AI for Indian schools.
Exam: "${exam.name}" | Type: ${exam.exam_type} | Date: ${exam.start_date} to ${exam.end_date}
Subjects covered: ${subjectList}
Total students evaluated: ${resultsCount}

Write a 2-3 sentence principal-level insight about this exam — what to watch, trends to expect, and one actionable recommendation. Be concise and specific.`

    return generateInsight(prompt)
  }

  async generateQuestionPaper(
    examId: string,
    schoolId: string,
    correlationId: string,
  ): Promise<string> {
    this.logger.info({ correlationId, examId }, 'ExamService.generateQuestionPaper')

    const exam = await this.examRepo.getExamById(examId, schoolId, correlationId)
    const chapterIds = (exam as Exam & { chapter_ids?: string[] }).chapter_ids ?? []

    const subjectList = exam.subjects.map((s) =>
      `Subject: ${s.subject}, Class: ${s.class_year}, Max Marks: ${s.max_marks}, Pass Marks: ${s.pass_marks}`
    ).join('\n')

    let chapterContext = ''
    if (chapterIds.length > 0) {
      chapterContext = `\nChapter IDs selected: ${chapterIds.join(', ')}`
    }

    const prompt = `You are an expert curriculum designer for ${exam.subjects[0]?.class_year ? `Class ${exam.subjects[0].class_year}` : 'school'} students in Andhra Pradesh / Telangana (SCERT syllabus).

Exam: "${exam.name}"
Type: ${exam.exam_type}
Date range: ${exam.start_date} to ${exam.end_date}
${subjectList}${chapterContext}

Generate a well-structured question paper with:
1. Section A — Very Short Answers (1 mark each, 5 questions)
2. Section B — Short Answers (4 marks each, 5 questions)
3. Section C — Long Answers (6 marks each, 3 questions)

Format clearly with marks indicated. Follow AP/TS board standards.`

    return generateInsight(prompt)
  }

  async getExamResults(examId: string, schoolId: string, correlationId: string) {
    await this.examRepo.getExamById(examId, schoolId, correlationId) // verify ownership
    return this.examRepo.getExamResults(examId, correlationId)
  }

  async getExamAnalytics(examId: string, schoolId: string, correlationId: string): Promise<ExamAnalytics> {
    const [exam, results] = await Promise.all([
      this.examRepo.getExamById(examId, schoolId, correlationId),
      this.examRepo.getExamResults(examId, correlationId),
    ])

    const gradeConfig = await this.examRepo.getGradeConfig(schoolId, correlationId)

    const total = results.length
    const passed = results.filter((r) => r.is_pass).length
    const avgPct = total > 0 ? results.reduce((s, r) => s + r.percentage, 0) / total : 0

    const gradeCounts = new Map<string, number>()
    for (const r of results) {
      gradeCounts.set(r.grade, (gradeCounts.get(r.grade) ?? 0) + 1)
    }

    const gradeDistribution = gradeConfig.map((g) => ({
      grade: g.grade_label,
      count: gradeCounts.get(g.grade_label) ?? 0,
      pct: total > 0 ? Math.round(((gradeCounts.get(g.grade_label) ?? 0) / total) * 1000) / 10 : 0,
      color: g.display_color,
    }))

    // Subject stats
    const subjectStatsMap = new Map<string, { totalObtained: number; totalMax: number; passed: number; count: number }>()
    for (const r of results) {
      for (const sr of (r.subject_results as ExamResultSubject[])) {
        const s = subjectStatsMap.get(sr.subject) ?? { totalObtained: 0, totalMax: 0, passed: 0, count: 0 }
        s.totalObtained += sr.marks_obtained ?? 0
        s.totalMax += sr.max_marks
        if (sr.is_pass) s.passed++
        s.count++
        subjectStatsMap.set(sr.subject, s)
      }
    }

    const subjectStats = Array.from(subjectStatsMap.entries()).map(([subject, s]) => ({
      subject,
      avg_marks: s.count > 0 ? Math.round((s.totalObtained / s.count) * 10) / 10 : 0,
      avg_percentage: s.totalMax > 0 ? Math.round((s.totalObtained / s.totalMax) * 1000) / 10 : 0,
      pass_rate: s.count > 0 ? Math.round((s.passed / s.count) * 1000) / 10 : 0,
      max_marks: s.count > 0 ? s.totalMax / s.count : 0,
    }))

    // Class stats
    const classStatsMap = new Map<string, { total: number; passed: number; pctSum: number }>()
    for (const r of results) {
      const key = `${r.class_year}-${r.section}`
      const c = classStatsMap.get(key) ?? { total: 0, passed: 0, pctSum: 0 }
      c.total++
      if (r.is_pass) c.passed++
      c.pctSum += r.percentage
      classStatsMap.set(key, c)
    }

    const classStats = Array.from(classStatsMap.entries()).map(([key, c]) => {
      const [classYear, section] = key.split('-')
      const avgPct2 = c.total > 0 ? c.pctSum / c.total : 0
      return {
        class_year: Number(classYear),
        section,
        total_students: c.total,
        pass_rate: c.total > 0 ? Math.round((c.passed / c.total) * 1000) / 10 : 0,
        avg_percentage: Math.round(avgPct2 * 10) / 10,
        avg_grade: resolveGrade(avgPct2, gradeConfig),
      }
    })

    // Toppers per class
    const topperMap = new Map<string, typeof results[0]>()
    for (const r of results) {
      const key = `${r.class_year}-${r.section}`
      const current = topperMap.get(key)
      if (!current || r.percentage > current.percentage) topperMap.set(key, r)
    }

    const toppers = Array.from(topperMap.values()).map((r) => ({
      class_year: r.class_year,
      section: r.section,
      neura_id: r.neura_id,
      student_name: r.student_name,
      percentage: r.percentage,
      grade: r.grade,
    }))

    return {
      exam_id: examId,
      exam_name: exam.name,
      exam_type: exam.exam_type,
      overall_stats: {
        total_students: total,
        passed,
        failed: total - passed,
        pass_rate: total > 0 ? Math.round((passed / total) * 1000) / 10 : 0,
        avg_percentage: Math.round(avgPct * 10) / 10,
        avg_grade: resolveGrade(avgPct, gradeConfig),
      },
      grade_distribution: gradeDistribution,
      subject_stats: subjectStats,
      class_stats: classStats,
      toppers,
    }
  }

  async getReportCard(
    examId: string,
    neuraId: string,
    schoolId: string,
    correlationId: string,
  ): Promise<ReportCardData> {
    const [cardData, exam] = await Promise.all([
      this.examRepo.getReportCardData(examId, neuraId, schoolId, correlationId),
      this.examRepo.getExamById(examId, schoolId, correlationId),
    ])

    const isPublished = exam.status === 'PUBLISHED'

    if (!cardData.result && isPublished) {
      throw new NotFoundError('No results found for this student in this exam', { neura_id: neuraId })
    }

    const subjectResults = (cardData.result?.subject_results as ExamResultSubject[]) ?? []

    return {
      exam: cardData.exam as ReportCardData['exam'],
      school: cardData.school,
      student: cardData.student,
      subject_results: subjectResults,
      totals: cardData.result
        ? {
            total_max_marks: cardData.result.total_max_marks,
            total_marks_obtained: cardData.result.total_marks_obtained,
            percentage: cardData.result.percentage,
            grade: cardData.result.grade,
            class_rank: cardData.result.class_rank,
            total_students: cardData.total_students_in_class,
            is_pass: cardData.result.is_pass,
          }
        : { total_max_marks: 0, total_marks_obtained: 0, percentage: 0, grade: 'N/A', class_rank: null, total_students: 0, is_pass: false },
      attendance_pct: null,
      neuracoin_earned: cardData.result?.neuracoin_earned ?? 0,
      teacher_remarks: cardData.result?.teacher_remarks ?? null,
      is_published: isPublished,
    }
  }

  async getStudentExamHistory(neuraId: string, schoolId: string, correlationId: string) {
    return this.examRepo.getStudentExamHistory(neuraId, schoolId, correlationId)
  }
}

function resolveGrade(percentage: number, gradeConfig: GradeConfig[]): string {
  for (const g of gradeConfig) {
    if (percentage >= g.min_percentage && percentage <= g.max_percentage) {
      return g.grade_label
    }
  }
  return 'F'
}
