import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { FastifyBaseLogger } from 'fastify'
import type { RawSchoolHealthData } from '../types/common.js'
import { DatabaseError, NotFoundError } from '../utils/errors.js'

function todayIST(): string {
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
  return ist.toISOString().split('T')[0]
}

function dateIST(daysAgo: number): string {
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000 - daysAgo * 86400000)
  return ist.toISOString().split('T')[0]
}

function daysBeforeDate(baseDate: string, days: number): string {
  const d = new Date(baseDate)
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

export class AnalyticsRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: FastifyBaseLogger,
  ) {}

  async getCurrentAcademicYear(schoolId: string, correlationId: string): Promise<string> {
    this.logger.debug({ correlationId, schoolId }, 'AnalyticsRepository.getCurrentAcademicYear')

    const { data, error } = await this.supabase
      .from('academic_years')
      .select('id')
      .eq('school_id', schoolId)
      .eq('is_current', true)
      .limit(1)
      .single()

    if (error || !data) {
      this.logger.error({ correlationId, schoolId, error }, 'No active academic year found')
      throw new NotFoundError('No active academic year found for this school', { schoolId, correlationId })
    }

    return data.id
  }

  async getRawHealthData(
    schoolId: string,
    academicYearId: string,
    asOfDate: string,
    correlationId: string,
  ): Promise<RawSchoolHealthData> {
    this.logger.debug({ correlationId, schoolId, asOfDate }, 'AnalyticsRepository.getRawHealthData')

    const sevenDaysBefore = daysBeforeDate(asOfDate, 7)

    const [studentsResult, attendanceResult, masteryResult, feesResult, smartpadsResult] =
      await Promise.all([
        // Query 1 — Students
        this._queryStudents(schoolId, academicYearId, sevenDaysBefore, asOfDate, correlationId),
        // Query 2 — Attendance
        this._queryAttendance(schoolId, asOfDate, sevenDaysBefore, correlationId),
        // Query 3 — Mastery
        this._queryMastery(schoolId, correlationId),
        // Query 4 — Fees
        this._queryFees(schoolId, academicYearId, asOfDate, correlationId),
        // Query 5 — SmartPads
        this._querySmartpads(schoolId, correlationId),
      ])

    return {
      students: studentsResult,
      attendance: attendanceResult,
      mastery: masteryResult,
      fees: feesResult,
      smartpads: smartpadsResult,
      academic_year_id: academicYearId,
    }
  }

  private async _queryStudents(
    schoolId: string,
    academicYearId: string,
    sevenDaysBefore: string,
    _asOfDate: string,
    correlationId: string,
  ) {
    const [totalResult, atRiskResult, unintervenedResult] = await Promise.all([
      this.supabase
        .from('student_yearly_progress')
        .select('neura_id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('academic_year_id', academicYearId),

      this.supabase
        .from('calibrated_mastery_scores')
        .select('neura_id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('classification', 'AT_RISK')
        .gte('computed_date', sevenDaysBefore),

      // AT_RISK students with NO intervention in the last 7 days
      // We use a raw SQL approach via RPC or manual join. Since Supabase JS doesn't
      // support LEFT JOIN natively, we fetch AT_RISK neura_ids then subtract those
      // who have had an intervention in the window.
      this._countUnintervenedAtRisk(schoolId, sevenDaysBefore, correlationId),
    ])

    if (totalResult.error) throw new DatabaseError(totalResult.error.message, { schoolId, correlationId })
    if (atRiskResult.error) throw new DatabaseError(atRiskResult.error.message, { schoolId, correlationId })

    return {
      total: totalResult.count ?? 0,
      at_risk: atRiskResult.count ?? 0,
      unintervened_at_risk: unintervenedResult,
    }
  }

  private async _countUnintervenedAtRisk(
    schoolId: string,
    sevenDaysBefore: string,
    correlationId: string,
  ): Promise<number> {
    // Fetch distinct AT_RISK neura_ids
    const { data: atRiskRows, error: atRiskErr } = await this.supabase
      .from('calibrated_mastery_scores')
      .select('neura_id')
      .eq('school_id', schoolId)
      .eq('classification', 'AT_RISK')
      .gte('computed_date', sevenDaysBefore)

    if (atRiskErr) throw new DatabaseError(atRiskErr.message, { schoolId, correlationId })
    if (!atRiskRows || atRiskRows.length === 0) return 0

    const atRiskIds = [...new Set(atRiskRows.map((r) => r.neura_id))]

    // Fetch neura_ids that DO have an intervention in the window
    const { data: intervenedRows, error: intervenedErr } = await this.supabase
      .from('interventions')
      .select('neura_id')
      .eq('school_id', schoolId)
      .gte('logged_at', sevenDaysBefore)
      .in('neura_id', atRiskIds)

    if (intervenedErr) throw new DatabaseError(intervenedErr.message, { schoolId, correlationId })

    const intervenedIds = new Set((intervenedRows ?? []).map((r) => r.neura_id))
    return atRiskIds.filter((id) => !intervenedIds.has(id)).length
  }

  private async _queryAttendance(
    schoolId: string,
    asOfDate: string,
    sevenDaysBefore: string,
    correlationId: string,
  ) {
    const [presentTodayResult, expectedTodayResult, sevenDayResult] = await Promise.all([
      // Present today
      this.supabase
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('attendance_date', asOfDate)
        .in('status', ['PRESENT', 'LATE']),

      // Expected (total enrolled minus approved leave today)
      this.supabase
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('attendance_date', asOfDate)
        .in('status', ['PRESENT', 'LATE', 'ABSENT']),

      // 7-day window
      this.supabase
        .from('attendance')
        .select('status')
        .eq('school_id', schoolId)
        .gte('attendance_date', sevenDaysBefore)
        .lte('attendance_date', asOfDate)
        .in('status', ['PRESENT', 'LATE', 'ABSENT']),
    ])

    if (presentTodayResult.error) throw new DatabaseError(presentTodayResult.error.message, { schoolId, correlationId })
    if (expectedTodayResult.error) throw new DatabaseError(expectedTodayResult.error.message, { schoolId, correlationId })
    if (sevenDayResult.error) throw new DatabaseError(sevenDayResult.error.message, { schoolId, correlationId })

    const rows7d = sevenDayResult.data ?? []
    const presentOrLate = rows7d.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length
    const denominator = rows7d.length
    const rate7d = denominator > 0 ? presentOrLate / denominator : 0

    return {
      present_today: presentTodayResult.count ?? 0,
      expected_today: expectedTodayResult.count ?? 0,
      rate_7d: rate7d,
    }
  }

  private async _queryMastery(schoolId: string, correlationId: string) {
    // Get the most recent computed_date for this school
    const { data: latestDateRow, error: latestErr } = await this.supabase
      .from('calibrated_mastery_scores')
      .select('computed_date')
      .eq('school_id', schoolId)
      .order('computed_date', { ascending: false })
      .limit(1)
      .single()

    if (latestErr || !latestDateRow) {
      return { avg_score: null, sample_count: 0 }
    }

    const { data: rows, error } = await this.supabase
      .from('calibrated_mastery_scores')
      .select('neura_id, calibrated_percentile')
      .eq('school_id', schoolId)
      .eq('computed_date', latestDateRow.computed_date)

    if (error) throw new DatabaseError(error.message, { schoolId, correlationId })
    if (!rows || rows.length === 0) return { avg_score: null, sample_count: 0 }

    // Deduplicate to one row per student (take any — same computed_date)
    const seen = new Map<string, number>()
    for (const row of rows) {
      if (!seen.has(row.neura_id)) {
        seen.set(row.neura_id, row.calibrated_percentile ?? 0)
      }
    }

    const values = [...seen.values()]
    const avg = values.reduce((a, b) => a + b, 0) / values.length

    return { avg_score: avg, sample_count: values.length }
  }

  private async _queryFees(
    schoolId: string,
    academicYearId: string,
    asOfDate: string,
    correlationId: string,
  ) {
    const { data, error } = await this.supabase
      .from('fee_ledger')
      .select('status, amount_due, due_date')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)

    if (error) throw new DatabaseError(error.message, { schoolId, correlationId })

    const asOfMonth = asOfDate.slice(0, 7) // 'YYYY-MM'
    const monthRows = (data ?? []).filter((r) => r.due_date?.startsWith(asOfMonth))

    let paid = 0
    let totalDue = 0
    for (const row of monthRows) {
      const amt = row.amount_due ?? 0
      totalDue += amt
      if (row.status === 'PAID') paid += amt
    }

    return { paid_this_month: paid, due_this_month: totalDue }
  }

  private async _querySmartpads(schoolId: string, correlationId: string) {
    const { data, error } = await this.supabase
      .from('smartpad_devices')
      .select('last_sync_at')
      .eq('school_id', schoolId)
      .eq('status', 'ACTIVE')

    if (error) throw new DatabaseError(error.message, { schoolId, correlationId })

    const now = new Date()
    const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000)
    const cutoff9d = new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000)

    let synced48h = 0
    let offline9d = 0

    for (const row of data ?? []) {
      if (!row.last_sync_at) {
        offline9d++
        continue
      }
      const lastSync = new Date(row.last_sync_at)
      if (lastSync >= cutoff48h) synced48h++
      if (lastSync < cutoff9d) offline9d++
    }

    return { total: (data ?? []).length, synced_48h: synced48h, offline_9d: offline9d }
  }
}

export { todayIST, dateIST }
