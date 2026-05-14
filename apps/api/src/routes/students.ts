import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { StudentService } from '../services/student.service.js'
import { StudentRepository } from '../repositories/student.repository.js'
import { EnrollmentRepository } from '../repositories/enrollment.repository.js'
import { TeacherRepository } from '../repositories/teacher.repository.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { requireRole } from '../middleware/roleGuard.js'
import { auditLog } from '../utils/audit.js'
import { ForbiddenError, ValidationError } from '../utils/errors.js'
import { UserRole } from '../types/common.js'
import logger from '../lib/logger.js'

// ─── Zod Schemas ──────────────────────────────────────────────────────────

const AdmitStudentSchema = z.object({
  full_name: z.string().min(2).max(100).trim(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  blood_group: z.string().max(5).optional(),
  caste_category: z.enum(['GENERAL', 'OBC', 'SC_ST', 'EWS', 'FREE']).optional(),
  aadhaar_hash: z
    .string()
    .length(64)
    .regex(/^[a-f0-9]{64}$/, 'Must be SHA-256 hex')
    .optional(),
  class_year: z.number().int().min(1).max(10),
  section: z.string().regex(/^[A-F]$/, 'Section must be A-F'),
  medium: z.enum(['ENGLISH', 'TELUGU']),
  board: z.string().optional(),
  parents: z
    .array(
      z.object({
        parent_name: z.string().min(2).max(100).trim(),
        relationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER']),
        mobile: z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian mobile number'),
        email: z.string().email().optional(),
        is_primary: z.boolean(),
      }),
    )
    .min(1, 'At least one parent contact is required'),
})

const UpdateStudentSchema = z
  .object({
    full_name: z.string().min(2).max(100).trim().optional(),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    gender: z.enum(['Male', 'Female', 'Other']).optional(),
    blood_group: z.string().max(5).optional(),
    caste_category: z.enum(['GENERAL', 'OBC', 'SC_ST', 'EWS', 'FREE']).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'At least one field must be provided')

const ListStudentsQuerySchema = z.object({
  class_year: z.coerce.number().int().min(1).max(10).optional(),
  section: z
    .string()
    .regex(/^[A-F]$/)
    .optional(),
  status: z.enum(['ACTIVE', 'ALUMNI', 'DEACTIVATED']).optional(),
  band: z.enum(['FOUNDATION', 'ELEMENTARY', 'MIDDLE', 'SECONDARY']).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const NeuraIdParamsSchema = z.object({
  neuraId: z.string().min(1),
})

// ─── Routes ───────────────────────────────────────────────────────────────

const studentRoutes: FastifyPluginAsync = async (fastify) => {
  const studentRepo = new StudentRepository(supabaseAdmin, logger)
  const enrollmentRepo = new EnrollmentRepository(supabaseAdmin, logger)
  const teacherRepo = new TeacherRepository(supabaseAdmin, logger)
  const studentService = new StudentService(studentRepo, enrollmentRepo, teacherRepo)

  // POST /api/v1/students — admit a new student
  fastify.post(
    '/api/v1/students',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId

      const idempotencyKey = request.headers['x-idempotency-key'] as string | undefined
      if (!idempotencyKey) {
        throw new ValidationError('x-idempotency-key header is required')
      }

      const body = AdmitStudentSchema.parse(request.body)
      const { school_id, teacher_id } = request.jwtPayload

      logger.info(
        { correlationId, school_id, full_name: body.full_name },
        'POST /api/v1/students',
      )

      const result = await studentService.admitStudent(
        body,
        school_id,
        teacher_id!,
        correlationId,
      )

      return reply.code(201).send({
        data: result,
        meta: { neura_id: result.neura_id, message: 'Student admitted successfully' },
      })
    },
  )

  // GET /api/v1/students — list students with filters
  fastify.get(
    '/api/v1/students',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const query = ListStudentsQuerySchema.parse(request.query)
      const { school_id } = request.jwtPayload

      logger.info({ correlationId, school_id, query }, 'GET /api/v1/students')

      const result = await studentService.listStudents(
        school_id,
        query,
        query.page,
        query.limit,
        correlationId,
      )

      return reply.send({
        data: result.students,
        meta: { total: result.total, page: result.page, limit: result.limit },
      })
    },
  )

  // GET /api/v1/students/:neuraId — full 360° profile
  fastify.get(
    '/api/v1/students/:neuraId',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { neuraId } = NeuraIdParamsSchema.parse(request.params)
      const { school_id, role, teacher_id, linked_neura_ids } = request.jwtPayload

      // Parents can only access their own linked children
      if (role === UserRole.PARENT) {
        if (!linked_neura_ids?.includes(neuraId)) {
          throw new ForbiddenError('Access denied to this student profile')
        }
      }

      logger.info({ correlationId, neuraId, school_id, role }, 'GET /api/v1/students/:neuraId')

      const student = await studentService.getStudent(
        neuraId,
        school_id,
        role,
        teacher_id,
        correlationId,
      )

      return reply.send({ data: student })
    },
  )

  // PUT /api/v1/students/:neuraId — update student basic info
  fastify.put(
    '/api/v1/students/:neuraId',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { neuraId } = NeuraIdParamsSchema.parse(request.params)
      const body = UpdateStudentSchema.parse(request.body)
      const { school_id } = request.jwtPayload

      logger.info({ correlationId, neuraId, school_id }, 'PUT /api/v1/students/:neuraId')

      await studentRepo.updateStudent(neuraId, school_id, body, correlationId)

      return reply.send({ data: { message: 'Student updated successfully' } })
    },
  )

  // DELETE /api/v1/students/:neuraId — soft delete (PRINCIPAL only)
  fastify.delete(
    '/api/v1/students/:neuraId',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { neuraId } = NeuraIdParamsSchema.parse(request.params)
      const confirmHeader = request.headers['x-confirm-delete'] as string | undefined

      if (confirmHeader !== 'yes') {
        throw new ValidationError(
          'Add header x-confirm-delete: yes to confirm student deactivation',
        )
      }

      const { school_id, teacher_id } = request.jwtPayload

      logger.info({ correlationId, neuraId, school_id }, 'DELETE /api/v1/students/:neuraId')

      await studentRepo.softDeleteStudent(neuraId, school_id, correlationId)

      await auditLog({
        event_type: 'STUDENT_DEACTIVATED',
        actor_id: teacher_id,
        actor_role: 'PRINCIPAL',
        school_id,
        target_neura_id: neuraId,
        target_table: 'students',
        result: 'SUCCESS',
        correlationId,
      })

      return reply.code(204).send()
    },
  )
}

export default studentRoutes
