import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { FastifyBaseLogger } from 'fastify'
import { DatabaseError } from '../utils/errors.js'
import type { NeuraCoinEntry } from '../types/common.js'

export class NeuraCoinRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: FastifyBaseLogger,
  ) {}

  async creditBulk(
    entries: Array<{
      neura_id: string
      school_id: string
      transaction_type: string
      amount: number
      reference_id: string | null
      reference_type: string | null
      description: string
    }>,
    correlationId: string,
  ): Promise<void> {
    if (entries.length === 0) return
    this.logger.debug({ correlationId, count: entries.length }, 'NeuraCoinRepository.creditBulk')

    const { error: ledgerError } = await this.supabase
      .from('neuracoin_ledger')
      .insert(
        entries.map((e) => ({
          neura_id: e.neura_id,
          school_id: e.school_id,
          transaction_type: e.transaction_type,
          amount: e.amount,
          reference_id: e.reference_id,
          reference_type: e.reference_type,
          description: e.description,
          created_at: new Date().toISOString(),
        })),
      )

    if (ledgerError) throw new DatabaseError(ledgerError.message, { correlationId })

    // Update balances in a single RPC or batch
    // Group entries by neura_id and sum amounts
    const balanceDelta = new Map<string, number>()
    for (const e of entries) {
      balanceDelta.set(e.neura_id, (balanceDelta.get(e.neura_id) ?? 0) + e.amount)
    }

    // Update each student balance — Supabase doesn't support bulk increment,
    // so we do it per-student. For large classes, this is still fast enough (<50 students).
    await Promise.all(
      Array.from(balanceDelta.entries()).map(async ([neuraId, delta]) => {
        if (delta <= 0) return
        const { error } = await this.supabase.rpc('increment_neuracoin_balance', {
          p_neura_id: neuraId,
          p_amount: delta,
        })
        if (error) {
          this.logger.warn({ correlationId, neuraId, delta, error }, 'Failed to update neuracoin balance')
        }
      }),
    )
  }

  async getStudentBalance(neuraId: string, correlationId: string): Promise<number> {
    this.logger.debug({ correlationId, neuraId }, 'NeuraCoinRepository.getStudentBalance')

    const { data, error } = await this.supabase
      .from('students')
      .select('neuracoin_balance')
      .eq('neura_id', neuraId)
      .single()

    if (error) throw new DatabaseError(error.message, { correlationId })
    return (data?.neuracoin_balance as number) ?? 0
  }

  async getStudentHistory(neuraId: string, limit: number, correlationId: string): Promise<NeuraCoinEntry[]> {
    this.logger.debug({ correlationId, neuraId }, 'NeuraCoinRepository.getStudentHistory')

    const { data, error } = await this.supabase
      .from('neuracoin_ledger')
      .select('id, neura_id, transaction_type, amount, description, reference_id, created_at')
      .eq('neura_id', neuraId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw new DatabaseError(error.message, { correlationId })
    return (data ?? []) as unknown as NeuraCoinEntry[]
  }
}
