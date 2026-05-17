import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { FastifyBaseLogger } from 'fastify'
import { DatabaseError, NotFoundError } from '../utils/errors.js'
import type { CustomFeeHead } from '../types/common.js'

interface CustomFeeHeadRow {
  id: string
  head_code: string
  display_name: string
  description: string | null
  collection_type: string
  is_active: boolean | null
  custom_fee_head_amounts?: Array<{
    class_year: number | null
    student_category: string | null
    amount: number
  }> | null
}

interface AmountRow {
  class_year: number | null
  student_category: string | null
  amount: number
}

// Cast to bypass new-table type errors until migration is deployed
type LooseClient = SupabaseClient<Database> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any
}

export class CustomFeeHeadRepository {
  private readonly db: LooseClient

  constructor(
    supabase: SupabaseClient<Database>,
    private readonly logger: FastifyBaseLogger,
  ) {
    this.db = supabase as LooseClient
  }

  async list(
    schoolId: string,
    academicYearId: string,
    correlationId: string,
  ): Promise<CustomFeeHead[]> {
    this.logger.debug({ correlationId, schoolId }, 'CustomFeeHeadRepository.list')

    const { data, error } = await this.db
      .from('custom_fee_heads')
      .select(
        `id, head_code, display_name, description, collection_type, is_active,
         custom_fee_head_amounts(class_year, student_category, amount)`,
      )
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .order('created_at', { ascending: false })

    if (error) throw new DatabaseError(String(error.message), { correlationId })

    return ((data ?? []) as CustomFeeHeadRow[]).map((r) => ({
      id: r.id,
      head_code: r.head_code,
      display_name: r.display_name,
      description: r.description ?? null,
      collection_type: r.collection_type as 'MONTHLY' | 'TERMLY' | 'ANNUAL' | 'ONE_TIME',
      is_active: r.is_active ?? true,
      amounts: (r.custom_fee_head_amounts ?? []).map((a) => ({
        class_year: a.class_year ?? null,
        student_category: a.student_category ?? null,
        amount: a.amount,
      })),
    }))
  }

  async create(
    data: Omit<CustomFeeHead, 'id'> & { schoolId: string; academicYearId: string },
    correlationId: string,
  ): Promise<CustomFeeHead> {
    this.logger.debug({ correlationId, headCode: data.head_code }, 'CustomFeeHeadRepository.create')

    const { data: inserted, error } = await this.db
      .from('custom_fee_heads')
      .insert({
        school_id: data.schoolId,
        academic_year_id: data.academicYearId,
        head_code: data.head_code,
        display_name: data.display_name,
        description: data.description ?? null,
        collection_type: data.collection_type,
        is_active: true,
      })
      .select('id, head_code, display_name, description, collection_type, is_active')
      .single()

    if (error) throw new DatabaseError(String(error.message), { correlationId })
    if (!inserted) throw new DatabaseError('Failed to create custom fee head', { correlationId })

    const row = inserted as CustomFeeHeadRow
    const amounts = data.amounts ?? []
    if (amounts.length > 0) {
      const { error: amtErr } = await this.db.from('custom_fee_head_amounts').insert(
        amounts.map((a) => ({
          custom_fee_head_id: row.id,
          class_year: a.class_year ?? null,
          student_category: (a.student_category ?? null) as Database["public"]["Enums"]["fee_category"] | null,
          amount: a.amount,
        })),
      )
      if (amtErr) throw new DatabaseError(String(amtErr.message), { correlationId })
    }

    return {
      id: row.id,
      head_code: row.head_code,
      display_name: row.display_name,
      description: row.description ?? null,
      collection_type: row.collection_type as 'MONTHLY' | 'TERMLY' | 'ANNUAL' | 'ONE_TIME',
      is_active: row.is_active ?? true,
      amounts,
    }
  }

  async update(
    headId: string,
    schoolId: string,
    updates: Partial<CustomFeeHead>,
    correlationId: string,
  ): Promise<CustomFeeHead> {
    this.logger.debug({ correlationId, headId }, 'CustomFeeHeadRepository.update')

    const updatePayload: Record<string, unknown> = {}
    if (updates.display_name !== undefined) updatePayload.display_name = updates.display_name
    if (updates.description !== undefined) updatePayload.description = updates.description
    if (updates.collection_type !== undefined) updatePayload.collection_type = updates.collection_type
    if (updates.is_active !== undefined) updatePayload.is_active = updates.is_active

    const { data, error } = await this.db
      .from('custom_fee_heads')
      .update(updatePayload as never)
      .eq('id', headId)
      .eq('school_id', schoolId)
      .select('id, head_code, display_name, description, collection_type, is_active')
      .single()

    if (error) throw new DatabaseError(String(error.message), { correlationId })
    if (!data) throw new NotFoundError('Custom fee head not found', { headId })

    const row = data as CustomFeeHeadRow

    if (updates.amounts !== undefined) {
      await this.db.from('custom_fee_head_amounts').delete().eq('custom_fee_head_id', headId)
      if (updates.amounts.length > 0) {
        const { error: amtErr } = await this.db.from('custom_fee_head_amounts').insert(
          updates.amounts.map((a) => ({
            custom_fee_head_id: headId,
            class_year: a.class_year ?? null,
            student_category: (a.student_category ?? null) as Database["public"]["Enums"]["fee_category"] | null,
            amount: a.amount,
          })),
        )
        if (amtErr) throw new DatabaseError(String(amtErr.message), { correlationId })
      }
    }

    const { data: amtRows } = await this.db
      .from('custom_fee_head_amounts')
      .select('class_year, student_category, amount')
      .eq('custom_fee_head_id', headId)

    return {
      id: row.id,
      head_code: row.head_code,
      display_name: row.display_name,
      description: row.description ?? null,
      collection_type: row.collection_type as 'MONTHLY' | 'TERMLY' | 'ANNUAL' | 'ONE_TIME',
      is_active: row.is_active ?? true,
      amounts: ((amtRows ?? []) as AmountRow[]).map((a) => ({
        class_year: a.class_year ?? null,
        student_category: a.student_category ?? null,
        amount: a.amount,
      })),
    }
  }

  async deactivate(headId: string, schoolId: string, correlationId: string): Promise<void> {
    this.logger.debug({ correlationId, headId }, 'CustomFeeHeadRepository.deactivate')

    const { error } = await this.db
      .from('custom_fee_heads')
      .update({ is_active: false })
      .eq('id', headId)
      .eq('school_id', schoolId)

    if (error) throw new DatabaseError(String(error.message), { correlationId, headId })
  }
}
