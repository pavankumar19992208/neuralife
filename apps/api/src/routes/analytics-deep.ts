import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import crypto from 'crypto'
import { AnalyticsDeepRepository } from '../repositories/analytics-deep.repository.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { requireRole } from '../middleware/roleGuard.js'
import { generateContent } from '../lib/claude.js'
import { ValidationError, NotFoundError, AppError } from '../utils/errors.js'
import { UserRole } from '../types/common.js'
import type { AnalyticsPeriod, AnalyticsFilter } from '../types/common.js'
import logger from '../lib/logger.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function istNow(): Date {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000)
}

function currentMonthYear(): string {
  return istNow().toISOString().slice(0, 7)
}

function getPeriodRange(period: AnalyticsPeriod): { from: string; to: string; label: string } {
  const now = istNow()
  const today = now.toISOString().split('T')[0]
  if (period === 'month') {
    return { from: `${today.slice(0, 7)}-01`, to: today, label: now.toLocaleString('en-IN', { month: 'long', year: 'numeric' }) }
  }
  if (period === 'term') {
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const isFirstHalf = month >= 6 && month <= 10
    return { from: isFirstHalf ? `${year}-06-01` : `${year}-11-01`, to: today, label: isFirstHalf ? 'Term 1 (Jun–Oct)' : 'Term 2 (Nov–Mar)' }
  }
  const year = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1
  return { from: `${year}-06-01`, to: today, label: `Academic Year ${year}–${year + 1}` }
}

function parseAnalyticsFilter(query: Record<string, unknown>): AnalyticsFilter {
  return {
    period: (query.period as AnalyticsPeriod) ?? 'month',
    class_year: query.class_year ? Number(query.class_year) : undefined,
    section: query.section as string | undefined,
    neura_id: query.neura_id as string | undefined,
  }
}

function sizeBucket(studentCount: number): 'SMALL' | 'MEDIUM' | 'LARGE' {
  if (studentCount < 200) return 'SMALL'
  if (studentCount <= 500) return 'MEDIUM'
  return 'LARGE'
}

// ─── Narrative Prompt ─────────────────────────────────────────────────────────

function buildNarrativePrompt(data: {
  schoolName: string
  monthYear: string
  subjectMastery: Array<{ subject: string; avg_score: number }>
  atRiskFunnel: { stage_3_at_risk: number; stage_4_unintervened: number }
  attendanceRate: number
  feeCollectionRate: number
  healthScore?: number
  healthBand?: string
}): string {
  return `You are NeuraLife's School Intelligence Engine. Write a concise analytics narrative for a school principal.

School: ${data.schoolName}
Month: ${data.monthYear}
Health Score: ${data.healthScore ?? 'N/A'} (${data.healthBand ?? 'N/A'})
Attendance Rate (30-day avg): ${data.attendanceRate}%
Fee Collection Rate: ${data.feeCollectionRate}%
AT-RISK students: ${data.atRiskFunnel.stage_3_at_risk} (${data.atRiskFunnel.stage_4_unintervened} unintervened)
Subject Mastery (avg percentile):
${data.subjectMastery.map((s) => `  ${s.subject}: ${s.avg_score}`).join('\n')}

Respond with a JSON object only — no markdown, no explanation:
{
  "narrative_text": "3-4 sentence narrative for the principal. Be specific, reference actual numbers, always end with one recommended action.",
  "key_insights": ["specific insight 1 with numbers", "specific insight 2 with numbers", "specific insight 3 with numbers"]
}

Rules:
- Tone: trusted senior advisor, not a report card
- Never just restate numbers — always say what they mean for the school
- Key insights: 3-4 items, each under 15 words, data-referenced`
}

function buildStudentNarrativePrompt(data: {
  studentName: string
  classYear: number
  section: string
  mastery: Array<{ subject: string; mastery_pct: number; trend_delta: number | null }>
  attendanceRate: number
  errorPatterns: Array<{ pattern: string; occurrences: number; subject: string }>
  examHistory: Array<{ exam_name: string; subject: string; percentage: number | null }>
}): string {
  return `You are NeuraLife's Student Intelligence Engine. Write a brief progress note for a teacher.

Student: ${data.studentName}, Class ${data.classYear}-${data.section}
Attendance (90-day): ${data.attendanceRate}%
Mastery by subject:
${data.mastery.map((m) => `  ${m.subject}: ${m.mastery_pct} percentile${m.trend_delta != null ? ` (${m.trend_delta > 0 ? '+' : ''}${m.trend_delta} vs last month)` : ''}`).join('\n')}
${data.errorPatterns.length > 0 ? `Top error patterns:\n${data.errorPatterns.slice(0, 3).map((e) => `  ${e.pattern} (${e.occurrences}× in ${e.subject})`).join('\n')}` : ''}
${data.examHistory.length > 0 ? `Recent exams:\n${data.examHistory.slice(0, 3).map((e) => `  ${e.exam_name} ${e.subject}: ${e.percentage ?? 'N/A'}%`).join('\n')}` : ''}

Respond with a JSON object only — no markdown, no explanation:
{
  "insight": "3-4 sentence progress note. Mention the strongest subject, any declining trend, top error pattern, and one specific recommendation.",
  "generated_at": "${new Date().toISOString()}"
}

Tone: trusted teacher-mentor writing a progress note. Specific. Data-referenced. Constructive.`
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const routes: FastifyPluginAsync = async (fastify) => {
  const repo = new AnalyticsDeepRepository(supabaseAdmin, fastify.log)

  const PRINCIPAL_ONLY = [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])]

  // ── GET /api/v1/analytics/narrative/:monthYear ─────────────────────────────
  fastify.get<{ Params: { monthYear: string } }>(
    '/api/v1/analytics/narrative/:monthYear',
    { preHandler: PRINCIPAL_ONLY },
    async (request, reply) => {
      const { school_id } = request.jwtPayload
      const { monthYear } = request.params
      const { correlationId } = request

      if (!/^\d{4}-\d{2}$/.test(monthYear)) throw new ValidationError('monthYear must be YYYY-MM')

      const cached = await repo.findNarrative(school_id, monthYear, null, correlationId)
      if (cached) return reply.send({ data: cached })

      // Generate via Bedrock
      logger.info({ correlationId, school_id, monthYear }, 'Generating analytics narrative via Bedrock')

      const [school, ay] = await Promise.all([
        repo.getSchoolInfo(school_id, correlationId),
        repo.getCurrentAcademicYear(school_id, correlationId),
      ])
      const subjectMastery = await repo.getSubjectMastery(school_id, ay.id, { period: 'month' }, correlationId)
      const atRiskFunnel = await repo.getAtRiskFunnel(school_id, ay.id, { period: 'month' }, correlationId)
      const trend30d = await repo.getAttendanceTrend30d(school_id, { period: 'month' }, correlationId)
      const feeData = await repo.getFeeCollectionTrend6m(school_id, ay.id, correlationId)
      const healthHistory = await repo.getHealthScoreHistory(school_id, correlationId)
      const latestHealth = healthHistory[0]

      const attendanceRate = trend30d.length > 0
        ? Math.round((trend30d.reduce((s, d) => s + d.rate, 0) / trend30d.length) * 10) / 10
        : 0
      const latestFee = feeData[feeData.length - 1]
      const feeCollectionRate = latestFee?.rate ?? 0

      const prompt = buildNarrativePrompt({
        schoolName: school.name,
        monthYear,
        subjectMastery,
        atRiskFunnel,
        attendanceRate,
        feeCollectionRate,
        healthScore: latestHealth ? Number(latestHealth.overall_score) : undefined,
        healthBand: latestHealth?.band,
      })

      let narrativeText = ''
      let keyInsights: string[] = []
      try {
        const raw = await generateContent(
          'You are NeuraLife\'s School Intelligence Engine. Always respond with valid JSON only.',
          [{ role: 'user', content: prompt }],
          1024,
        )
        const parsed = JSON.parse(raw.trim().replace(/^```json\n?/, '').replace(/\n?```$/, ''))
        narrativeText = parsed.narrative_text ?? raw
        keyInsights = parsed.key_insights ?? []
      } catch {
        narrativeText = `Analytics summary for ${monthYear}: ${subjectMastery.length} subjects tracked, ${atRiskFunnel.stage_3_at_risk} AT_RISK students, ${attendanceRate}% attendance rate, ${feeCollectionRate}% fee collection.`
        keyInsights = []
      }

      const saved = await repo.saveNarrative(school_id, monthYear, narrativeText, keyInsights, null, correlationId)
      logger.info({ correlationId, school_id, monthYear }, 'Narrative saved')
      return reply.send({ data: saved })
    },
  )

  // ── POST /api/v1/analytics/narrative/:monthYear/refresh ───────────────────
  fastify.post<{ Params: { monthYear: string } }>(
    '/api/v1/analytics/narrative/:monthYear/refresh',
    { preHandler: PRINCIPAL_ONLY },
    async (request, reply) => {
      const { school_id } = request.jwtPayload
      const { monthYear } = request.params
      const { correlationId } = request

      if (!/^\d{4}-\d{2}$/.test(monthYear)) throw new ValidationError('monthYear must be YYYY-MM')

      const existing = await repo.findNarrative(school_id, monthYear, null, correlationId)
      if (existing && existing.refresh_count >= 3) {
        return reply.code(429).send({
          error: 'Refresh limit reached (3 per month)',
          code: 'REFRESH_LIMIT_REACHED',
          correlationId,
        })
      }

      if (existing) {
        await repo.incrementNarrativeRefresh(existing.id, existing.refresh_count, correlationId)
        await repo.deleteNarrative(existing.id, correlationId)
      }

      // Re-generate — forward to GET handler logic via redirect-style
      const [school, ay] = await Promise.all([
        repo.getSchoolInfo(school_id, correlationId),
        repo.getCurrentAcademicYear(school_id, correlationId),
      ])
      const subjectMastery = await repo.getSubjectMastery(school_id, ay.id, { period: 'month' }, correlationId)
      const atRiskFunnel = await repo.getAtRiskFunnel(school_id, ay.id, { period: 'month' }, correlationId)
      const trend30d = await repo.getAttendanceTrend30d(school_id, { period: 'month' }, correlationId)
      const feeData = await repo.getFeeCollectionTrend6m(school_id, ay.id, correlationId)
      const healthHistory = await repo.getHealthScoreHistory(school_id, correlationId)
      const latestHealth = healthHistory[0]

      const attendanceRate = trend30d.length > 0
        ? Math.round((trend30d.reduce((s, d) => s + d.rate, 0) / trend30d.length) * 10) / 10 : 0
      const feeCollectionRate = feeData[feeData.length - 1]?.rate ?? 0

      const prompt = buildNarrativePrompt({
        schoolName: school.name,
        monthYear,
        subjectMastery,
        atRiskFunnel,
        attendanceRate,
        feeCollectionRate,
        healthScore: latestHealth ? Number(latestHealth.overall_score) : undefined,
        healthBand: latestHealth?.band,
      })

      let narrativeText = ''
      let keyInsights: string[] = []
      try {
        const raw = await generateContent(
          'You are NeuraLife\'s School Intelligence Engine. Always respond with valid JSON only.',
          [{ role: 'user', content: prompt }],
          1024,
        )
        const parsed = JSON.parse(raw.trim().replace(/^```json\n?/, '').replace(/\n?```$/, ''))
        narrativeText = parsed.narrative_text ?? raw
        keyInsights = parsed.key_insights ?? []
      } catch {
        narrativeText = `Refreshed analytics summary for ${monthYear}.`
        keyInsights = []
      }

      const saved = await repo.saveNarrative(school_id, monthYear, narrativeText, keyInsights, null, correlationId)
      logger.info({ correlationId, school_id, monthYear }, 'Narrative refreshed')
      return reply.send({ data: saved })
    },
  )

  // ── GET /api/v1/analytics/academic ────────────────────────────────────────
  fastify.get(
    '/api/v1/analytics/academic',
    { preHandler: PRINCIPAL_ONLY },
    async (request, reply) => {
      const { school_id } = request.jwtPayload
      const { correlationId } = request
      const filter = parseAnalyticsFilter(request.query as Record<string, unknown>)
      const monthYear = currentMonthYear()

      const ay = await repo.getCurrentAcademicYear(school_id, correlationId)

      const [teacherPerf, subjectMastery, curriculumGaps, examProgression, atRiskFunnel, rteComparison] =
        await Promise.all([
          repo.getTeacherPerformanceSnapshots(school_id, monthYear, filter, correlationId),
          repo.getSubjectMastery(school_id, ay.id, filter, correlationId),
          repo.getCurriculumGaps(school_id, ay.id, filter, correlationId),
          repo.getExamProgression(school_id, ay.id, filter, correlationId),
          repo.getAtRiskFunnel(school_id, ay.id, filter, correlationId),
          repo.getRteComparison(school_id, ay.id, filter, correlationId),
        ])

      logger.info({ correlationId, school_id, filter }, 'Academic analytics computed')

      return reply.send({
        data: {
          teacher_performance: teacherPerf,
          subject_mastery: subjectMastery,
          curriculum_gaps: curriculumGaps,
          exam_progression: examProgression,
          at_risk_funnel: atRiskFunnel,
          rte_comparison: rteComparison,
        },
      })
    },
  )

  // ── GET /api/v1/analytics/attendance ──────────────────────────────────────
  fastify.get(
    '/api/v1/analytics/attendance',
    { preHandler: PRINCIPAL_ONLY },
    async (request, reply) => {
      const { school_id } = request.jwtPayload
      const { correlationId } = request
      const filter = parseAnalyticsFilter(request.query as Record<string, unknown>)

      const ay = await repo.getCurrentAcademicYear(school_id, correlationId)

      const [trend30d, classHeatmap, dayOfWeek, chronicAbsentees] = await Promise.all([
        repo.getAttendanceTrend30d(school_id, filter, correlationId, ay.id),
        repo.getAttendanceClassHeatmap(school_id, ay.id, correlationId),
        repo.getDayOfWeekStats(school_id, correlationId),
        repo.getChronicAbsentees(school_id, ay.id, filter, correlationId),
      ])

      return reply.send({ data: { trend_30d: trend30d, class_heatmap: classHeatmap, day_of_week: dayOfWeek, chronic_absentees: chronicAbsentees } })
    },
  )

  // ── GET /api/v1/analytics/financial ───────────────────────────────────────
  fastify.get(
    '/api/v1/analytics/financial',
    { preHandler: PRINCIPAL_ONLY },
    async (request, reply) => {
      const { school_id } = request.jwtPayload
      const { correlationId } = request

      const ay = await repo.getCurrentAcademicYear(school_id, correlationId)

      const [collectionTrend, outstandingByClass, salaryRevRatio] = await Promise.all([
        repo.getFeeCollectionTrend6m(school_id, ay.id, correlationId),
        repo.getOutstandingByClass(school_id, ay.id, correlationId),
        repo.getSalaryRevenueRatio(school_id, ay.id, correlationId),
      ])

      const revenue = collectionTrend.reduce((s, r) => s + r.collected, 0)
      const salary = salaryRevRatio.salary_expense
      const annualProjection = revenue > 0 ? Math.round((revenue / collectionTrend.length) * 12) : 0

      return reply.send({
        data: {
          collection_trend: collectionTrend,
          outstanding_by_class: outstandingByClass,
          salary_revenue_ratio: salaryRevRatio,
          financial_summary: {
            revenue: Math.round(revenue),
            salary,
            surplus: Math.round(revenue - salary),
            annual_projection: annualProjection,
          },
          rte_fee_summary: { rte_students: 0, rte_fee_waived: 0, fee_paying_revenue: Math.round(revenue) },
        },
      })
    },
  )

  // ── GET /api/v1/analytics/digital ─────────────────────────────────────────
  fastify.get(
    '/api/v1/analytics/digital',
    { preHandler: PRINCIPAL_ONLY },
    async (request, reply) => {
      const { school_id } = request.jwtPayload
      const { correlationId } = request
      const filter = parseAnalyticsFilter(request.query as Record<string, unknown>)

      const ay = await repo.getCurrentAcademicYear(school_id, correlationId)

      const [utilizationTrend, underutilized] = await Promise.all([
        repo.getSmartpadUtilizationTrend(school_id, correlationId),
        repo.getUnderutilizedStudents(school_id, ay.id, filter, correlationId),
      ])

      return reply.send({
        data: {
          utilization_trend: utilizationTrend,
          usage_mastery_scatter: [],
          top_content: [],
          error_patterns: [],
          underutilized,
        },
      })
    },
  )

  // ── GET /api/v1/analytics/yoy ─────────────────────────────────────────────
  fastify.get(
    '/api/v1/analytics/yoy',
    { preHandler: PRINCIPAL_ONLY },
    async (request, reply) => {
      const { school_id } = request.jwtPayload
      const { correlationId } = request

      const currentAy = await repo.getCurrentAcademicYear(school_id, correlationId)
      const prevAy = await repo.getPreviousAcademicYear(school_id, currentAy.id, correlationId)

      if (!prevAy) {
        logger.info({ correlationId, school_id }, 'No previous academic year for YoY')
        return reply.send({ data: [] })
      }

      const comparisons = await repo.buildYoYComparisons(school_id, currentAy.id, prevAy.id, correlationId)
      return reply.send({ data: comparisons })
    },
  )

  // ── GET /api/v1/analytics/benchmark ───────────────────────────────────────
  fastify.get(
    '/api/v1/analytics/benchmark',
    { preHandler: PRINCIPAL_ONLY },
    async (request, reply) => {
      const { school_id } = request.jwtPayload
      const { correlationId } = request
      const period = currentMonthYear()

      const [school, ay] = await Promise.all([
        repo.getSchoolInfo(school_id, correlationId),
        repo.getCurrentAcademicYear(school_id, correlationId),
      ])

      const studentCount = await repo.getActiveStudentCount(school_id, ay.id, correlationId)
      const bucket = sizeBucket(studentCount)
      const benchmarks = await repo.getBenchmarkStats(school.board, school.state, bucket, period, correlationId)

      if (benchmarks.length === 0 || benchmarks[0].school_count < 5) {
        return reply.send({ data: { insufficient_data: true, metrics: [] } })
      }

      // Compute school's current values for each metric
      const subjectMastery = await repo.getSubjectMastery(school_id, ay.id, { period: 'month' }, correlationId)
      const schoolMasteryAvg = subjectMastery.length > 0
        ? Math.round((subjectMastery.reduce((s, r) => s + r.avg_score, 0) / subjectMastery.length) * 10) / 10 : 0

      const trend30d = await repo.getAttendanceTrend30d(school_id, { period: 'month' }, correlationId)
      const schoolAttAvg = trend30d.length > 0
        ? Math.round((trend30d.reduce((s, d) => s + d.rate, 0) / trend30d.length) * 10) / 10 : 0

      const feeData = await repo.getFeeCollectionTrend6m(school_id, ay.id, correlationId)
      const latestFee = feeData[feeData.length - 1]?.rate ?? 0

      const healthHistory = await repo.getHealthScoreHistory(school_id, correlationId)
      const latestHealth = healthHistory[0] ? Number(healthHistory[0].overall_score) : 0

      const schoolValues: Record<string, number> = {
        mastery_avg: schoolMasteryAvg,
        attendance_avg: schoolAttAvg,
        fee_collection: latestFee,
        health_score: latestHealth,
      }

      const metrics: Array<{
        metric: string; school_value: number; p25: number; p50: number; p75: number;
        percentile_label: 'TOP_25' | 'TOP_50' | 'TOP_75' | 'BOTTOM_25'; school_count: number
      }> = benchmarks.map((b) => {
        const sv = schoolValues[b.metric] ?? 0
        let label: 'TOP_25' | 'TOP_50' | 'TOP_75' | 'BOTTOM_25' = 'BOTTOM_25'
        if (sv > b.p75) label = 'TOP_25'
        else if (sv > b.p50) label = 'TOP_50'
        else if (sv > b.p25) label = 'TOP_75'
        return { metric: b.metric, school_value: sv, p25: b.p25, p50: b.p50, p75: b.p75, percentile_label: label, school_count: b.school_count }
      })

      logger.info({ correlationId, school_id, bucket }, 'Benchmark computed')
      return reply.send({ data: { insufficient_data: false, metrics } })
    },
  )

  // ── GET /api/v1/analytics/student/:neuraId ────────────────────────────────
  fastify.get<{ Params: { neuraId: string } }>(
    '/api/v1/analytics/student/:neuraId',
    { preHandler: PRINCIPAL_ONLY },
    async (request, reply) => {
      const { school_id } = request.jwtPayload
      const { neuraId } = request.params
      const { correlationId } = request

      const ay = await repo.getCurrentAcademicYear(school_id, correlationId)
      const { student, progress } = await repo.getStudentProfile(neuraId, school_id, ay.id, correlationId)

      const [
        mastery,
        trajectory,
        attendance90d,
        sessions90d,
        errorPatterns,
        examHistory,
        sectionAvg,
        classAvg,
        schoolAvg,
        cachedNarrative,
      ] = await Promise.all([
        repo.getStudentMasteryBySubject(neuraId, school_id, correlationId),
        repo.getStudentMasteryTrajectory(neuraId, school_id, correlationId),
        repo.getStudentAttendance90d(neuraId, school_id, correlationId),
        repo.getStudentSessions90d(neuraId, school_id, correlationId),
        repo.getStudentErrorPatterns(neuraId, correlationId),
        repo.getStudentExamHistory(neuraId, school_id, correlationId),
        progress ? repo.getAvgMasteryForScope(school_id, progress.class_year, progress.section, ay.id, correlationId) : Promise.resolve(null),
        progress ? repo.getAvgMasteryForScope(school_id, progress.class_year, undefined, ay.id, correlationId) : Promise.resolve(null),
        repo.getAvgMasteryForScope(school_id, undefined, undefined, ay.id, correlationId),
        repo.findNarrative(school_id, currentMonthYear(), neuraId, correlationId),
      ])

      logger.info({ correlationId, school_id, neuraId }, 'Student intelligence computed')

      return reply.send({
        data: {
          neura_id: student.neura_id,
          full_name: student.full_name,
          class_year: progress?.class_year ?? 0,
          section: progress?.section ?? '',
          medium: progress?.medium ?? '',
          band: student.band ?? null,
          status: student.status,
          smartpad_id: progress?.smartpad_id ?? null,
          is_rte_student: progress?.is_rte_student ?? false,
          mastery,
          mastery_trajectory: trajectory,
          attendance_90d: attendance90d.days,
          attendance_rate_90d: attendance90d.rate,
          smartpad_sessions_90d: sessions90d.session_count,
          avg_session_minutes: sessions90d.avg_session_minutes,
          error_patterns: errorPatterns,
          exam_history: examHistory,
          section_avg_mastery: sectionAvg,
          class_avg_mastery: classAvg,
          school_avg_mastery: schoolAvg,
          ai_insight: cachedNarrative?.narrative_text ?? null,
        },
      })
    },
  )

  // ── POST /api/v1/analytics/student/:neuraId/narrative ─────────────────────
  fastify.post<{ Params: { neuraId: string } }>(
    '/api/v1/analytics/student/:neuraId/narrative',
    { preHandler: PRINCIPAL_ONLY },
    async (request, reply) => {
      const { school_id } = request.jwtPayload
      const { neuraId } = request.params
      const { correlationId } = request
      const monthYear = currentMonthYear()

      const cached = await repo.findNarrative(school_id, monthYear, neuraId, correlationId)
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
      if (cached && cached.generated_at > sevenDaysAgo) {
        return reply.send({ data: { insight: cached.narrative_text, generated_at: cached.generated_at } })
      }
      if (cached) await repo.deleteNarrative(cached.id, correlationId)

      const ay = await repo.getCurrentAcademicYear(school_id, correlationId)
      const { student, progress } = await repo.getStudentProfile(neuraId, school_id, ay.id, correlationId)

      const [mastery, attendance90d, errorPatterns, examHistory] = await Promise.all([
        repo.getStudentMasteryBySubject(neuraId, school_id, correlationId),
        repo.getStudentAttendance90d(neuraId, school_id, correlationId),
        repo.getStudentErrorPatterns(neuraId, correlationId),
        repo.getStudentExamHistory(neuraId, school_id, correlationId),
      ])

      const prompt = buildStudentNarrativePrompt({
        studentName: student.full_name,
        classYear: progress?.class_year ?? 0,
        section: progress?.section ?? '',
        mastery,
        attendanceRate: attendance90d.rate,
        errorPatterns,
        examHistory,
      })

      let insight = ''
      let generatedAt = new Date().toISOString()
      try {
        const raw = await generateContent(
          'You are NeuraLife\'s Student Intelligence Engine. Always respond with valid JSON only.',
          [{ role: 'user', content: prompt }],
          512,
        )
        const parsed = JSON.parse(raw.trim().replace(/^```json\n?/, '').replace(/\n?```$/, ''))
        insight = parsed.insight ?? raw
        generatedAt = parsed.generated_at ?? generatedAt
      } catch {
        insight = `${student.full_name} has ${mastery.length > 0 ? mastery[0].subject + ' as strongest subject' : 'no recent mastery data'}. Attendance: ${attendance90d.rate}%.`
      }

      await repo.saveNarrative(school_id, monthYear, insight, [], neuraId, correlationId)
      logger.info({ correlationId, school_id, neuraId }, 'Student narrative generated')
      return reply.send({ data: { insight, generated_at: generatedAt } })
    },
  )

  // ── GET /api/v1/analytics/section/:classYear/:section ─────────────────────
  fastify.get<{ Params: { classYear: string; section: string } }>(
    '/api/v1/analytics/section/:classYear/:section',
    { preHandler: PRINCIPAL_ONLY },
    async (request, reply) => {
      const { school_id } = request.jwtPayload
      const { correlationId } = request
      const classYear = Number(request.params.classYear)
      const { section } = request.params
      const filter: AnalyticsFilter = { period: 'month', class_year: classYear, section }

      const ay = await repo.getCurrentAcademicYear(school_id, correlationId)

      const [subjectMastery, atRiskFunnel, trend30d, chronicAbsentees, rteComparison, narrative] = await Promise.all([
        repo.getSubjectMastery(school_id, ay.id, filter, correlationId),
        repo.getAtRiskFunnel(school_id, ay.id, filter, correlationId),
        repo.getAttendanceTrend30d(school_id, filter, correlationId, ay.id),
        repo.getChronicAbsentees(school_id, ay.id, filter, correlationId),
        repo.getRteComparison(school_id, ay.id, filter, correlationId),
        repo.findNarrative(school_id, currentMonthYear(), null, correlationId),
      ])

      return reply.send({
        data: {
          class_year: classYear,
          section,
          subject_mastery: subjectMastery,
          at_risk_funnel: atRiskFunnel,
          attendance_trend_30d: trend30d,
          chronic_absentees: chronicAbsentees,
          rte_comparison: rteComparison,
          section_ai_narrative: narrative?.narrative_text ?? null,
        },
      })
    },
  )

  // ── GET /api/v1/analytics/class/:classYear ────────────────────────────────
  fastify.get<{ Params: { classYear: string } }>(
    '/api/v1/analytics/class/:classYear',
    { preHandler: PRINCIPAL_ONLY },
    async (request, reply) => {
      const { school_id } = request.jwtPayload
      const { correlationId } = request
      const classYear = Number(request.params.classYear)
      const filter: AnalyticsFilter = { period: 'month', class_year: classYear }

      const ay = await repo.getCurrentAcademicYear(school_id, correlationId)

      const [subjectMastery, atRiskFunnel, sectionComparison] = await Promise.all([
        repo.getSubjectMastery(school_id, ay.id, filter, correlationId),
        repo.getAtRiskFunnel(school_id, ay.id, filter, correlationId),
        repo.getSectionComparison(school_id, ay.id, classYear, correlationId),
      ])

      return reply.send({
        data: {
          class_year: classYear,
          subject_mastery: subjectMastery,
          at_risk_funnel: atRiskFunnel,
          section_comparison: sectionComparison,
        },
      })
    },
  )

  // ── GET /api/v1/analytics/board-results ───────────────────────────────────
  fastify.get(
    '/api/v1/analytics/board-results',
    { preHandler: PRINCIPAL_ONLY },
    async (request, reply) => {
      const { school_id } = request.jwtPayload
      const { correlationId } = request

      const ay = await repo.getCurrentAcademicYear(school_id, correlationId)
      const results = await repo.getBoardExamResults(school_id, ay.id, correlationId)
      const accuracy = await repo.getPredictionAccuracy(school_id, ay.id, results, correlationId)

      return reply.send({ data: { results, prediction_accuracy: accuracy } })
    },
  )

  // ── POST /api/v1/analytics/board-results ──────────────────────────────────
  const BoardResultsSchema = z.object({
    results: z.array(z.object({
      neura_id: z.string().min(1),
      subject: z.string().min(1),
      marks: z.number().nonnegative(),
      max_marks: z.number().positive(),
      grade: z.string().optional().nullable(),
    })).min(1),
  })

  fastify.post(
    '/api/v1/analytics/board-results',
    { preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL])] },
    async (request, reply) => {
      const { school_id, sub } = request.jwtPayload
      const { correlationId } = request
      const body = BoardResultsSchema.parse(request.body)

      const ay = await repo.getCurrentAcademicYear(school_id, correlationId)
      await repo.upsertBoardExamResults(
        school_id,
        ay.id,
        body.results.map((r) => ({ ...r, grade: r.grade ?? null })),
        sub,
        correlationId,
      )

      logger.info({ correlationId, school_id, count: body.results.length }, 'Board results uploaded')
      return reply.code(201).send({ data: { inserted: body.results.length, errors: [] } })
    },
  )

  // ── POST /api/v1/analytics/share ──────────────────────────────────────────
  const ShareSchema = z.object({
    url_path: z.string().min(1).startsWith('/'),
    expires_days: z.number().int().min(1).max(90).default(30),
  })

  fastify.post(
    '/api/v1/analytics/share',
    { preHandler: PRINCIPAL_ONLY },
    async (request, reply) => {
      const { school_id, sub } = request.jwtPayload
      const { correlationId } = request
      const body = ShareSchema.parse(request.body)

      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + body.expires_days * 86400000).toISOString()

      await repo.createShareToken(school_id, token, body.url_path, expiresAt, sub, correlationId)
      logger.info({ correlationId, school_id }, 'Share token created')

      return reply.code(201).send({
        data: {
          token,
          share_url: `/shared/analytics/${token}`,
          expires_at: expiresAt,
        },
      })
    },
  )

  // ── GET /api/v1/analytics/share/:token (public, no auth) ─────────────────
  fastify.get<{ Params: { token: string } }>(
    '/api/v1/analytics/share/:token',
    async (request, reply) => {
      const { token } = request.params
      const { correlationId } = request

      const row = await repo.resolveShareToken(token, correlationId)
      if (!row) throw new NotFoundError('Share token not found or expired')

      const now = new Date()
      if (new Date(row.expires_at) < now) {
        throw new AppError('Share link has expired', 'TOKEN_EXPIRED', 410)
      }

      await repo.incrementShareAccess(row.id, row.access_count, correlationId)

      return reply.send({ data: { url_path: row.url_path, access_count: row.access_count + 1 } })
    },
  )
}

export default routes
