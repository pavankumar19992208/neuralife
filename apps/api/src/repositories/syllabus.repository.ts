import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { FastifyBaseLogger } from 'fastify'
import type { SyllabusChapter } from '../types/common.js'
import { DatabaseError } from '../utils/errors.js'

type ExamType = Database['public']['Enums']['exam_type']

export class SyllabusRepository {
  constructor(
    private supabase: SupabaseClient<Database>,
    private logger: FastifyBaseLogger,
  ) {}

  async getChapters(
    board: string,
    grade: number,
    subject: string,
    correlationId: string,
  ): Promise<SyllabusChapter[]> {
    this.logger.info({ correlationId, board, grade, subject }, 'SyllabusRepository.getChapters')

    const { data: textbook, error: tbError } = await this.supabase
      .from('cs_textbooks')
      .select('id, board, grade, subject')
      .eq('board', board)
      .eq('grade', grade)
      .eq('subject', subject)
      .maybeSingle()

    if (tbError) throw new DatabaseError(tbError.message, { board, grade, subject })
    if (!textbook) return []

    const { data: chapters, error: chError } = await this.supabase
      .from('cs_chapters')
      .select('id, chapter_number, title_en, title_te, textbook_id')
      .eq('textbook_id', textbook.id)
      .order('chapter_number', { ascending: true })

    if (chError) throw new DatabaseError(chError.message, { textbookId: textbook.id })

    return (chapters ?? []).map((c) => ({
      id: c.id,
      chapter_number: c.chapter_number,
      title_en: c.title_en,
      title_te: c.title_te,
      textbook_id: c.textbook_id,
      subject: textbook.subject,
      grade: textbook.grade,
      board: textbook.board,
    }))
  }

  async getClassSections(
    schoolId: string,
    academicYearId: string,
    classFrom: number,
    classTo: number,
    correlationId: string,
  ): Promise<Array<{ class_year: number; section: string }>> {
    this.logger.debug({ correlationId, schoolId, classFrom, classTo }, 'SyllabusRepository.getClassSections')

    const { data, error } = await this.supabase
      .from('student_yearly_progress')
      .select('class_year, section')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .gte('class_year', classFrom)
      .lte('class_year', classTo)
      .order('class_year', { ascending: true })
      .order('section', { ascending: true })

    if (error) {
      this.logger.warn({ correlationId, error }, 'getClassSections: query failed')
      return []
    }

    const seen = new Set<string>()
    const result: Array<{ class_year: number; section: string }> = []
    for (const row of data ?? []) {
      const key = `${row.class_year}-${row.section}`
      if (!seen.has(key)) {
        seen.add(key)
        result.push({ class_year: row.class_year, section: row.section })
      }
    }
    return result
  }

  async getSubjectsForGrade(
    board: string,
    grade: number,
    correlationId: string,
  ): Promise<string[]> {
    this.logger.debug({ correlationId, board, grade }, 'SyllabusRepository.getSubjectsForGrade')

    const { data, error } = await this.supabase
      .from('cs_textbooks')
      .select('subject')
      .eq('board', board)
      .eq('grade', grade)
      .order('subject', { ascending: true })

    if (error) {
      this.logger.warn({ correlationId, error }, 'getSubjectsForGrade: query failed')
      return []
    }
    return (data ?? []).map((r) => r.subject)
  }

  async autoSelectChapters(
    board: string,
    grade: number,
    subject: string,
    examType: ExamType,
    correlationId: string,
  ): Promise<string[]> {
    const chapters = await this.getChapters(board, grade, subject, correlationId)
    if (chapters.length === 0) return []

    const n = chapters.length

    if (examType === 'PTM') return []
    if (examType === 'SA2') return chapters.map((c) => c.id)
    if (examType === 'SA1') return chapters.slice(0, Math.ceil(n * 0.5)).map((c) => c.id)
    if (examType === 'UNIT_TEST') return chapters.slice(0, 3).map((c) => c.id)

    const q1 = Math.floor(n * 0.25)
    const q2 = Math.floor(n * 0.50)
    const q3 = Math.floor(n * 0.75)

    switch (examType) {
      case 'FA1': return chapters.slice(0, q1).map((c) => c.id)
      case 'FA2': return chapters.slice(q1, q2).map((c) => c.id)
      case 'FA3': return chapters.slice(q2, q3).map((c) => c.id)
      case 'FA4': return chapters.slice(q3).map((c) => c.id)
      default:    return chapters.map((c) => c.id)
    }
  }
}
