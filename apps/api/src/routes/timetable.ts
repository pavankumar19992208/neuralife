import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { TimetableService } from '../services/timetable.service.js'
import { EnrollmentRepository } from '../repositories/enrollment.repository.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { requireRole } from '../middleware/roleGuard.js'
import { UserRole } from '../types/common.js'
import { DatabaseError, ValidationError, ForbiddenError } from '../utils/errors.js'
import logger from '../lib/logger.js'
import type { TimetableSlotEntry } from '../types/common.js'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const PeriodConfigRowSchema = z.object({
  day_of_week: z.string(),
  is_working_day: z.boolean(),
  school_start_time: z.string(),
  school_end_time: z.string(),
  period_duration_minutes: z.number().int().min(30).max(90).default(45),
  short_break_after_periods: z.array(z.number()).default([]),
  short_break_duration_min: z.number().int().default(10),
  lunch_after_period: z.number().int().nullable().default(null),
  lunch_duration_minutes: z.number().int().default(30),
})

const AssemblyConfigSchema = z.object({
  include_in_schedule: z.boolean(),
  day_of_week: z.string(),
  duration_minutes: z.number().int().min(10).max(60).default(20),
  position: z.enum(['BEFORE_FIRST', 'FIRST_PERIOD']).default('BEFORE_FIRST'),
})

const RequirementSchema = z.object({
  class_year: z.number().int().min(1).max(12),
  subject: z.string().min(1).max(100),
  subject_type: z.enum(['ACADEMIC', 'ECA']),
  eca_category: z.string().nullable().optional(),
  periods_per_week: z.number().int().min(0).max(15),
  needs_double_period: z.boolean().default(false),
  double_period_count: z.number().int().default(0),
  preferred_position: z.enum(['FIRST', 'LAST', 'FIRST_OR_LAST', 'ANY']).default('ANY'),
  teacher_id: z.string().uuid().nullable().optional(),
  display_name: z.string().nullable().optional(),
  color_hex: z.string().default('#6366f1'),
})

const SlotEntrySchema = z.object({
  id: z.string().uuid().optional(),
  class_year: z.number().int().min(1).max(12),
  section: z.string().min(1),
  day_of_week: z.string(),
  period_number: z.number().int(),
  start_time: z.string(),
  end_time: z.string(),
  subject: z.string(),
  subject_type: z.enum(['ACADEMIC', 'ECA', 'BREAK', 'LUNCH', 'ASSEMBLY', 'FREE']),
  teacher_id: z.string().uuid().nullable(),
  teacher_name: z.string().optional(),
  is_double_period: z.boolean().default(false),
  double_period_end_time: z.string().nullable().optional(),
  room_number: z.string().nullable().optional(),
  period_type: z.string().default('REGULAR'),
})

// ─── Routes ───────────────────────────────────────────────────────────────────

const routes: FastifyPluginAsync = async (fastify) => {
  const prefix = '/api/v1/timetable'
  const enrollRepo = new EnrollmentRepository(supabaseAdmin, logger)

  const getSchoolAndYear = async (request: { jwtPayload: { school_id: string } }) => {
    const { school_id } = request.jwtPayload
    // getCurrentAcademicYear returns string (the id directly)
    const academic_year_id = await enrollRepo.getCurrentAcademicYear(school_id, 'timetable-routes')
    return { school_id, academic_year_id }
  }

  // GET /api/v1/timetable/status
  fastify.get(`${prefix}/status`, {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const svc = new TimetableService(supabaseAdmin, fastify.log)
    const { school_id, academic_year_id } = await getSchoolAndYear(request as never)
    const status = await svc.getStatus(school_id, academic_year_id, correlationId)
    return reply.send({ data: status })
  })

  // GET /api/v1/timetable/config
  fastify.get(`${prefix}/config`, {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const svc = new TimetableService(supabaseAdmin, fastify.log)
    const { school_id, academic_year_id } = await getSchoolAndYear(request as never)
    const config = await svc.getConfig(school_id, academic_year_id, correlationId)
    return reply.send({ data: config })
  })

  // PUT /api/v1/timetable/config/period
  fastify.put(`${prefix}/config/period`, {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const svc = new TimetableService(supabaseAdmin, fastify.log)
    const { school_id, academic_year_id } = await getSchoolAndYear(request as never)
    const rows = z.array(PeriodConfigRowSchema).parse(request.body)
    await svc.saveConfig(school_id, academic_year_id, rows, null, [], correlationId)
    return reply.send({ data: { saved: rows.length } })
  })

  // PUT /api/v1/timetable/config/assembly
  fastify.put(`${prefix}/config/assembly`, {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const svc = new TimetableService(supabaseAdmin, fastify.log)
    const { school_id, academic_year_id } = await getSchoolAndYear(request as never)
    const cfg = AssemblyConfigSchema.parse(request.body)
    await svc.saveConfig(school_id, academic_year_id, [], cfg, [], correlationId)
    return reply.send({ data: { saved: true } })
  })

  // PUT /api/v1/timetable/config/requirements
  fastify.put(`${prefix}/config/requirements`, {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const svc = new TimetableService(supabaseAdmin, fastify.log)
    const { school_id, academic_year_id } = await getSchoolAndYear(request as never)
    const reqs = z.array(RequirementSchema).parse(request.body)
    await svc.saveConfig(school_id, academic_year_id, [], null, reqs, correlationId)
    return reply.send({ data: { saved: reqs.length } })
  })

  // GET /api/v1/timetable/entries
  fastify.get(`${prefix}/entries`, {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const svc = new TimetableService(supabaseAdmin, fastify.log)
    const { school_id, academic_year_id } = await getSchoolAndYear(request as never)
    const { class_year, section } = z.object({
      class_year: z.string().transform(Number),
      section: z.string(),
    }).parse(request.query)
    const entries = await svc.getTimetableForClass(school_id, academic_year_id, class_year, section, correlationId)
    return reply.send({ data: entries })
  })

  // POST /api/v1/timetable/config — save all config pieces at once
  fastify.post(`${prefix}/config`, {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const svc = new TimetableService(supabaseAdmin, fastify.log)
    const { school_id, academic_year_id } = await getSchoolAndYear(request as never)
    const body = z.object({
      period_config: z.array(PeriodConfigRowSchema).optional(),
      assembly_config: AssemblyConfigSchema.nullable().optional(),
      requirements: z.array(RequirementSchema).optional(),
    }).parse(request.body)
    await svc.saveConfig(
      school_id,
      academic_year_id,
      body.period_config ?? [],
      body.assembly_config ?? null,
      body.requirements ?? [],
      correlationId,
    )
    const config = await svc.getConfig(school_id, academic_year_id, correlationId)
    return reply.send({ data: config })
  })

  // GET /api/v1/timetable/teacher/:teacherId
  fastify.get(`${prefix}/teacher/:teacherId`, {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const svc = new TimetableService(supabaseAdmin, fastify.log)
    const { school_id, academic_year_id } = await getSchoolAndYear(request as never)
    const { teacherId } = z.object({ teacherId: z.string().uuid() }).parse(request.params)
    const { teacher_id: myTeacherId, role } = (request as never as { jwtPayload: { teacher_id?: string; role: UserRole } }).jwtPayload
    if (role === UserRole.TEACHER && myTeacherId !== teacherId) {
      throw new ForbiddenError('Teachers can only view their own timetable')
    }
    const entries = await svc.getTimetableForTeacher(school_id, academic_year_id, teacherId, correlationId)
    return reply.send({ data: entries })
  })

  // POST /api/v1/timetable/generate
  fastify.post(`${prefix}/generate`, {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const svc = new TimetableService(supabaseAdmin, fastify.log)
    const { school_id, academic_year_id } = await getSchoolAndYear(request as never)
    const { seed, class_years } = z.object({
      seed: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? String(v) : undefined),
      class_years: z.array(z.number()).optional(),
    }).parse(request.body ?? {})
    const result = await svc.generate(school_id, academic_year_id, seed, correlationId)
    void class_years
    logger.info({ correlationId, school_id, entries: result.entries.length, conflicts: result.conflicts.length }, 'Timetable generated')
    return reply.send({ data: result })
  })

  // POST /api/v1/timetable/confirm
  fastify.post(`${prefix}/confirm`, {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const svc = new TimetableService(supabaseAdmin, fastify.log)
    const { school_id, academic_year_id } = await getSchoolAndYear(request as never)
    const body = z.object({
      entries: z.array(SlotEntrySchema),
      conflict_count: z.number().int().default(0),
      generation_id: z.string().uuid().nullable().optional(),
    }).parse(request.body)

    const saved = await svc.confirm(
      school_id, academic_year_id,
      body.entries as TimetableSlotEntry[],
      body.conflict_count,
      body.generation_id ?? null,
      correlationId,
    )
    logger.info({ correlationId, school_id, saved }, 'Timetable confirmed and published')
    return reply.send({ data: { message: 'Timetable confirmed', entries_saved: saved } })
  })

  // PUT /api/v1/timetable/entry
  fastify.put(`${prefix}/entry`, {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const svc = new TimetableService(supabaseAdmin, fastify.log)
    const { school_id, academic_year_id } = await getSchoolAndYear(request as never)
    const entry = SlotEntrySchema.parse(request.body) as TimetableSlotEntry

    try {
      const updated = await svc.upsertSlot(school_id, academic_year_id, entry, correlationId)
      return reply.send({ data: updated })
    } catch (err) {
      if (err instanceof DatabaseError && err.message.startsWith('TEACHER_CONFLICT:')) {
        const conflictingClass = err.message.split(':')[1]
        return reply.code(409).send({
          error: `Teacher already assigned to Class ${conflictingClass} at this day and period`,
          code: 'TEACHER_CONFLICT',
          conflicting_class: conflictingClass,
          correlationId,
        })
      }
      throw err
    }
  })

  // DELETE /api/v1/timetable/entry/:entryId
  fastify.delete(`${prefix}/entry/:entryId`, {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const svc = new TimetableService(supabaseAdmin, fastify.log)
    const { school_id } = await getSchoolAndYear(request as never)
    const { entryId } = z.object({ entryId: z.string().uuid() }).parse(request.params)
    await svc.deleteSlot(school_id, entryId, correlationId)
    return reply.code(204).send()
  })
}

// Suppress unused import warnings
void ValidationError

export default routes
