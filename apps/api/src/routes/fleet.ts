import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { FleetService } from '../services/fleet.service.js'
import { requireRole } from '../middleware/roleGuard.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { UserRole } from '../types/common.js'
import type { DeviceStatus } from '../types/common.js'

const AssignDeviceSchema = z.object({
  neura_id: z.string().min(1),
})

const ReturnDeviceSchema = z.object({
  condition: z.enum(['EXCELLENT', 'GOOD', 'MINOR_DAMAGE', 'MAJOR_DAMAGE']),
  damage_description: z.string().optional(),
  repair_required: z.boolean(),
  repair_cost_estimate: z.number().nonnegative().optional(),
  notes: z.string().optional(),
})

const UpdateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'LOCKED', 'MAINTENANCE', 'DECOMMISSIONED']),
})

const OTAPushSchema = z.object({
  target_firmware: z.string().min(1),
  device_ids: z.array(z.string()).min(1),
})

const routes: FastifyPluginAsync = async (fastify) => {
  const fleetService = new FleetService(supabaseAdmin, fastify.log)

  // GET /api/v1/fleet/overview
  fastify.get('/api/v1/fleet/overview', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    try {
      const { school_id } = request.jwtPayload
      const overview = await fleetService.getOverview(school_id, request.correlationId)
      return reply.send({ data: overview })
    } catch (err) {
      fastify.log.error({ err, correlationId: request.correlationId }, 'Fleet overview error')
      throw err
    }
  })

  // GET /api/v1/fleet/devices
  fastify.get('/api/v1/fleet/devices', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const { school_id } = request.jwtPayload
    const overview = await fleetService.getOverview(school_id, request.correlationId)
    return reply.send({ data: overview.devices })
  })

  // GET /api/v1/fleet/devices/:deviceId
  fastify.get<{ Params: { deviceId: string } }>('/api/v1/fleet/devices/:deviceId', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const { school_id } = request.jwtPayload
    const { deviceId } = request.params
    const detail = await fleetService.getDeviceDetail(deviceId, school_id, request.correlationId)
    return reply.send({ data: detail })
  })

  // PUT /api/v1/fleet/devices/:deviceId/status
  fastify.put<{ Params: { deviceId: string } }>('/api/v1/fleet/devices/:deviceId/status', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const { school_id } = request.jwtPayload
    const { deviceId } = request.params
    const { status } = UpdateStatusSchema.parse(request.body)
    await fleetService.updateStatus(deviceId, school_id, status as DeviceStatus, request.correlationId)
    return reply.send({ data: { success: true } })
  })

  // PUT /api/v1/fleet/devices/:deviceId/mark-lost
  fastify.put<{ Params: { deviceId: string } }>('/api/v1/fleet/devices/:deviceId/mark-lost', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const { school_id, sub } = request.jwtPayload
    const { deviceId } = request.params
    await fleetService.markLost(deviceId, school_id, sub, request.correlationId)
    return reply.send({ data: { success: true } })
  })

  // PUT /api/v1/fleet/devices/:deviceId/assign
  fastify.put<{ Params: { deviceId: string } }>('/api/v1/fleet/devices/:deviceId/assign', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const { school_id, sub } = request.jwtPayload
    const { deviceId } = request.params
    const body = AssignDeviceSchema.parse(request.body)

    // Look up current academic year
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ay } = await (supabaseAdmin as any)
      .from('academic_years')
      .select('id')
      .eq('school_id', school_id)
      .eq('is_current', true)
      .maybeSingle()
    const academicYearId = ay?.id ?? 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

    await fleetService.assignDevice(deviceId, school_id, body, academicYearId, sub, request.correlationId)
    return reply.send({ data: { success: true } })
  })

  // POST /api/v1/fleet/devices/:deviceId/return
  fastify.post<{ Params: { deviceId: string } }>('/api/v1/fleet/devices/:deviceId/return', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const { school_id, sub } = request.jwtPayload
    const { deviceId } = request.params
    const body = ReturnDeviceSchema.parse(request.body)
    await fleetService.returnDevice(deviceId, school_id, body, sub, request.correlationId)
    return reply.send({ data: { success: true } })
  })

  // GET /api/v1/fleet/alerts
  fastify.get('/api/v1/fleet/alerts', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const { school_id } = request.jwtPayload
    const alerts = await fleetService.getAlerts(school_id, request.correlationId)
    return reply.send({ data: alerts })
  })

  // PUT /api/v1/fleet/alerts/:alertId/acknowledge
  fastify.put<{ Params: { alertId: string } }>('/api/v1/fleet/alerts/:alertId/acknowledge', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const { school_id, sub } = request.jwtPayload
    const { alertId } = request.params
    await fleetService.acknowledgeAlert(alertId, school_id, sub, request.correlationId)
    return reply.send({ data: { success: true } })
  })

  // GET /api/v1/fleet/ota/campaigns
  fastify.get('/api/v1/fleet/ota/campaigns', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const { school_id } = request.jwtPayload
    const campaigns = await fleetService.listOTACampaigns(school_id, request.correlationId)
    return reply.send({ data: campaigns })
  })

  // POST /api/v1/fleet/ota/push
  fastify.post('/api/v1/fleet/ota/push', {
    preHandler: [fastify.authenticate, requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN])],
  }, async (request, reply) => {
    const { school_id, sub } = request.jwtPayload
    const body = OTAPushSchema.parse(request.body)
    const campaign = await fleetService.launchOTA(
      school_id, body.target_firmware, body.device_ids, sub, request.correlationId,
    )
    return reply.code(201).send({ data: campaign })
  })
}

export default routes
