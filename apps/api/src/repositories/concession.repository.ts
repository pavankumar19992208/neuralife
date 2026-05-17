import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { FastifyBaseLogger } from 'fastify'
import { DatabaseError, NotFoundError } from '../utils/errors.js'
import type { ConcessionRule } from '../types/common.js'

// Row type mirrors future migration schema
interface ConcessionRuleRow {
  id: string
  rule_name: string
  concession_type: string
  eligibility_note: string | null
  applies_to_heads: string[] | null
  amount_type: string
  concession_value: number
  max_cap: number | null
  auto_apply: boolean | null
  is_active: boolean | null
}

// Use 'unknown' cast so new tables (not yet in generated types) compile cleanly
type LooseClient = SupabaseClient<Database> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any
}

export class ConcessionRepository {
  private readonly db: LooseClient

  constructor(
    supabase: SupabaseClient<Database>,
    private readonly logger: FastifyBaseLogger,
  ) {
    this.db = supabase as LooseClient
  }

  async listRules(
    schoolId: string,
    academicYearId: string,
    correlationId: string,
  ): Promise<ConcessionRule[]> {
    this.logger.debug({ correlationId, schoolId }, 'ConcessionRepository.listRules')

    const { data, error } = await this.db
      .from('fee_concession_rules')
      .select(
        'id, rule_name, concession_type, eligibility_note, applies_to_heads, amount_type, concession_value, max_cap, auto_apply, is_active',
      )
      .eq('school_id', schoolId)
      .or(`academic_year_id.eq.${academicYearId},academic_year_id.is.null`)
      .order('created_at', { ascending: false })

    if (error) throw new DatabaseError(String(error.message), { correlationId })

    return ((data ?? []) as ConcessionRuleRow[]).map((r) => ({
      id: r.id,
      rule_name: r.rule_name,
      concession_type: r.concession_type,
      eligibility_note: r.eligibility_note ?? null,
      applies_to_heads: r.applies_to_heads ?? null,
      amount_type: r.amount_type as 'PERCENT' | 'FIXED',
      concession_value: r.concession_value,
      max_cap: r.max_cap ?? null,
      auto_apply: r.auto_apply ?? true,
      is_active: r.is_active ?? true,
    }))
  }

  async createRule(
    rule: Omit<ConcessionRule, 'id'> & { schoolId: string; academicYearId: string },
    correlationId: string,
  ): Promise<ConcessionRule> {
    this.logger.debug({ correlationId, ruleName: rule.rule_name }, 'ConcessionRepository.createRule')

    const { data, error } = await this.db
      .from('fee_concession_rules')
      .insert({
        school_id: rule.schoolId,
        academic_year_id: rule.academicYearId,
        rule_name: rule.rule_name,
        concession_type: rule.concession_type as Database["public"]["Enums"]["concession_type"],
        eligibility_note: rule.eligibility_note ?? null,
        applies_to_heads: rule.applies_to_heads ?? null,
        amount_type: rule.amount_type,
        concession_value: rule.concession_value,
        max_cap: rule.max_cap ?? null,
        auto_apply: rule.auto_apply,
        is_active: true,
      })
      .select(
        'id, rule_name, concession_type, eligibility_note, applies_to_heads, amount_type, concession_value, max_cap, auto_apply, is_active',
      )
      .single()

    if (error) throw new DatabaseError(String(error.message), { correlationId })
    if (!data) throw new DatabaseError('Failed to create concession rule', { correlationId })

    const row = data as ConcessionRuleRow
    return {
      id: row.id,
      rule_name: row.rule_name,
      concession_type: row.concession_type,
      eligibility_note: row.eligibility_note ?? null,
      applies_to_heads: row.applies_to_heads ?? null,
      amount_type: row.amount_type as 'PERCENT' | 'FIXED',
      concession_value: row.concession_value,
      max_cap: row.max_cap ?? null,
      auto_apply: row.auto_apply ?? true,
      is_active: row.is_active ?? true,
    }
  }

  async updateRule(
    ruleId: string,
    schoolId: string,
    updates: Partial<ConcessionRule>,
    correlationId: string,
  ): Promise<ConcessionRule> {
    this.logger.debug({ correlationId, ruleId }, 'ConcessionRepository.updateRule')

    const updatePayload: Record<string, unknown> = {}
    if (updates.rule_name !== undefined) updatePayload.rule_name = updates.rule_name
    if (updates.eligibility_note !== undefined) updatePayload.eligibility_note = updates.eligibility_note
    if (updates.applies_to_heads !== undefined) updatePayload.applies_to_heads = updates.applies_to_heads
    if (updates.amount_type !== undefined) updatePayload.amount_type = updates.amount_type
    if (updates.concession_value !== undefined) updatePayload.concession_value = updates.concession_value
    if (updates.max_cap !== undefined) updatePayload.max_cap = updates.max_cap
    if (updates.auto_apply !== undefined) updatePayload.auto_apply = updates.auto_apply
    if (updates.is_active !== undefined) updatePayload.is_active = updates.is_active

    const { data, error } = await this.db
      .from('fee_concession_rules')
      .update(updatePayload as never)
      .eq('id', ruleId)
      .eq('school_id', schoolId)
      .select(
        'id, rule_name, concession_type, eligibility_note, applies_to_heads, amount_type, concession_value, max_cap, auto_apply, is_active',
      )
      .single()

    if (error) throw new DatabaseError(String(error.message), { correlationId })
    if (!data) throw new NotFoundError('Concession rule not found', { ruleId })

    const row = data as ConcessionRuleRow
    return {
      id: row.id,
      rule_name: row.rule_name,
      concession_type: row.concession_type,
      eligibility_note: row.eligibility_note ?? null,
      applies_to_heads: row.applies_to_heads ?? null,
      amount_type: row.amount_type as 'PERCENT' | 'FIXED',
      concession_value: row.concession_value,
      max_cap: row.max_cap ?? null,
      auto_apply: row.auto_apply ?? true,
      is_active: row.is_active ?? true,
    }
  }

  async deactivateRule(ruleId: string, schoolId: string, correlationId: string): Promise<void> {
    this.logger.debug({ correlationId, ruleId }, 'ConcessionRepository.deactivateRule')

    const { error } = await this.db
      .from('fee_concession_rules')
      .update({ is_active: false })
      .eq('id', ruleId)
      .eq('school_id', schoolId)

    if (error) throw new DatabaseError(String(error.message), { correlationId, ruleId })
  }
}
