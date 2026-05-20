import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { FastifyBaseLogger } from 'fastify'
import { DatabaseError, NotFoundError } from '../utils/errors.js'
import type {
  AnalyticsFilter,
  TeacherPerformanceRow,
  SubjectMasteryRow,
  CurriculumGapRow,
  ExamProgressionRow,
  AtRiskFunnelData,
  RteComparisonData,
  AttendanceTrendDay,
  ClassHeatmapEntry,
  DayOfWeekStat,
  ChronicAbsentee,
  FinancialCollectionPoint,
  YoYComparison,
  BenchmarkData,
  StudentMasterySubject,
  StudentMasteryPoint,
  StudentIntelligence,
  SectionComparison,
  BookmarkItem,
  BoardExamResult,
  PredictionAccuracy,
  SchoolNarrative,
} from '../types/common.js'

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayIST(): string {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  return ist.toISOString().split('T')[0]
}

function daysAgoIST(n: number): string {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000 - n * 86400000)
  return ist.toISOString().split('T')[0]
}

function monthsAgoLabel(n: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d.toISOString().slice(0, 7) // 'YYYY-MM'
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class AnalyticsDeepRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: FastifyBaseLogger,
  ) {}

  // ── School ──────────────────────────────────────────────────────────────────

  async getSchoolInfo(schoolId: string, correlationId: string) {
    this.logger.debug({ correlationId, schoolId }, 'AnalyticsDeepRepo.getSchoolInfo')
    const { data, error } = await this.supabase
      .from('schools')
      .select('id, name, board, state, full_address, district')
      .eq('id', schoolId)
      .single()
    if (error || !data) throw new NotFoundError('School not found', { schoolId, correlationId })
    return data
  }

  async getCurrentAcademicYear(schoolId: string, correlationId: string) {
    const { data, error } = await this.supabase
      .from('academic_years')
      .select('id, year_label')
      .eq('school_id', schoolId)
      .eq('is_current', true)
      .limit(1)
      .single()
    if (error || !data) throw new NotFoundError('No current academic year', { schoolId, correlationId })
    return data
  }

  async getPreviousAcademicYear(schoolId: string, currentId: string, correlationId: string) {
    const { data } = await this.supabase
      .from('academic_years')
      .select('id, year_label')
      .eq('school_id', schoolId)
      .neq('id', currentId)
      .order('year_label', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data
  }

  async getActiveStudentCount(schoolId: string, academicYearId: string, correlationId: string) {
    const { count, error } = await this.supabase
      .from('student_yearly_progress')
      .select('neura_id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
    if (error) throw new DatabaseError(error.message, { schoolId, correlationId })
    return count ?? 0
  }

  // ── Filtered neura_ids (used by many methods) ─────────────────────────────

  async getFilteredNeuraIds(
    schoolId: string,
    academicYearId: string,
    filter: AnalyticsFilter,
    correlationId: string,
  ): Promise<string[]> {
    if (!filter.class_year && !filter.section) return []
    let query = this.supabase
      .from('student_yearly_progress')
      .select('neura_id')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
    if (filter.class_year) query = query.eq('class_year', filter.class_year)
    if (filter.section) query = query.eq('section', filter.section)
    const { data, error } = await query
    if (error) throw new DatabaseError(error.message, { schoolId, correlationId })
    return (data ?? []).map((r) => r.neura_id)
  }

  // ── Narratives ──────────────────────────────────────────────────────────────

  async findNarrative(schoolId: string, monthYear: string, neuraId: string | null, correlationId: string): Promise<SchoolNarrative | null> {
    this.logger.debug({ correlationId, schoolId, monthYear, neuraId }, 'AnalyticsDeepRepo.findNarrative')
    let query = this.supabase
      .from('school_analytics_narratives')
      .select('id, school_id, month_year, neura_id, narrative_text, key_insights, generated_at, refresh_count')
      .eq('school_id', schoolId)
      .eq('month_year', monthYear)
    if (neuraId) {
      query = query.eq('neura_id', neuraId)
    } else {
      query = query.is('neura_id', null)
    }
    const { data } = await query.maybeSingle()
    if (!data) return null
    return {
      id: data.id,
      school_id: data.school_id,
      month_year: data.month_year,
      neura_id: data.neura_id ?? null,
      narrative_text: data.narrative_text,
      key_insights: (data.key_insights as string[]) ?? [],
      generated_at: data.generated_at,
      refresh_count: data.refresh_count ?? 0,
    }
  }

  async saveNarrative(
    schoolId: string,
    monthYear: string,
    narrativeText: string,
    keyInsights: string[],
    neuraId: string | null,
    correlationId: string,
  ): Promise<SchoolNarrative> {
    this.logger.debug({ correlationId, schoolId, monthYear }, 'AnalyticsDeepRepo.saveNarrative')
    const { data, error } = await this.supabase
      .from('school_analytics_narratives')
      .insert({
        school_id: schoolId,
        month_year: monthYear,
        neura_id: neuraId,
        narrative_text: narrativeText,
        key_insights: keyInsights,
        generated_at: new Date().toISOString(),
        refresh_count: 0,
      })
      .select()
      .single()
    if (error || !data) throw new DatabaseError(error?.message ?? 'Insert failed', { correlationId })
    return {
      id: data.id,
      school_id: data.school_id,
      month_year: data.month_year,
      neura_id: data.neura_id ?? null,
      narrative_text: data.narrative_text,
      key_insights: (data.key_insights as string[]) ?? [],
      generated_at: data.generated_at,
      refresh_count: 0,
    }
  }

  async deleteNarrative(id: string, correlationId: string) {
    const { error } = await this.supabase
      .from('school_analytics_narratives')
      .delete()
      .eq('id', id)
    if (error) throw new DatabaseError(error.message, { id, correlationId })
  }

  async incrementNarrativeRefresh(id: string, currentCount: number, correlationId: string) {
    const { error } = await this.supabase
      .from('school_analytics_narratives')
      .update({ refresh_count: currentCount + 1 })
      .eq('id', id)
    if (error) throw new DatabaseError(error.message, { id, correlationId })
  }

  // ── Teacher Performance ──────────────────────────────────────────────────────

  async getTeacherPerformanceSnapshots(
    schoolId: string,
    monthYear: string,
    filter: AnalyticsFilter,
    correlationId: string,
  ): Promise<TeacherPerformanceRow[]> {
    this.logger.debug({ correlationId, schoolId, monthYear }, 'AnalyticsDeepRepo.getTeacherPerformanceSnapshots')

    let query = this.supabase
      .from('teacher_performance_snapshots')
      .select(`
        teacher_id, subject, classes_taught, student_count,
        avg_mastery_score, vs_school_avg, mastery_velocity,
        engagement_rate, at_risk_count, intervention_rate,
        context_flags, ai_insight,
        teachers!inner(full_name)
      `)
      .eq('school_id', schoolId)
      .eq('snapshot_month', monthYear)

    const { data, error } = await query
    if (error) throw new DatabaseError(error.message, { schoolId, correlationId })

    return (data ?? [])
      .filter((r) => {
        if (!filter.class_year && !filter.section) return true
        const classFilter = filter.class_year ? `${filter.class_year}` : null
        const sectionFilter = filter.section
        const taught = (r.classes_taught as string[]) ?? []
        return taught.some((cls) => {
          if (classFilter && sectionFilter) return cls === `${classFilter}-${sectionFilter}`
          if (classFilter) return cls.startsWith(classFilter + '-')
          if (sectionFilter) return cls.endsWith('-' + sectionFilter)
          return true
        })
      })
      .map((r) => ({
        teacher_id: r.teacher_id,
        teacher_name: (r.teachers as { full_name: string }).full_name,
        designation: '',
        classes_taught: (r.classes_taught as string[]) ?? [],
        subject: r.subject,
        student_count: r.student_count ?? 0,
        avg_mastery_score: r.avg_mastery_score ? Number(r.avg_mastery_score) : null,
        vs_school_avg: r.vs_school_avg ? Number(r.vs_school_avg) : null,
        mastery_velocity: r.mastery_velocity ? Number(r.mastery_velocity) : null,
        engagement_rate: r.engagement_rate ? Number(r.engagement_rate) : null,
        at_risk_count: r.at_risk_count ?? 0,
        intervention_rate: r.intervention_rate ? Number(r.intervention_rate) : null,
        leave_days_month: 0,
        context_flags: (r.context_flags as string[]) ?? [],
        ai_insight: r.ai_insight ?? null,
      }))
  }

  // ── Subject Mastery ──────────────────────────────────────────────────────────

  async getSubjectMastery(
    schoolId: string,
    academicYearId: string,
    filter: AnalyticsFilter,
    correlationId: string,
  ): Promise<SubjectMasteryRow[]> {
    const { data: latest } = await this.supabase
      .from('calibrated_mastery_scores')
      .select('computed_date')
      .eq('school_id', schoolId)
      .order('computed_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!latest) return []

    let query = this.supabase
      .from('calibrated_mastery_scores')
      .select('neura_id, subject, calibrated_percentile')
      .eq('school_id', schoolId)
      .eq('computed_date', latest.computed_date)

    const neuraIds = await this.getFilteredNeuraIds(schoolId, academicYearId, filter, correlationId)
    if ((filter.class_year || filter.section) && neuraIds.length === 0) return []
    if (neuraIds.length > 0) query = query.in('neura_id', neuraIds)

    const { data, error } = await query
    if (error) throw new DatabaseError(error.message, { schoolId, correlationId })

    const bySubject = new Map<string, { sum: number; count: number; seen: Set<string> }>()
    for (const row of data ?? []) {
      if (!row.subject) continue
      if (!bySubject.has(row.subject)) bySubject.set(row.subject, { sum: 0, count: 0, seen: new Set() })
      const entry = bySubject.get(row.subject)!
      if (!entry.seen.has(row.neura_id)) {
        entry.sum += row.calibrated_percentile ?? 0
        entry.count++
        entry.seen.add(row.neura_id)
      }
    }

    return [...bySubject.entries()]
      .map(([subject, { sum, count }]) => ({
        subject,
        avg_score: count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
        student_count: count,
        trend_delta: null,
      }))
      .sort((a, b) => b.avg_score - a.avg_score)
  }

  // ── Curriculum Gaps ──────────────────────────────────────────────────────────

  async getCurriculumGaps(
    schoolId: string,
    academicYearId: string,
    filter: AnalyticsFilter,
    correlationId: string,
  ): Promise<CurriculumGapRow[]> {
    const { data: latest } = await this.supabase
      .from('mastery_snapshots')
      .select('snapshot_date')
      .eq('school_id', schoolId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!latest) return []

    const cutoff = daysAgoIST(30)
    let query = this.supabase
      .from('mastery_snapshots')
      .select('neura_id, subject, topic, raw_score')
      .eq('school_id', schoolId)
      .gte('snapshot_date', cutoff)

    const neuraIds = await this.getFilteredNeuraIds(schoolId, academicYearId, filter, correlationId)
    if ((filter.class_year || filter.section) && neuraIds.length === 0) return []
    if (neuraIds.length > 0) query = query.in('neura_id', neuraIds)

    const { data, error } = await query
    if (error) throw new DatabaseError(error.message, { schoolId, correlationId })

    // Group by subject+topic, compute avg mastery, filter ≥5 students
    const byTopic = new Map<string, { subject: string; topic: string; sum: number; students: Set<string> }>()
    for (const row of data ?? []) {
      const key = `${row.subject}|${row.topic}`
      if (!byTopic.has(key)) byTopic.set(key, { subject: row.subject, topic: row.topic, sum: 0, students: new Set() })
      const e = byTopic.get(key)!
      if (!e.students.has(row.neura_id)) {
        e.sum += row.raw_score ?? 0
        e.students.add(row.neura_id)
      }
    }

    const gaps: CurriculumGapRow[] = []
    for (const [, { subject, topic, sum, students }] of byTopic) {
      if (students.size < 5) continue
      const mastery_pct = Math.round((sum / students.size) * 100 * 10) / 10
      if (mastery_pct < 60) {
        gaps.push({
          subject,
          chapter_number: 0,
          chapter_title: topic,
          mastery_pct,
          student_count: students.size,
        })
      }
    }

    return gaps.sort((a, b) => a.mastery_pct - b.mastery_pct).slice(0, 20)
  }

  // ── Exam Progression ──────────────────────────────────────────────────────────

  async getExamProgression(
    schoolId: string,
    academicYearId: string,
    filter: AnalyticsFilter,
    correlationId: string,
  ): Promise<ExamProgressionRow[]> {
    const { data: exams, error: examErr } = await this.supabase
      .from('exams')
      .select('id, name, exam_type, start_date')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .eq('status', 'PUBLISHED')
      .order('start_date', { ascending: true })
    if (examErr) throw new DatabaseError(examErr.message, { schoolId, correlationId })
    if (!exams || exams.length === 0) return []

    const examIds = exams.map((e) => e.id)
    let marksQuery = this.supabase
      .from('exam_marks')
      .select('exam_id, marks_obtained, is_absent, exam_subjects!inner(subject, max_marks, class_year, section)')
      .in('exam_id', examIds)
      .eq('is_absent', false)

    const neuraIds = await this.getFilteredNeuraIds(schoolId, academicYearId, filter, correlationId)
    if ((filter.class_year || filter.section) && neuraIds.length === 0) return []
    if (neuraIds.length > 0) marksQuery = marksQuery.in('neura_id', neuraIds)

    const { data: marks, error: marksErr } = await marksQuery
    if (marksErr) throw new DatabaseError(marksErr.message, { schoolId, correlationId })

    // Aggregate by exam_id + subject
    const examMap = new Map(exams.map((e) => [e.id, e]))
    const grouped = new Map<string, { sum: number; maxSum: number; count: number }>()
    for (const m of marks ?? []) {
      const sub = (m.exam_subjects as { subject: string }).subject
      const maxM = (m.exam_subjects as { max_marks: number }).max_marks
      const key = `${m.exam_id}|${sub}`
      if (!grouped.has(key)) grouped.set(key, { sum: 0, maxSum: 0, count: 0 })
      const e = grouped.get(key)!
      e.sum += m.marks_obtained ?? 0
      e.maxSum += maxM ?? 100
      e.count++
    }

    const rows: ExamProgressionRow[] = []
    for (const [key, { sum, maxSum, count }] of grouped) {
      const [examId, subject] = key.split('|')
      const exam = examMap.get(examId)
      if (!exam || count === 0) continue
      rows.push({
        subject,
        exam_type: exam.exam_type,
        school_avg: Math.round((sum / maxSum) * 100 * 10) / 10,
        period_label: exam.name,
      })
    }
    return rows
  }

  // ── AT-Risk Funnel ────────────────────────────────────────────────────────────

  async getAtRiskFunnel(
    schoolId: string,
    academicYearId: string,
    filter: AnalyticsFilter,
    correlationId: string,
  ): Promise<AtRiskFunnelData> {
    const neuraIds = await this.getFilteredNeuraIds(schoolId, academicYearId, filter, correlationId)
    const hasFilter = filter.class_year || filter.section

    // Total students
    let total: number
    if (hasFilter) {
      total = neuraIds.length
    } else {
      const { count } = await this.supabase
        .from('student_yearly_progress')
        .select('neura_id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('academic_year_id', academicYearId)
      total = count ?? 0
    }

    const cutoff = daysAgoIST(30)
    let masteryQuery = this.supabase
      .from('calibrated_mastery_scores')
      .select('neura_id, classification, calibrated_percentile, computed_date')
      .eq('school_id', schoolId)
      .gte('computed_date', cutoff)

    if (hasFilter && neuraIds.length > 0) masteryQuery = masteryQuery.in('neura_id', neuraIds)
    if (hasFilter && neuraIds.length === 0) {
      return { stage_1_total: 0, stage_2_declining: 0, stage_3_at_risk: 0, stage_4_unintervened: 0, stage_5_critical: 0 }
    }

    const { data: masteryRows } = await masteryQuery
    const latestByStudent = new Map<string, { classification: string; percentile: number }>()
    for (const r of masteryRows ?? []) {
      if (!latestByStudent.has(r.neura_id)) {
        latestByStudent.set(r.neura_id, { classification: r.classification, percentile: r.calibrated_percentile ?? 0 })
      }
    }

    const atRiskIds = [...latestByStudent.entries()]
      .filter(([, v]) => v.classification === 'AT_RISK')
      .map(([id]) => id)

    const decliningIds = [...latestByStudent.entries()]
      .filter(([, v]) => v.classification === 'DEVELOPING' || v.classification === 'AT_RISK')
      .map(([id]) => id)

    const criticalIds = [...latestByStudent.entries()]
      .filter(([, v]) => v.percentile < 20)
      .map(([id]) => id)

    // Unintervened AT-RISK
    let unintervened = 0
    if (atRiskIds.length > 0) {
      const sevenDaysAgo = daysAgoIST(7)
      const { data: interv } = await this.supabase
        .from('interventions')
        .select('neura_id')
        .eq('school_id', schoolId)
        .gte('logged_at', sevenDaysAgo)
        .in('neura_id', atRiskIds)
      const intervenedSet = new Set((interv ?? []).map((r) => r.neura_id))
      unintervened = atRiskIds.filter((id) => !intervenedSet.has(id)).length
    }

    return {
      stage_1_total: total,
      stage_2_declining: decliningIds.length,
      stage_3_at_risk: atRiskIds.length,
      stage_4_unintervened: unintervened,
      stage_5_critical: criticalIds.length,
    }
  }

  // ── RTE Comparison ───────────────────────────────────────────────────────────

  async getRteComparison(
    schoolId: string,
    academicYearId: string,
    filter: AnalyticsFilter,
    correlationId: string,
  ): Promise<RteComparisonData | null> {
    let progressQuery = this.supabase
      .from('student_yearly_progress')
      .select('neura_id, is_rte_student')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
    if (filter.class_year) progressQuery = progressQuery.eq('class_year', filter.class_year)
    if (filter.section) progressQuery = progressQuery.eq('section', filter.section)

    const { data: prog } = await progressQuery
    if (!prog || prog.length === 0) return null

    const rteIds = prog.filter((r) => r.is_rte_student).map((r) => r.neura_id)
    const nonRteIds = prog.filter((r) => !r.is_rte_student).map((r) => r.neura_id)
    if (rteIds.length === 0) return null

    const cutoff = daysAgoIST(30)
    const today = todayIST()
    const nintyDaysAgo = daysAgoIST(90)

    const [rteMastery, nonRteMastery, rteAtt, nonRteAtt] = await Promise.all([
      this.supabase.from('calibrated_mastery_scores').select('calibrated_percentile').eq('school_id', schoolId).gte('computed_date', cutoff).in('neura_id', rteIds),
      nonRteIds.length > 0 ? this.supabase.from('calibrated_mastery_scores').select('calibrated_percentile').eq('school_id', schoolId).gte('computed_date', cutoff).in('neura_id', nonRteIds) : Promise.resolve({ data: [] }),
      this.supabase.from('attendance').select('status').eq('school_id', schoolId).gte('attendance_date', nintyDaysAgo).lte('attendance_date', today).in('neura_id', rteIds),
      nonRteIds.length > 0 ? this.supabase.from('attendance').select('status').eq('school_id', schoolId).gte('attendance_date', nintyDaysAgo).lte('attendance_date', today).in('neura_id', nonRteIds) : Promise.resolve({ data: [] }),
    ])

    const avgPct = (rows: Array<{ calibrated_percentile: number | null }>) => {
      const vals = rows.map((r) => r.calibrated_percentile ?? 0)
      return vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0
    }
    const attRate = (rows: Array<{ status: string }>) => {
      if (rows.length === 0) return 0
      const present = rows.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length
      return Math.round((present / rows.length) * 1000) / 10
    }

    return {
      rte_students: rteIds.length,
      non_rte_students: nonRteIds.length,
      rte_mastery_avg: avgPct(rteMastery.data ?? []),
      non_rte_mastery_avg: avgPct((nonRteMastery as { data: Array<{ calibrated_percentile: number | null }> }).data ?? []),
      rte_attendance_avg: attRate(rteAtt.data ?? []),
      non_rte_attendance_avg: attRate((nonRteAtt as { data: Array<{ status: string }> }).data ?? []),
    }
  }

  // ── Attendance Analytics ──────────────────────────────────────────────────────

  async getAttendanceTrend30d(
    schoolId: string,
    filter: AnalyticsFilter,
    correlationId: string,
    academicYearId?: string,
  ): Promise<AttendanceTrendDay[]> {
    const from = daysAgoIST(30)
    const to = todayIST()
    let query = this.supabase
      .from('attendance')
      .select('attendance_date, status')
      .eq('school_id', schoolId)
      .gte('attendance_date', from)
      .lte('attendance_date', to)
    if ((filter.class_year || filter.section) && academicYearId) {
      const neuraIds = await this.getFilteredNeuraIds(schoolId, academicYearId, filter, correlationId)
      if (neuraIds.length === 0) return []
      query = query.in('neura_id', neuraIds)
    }
    const { data, error } = await query
    if (error) throw new DatabaseError(error.message, { schoolId, correlationId })

    const byDate = new Map<string, { present: number; total: number }>()
    for (const r of data ?? []) {
      const d = r.attendance_date
      if (!byDate.has(d)) byDate.set(d, { present: 0, total: 0 })
      const e = byDate.get(d)!
      e.total++
      if (r.status === 'PRESENT' || r.status === 'LATE') e.present++
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { present, total }]) => ({
        date,
        rate: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
        present_count: present,
        total_count: total,
      }))
  }

  async getAttendanceClassHeatmap(
    schoolId: string,
    academicYearId: string,
    correlationId: string,
  ): Promise<ClassHeatmapEntry[]> {
    const from = daysAgoIST(30)
    const to = todayIST()

    const [progressResult, attResult] = await Promise.all([
      this.supabase
        .from('student_yearly_progress')
        .select('neura_id, class_year, section')
        .eq('school_id', schoolId)
        .eq('academic_year_id', academicYearId),
      this.supabase
        .from('attendance')
        .select('neura_id, attendance_date, status')
        .eq('school_id', schoolId)
        .gte('attendance_date', from)
        .lte('attendance_date', to),
    ])
    if (attResult.error) throw new DatabaseError(attResult.error.message, { schoolId, correlationId })

    const classMap = new Map(
      (progressResult.data ?? []).map((p) => [p.neura_id, { class_year: p.class_year, section: p.section }]),
    )

    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const key = (cy: number, s: string, d: string) => `${cy}|${s}|${d}`
    const grouped = new Map<string, { present: number; total: number }>()
    for (const r of attResult.data ?? []) {
      const info = classMap.get(r.neura_id)
      if (!info) continue
      const dayName = DAYS[new Date(r.attendance_date).getDay()]
      const k = key(info.class_year, info.section, dayName)
      if (!grouped.has(k)) grouped.set(k, { present: 0, total: 0 })
      const e = grouped.get(k)!
      e.total++
      if (r.status === 'PRESENT' || r.status === 'LATE') e.present++
    }

    return [...grouped.entries()].map(([k, { present, total }]) => {
      const [cy, sec, day] = k.split('|')
      return { class_year: Number(cy), section: sec, day_of_week: day, rate: total > 0 ? Math.round((present / total) * 1000) / 10 : 0 }
    })
  }

  async getDayOfWeekStats(
    schoolId: string,
    correlationId: string,
  ): Promise<DayOfWeekStat[]> {
    const from = daysAgoIST(30)
    const { data, error } = await this.supabase
      .from('attendance')
      .select('attendance_date, status')
      .eq('school_id', schoolId)
      .gte('attendance_date', from)
    if (error) throw new DatabaseError(error.message, { schoolId, correlationId })

    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const byDay = new Map<string, { present: number; total: number }>()
    for (const r of data ?? []) {
      const dayName = DAYS[new Date(r.attendance_date).getDay()]
      if (!byDay.has(dayName)) byDay.set(dayName, { present: 0, total: 0 })
      const e = byDay.get(dayName)!
      e.total++
      if (r.status === 'PRESENT' || r.status === 'LATE') e.present++
    }

    const dayRates = [...byDay.entries()].map(([day, { present, total }]) => ({
      day,
      avg_rate: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
    }))
    const schoolAvg = dayRates.length > 0 ? dayRates.reduce((s, d) => s + d.avg_rate, 0) / dayRates.length : 0
    return dayRates.map((d) => ({ ...d, below_school_avg: d.avg_rate < schoolAvg }))
  }

  async getChronicAbsentees(
    schoolId: string,
    academicYearId: string,
    filter: AnalyticsFilter,
    correlationId: string,
  ): Promise<ChronicAbsentee[]> {
    const from = daysAgoIST(90)
    const to = todayIST()

    let progressQuery = this.supabase
      .from('student_yearly_progress')
      .select('neura_id, class_year, section, students!inner(full_name)')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
    if (filter.class_year) progressQuery = progressQuery.eq('class_year', filter.class_year)
    if (filter.section) progressQuery = progressQuery.eq('section', filter.section)
    const { data: progress } = await progressQuery
    if (!progress || progress.length === 0) return []

    const neuraIds = progress.map((r) => r.neura_id)
    const { data: attData } = await this.supabase
      .from('attendance')
      .select('neura_id, attendance_date, status')
      .eq('school_id', schoolId)
      .gte('attendance_date', from)
      .lte('attendance_date', to)
      .in('neura_id', neuraIds)

    // Compute per-student stats
    const byStudent = new Map<string, { present: number; total: number; lastPresent: string | null }>()
    for (const r of attData ?? []) {
      if (!byStudent.has(r.neura_id)) byStudent.set(r.neura_id, { present: 0, total: 0, lastPresent: null })
      const e = byStudent.get(r.neura_id)!
      e.total++
      if (r.status === 'PRESENT' || r.status === 'LATE') {
        e.present++
        if (!e.lastPresent || r.attendance_date > e.lastPresent) e.lastPresent = r.attendance_date
      }
    }

    // Get fee status for absentee students
    const chronicIds = [...byStudent.entries()]
      .filter(([, v]) => v.total > 0 && v.present / v.total < 0.8)
      .map(([id]) => id)
    if (chronicIds.length === 0) return []

    const { data: feeData } = await this.supabase
      .from('fee_ledger')
      .select('neura_id, status')
      .eq('school_id', schoolId)
      .in('neura_id', chronicIds)

    const feeByStudent = new Map<string, string>()
    for (const f of feeData ?? []) {
      // Worst status wins
      const existing = feeByStudent.get(f.neura_id)
      if (!existing || f.status === 'OVERDUE' || (f.status === 'PARTIAL' && existing === 'PAID')) {
        feeByStudent.set(f.neura_id, f.status ?? 'PAID')
      }
    }

    const progressMap = new Map(progress.map((p) => [p.neura_id, p]))
    return chronicIds
      .map((id) => {
        const stats = byStudent.get(id)!
        const prog = progressMap.get(id)
        const feeStatus = feeByStudent.get(id) ?? 'PAID'
        const finalFeeStatus = ['PAID', 'PARTIAL', 'OVERDUE'].includes(feeStatus) ? feeStatus as 'PAID' | 'PARTIAL' | 'OVERDUE' : 'OVERDUE'
        return {
          neura_id: id,
          name: (prog?.students as { full_name: string })?.full_name ?? id,
          class_year: prog?.class_year ?? 0,
          section: prog?.section ?? '',
          absent_days: stats.total - stats.present,
          rate: Math.round((stats.present / stats.total) * 1000) / 10,
          last_attended: stats.lastPresent,
          fee_status: finalFeeStatus,
        }
      })
      .sort((a, b) => {
        if (a.rate !== b.rate) return a.rate - b.rate
        const feeOrder = { OVERDUE: 0, PARTIAL: 1, PAID: 2 }
        return feeOrder[a.fee_status] - feeOrder[b.fee_status]
      })
  }

  // ── Financial Analytics ───────────────────────────────────────────────────────

  async getFeeCollectionTrend6m(
    schoolId: string,
    academicYearId: string,
    correlationId: string,
  ): Promise<FinancialCollectionPoint[]> {
    const { data, error } = await this.supabase
      .from('fee_ledger')
      .select('due_date, amount_due, amount_paid, status')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
    if (error) throw new DatabaseError(error.message, { schoolId, correlationId })

    const byMonth = new Map<string, { due: number; paid: number }>()
    for (const r of data ?? []) {
      const month = (r.due_date ?? '').slice(0, 7)
      if (!month) continue
      if (!byMonth.has(month)) byMonth.set(month, { due: 0, paid: 0 })
      const e = byMonth.get(month)!
      e.due += r.amount_due ?? 0
      e.paid += r.amount_paid ?? 0
    }

    const cutoff = monthsAgoLabel(6)
    return [...byMonth.entries()]
      .filter(([m]) => m >= cutoff)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { due, paid }]) => ({
        month,
        collected: Math.round(paid),
        total_due: Math.round(due),
        rate: due > 0 ? Math.round((paid / due) * 1000) / 10 : 0,
      }))
  }

  async getOutstandingByClass(
    schoolId: string,
    academicYearId: string,
    correlationId: string,
  ): Promise<Array<{ class_year: number; outstanding: number; defaulters: number }>> {
    const { data: ledger } = await this.supabase
      .from('fee_ledger')
      .select('neura_id, amount_due, amount_paid, amount_waived')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)

    const { data: progress } = await this.supabase
      .from('student_yearly_progress')
      .select('neura_id, class_year')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)

    if (!ledger || !progress) return []
    const classMap = new Map(progress.map((p) => [p.neura_id, p.class_year]))

    const byClass = new Map<number, { outstanding: number; defaulters: Set<string> }>()
    for (const r of ledger) {
      const balance = (r.amount_due ?? 0) - (r.amount_paid ?? 0) - (r.amount_waived ?? 0)
      if (balance <= 0) continue
      const cls = classMap.get(r.neura_id)
      if (!cls) continue
      if (!byClass.has(cls)) byClass.set(cls, { outstanding: 0, defaulters: new Set() })
      const e = byClass.get(cls)!
      e.outstanding += balance
      e.defaulters.add(r.neura_id)
    }

    return [...byClass.entries()]
      .sort(([a], [b]) => a - b)
      .map(([class_year, { outstanding, defaulters }]) => ({
        class_year,
        outstanding: Math.round(outstanding),
        defaulters: defaulters.size,
      }))
  }

  async getSalaryRevenueRatio(
    schoolId: string,
    academicYearId: string,
    correlationId: string,
  ): Promise<{ salary_expense: number; fee_revenue: number; ratio: number }> {
    const [payrollResult, feeResult] = await Promise.all([
      this.supabase
        .from('payroll_runs')
        .select('total_net')
        .eq('school_id', schoolId)
        .eq('academic_year_id', academicYearId)
        .eq('status', 'PAID'),
      this.supabase
        .from('fee_ledger')
        .select('amount_paid')
        .eq('school_id', schoolId)
        .eq('academic_year_id', academicYearId),
    ])

    const salaryExpense = (payrollResult.data ?? []).reduce((s, r) => s + (r.total_net ?? 0), 0)
    const feeRevenue = (feeResult.data ?? []).reduce((s, r) => s + (r.amount_paid ?? 0), 0)
    return {
      salary_expense: Math.round(salaryExpense),
      fee_revenue: Math.round(feeRevenue),
      ratio: feeRevenue > 0 ? Math.round((salaryExpense / feeRevenue) * 100) / 100 : 0,
    }
  }

  // ── Digital Analytics ─────────────────────────────────────────────────────────

  async getSmartpadUtilizationTrend(
    schoolId: string,
    correlationId: string,
  ): Promise<Array<{ date: string; utilization_pct: number }>> {
    const from = daysAgoIST(30)
    const [sessionsResult, devicesResult] = await Promise.all([
      this.supabase
        .from('student_sessions')
        .select('session_date, smartpad_id')
        .eq('school_id', schoolId)
        .gte('session_date', from),
      this.supabase
        .from('smartpad_devices')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('status', 'ACTIVE'),
    ])

    const totalDevices = devicesResult.count ?? 1
    const byDate = new Map<string, Set<string>>()
    for (const r of sessionsResult.data ?? []) {
      if (!byDate.has(r.session_date)) byDate.set(r.session_date, new Set())
      byDate.get(r.session_date)!.add(r.smartpad_id)
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, pads]) => ({
        date,
        utilization_pct: Math.round((pads.size / totalDevices) * 1000) / 10,
      }))
  }

  async getUnderutilizedStudents(
    schoolId: string,
    academicYearId: string,
    filter: AnalyticsFilter,
    correlationId: string,
  ): Promise<Array<{ neura_id: string; name: string; class_year: number; section: string; sessions_this_week: number; last_session: string | null; is_at_risk: boolean }>> {
    const weekAgo = daysAgoIST(7)
    const monthAgo = daysAgoIST(30)

    const neuraIds = await this.getFilteredNeuraIds(schoolId, academicYearId, filter, correlationId)
    const hasFilter = filter.class_year || filter.section

    let progressQuery = this.supabase
      .from('student_yearly_progress')
      .select('neura_id, class_year, section, students!inner(full_name)')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
    if (hasFilter && neuraIds.length > 0) progressQuery = progressQuery.in('neura_id', neuraIds)
    if (hasFilter && neuraIds.length === 0) return []

    const { data: progress } = await progressQuery
    if (!progress) return []

    const allIds = progress.map((p) => p.neura_id)

    const [sessionsResult, atRiskResult] = await Promise.all([
      this.supabase.from('student_sessions').select('neura_id, session_date').eq('school_id', schoolId).gte('session_date', monthAgo).in('neura_id', allIds),
      this.supabase.from('calibrated_mastery_scores').select('neura_id, classification').eq('school_id', schoolId).gte('computed_date', monthAgo).in('neura_id', allIds),
    ])

    const weekSessions = new Map<string, number>()
    const lastSession = new Map<string, string>()
    for (const s of sessionsResult.data ?? []) {
      if (s.session_date >= weekAgo) {
        weekSessions.set(s.neura_id, (weekSessions.get(s.neura_id) ?? 0) + 1)
      }
      const prev = lastSession.get(s.neura_id)
      if (!prev || s.session_date > prev) lastSession.set(s.neura_id, s.session_date)
    }

    const atRiskSet = new Set(
      (atRiskResult.data ?? []).filter((r) => r.classification === 'AT_RISK').map((r) => r.neura_id),
    )

    return progress
      .filter((p) => (weekSessions.get(p.neura_id) ?? 0) <= 2)
      .map((p) => ({
        neura_id: p.neura_id,
        name: (p.students as { full_name: string })?.full_name ?? p.neura_id,
        class_year: p.class_year,
        section: p.section,
        sessions_this_week: weekSessions.get(p.neura_id) ?? 0,
        last_session: lastSession.get(p.neura_id) ?? null,
        is_at_risk: atRiskSet.has(p.neura_id),
      }))
      .sort((a, b) => a.sessions_this_week - b.sessions_this_week)
      .slice(0, 25)
  }

  // ── Year-over-Year ────────────────────────────────────────────────────────────

  async getHealthScoreHistory(schoolId: string, correlationId: string) {
    const { data, error } = await this.supabase
      .from('school_health_scores')
      .select('computed_date, overall_score, band')
      .eq('school_id', schoolId)
      .order('computed_date', { ascending: false })
      .limit(24)
    if (error) throw new DatabaseError(error.message, { schoolId, correlationId })
    return data ?? []
  }

  async buildYoYComparisons(
    schoolId: string,
    currentAyId: string,
    prevAyId: string,
    correlationId: string,
  ): Promise<YoYComparison[]> {
    const results: YoYComparison[] = []

    // Health score — from school_health_scores history
    const { data: scores } = await this.supabase
      .from('school_health_scores')
      .select('computed_date, overall_score')
      .eq('school_id', schoolId)
      .order('computed_date', { ascending: false })
      .limit(400)

    if (scores && scores.length > 0) {
      const now = new Date()
      const currentYearStart = new Date(now.getFullYear(), 5, 1) // June current year
      const prevYearStart = new Date(now.getFullYear() - 1, 5, 1)
      const prevYearEnd = new Date(now.getFullYear(), 4, 31)

      const currScores = scores.filter((s) => new Date(s.computed_date) >= currentYearStart)
      const prevScores = scores.filter((s) => {
        const d = new Date(s.computed_date)
        return d >= prevYearStart && d <= prevYearEnd
      })

      const avg = (arr: typeof currScores) => arr.length > 0 ? arr.reduce((s, r) => s + Number(r.overall_score), 0) / arr.length : 0
      const thisScore = Math.round(avg(currScores) * 10) / 10
      const lastScore = Math.round(avg(prevScores) * 10) / 10
      if (thisScore > 0 || lastScore > 0) {
        results.push({ metric: 'health_score', this_year: thisScore, last_year: lastScore, delta: Math.round((thisScore - lastScore) * 10) / 10 })
      }
    }

    // Mastery avg
    const [currMastery, prevMastery] = await Promise.all([
      this.supabase.from('calibrated_mastery_scores').select('calibrated_percentile').eq('school_id', schoolId).gte('computed_date', `${new Date().getFullYear()}-06-01`),
      this.supabase.from('calibrated_mastery_scores').select('calibrated_percentile').eq('school_id', schoolId).gte('computed_date', `${new Date().getFullYear() - 1}-06-01`).lt('computed_date', `${new Date().getFullYear()}-06-01`),
    ])
    const masteryAvg = (rows: Array<{ calibrated_percentile: number | null }>) =>
      rows.length > 0 ? Math.round((rows.reduce((s, r) => s + (r.calibrated_percentile ?? 0), 0) / rows.length) * 10) / 10 : 0
    const currM = masteryAvg(currMastery.data ?? [])
    const prevM = masteryAvg(prevMastery.data ?? [])
    if (currM > 0 || prevM > 0) results.push({ metric: 'mastery_avg', this_year: currM, last_year: prevM, delta: Math.round((currM - prevM) * 10) / 10 })

    // Fee collection rate
    const [currFee, prevFee] = await Promise.all([
      this.supabase.from('fee_ledger').select('amount_due, amount_paid').eq('school_id', schoolId).eq('academic_year_id', currentAyId),
      prevAyId ? this.supabase.from('fee_ledger').select('amount_due, amount_paid').eq('school_id', schoolId).eq('academic_year_id', prevAyId) : Promise.resolve({ data: [] }),
    ])
    const feeRate = (rows: Array<{ amount_due: number | null; amount_paid: number | null }>) => {
      const due = rows.reduce((s, r) => s + (r.amount_due ?? 0), 0)
      const paid = rows.reduce((s, r) => s + (r.amount_paid ?? 0), 0)
      return due > 0 ? Math.round((paid / due) * 1000) / 10 : 0
    }
    const currFR = feeRate(currFee.data ?? [])
    const prevFR = feeRate((prevFee as { data: Array<{ amount_due: number | null; amount_paid: number | null }> }).data ?? [])
    if (currFR > 0 || prevFR > 0) results.push({ metric: 'fee_collection_rate', this_year: currFR, last_year: prevFR, delta: Math.round((currFR - prevFR) * 10) / 10 })

    // AT-Risk count
    const cutoff = daysAgoIST(30)
    const [currRisk, prevRisk] = await Promise.all([
      this.supabase.from('calibrated_mastery_scores').select('neura_id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('classification', 'AT_RISK').gte('computed_date', cutoff),
      this.supabase.from('calibrated_mastery_scores').select('neura_id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('classification', 'AT_RISK').gte('computed_date', `${new Date().getFullYear() - 1}-${cutoff.slice(5)}`).lt('computed_date', cutoff),
    ])
    results.push({ metric: 'at_risk_count', this_year: currRisk.count ?? 0, last_year: prevRisk.count ?? 0, delta: (currRisk.count ?? 0) - (prevRisk.count ?? 0) })

    // Attendance avg (last 30 days this year vs same window last year)
    const { data: currAtt } = await this.supabase.from('attendance').select('status').eq('school_id', schoolId).gte('attendance_date', cutoff)
    const lastYearCutoff = `${new Date().getFullYear() - 1}-${cutoff.slice(5)}`
    const { data: prevAtt } = await this.supabase.from('attendance').select('status').eq('school_id', schoolId).gte('attendance_date', lastYearCutoff).lt('attendance_date', cutoff)
    const attAvg = (rows: Array<{ status: string }>) => {
      if (rows.length === 0) return 0
      return Math.round((rows.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length / rows.length) * 1000) / 10
    }
    const currAA = attAvg(currAtt ?? [])
    const prevAA = attAvg(prevAtt ?? [])
    if (currAA > 0 || prevAA > 0) results.push({ metric: 'attendance_avg', this_year: currAA, last_year: prevAA, delta: Math.round((currAA - prevAA) * 10) / 10 })

    return results
  }

  // ── Benchmark ────────────────────────────────────────────────────────────────

  async getBenchmarkStats(
    board: string,
    state: string,
    sizeBucket: string,
    period: string,
    correlationId: string,
  ): Promise<Array<{ metric: string; p25: number; p50: number; p75: number; school_count: number }>> {
    const { data, error } = await this.supabase
      .from('neuralife_benchmark_stats')
      .select('metric, p25, p50, p75, school_count')
      .eq('board', board)
      .eq('state', state)
      .eq('size_bucket', sizeBucket)
      .eq('period', period)
    if (error) throw new DatabaseError(error.message, { correlationId })
    return (data ?? []).map((r) => ({
      metric: r.metric,
      p25: Number(r.p25),
      p50: Number(r.p50),
      p75: Number(r.p75),
      school_count: r.school_count,
    }))
  }

  // ── Student Intelligence ──────────────────────────────────────────────────────

  async getStudentProfile(neuraId: string, schoolId: string, academicYearId: string, correlationId: string) {
    const { data: student } = await this.supabase
      .from('students')
      .select('neura_id, full_name, band, status')
      .eq('neura_id', neuraId)
      .maybeSingle()
    if (!student) throw new NotFoundError('Student not found', { neuraId, correlationId })

    const { data: progress } = await this.supabase
      .from('student_yearly_progress')
      .select('class_year, section, medium, smartpad_id, is_rte_student')
      .eq('neura_id', neuraId)
      .eq('academic_year_id', academicYearId)
      .maybeSingle()

    return { student, progress }
  }

  async getStudentMasteryBySubject(neuraId: string, schoolId: string, correlationId: string): Promise<StudentMasterySubject[]> {
    const { data: latest } = await this.supabase
      .from('calibrated_mastery_scores')
      .select('computed_date')
      .eq('neura_id', neuraId)
      .order('computed_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!latest) return []

    const [curr, prev] = await Promise.all([
      this.supabase.from('calibrated_mastery_scores').select('subject, calibrated_percentile, classification, vs_class_avg, vs_school_avg').eq('neura_id', neuraId).eq('computed_date', latest.computed_date),
      this.supabase.from('calibrated_mastery_scores').select('subject, calibrated_percentile').eq('neura_id', neuraId).lt('computed_date', latest.computed_date).order('computed_date', { ascending: false }).limit(50),
    ])

    const prevBySubject = new Map<string, number>()
    for (const r of prev.data ?? []) {
      if (!prevBySubject.has(r.subject)) prevBySubject.set(r.subject, r.calibrated_percentile ?? 0)
    }

    // One row per subject (take highest percentile if multiple topics)
    const currRows = curr.data ?? []
    const bySubject = new Map<string, (typeof currRows)[number]>()
    for (const r of currRows) {
      const existing = bySubject.get(r.subject)
      if (!existing || (r.calibrated_percentile ?? 0) > (existing.calibrated_percentile ?? 0)) {
        bySubject.set(r.subject, r)
      }
    }

    return [...bySubject.values()].map((r) => ({
      subject: r.subject,
      mastery_pct: r.calibrated_percentile ?? 0,
      trend_delta: prevBySubject.has(r.subject)
        ? Math.round(((r.calibrated_percentile ?? 0) - prevBySubject.get(r.subject)!) * 10) / 10
        : null,
      percentile: r.calibrated_percentile ?? null,
      vs_class_avg: r.vs_class_avg ? Number(r.vs_class_avg) : null,
      vs_school_avg: r.vs_school_avg ? Number(r.vs_school_avg) : null,
      classification: r.classification ?? null,
    }))
  }

  async getStudentMasteryTrajectory(neuraId: string, schoolId: string, correlationId: string): Promise<StudentMasteryPoint[]> {
    const { data } = await this.supabase
      .from('calibrated_mastery_scores')
      .select('computed_date, calibrated_percentile')
      .eq('neura_id', neuraId)
      .order('computed_date', { ascending: true })
    if (!data) return []

    const byMonth = new Map<string, number[]>()
    for (const r of data) {
      const month = r.computed_date.slice(0, 7)
      if (!byMonth.has(month)) byMonth.set(month, [])
      byMonth.get(month)!.push(r.calibrated_percentile ?? 0)
    }

    return [...byMonth.entries()]
      .slice(-12)
      .map(([month, vals]) => ({
        month,
        avg_percentile: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
      }))
  }

  async getStudentAttendance90d(neuraId: string, schoolId: string, correlationId: string) {
    const from = daysAgoIST(90)
    const { data } = await this.supabase
      .from('attendance')
      .select('attendance_date, status')
      .eq('neura_id', neuraId)
      .eq('school_id', schoolId)
      .gte('attendance_date', from)
      .order('attendance_date', { ascending: true })
    const rows = data ?? []
    const present = rows.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length
    return {
      days: rows.map((r) => ({ date: r.attendance_date, status: r.status })),
      rate: rows.length > 0 ? Math.round((present / rows.length) * 1000) / 10 : 0,
    }
  }

  async getStudentSessions90d(neuraId: string, schoolId: string, correlationId: string) {
    const from = daysAgoIST(90)
    const { data } = await this.supabase
      .from('student_sessions')
      .select('session_date, started_at, ended_at')
      .eq('neura_id', neuraId)
      .eq('school_id', schoolId)
      .gte('session_date', from)
    const rows = data ?? []
    let totalMinutes = 0
    for (const r of rows) {
      if (r.started_at && r.ended_at) {
        totalMinutes += (new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()) / 60000
      }
    }
    return {
      session_count: rows.length,
      avg_session_minutes: rows.length > 0 ? Math.round(totalMinutes / rows.length) : 0,
    }
  }

  async getStudentErrorPatterns(neuraId: string, correlationId: string): Promise<Array<{ pattern: string; occurrences: number; subject: string }>> {
    const from = daysAgoIST(30)
    const { data } = await this.supabase
      .from('mastery_snapshots')
      .select('subject, error_patterns')
      .eq('neura_id', neuraId)
      .gte('snapshot_date', from)
    if (!data) return []

    const counts = new Map<string, { count: number; subject: string }>()
    for (const r of data) {
      for (const pattern of (r.error_patterns as string[]) ?? []) {
        if (!counts.has(pattern)) counts.set(pattern, { count: 0, subject: r.subject })
        counts.get(pattern)!.count++
      }
    }

    return [...counts.entries()]
      .map(([pattern, { count, subject }]) => ({ pattern, occurrences: count, subject }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10)
  }

  async getStudentExamHistory(neuraId: string, schoolId: string, correlationId: string) {
    const { data: marks } = await this.supabase
      .from('exam_marks')
      .select(`
        marks_obtained, is_absent,
        exam_subjects!inner(subject, max_marks, exams!inner(name, exam_type))
      `)
      .eq('neura_id', neuraId)
      .is('is_absent', false)
      .order('exam_subjects(exams(start_date))', { ascending: false })
      .limit(30)

    return (marks ?? []).map((m) => {
      const sub = m.exam_subjects as { subject: string; max_marks: number; exams: { name: string; exam_type: string } }
      return {
        exam_name: sub.exams.name,
        exam_type: sub.exams.exam_type,
        subject: sub.subject,
        marks: m.marks_obtained ?? null,
        max_marks: sub.max_marks,
        percentage: m.marks_obtained != null ? Math.round((m.marks_obtained / sub.max_marks) * 1000) / 10 : null,
      }
    })
  }

  async getAvgMasteryForScope(
    schoolId: string,
    classYear?: number,
    section?: string,
    academicYearId?: string,
    correlationId?: string,
  ): Promise<number | null> {
    const cutoff = daysAgoIST(30)
    let query = this.supabase
      .from('calibrated_mastery_scores')
      .select('neura_id, calibrated_percentile')
      .eq('school_id', schoolId)
      .gte('computed_date', cutoff)

    if ((classYear || section) && academicYearId) {
      let pq = this.supabase.from('student_yearly_progress').select('neura_id').eq('school_id', schoolId).eq('academic_year_id', academicYearId)
      if (classYear) pq = pq.eq('class_year', classYear)
      if (section) pq = pq.eq('section', section)
      const { data: ids } = await pq
      if (!ids || ids.length === 0) return null
      query = query.in('neura_id', ids.map((r) => r.neura_id))
    }

    const { data } = await query
    if (!data || data.length === 0) return null
    const seen = new Map<string, number>()
    for (const r of data) {
      if (!seen.has(r.neura_id)) seen.set(r.neura_id, r.calibrated_percentile ?? 0)
    }
    const vals = [...seen.values()]
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
  }

  // ── Section Comparison ────────────────────────────────────────────────────────

  async getSectionComparison(
    schoolId: string,
    academicYearId: string,
    classYear: number,
    correlationId: string,
  ): Promise<SectionComparison[]> {
    const { data: sections } = await this.supabase
      .from('student_yearly_progress')
      .select('section')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .eq('class_year', classYear)

    const uniqueSections = [...new Set((sections ?? []).map((r) => r.section))].sort()
    const results: SectionComparison[] = []

    for (const section of uniqueSections) {
      const attFrom = daysAgoIST(30)

      // Get section neura_ids first (needed for attendance + at-risk)
      const { data: ids } = await this.supabase
        .from('student_yearly_progress')
        .select('neura_id')
        .eq('school_id', schoolId)
        .eq('academic_year_id', academicYearId)
        .eq('class_year', classYear)
        .eq('section', section)
      const sectionIds = (ids ?? []).map((r) => r.neura_id)

      const masteryAvg = await this.getAvgMasteryForScope(schoolId, classYear, section, academicYearId, correlationId)

      // Attendance last 30 days (filter by neura_ids, not by class_year/section columns)
      const { data: attData } = await this.supabase
        .from('attendance')
        .select('status')
        .eq('school_id', schoolId)
        .gte('attendance_date', attFrom)
        .in('neura_id', sectionIds.length > 0 ? sectionIds : ['__none__'])
      const attTotal = attData?.length ?? 0
      const attPresent = attData?.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length ?? 0
      const attendanceAvg = attTotal > 0 ? Math.round((attPresent / attTotal) * 1000) / 10 : 0

      let atRiskCount = 0
      if (sectionIds.length > 0) {
        const { count } = await this.supabase
          .from('calibrated_mastery_scores')
          .select('neura_id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('classification', 'AT_RISK')
          .gte('computed_date', attFrom)
          .in('neura_id', sectionIds)
        atRiskCount = count ?? 0
      }

      // Fee collection
      const { data: feeData } = await this.supabase
        .from('fee_ledger')
        .select('amount_due, amount_paid')
        .eq('school_id', schoolId)
        .in('neura_id', sectionIds.length > 0 ? sectionIds : ['__none__'])
      const feeDue = (feeData ?? []).reduce((s, r) => s + (r.amount_due ?? 0), 0)
      const feePaid = (feeData ?? []).reduce((s, r) => s + (r.amount_paid ?? 0), 0)

      results.push({
        section,
        mastery_avg: masteryAvg ?? 0,
        attendance_avg: attendanceAvg,
        at_risk_count: atRiskCount,
        smartpad_usage_avg: 0,
        fee_collection_pct: feeDue > 0 ? Math.round((feePaid / feeDue) * 1000) / 10 : 0,
      })
    }

    return results.sort((a, b) => b.mastery_avg - a.mastery_avg)
  }

  // ── Board Exam Results ─────────────────────────────────────────────────────────

  async getBoardExamResults(
    schoolId: string,
    academicYearId: string,
    correlationId: string,
  ): Promise<BoardExamResult[]> {
    const { data, error } = await this.supabase
      .from('board_exam_results')
      .select('neura_id, subject, marks, max_marks, grade')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
    if (error) throw new DatabaseError(error.message, { schoolId, correlationId })
    return (data ?? []).map((r) => ({
      neura_id: r.neura_id,
      subject: r.subject,
      marks: Number(r.marks),
      max_marks: Number(r.max_marks),
      grade: r.grade ?? null,
    }))
  }

  async getPredictionAccuracy(
    schoolId: string,
    academicYearId: string,
    boardResults: BoardExamResult[],
    correlationId: string,
  ): Promise<PredictionAccuracy[]> {
    if (boardResults.length === 0) return []
    const neuraIds = [...new Set(boardResults.map((r) => r.neura_id))]
    const { data: mastery } = await this.supabase
      .from('calibrated_mastery_scores')
      .select('neura_id, subject, calibrated_percentile, computed_date')
      .in('neura_id', neuraIds)
      .eq('school_id', schoolId)
      .gte('computed_date', `${new Date().getFullYear()}-02-01`)
      .lte('computed_date', `${new Date().getFullYear()}-03-31`)

    const predicted = new Map<string, number[]>()
    for (const m of mastery ?? []) {
      const key = `${m.neura_id}|${m.subject}`
      if (!predicted.has(key)) predicted.set(key, [])
      predicted.get(key)!.push(m.calibrated_percentile ?? 0)
    }

    const bySubject = new Map<string, { predSum: number; actSum: number; count: number }>()
    for (const r of boardResults) {
      const key = `${r.neura_id}|${r.subject}`
      const preds = predicted.get(key)
      if (!preds || preds.length === 0) continue
      const avgPred = preds.reduce((a, b) => a + b, 0) / preds.length
      const actual = (r.marks / r.max_marks) * 100
      if (!bySubject.has(r.subject)) bySubject.set(r.subject, { predSum: 0, actSum: 0, count: 0 })
      const e = bySubject.get(r.subject)!
      e.predSum += avgPred
      e.actSum += actual
      e.count++
    }

    return [...bySubject.entries()].map(([subject, { predSum, actSum, count }]) => {
      const predicted_avg = Math.round((predSum / count) * 10) / 10
      const actual_avg = Math.round((actSum / count) * 10) / 10
      return {
        subject,
        predicted_avg,
        actual_avg,
        accuracy_pct: Math.round((100 - Math.abs(predicted_avg - actual_avg)) * 10) / 10,
      }
    })
  }

  async upsertBoardExamResults(
    schoolId: string,
    academicYearId: string,
    results: BoardExamResult[],
    uploadedBy: string,
    correlationId: string,
  ) {
    const year = new Date().getFullYear()
    const rows = results.map((r) => ({
      school_id: schoolId,
      academic_year_id: academicYearId,
      neura_id: r.neura_id,
      subject: r.subject,
      marks: r.marks,
      max_marks: r.max_marks,
      grade: r.grade,
      exam_year: year,
      uploaded_by: uploadedBy,
    }))

    const { error } = await this.supabase
      .from('board_exam_results')
      .upsert(rows, { onConflict: 'school_id,neura_id,subject,exam_year' })
    if (error) throw new DatabaseError(error.message, { schoolId, correlationId })
  }

  // ── Share Tokens ──────────────────────────────────────────────────────────────

  async createShareToken(
    schoolId: string,
    token: string,
    urlPath: string,
    expiresAt: string,
    createdBy: string,
    correlationId: string,
  ) {
    const { data, error } = await this.supabase
      .from('analytics_share_tokens')
      .insert({ school_id: schoolId, token, url_path: urlPath, expires_at: expiresAt, created_by: createdBy })
      .select()
      .single()
    if (error || !data) throw new DatabaseError(error?.message ?? 'Insert failed', { correlationId })
    return data
  }

  async resolveShareToken(token: string, correlationId: string) {
    const { data } = await this.supabase
      .from('analytics_share_tokens')
      .select('id, school_id, url_path, expires_at, access_count')
      .eq('token', token)
      .maybeSingle()
    return data
  }

  async incrementShareAccess(id: string, currentCount: number, correlationId: string) {
    await this.supabase
      .from('analytics_share_tokens')
      .update({ access_count: currentCount + 1 })
      .eq('id', id)
  }

  // ── Bookmarks ─────────────────────────────────────────────────────────────────

  async getBookmarks(teacherId: string, correlationId: string): Promise<BookmarkItem[]> {
    const { data, error } = await this.supabase
      .from('user_bookmarks')
      .select('id, url, title, icon, sort_order, created_at')
      .eq('teacher_id', teacherId)
      .order('sort_order', { ascending: true })
    if (error) throw new DatabaseError(error.message, { teacherId, correlationId })
    return (data ?? []).map((r) => ({
      id: r.id,
      url: r.url,
      title: r.title,
      icon: r.icon ?? null,
      sort_order: r.sort_order ?? 0,
      created_at: r.created_at,
    }))
  }

  async countBookmarks(teacherId: string, correlationId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('user_bookmarks')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', teacherId)
    if (error) throw new DatabaseError(error.message, { teacherId, correlationId })
    return count ?? 0
  }

  async createBookmark(
    teacherId: string,
    schoolId: string,
    url: string,
    title: string,
    icon: string | null,
    correlationId: string,
  ): Promise<BookmarkItem> {
    const { count } = await this.supabase
      .from('user_bookmarks')
      .select('sort_order', { count: 'exact', head: true })
      .eq('teacher_id', teacherId)

    const { data, error } = await this.supabase
      .from('user_bookmarks')
      .upsert(
        { teacher_id: teacherId, school_id: schoolId, url, title, icon, sort_order: count ?? 0 },
        { onConflict: 'teacher_id,url', ignoreDuplicates: false },
      )
      .select()
      .single()
    if (error || !data) throw new DatabaseError(error?.message ?? 'Insert failed', { correlationId })
    return { id: data.id, url: data.url, title: data.title, icon: data.icon ?? null, sort_order: data.sort_order ?? 0, created_at: data.created_at }
  }

  async deleteBookmark(id: string, teacherId: string, correlationId: string) {
    const { error } = await this.supabase
      .from('user_bookmarks')
      .delete()
      .eq('id', id)
      .eq('teacher_id', teacherId)
    if (error) throw new DatabaseError(error.message, { id, correlationId })
  }
}
