import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { PayrollService } from '../services/payroll.service.js'
import { EnrollmentRepository } from '../repositories/enrollment.repository.js'
import { requireRole } from '../middleware/roleGuard.js'
import { UserRole } from '../types/common.js'
import { supabaseAdmin } from '../lib/supabase.js'
import logger from '../lib/logger.js'

const routes: FastifyPluginAsync = async (fastify) => {
  const svc = new PayrollService(supabaseAdmin, fastify.log)
  const enrollRepo = new EnrollmentRepository(supabaseAdmin, logger)

  async function getAcademicYear(schoolId: string): Promise<string> {
    return enrollRepo.getCurrentAcademicYear(schoolId, 'salary-routes')
  }

  // GET /api/v1/salary/payroll?month=5&year=2026
  fastify.get('/api/v1/salary/payroll', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const { school_id, academic_year_id } = request.jwtPayload as { school_id: string; academic_year_id?: string }
    const query = z.object({
      month: z.coerce.number().int().min(1).max(12),
      year: z.coerce.number().int().min(2020),
    }).parse(request.query)

    const summary = await svc.getPayrollSummary(school_id, query.month, query.year, correlationId)
      .catch(async () => {
        // No run exists — return null so the frontend can trigger generation
        return null
      })

    return reply.send({ data: summary })
  })

  // POST /api/v1/salary/payroll/generate
  fastify.post('/api/v1/salary/payroll/generate', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const { school_id } = request.jwtPayload as { school_id: string }
    const body = z.object({
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(2020),
    }).parse(request.body)

    const academicYearId = await getAcademicYear(school_id)
    const summary = await svc.generatePayroll(school_id, academicYearId, body.month, body.year, correlationId)
    fastify.log.info({ correlationId, month: body.month, year: body.year }, 'Payroll generated')
    return reply.code(201).send({ data: summary })
  })

  // POST /api/v1/salary/payroll/approve
  fastify.post('/api/v1/salary/payroll/approve', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const { school_id } = request.jwtPayload as { school_id: string }
    const body = z.object({
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(2020),
    }).parse(request.body)

    const summary = await svc.approvePayroll(school_id, body.month, body.year, correlationId)
    return reply.send({ data: summary })
  })

  // POST /api/v1/salary/payroll/mark-paid
  fastify.post('/api/v1/salary/payroll/mark-paid', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const { school_id } = request.jwtPayload as { school_id: string }
    const body = z.object({
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(2020),
    }).parse(request.body)

    const summary = await svc.markPaid(school_id, body.month, body.year, correlationId)
    return reply.send({ data: summary })
  })

  // POST /api/v1/salary/payslip/:payslipId/adjustment
  fastify.post('/api/v1/salary/payslip/:payslipId/adjustment', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const { school_id, sub } = request.jwtPayload as { school_id: string; sub: string }
    const { payslipId } = request.params as { payslipId: string }
    const body = z.object({
      adjustment_type: z.enum(['BONUS', 'ADVANCE_RECOVERY', 'FINE', 'ARREAR', 'OTHER']),
      label: z.string().min(1).max(100).trim(),
      amount: z.number().positive(),
      is_deduction: z.boolean(),
    }).parse(request.body)

    const row = await svc.addAdjustment(
      school_id, payslipId,
      body.adjustment_type, body.label,
      body.amount, body.is_deduction, sub, correlationId,
    )
    return reply.code(201).send({ data: row })
  })

  // DELETE /api/v1/salary/payslip/:payslipId/adjustment/:adjustmentId
  fastify.delete('/api/v1/salary/payslip/:payslipId/adjustment/:adjustmentId', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const { school_id } = request.jwtPayload as { school_id: string }
    const { payslipId, adjustmentId } = request.params as { payslipId: string; adjustmentId: string }

    const row = await svc.deleteAdjustment(school_id, payslipId, adjustmentId, correlationId)
    return reply.send({ data: row })
  })

  // GET /api/v1/salary/payroll/neft-export?month=5&year=2026
  fastify.get('/api/v1/salary/payroll/neft-export', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const { school_id } = request.jwtPayload as { school_id: string }
    const query = z.object({
      month: z.coerce.number().int().min(1).max(12),
      year: z.coerce.number().int().min(2020),
    }).parse(request.query)

    const rows = await svc.buildNEFTExport(school_id, query.month, query.year, correlationId)
    return reply.send({ data: rows })
  })

  // GET /api/v1/salary/payslip/:payslipId
  fastify.get('/api/v1/salary/payslip/:payslipId', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const { school_id } = request.jwtPayload as { school_id: string }
    const { payslipId } = request.params as { payslipId: string }
    const row = await svc.getSinglePayslip(school_id, payslipId, correlationId)
    return reply.send({ data: row })
  })

  // GET /api/v1/salary/history
  fastify.get('/api/v1/salary/history', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const { school_id } = request.jwtPayload as { school_id: string }
    const history = await svc.getPayrollHistory(school_id, correlationId)
    return reply.send({ data: history })
  })

  // PATCH /api/v1/salary/payslip/:payslipId/hold
  fastify.patch('/api/v1/salary/payslip/:payslipId/hold', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const { school_id } = request.jwtPayload as { school_id: string }
    const { payslipId } = request.params as { payslipId: string }
    await svc.holdPayslip(school_id, payslipId, correlationId)
    return reply.send({ data: { ok: true } })
  })

  // PATCH /api/v1/salary/payslip/:payslipId/release
  fastify.patch('/api/v1/salary/payslip/:payslipId/release', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const correlationId = request.correlationId
    const { school_id } = request.jwtPayload as { school_id: string }
    const { payslipId } = request.params as { payslipId: string }
    await svc.releaseHold(school_id, payslipId, correlationId)
    return reply.send({ data: { ok: true } })
  })
}

export default routes
