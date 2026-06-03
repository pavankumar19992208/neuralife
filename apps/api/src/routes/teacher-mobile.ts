import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { supabaseAdmin } from '../lib/supabase.js'
import { UserRole } from '../types/common.js'
import { ForbiddenError, DatabaseError } from '../utils/errors.js'
import { TeacherMobileRepository } from '../repositories/teacher-mobile.repository.js'
import { sendFcm } from '../lib/fcm.js'

// ─── IST helpers ──────────────────────────────────────────────────────────────

const DAY_MAP: Record<number, string> = {
  0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT',
}

function todayIST(): { date: string; dayOfWeek: string; isSunday: boolean } {
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
  const date = ist.toISOString().split('T')[0]
  const dayOfWeek = DAY_MAP[ist.getUTCDay()] ?? 'MON'
  return { date, dayOfWeek, isSunday: ist.getUTCDay() === 0 }
}

function formatDateDisplay(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00+05:30')
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December']
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

// ─── Response types ────────────────────────────────────────────────────────────

interface PeriodCard {
  id: string
  periodNumber: number
  subject: string
  classYear: number
  section: string
  roomNumber: string | null
  startTime: string
  endTime: string
  studentCount: number
  periodType: 'REGULAR' | 'LUNCH' | 'BREAK' | 'ASSEMBLY' | 'LIBRARY' | 'FREE'
  attendanceMarked: boolean
  coverageMarked: boolean     // v1: always false (lesson coverage not built yet)
  isSubstitute: boolean
  substituteForName: string | null
}

interface KpiData {
  periodsToday: number
  homeworkDueToday: number
  homeworkCompletionPct: number | null  // null until submission tracking is built
  doubtsPending: number                 // 0 until doubts table is built
  atRiskCount: number | null            // null until SmartPad AI pipeline is live
  // Class teacher only:
  presentToday?: number
  absentToday?: number
  leaveRequestsPending?: number
  classAlerts?: number
}

interface AlertItem {
  id: string
  type: string
  message: string
  studentName?: string
  studentId?: string
  severity: 'HIGH' | 'MEDIUM'
  actionLabel: string
  createdAt: string
}

interface HomeData {
  teacherName: string
  firstName: string
  schoolName: string
  schoolLogoUrl: string | null
  schoolAccentColor: string
  roles: string[]
  classSection: string | null
  todayDate: string
  isWorkingDay: boolean
  periods: PeriodCard[]
  kpis: KpiData
  alerts: AlertItem[]
}

// ─── Route plugin ──────────────────────────────────────────────────────────────

export const teacherMobileRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes require authentication
  fastify.addHook('preHandler', fastify.authenticate)

  /**
   * GET /api/v1/teacher/home
   * The Teaching Command Center data endpoint.
   * Returns today's timetable, KPIs, and alerts for the authenticated teacher.
   */
  fastify.get('/home', async (request, reply) => {
    const correlationId = request.correlationId
    const { school_id, teacher_id, role } = request.jwtPayload

    // Allow TEACHER, PRINCIPAL, and SCHOOL_ADMIN (role guard)
    const allowed: string[] = [UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]
    if (!allowed.includes(role)) {
      throw new ForbiddenError('Teacher app access required')
    }

    const resolvedTeacherId = teacher_id ?? request.jwtPayload.sub
    const repo = new TeacherMobileRepository(supabaseAdmin, fastify.log)

    // Dev-only: allow ?debug_date=YYYY-MM-DD to override the IST date for testing.
    // Silently ignored in production (NODE_ENV !== 'development').
    const debugDateParam = (request.query as Record<string, string>)?.debug_date
    const isDebugAllowed = process.env.NODE_ENV === 'development'
    const overrideDate = isDebugAllowed && debugDateParam && /^\d{4}-\d{2}-\d{2}$/.test(debugDateParam)
      ? debugDateParam
      : null

    let todayResult = todayIST()
    if (overrideDate) {
      const d = new Date(overrideDate + 'T00:00:00+05:30')
      const dayIdx = d.getDay()
      todayResult = {
        date: overrideDate,
        dayOfWeek: DAY_MAP[dayIdx] ?? 'MON',
        isSunday: dayIdx === 0,
      }
    }
    const { date: todayDate, dayOfWeek, isSunday } = todayResult

    // ── Parallel: teacher info + academic year + exceptions ──────────────────
    const [teacherInfo, academicYearId] = await Promise.all([
      repo.getTeacherWithSchool(resolvedTeacherId, school_id, correlationId),
      repo.getCurrentAcademicYearId(school_id, correlationId),
    ])

    // Sunday or non-working day: return early with empty periods
    if (isSunday) {
      fastify.log.info({ correlationId, teacherId: resolvedTeacherId }, 'teacher home: Sunday')
      const responseData: HomeData = {
        teacherName: teacherInfo.fullName,
        firstName: teacherInfo.firstName,
        schoolName: teacherInfo.schoolName,
        schoolLogoUrl: teacherInfo.logoUrl,
        schoolAccentColor: teacherInfo.brandColor,
        roles: [role],
        classSection: null,
        todayDate: formatDateDisplay(todayDate),
        isWorkingDay: false,
        periods: [],
        kpis: { periodsToday: 0, homeworkDueToday: 0, homeworkCompletionPct: null, doubtsPending: 0, atRiskCount: null },
        alerts: [],
      }
      return reply.send({ data: responseData })
    }

    // ── Fetch timetable ───────────────────────────────────────────────────────
    const [rawSlots, classSection, exceptions, homeworkDueToday] = await Promise.all([
      repo.getTodayTimetable(resolvedTeacherId, school_id, dayOfWeek, correlationId),
      academicYearId
        ? repo.getClassTeacherSection(resolvedTeacherId, school_id, academicYearId, correlationId)
        : Promise.resolve(null),
      repo.getTimetableExceptions(school_id, resolvedTeacherId, todayDate, correlationId),
      repo.getHomeworkDueToday(resolvedTeacherId, school_id, todayDate, correlationId),
    ])

    if (rawSlots.length === 0) {
      fastify.log.warn(
        { correlationId, teacherId: resolvedTeacherId, dayOfWeek },
        'teacher home: no timetable slots found — has timetable been built for this teacher?',
      )
    }

    // ── Build exception lookup maps ───────────────────────────────────────────
    const cancelledSet = new Set<string>()   // key = `${class_year}-${section}-${period}`
    const substituteMap = new Map<string, string>()  // key → original_teacher_id

    for (const ex of exceptions) {
      const key = `${ex.class_year}-${ex.section}-${ex.period_number}`
      if (ex.exception_type === 'CANCELLED' && ex.original_teacher_id === resolvedTeacherId) {
        cancelledSet.add(key)
      }
      if (ex.exception_type === 'SUBSTITUTE' && ex.substitute_teacher_id === resolvedTeacherId) {
        substituteMap.set(key, ex.original_teacher_id ?? '')
      }
    }

    // ── For each unique REGULAR class section, check attendance & student count ─
    const uniqueClasses = new Set<string>()
    for (const slot of rawSlots) {
      if (slot.period_type === 'REGULAR') {
        uniqueClasses.add(`${slot.class_year}-${slot.section}`)
      }
    }

    const attendanceMarkedMap = new Map<string, boolean>()
    const studentCountMap = new Map<string, number>()

    const classChecks = Array.from(uniqueClasses).map(async (key) => {
      const [classYear, section] = key.split('-')
      const [isMarked, count] = await Promise.all([
        repo.isAttendanceMarked(school_id, academicYearId, parseInt(classYear), section, todayDate, correlationId),
        academicYearId
          ? repo.getStudentCountForClass(school_id, academicYearId, parseInt(classYear), section, correlationId)
          : Promise.resolve(0),
      ])
      attendanceMarkedMap.set(key, isMarked)
      studentCountMap.set(key, count)
    })
    await Promise.all(classChecks)

    // ── Also include BREAK/LUNCH/ASSEMBLY slots for the first class section ──
    // (so the timeline shows the full day rhythm, not just teaching periods)
    let nonTeachingSlots: typeof rawSlots = []
    const firstRegularSlot = rawSlots.find(s => s.period_type === 'REGULAR')
    if (firstRegularSlot && academicYearId) {
      nonTeachingSlots = await repo.getClassNonTeachingSlots(
        school_id, firstRegularSlot.class_year, firstRegularSlot.section,
        dayOfWeek, correlationId,
      )
    }

    // ── Build PeriodCards ─────────────────────────────────────────────────────
    const allSlots = [...rawSlots, ...nonTeachingSlots]
    // De-duplicate (a non-teaching slot may already appear if teacher has FREE period)
    const seenIds = new Set<string>()
    const dedupedSlots = allSlots.filter(s => {
      if (seenIds.has(s.id)) return false
      seenIds.add(s.id)
      return true
    })
    // Sort by period_number ascending (negatives like -2, -104 sort before positives)
    dedupedSlots.sort((a, b) => a.period_number - b.period_number)

    const periods: PeriodCard[] = dedupedSlots
      .filter(slot => {
        // Remove cancelled slots for this teacher
        const key = `${slot.class_year}-${slot.section}-${slot.period_number}`
        return !cancelledSet.has(key)
      })
      .map(slot => {
        const classKey = `${slot.class_year}-${slot.section}`
        const periodKey = `${slot.class_year}-${slot.section}-${slot.period_number}`
        const isSubstitute = substituteMap.has(periodKey)

        const periodType = (slot.period_type?.toUpperCase() ?? 'REGULAR') as PeriodCard['periodType']
        const isTeachingPeriod = periodType === 'REGULAR'

        return {
          id: slot.id,
          periodNumber: slot.period_number,
          subject: slot.subject ?? 'FREE',
          classYear: slot.class_year,
          section: slot.section,
          roomNumber: slot.room_number ?? null,
          startTime: slot.start_time,
          endTime: slot.end_time,
          studentCount: isTeachingPeriod ? (studentCountMap.get(classKey) ?? 0) : 0,
          periodType,
          attendanceMarked: isTeachingPeriod ? (attendanceMarkedMap.get(classKey) ?? false) : false,
          coverageMarked: false, // TODO: enable once lesson_coverage table is built
          isSubstitute,
          substituteForName: null, // TODO: look up original teacher name if isSubstitute
        }
      })

    // ── KPIs ──────────────────────────────────────────────────────────────────
    const periodsToday = periods.filter(p => p.periodType === 'REGULAR').length
    const kpis: KpiData = {
      periodsToday,
      homeworkDueToday,
      homeworkCompletionPct: null, // TODO: enable once homework_submissions tracking is active
      doubtsPending: 0,            // TODO: enable once doubts table is built
      atRiskCount: null,           // AT_RISK alerts require SmartPad HWR-1/GAP-1 pipeline
    }

    // Class teacher extras
    if (classSection && academicYearId) {
      const [attendance, overdueHw] = await Promise.all([
        repo.getClassAttendanceCounts(school_id, academicYearId, classSection.classYear, classSection.section, todayDate, correlationId),
        repo.getOverdueHomework(resolvedTeacherId, school_id, todayDate, correlationId),
      ])
      kpis.presentToday = attendance.present
      kpis.absentToday = attendance.absent
      kpis.leaveRequestsPending = 0 // TODO: enable once parent leave request feature is built
      kpis.classAlerts = attendance.absent > 3 ? 1 : 0
    }

    // ── Alerts ────────────────────────────────────────────────────────────────
    // AT_RISK + MASTERY_DROP alerts: enable once HWR-1/GAP-1 deployed on SmartPad
    const alerts: AlertItem[] = []
    const now = new Date().toISOString()

    // Alert 1 — ABSENCE_STREAK (class teacher only)
    if (classSection) {
      const streakers = await repo.getAbsenceStreakStudents(
        school_id, academicYearId, classSection.classYear, classSection.section, correlationId,
      )
      for (const s of streakers) {
        alerts.push({
          id: `absence-${s.neuraId}`,
          type: 'ABSENCE_STREAK',
          message: `Absent ${s.consecutiveDays} consecutive days`,
          studentName: s.fullName,
          studentId: s.neuraId,
          severity: 'HIGH',
          actionLabel: 'Message parent',
          createdAt: now,
        })
      }
    }

    // Alert 2 — HOMEWORK_NOT_SUBMITTED (overdue homework)
    const overdueHomework = await repo.getOverdueHomework(resolvedTeacherId, school_id, todayDate, correlationId)
    for (const hw of overdueHomework) {
      alerts.push({
        id: `hw-overdue-${hw.id}`,
        type: 'HOMEWORK_NOT_SUBMITTED',
        message: `"${hw.title}" — Class ${hw.class_year}-${hw.section} past due`,
        severity: 'MEDIUM',
        actionLabel: 'View homework',
        createdAt: now,
      })
    }

    // Alert 3 — DOUBT_OVERFLOW: skip (doubts table not built yet)

    // ── Final clasSection string ──────────────────────────────────────────────
    const classSectionStr = classSection
      ? `${classSection.classYear}-${classSection.section}`
      : null

    const responseData: HomeData = {
      teacherName: teacherInfo.fullName,
      firstName: teacherInfo.firstName,
      schoolName: teacherInfo.schoolName,
      schoolLogoUrl: teacherInfo.logoUrl,
      schoolAccentColor: teacherInfo.brandColor,
      roles: [role, ...(classSectionStr ? ['CLASS_TEACHER'] : [])],
      classSection: classSectionStr,
      todayDate: formatDateDisplay(todayDate),
      isWorkingDay: true,
      periods,
      kpis,
      alerts,
    }

    fastify.log.info(
      { correlationId, teacherId: resolvedTeacherId, periodCount: periods.length, alertCount: alerts.length },
      'teacher home fetched',
    )

    return reply.send({ data: responseData })
  })

  /**
   * GET /api/v1/teacher/timetable/week
   * Returns the full Mon-Sat week timetable for the authenticated teacher.
   * Used by the WeekGrid component on the mobile Home screen.
   */
  fastify.get('/timetable/week', async (request, reply) => {
    const correlationId = request.correlationId
    const { school_id, teacher_id, role } = request.jwtPayload

    // Allow TEACHER, PRINCIPAL, and SCHOOL_ADMIN (role guard)
    const allowed: string[] = [UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]
    if (!allowed.includes(role)) {
      throw new ForbiddenError('Teacher app access required')
    }

    const resolvedTeacherId = teacher_id ?? request.jwtPayload.sub
    const repo = new TeacherMobileRepository(supabaseAdmin, fastify.log)

    // Get current week Monday date in IST
    const istNow = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000)
    const currentDay = istNow.getUTCDay() // 0=Sunday, 1=Monday, etc.
    const daysFromMonday = currentDay === 0 ? -6 : 1 - currentDay // Sunday becomes -6, Tuesday becomes -1, etc.
    const mondayIST = new Date(istNow)
    mondayIST.setUTCDate(istNow.getUTCDate() + daysFromMonday)
    mondayIST.setUTCHours(0, 0, 0, 0)

    // Get academic year
    const academicYearId = await repo.getCurrentAcademicYearId(school_id, correlationId)

    // Get week timetable for all days (Mon-Sat)
    const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    const daysData = await Promise.all(
      weekDays.map(async (dayOfWeek, index) => {
        const date = new Date(mondayIST)
        date.setUTCDate(mondayIST.getUTCDate() + index)
        const dateStr = date.toISOString().split('T')[0]

        // Get timetable slots for this day
        const slots = await repo.getTodayTimetable(resolvedTeacherId, school_id, dayOfWeek, correlationId)

        // Get attendance status for regular periods on this day
        const attendanceChecks = await Promise.all(
          slots
            .filter(s => s.period_type === 'REGULAR')
            .map(async slot => {
              const isMarked = academicYearId
                ? await repo.isAttendanceMarked(school_id, academicYearId, slot.class_year, slot.section, dateStr, correlationId)
                : false
              return { slotId: slot.id, attendanceMarked: isMarked }
            })
        )
        const attendanceMap = new Map(attendanceChecks.map(a => [a.slotId, a.attendanceMarked]))

        // Check if this is today
        const todayIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000)
        const todayStr = todayIST.toISOString().split('T')[0]
        const isToday = dateStr === todayStr

        // Map slots to the response format
        const mappedSlots = slots.map(slot => {
          const isPeriod = slot.period_type === 'REGULAR'
          const attendanceMarked = isPeriod ? (attendanceMap.get(slot.id) ?? false) : false

          // Determine status
          let status: string = 'NOT_TODAY'
          if (isToday) {
            const currentTimeIST = todayIST.toTimeString().slice(0, 5) // "HH:MM"
            const slotStart = slot.start_time
            const slotEnd = slot.end_time

            if (currentTimeIST < slotStart) {
              status = 'UPCOMING'
            } else if (currentTimeIST >= slotStart && currentTimeIST < slotEnd) {
              status = 'NOW'
            } else {
              status = 'PAST'
            }
          } else if (dateStr < todayStr) {
            status = 'PAST'
          } else {
            status = 'NOT_TODAY'
          }

          return {
            id: slot.id,
            periodNumber: slot.period_type === 'BREAK' ? null : slot.period_number,
            slotType: slot.period_type?.toUpperCase() || 'REGULAR',
            startTime: slot.start_time,
            endTime: slot.end_time,
            subject: slot.subject || null,
            classYear: slot.class_year || null,
            section: slot.section || null,
            roomNumber: slot.room_number || null,
            studentCount: isPeriod ? 0 : null, // TODO: Get actual student count
            attendanceMarked,
            coverageMarked: false, // TODO: Check syllabus_coverage when implemented
            status
          }
        })

        // Sort by period_number
        mappedSlots.sort((a, b) => (a.periodNumber || -999) - (b.periodNumber || -999))

        return {
          dayOfWeek,
          dayLabel: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index],
          shortLabel: dayOfWeek,
          date: dateStr,
          isToday,
          slots: mappedSlots
        }
      })
    )

    fastify.log.info(
      { correlationId, teacherId: resolvedTeacherId, weekStart: mondayIST.toISOString().split('T')[0] },
      'teacher week timetable fetched'
    )

    return reply.send({ data: { days: daysData } })
  })

  /**
   * GET /api/v1/teacher/classes
   * Returns all classes assigned to this teacher for the current academic year.
   * Used by the My Classes screen to show class list with statistics.
   */
  fastify.get('/classes', async (request, reply) => {
    const correlationId = request.correlationId
    const { school_id, teacher_id, role } = request.jwtPayload

    const allowed: string[] = [UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]
    if (!allowed.includes(role)) {
      throw new ForbiddenError('Teacher app access required')
    }

    const resolvedTeacherId = teacher_id ?? request.jwtPayload.sub
    const repo = new TeacherMobileRepository(supabaseAdmin, fastify.log)

    // Get current academic year and today's date
    const academicYearId = await repo.getCurrentAcademicYearId(school_id, correlationId)
    const { date: todayDate } = todayIST()

    // Get all classes this teacher is assigned to
    const { data: assignments } = await supabaseAdmin
      .from('timetable_slots')
      .select('class_year, section, subject')
      .eq('school_id', school_id)
      .eq('teacher_id', resolvedTeacherId)
      .eq('period_type', 'REGULAR')

    // Group by unique class+section+subject combinations
    const uniqueClasses = new Map<string, {classYear: number; section: string; subject: string}>()
    for (const assignment of assignments || []) {
      const key = `${assignment.class_year}-${assignment.section}-${assignment.subject}`
      uniqueClasses.set(key, {
        classYear: assignment.class_year,
        section: assignment.section,
        subject: assignment.subject,
      })
    }

    // Get statistics for each class
    const classResults = await Promise.all(
      Array.from(uniqueClasses.values()).map(async classInfo => {
        const { classYear, section, subject } = classInfo

        // Get student count
        const studentCount = academicYearId
          ? await repo.getStudentCountForClass(school_id, academicYearId, classYear, section, correlationId)
          : 0

        // Check if attendance is marked today
        const attendanceMarkedToday = academicYearId
          ? await repo.isAttendanceMarked(school_id, academicYearId, classYear, section, todayDate, correlationId)
          : false

        // Get homework due today count
        const { data: homeworkDue } = await supabaseAdmin
          .from('homework')
          .select('id')
          .eq('school_id', school_id)
          .eq('teacher_id', resolvedTeacherId)
          .eq('class_year', classYear)
          .eq('section', section)
          .eq('subject', subject)
          .eq('due_date', todayDate)

        // Get pending grading count
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabaseAdmin as any
        const { data: homeworkIds } = await supabaseAdmin
          .from('homework')
          .select('id')
          .eq('teacher_id', resolvedTeacherId)
          .eq('class_year', classYear)
          .eq('section', section)
          .eq('subject', subject)
        const { data: pendingGrading } = await db
          .from('homework_submissions')
          .select('id')
          .eq('school_id', school_id)
          .eq('grading_status', 'UNGRADED')
          .in('homework_id', homeworkIds?.map((h: { id: string }) => h.id) || [])

        return {
          classYear,
          section,
          subject,
          studentCount,
          attendanceMarkedToday,
          homeworkDueToday: (homeworkDue || []).length,
          pendingGrading: (pendingGrading || []).length,
        }
      })
    )

    // Sort by class_year DESC then section ASC
    classResults.sort((a, b) => {
      if (a.classYear !== b.classYear) return b.classYear - a.classYear
      return a.section.localeCompare(b.section)
    })

    fastify.log.info(
      { correlationId, teacherId: resolvedTeacherId, classCount: classResults.length },
      'teacher classes fetched'
    )

    return reply.send({ data: { classes: classResults } })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/v1/teacher/fcm-token
  // Register / refresh device FCM token for push notifications.
  // Requires device_id (stable Keychain UUID) for audit trail linkage.
  // ─────────────────────────────────────────────────────────────────────────────
  const FcmTokenSchema = z.object({
    fcm_token:       z.string().min(10),
    device_id:       z.string().uuid('device_id must be a UUID'),
    school_id:       z.string().min(1),
    device_model:    z.string().optional(),
    device_platform: z.enum(['ANDROID', 'IOS']).default('ANDROID'),
    app_version:     z.string().optional(),
  })

  fastify.post('/fcm-token', async (request, reply) => {
    const { sub, school_id: jwtSchoolId, teacher_id } = request.jwtPayload
    const correlationId = request.correlationId
    const body = FcmTokenSchema.parse(request.body)

    // Verify school_id matches JWT (prevent cross-school token poisoning)
    if (body.school_id !== jwtSchoolId) {
      return reply.code(400).send({
        error: 'school_id mismatch with token', code: 'SCHOOL_ID_MISMATCH', correlationId,
      })
    }

    const userId = teacher_id ?? sub
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any
    const now = new Date().toISOString()

    // Defensive register: check for an existing row for this (user, type, device)
    // and UPDATE it, else INSERT. This does NOT depend on a DB unique constraint
    // (so it works even before migration 025's UNIQUE index is applied), and an
    // already-registered device_id with an existing token simply gets its token
    // refreshed — it never errors on a duplicate device.
    const fields = {
      token:           body.fcm_token,
      school_id:       body.school_id,
      device_platform: body.device_platform,
      device_model:    body.device_model ?? null,
      app_version:     body.app_version ?? null,
      is_active:       true,
      last_used_at:    now,
    }

    try {
      const { data: existing } = await db
        .from('fcm_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('user_type', request.jwtPayload.role)
        .eq('device_id', body.device_id)
        .limit(1)
        .maybeSingle()

      if (existing?.id) {
        const { error } = await db.from('fcm_tokens').update(fields).eq('id', existing.id)
        if (error) throw new DatabaseError(error.message, { userId, correlationId })
      } else {
        const { error } = await db.from('fcm_tokens').insert({
          user_id: userId, user_type: request.jwtPayload.role, device_id: body.device_id, ...fields,
        })
        if (error) throw new DatabaseError(error.message, { userId, correlationId })
      }
    } catch (e) {
      // Never crash the client over a token registration; log and report soft failure.
      fastify.log.warn({ correlationId, userId, err: (e as Error).message }, 'FCM token registration failed')
      return reply.code(200).send({ data: { registered: false, reason: (e as Error).message } })
    }

    fastify.log.info({ correlationId, userId, deviceId: body.device_id.slice(0, 8) }, 'FCM token registered')
    return reply.code(201).send({ data: { registered: true, deviceId: body.device_id } })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/v1/teacher/notify/period-start
  // Called by the client when a period just started and attendance is not marked.
  // Server sends FCM push to the teacher's own device.
  // ─────────────────────────────────────────────────────────────────────────────
  const PeriodNotifySchema = z.object({
    subject: z.string(),
    classYear: z.number().int(),
    section: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    studentCount: z.number().int(),
    periodNumber: z.number().int(),
    type: z.enum(['ATTENDANCE', 'COVERAGE']),
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/v1/teacher/notify/test
  // Sends a test FCM notification to all of this teacher's registered devices.
  // Dev only — lets you verify the full FCM pipeline without waiting for a period.
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.post('/notify/test', async (request, reply) => {
    const { sub } = request.jwtPayload
    const correlationId = request.correlationId

    const { data: tokens } = await supabaseAdmin
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', sub)
      .eq('is_active', true)

    if (!tokens || tokens.length === 0) {
      return reply.send({ data: { sent: 0, reason: 'no_tokens_registered' } })
    }

    const results = await Promise.allSettled(
      (tokens as { token: string }[]).map(t =>
        sendFcm({
          token: t.token,
          title: '🔔 NeuraLife — Test Notification',
          body: 'Push notifications are working! FCM pipeline is healthy.',
          data: { channelId: 'attendance_reminder', type: 'TEST' },
        })
      )
    )
    const sent = results.filter(r => r.status === 'fulfilled' && r.value).length

    fastify.log.info({ correlationId, userId: sub, sent }, 'test notification sent')
    return reply.send({ data: { sent, total: tokens.length } })
  })

  fastify.post('/notify/period-start', async (request, reply) => {
    const { sub, school_id } = request.jwtPayload
    const body = PeriodNotifySchema.parse(request.body)
    const correlationId = request.correlationId

    // Look up this teacher's active FCM tokens
    const { data: tokens } = await supabaseAdmin
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', sub)
      .eq('is_active', true)

    if (!tokens || tokens.length === 0) {
      return reply.send({ data: { sent: 0, reason: 'no_tokens' } })
    }

    const subjectLabel = body.subject.replace(/_/g, ' ')
    const classLabel   = `Class ${body.classYear}-${body.section}`

    let title = ''
    let notifBody = ''
    let channelId = 'teacher_alerts'

    if (body.type === 'ATTENDANCE') {
      title = `📋 Mark Attendance — ${classLabel}`
      notifBody = `${subjectLabel} · ${body.startTime}–${body.endTime} · ${body.studentCount} students`
      channelId = 'attendance_reminder'
    } else {
      title = `📝 Mark Coverage — ${subjectLabel}`
      notifBody = `${classLabel} ending at ${body.endTime} — what did you teach?`
      channelId = 'coverage_reminder'
    }

    // Deep-link payload — tapping the notification opens the right screen with
    // this class/section/subject pre-selected. All FCM data values MUST be strings.
    // The mobile @lib/deepLink router reads `type` + these fields. See the
    // "Push Notification Deep-Linking" rule in apps/mobile/CLAUDE.md.
    const deepLinkData: Record<string, string> = {
      channelId,
      type: body.type,
      screen: body.type === 'ATTENDANCE' ? 'Attendance' : 'MarkCoverage',
      classYear: String(body.classYear),
      section: body.section,
      subject: body.subject,
      periodNumber: String(body.periodNumber),
      startTime: body.startTime,
      endTime: body.endTime,
      date: todayIST().date,
    }

    const results = await Promise.allSettled(
      (tokens as { token: string }[]).map(t =>
        sendFcm({ token: t.token, title, body: notifBody, data: deepLinkData })
      )
    )
    const sent = results.filter(r => r.status === 'fulfilled' && r.value).length

    fastify.log.info({ correlationId, userId: sub, type: body.type, sent }, 'period notification sent')
    return reply.send({ data: { sent } })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/v1/teacher/attendance/classes-today
  // Today's classes for this teacher with per-class attendance status.
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.get('/attendance/classes-today', async (request, reply) => {
    const { school_id, teacher_id, role } = request.jwtPayload
    const correlationId = request.correlationId
    const resolvedTeacherId = teacher_id ?? request.jwtPayload.sub

    const allowed: string[] = [UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]
    if (!allowed.includes(role)) throw new ForbiddenError('Teacher app access required')

    const repo = new TeacherMobileRepository(supabaseAdmin, fastify.log)

    const debugDateParam = (request.query as Record<string, string>)?.debug_date
    const isDebugAllowed = process.env.NODE_ENV === 'development'
    const overrideDate = isDebugAllowed && debugDateParam && /^\d{4}-\d{2}-\d{2}$/.test(debugDateParam)
      ? debugDateParam : null

    let { date: todayDate, dayOfWeek } = todayIST()
    if (overrideDate) {
      const d = new Date(overrideDate + 'T00:00:00+05:30')
      todayDate = overrideDate
      dayOfWeek = DAY_MAP[d.getDay()] ?? 'MON'
    }

    // IST current time "HH:MM"
    const nowIST = todayIST()
    const istNow = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000)
    const currentTimeIST = `${String(istNow.getUTCHours()).padStart(2,'0')}:${String(istNow.getUTCMinutes()).padStart(2,'0')}`

    const [academicYearId, schoolRow] = await Promise.all([
      repo.getCurrentAcademicYearId(school_id, correlationId),
      supabaseAdmin.from('schools').select('attendance_mode, name').eq('id', school_id).single(),
    ])

    const attendanceMode: string = (schoolRow.data as { attendance_mode?: string } | null)?.attendance_mode ?? 'ONCE_PER_DAY'

    // Get this teacher's timetable today + substitute assignments
    const [rawSlots, exceptions] = await Promise.all([
      repo.getTodayTimetable(resolvedTeacherId, school_id, dayOfWeek, correlationId),
      repo.getTimetableExceptions(school_id, resolvedTeacherId, todayDate, correlationId),
    ])

    // Build per-class attendance status
    const uniqueClasses = new Set<string>()
    for (const slot of rawSlots) {
      if (slot.period_type === 'REGULAR') uniqueClasses.add(`${slot.class_year}-${slot.section}`)
    }

    const cancelledSet = new Set<string>()
    const substituteMap = new Map<string, boolean>()
    for (const ex of exceptions) {
      const key = `${ex.class_year}-${ex.section}-${ex.period_number}`
      if (ex.exception_type === 'CANCELLED' && ex.original_teacher_id === resolvedTeacherId) cancelledSet.add(key)
      if (ex.exception_type === 'SUBSTITUTE' && ex.substitute_teacher_id === resolvedTeacherId) substituteMap.set(key, true)
    }

    const nowMins = (() => {
      const [hh, mm] = currentTimeIST.split(':').map(Number)
      return (hh ?? 0) * 60 + (mm ?? 0)
    })()
    const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return (h ?? 0) * 60 + (m ?? 0) }

    const classResults = await Promise.all(
      Array.from(uniqueClasses).map(async key => {
        const [classYear, section] = key.split('-')
        const [isMarked, count, attendanceCounts] = await Promise.all([
          repo.isAttendanceMarked(school_id, academicYearId, parseInt(classYear), section, todayDate, correlationId),
          academicYearId ? repo.getStudentCountForClass(school_id, academicYearId, parseInt(classYear), section, correlationId) : Promise.resolve(0),
          repo.getClassAttendanceCounts(school_id, academicYearId, parseInt(classYear), section, todayDate, correlationId),
        ])
        return { key, isMarked, count, attendanceCounts }
      })
    )

    const classMap = new Map(classResults.map(r => [r.key, r]))

    const classes = rawSlots
      .filter(s => s.period_type === 'REGULAR')
      .filter(s => !cancelledSet.has(`${s.class_year}-${s.section}-${s.period_number}`))
      .map(slot => {
        const classKey = `${slot.class_year}-${slot.section}`
        const periodKey = `${slot.class_year}-${slot.section}-${slot.period_number}`
        const cm = classMap.get(classKey)
        const startMins = toMins(slot.start_time)
        const endMins   = toMins(slot.end_time)
        const isCurrentlyActive = nowMins >= startMins && nowMins < endMins
        const isSubstitute = substituteMap.has(periodKey)

        return {
          slotId:            slot.id,
          classYear:         slot.class_year,
          section:           slot.section,
          subject:           slot.subject ?? 'FREE',
          startTime:         slot.start_time,
          endTime:           slot.end_time,
          periodNumber:      slot.period_number,
          studentCount:      cm?.count ?? 0,
          attendanceStatus:  cm?.isMarked ? 'MARKED' : 'NOT_MARKED',
          presentCount:      cm?.attendanceCounts.present ?? 0,
          absentCount:       cm?.attendanceCounts.absent  ?? 0,
          lateCount:         cm?.attendanceCounts.late    ?? 0,
          isCurrentlyActive,
          isSubstitute,
          originalTeacherName: null,
        }
      })

    fastify.log.info({ correlationId, teacherId: resolvedTeacherId, classCount: classes.length }, 'classes-today fetched')
    return reply.send({ data: { attendanceMode, todayDate, currentTimeIST, classes } })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/v1/teacher/attendance/students
  // Student roster for a class on a given date with existing attendance status.
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.get('/attendance/students', async (request, reply) => {
    const { school_id, teacher_id } = request.jwtPayload
    const correlationId = request.correlationId
    const resolvedTeacherId = teacher_id ?? request.jwtPayload.sub
    const q = request.query as Record<string, string>
    const classYear = parseInt(q.classYear ?? '0')
    const section   = q.section ?? ''
    const date      = q.date    ?? todayIST().date

    if (!classYear || !section) {
      return reply.code(400).send({ error: 'classYear and section required', code: 'VALIDATION_ERROR', correlationId })
    }

    const repo = new TeacherMobileRepository(supabaseAdmin, fastify.log)
    const [academicYearId, schoolRow] = await Promise.all([
      repo.getCurrentAcademicYearId(school_id, correlationId),
      supabaseAdmin.from('schools').select('attendance_mode').eq('id', school_id).single(),
    ])
    const attendanceMode = (schoolRow.data as { attendance_mode?: string } | null)?.attendance_mode ?? 'ONCE_PER_DAY'

    // Get enrolled students
    const { data: enrollments } = await supabaseAdmin
      .from('student_yearly_progress')
      .select('neura_id')
      .eq('school_id', school_id)
      .eq('academic_year_id', academicYearId ?? '')
      .eq('class_year', classYear)
      .eq('section', section)

    const neuraIds = (enrollments ?? []).map((e: { neura_id: string }) => e.neura_id)
    // roll_number not on student_yearly_progress — use null for now
    const rollMap = new Map<string, number | null>()

    const { data: students } = await supabaseAdmin
      .from('students')
      .select('neura_id, full_name')
      .in('neura_id', neuraIds)
      .is('deleted_at', null)

    const studentMap = new Map((students ?? []).map((s: { neura_id: string; full_name: string }) => [s.neura_id, s.full_name]))

    // Get existing attendance
    const { data: existing } = await supabaseAdmin
      .from('attendance')
      .select('id, neura_id, status, reason, marked_by, marked_at, period_number')
      .eq('school_id', school_id)
      .in('neura_id', neuraIds)
      .eq('attendance_date', date)

    const existingMap = new Map((existing ?? []).map((a: {
      id: string; neura_id: string; status: string; reason: string | null;
      marked_by: string | null; marked_at: string | null; period_number: number | null;
    }) => [a.neura_id, a]))

    const alreadySubmitted = (existing ?? []).length > 0
    const submittedAt    = alreadySubmitted ? (existing as Array<{ marked_at: string | null }>)[0]?.marked_at ?? null : null
    const markedById     = alreadySubmitted ? (existing as Array<{ marked_by: string | null }>)[0]?.marked_by ?? null : null

    // Get submitter name
    let submittedByName: string | null = null
    if (markedById) {
      const { data: tData } = await supabaseAdmin.from('teachers').select('full_name').eq('id', markedById).single()
      submittedByName = (tData as { full_name?: string } | null)?.full_name ?? null
    }

    const studentsResult = neuraIds.map(neuraId => {
      const ex = existingMap.get(neuraId)
      return {
        neuraId,
        name:                 studentMap.get(neuraId) ?? neuraId,
        rollNumber:           rollMap.get(neuraId) ?? null,
        photoUrl:             null,
        currentStatus:        ex ? (ex as { status: string }).status : 'NOT_MARKED',
        currentReason:        ex ? (ex as { reason: string | null }).reason : null,
        originalAttendanceId: ex ? (ex as { id: string }).id : null,
      }
    })

    fastify.log.info({ correlationId, classYear, section, date, studentCount: studentsResult.length }, 'attendance/students fetched')
    return reply.send({
      data: { attendanceMode, alreadySubmitted, submittedAt, submittedByName, students: studentsResult },
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/v1/teacher/attendance/submit
  // Submit signed attendance for a class.
  // ─────────────────────────────────────────────────────────────────────────────
  const AttendanceSubmitSchema = z.object({
    classYear:       z.number().int().min(1).max(12),
    section:         z.string().min(1),
    date:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    periodNumber:    z.number().int().optional(),
    attendanceMode:  z.enum(['ONCE_PER_DAY', 'PER_PERIOD']),
    records: z.array(z.object({
      neuraId: z.string(),
      status:  z.enum(['PRESENT', 'ABSENT', 'LATE']),
      reason:  z.string().optional(),
    })),
    signatureHash: z.string().min(64).max(64),
    deviceId:      z.string().uuid(),
    submittedAt:   z.string(),
  })

  fastify.post('/attendance/submit', async (request, reply) => {
    const { school_id, teacher_id, sub } = request.jwtPayload
    const correlationId = request.correlationId
    const resolvedTeacherId = teacher_id ?? sub
    const body = AttendanceSubmitSchema.parse(request.body)

    const repo = new TeacherMobileRepository(supabaseAdmin, fastify.log)

    // 1. Verify attendance_mode matches DB
    const { data: schoolData } = await supabaseAdmin
      .from('schools').select('attendance_mode, name').eq('id', school_id).single()
    const dbMode = (schoolData as { attendance_mode?: string } | null)?.attendance_mode ?? 'ONCE_PER_DAY'
    if (body.attendanceMode !== dbMode) {
      return reply.code(400).send({
        error: 'Attendance mode changed by principal. Please refresh.',
        code: 'MODE_MISMATCH', correlationId,
      })
    }

    // 2. Verify signature
    const { createHash } = await import('crypto')
    const sigInput = [
      resolvedTeacherId,
      body.classYear,
      body.section,
      body.date,
      body.periodNumber ?? 'null',
      body.submittedAt,
      body.deviceId,
    ].join('|')
    const expectedHash = createHash('sha256').update(sigInput).digest('hex')
    if (body.signatureHash !== expectedHash) {
      fastify.log.warn({ correlationId, resolvedTeacherId }, 'attendance signature mismatch')
      return reply.code(422).send({ error: 'Signature verification failed', code: 'INVALID_SIGNATURE', correlationId })
    }

    // 3. Get academic year
    const academicYearId = await repo.getCurrentAcademicYearId(school_id, correlationId)

    // 4. Upsert attendance records
    const now = new Date().toISOString()
    for (const record of body.records) {
      const periodNum = body.attendanceMode === 'PER_PERIOD' ? (body.periodNumber ?? null) : null

      // Check existing record
      let qExisting = supabaseAdmin
        .from('attendance')
        .select('id')
        .eq('neura_id', record.neuraId)
        .eq('school_id', school_id)
        .eq('attendance_date', body.date)
      if (periodNum !== null) {
        qExisting = qExisting.eq('period_number', periodNum)
      } else {
        qExisting = qExisting.is('period_number', null)
      }
      const { data: existingRow } = await qExisting.maybeSingle()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supaAny = supabaseAdmin as any
      if (existingRow) {
        await supaAny.from('attendance').update({
          status:         record.status,
          reason:         record.reason ?? null,
          marked_by:      resolvedTeacherId,
          marked_at:      now,
          device_id:      body.deviceId,
          signature_hash: body.signatureHash,
        }).eq('id', (existingRow as { id: string }).id)
      } else {
        await supaAny.from('attendance').insert({
          neura_id:         record.neuraId,
          school_id:        school_id,
          academic_year_id: academicYearId ?? '',
          attendance_date:  body.date,
          status:           record.status,
          reason:           record.reason ?? null,
          marked_by:        resolvedTeacherId,
          marked_at:        now,
          period_number:    periodNum,
          device_id:        body.deviceId,
          signature_hash:   body.signatureHash,
        })
      }
    }

    const presentCount = body.records.filter(r => r.status === 'PRESENT').length
    const absentCount  = body.records.filter(r => r.status === 'ABSENT').length
    const lateCount    = body.records.filter(r => r.status === 'LATE').length

    // 5. ASYNC: FCM to parents (fire and forget — parent tokens populated by Parent App)
    // TODO: parent FCM tokens populated by Parent App
    // For v1: silently skip — no parent tokens exist yet
    const schoolName = (schoolData as { name?: string } | null)?.name ?? 'School'

    // 6. ASYNC: Principal summary FCM
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: principalTokens } = await (supabaseAdmin as any)
          .from('fcm_tokens')
          .select('token')
          .eq('school_id', school_id)
          .eq('user_type', UserRole.PRINCIPAL)
          .eq('is_active', true)
        const tokens = (principalTokens ?? []).map((t: { token: string }) => t.token)
        if (tokens.length) {
          await sendFcm({
            token: tokens[0],
            title: schoolName,
            body: `${body.classYear}-${body.section} attendance submitted · ${presentCount}P ${absentCount}A ${lateCount}L`,
            data: { type: 'ATTENDANCE_SUMMARY', date: body.date },
          })
        }
      } catch { /* non-fatal */ }
    })()

    fastify.log.info(
      { correlationId, teacherId: resolvedTeacherId, classYear: body.classYear, section: body.section, recordCount: body.records.length },
      'attendance submitted',
    )
    return reply.send({ data: { submitted: true, recordCount: body.records.length, presentCount, absentCount, lateCount, submittedAt: now } })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/v1/teacher/attendance/correct
  // Late arrival correction: ABSENT → LATE (immutable audit trail).
  // ─────────────────────────────────────────────────────────────────────────────
  const AttendanceCorrectSchema = z.object({
    originalAttendanceId: z.string().uuid(),
    neuraId:              z.string(),
    correctedStatus:      z.literal('LATE'),
    reason:               z.string().optional(),
    actualArrivalTime:    z.string(),
    correctedAt:          z.string(),
  })

  fastify.post('/attendance/correct', async (request, reply) => {
    const { school_id, teacher_id, sub } = request.jwtPayload
    const correlationId = request.correlationId
    const resolvedTeacherId = teacher_id ?? sub
    const body = AttendanceCorrectSchema.parse(request.body)

    // Verify original record exists and is ABSENT
    const { data: original } = await supabaseAdmin
      .from('attendance')
      .select('id, status, neura_id')
      .eq('id', body.originalAttendanceId)
      .eq('school_id', school_id)
      .single()

    if (!original || (original as { status: string }).status !== 'ABSENT') {
      return reply.code(422).send({ error: 'Original record must be ABSENT', code: 'INVALID_CORRECTION', correlationId })
    }

    const repo = new TeacherMobileRepository(supabaseAdmin, fastify.log)
    const academicYearId = await repo.getCurrentAcademicYearId(school_id, correlationId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any).from('attendance_corrections').insert({
      original_attendance_id: body.originalAttendanceId,
      neura_id:         body.neuraId,
      school_id:        school_id,
      academic_year_id: academicYearId ?? '',
      corrected_status: 'LATE',
      reason:           body.reason ?? null,
      correction_note:  body.actualArrivalTime,
      corrected_by:     resolvedTeacherId,
      corrected_at:     body.correctedAt,
    })

    fastify.log.info({ correlationId, originalId: body.originalAttendanceId, neuraId: body.neuraId }, 'attendance corrected')
    return reply.send({ data: { corrected: true } })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/v1/teacher/coverage/pending
  // Completed periods today with no coverage logged.
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.get('/coverage/pending', async (request, reply) => {
    const { school_id, teacher_id } = request.jwtPayload
    const correlationId = request.correlationId
    const resolvedTeacherId = teacher_id ?? request.jwtPayload.sub

    const { date: todayDate, dayOfWeek } = todayIST()
    const istNow = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000)
    const currentTimeIST = `${String(istNow.getUTCHours()).padStart(2,'0')}:${String(istNow.getUTCMinutes()).padStart(2,'0')}`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: duePeriods } = await (supabaseAdmin as any).rpc('get_coverage_due_periods', {
      p_day_of_week: dayOfWeek,
      p_end_from:    '00:00',
      p_end_to:      currentTimeIST,
      p_date:        todayDate,
    })

    const periods = (duePeriods ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((p: any) => p.teacher_id === resolvedTeacherId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map(async (period: any) => {
        // Get the slot start time
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: slotData } = await (supabaseAdmin as any)
          .from('timetable_slots')
          .select('start_time, period_number')
          .eq('id', period.slot_id)
          .single()

        // Get suggested topics
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: topics } = await (supabaseAdmin as any)
          .from('curriculum_topics')
          .select('id, chapter_number, chapter_name, topic_number, topic_name')
          .eq('class_year', period.class_year)
          .eq('subject', period.subject)
          .order('chapter_number', { ascending: true })
          .order('topic_number',   { ascending: true })
          .limit(20)

        return {
          slotId:       period.slot_id,
          periodNumber: (slotData as { period_number: number } | null)?.period_number ?? 0,
          classYear:    period.class_year,
          section:      period.section,
          subject:      period.subject,
          startTime:    (slotData as { start_time: string } | null)?.start_time ?? '00:00',
          endTime:      period.end_time,
          lastCoveredChapter: null,
          suggestedTopics: (topics ?? []).map((t: {
            id: string; chapter_number: number; chapter_name: string;
            topic_number: number; topic_name: string;
          }) => t),
        }
      })

    const resolvedPeriods = await Promise.all(periods)

    fastify.log.info({ correlationId, teacherId: resolvedTeacherId, pendingCount: resolvedPeriods.length }, 'coverage/pending fetched')
    return reply.send({ data: { pendingCount: resolvedPeriods.length, periods: resolvedPeriods } })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/v1/teacher/coverage/submit
  // Log what was covered in one or more periods.
  // ─────────────────────────────────────────────────────────────────────────────
  const CoverageSubmitSchema = z.object({
    coverages: z.array(z.object({
      slotId:          z.string().uuid(),
      classYear:       z.number().int(),
      section:         z.string(),
      subject:         z.string(),
      coverageDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      periodNumber:    z.number().int(),
      chapterName:     z.string(),
      topicName:       z.string(),
      coverageStatus:  z.enum(['COVERED', 'PARTIAL', 'POSTPONED']),
      completionPct:   z.number().int().min(0).max(100),
      notes:           z.string().optional(),
    })),
  })

  fastify.post('/coverage/submit', async (request, reply) => {
    const { school_id, teacher_id, sub } = request.jwtPayload
    const correlationId = request.correlationId
    const resolvedTeacherId = teacher_id ?? sub
    const body = CoverageSubmitSchema.parse(request.body)

    const repo = new TeacherMobileRepository(supabaseAdmin, fastify.log)
    const academicYearId = await repo.getCurrentAcademicYearId(school_id, correlationId)

    for (const cov of body.coverages) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any).from('syllabus_coverage').upsert({
        school_id:        school_id,
        academic_year_id: academicYearId ?? '',
        teacher_id:       resolvedTeacherId,
        class_year:       cov.classYear,
        section:          cov.section,
        subject:          cov.subject,
        coverage_date:    cov.coverageDate,
        period_number:    cov.periodNumber,
        chapter_name:     cov.chapterName,
        topic_name:       cov.topicName,
        coverage_status:  cov.coverageStatus,
        completion_pct:   cov.completionPct,
        notes:            cov.notes ?? null,
        updated_at:       new Date().toISOString(),
      }, { onConflict: 'school_id,academic_year_id,teacher_id,class_year,section,subject,coverage_date,period_number,topic_name' })
    }

    // Calculate chapter completion per chapter submitted
    const chapters = [...new Set(body.coverages.map(c => `${c.classYear}-${c.section}-${c.subject}-${c.chapterName}`))]
    const chapterCompletions = await Promise.all(chapters.map(async key => {
      const [classYear, section, subject, ...rest] = key.split('-')
      const chapterName = rest.join('-')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabaseAdmin as any)
        .from('syllabus_coverage')
        .select('completion_pct')
        .eq('teacher_id', resolvedTeacherId)
        .eq('school_id', school_id)
        .eq('class_year', parseInt(classYear))
        .eq('section', section)
        .eq('subject', subject)
        .eq('chapter_name', chapterName)
      const avg = data?.length
        ? Math.round(data.reduce((s: number, r: { completion_pct: number }) => s + r.completion_pct, 0) / data.length)
        : 0
      return { chapterName, completionPct: avg }
    }))

    fastify.log.info({ correlationId, teacherId: resolvedTeacherId, submitted: body.coverages.length }, 'coverage submitted')
    return reply.send({ data: { submitted: body.coverages.length, chapterCompletions } })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // PUT /api/v1/schools/settings
  // Update school attendance mode (PRINCIPAL / SCHOOL_ADMIN only).
  // ─────────────────────────────────────────────────────────────────────────────
  const SchoolSettingsSchema = z.object({
    attendance_mode: z.enum(['ONCE_PER_DAY', 'PER_PERIOD']).optional(),
  })

  fastify.put('/schools/settings', async (request, reply) => {
    const { school_id, role } = request.jwtPayload
    const correlationId = request.correlationId

    const allowedRoles = [UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]
    if (!allowedRoles.includes(role as UserRole)) throw new ForbiddenError('Principal or admin required')

    const body = SchoolSettingsSchema.parse(request.body)
    if (!body.attendance_mode) {
      return reply.send({ data: {} })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from('schools')
      .update({ attendance_mode: body.attendance_mode, updated_at: new Date().toISOString() })
      .eq('id', school_id)

    if (error) throw new DatabaseError(error.message, { schoolId: school_id, correlationId })

    fastify.log.info({ correlationId, schoolId: school_id, attendance_mode: body.attendance_mode }, 'school settings updated')
    return reply.send({ data: { attendance_mode: body.attendance_mode } })
  })
}
