import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { FastifyBaseLogger } from 'fastify'
import { DatabaseError, NotFoundError, ValidationError } from '../utils/errors.js'
import type {
  AttendanceStatus,
  AttendanceRecord,
  ClassAttendanceResponse,
  MarkAttendanceInput,
  MonthlyStudentAttendance,
  AnalyticsRange,
  ClassAttendanceSummary,
  AttendanceTrendPoint,
  AttendanceStudentSummary,
  SchoolAttendanceAnalytics,
} from '../types/common.js'

function todayIST(): string {
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
  return ist.toISOString().split('T')[0]
}

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0) // day 0 of next month = last day of this month
  return d.toISOString().split('T')[0]
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  return day === 0 || day === 6 // Sun or Sat
}

function daysInMonth(year: number, month: number): string[] {
  const days: string[] = []
  const last = new Date(year, month, 0).getDate()
  for (let d = 1; d <= last; d++) {
    const mm = String(month).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    days.push(`${year}-${mm}-${dd}`)
  }
  return days
}

function getAnalyticsDateRange(range: AnalyticsRange, date: string): { start: string; end: string } {
  const d = new Date(date + 'T00:00:00Z')
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth() + 1

  switch (range) {
    case 'day':
      return { start: date, end: date }

    case 'week': {
      const day = d.getUTCDay() // 0=Sun
      const diffToMon = day === 0 ? -6 : 1 - day
      const mon = new Date(d)
      mon.setUTCDate(d.getUTCDate() + diffToMon)
      const sun = new Date(mon)
      sun.setUTCDate(mon.getUTCDate() + 6)
      return { start: mon.toISOString().split('T')[0], end: sun.toISOString().split('T')[0] }
    }

    case 'month':
      return { start: `${year}-${String(month).padStart(2, '0')}-01`, end: lastDayOfMonth(year, month) }

    case 'quarter': {
      const qStart = Math.floor((month - 1) / 3) * 3 + 1
      const qEnd = qStart + 2
      return {
        start: `${year}-${String(qStart).padStart(2, '0')}-01`,
        end: lastDayOfMonth(year, qEnd),
      }
    }
  }
}

export class AttendanceRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: FastifyBaseLogger,
  ) {}

  async getClassWithStudents(
    schoolId: string,
    academicYearId: string,
    classYear: number,
    section: string,
    date: string,
    correlationId: string,
  ): Promise<ClassAttendanceResponse> {
    this.logger.debug(
      { correlationId, schoolId, classYear, section, date },
      'AttendanceRepository.getClassWithStudents',
    )

    // Step 1 — enrolled neura_ids for this class/section
    const { data: sypData, error: sypErr } = await this.supabase
      .from('student_yearly_progress')
      .select('neura_id')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .eq('class_year', classYear)
      .eq('section', section)

    if (sypErr) throw new DatabaseError(sypErr.message, { correlationId })

    const enrolledIds = (sypData ?? []).map((r) => r.neura_id)

    if (enrolledIds.length === 0) {
      return {
        date,
        class_year: classYear,
        section,
        already_marked: false,
        records: [],
        enrolled_students: [],
        summary: { present: 0, absent: 0, late: 0, approved_leave: 0, total: 0 },
      }
    }

    // Steps 2 & 3 — active students + existing attendance in parallel
    const [studentsResult, attendanceResult] = await Promise.all([
      this.supabase
        .from('students')
        .select('neura_id, full_name')
        .in('neura_id', enrolledIds)
        .eq('status', 'ACTIVE')
        .is('deleted_at', null)
        .order('full_name'),

      this.supabase
        .from('attendance')
        .select(
          `id, neura_id, status, reason, period_number, marked_by, marked_at, device_id, signature_hash,
           teachers!attendance_marked_by_fkey(full_name),
           attendance_corrections(corrected_status, corrected_at, correction_time, reason,
             teachers!attendance_corrections_corrected_by_fkey(full_name))`,
        )
        .eq('school_id', schoolId)
        .eq('attendance_date', date)
        .in('neura_id', enrolledIds)
        .is('period_number', null),
    ])

    if (studentsResult.error) throw new DatabaseError(studentsResult.error.message, { correlationId })
    if (attendanceResult.error) throw new DatabaseError(attendanceResult.error.message, { correlationId })

    const students = studentsResult.data ?? []
    const activeIds = new Set(students.map((s) => s.neura_id))
    const rawRecords = (attendanceResult.data ?? []).filter((r) => activeIds.has(r.neura_id))

    const nameMap = new Map(students.map((s) => [s.neura_id, s.full_name]))

    const records: AttendanceRecord[] = rawRecords.map((r) => {
      const teacherArr = r.teachers as unknown as Array<{ full_name: string }> | null
      const markedByName = Array.isArray(teacherArr) && teacherArr.length > 0
        ? teacherArr[0].full_name
        : 'Unknown'

      const correctionArr = r.attendance_corrections as unknown as Array<{
        corrected_status: string
        corrected_at: string
        correction_time: string | null
        reason: string | null
        teachers?: Array<{ full_name: string }>
      }> | null

      const correction = Array.isArray(correctionArr) && correctionArr.length > 0
        ? correctionArr[correctionArr.length - 1]
        : null

      return {
        id: r.id,
        neura_id: r.neura_id,
        full_name: nameMap.get(r.neura_id) ?? '',
        status: r.status as AttendanceStatus,
        reason: r.reason,
        period_number: r.period_number,
        marked_by_name: markedByName,
        marked_at: r.marked_at,
        device_id: r.device_id,
        signature_hash: r.signature_hash ?? '',
        ...(correction
          ? {
              correction: {
                corrected_status: correction.corrected_status as AttendanceStatus,
                corrected_at: correction.corrected_at,
                corrected_by_name:
                  Array.isArray(correction.teachers) && correction.teachers.length > 0
                    ? correction.teachers[0].full_name
                    : 'Unknown',
                correction_time: correction.correction_time,
                reason: correction.reason,
              },
            }
          : {}),
      }
    })

    const already_marked = records.length > 0
    const summary = records.reduce(
      (acc, r) => {
        const status = r.correction?.corrected_status ?? r.status
        if (status === 'PRESENT') acc.present++
        else if (status === 'ABSENT') acc.absent++
        else if (status === 'LATE') acc.late++
        else if (status === 'APPROVED_LEAVE') acc.approved_leave++
        return acc
      },
      { present: 0, absent: 0, late: 0, approved_leave: 0, total: records.length },
    )

    return {
      date,
      class_year: classYear,
      section,
      already_marked,
      records,
      enrolled_students: students.map((s) => ({ neura_id: s.neura_id, full_name: s.full_name })),
      summary,
    }
  }

  async markAttendance(
    input: MarkAttendanceInput,
    teacherId: string,
    schoolId: string,
    academicYearId: string,
    correlationId: string,
  ): Promise<{ marked: number; signature_preview: string }> {
    this.logger.debug(
      { correlationId, teacherId, classYear: input.class_year, section: input.section, date: input.date },
      'AttendanceRepository.markAttendance',
    )

    // Check if already marked
    const neuraIds = input.records.map((r) => r.neura_id)
    const { count, error: countErr } = await this.supabase
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('attendance_date', input.date)
      .in('neura_id', neuraIds)
      .is('period_number', null)

    if (countErr) throw new DatabaseError(countErr.message, { correlationId })

    if ((count ?? 0) > 0) {
      throw new ValidationError(
        'Attendance already marked for this class on this date. Use corrections to update individual records.',
        { already_marked: true, date: input.date },
      )
    }

    // Generate digital signature
    const signature = createHash('sha256')
      .update(
        [teacherId, String(input.class_year), input.section, input.date, 'full_day', String(Date.now())].join('|'),
      )
      .digest('hex')

    // Batch insert
    const rows = input.records.map((r) => ({
      neura_id: r.neura_id,
      school_id: schoolId,
      academic_year_id: academicYearId,
      attendance_date: input.date,
      status: r.status as Database['public']['Enums']['attendance_status'],
      period_number: null,
      reason: r.reason ?? null,
      marked_by: teacherId,
      marked_at: new Date().toISOString(),
      device_id: null,
      signature_hash: signature,
    }))

    const { error } = await this.supabase.from('attendance').insert(rows)
    if (error) throw new DatabaseError(error.message, { correlationId })

    return { marked: input.records.length, signature_preview: signature.slice(-8) }
  }

  async createCorrection(
    originalAttendanceId: string,
    schoolId: string,
    correctedStatus: AttendanceStatus,
    correctionTime: string | null,
    correctedByTeacherId: string,
    reason: string | null,
    correlationId: string,
  ): Promise<void> {
    this.logger.debug(
      { correlationId, originalAttendanceId, schoolId },
      'AttendanceRepository.createCorrection',
    )

    const { data: original, error: fetchErr } = await this.supabase
      .from('attendance')
      .select('id, neura_id, attendance_date, status')
      .eq('id', originalAttendanceId)
      .eq('school_id', schoolId)
      .single()

    if (fetchErr || !original) {
      throw new NotFoundError('Attendance record not found', { originalAttendanceId })
    }

    const { error } = await this.supabase.from('attendance_corrections').insert({
      original_attendance_id: originalAttendanceId,
      neura_id: original.neura_id,
      school_id: schoolId,
      attendance_date: original.attendance_date,
      original_status: original.status,
      corrected_status: correctedStatus as Database['public']['Enums']['attendance_status'],
      corrected_at: new Date().toISOString(),
      correction_time: correctionTime,
      corrected_by: correctedByTeacherId,
      reason,
    })

    if (error) throw new DatabaseError(error.message, { correlationId })
  }

  async getStudentMonthlyAttendance(
    neuraId: string,
    schoolId: string,
    yearMonth: string,
    correlationId: string,
  ): Promise<MonthlyStudentAttendance> {
    this.logger.debug(
      { correlationId, neuraId, schoolId, yearMonth },
      'AttendanceRepository.getStudentMonthlyAttendance',
    )

    const [year, month] = yearMonth.split('-').map(Number)
    const firstDay = `${yearMonth}-01`
    const lastDay = lastDayOfMonth(year, month)

    const [attendanceResult, holidaysResult, studentResult] = await Promise.all([
      this.supabase
        .from('attendance')
        .select('attendance_date, status')
        .eq('neura_id', neuraId)
        .eq('school_id', schoolId)
        .gte('attendance_date', firstDay)
        .lte('attendance_date', lastDay)
        .is('period_number', null),

      this.supabase
        .from('school_holidays')
        .select('holiday_date')
        .eq('school_id', schoolId)
        .gte('holiday_date', firstDay)
        .lte('holiday_date', lastDay),

      this.supabase
        .from('students')
        .select('full_name')
        .eq('neura_id', neuraId)
        .single(),
    ])

    if (attendanceResult.error) throw new DatabaseError(attendanceResult.error.message, { correlationId })
    if (studentResult.error) throw new NotFoundError('Student not found', { neuraId })

    const attendanceMap = new Map(
      (attendanceResult.data ?? []).map((r) => [r.attendance_date, r.status as AttendanceStatus]),
    )
    const holidays = new Set((holidaysResult.data ?? []).map((h) => h.holiday_date))

    const allDays = daysInMonth(year, month)
    const monthly_records: Array<{ date: string; status: AttendanceStatus | null }> = []
    let school_days = 0
    let present = 0, absent = 0, late = 0, approved_leave = 0

    for (const day of allDays) {
      if (isWeekend(day)) continue
      if (holidays.has(day)) {
        monthly_records.push({ date: day, status: null })
        continue
      }

      school_days++
      const status = attendanceMap.get(day) ?? null
      monthly_records.push({ date: day, status })

      if (status === 'PRESENT') present++
      else if (status === 'ABSENT') absent++
      else if (status === 'LATE') { late++; present++ } // late counts as present for rate
      else if (status === 'APPROVED_LEAVE') approved_leave++
    }

    // Recalculate: late was double-counted for present, fix that
    // present variable = PRESENT + LATE (for rate numerator)
    const rate_numerator = (attendanceResult.data ?? []).filter(
      (r) => r.status === 'PRESENT' || r.status === 'LATE',
    ).length

    return {
      neura_id: neuraId,
      full_name: studentResult.data.full_name,
      monthly_records,
      summary: {
        present: (attendanceResult.data ?? []).filter((r) => r.status === 'PRESENT').length,
        absent,
        late: (attendanceResult.data ?? []).filter((r) => r.status === 'LATE').length,
        approved_leave,
        attendance_rate: school_days > 0 ? Math.round((rate_numerator / school_days) * 100) : 0,
        school_days,
      },
    }
  }

  async getSchoolAttendanceAnalytics(
    schoolId: string,
    academicYearId: string,
    range: AnalyticsRange,
    date: string,
    correlationId: string,
  ): Promise<SchoolAttendanceAnalytics> {
    this.logger.debug(
      { correlationId, schoolId, range, date },
      'AttendanceRepository.getSchoolAttendanceAnalytics',
    )

    const { start, end } = getAnalyticsDateRange(range, date)
    const today = todayIST()
    const clampedEnd = end > today ? today : end

    // Enrolled active students with class info
    const [enrolledResult, attendanceResult] = await Promise.all([
      this.supabase
        .from('student_yearly_progress')
        .select('neura_id, class_year, section')
        .eq('school_id', schoolId)
        .eq('academic_year_id', academicYearId),

      this.supabase
        .from('attendance')
        .select(`
          neura_id, status, reason, attendance_date, marked_at,
          teachers!attendance_marked_by_fkey(full_name),
          attendance_corrections(corrected_status, corrected_at)
        `)
        .eq('school_id', schoolId)
        .gte('attendance_date', start)
        .lte('attendance_date', clampedEnd)
        .is('period_number', null),
    ])

    if (enrolledResult.error) throw new DatabaseError(enrolledResult.error.message, { correlationId })
    if (attendanceResult.error) throw new DatabaseError(attendanceResult.error.message, { correlationId })

    const enrolledRows = enrolledResult.data ?? []
    const enrolledNeuraIds = enrolledRows.map((r) => r.neura_id)

    // Active student names
    const { data: activeStudents, error: studErr } = await this.supabase
      .from('students')
      .select('neura_id, full_name')
      .in('neura_id', enrolledNeuraIds.length > 0 ? enrolledNeuraIds : ['__none__'])
      .eq('status', 'ACTIVE')
      .is('deleted_at', null)

    if (studErr) throw new DatabaseError(studErr.message, { correlationId })

    const studentNameMap = new Map((activeStudents ?? []).map((s) => [s.neura_id, s.full_name]))
    const studentClassMap = new Map(
      enrolledRows
        .filter((e) => studentNameMap.has(e.neura_id))
        .map((e) => [e.neura_id, { class_year: e.class_year, section: e.section }]),
    )

    // Enrolled count per class (active only)
    const enrolledByClass = new Map<string, { class_year: number; section: string; count: number }>()
    for (const [neuraId, cls] of studentClassMap) {
      const key = `${cls.class_year}-${cls.section}`
      if (!enrolledByClass.has(key)) {
        enrolledByClass.set(key, { class_year: cls.class_year, section: cls.section, count: 0 })
      }
      enrolledByClass.get(key)!.count++
    }

    // Helper: apply correction to get effective status
    const effectiveStatus = (r: {
      status: string
      attendance_corrections: unknown
    }): AttendanceStatus => {
      const corrections = r.attendance_corrections as Array<{ corrected_status: string; corrected_at: string }> | null
      if (Array.isArray(corrections) && corrections.length > 0) {
        const latest = corrections.reduce((a, b) => (a.corrected_at > b.corrected_at ? a : b))
        return latest.corrected_status as AttendanceStatus
      }
      return r.status as AttendanceStatus
    }

    const attRecords = attendanceResult.data ?? []

    // ─── Day range: full breakdown + student lists ─────────────────────────
    if (range === 'day') {
      type ClassStat = {
        class_year: number; section: string
        present: number; absent: number; late: number; approved_leave: number
        marked_by_name: string | null; marked_at: string | null
      }
      const classStatMap = new Map<string, ClassStat>()

      // Initialise all enrolled classes
      for (const [key, val] of enrolledByClass) {
        classStatMap.set(key, { class_year: val.class_year, section: val.section, present: 0, absent: 0, late: 0, approved_leave: 0, marked_by_name: null, marked_at: null })
      }

      const absentStudents: AttendanceStudentSummary[] = []
      const presentStudents: AttendanceStudentSummary[] = []

      for (const r of attRecords) {
        const cls = studentClassMap.get(r.neura_id)
        if (!cls) continue
        const key = `${cls.class_year}-${cls.section}`

        if (!classStatMap.has(key)) {
          classStatMap.set(key, { class_year: cls.class_year, section: cls.section, present: 0, absent: 0, late: 0, approved_leave: 0, marked_by_name: null, marked_at: null })
        }

        const stat = classStatMap.get(key)!
        const status = effectiveStatus(r)

        if (status === 'PRESENT') stat.present++
        else if (status === 'ABSENT') stat.absent++
        else if (status === 'LATE') { stat.late++; stat.present++ }
        else if (status === 'APPROVED_LEAVE') stat.approved_leave++

        if (!stat.marked_by_name) {
          const teacherArr = r.teachers as unknown as Array<{ full_name: string }> | null
          stat.marked_by_name = Array.isArray(teacherArr) && teacherArr.length > 0 ? teacherArr[0].full_name : null
          stat.marked_at = r.marked_at
        }

        const fullName = studentNameMap.get(r.neura_id) ?? ''
        if (status === 'ABSENT') {
          absentStudents.push({ neura_id: r.neura_id, full_name: fullName, class_year: cls.class_year, section: cls.section, reason: r.reason ?? null })
        } else if (status === 'PRESENT' || status === 'LATE') {
          presentStudents.push({ neura_id: r.neura_id, full_name: fullName, class_year: cls.class_year, section: cls.section })
        }
      }

      const classes: ClassAttendanceSummary[] = [...classStatMap.values()]
        .map((stat) => {
          const total = enrolledByClass.get(`${stat.class_year}-${stat.section}`)?.count ?? (stat.present + stat.absent + stat.late + stat.approved_leave)
          return {
            class_year: stat.class_year,
            section: stat.section,
            total,
            present: stat.present,
            absent: stat.absent,
            late: stat.late,
            approved_leave: stat.approved_leave,
            present_pct: total > 0 ? Math.round((stat.present / total) * 100) : 0,
            marked_by_name: stat.marked_by_name,
            marked_at: stat.marked_at,
          }
        })
        .sort((a, b) => a.class_year - b.class_year || a.section.localeCompare(b.section))

      const totalPresent = classes.reduce((s, c) => s + c.present, 0)
      const totalAbsent = classes.reduce((s, c) => s + c.absent, 0)
      const totalLate = classes.reduce((s, c) => s + c.late, 0)
      const totalApprovedLeave = classes.reduce((s, c) => s + c.approved_leave, 0)
      const totalStudents = [...enrolledByClass.values()].reduce((s, c) => s + c.count, 0)
      const classesMarked = classes.filter((c) => c.marked_by_name !== null).length

      const byClass = (a: AttendanceStudentSummary, b: AttendanceStudentSummary) =>
        a.class_year - b.class_year || a.section.localeCompare(b.section) || a.full_name.localeCompare(b.full_name)

      return {
        range: 'day',
        date,
        overall: {
          total_students: totalStudents,
          present: totalPresent,
          absent: totalAbsent,
          late: totalLate,
          approved_leave: totalApprovedLeave,
          present_pct: totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0,
          classes_marked: classesMarked,
          total_classes: classes.length,
        },
        trend: [],
        classes,
        absent_students: absentStudents.sort(byClass),
        present_students: presentStudents.sort(byClass),
      }
    }

    // ─── Multi-day ranges: trend + aggregate class stats ────────────────────
    // Trend: daily school-wide totals
    const trendMap = new Map<string, { present: number; absent: number; late: number; total: number }>()
    // Class aggregate: sum over range
    const classAggMap = new Map<string, { class_year: number; section: string; present: number; absent: number; late: number; approved_leave: number; total: number }>()

    for (const [key, val] of enrolledByClass) {
      classAggMap.set(key, { class_year: val.class_year, section: val.section, present: 0, absent: 0, late: 0, approved_leave: 0, total: 0 })
    }

    for (const r of attRecords) {
      const cls = studentClassMap.get(r.neura_id)
      if (!cls) continue
      const status = effectiveStatus(r)
      const d = r.attendance_date

      if (!trendMap.has(d)) trendMap.set(d, { present: 0, absent: 0, late: 0, total: 0 })
      const td = trendMap.get(d)!
      td.total++
      if (status === 'PRESENT') td.present++
      else if (status === 'ABSENT') td.absent++
      else if (status === 'LATE') { td.late++; td.present++ }

      const key = `${cls.class_year}-${cls.section}`
      if (!classAggMap.has(key)) {
        classAggMap.set(key, { class_year: cls.class_year, section: cls.section, present: 0, absent: 0, late: 0, approved_leave: 0, total: 0 })
      }
      const ca = classAggMap.get(key)!
      ca.total++
      if (status === 'PRESENT') ca.present++
      else if (status === 'ABSENT') ca.absent++
      else if (status === 'LATE') { ca.late++; ca.present++ }
      else if (status === 'APPROVED_LEAVE') ca.approved_leave++
    }

    // Build trend sorted by date, skip weekends
    const trend: AttendanceTrendPoint[] = [...trendMap.entries()]
      .filter(([d]) => !isWeekend(d))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([d, t]) => ({
        date: d,
        total: t.total,
        present: t.present,
        absent: t.absent,
        late: t.late,
        present_pct: t.total > 0 ? Math.round((t.present / t.total) * 100) : 0,
      }))

    const classes: ClassAttendanceSummary[] = [...classAggMap.values()]
      .map((ca) => ({
        class_year: ca.class_year,
        section: ca.section,
        total: ca.total,
        present: ca.present,
        absent: ca.absent,
        late: ca.late,
        approved_leave: ca.approved_leave,
        present_pct: ca.total > 0 ? Math.round((ca.present / ca.total) * 100) : 0,
        marked_by_name: null,
        marked_at: null,
      }))
      .sort((a, b) => a.class_year - b.class_year || a.section.localeCompare(b.section))

    const totalPresent = trend.reduce((s, t) => s + t.present, 0)
    const totalAbsent = trend.reduce((s, t) => s + t.absent, 0)
    const totalLate = trend.reduce((s, t) => s + t.late, 0)
    const totalInRange = trend.reduce((s, t) => s + t.total, 0)
    const totalStudents = [...enrolledByClass.values()].reduce((s, c) => s + c.count, 0)
    const classesMarked = classes.filter((c) => c.total > 0).length

    return {
      range,
      date,
      overall: {
        total_students: totalStudents,
        present: totalPresent,
        absent: totalAbsent,
        late: totalLate,
        approved_leave: classes.reduce((s, c) => s + c.approved_leave, 0),
        present_pct: totalInRange > 0 ? Math.round((totalPresent / totalInRange) * 100) : 0,
        classes_marked: classesMarked,
        total_classes: classes.length,
      },
      trend,
      classes,
    }
  }

  async getMonthlyClassStats(
    schoolId: string,
    yearMonth: string,
    correlationId: string,
  ): Promise<Array<{ date: string; present_pct: number }>> {
    this.logger.debug(
      { correlationId, schoolId, yearMonth },
      'AttendanceRepository.getMonthlyClassStats',
    )

    const [year, month] = yearMonth.split('-').map(Number)
    const firstDay = `${yearMonth}-01`
    const lastDay = lastDayOfMonth(year, month)
    const today = todayIST()

    const { data, error } = await this.supabase
      .from('attendance')
      .select('attendance_date, status')
      .eq('school_id', schoolId)
      .gte('attendance_date', firstDay)
      .lte('attendance_date', lastDay)
      .is('period_number', null)

    if (error) throw new DatabaseError(error.message, { correlationId })

    const byDate = new Map<string, { present: number; total: number }>()
    for (const r of data ?? []) {
      const d = r.attendance_date
      if (!byDate.has(d)) byDate.set(d, { present: 0, total: 0 })
      const entry = byDate.get(d)!
      entry.total++
      if (r.status === 'PRESENT' || r.status === 'LATE') entry.present++
    }

    const allDays = daysInMonth(year, month).filter((d) => !isWeekend(d) && d <= today)
    return allDays.map((date) => {
      const entry = byDate.get(date)
      return {
        date,
        present_pct: entry && entry.total > 0 ? Math.round((entry.present / entry.total) * 100) : 0,
      }
    })
  }
}
