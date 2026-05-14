import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AttendanceRepository } from '../repositories/attendance.repository.js'
import { EnrollmentRepository } from '../repositories/enrollment.repository.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { requireRole } from '../middleware/roleGuard.js'
import { ValidationError, ForbiddenError } from '../utils/errors.js'
import { UserRole } from '../types/common.js'
import logger from '../lib/logger.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIST(): string {
  const now = new Date()
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0]
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const GetClassAttendanceSchema = z.object({
  class_year: z.coerce.number().int().min(1).max(10),
  section: z.string().regex(/^[A-F]$/),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

const MarkAttendanceSchema = z.object({
  class_year: z.number().int().min(1).max(10),
  section: z.string().regex(/^[A-F]$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z
    .array(
      z.object({
        neura_id: z.string().min(1),
        status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'APPROVED_LEAVE']),
        reason: z.string().max(200).optional(),
      }),
    )
    .min(1, 'At least one attendance record is required'),
})

const CorrectAttendanceSchema = z.object({
  corrected_status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'APPROVED_LEAVE']),
  correction_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  reason: z.string().max(200).optional(),
})

const AttendanceIdParamsSchema = z.object({
  id: z.string().min(1),
})

const StudentAttendanceParamsSchema = z.object({
  neuraId: z.string().min(1),
})

const StudentAttendanceQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Format must be YYYY-MM')
    .optional(),
})

const AnalyticsQuerySchema = z.object({
  range: z.enum(['day', 'week', 'month', 'quarter']).default('day'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

// ─── Routes ───────────────────────────────────────────────────────────────────

const attendanceRoutes: FastifyPluginAsync = async (fastify) => {
  const attendanceRepo = new AttendanceRepository(supabaseAdmin, logger)
  const enrollmentRepo = new EnrollmentRepository(supabaseAdmin, logger)

  // GET /api/v1/attendance/class — class roster + existing records
  fastify.get(
    '/api/v1/attendance/class',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const query = GetClassAttendanceSchema.parse(request.query)
      const { school_id } = request.jwtPayload
      const date = query.date ?? todayIST()

      logger.info({ correlationId, school_id, ...query, date }, 'GET /api/v1/attendance/class')

      const academicYearId = await enrollmentRepo.getCurrentAcademicYear(school_id, correlationId)

      const result = await attendanceRepo.getClassWithStudents(
        school_id,
        academicYearId,
        query.class_year,
        query.section,
        date,
        correlationId,
      )

      return reply.send({ data: result })
    },
  )

  // POST /api/v1/attendance — mark daily attendance
  fastify.post(
    '/api/v1/attendance',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const body = MarkAttendanceSchema.parse(request.body)
      const { school_id, teacher_id } = request.jwtPayload

      if (!teacher_id) {
        throw new ValidationError('teacher_id is required to mark attendance')
      }

      logger.info(
        { correlationId, school_id, class_year: body.class_year, section: body.section, date: body.date },
        'POST /api/v1/attendance',
      )

      const academicYearId = await enrollmentRepo.getCurrentAcademicYear(school_id, correlationId)

      const result = await attendanceRepo.markAttendance(body, teacher_id, school_id, academicYearId, correlationId)

      return reply.code(201).send({
        data: result,
        meta: { message: 'Attendance marked successfully' },
      })
    },
  )

  // PATCH /api/v1/attendance/:id — correction with audit trail
  fastify.patch(
    '/api/v1/attendance/:id',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { id } = AttendanceIdParamsSchema.parse(request.params)
      const body = CorrectAttendanceSchema.parse(request.body)
      const { school_id, teacher_id } = request.jwtPayload

      if (!teacher_id) {
        throw new ValidationError('teacher_id is required to correct attendance')
      }

      logger.info({ correlationId, id, school_id }, 'PATCH /api/v1/attendance/:id')

      await attendanceRepo.createCorrection(
        id,
        school_id,
        body.corrected_status,
        body.correction_time ?? null,
        teacher_id,
        body.reason ?? null,
        correlationId,
      )

      return reply.send({ data: { message: 'Attendance correction recorded' } })
    },
  )

  // GET /api/v1/attendance/student/:neuraId — monthly calendar
  fastify.get(
    '/api/v1/attendance/student/:neuraId',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { neuraId } = StudentAttendanceParamsSchema.parse(request.params)
      const { month } = StudentAttendanceQuerySchema.parse(request.query)
      const { school_id, role, linked_neura_ids } = request.jwtPayload

      if (role === UserRole.PARENT) {
        if (!linked_neura_ids?.includes(neuraId)) {
          throw new ForbiddenError('Access denied to this student attendance')
        }
      }

      const yearMonth = month ?? todayIST().slice(0, 7)

      logger.info(
        { correlationId, neuraId, school_id, yearMonth },
        'GET /api/v1/attendance/student/:neuraId',
      )

      const result = await attendanceRepo.getStudentMonthlyAttendance(
        neuraId,
        school_id,
        yearMonth,
        correlationId,
      )

      return reply.send({ data: result })
    },
  )

  // GET /api/v1/attendance/analytics — school-wide analytics
  fastify.get(
    '/api/v1/attendance/analytics',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { range, date } = AnalyticsQuerySchema.parse(request.query)
      const { school_id } = request.jwtPayload
      const analyticsDate = date ?? todayIST()

      logger.info({ correlationId, school_id, range, date: analyticsDate }, 'GET /api/v1/attendance/analytics')

      const academicYearId = await enrollmentRepo.getCurrentAcademicYear(school_id, correlationId)

      const result = await attendanceRepo.getSchoolAttendanceAnalytics(
        school_id,
        academicYearId,
        range,
        analyticsDate,
        correlationId,
      )

      return reply.send({ data: result })
    },
  )
}

export default attendanceRoutes
