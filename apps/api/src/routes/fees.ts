import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { FeeRepository } from '../repositories/fee.repository.js'
import { PaymentRepository } from '../repositories/payment.repository.js'
import { ReceiptRepository } from '../repositories/receipt.repository.js'
import { IdempotencyRepository } from '../repositories/idempotency.repository.js'
import { ConcessionRepository } from '../repositories/concession.repository.js'
import { CustomFeeHeadRepository } from '../repositories/custom-fee-head.repository.js'
import { EnrollmentRepository } from '../repositories/enrollment.repository.js'
import { FeeService } from '../services/fee.service.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { requireRole } from '../middleware/roleGuard.js'
import { ValidationError, ForbiddenError } from '../utils/errors.js'
import { UserRole } from '../types/common.js'
import logger from '../lib/logger.js'

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const NeuraIdParamsSchema = z.object({
  neuraId: z.string().min(1),
})

const PaymentIdParamsSchema = z.object({
  paymentId: z.string().min(1),
})

const ConcessionRuleIdParamsSchema = z.object({
  ruleId: z.string().uuid('Invalid rule ID'),
})

const CustomHeadIdParamsSchema = z.object({
  headId: z.string().uuid('Invalid head ID'),
})

const RecordPaymentSchema = z.object({
  neura_id: z.string().min(1),
  amount: z.number().positive('Amount must be positive'),
  payment_mode: z.enum(['CASH', 'UPI', 'CHEQUE', 'NEFT', 'ONLINE']),
  transaction_reference: z.string().max(100).optional(),
  notes: z.string().max(300).optional(),
  ledger_allocations: z
    .array(
      z.object({
        ledger_id: z.string().uuid(),
        amount: z.number().positive(),
      }),
    )
    .optional(),
})

const VoidPaymentSchema = z.object({
  reason: z.string().min(5, 'reason must be at least 5 characters'),
})

const UnpaidStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const UpdateFeeStructureSchema = z.object({
  rows: z.array(
    z.object({
      class_year: z.number().int().min(1).max(10),
      student_category: z.enum(['GENERAL', 'OBC', 'SC_ST', 'EWS', 'FREE']),
      admission_fee: z.number().min(0),
      development_fee: z.number().min(0),
      tuition_fee_monthly: z.number().min(0),
      neuralife_sub_monthly: z.number().min(0),
      exam_fee_per_term: z.number().min(0),
      transport_fee_monthly: z.number().min(0),
      smartpad_fee: z.number().min(0),
      late_fee_amount: z.number().min(0),
      late_fee_grace_days: z.number().int().min(0),
      fee_due_day_of_month: z.number().int().min(1).max(28),
    }),
  ).min(1),
})

const CreateConcessionRuleSchema = z.object({
  rule_name: z.string().min(2).max(100).trim(),
  concession_type: z.string().min(1),
  eligibility_note: z.string().max(300).nullable().default(null),
  applies_to_heads: z.array(z.string()).nullable().default(null),
  amount_type: z.enum(['PERCENT', 'FIXED']),
  concession_value: z.number().positive(),
  max_cap: z.number().positive().nullable().default(null),
  auto_apply: z.boolean().default(true),
})

const UpdateConcessionRuleSchema = z.object({
  rule_name: z.string().min(2).max(100).trim().optional(),
  eligibility_note: z.string().max(300).optional(),
  applies_to_heads: z.array(z.string()).optional(),
  amount_type: z.enum(['PERCENT', 'FIXED']).optional(),
  concession_value: z.number().positive().optional(),
  max_cap: z.number().positive().optional(),
  auto_apply: z.boolean().optional(),
  is_active: z.boolean().optional(),
})

const CreateCustomFeeHeadSchema = z.object({
  head_code: z.string().min(2).max(20).trim().toUpperCase(),
  display_name: z.string().min(2).max(100).trim(),
  description: z.string().max(300).nullable().default(null),
  collection_type: z.enum(['MONTHLY', 'TERMLY', 'ANNUAL', 'ONE_TIME']),
  amounts: z
    .array(
      z.object({
        class_year: z.number().int().min(1).max(10).nullable().default(null),
        student_category: z.string().nullable().default(null),
        amount: z.number().min(0),
      }),
    )
    .optional(),
})

const UpdateCustomFeeHeadSchema = z.object({
  display_name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(300).optional(),
  collection_type: z.enum(['MONTHLY', 'TERMLY', 'ANNUAL', 'ONE_TIME']).optional(),
  is_active: z.boolean().optional(),
  amounts: z
    .array(
      z.object({
        class_year: z.number().int().min(1).max(10).nullable().default(null),
        student_category: z.string().nullable().default(null),
        amount: z.number().min(0),
      }),
    )
    .optional(),
})

// ─── Routes ───────────────────────────────────────────────────────────────────

const feeRoutes: FastifyPluginAsync = async (fastify) => {
  const feeRepo = new FeeRepository(supabaseAdmin, logger)
  const paymentRepo = new PaymentRepository(supabaseAdmin, logger)
  const receiptRepo = new ReceiptRepository(supabaseAdmin, logger)
  const idempotencyRepo = new IdempotencyRepository(supabaseAdmin, logger)
  const concessionRepo = new ConcessionRepository(supabaseAdmin, logger)
  const customHeadRepo = new CustomFeeHeadRepository(supabaseAdmin, logger)
  const enrollmentRepo = new EnrollmentRepository(supabaseAdmin, logger)
  const feeService = new FeeService(feeRepo, paymentRepo, receiptRepo, idempotencyRepo)

  // GET /api/v1/fees/structure — fee structure for current academic year
  fastify.get(
    '/api/v1/fees/structure',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id } = request.jwtPayload

      logger.info({ correlationId, school_id }, 'GET /api/v1/fees/structure')

      const academicYearId = await enrollmentRepo.getCurrentAcademicYear(school_id, correlationId)
      const structure = await feeRepo.getFeeStructure(school_id, academicYearId, correlationId)

      return reply.send({ data: structure })
    },
  )

  // PUT /api/v1/fees/structure — update fee structure
  fastify.put(
    '/api/v1/fees/structure',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id } = request.jwtPayload
      const { rows } = UpdateFeeStructureSchema.parse(request.body)

      logger.info({ correlationId, school_id, rowCount: rows.length }, 'PUT /api/v1/fees/structure')

      const academicYearId = await enrollmentRepo.getCurrentAcademicYear(school_id, correlationId)
      await feeRepo.updateFeeStructure(school_id, academicYearId, rows, correlationId)

      return reply.send({ data: { message: 'Fee structure updated successfully' } })
    },
  )

  // GET /api/v1/fees/collection — monthly collection summary
  fastify.get(
    '/api/v1/fees/collection',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id } = request.jwtPayload

      logger.info({ correlationId, school_id }, 'GET /api/v1/fees/collection')

      const academicYearId = await enrollmentRepo.getCurrentAcademicYear(school_id, correlationId)
      const summary = await feeRepo.getCollectionSummary(school_id, academicYearId, correlationId)

      return reply.send({ data: summary })
    },
  )

  // GET /api/v1/fees/analytics — full year analytics
  fastify.get(
    '/api/v1/fees/analytics',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id } = request.jwtPayload

      logger.info({ correlationId, school_id }, 'GET /api/v1/fees/analytics')

      const academicYearId = await enrollmentRepo.getCurrentAcademicYear(school_id, correlationId)
      const analytics = await feeRepo.getAnalytics(school_id, academicYearId, correlationId)

      return reply.send({ data: analytics })
    },
  )

  // GET /api/v1/fees/analytics/unpaid — unpaid students list
  fastify.get(
    '/api/v1/fees/analytics/unpaid',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id } = request.jwtPayload
      const { page, limit } = UnpaidStudentsQuerySchema.parse(request.query)

      logger.info({ correlationId, school_id, page, limit }, 'GET /api/v1/fees/analytics/unpaid')

      const academicYearId = await enrollmentRepo.getCurrentAcademicYear(school_id, correlationId)
      const result = await feeRepo.getUnpaidStudents(school_id, academicYearId, page, limit, correlationId)

      return reply.send({
        data: result.items,
        meta: { total: result.total, page, limit },
      })
    },
  )

  // GET /api/v1/fees/ledger/:neuraId — student fee balance + ledger
  fastify.get(
    '/api/v1/fees/ledger/:neuraId',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { neuraId } = NeuraIdParamsSchema.parse(request.params)
      const { school_id, role, linked_neura_ids } = request.jwtPayload

      if (role === UserRole.PARENT) {
        if (!linked_neura_ids?.includes(neuraId)) {
          throw new ForbiddenError('Access denied to this student ledger')
        }
      }

      logger.info({ correlationId, neuraId, school_id }, 'GET /api/v1/fees/ledger/:neuraId')

      const academicYearId = await enrollmentRepo.getCurrentAcademicYear(school_id, correlationId)
      const balance = await feeRepo.getStudentFeeBalance(neuraId, school_id, academicYearId, correlationId)

      return reply.send({ data: balance })
    },
  )

  // POST /api/v1/fees/payment — record a fee payment
  fastify.post(
    '/api/v1/fees/payment',
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

      const body = RecordPaymentSchema.parse(request.body)
      const { school_id, teacher_id, role } = request.jwtPayload

      if (!teacher_id) {
        throw new ValidationError('teacher_id is required to record payment')
      }

      logger.info(
        { correlationId, school_id, neura_id: body.neura_id, amount: body.amount },
        'POST /api/v1/fees/payment',
      )

      const academicYearId = await enrollmentRepo.getCurrentAcademicYear(school_id, correlationId)

      const receipt = await feeService.recordPayment(
        body,
        school_id,
        teacher_id,
        role,
        academicYearId,
        idempotencyKey,
        correlationId,
      )

      return reply.code(201).send({ data: receipt })
    },
  )

  // DELETE /api/v1/fees/payment/:paymentId — void a payment (PRINCIPAL only)
  fastify.delete(
    '/api/v1/fees/payment/:paymentId',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { paymentId } = PaymentIdParamsSchema.parse(request.params)
      const { reason } = VoidPaymentSchema.parse(request.body)
      const { school_id, teacher_id } = request.jwtPayload

      if (!teacher_id) {
        throw new ValidationError('teacher_id is required to void payment')
      }

      logger.info({ correlationId, paymentId, school_id }, 'DELETE /api/v1/fees/payment/:paymentId')

      await paymentRepo.voidPayment(paymentId, school_id, teacher_id, reason, correlationId)

      return reply.send({ data: { message: 'Payment voided' } })
    },
  )

  // ─── Concession Rules ────────────────────────────────────────────────────────

  // GET /api/v1/fees/concession-rules
  fastify.get(
    '/api/v1/fees/concession-rules',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id } = request.jwtPayload

      logger.info({ correlationId, school_id }, 'GET /api/v1/fees/concession-rules')

      const academicYearId = await enrollmentRepo.getCurrentAcademicYear(school_id, correlationId)
      const rules = await concessionRepo.listRules(school_id, academicYearId, correlationId)

      return reply.send({ data: rules })
    },
  )

  // POST /api/v1/fees/concession-rules
  fastify.post(
    '/api/v1/fees/concession-rules',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const body = CreateConcessionRuleSchema.parse(request.body)
      const { school_id } = request.jwtPayload

      logger.info({ correlationId, school_id, rule_name: body.rule_name }, 'POST /api/v1/fees/concession-rules')

      const academicYearId = await enrollmentRepo.getCurrentAcademicYear(school_id, correlationId)
      const rule = await concessionRepo.createRule(
        { ...body, is_active: true, schoolId: school_id, academicYearId },
        correlationId,
      )

      return reply.code(201).send({ data: rule })
    },
  )

  // PUT /api/v1/fees/concession-rules/:ruleId
  fastify.put(
    '/api/v1/fees/concession-rules/:ruleId',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { ruleId } = ConcessionRuleIdParamsSchema.parse(request.params)
      const updates = UpdateConcessionRuleSchema.parse(request.body)
      const { school_id } = request.jwtPayload

      logger.info({ correlationId, ruleId, school_id }, 'PUT /api/v1/fees/concession-rules/:ruleId')

      const rule = await concessionRepo.updateRule(ruleId, school_id, updates, correlationId)

      return reply.send({ data: rule })
    },
  )

  // DELETE /api/v1/fees/concession-rules/:ruleId
  fastify.delete(
    '/api/v1/fees/concession-rules/:ruleId',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { ruleId } = ConcessionRuleIdParamsSchema.parse(request.params)
      const { school_id } = request.jwtPayload

      logger.info({ correlationId, ruleId, school_id }, 'DELETE /api/v1/fees/concession-rules/:ruleId')

      await concessionRepo.deactivateRule(ruleId, school_id, correlationId)

      return reply.code(204).send()
    },
  )

  // ─── Custom Fee Heads ────────────────────────────────────────────────────────

  // GET /api/v1/fees/custom-heads
  fastify.get(
    '/api/v1/fees/custom-heads',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id } = request.jwtPayload

      logger.info({ correlationId, school_id }, 'GET /api/v1/fees/custom-heads')

      const academicYearId = await enrollmentRepo.getCurrentAcademicYear(school_id, correlationId)
      const heads = await customHeadRepo.list(school_id, academicYearId, correlationId)

      return reply.send({ data: heads })
    },
  )

  // POST /api/v1/fees/custom-heads
  fastify.post(
    '/api/v1/fees/custom-heads',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const body = CreateCustomFeeHeadSchema.parse(request.body)
      const { school_id } = request.jwtPayload

      logger.info({ correlationId, school_id, head_code: body.head_code }, 'POST /api/v1/fees/custom-heads')

      const academicYearId = await enrollmentRepo.getCurrentAcademicYear(school_id, correlationId)
      const head = await customHeadRepo.create(
        {
          ...body,
          is_active: true,
          amounts: body.amounts ?? [],
          schoolId: school_id,
          academicYearId,
        },
        correlationId,
      )

      return reply.code(201).send({ data: head })
    },
  )

  // PUT /api/v1/fees/custom-heads/:headId
  fastify.put(
    '/api/v1/fees/custom-heads/:headId',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { headId } = CustomHeadIdParamsSchema.parse(request.params)
      const updates = UpdateCustomFeeHeadSchema.parse(request.body)
      const { school_id } = request.jwtPayload

      logger.info({ correlationId, headId, school_id }, 'PUT /api/v1/fees/custom-heads/:headId')

      const head = await customHeadRepo.update(headId, school_id, updates, correlationId)

      return reply.send({ data: head })
    },
  )

  // DELETE /api/v1/fees/custom-heads/:headId
  fastify.delete(
    '/api/v1/fees/custom-heads/:headId',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { headId } = CustomHeadIdParamsSchema.parse(request.params)
      const { school_id } = request.jwtPayload

      logger.info({ correlationId, headId, school_id }, 'DELETE /api/v1/fees/custom-heads/:headId')

      await customHeadRepo.deactivate(headId, school_id, correlationId)

      return reply.code(204).send()
    },
  )
}

export default feeRoutes
