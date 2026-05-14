import { randomUUID } from 'node:crypto'
import type {
  RawSchoolHealthData,
  SchoolHealthScore,
  SchoolHealthDrivers,
  PriorityAction,
  SchoolHealthKPIs,
  HealthBand,
} from '../types/common.js'
import { AnalyticsRepository, todayIST, dateIST } from '../repositories/analytics.repository.js'
import { ForbiddenError } from '../utils/errors.js'
import { UserRole } from '../types/common.js'

const BAND_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 65,
  NEEDS_ATTENTION: 45,
} as const

function scoreToBand(score: number): HealthBand {
  if (score >= BAND_THRESHOLDS.EXCELLENT) return 'EXCELLENT'
  if (score >= BAND_THRESHOLDS.GOOD) return 'GOOD'
  if (score >= BAND_THRESHOLDS.NEEDS_ATTENTION) return 'NEEDS_ATTENTION'
  return 'CRITICAL'
}

function pct(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

export class AnalyticsService {
  constructor(private readonly repo: AnalyticsRepository) {}

  computeHealthScore(data: RawSchoolHealthData): Omit<SchoolHealthScore, 'vs_last_week'> {
    // Component 1 — Attendance (20%)
    const attendanceScore = data.attendance.rate_7d > 0
      ? data.attendance.rate_7d * 100
      : 50

    // Component 2 — Mastery average (25%)
    const masteryScore = data.mastery.sample_count >= 10
      ? (data.mastery.avg_score ?? 50)
      : 50

    // Component 3 — AT_RISK penalty (25%)
    let atRiskPenaltyScore: number
    if (data.students.total === 0) {
      atRiskPenaltyScore = 50
    } else {
      const atRiskPct = (data.students.at_risk / data.students.total) * 100
      atRiskPenaltyScore = Math.max(0, 100 - atRiskPct * 3)
    }

    // Component 4 — Fee collection (15%)
    const feeScore = data.fees.due_this_month > 0
      ? Math.min(100, (data.fees.paid_this_month / data.fees.due_this_month) * 100)
      : 50

    // Component 5 — SmartPad sync health (15%)
    const smartpadScore = data.smartpads.total > 0
      ? (data.smartpads.synced_48h / data.smartpads.total) * 100
      : 50

    const overall =
      attendanceScore * 0.20 +
      masteryScore * 0.25 +
      atRiskPenaltyScore * 0.25 +
      feeScore * 0.15 +
      smartpadScore * 0.15

    const overall_score = Math.round(overall * 10) / 10

    const drivers = this._buildDrivers(data)
    const priority_actions = this._buildPriorityActions(data)
    const kpis = this._buildKPIs(data)

    return {
      overall_score,
      band: scoreToBand(overall_score),
      components: {
        attendance: Math.round(attendanceScore * 10) / 10,
        mastery: Math.round(masteryScore * 10) / 10,
        at_risk_penalty: Math.round(atRiskPenaltyScore * 10) / 10,
        fee_collection: Math.round(feeScore * 10) / 10,
        smartpad_sync: Math.round(smartpadScore * 10) / 10,
      },
      drivers,
      priority_actions,
      kpis,
      computed_at: new Date().toISOString(),
      academic_year_id: data.academic_year_id,
    }
  }

  private _buildDrivers(data: RawSchoolHealthData): SchoolHealthDrivers {
    const positive: string[] = []
    const warnings: string[] = []
    const critical: string[] = []

    const { rate_7d } = data.attendance
    const { avg_score, sample_count } = data.mastery
    const { synced_48h, total: totalPads, offline_9d } = data.smartpads
    const { at_risk, unintervened_at_risk, total: totalStudents } = data.students
    const feePct = data.fees.due_this_month > 0
      ? data.fees.paid_this_month / data.fees.due_this_month
      : 0

    // Positives
    if (rate_7d > 0.90) {
      positive.push(`Attendance excellent at ${Math.round(rate_7d * 100)}% this week`)
    }
    if (avg_score !== null && sample_count >= 10 && avg_score > 70) {
      positive.push(`Class mastery averaging ${Math.round(avg_score)}th percentile`)
    }
    if (totalPads > 0 && synced_48h === totalPads) {
      positive.push('All SmartPads synced in last 48 hours')
    }
    if (totalStudents > 0 && at_risk === 0) {
      positive.push('No AT_RISK students — all students on track')
    }
    if (feePct > 0.85) {
      positive.push(`Fee collection strong at ${Math.round(feePct * 100)}%`)
    }

    // Warnings
    if (rate_7d >= 0.65 && rate_7d < 0.80) {
      warnings.push(`Attendance at ${Math.round(rate_7d * 100)}% — below 80% target`)
    }
    if (at_risk > 0 && at_risk <= 3) {
      warnings.push(`${at_risk} students need learning support`)
    }
    if (totalPads > 0 && synced_48h < totalPads) {
      warnings.push(`${totalPads - synced_48h} SmartPads haven't synced in 48 hours`)
    }
    if (feePct > 0 && feePct < 0.70) {
      const overdueFamilies = Math.round((1 - feePct) * totalStudents)
      warnings.push(`Fee collection at ${Math.round(feePct * 100)}% — ${overdueFamilies} families overdue`)
    }

    // Critical
    if (rate_7d < 0.65) {
      critical.push(`Attendance critically low at ${Math.round(rate_7d * 100)}%`)
    }
    if (unintervened_at_risk > 0) {
      critical.push(`${unintervened_at_risk} AT_RISK students with no teacher intervention in 7 days`)
    }
    if (offline_9d > 0) {
      critical.push(`${offline_9d} SmartPads offline for 9+ days — data gap`)
    }
    if (at_risk > 5) {
      critical.push(`${at_risk} students classified AT_RISK`)
    }

    return { positive, warnings, critical }
  }

  private _buildPriorityActions(data: RawSchoolHealthData): PriorityAction[] {
    const actions: PriorityAction[] = []
    const feePct = data.fees.due_this_month > 0
      ? data.fees.paid_this_month / data.fees.due_this_month
      : 0

    if (data.students.unintervened_at_risk > 0) {
      actions.push({
        id: randomUUID(),
        severity: 'critical',
        title: `${data.students.unintervened_at_risk} students need immediate attention`,
        description: 'AT_RISK students without teacher intervention for 7+ days',
        action_label: 'View students',
        action_href: '/students?filter=at_risk&no_intervention=true',
      })
    }

    if (data.smartpads.offline_9d > 0) {
      actions.push({
        id: randomUUID(),
        severity: 'critical',
        title: `${data.smartpads.offline_9d} SmartPads offline`,
        description: 'Devices have not synced in 9+ days — data gap growing',
        action_label: 'View fleet',
        action_href: '/fleet?filter=offline',
      })
    }

    if (data.attendance.rate_7d < 0.75) {
      actions.push({
        id: randomUUID(),
        severity: 'warning',
        title: 'Attendance needs attention',
        description: `7-day attendance rate is ${Math.round(data.attendance.rate_7d * 100)}%`,
        action_label: 'View attendance',
        action_href: '/attendance',
      })
    }

    if (feePct < 0.60 && data.fees.due_this_month > 0) {
      const overdueFamilies = Math.round((1 - feePct) * data.students.total)
      actions.push({
        id: randomUUID(),
        severity: 'warning',
        title: 'Fee collection below target',
        description: `${overdueFamilies} families have overdue fees this month`,
        action_label: 'View fees',
        action_href: '/fees?filter=overdue',
      })
    }

    return actions
  }

  private _buildKPIs(data: RawSchoolHealthData): SchoolHealthKPIs {
    const feePct = data.fees.due_this_month > 0
      ? Math.round((data.fees.paid_this_month / data.fees.due_this_month) * 100)
      : 0

    return {
      total_students: data.students.total,
      present_today: data.attendance.present_today,
      present_today_pct: pct(data.attendance.present_today, data.attendance.expected_today),
      active_smartpads: data.smartpads.synced_48h,
      total_smartpads: data.smartpads.total,
      mastery_avg: Math.round(data.mastery.avg_score ?? 0),
      at_risk_count: data.students.at_risk,
      fee_collection_pct: feePct,
    }
  }

  async getHealthScore(
    schoolId: string,
    requestingSchoolId: string,
    requestingRole: UserRole,
    correlationId: string,
  ): Promise<SchoolHealthScore> {
    if (requestingRole !== UserRole.SUPER_ADMIN && schoolId !== requestingSchoolId) {
      throw new ForbiddenError("Access denied to this school's data", { schoolId, correlationId })
    }

    const academicYearId = await this.repo.getCurrentAcademicYear(schoolId, correlationId)

    const today = todayIST()
    const weekAgoDate = dateIST(7)

    const [todayData, weekAgoData] = await Promise.all([
      this.repo.getRawHealthData(schoolId, academicYearId, today, correlationId),
      this.repo.getRawHealthData(schoolId, academicYearId, weekAgoDate, correlationId),
    ])

    const todayScore = this.computeHealthScore(todayData)
    const weekAgoScore = this.computeHealthScore(weekAgoData)

    const vs_last_week =
      Math.round((todayScore.overall_score - weekAgoScore.overall_score) * 10) / 10

    return { ...todayScore, vs_last_week }
  }
}
