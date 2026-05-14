import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { TeacherService } from '../services/teacher.service.js'
import { TeacherRepository } from '../repositories/teacher.repository.js'
import { SalaryRepository } from '../repositories/salary.repository.js'
import { LeaveRepository } from '../repositories/leave.repository.js'
import { EnrollmentRepository } from '../repositories/enrollment.repository.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { requireRole } from '../middleware/roleGuard.js'
import { ValidationError } from '../utils/errors.js'
import { UserRole } from '../types/common.js'
import logger from '../lib/logger.js'

// ─── Zod Schemas ──────────────────────────────────────────────────────────

const CreateTeacherSchema = z.object({
  full_name: z.string().min(2).max(100).trim(),
  mobile: z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian mobile'),
  email: z.string().email().optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  pan_number: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional(),
  aadhaar_hash: z.string().length(64).regex(/^[a-f0-9]{64}$/).optional(),
  teaching_qualification: z.enum(['B.Ed', 'D.Ed', 'M.Ed', 'None']).optional(),
  designation: z.enum(['PRINCIPAL', 'VP', 'HM', 'PGT', 'TGT', 'PRT', 'PT', 'ADMIN', 'SUPPORT']),
  employment_type: z.enum(['REGULAR', 'CONTRACT', 'PART_TIME', 'VISITING']),
  joining_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  employee_id: z.string().optional(),
  subject_assignments: z
    .array(
      z.object({
        class_year: z.number().int().min(1).max(10),
        section: z.string().regex(/^[A-F]$/),
        subject: z.string().min(1),
        is_class_teacher: z.boolean(),
      }),
    )
    .max(10)
    .default([]),
})

const UpdateTeacherSchema = z
  .object({
    full_name: z.string().min(2).max(100).trim().optional(),
    email: z.string().email().optional(),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    gender: z.enum(['Male', 'Female', 'Other']).optional(),
    pan_number: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional(),
    teaching_qualification: z.enum(['B.Ed', 'D.Ed', 'M.Ed', 'None']).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'At least one field must be provided')

const CreateSalarySchema = z.object({
  basic: z.number().positive(),
  hra_type: z.enum(['PERCENT', 'FIXED']),
  hra_value: z.number().min(0),
  da_type: z.enum(['PERCENT', 'FIXED']),
  da_value: z.number().min(0),
  transport_allowance: z.number().min(0).default(0),
  special_allowance: z.number().min(0).default(0),
  pf_applicable: z.boolean().default(false),
  esi_applicable: z.boolean().default(false),
  pt_applicable: z.boolean().default(true),
  bank_account_number: z.string().optional(),
  ifsc_code: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/).optional(),
  bank_name: z.string().optional(),
  account_holder_name: z.string().optional(),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const LeaveActionSchema = z
  .object({
    action: z.enum(['APPROVE', 'REJECT']),
    rejection_reason: z.string().optional(),
  })
  .refine((d) => d.action !== 'REJECT' || !!d.rejection_reason, {
    message: 'Rejection reason required',
    path: ['rejection_reason'],
  })

const ListTeachersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const TeacherIdParamsSchema = z.object({
  teacherId: z.string().uuid('Invalid teacher ID'),
})

const LeaveParamsSchema = z.object({
  teacherId: z.string().uuid(),
  applicationId: z.string().uuid(),
})

// ─── Routes ───────────────────────────────────────────────────────────────

const teacherRoutes: FastifyPluginAsync = async (fastify) => {
  const teacherRepo = new TeacherRepository(supabaseAdmin, logger)
  const salaryRepo = new SalaryRepository(supabaseAdmin, logger)
  const leaveRepo = new LeaveRepository(supabaseAdmin, logger)
  const enrollmentRepo = new EnrollmentRepository(supabaseAdmin, logger)
  const teacherService = new TeacherService(teacherRepo, salaryRepo, leaveRepo, enrollmentRepo)

  // POST /api/v1/teachers — add a new teacher (PRINCIPAL only)
  fastify.post(
    '/api/v1/teachers',
    {
      preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL])],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const idempotencyKey = request.headers['x-idempotency-key'] as string | undefined
      if (!idempotencyKey) throw new ValidationError('x-idempotency-key header is required')

      const body = CreateTeacherSchema.parse(request.body)
      const { school_id, teacher_id } = request.jwtPayload

      logger.info({ correlationId, school_id, full_name: body.full_name }, 'POST /api/v1/teachers')

      const result = await teacherService.createTeacher(body, school_id, teacher_id, correlationId)

      return reply.code(201).send({
        data: { teacher_id: result.teacher_id, message: 'Teacher added successfully' },
      })
    },
  )

  // GET /api/v1/teachers — list teachers
  fastify.get(
    '/api/v1/teachers',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { page, limit } = ListTeachersQuerySchema.parse(request.query)
      const { school_id } = request.jwtPayload

      logger.info({ correlationId, school_id, page, limit }, 'GET /api/v1/teachers')

      const result = await teacherService.listTeachers(school_id, page, limit, correlationId)

      return reply.send({
        data: result.teachers,
        meta: { total: result.total, page, limit },
      })
    },
  )

  // GET /api/v1/teachers/:teacherId — full teacher profile
  fastify.get(
    '/api/v1/teachers/:teacherId',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { teacherId } = TeacherIdParamsSchema.parse(request.params)
      const { school_id, role } = request.jwtPayload

      logger.info({ correlationId, teacherId, school_id }, 'GET /api/v1/teachers/:teacherId')

      const teacher = await teacherService.getTeacherProfile(teacherId, school_id, role, correlationId)

      return reply.send({ data: teacher })
    },
  )

  // PUT /api/v1/teachers/:teacherId — update teacher basic info
  fastify.put(
    '/api/v1/teachers/:teacherId',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { teacherId } = TeacherIdParamsSchema.parse(request.params)
      const body = UpdateTeacherSchema.parse(request.body)
      const { school_id } = request.jwtPayload

      logger.info({ correlationId, teacherId, school_id }, 'PUT /api/v1/teachers/:teacherId')

      await teacherService.updateTeacher(teacherId, school_id, body, correlationId)

      return reply.send({ data: { message: 'Teacher updated' } })
    },
  )

  // DELETE /api/v1/teachers/:teacherId — soft delete (PRINCIPAL only)
  fastify.delete(
    '/api/v1/teachers/:teacherId',
    {
      preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL])],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { teacherId } = TeacherIdParamsSchema.parse(request.params)
      const confirmHeader = request.headers['x-confirm-delete'] as string | undefined

      if (confirmHeader !== 'yes') {
        throw new ValidationError('Add header x-confirm-delete: yes to confirm teacher deactivation')
      }

      const { school_id, teacher_id } = request.jwtPayload

      logger.info({ correlationId, teacherId, school_id }, 'DELETE /api/v1/teachers/:teacherId')

      await teacherService.softDeleteTeacher(teacherId, school_id, teacher_id, correlationId)

      return reply.code(204).send()
    },
  )

  // GET /api/v1/teachers/:teacherId/salary — current salary (PRINCIPAL only)
  fastify.get(
    '/api/v1/teachers/:teacherId/salary',
    {
      preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL])],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { teacherId } = TeacherIdParamsSchema.parse(request.params)
      const { school_id } = request.jwtPayload

      logger.info({ correlationId, teacherId }, 'GET /api/v1/teachers/:teacherId/salary')

      const salary = await salaryRepo.findCurrent(teacherId, school_id, correlationId)

      return reply.send({ data: salary })
    },
  )

  // POST /api/v1/teachers/:teacherId/salary — set salary structure (PRINCIPAL only)
  fastify.post(
    '/api/v1/teachers/:teacherId/salary',
    {
      preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL])],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { teacherId } = TeacherIdParamsSchema.parse(request.params)
      const body = CreateSalarySchema.parse(request.body)
      const { school_id, teacher_id } = request.jwtPayload

      logger.info({ correlationId, teacherId }, 'POST /api/v1/teachers/:teacherId/salary')

      const gross = await teacherService.setSalaryStructure(
        teacherId,
        school_id,
        body,
        teacher_id,
        correlationId,
      )

      return reply.code(201).send({
        data: { message: 'Salary structure saved', gross_monthly: gross },
      })
    },
  )

  // GET /api/v1/teachers/:teacherId/leave — leave balances + history
  fastify.get(
    '/api/v1/teachers/:teacherId/leave',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { teacherId } = TeacherIdParamsSchema.parse(request.params)
      const { school_id } = request.jwtPayload

      const yearLabel = await teacherRepo.computeLeaveYearLabel(school_id, correlationId)
      const result = await leaveRepo.getBalancesAndHistory(teacherId, school_id, yearLabel, correlationId)

      return reply.send({ data: result })
    },
  )

  // PUT /api/v1/teachers/:teacherId/leave/:applicationId — approve or reject
  fastify.put(
    '/api/v1/teachers/:teacherId/leave/:applicationId',
    {
      preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL])],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { teacherId, applicationId } = LeaveParamsSchema.parse(request.params)
      const body = LeaveActionSchema.parse(request.body)
      const { school_id, teacher_id } = request.jwtPayload

      logger.info({ correlationId, teacherId, applicationId, action: body.action }, 'PUT leave action')

      const yearLabel = await teacherRepo.computeLeaveYearLabel(school_id, correlationId)

      if (body.action === 'APPROVE') {
        await leaveRepo.approveApplication(applicationId, school_id, teacher_id!, yearLabel, correlationId)
        return reply.send({ data: { message: 'Leave application approved' } })
      } else {
        await leaveRepo.rejectApplication(
          applicationId,
          school_id,
          teacher_id!,
          body.rejection_reason!,
          correlationId,
        )
        return reply.send({ data: { message: 'Leave application rejected' } })
      }
    },
  )
}

export default teacherRoutes
