import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { FastifyBaseLogger } from 'fastify'
import { DatabaseError } from '../utils/errors.js'
import type {
  PeriodConfigRow, AssemblyConfig, TimetableRequirement,
  TimetableConfig, TimetableSlotEntry, TimetableStatus, TeacherSubjectAssignment,
} from '../types/common.js'

export class TimetableRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: FastifyBaseLogger,
  ) {}

  async getConfig(schoolId: string, academicYearId: string, correlationId: string): Promise<TimetableConfig> {
    this.logger.debug({ correlationId, schoolId }, 'TimetableRepository.getConfig')

    const [pRes, aRes, rRes] = await Promise.all([
      (this.supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (a: string, b: string) => {
              eq: (a: string, b: string) => {
                order: (col: string) => Promise<{ data: unknown[] | null; error: { message: string; code: string } | null }>
              }
            }
          }
        }
      })
        .from('school_period_config')
        .select('day_of_week, is_working_day, school_start_time, school_end_time, period_duration_minutes, short_break_after_periods, short_break_duration_min, lunch_after_period, lunch_duration_minutes')
        .eq('school_id', schoolId)
        .eq('academic_year_id', academicYearId)
        .order('day_of_week'),

      (this.supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (a: string, b: string) => {
              eq: (a: string, b: string) => {
                single: () => Promise<{ data: unknown | null; error: { message: string; code: string } | null }>
              }
            }
          }
        }
      })
        .from('school_assembly_config')
        .select('include_in_schedule, day_of_week, duration_minutes, position')
        .eq('school_id', schoolId)
        .eq('academic_year_id', academicYearId)
        .single(),

      (this.supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (a: string, b: string) => {
              eq: (a: string, b: string) => {
                order: (col: string) => {
                  order: (col: string) => {
                    order: (col: string) => Promise<{ data: unknown[] | null; error: { message: string; code: string } | null }>
                  }
                }
              }
            }
          }
        }
      })
        .from('timetable_requirements')
        .select('id, class_year, subject, subject_type, eca_category, periods_per_week, needs_double_period, double_period_count, preferred_position, teacher_id, display_name, color_hex')
        .eq('school_id', schoolId)
        .eq('academic_year_id', academicYearId)
        .order('class_year')
        .order('subject_type')
        .order('subject'),
    ])

    if (pRes.error && pRes.error.code !== 'PGRST116') throw new DatabaseError(pRes.error.message, { correlationId })
    if (rRes.error) throw new DatabaseError(rRes.error.message, { correlationId })

    // Enrich requirements with teacher names
    const requirements = (rRes.data ?? []) as TimetableRequirement[]
    const teacherIds = [...new Set(requirements.filter(r => r.teacher_id).map(r => r.teacher_id!))]
    if (teacherIds.length > 0) {
      const { data: teachers } = await this.supabase
        .from('teachers')
        .select('id, full_name')
        .in('id', teacherIds)
      const teacherMap = new Map((teachers ?? []).map(t => [t.id, t.full_name]))
      requirements.forEach(r => {
        if (r.teacher_id) r.teacher_name = teacherMap.get(r.teacher_id) ?? undefined
      })
    }

    // Load teacher-subject assignments from enrollment data (always fresh)
    const rawAssignments = await this.getTeacherSubjectAssignments(schoolId, academicYearId, correlationId)
    const teacher_assignments: TeacherSubjectAssignment[] = rawAssignments.map(a => ({
      subject: a.subject,
      class_year: a.class_year,
      teacher_id: a.teacher_id,
      teacher_name: a.teacher_name,
    }))

    return {
      period_config: (pRes.data ?? []) as PeriodConfigRow[],
      assembly_config: aRes.data ? (aRes.data as AssemblyConfig) : null,
      requirements,
      teacher_assignments,
    }
  }

  async savePeriodConfig(schoolId: string, academicYearId: string, rows: PeriodConfigRow[], correlationId: string): Promise<void> {
    this.logger.debug({ correlationId, schoolId }, 'TimetableRepository.savePeriodConfig')
    const inserts = rows.map(r => ({ ...r, school_id: schoolId, academic_year_id: academicYearId }))
    const { error } = await (this.supabase as unknown as {
      from: (t: string) => {
        upsert: (d: object[], o: object) => Promise<{ error: { message: string } | null }>
      }
    })
      .from('school_period_config')
      .upsert(inserts, { onConflict: 'school_id,academic_year_id,day_of_week' })
    if (error) throw new DatabaseError(error.message, { correlationId })
  }

  async saveAssemblyConfig(schoolId: string, academicYearId: string, cfg: AssemblyConfig, correlationId: string): Promise<void> {
    this.logger.debug({ correlationId, schoolId }, 'TimetableRepository.saveAssemblyConfig')
    const { error } = await (this.supabase as unknown as {
      from: (t: string) => {
        upsert: (d: object, o: object) => Promise<{ error: { message: string } | null }>
      }
    })
      .from('school_assembly_config')
      .upsert({ ...cfg, school_id: schoolId, academic_year_id: academicYearId }, { onConflict: 'school_id,academic_year_id' })
    if (error) throw new DatabaseError(error.message, { correlationId })
  }

  async saveRequirements(schoolId: string, academicYearId: string, reqs: TimetableRequirement[], correlationId: string): Promise<void> {
    this.logger.debug({ correlationId, schoolId, count: reqs.length }, 'TimetableRepository.saveRequirements')
    const inserts = reqs.map(r => ({
      school_id: schoolId,
      academic_year_id: academicYearId,
      class_year: r.class_year,
      subject: r.subject,
      subject_type: r.subject_type,
      eca_category: r.eca_category ?? null,
      periods_per_week: r.periods_per_week,
      needs_double_period: r.needs_double_period,
      double_period_count: r.double_period_count,
      preferred_position: r.preferred_position,
      teacher_id: r.teacher_id ?? null,
      display_name: r.display_name ?? null,
      color_hex: r.color_hex,
    }))
    const { error } = await (this.supabase as unknown as {
      from: (t: string) => {
        upsert: (d: object[], o: object) => Promise<{ error: { message: string } | null }>
      }
    })
      .from('timetable_requirements')
      .upsert(inserts, { onConflict: 'school_id,academic_year_id,class_year,subject' })
    if (error) throw new DatabaseError(error.message, { correlationId })
  }

  async getStatus(schoolId: string, academicYearId: string, correlationId: string): Promise<TimetableStatus> {
    this.logger.debug({ correlationId, schoolId }, 'TimetableRepository.getStatus')

    const [genRes, sectionsRes] = await Promise.all([
      (this.supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (a: string, b: string) => {
              eq: (a: string, b: string) => {
                eq: (a: string, b: string) => {
                  single: () => Promise<{ data: unknown | null; error: unknown }>
                }
              }
            }
          }
        }
      })
        .from('timetable_generations')
        .select('generated_at, conflict_count, status')
        .eq('school_id', schoolId)
        .eq('academic_year_id', academicYearId)
        .eq('status', 'CONFIRMED')
        .single(),
      this.supabase
        .from('student_yearly_progress')
        .select('class_year, section')
        .eq('academic_year_id', academicYearId),
    ])

    const gen = genRes.data as { generated_at: string; conflict_count: number } | null
    const rawSections = (sectionsRes.data ?? []) as Array<{ class_year: number; section: string }>
    const seen = new Set<string>()
    const class_sections = rawSections.filter(s => {
      const key = `${s.class_year}-${s.section}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).sort((a, b) => a.class_year - b.class_year || a.section.localeCompare(b.section))

    return {
      has_confirmed_timetable: !!gen,
      last_generated_at: gen ? gen.generated_at : null,
      conflict_count: gen ? gen.conflict_count : 0,
      class_sections,
    }
  }

  async getTimetableForClass(schoolId: string, academicYearId: string, classYear: number, section: string, correlationId: string): Promise<TimetableSlotEntry[]> {
    this.logger.debug({ correlationId, schoolId, classYear, section }, 'TimetableRepository.getTimetableForClass')
    const { data, error } = await this.supabase
      .from('timetable_slots')
      .select('id, school_id, academic_year_id, class_year, section, day_of_week, period_number, start_time, end_time, subject, teacher_id, period_type, room_number, is_double_period, double_period_end_time, subject_type')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .eq('class_year', classYear)
      .eq('section', section)
      .order('day_of_week')
      .order('period_number')
    if (error) throw new DatabaseError(error.message, { correlationId })

    const entries = (data ?? []) as unknown as TimetableSlotEntry[]
    await this.enrichTeacherNames(entries, correlationId)
    return entries
  }

  async getTimetableForTeacher(schoolId: string, academicYearId: string, teacherId: string, correlationId: string): Promise<TimetableSlotEntry[]> {
    this.logger.debug({ correlationId, schoolId, teacherId }, 'TimetableRepository.getTimetableForTeacher')
    const { data, error } = await this.supabase
      .from('timetable_slots')
      .select('id, school_id, academic_year_id, class_year, section, day_of_week, period_number, start_time, end_time, subject, teacher_id, period_type, room_number, is_double_period, double_period_end_time, subject_type')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .eq('teacher_id', teacherId)
      .order('day_of_week')
      .order('period_number')
    if (error) throw new DatabaseError(error.message, { correlationId })
    const entries = (data ?? []) as unknown as TimetableSlotEntry[]
    await this.enrichTeacherNames(entries, correlationId)
    return entries
  }

  async saveConfirmedTimetable(
    schoolId: string, academicYearId: string,
    entries: TimetableSlotEntry[], conflictCount: number, generationId: string | null,
    correlationId: string,
  ): Promise<number> {
    this.logger.debug({ correlationId, schoolId, count: entries.length }, 'TimetableRepository.saveConfirmedTimetable')

    // Mark existing CONFIRMED as SUPERSEDED
    await (this.supabase as unknown as {
      from: (t: string) => {
        update: (d: object) => {
          eq: (a: string, b: string) => {
            eq: (a: string, b: string) => {
              eq: (a: string, b: string) => Promise<{ error: unknown }>
            }
          }
        }
      }
    })
      .from('timetable_generations')
      .update({ status: 'SUPERSEDED' })
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .eq('status', 'CONFIRMED')

    // Delete existing slots
    await this.supabase
      .from('timetable_slots')
      .delete()
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)

    if (entries.length === 0) return 0

    // Insert new slots in batches of 500
    const batchSize = 500
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize).map(e => ({
        school_id: schoolId,
        academic_year_id: academicYearId,
        class_year: e.class_year,
        section: e.section,
        day_of_week: e.day_of_week as never,
        period_number: e.period_number,
        start_time: e.start_time,
        end_time: e.end_time,
        subject: e.subject,
        teacher_id: e.teacher_id ?? null,
        period_type: e.period_type,
        room_number: e.room_number ?? null,
        is_double_period: e.is_double_period,
        double_period_end_time: e.double_period_end_time ?? null,
        subject_type: e.subject_type,
      }))
      const { error } = await this.supabase.from('timetable_slots').insert(batch as never)
      if (error) throw new DatabaseError(error.message, { correlationId })
    }

    // Save generation record
    const genData = {
      school_id: schoolId,
      academic_year_id: academicYearId,
      status: 'CONFIRMED',
      conflict_count: conflictCount,
      total_entries: entries.length,
    }
    if (generationId) {
      await (this.supabase as unknown as {
        from: (t: string) => {
          update: (d: object) => {
            eq: (a: string, b: string) => Promise<{ error: unknown }>
          }
        }
      })
        .from('timetable_generations')
        .update({ status: 'CONFIRMED', conflict_count: conflictCount, total_entries: entries.length })
        .eq('id', generationId)
    } else {
      await (this.supabase as unknown as {
        from: (t: string) => {
          insert: (d: object) => Promise<{ error: unknown }>
        }
      })
        .from('timetable_generations')
        .insert(genData)
    }

    return entries.length
  }

  async upsertSlot(schoolId: string, academicYearId: string, entry: TimetableSlotEntry, correlationId: string): Promise<TimetableSlotEntry> {
    this.logger.debug({ correlationId, schoolId }, 'TimetableRepository.upsertSlot')

    // Conflict check: teacher busy elsewhere
    if (entry.teacher_id) {
      const { data: conflict } = await this.supabase
        .from('timetable_slots')
        .select('id, class_year, section')
        .eq('school_id', schoolId)
        .eq('academic_year_id', academicYearId)
        .eq('teacher_id', entry.teacher_id)
        .eq('day_of_week', entry.day_of_week as never)
        .eq('period_number', entry.period_number)
        .neq('class_year', entry.class_year)

      if (conflict && conflict.length > 0) {
        const c = conflict[0] as { class_year: number; section: string }
        throw new DatabaseError(`TEACHER_CONFLICT:${c.class_year}-${c.section}`, { correlationId })
      }
    }

    const row = {
      school_id: schoolId,
      academic_year_id: academicYearId,
      class_year: entry.class_year,
      section: entry.section,
      day_of_week: entry.day_of_week as never,
      period_number: entry.period_number,
      start_time: entry.start_time,
      end_time: entry.end_time,
      subject: entry.subject,
      teacher_id: entry.teacher_id ?? null,
      period_type: entry.period_type,
      room_number: entry.room_number ?? null,
      is_double_period: entry.is_double_period,
      double_period_end_time: entry.double_period_end_time ?? null,
      subject_type: entry.subject_type,
    }

    const { data, error } = await this.supabase
      .from('timetable_slots')
      .upsert(row as never, { onConflict: 'academic_year_id,school_id,class_year,section,day_of_week,period_number' })
      .select()
      .single()
    if (error) throw new DatabaseError(error.message, { correlationId })
    return data as unknown as TimetableSlotEntry
  }

  async deleteSlot(schoolId: string, slotId: string, correlationId: string): Promise<void> {
    this.logger.debug({ correlationId, schoolId, slotId }, 'TimetableRepository.deleteSlot')
    const { error } = await this.supabase
      .from('timetable_slots')
      .delete()
      .eq('id', slotId)
      .eq('school_id', schoolId)
    if (error) throw new DatabaseError(error.message, { correlationId })
  }

  async getTeacherSubjectAssignments(schoolId: string, academicYearId: string, correlationId: string): Promise<Array<{ teacher_id: string; teacher_name: string; subject: string; class_year: number; section: string | null }>> {
    this.logger.debug({ correlationId, schoolId }, 'TimetableRepository.getTeacherSubjectAssignments')
    // teacher_subject_assignments has no direct teacher_id — join via assignment_id → teacher_school_assignments → teachers
    const { data, error } = await this.supabase
      .from('teacher_subject_assignments')
      .select('subject, class_year, section, teacher_school_assignments!inner(teacher_id, teachers!inner(full_name))')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
    if (error) {
      this.logger.warn({ correlationId, error: error.message }, 'getTeacherSubjectAssignments failed — proceeding without teacher map')
      return []
    }
    return (data ?? []).map((d: unknown) => {
      const row = d as {
        subject: string
        class_year: number
        section: string | null
        teacher_school_assignments: { teacher_id: string; teachers: { full_name: string } }
      }
      const tsa = row.teacher_school_assignments
      return { teacher_id: tsa.teacher_id, teacher_name: tsa.teachers.full_name, subject: row.subject, class_year: row.class_year, section: row.section }
    })
  }

  async getClassSections(academicYearId: string, correlationId: string): Promise<Array<{ class_year: number; section: string }>> {
    const { data, error } = await this.supabase
      .from('student_yearly_progress')
      .select('class_year, section')
      .eq('academic_year_id', academicYearId)
    if (error) throw new DatabaseError(error.message, { correlationId })
    const seen = new Set<string>()
    return (data ?? []).filter((s: { class_year: number; section: string }) => {
      const key = `${s.class_year}-${s.section}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).sort((a: { class_year: number; section: string }, b: { class_year: number; section: string }) =>
      a.class_year - b.class_year || a.section.localeCompare(b.section)
    ) as Array<{ class_year: number; section: string }>
  }

  private async enrichTeacherNames(entries: TimetableSlotEntry[], _correlationId: string): Promise<void> {
    const teacherIds = [...new Set(entries.filter(e => e.teacher_id).map(e => e.teacher_id!))]
    if (teacherIds.length === 0) return
    const { data: teachers } = await this.supabase.from('teachers').select('id, full_name').in('id', teacherIds)
    const map = new Map((teachers ?? []).map(t => [t.id, t.full_name]))
    entries.forEach(e => { if (e.teacher_id) e.teacher_name = map.get(e.teacher_id) ?? undefined })
  }
}
