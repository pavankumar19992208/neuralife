import type { SupabaseClient } from '@supabase/supabase-js'
import type { Logger } from 'pino'
import { DatabaseError } from '../utils/errors.js'

// Raw DB row types (cs_* tables not in generated types yet)
interface CSTextbook { id: string; board: string; grade: number; subject: string; created_at: string }
interface CSChapter { id: string; textbook_id: string; chapter_number: number; title_en: string; title_te: string | null; created_at: string }
interface CSTopic { id: string; chapter_id: string; topic_number: number; title_en: string; title_te: string | null; created_at: string }
interface CSGeneratedContent { id: string; topic_id: string; medium: string; segments: Record<string, unknown>; generated_at: string; last_modified_at: string; audit_status: string }

export interface ChapterWithTopics extends CSChapter {
  topics: CSTopic[]
}

export class ContentStudioRepository {
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly supabase: SupabaseClient<any>,
    private readonly logger: Logger,
  ) {}

  // ── Textbook structure ─────────────────────────────────────────────

  async findTextbook(board: string, grade: number, subject: string, correlationId: string): Promise<CSTextbook | null> {
    this.logger.debug({ correlationId, board, grade, subject }, 'ContentStudioRepo.findTextbook')
    const { data, error } = await this.supabase
      .from('cs_textbooks')
      .select('id, board, grade, subject, created_at')
      .eq('board', board)
      .eq('grade', grade)
      .eq('subject', subject)
      .maybeSingle()
    if (error) throw new DatabaseError(error.message, { correlationId })
    return data
  }

  async createTextbook(board: string, grade: number, subject: string, correlationId: string): Promise<CSTextbook> {
    this.logger.info({ correlationId, board, grade, subject }, 'ContentStudioRepo.createTextbook')
    const { data, error } = await this.supabase
      .from('cs_textbooks')
      .insert({ board, grade, subject })
      .select('id, board, grade, subject, created_at')
      .single()
    if (error) throw new DatabaseError(error.message, { correlationId })
    return data
  }

  async getChaptersWithTopics(textbookId: string, correlationId: string): Promise<ChapterWithTopics[]> {
    this.logger.debug({ correlationId, textbookId }, 'ContentStudioRepo.getChaptersWithTopics')
    const { data, error } = await this.supabase
      .from('cs_chapters')
      .select('id, textbook_id, chapter_number, title_en, title_te, created_at')
      .eq('textbook_id', textbookId)
      .order('chapter_number')
    if (error) throw new DatabaseError(error.message, { correlationId })

    const chapters = data as CSChapter[]
    if (!chapters.length) return []

    // Fetch all topics for these chapters in one query
    const chapterIds = chapters.map((c) => c.id)
    const { data: topicsData, error: topicsError } = await this.supabase
      .from('cs_topics')
      .select('id, chapter_id, topic_number, title_en, title_te, created_at')
      .in('chapter_id', chapterIds)
      .order('topic_number')
    if (topicsError) throw new DatabaseError(topicsError.message, { correlationId })

    const topics = (topicsData ?? []) as CSTopic[]
    const topicsByChapter = new Map<string, CSTopic[]>()
    for (const t of topics) {
      if (!topicsByChapter.has(t.chapter_id)) topicsByChapter.set(t.chapter_id, [])
      topicsByChapter.get(t.chapter_id)!.push(t)
    }

    return chapters.map((ch) => ({ ...ch, topics: topicsByChapter.get(ch.id) ?? [] }))
  }

  async upsertChaptersAndTopics(
    textbookId: string,
    chapters: Array<{
      chapter_number: number
      title_en: string
      title_te?: string
      topics: Array<{ topic_number: number; title_en: string; title_te?: string }>
    }>,
    correlationId: string,
  ): Promise<ChapterWithTopics[]> {
    this.logger.info({ correlationId, textbookId, chapterCount: chapters.length }, 'ContentStudioRepo.upsertChaptersAndTopics')

    // Upsert chapters
    const chaptersToInsert = chapters.map((c) => ({
      textbook_id: textbookId,
      chapter_number: c.chapter_number,
      title_en: c.title_en,
      title_te: c.title_te ?? null,
    }))

    const { data: insertedChapters, error: chErr } = await this.supabase
      .from('cs_chapters')
      .upsert(chaptersToInsert, { onConflict: 'textbook_id,chapter_number', ignoreDuplicates: false })
      .select('id, textbook_id, chapter_number, title_en, title_te, created_at')
    if (chErr) throw new DatabaseError(chErr.message, { correlationId })

    const chapterMap = new Map<number, string>()
    for (const ch of (insertedChapters ?? []) as CSChapter[]) {
      chapterMap.set(ch.chapter_number, ch.id)
    }

    // Upsert topics for each chapter
    const allTopics: Array<{ chapter_id: string; topic_number: number; title_en: string; title_te: string | null }> = []
    for (const ch of chapters) {
      const chapterId = chapterMap.get(ch.chapter_number)
      if (!chapterId) continue
      for (const t of ch.topics) {
        allTopics.push({ chapter_id: chapterId, topic_number: t.topic_number, title_en: t.title_en, title_te: t.title_te ?? null })
      }
    }

    if (allTopics.length) {
      const { error: tErr } = await this.supabase
        .from('cs_topics')
        .upsert(allTopics, { onConflict: 'chapter_id,topic_number', ignoreDuplicates: false })
      if (tErr) throw new DatabaseError(tErr.message, { correlationId })
    }

    return this.getChaptersWithTopics(textbookId, correlationId)
  }

  async appendChapters(
    textbookId: string,
    chapters: Array<{
      chapter_number: number
      title_en: string
      title_te?: string
      topics: Array<{ topic_number: number; title_en: string; title_te?: string }>
    }>,
    correlationId: string,
  ): Promise<ChapterWithTopics[]> {
    this.logger.info({ correlationId, textbookId, chapterCount: chapters.length }, 'ContentStudioRepo.appendChapters')

    // Find current max chapter_number for this textbook
    const { data: existing } = await this.supabase
      .from('cs_chapters')
      .select('chapter_number')
      .eq('textbook_id', textbookId)
      .order('chapter_number', { ascending: false })
      .limit(1)
    const maxNumber: number = (existing as Array<{ chapter_number: number }> | null)?.[0]?.chapter_number ?? 0

    // Renumber incoming chapters to continue after existing ones
    const chaptersToInsert = chapters.map((c, idx) => ({
      textbook_id: textbookId,
      chapter_number: maxNumber + idx + 1,
      title_en: c.title_en.trim(),
      title_te: c.title_te?.trim() ?? null,
    }))

    const { data: insertedChapters, error: chErr } = await this.supabase
      .from('cs_chapters')
      .insert(chaptersToInsert)
      .select('id, textbook_id, chapter_number, title_en, title_te, created_at')
    if (chErr) throw new DatabaseError(chErr.message, { correlationId })

    const allTopics: Array<{ chapter_id: string; topic_number: number; title_en: string; title_te: string | null }> = []
    for (let i = 0; i < (insertedChapters as CSChapter[]).length; i++) {
      const insertedCh = (insertedChapters as CSChapter[])[i]
      const incoming = chapters[i]
      for (const t of incoming.topics) {
        allTopics.push({
          chapter_id: insertedCh.id,
          topic_number: t.topic_number,
          title_en: t.title_en.trim(),
          title_te: t.title_te?.trim() ?? null,
        })
      }
    }

    if (allTopics.length) {
      const { error: tErr } = await this.supabase
        .from('cs_topics')
        .insert(allTopics)
      if (tErr) throw new DatabaseError(tErr.message, { correlationId })
    }

    return this.getChaptersWithTopics(textbookId, correlationId)
  }

  // ── Generated content ──────────────────────────────────────────────

  async getGeneratedContent(topicId: string, medium: string, correlationId: string): Promise<CSGeneratedContent | null> {
    this.logger.debug({ correlationId, topicId, medium }, 'ContentStudioRepo.getGeneratedContent')
    const { data, error } = await this.supabase
      .from('cs_generated_content')
      .select('id, topic_id, medium, segments, generated_at, last_modified_at, audit_status')
      .eq('topic_id', topicId)
      .eq('medium', medium)
      .maybeSingle()
    if (error) throw new DatabaseError(error.message, { correlationId })
    return data
  }

  async getAllGeneratedContentForTopic(topicId: string, correlationId: string): Promise<CSGeneratedContent[]> {
    this.logger.debug({ correlationId, topicId }, 'ContentStudioRepo.getAllGeneratedContentForTopic')
    const { data, error } = await this.supabase
      .from('cs_generated_content')
      .select('id, topic_id, medium, segments, generated_at, last_modified_at, audit_status')
      .eq('topic_id', topicId)
    if (error) throw new DatabaseError(error.message, { correlationId })
    return (data ?? []) as CSGeneratedContent[]
  }

  async saveGeneratedContent(
    topicId: string,
    medium: string,
    segments: Record<string, unknown>,
    correlationId: string,
  ): Promise<CSGeneratedContent> {
    this.logger.info({ correlationId, topicId, medium }, 'ContentStudioRepo.saveGeneratedContent')
    const { data, error } = await this.supabase
      .from('cs_generated_content')
      .upsert(
        { topic_id: topicId, medium, segments, last_modified_at: new Date().toISOString() },
        { onConflict: 'topic_id,medium' },
      )
      .select('id, topic_id, medium, segments, generated_at, last_modified_at, audit_status')
      .single()
    if (error) throw new DatabaseError(error.message, { correlationId })
    return data as CSGeneratedContent
  }

  async updateGeneratedContent(
    id: string,
    segments: Record<string, unknown>,
    correlationId: string,
  ): Promise<void> {
    this.logger.info({ correlationId, id }, 'ContentStudioRepo.updateGeneratedContent')
    const { error } = await this.supabase
      .from('cs_generated_content')
      .update({ segments, last_modified_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new DatabaseError(error.message, { correlationId })
  }

  async findTopicById(topicId: string, correlationId: string): Promise<CSTopic | null> {
    this.logger.debug({ correlationId, topicId }, 'ContentStudioRepo.findTopicById')
    const { data, error } = await this.supabase
      .from('cs_topics')
      .select('id, chapter_id, topic_number, title_en, title_te, created_at')
      .eq('id', topicId)
      .maybeSingle()
    if (error) throw new DatabaseError(error.message, { correlationId })
    return data
  }

  async getPreviousGradeTopics(
    board: string,
    subject: string,
    currentGrade: number,
    correlationId: string,
  ): Promise<Array<{ grade: number; chapter_title: string; topic_title: string; subject: string }>> {
    this.logger.debug({ correlationId, board, subject, currentGrade }, 'ContentStudioRepo.getPreviousGradeTopics')

    const minGrade = 4
    const maxGrade = currentGrade - 1
    if (maxGrade < minGrade) return []

    const { data: textbooks, error: tbErr } = await this.supabase
      .from('cs_textbooks')
      .select('id, grade')
      .eq('board', board)
      .eq('subject', subject)
      .gte('grade', minGrade)
      .lte('grade', maxGrade)
    if (tbErr) throw new DatabaseError(tbErr.message, { correlationId })
    if (!textbooks?.length) return []

    const textbookIds = textbooks.map((t) => t.id)
    const gradeById = new Map(textbooks.map((t) => [t.id, t.grade as number]))

    const { data: chapters, error: chErr } = await this.supabase
      .from('cs_chapters')
      .select('id, textbook_id, title_en')
      .in('textbook_id', textbookIds)
    if (chErr) throw new DatabaseError(chErr.message, { correlationId })
    if (!chapters?.length) return []

    const chapterIds = chapters.map((c) => c.id)
    const chapterData = new Map(chapters.map((c) => [c.id, { textbookId: c.textbook_id as string, title: c.title_en as string }]))

    const { data: topics, error: tErr } = await this.supabase
      .from('cs_topics')
      .select('chapter_id, title_en')
      .in('chapter_id', chapterIds)
    if (tErr) throw new DatabaseError(tErr.message, { correlationId })

    return (topics ?? []).map((t) => {
      const ch = chapterData.get(t.chapter_id as string)
      const grade = ch ? (gradeById.get(ch.textbookId) ?? 0) : 0
      return {
        grade,
        chapter_title: ch?.title ?? '',
        topic_title: t.title_en as string,
        subject,
      }
    })
  }

  async approveGeneratedContent(id: string, segments: Record<string, unknown>, correlationId: string): Promise<void> {
    this.logger.info({ correlationId, id }, 'ContentStudioRepo.approveGeneratedContent')
    const { error } = await this.supabase
      .from('cs_generated_content')
      .update({ segments, audit_status: 'APPROVED', last_modified_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new DatabaseError(error.message, { correlationId })
  }
}
