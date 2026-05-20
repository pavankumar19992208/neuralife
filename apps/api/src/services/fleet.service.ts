import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { FastifyBaseLogger } from 'fastify'
import { FleetRepository } from '../repositories/fleet.repository.js'
import { NotFoundError, ValidationError } from '../utils/errors.js'
import type {
  FleetDevice, FleetOverview, DeviceDetail, FleetKPIs, FleetEfficiencyScore,
  FleetAlert, SyncStatus, DeviceStatus, AssignDeviceInput, ReturnDeviceInput,
  OTACampaign,
} from '../types/common.js'
import { LATEST_FIRMWARE } from '../types/common.js'

const HOURS_48 = 48 * 3600 * 1000
const DAYS_5   = 5  * 86400 * 1000
const DAYS_9   = 9  * 86400 * 1000

function computeSyncStatus(lastSyncAt: string | null): SyncStatus {
  if (!lastSyncAt) return 'CRITICAL'
  const age = Date.now() - new Date(lastSyncAt).getTime()
  if (age < HOURS_48) return 'RECENT'
  if (age < DAYS_5)   return 'WATCH'
  if (age < DAYS_9)   return 'OFFLINE'
  return 'CRITICAL'
}

function computeKPIs(devices: FleetDevice[], alerts: FleetAlert[]): FleetKPIs {
  const total = devices.length
  const active = devices.filter(d => d.status === 'ACTIVE').length
  const lost = devices.filter(d => d.status === 'LOST').length
  const offline = devices.filter(d => d.sync_status === 'OFFLINE').length
  const critical = devices.filter(d => d.sync_status === 'CRITICAL' && d.status !== 'LOST').length
  const outdated = devices.filter(d => d.firmware_version !== LATEST_FIRMWARE && d.status !== 'DECOMMISSIONED').length
  const synced48h = devices.filter(d => d.sync_status === 'RECENT').length
  const batteries = devices.map(d => d.battery_level).filter((b): b is number => b !== null)
  const usageHours = devices.map(d => d.total_usage_hours).filter(h => h > 0)

  return {
    total_devices: total,
    active_devices: active,
    offline_devices: offline,
    critical_devices: critical,
    lost_devices: lost,
    firmware_outdated_count: outdated,
    active_alerts: alerts.filter(a => a.is_active).length,
    sync_rate_pct: total > 0 ? Math.round((synced48h / total) * 100) : 0,
    avg_battery_pct: batteries.length > 0 ? Math.round(batteries.reduce((a, b) => a + b, 0) / batteries.length) : 0,
    avg_usage_hours: usageHours.length > 0 ? Math.round(usageHours.reduce((a, b) => a + b, 0) / usageHours.length) : 0,
  }
}

function computeEfficiency(kpis: FleetKPIs): FleetEfficiencyScore {
  const syncScore   = kpis.total_devices > 0 ? kpis.sync_rate_pct : 0
  const usageScore  = Math.min(100, Math.round((kpis.avg_usage_hours / 500) * 100))
  const healthScore = kpis.total_devices > 0
    ? Math.round(((kpis.total_devices - kpis.lost_devices - kpis.critical_devices) / kpis.total_devices) * 100)
    : 0
  const fwScore = kpis.total_devices > 0
    ? Math.round(((kpis.total_devices - kpis.firmware_outdated_count) / kpis.total_devices) * 100)
    : 0
  const overall = Math.round(syncScore * 0.35 + usageScore * 0.35 + healthScore * 0.20 + fwScore * 0.10)

  return {
    overall,
    sync_score: syncScore,
    usage_score: usageScore,
    device_health_score: healthScore,
    firmware_score: fwScore,
  }
}

export class FleetService {
  private readonly repo: FleetRepository

  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: FastifyBaseLogger,
  ) {
    this.repo = new FleetRepository(supabase, logger)
  }

  async getOverview(schoolId: string, correlationId: string): Promise<FleetOverview> {
    const [rawDevices, rawAlerts] = await Promise.all([
      this.repo.listDevices(schoolId, correlationId),
      this.repo.listAlerts(schoolId, correlationId, true),
    ])

    const assignedIds = rawDevices
      .map(d => d.assigned_neura_id)
      .filter((id): id is string => id !== null)

    const [nameMap, classMap, atRiskSet] = await Promise.all([
      this.repo.getStudentNames(assignedIds, correlationId),
      this.repo.getStudentClasses(assignedIds, correlationId),
      this.repo.getAtRiskNeuraIds(assignedIds, correlationId),
    ])

    // Build alert count map
    const alertCountMap = new Map<string, number>()
    for (const a of rawAlerts) {
      alertCountMap.set(a.device_id, (alertCountMap.get(a.device_id) ?? 0) + 1)
    }

    const devices: FleetDevice[] = rawDevices.map(d => ({
      device_id: d.id,
      serial_number: d.serial_number,
      model: d.model ?? 'NeuraLife Gen 1',
      school_id: d.school_id,
      status: d.status as DeviceStatus,
      firmware_version: d.os_version ?? 'unknown',
      battery_level: d.battery_pct,
      storage_used_mb: d.storage_used_mb,
      location_lat: d.gps_lat,
      location_lng: d.gps_lng,
      last_sync_at: d.last_sync_at,
      last_seen_at: d.last_seen_at,
      total_sessions: d.total_sessions ?? 0,
      total_usage_hours: d.total_usage_hours ?? 0,
      assigned_neura_id: d.assigned_neura_id,
      student_name: d.assigned_neura_id ? (nameMap.get(d.assigned_neura_id) ?? null) : null,
      student_class: d.assigned_neura_id ? (classMap.get(d.assigned_neura_id) ?? null) : null,
      sync_status: computeSyncStatus(d.last_sync_at),
      is_at_risk_student: d.assigned_neura_id ? atRiskSet.has(d.assigned_neura_id) : false,
      active_alert_count: alertCountMap.get(d.id) ?? 0,
    }))

    const alerts: FleetAlert[] = rawAlerts.map(a => {
      const alert = this.repo.buildAlertFromRaw(a)
      if (a.neura_id) alert.student_name = nameMap.get(a.neura_id) ?? null
      return alert
    })

    const kpis = computeKPIs(devices, alerts)
    const efficiency = computeEfficiency(kpis)

    return { kpis, efficiency, devices, alerts }
  }

  async getDeviceDetail(deviceId: string, schoolId: string, correlationId: string): Promise<DeviceDetail> {
    const [rawDevice, rawAlerts, rawSnapshots, rawHistory] = await Promise.all([
      this.repo.findDeviceById(deviceId, schoolId, correlationId),
      this.repo.listAlerts(schoolId, correlationId, true),
      this.repo.getHealthSnapshots(deviceId, schoolId, 14, correlationId),
      this.repo.getAssignmentHistory(deviceId, schoolId, correlationId),
    ])

    const allNeuraIds: string[] = []
    if (rawDevice.assigned_neura_id) allNeuraIds.push(rawDevice.assigned_neura_id)
    for (const h of rawHistory) if (h.neura_id && !allNeuraIds.includes(h.neura_id)) allNeuraIds.push(h.neura_id)

    const [nameMap, classMap, atRiskSet] = await Promise.all([
      this.repo.getStudentNames(allNeuraIds, correlationId),
      this.repo.getStudentClasses(allNeuraIds, correlationId),
      this.repo.getAtRiskNeuraIds(allNeuraIds, correlationId),
    ])

    const deviceAlerts = rawAlerts
      .filter(a => a.device_id === deviceId)
      .map(a => {
        const alert = this.repo.buildAlertFromRaw(a)
        if (a.neura_id) alert.student_name = nameMap.get(a.neura_id) ?? null
        return alert
      })

    const syncStatus = computeSyncStatus(rawDevice.last_sync_at)

    return {
      device_id: rawDevice.id,
      serial_number: rawDevice.serial_number,
      model: rawDevice.model ?? 'NeuraLife Gen 1',
      school_id: rawDevice.school_id,
      status: rawDevice.status as DeviceStatus,
      firmware_version: rawDevice.os_version ?? 'unknown',
      pending_firmware_version: rawDevice.pending_firmware_version,
      battery_level: rawDevice.battery_pct,
      storage_used_mb: rawDevice.storage_used_mb,
      location_lat: rawDevice.gps_lat,
      location_lng: rawDevice.gps_lng,
      last_sync_at: rawDevice.last_sync_at,
      last_seen_at: rawDevice.last_seen_at,
      total_sessions: rawDevice.total_sessions ?? 0,
      total_usage_hours: rawDevice.total_usage_hours ?? 0,
      assigned_neura_id: rawDevice.assigned_neura_id,
      student_name: rawDevice.assigned_neura_id ? (nameMap.get(rawDevice.assigned_neura_id) ?? null) : null,
      student_class: rawDevice.assigned_neura_id ? (classMap.get(rawDevice.assigned_neura_id) ?? null) : null,
      sync_status: syncStatus,
      is_at_risk_student: rawDevice.assigned_neura_id ? atRiskSet.has(rawDevice.assigned_neura_id) : false,
      active_alert_count: deviceAlerts.length,
      loss_reported: rawDevice.loss_reported ?? false,
      loss_reported_at: rawDevice.loss_reported_at,
      breakage_deposit_paid: rawDevice.breakage_deposit_paid ?? 0,
      total_repair_cost: rawDevice.total_repair_cost ?? 0,
      active_alerts: deviceAlerts,
      health_snapshots: rawSnapshots.map(s => this.repo.buildSnapshotFromRaw(s)),
      assignment_history: rawHistory.map(h => ({
        id: h.id,
        neura_id: h.neura_id,
        student_name: nameMap.get(h.neura_id) ?? h.neura_id,
        assigned_at: h.assigned_at,
        returned_at: h.returned_at,
        condition_at_return: h.condition_at_return,
        damage_description: h.damage_description,
        repair_required: h.repair_required ?? false,
        repair_cost_estimate: h.repair_cost_estimate,
        repair_status: h.repair_status ?? 'NOT_REQUIRED',
        notes: h.notes,
      })),
    }
  }

  async updateStatus(
    deviceId: string, schoolId: string, status: DeviceStatus, correlationId: string,
  ): Promise<void> {
    const allowed: DeviceStatus[] = ['ACTIVE', 'LOCKED', 'MAINTENANCE', 'DECOMMISSIONED']
    if (!allowed.includes(status)) {
      throw new ValidationError('Invalid status transition', { status })
    }
    await this.repo.updateDeviceStatus(deviceId, schoolId, status, correlationId)
    this.logger.info({ correlationId, deviceId, status }, 'Device status updated')
  }

  async markLost(deviceId: string, schoolId: string, reportedBy: string, correlationId: string): Promise<void> {
    const device = await this.repo.findDeviceById(deviceId, schoolId, correlationId)
    if (device.status === 'LOST') {
      throw new ValidationError('Device already marked as lost', { deviceId })
    }
    await this.repo.markLost(deviceId, schoolId, reportedBy, correlationId)
    await this.repo.insertAlert(
      deviceId, schoolId, device.assigned_neura_id,
      'LOST', 'CRITICAL',
      `${deviceId} has been marked as LOST.`,
      correlationId,
    )
    this.logger.info({ correlationId, deviceId }, 'Device marked lost')
  }

  async assignDevice(
    deviceId: string, schoolId: string,
    input: AssignDeviceInput, academicYearId: string, teacherId: string,
    correlationId: string,
  ): Promise<void> {
    const device = await this.repo.findDeviceById(deviceId, schoolId, correlationId)
    if (device.assigned_neura_id) {
      throw new ValidationError('Device already assigned to a student', { deviceId, current: device.assigned_neura_id })
    }
    await this.repo.assignDevice(deviceId, schoolId, input.neura_id, academicYearId, teacherId, correlationId)
    this.logger.info({ correlationId, deviceId, neuraId: input.neura_id }, 'Device assigned')
  }

  async returnDevice(
    deviceId: string, schoolId: string,
    input: ReturnDeviceInput, teacherId: string, correlationId: string,
  ): Promise<void> {
    const device = await this.repo.findDeviceById(deviceId, schoolId, correlationId)
    if (!device.assigned_neura_id) {
      throw new ValidationError('Device is not currently assigned', { deviceId })
    }
    await this.repo.returnDevice(
      deviceId, schoolId, device.assigned_neura_id,
      {
        condition: input.condition,
        damage_description: input.damage_description,
        repair_required: input.repair_required,
        repair_cost_estimate: input.repair_cost_estimate,
        notes: input.notes,
        recorded_by: teacherId,
      },
      correlationId,
    )
    this.logger.info({ correlationId, deviceId }, 'Device returned')
  }

  async getAlerts(schoolId: string, correlationId: string): Promise<FleetAlert[]> {
    const rawAlerts = await this.repo.listAlerts(schoolId, correlationId, false)
    const neuraIds = rawAlerts.map(a => a.neura_id).filter((id): id is string => id !== null)
    const nameMap = await this.repo.getStudentNames(neuraIds, correlationId)
    return rawAlerts.map(a => {
      const alert = this.repo.buildAlertFromRaw(a)
      if (a.neura_id) alert.student_name = nameMap.get(a.neura_id) ?? null
      return alert
    })
  }

  async acknowledgeAlert(alertId: string, schoolId: string, teacherId: string, correlationId: string): Promise<void> {
    await this.repo.acknowledgeAlert(alertId, schoolId, teacherId, correlationId)
    this.logger.info({ correlationId, alertId }, 'Alert acknowledged')
  }

  async launchOTA(
    schoolId: string, targetFirmware: string, deviceIds: string[],
    launchedBy: string, correlationId: string,
  ): Promise<OTACampaign> {
    if (deviceIds.length === 0) throw new ValidationError('At least one device required for OTA campaign', {})
    return this.repo.createOTACampaign(schoolId, targetFirmware, deviceIds, launchedBy, correlationId)
  }

  async listOTACampaigns(schoolId: string, correlationId: string): Promise<OTACampaign[]> {
    return this.repo.listOTACampaigns(schoolId, correlationId)
  }
}
