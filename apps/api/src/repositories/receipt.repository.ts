import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { FastifyBaseLogger } from 'fastify'
import { DatabaseError, NotFoundError } from '../utils/errors.js'

export class ReceiptRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: FastifyBaseLogger,
  ) {}

  async generateReceiptNumber(schoolId: string, correlationId: string): Promise<string> {
    this.logger.debug({ correlationId, schoolId }, 'ReceiptRepository.generateReceiptNumber')

    // Get current academic year label for this school
    const { data: ay, error: ayErr } = await this.supabase
      .from('academic_years')
      .select('year_label')
      .eq('school_id', schoolId)
      .eq('is_current', true)
      .limit(1)
      .single()

    if (ayErr || !ay) {
      throw new NotFoundError('No active academic year found for school', { schoolId, correlationId })
    }

    // Atomically increment via RPC
    const { data, error } = await (this.supabase as unknown as {
      rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: string | null; error: unknown }>
    }).rpc('generate_receipt_number', {
      p_school_id: schoolId,
      p_year_label: ay.year_label,
    })

    if (error) {
      const msg = (error as { message?: string })?.message ?? String(error)
      if (msg.includes('not configured')) {
        throw new NotFoundError(
          'School receipt counter not configured. Complete school onboarding first.',
          { schoolId },
        )
      }
      throw new DatabaseError(msg, { correlationId, schoolId })
    }

    if (!data) throw new DatabaseError('Receipt number generation returned null', { correlationId })

    return data
  }
}
