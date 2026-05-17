import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { FastifyBaseLogger } from 'fastify'
import { TimetableRepository } from '../repositories/timetable.repository.js'
import type {
  PeriodConfigRow, AssemblyConfig, TimetableRequirement,
  TimetableConfig, TimetableSlotEntry, TimetableConflict,
  GeneratedTimetable, TimetableStatus,
} from '../types/common.js'

// ─── Time helpers ─────────────────────────────────────────────────────────────

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const hh = Math.floor(total / 60) % 24
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

// Build slot timeline for a day given its config
function buildDaySlots(
  _day: string,
  cfg: PeriodConfigRow,
): Array<{
  period_number: number
  start_time: string
  end_time: string
  slot_type: 'REGULAR' | 'BREAK' | 'LUNCH'
}> {
  const slots: Array<{ period_number: number; start_time: string; end_time: string; slot_type: 'REGULAR' | 'BREAK' | 'LUNCH' }> = []
  let current = cfg.school_start_time
  let period = 1

  while (current < cfg.school_end_time) {
    const periodEnd = addMinutes(current, cfg.period_duration_minutes)
    if (periodEnd > cfg.school_end_time) break

    slots.push({ period_number: period, start_time: current, end_time: periodEnd, slot_type: 'REGULAR' })

    // Check for short break after this period
    // Use -period as period_number so multiple breaks in one day get unique numbers
    if (cfg.short_break_after_periods.includes(period)) {
      const breakEnd = addMinutes(periodEnd, cfg.short_break_duration_min)
      slots.push({ period_number: -period, start_time: periodEnd, end_time: breakEnd, slot_type: 'BREAK' })
      current = breakEnd
    } else if (cfg.lunch_after_period === period) {
      const lunchEnd = addMinutes(periodEnd, cfg.lunch_duration_minutes)
      slots.push({ period_number: -(100 + period), start_time: periodEnd, end_time: lunchEnd, slot_type: 'LUNCH' })
      current = lunchEnd
    } else {
      current = periodEnd
    }
    period++
  }
  return slots
}

// ─── CSP Generation algorithm ─────────────────────────────────────────────────

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export class TimetableService {
  private readonly repo: TimetableRepository

  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: FastifyBaseLogger,
  ) {
    this.repo = new TimetableRepository(supabase, logger)
  }

  async getConfig(schoolId: string, academicYearId: string, correlationId: string): Promise<TimetableConfig> {
    return this.repo.getConfig(schoolId, academicYearId, correlationId)
  }

  async saveConfig(
    schoolId: string, academicYearId: string,
    periodConfig: PeriodConfigRow[], assemblyConfig: AssemblyConfig | null,
    requirements: TimetableRequirement[], correlationId: string,
  ): Promise<void> {
    await Promise.all([
      periodConfig.length > 0 ? this.repo.savePeriodConfig(schoolId, academicYearId, periodConfig, correlationId) : Promise.resolve(),
      assemblyConfig ? this.repo.saveAssemblyConfig(schoolId, academicYearId, assemblyConfig, correlationId) : Promise.resolve(),
      requirements.length > 0 ? this.repo.saveRequirements(schoolId, academicYearId, requirements, correlationId) : Promise.resolve(),
    ])
  }

  async getStatus(schoolId: string, academicYearId: string, correlationId: string): Promise<TimetableStatus> {
    return this.repo.getStatus(schoolId, academicYearId, correlationId)
  }

  async getTimetableForClass(schoolId: string, academicYearId: string, classYear: number, section: string, correlationId: string): Promise<TimetableSlotEntry[]> {
    return this.repo.getTimetableForClass(schoolId, academicYearId, classYear, section, correlationId)
  }

  async getTimetableForTeacher(schoolId: string, academicYearId: string, teacherId: string, correlationId: string): Promise<TimetableSlotEntry[]> {
    return this.repo.getTimetableForTeacher(schoolId, academicYearId, teacherId, correlationId)
  }

  async generate(
    schoolId: string, academicYearId: string,
    seed: string | undefined, correlationId: string,
  ): Promise<GeneratedTimetable> {
    this.logger.info({ correlationId, schoolId, seed }, 'TimetableService.generate START')

    const [config, teacherAssignments, classSections] = await Promise.all([
      this.repo.getConfig(schoolId, academicYearId, correlationId),
      this.repo.getTeacherSubjectAssignments(schoolId, academicYearId, correlationId),
      this.repo.getClassSections(academicYearId, correlationId),
    ])

    const { period_config, assembly_config, requirements } = config
    const workingDays = period_config.filter(d => d.is_working_day)

    if (workingDays.length === 0 || classSections.length === 0 || requirements.length === 0) {
      return { entries: [], conflicts: [], teacher_workload: [], slot_utilization: { total_slots: 0, filled_slots: 0, free_slots: 0, conflict_slots: 0 } }
    }

    const seedNum = seed ? parseInt(seed.replace(/\D/g, ''), 10) || Date.now() : Date.now()

    // Build teacher lookup: subject+classYear → teachers
    const teacherMap = new Map<string, Array<{ teacher_id: string; teacher_name: string }>>()
    for (const ta of teacherAssignments) {
      const key = `${ta.subject}:${ta.class_year}`
      if (!teacherMap.has(key)) teacherMap.set(key, [])
      const existing = teacherMap.get(key)!
      if (!existing.find(t => t.teacher_id === ta.teacher_id)) {
        existing.push({ teacher_id: ta.teacher_id, teacher_name: ta.teacher_name })
      }
    }

    // Teacher busy tracker: teacherId → day → Set<periodNumber>
    const teacherBusy = new Map<string, Map<string, Set<number>>>()
    const markTeacherBusy = (teacherId: string, day: string, period: number) => {
      if (!teacherBusy.has(teacherId)) teacherBusy.set(teacherId, new Map())
      const dayMap = teacherBusy.get(teacherId)!
      if (!dayMap.has(day)) dayMap.set(day, new Set())
      dayMap.get(day)!.add(period)
    }
    const isTeacherFree = (teacherId: string, day: string, period: number) => {
      return !teacherBusy.get(teacherId)?.get(day)?.has(period)
    }

    // Build day → slot list
    const daySlots = new Map<string, Array<{ period_number: number; start_time: string; end_time: string; slot_type: 'REGULAR' | 'BREAK' | 'LUNCH' }>>()
    for (const d of workingDays) {
      daySlots.set(d.day_of_week, buildDaySlots(d.day_of_week, d))
    }

    const allEntries: TimetableSlotEntry[] = []
    const conflicts: TimetableConflict[] = []

    // Sort requirements: most constrained first
    const sortedReqs = [...requirements].sort((a, b) => {
      const aTeachers = teacherMap.get(`${a.subject}:${a.class_year}`)?.length ?? 0
      const bTeachers = teacherMap.get(`${b.subject}:${b.class_year}`)?.length ?? 0
      if (aTeachers !== bTeachers) return aTeachers - bTeachers // fewest teachers first
      if (a.needs_double_period !== b.needs_double_period) return a.needs_double_period ? -1 : 1
      if (a.preferred_position !== 'ANY' && b.preferred_position === 'ANY') return -1
      if (b.preferred_position !== 'ANY' && a.preferred_position === 'ANY') return 1
      return b.periods_per_week - a.periods_per_week
    })

    // Process each class-section
    for (const cs of classSections) {
      const { class_year, section } = cs

      // Add structural slots (BREAK, LUNCH, ASSEMBLY)
      for (const [day, slots] of daySlots.entries()) {
        for (const slot of slots) {
          if (slot.slot_type === 'BREAK') {
            allEntries.push({
              school_id: schoolId, academic_year_id: academicYearId,
              class_year, section, day_of_week: day,
              period_number: slot.period_number,
              start_time: slot.start_time, end_time: slot.end_time,
              subject: 'BREAK', subject_type: 'BREAK',
              teacher_id: null, is_double_period: false,
              period_type: 'BREAK',
            })
          } else if (slot.slot_type === 'LUNCH') {
            allEntries.push({
              school_id: schoolId, academic_year_id: academicYearId,
              class_year, section, day_of_week: day,
              period_number: slot.period_number,
              start_time: slot.start_time, end_time: slot.end_time,
              subject: 'LUNCH', subject_type: 'LUNCH',
              teacher_id: null, is_double_period: false,
              period_type: 'LUNCH',
            })
          }
        }
      }

      // Assembly slot
      if (assembly_config?.include_in_schedule && assembly_config.position === 'BEFORE_FIRST') {
        const asmDay = assembly_config.day_of_week
        if (daySlots.has(asmDay)) {
          const dayStart = workingDays.find(d => d.day_of_week === asmDay)?.school_start_time ?? '09:00'
          const asmStart = addMinutes(dayStart, -assembly_config.duration_minutes)
          allEntries.push({
            school_id: schoolId, academic_year_id: academicYearId,
            class_year, section, day_of_week: asmDay,
            period_number: 0,
            start_time: asmStart, end_time: dayStart,
            subject: 'ASSEMBLY', subject_type: 'ASSEMBLY',
            teacher_id: null, is_double_period: false,
            period_type: 'ASSEMBLY',
          })
        }
      }

      // Track which days a subject has been assigned (for spread constraint)
      const subjectDaysUsed = new Map<string, Set<string>>() // subject → days
      // Track which periods in this class are already assigned
      const classSlotUsed = new Map<string, Set<number>>() // day → Set<period>

      const getClassSlotUsed = (day: string): Set<number> => {
        if (!classSlotUsed.has(day)) classSlotUsed.set(day, new Set())
        return classSlotUsed.get(day)!
      }

      const classReqs = sortedReqs.filter(r => r.class_year === class_year)

      for (const req of classReqs) {
        const teachers = [...(teacherMap.get(`${req.subject}:${class_year}`) ?? [])]
        // For ECA with explicit teacher_id
        if (req.teacher_id && !teachers.find(t => t.teacher_id === req.teacher_id)) {
          teachers.push({ teacher_id: req.teacher_id, teacher_name: req.teacher_name ?? req.subject })
        }

        const daysForSubject = subjectDaysUsed.get(req.subject) ?? new Set<string>()
        subjectDaysUsed.set(req.subject, daysForSubject)

        // Handle assembly replacing first period
        const assemblyDay = assembly_config?.include_in_schedule && assembly_config.position === 'FIRST_PERIOD' ? assembly_config.day_of_week : null

        let periodsPlaced = 0
        const periodsNeeded = req.periods_per_week

        if (req.needs_double_period && req.double_period_count > 0) {
          // Place double periods first
          let doublesPlaced = 0
          const workingDaysList = seededShuffle([...daySlots.keys()], seedNum + periodsPlaced)

          for (const day of workingDaysList) {
            if (doublesPlaced >= req.double_period_count) break
            if (daysForSubject.has(day)) continue
            if (assemblyDay === day) continue

            const slots = daySlots.get(day)!.filter(s => s.slot_type === 'REGULAR')
            const usedPeriods = getClassSlotUsed(day)

            // Find consecutive pairs
            for (let i = 0; i < slots.length - 1; i++) {
              const s1 = slots[i], s2 = slots[i + 1]
              if (usedPeriods.has(s1.period_number) || usedPeriods.has(s2.period_number)) continue
              if (s2.period_number !== s1.period_number + 1) continue // must be truly consecutive

              // Find a free teacher
              const freeTeacher = teachers.find(t =>
                isTeacherFree(t.teacher_id, day, s1.period_number) &&
                isTeacherFree(t.teacher_id, day, s2.period_number)
              )

              if (!freeTeacher && teachers.length > 0) continue

              // Place double period
              const teacher_id = freeTeacher?.teacher_id ?? null
              const teacher_name = freeTeacher?.teacher_name

              allEntries.push({
                school_id: schoolId, academic_year_id: academicYearId,
                class_year, section, day_of_week: day,
                period_number: s1.period_number,
                start_time: s1.start_time, end_time: s1.end_time,
                subject: req.display_name ?? req.subject, subject_type: req.subject_type,
                teacher_id, teacher_name,
                is_double_period: true,
                double_period_end_time: s2.end_time,
                period_type: 'REGULAR',
              })
              allEntries.push({
                school_id: schoolId, academic_year_id: academicYearId,
                class_year, section, day_of_week: day,
                period_number: s2.period_number,
                start_time: s2.start_time, end_time: s2.end_time,
                subject: `${req.display_name ?? req.subject}_PART2`, subject_type: req.subject_type,
                teacher_id, teacher_name,
                is_double_period: true,
                period_type: 'REGULAR',
              })

              if (teacher_id) {
                markTeacherBusy(teacher_id, day, s1.period_number)
                markTeacherBusy(teacher_id, day, s2.period_number)
              }
              usedPeriods.add(s1.period_number)
              usedPeriods.add(s2.period_number)
              daysForSubject.add(day)
              doublesPlaced++
              periodsPlaced += 2
              break
            }
          }

          if (doublesPlaced < req.double_period_count) {
            conflicts.push({
              type: 'LAB_NO_CONSECUTIVE_SLOT', severity: 'ERROR',
              class_year, section, day: '', period: 0,
              subject: req.subject,
              message: `Cannot place ${req.double_period_count - doublesPlaced} lab session(s) for ${req.subject} in Class ${class_year}-${section} — no consecutive free slots`,
            })
          }
        }

        // Place remaining single periods
        const remainingPeriods = periodsNeeded - periodsPlaced
        let singlePlaced = 0

        // Build candidate slots across all days
        interface CandidateSlot { day: string; slot: { period_number: number; start_time: string; end_time: string; slot_type: 'REGULAR' | 'BREAK' | 'LUNCH' }; score: number }
        const candidates: CandidateSlot[] = []

        for (const [day, slots] of daySlots.entries()) {
          if (daysForSubject.has(day)) continue // HC3: no subject twice per day
          if (assemblyDay === day && assembly_config?.position === 'FIRST_PERIOD') continue

          const usedPeriods = getClassSlotUsed(day)
          const dayDaySlots = slots.filter(s => s.slot_type === 'REGULAR')
          const maxPeriod = dayDaySlots.length > 0 ? Math.max(...dayDaySlots.map(s => s.period_number)) : 0
          const minPeriod = dayDaySlots.length > 0 ? Math.min(...dayDaySlots.map(s => s.period_number)) : 0

          for (const slot of dayDaySlots) {
            if (usedPeriods.has(slot.period_number)) continue

            // HC4: PT position constraint
            if (req.preferred_position === 'FIRST' && slot.period_number !== minPeriod) continue
            if (req.preferred_position === 'LAST' && slot.period_number !== maxPeriod) continue
            if (req.preferred_position === 'FIRST_OR_LAST' && slot.period_number !== minPeriod && slot.period_number !== maxPeriod) continue

            // Teacher availability
            const freeTeacher = teachers.find(t => isTeacherFree(t.teacher_id, day, slot.period_number))
            if (!freeTeacher && teachers.length > 0) continue

            // Score: morning slots preferred for heavy subjects, spread days
            let score = 0
            const isMorning = slot.period_number <= 4
            if (isMorning && ['MATHEMATICS', 'PHYSICAL_SCIENCE', 'BIOLOGICAL_SCIENCE'].includes(req.subject)) score += 10
            if (!daysForSubject.has(day)) score += 5 // prefer new days
            score += Math.random() * (seedNum % 10) * 0.01 // seed-based randomness

            candidates.push({ day, slot, score })
          }
        }

        // Sort by score desc, shuffle within equal scores using seed
        candidates.sort((a, b) => b.score - a.score)
        const shuffled = seededShuffle(candidates, seedNum + singlePlaced)

        for (const { day, slot } of shuffled) {
          if (singlePlaced >= remainingPeriods) break
          if (daysForSubject.has(day)) continue // re-check after previous iterations

          const usedPeriods = getClassSlotUsed(day)
          if (usedPeriods.has(slot.period_number)) continue

          const freeTeacher = teachers.find(t => isTeacherFree(t.teacher_id, day, slot.period_number))
          if (!freeTeacher && teachers.length > 0) continue

          const teacher_id = freeTeacher?.teacher_id ?? null
          const teacher_name = freeTeacher?.teacher_name

          allEntries.push({
            school_id: schoolId, academic_year_id: academicYearId,
            class_year, section, day_of_week: day,
            period_number: slot.period_number,
            start_time: slot.start_time, end_time: slot.end_time,
            subject: req.display_name ?? req.subject, subject_type: req.subject_type,
            teacher_id, teacher_name,
            is_double_period: false,
            period_type: 'REGULAR',
          })

          if (teacher_id) markTeacherBusy(teacher_id, day, slot.period_number)
          usedPeriods.add(slot.period_number)
          daysForSubject.add(day)
          singlePlaced++
        }

        if (singlePlaced < remainingPeriods) {
          conflicts.push({
            type: teachers.length === 0 ? 'UNASSIGNED' : 'TEACHER_DOUBLE_BOOKED',
            severity: 'ERROR',
            class_year, section, day: '', period: 0,
            subject: req.subject,
            teacher_id: teachers[0]?.teacher_id,
            teacher_name: teachers[0]?.teacher_name,
            message: teachers.length === 0
              ? `No teacher assigned for ${req.subject} in Class ${class_year}-${section} — ${remainingPeriods - singlePlaced} period(s) unscheduled`
              : `Could not place all ${periodsNeeded} periods for ${req.subject} in Class ${class_year}-${section} — teacher not free`,
          })
        }
      }
    }

    // Teacher workload summary
    const teacherPeriodCount = new Map<string, { teacher_name: string; count: number }>()
    for (const entry of allEntries) {
      if (!entry.teacher_id || entry.subject_type === 'BREAK' || entry.subject_type === 'LUNCH' || entry.subject_type === 'ASSEMBLY') continue
      if (!teacherPeriodCount.has(entry.teacher_id)) {
        teacherPeriodCount.set(entry.teacher_id, { teacher_name: entry.teacher_name ?? '', count: 0 })
      }
      teacherPeriodCount.get(entry.teacher_id)!.count++
    }

    const teacher_workload = [...teacherPeriodCount.entries()].map(([teacher_id, { teacher_name, count }]) => {
      const overloaded = count > 25
      if (overloaded) {
        conflicts.push({
          type: 'TEACHER_OVERLOADED', severity: 'WARNING',
          class_year: 0, section: '', day: '', period: 0,
          teacher_id, teacher_name,
          message: `${teacher_name}: ${count} periods/week (recommended max: 25)`,
        })
      }
      return { teacher_id, teacher_name, periods_per_week: count, is_overloaded: overloaded }
    })

    const totalRegular = allEntries.filter(e => e.period_type === 'REGULAR').length
    const filled = allEntries.filter(e => e.period_type === 'REGULAR' && e.teacher_id !== null && e.subject !== 'FREE').length
    const errorSlots = conflicts.filter(c => c.severity === 'ERROR').length

    this.logger.info({ correlationId, schoolId, entries: allEntries.length, conflicts: conflicts.length }, 'TimetableService.generate DONE')

    return {
      entries: allEntries,
      conflicts,
      teacher_workload,
      slot_utilization: {
        total_slots: totalRegular,
        filled_slots: filled,
        free_slots: totalRegular - filled,
        conflict_slots: errorSlots,
      },
    }
  }

  async confirm(
    schoolId: string, academicYearId: string,
    entries: TimetableSlotEntry[], conflictCount: number,
    generationId: string | null, correlationId: string,
  ): Promise<number> {
    return this.repo.saveConfirmedTimetable(schoolId, academicYearId, entries, conflictCount, generationId, correlationId)
  }

  async upsertSlot(schoolId: string, academicYearId: string, entry: TimetableSlotEntry, correlationId: string): Promise<TimetableSlotEntry> {
    return this.repo.upsertSlot(schoolId, academicYearId, entry, correlationId)
  }

  async deleteSlot(schoolId: string, slotId: string, correlationId: string): Promise<void> {
    return this.repo.deleteSlot(schoolId, slotId, correlationId)
  }
}
