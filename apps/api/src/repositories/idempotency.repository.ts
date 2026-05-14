import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { FastifyBaseLogger } from 'fastify'
import { DatabaseError } from '../utils/errors.js'

export class IdempotencyRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: FastifyBaseLogger,
  ) {}

  async check(
    key: string,
    correlationId: string,
  ): Promise<{ statusCode: number; body: unknown } | null> {
    this.logger.debug({ correlationId, key }, 'IdempotencyRepository.check')

    const { data, error } = await this.supabase
      .from('idempotency_keys')
      .select('response_body, status_code')
      .eq('key', key)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (error) throw new DatabaseError(error.message, { correlationId, key })
    if (!data) return null

    return { statusCode: data.status_code, body: data.response_body }
  }

  async store(
    key: string,
    statusCode: number,
    body: unknown,
    ttlHours = 24,
    correlationId: string,
  ): Promise<void> {
    this.logger.debug({ correlationId, key, ttlHours }, 'IdempotencyRepository.store')

    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString()

    const { error } = await this.supabase.from('idempotency_keys').upsert(
      { key, status_code: statusCode, response_body: body as never, expires_at: expiresAt },
      { onConflict: 'key', ignoreDuplicates: true },
    )

    if (error) throw new DatabaseError(error.message, { correlationId, key })
  }
}
