import { supabaseAdmin } from '../lib/supabase.js'
import logger from '../lib/logger.js'
import type { UserRole } from '../types/common.js'

interface AuditParams {
  event_type: string
  actor_id: string | undefined
  actor_role: UserRole | string
  school_id: string
  target_neura_id?: string
  target_table?: string
  result: 'SUCCESS' | 'FAILURE'
  action_detail?: Record<string, unknown>
  correlationId?: string
}

export async function auditLog(params: AuditParams): Promise<void> {
  const { error } = await supabaseAdmin.from('audit_log').insert({
    event_type: params.event_type,
    actor_id: params.actor_id ?? null,
    actor_role: params.actor_role as never,
    school_id: params.school_id,
    target_neura_id: params.target_neura_id ?? null,
    target_table: params.target_table ?? null,
    result: params.result,
    action_detail: (params.action_detail ?? null) as never,
  })

  if (error) {
    logger.warn(
      { error, event_type: params.event_type, correlationId: params.correlationId },
      'Audit log write failed (non-fatal)',
    )
  }
}
