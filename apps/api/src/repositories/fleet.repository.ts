import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { FastifyBaseLogger } from 'fastify'
import { DatabaseError, NotFoundError } from '../utils/errors.js'
import type {
  FleetAlert, HealthSnapshot,
  AssignmentHistoryItem, OTACampaign, DeviceStatus,
} from '../types/common.js'

// Raw DB rows for tables not in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

interface RawDevice {
  id: string; serial_number: string; model: string | null
  school_id: string; assigned_neura_id: string | null
  status: string; os_version: string | null
  pending_firmware_version: string | null
  last_sync_at: string | null; last_seen_at: string | null
  battery_pct: number | null; storage_used_mb: number | null
  gps_lat: number | null; gps_lng: number | null
  loss_reported: boolean | null; loss_reported_at: string | null
  total_sessions: number | null; total_usage_hours: number | null
  breakage_deposit_paid: number | null; total_repair_cost: number | null
}

interface RawAlert {
  id: string; device_id: string; school_id: string
  neura_id: string | null; alert_type: string; severity: string
  message: string; triggered_at: string
  acknowledged_at: string | null; acknowledged_by: string | null
  resolved_at: string | null; is_active: boolean
}

interface RawSnapshot {
  id: string; device_id: string; snapshot_at: string
  battery_level: number | null; storage_used_mb: number | null
  firmware_version: string | null; sessions_count: number | null
  usage_minutes: number | null; sync_type: string | null
}

interface RawAssignment {
  id: string; neura_id: string; assigned_at: string
  returned_at: string | null; condition_at_return: string | null
  damage_description: string | null; repair_required: boolean | null
  repair_cost_estimate: number | null; repair_status: string | null
  notes: string | null
}

export class FleetRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: FastifyBaseLogger,
  ) {}

  private get db(): AnyClient { return this.supabase }

  async listDevices(schoolId: string, correlationId: string): Promise<RawDevice[]> {
    this.logger.debug({ correlationId, schoolId }, 'FleetRepository.listDevices')
    const { data, error } = await this.db
      .from('smartpad_devices')
      .select(
        'id, serial_number, model, school_id, assigned_neura_id, status, ' +
        'os_version, pending_firmware_version, last_sync_at, last_seen_at, ' +
        'battery_pct, storage_used_mb, gps_lat, gps_lng, ' +
        'loss_reported, loss_reported_at, total_sessions, total_usage_hours, ' +
        'breakage_deposit_paid, total_repair_cost',
      )
      .eq('school_id', schoolId)
      .order('id')
    if (error) throw new DatabaseError(error.message, { correlationId })
    return (data ?? []) as RawDevice[]
  }

  async findDeviceById(deviceId: string, schoolId: string, correlationId: string): Promise<RawDevice> {
    this.logger.debug({ correlationId, deviceId }, 'FleetRepository.findDeviceById')
    const { data, error } = await this.db
      .from('smartpad_devices')
      .select(
        'id, serial_number, model, school_id, assigned_neura_id, status, ' +
        'os_version, pending_firmware_version, last_sync_at, last_seen_at, ' +
        'battery_pct, storage_used_mb, gps_lat, gps_lng, ' +
        'loss_reported, loss_reported_at, total_sessions, total_usage_hours, ' +
        'breakage_deposit_paid, total_repair_cost',
      )
      .eq('id', deviceId)
      .eq('school_id', schoolId)
      .maybeSingle()
    if (error) throw new DatabaseError(error.message, { correlationId })
    if (!data) throw new NotFoundError('Device not found', { deviceId, correlationId })
    return data as RawDevice
  }

  async updateDeviceStatus(
    deviceId: string, schoolId: string,
    status: DeviceStatus, correlationId: string,
    extra?: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await this.db
      .from('smartpad_devices')
      .update({ status, ...extra })
      .eq('id', deviceId)
      .eq('school_id', schoolId)
    if (error) throw new DatabaseError(error.message, { correlationId })
  }

  async assignDevice(
    deviceId: string, schoolId: string, neuraId: string,
    academicYearId: string, teacherId: string, correlationId: string,
  ): Promise<void> {
    const { error: devErr } = await this.db
      .from('smartpad_devices')
      .update({ assigned_neura_id: neuraId })
      .eq('id', deviceId)
      .eq('school_id', schoolId)
    if (devErr) throw new DatabaseError(devErr.message, { correlationId })

    const { error: histErr } = await this.db
      .from('smartpad_assignment_history')
      .insert({
        smartpad_id: deviceId, school_id: schoolId, neura_id: neuraId,
        academic_year_id: academicYearId, assigned_at: new Date().toISOString(),
        recorded_by: teacherId,
      })
    if (histErr) throw new DatabaseError(histErr.message, { correlationId })
  }

  async returnDevice(
    deviceId: string, schoolId: string, neuraId: string,
    returnData: {
      condition: string; damage_description?: string | null
      repair_required: boolean; repair_cost_estimate?: number | null
      notes?: string | null; recorded_by: string
    },
    correlationId: string,
  ): Promise<void> {
    const { error: devErr } = await this.db
      .from('smartpad_devices')
      .update({ assigned_neura_id: null })
      .eq('id', deviceId)
      .eq('school_id', schoolId)
    if (devErr) throw new DatabaseError(devErr.message, { correlationId })

    const { error: histErr } = await this.db
      .from('smartpad_assignment_history')
      .update({
        returned_at: new Date().toISOString(),
        condition_at_return: returnData.condition,
        damage_description: returnData.damage_description ?? null,
        repair_required: returnData.repair_required,
        repair_cost_estimate: returnData.repair_cost_estimate ?? null,
        notes: returnData.notes ?? null,
        recorded_by: returnData.recorded_by,
      })
      .eq('smartpad_id', deviceId)
      .eq('neura_id', neuraId)
      .is('returned_at', null)
    if (histErr) throw new DatabaseError(histErr.message, { correlationId })
  }

  async markLost(
    deviceId: string, schoolId: string, reportedBy: string, correlationId: string,
  ): Promise<void> {
    const { error } = await this.db
      .from('smartpad_devices')
      .update({
        status: 'LOST',
        loss_reported: true,
        loss_reported_at: new Date().toISOString(),
        lost_reported_by: reportedBy,
      })
      .eq('id', deviceId)
      .eq('school_id', schoolId)
    if (error) throw new DatabaseError(error.message, { correlationId })
  }

  async listAlerts(schoolId: string, correlationId: string, activeOnly = true): Promise<RawAlert[]> {
    this.logger.debug({ correlationId, schoolId }, 'FleetRepository.listAlerts')
    let query = this.db
      .from('smartpad_alerts')
      .select('id, device_id, school_id, neura_id, alert_type, severity, message, ' +
        'triggered_at, acknowledged_at, acknowledged_by, resolved_at, is_active')
      .eq('school_id', schoolId)
      .order('triggered_at', { ascending: false })

    if (activeOnly) query = query.eq('is_active', true)

    const { data, error } = await query
    if (error) throw new DatabaseError(error.message, { correlationId })
    return (data ?? []) as RawAlert[]
  }

  async acknowledgeAlert(
    alertId: string, schoolId: string, teacherId: string, correlationId: string,
  ): Promise<void> {
    const { error } = await this.db
      .from('smartpad_alerts')
      .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: teacherId })
      .eq('id', alertId)
      .eq('school_id', schoolId)
    if (error) throw new DatabaseError(error.message, { correlationId })
  }

  async resolveAlert(alertId: string, schoolId: string, correlationId: string): Promise<void> {
    const { error } = await this.db
      .from('smartpad_alerts')
      .update({ resolved_at: new Date().toISOString(), is_active: false })
      .eq('id', alertId)
      .eq('school_id', schoolId)
    if (error) throw new DatabaseError(error.message, { correlationId })
  }

  async insertAlert(
    deviceId: string, schoolId: string, neuraId: string | null,
    alertType: string, severity: string, message: string,
    correlationId: string,
  ): Promise<void> {
    const { error } = await this.db
      .from('smartpad_alerts')
      .insert({
        device_id: deviceId, school_id: schoolId, neura_id: neuraId,
        alert_type: alertType, severity, message,
        triggered_at: new Date().toISOString(), is_active: true,
      })
    if (error) throw new DatabaseError(error.message, { correlationId })
  }

  async getHealthSnapshots(
    deviceId: string, schoolId: string, days: number, correlationId: string,
  ): Promise<RawSnapshot[]> {
    const from = new Date(Date.now() - days * 86400 * 1000).toISOString()
    const { data, error } = await this.db
      .from('smartpad_health_snapshots')
      .select('id, device_id, snapshot_at, battery_level, storage_used_mb, firmware_version, sessions_count, usage_minutes, sync_type')
      .eq('device_id', deviceId)
      .eq('school_id', schoolId)
      .gte('snapshot_at', from)
      .order('snapshot_at', { ascending: false })
    if (error) throw new DatabaseError(error.message, { correlationId })
    return (data ?? []) as RawSnapshot[]
  }

  async getAssignmentHistory(
    deviceId: string, schoolId: string, correlationId: string,
  ): Promise<RawAssignment[]> {
    const { data, error } = await this.db
      .from('smartpad_assignment_history')
      .select(
        'id, neura_id, assigned_at, returned_at, condition_at_return, ' +
        'damage_description, repair_required, repair_cost_estimate, repair_status, notes',
      )
      .eq('smartpad_id', deviceId)
      .eq('school_id', schoolId)
      .order('assigned_at', { ascending: false })
    if (error) throw new DatabaseError(error.message, { correlationId })
    return (data ?? []) as RawAssignment[]
  }

  async getStudentNames(
    neuraIds: string[], correlationId: string,
  ): Promise<Map<string, string>> {
    if (neuraIds.length === 0) return new Map()
    const { data, error } = await this.supabase
      .from('students')
      .select('neura_id, full_name')
      .in('neura_id', neuraIds)
    if (error) throw new DatabaseError(error.message, { correlationId })
    const m = new Map<string, string>()
    for (const s of data ?? []) m.set(s.neura_id, s.full_name)
    return m
  }

  async getStudentClasses(
    neuraIds: string[], correlationId: string,
  ): Promise<Map<string, string>> {
    if (neuraIds.length === 0) return new Map()
    const { data, error } = await this.supabase
      .from('student_yearly_progress')
      .select('neura_id, class_year, section')
      .in('neura_id', neuraIds)
      .order('created_at', { ascending: false })
    if (error) throw new DatabaseError(error.message, { correlationId })
    const m = new Map<string, string>()
    for (const r of data ?? []) {
      if (!m.has(r.neura_id)) m.set(r.neura_id, `${r.class_year}-${r.section}`)
    }
    return m
  }

  async getAtRiskNeuraIds(
    neuraIds: string[], correlationId: string,
  ): Promise<Set<string>> {
    if (neuraIds.length === 0) return new Set()
    const { data, error } = await this.supabase
      .from('calibrated_mastery_scores')
      .select('neura_id')
      .in('neura_id', neuraIds)
      .eq('classification', 'AT_RISK')
    if (error) throw new DatabaseError(error.message, { correlationId })
    return new Set((data ?? []).map(r => r.neura_id))
  }

  async listOTACampaigns(schoolId: string, correlationId: string): Promise<OTACampaign[]> {
    const { data, error } = await this.db
      .from('smartpad_ota_campaigns')
      .select('id, school_id, target_firmware, launched_at, target_device_ids, updated_count, failed_count, status, completed_at')
      .eq('school_id', schoolId)
      .order('launched_at', { ascending: false })
    if (error) throw new DatabaseError(error.message, { correlationId })
    return ((data ?? []) as OTACampaign[])
  }

  async createOTACampaign(
    schoolId: string, targetFirmware: string,
    deviceIds: string[], launchedBy: string, correlationId: string,
  ): Promise<OTACampaign> {
    const { data, error } = await this.db
      .from('smartpad_ota_campaigns')
      .insert({
        school_id: schoolId, target_firmware: targetFirmware,
        target_device_ids: deviceIds, launched_by: launchedBy,
        status: 'IN_PROGRESS', launched_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw new DatabaseError(error.message, { correlationId })
    return data as OTACampaign
  }

  buildAlertFromRaw(raw: RawAlert): FleetAlert {
    return {
      id: raw.id, device_id: raw.device_id, school_id: raw.school_id,
      neura_id: raw.neura_id, student_name: null,
      alert_type: raw.alert_type as FleetAlert['alert_type'],
      severity: raw.severity as FleetAlert['severity'],
      message: raw.message, triggered_at: raw.triggered_at,
      acknowledged_at: raw.acknowledged_at,
      acknowledged_by_name: null,
      resolved_at: raw.resolved_at, is_active: raw.is_active,
    }
  }

  buildSnapshotFromRaw(raw: RawSnapshot): HealthSnapshot {
    return {
      id: raw.id, device_id: raw.device_id, snapshot_at: raw.snapshot_at,
      battery_level: raw.battery_level, storage_used_mb: raw.storage_used_mb,
      firmware_version: raw.firmware_version,
      sessions_count: raw.sessions_count ?? 0,
      usage_minutes: raw.usage_minutes ?? 0,
      sync_type: raw.sync_type ?? 'AUTO',
    }
  }
}
