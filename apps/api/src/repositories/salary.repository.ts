import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { Logger } from 'pino'
import { DatabaseError } from '../utils/errors.js'
import type { CreateSalaryInput } from '../types/common.js'

export type SalaryStructure = {
  id: string
  basic: number
  gross_monthly: number | null
  hra_type: string | null
  hra_value: number | null
  da_type: string | null
  da_value: number | null
  transport_allowance: number | null
  special_allowance: number | null
  pf_applicable: boolean | null
  esi_applicable: boolean | null
  pt_applicable: boolean | null
  bank_account_number: string | null
  ifsc_code: string | null
  bank_name: string | null
  account_holder_name: string | null
  effective_from: string
  effective_to: string | null
  is_active: boolean | null
}

export class SalaryRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: Logger,
  ) {}

  computeGross(input: CreateSalaryInput): number {
    const hra =
      input.hra_type === 'PERCENT'
        ? (input.basic * input.hra_value) / 100
        : input.hra_value
    const da =
      input.da_type === 'PERCENT'
        ? (input.basic * input.da_value) / 100
        : input.da_value
    return input.basic + hra + da + input.transport_allowance + input.special_allowance
  }

  async findCurrent(
    teacherId: string,
    schoolId: string,
    correlationId: string,
  ): Promise<SalaryStructure | null> {
    this.logger.debug({ correlationId, teacherId, schoolId }, 'SalaryRepository.findCurrent')

    const { data, error } = await this.supabase
      .from('salary_structures')
      .select(
        'id, basic, gross_monthly, hra_type, hra_value, da_type, da_value, transport_allowance, special_allowance, pf_applicable, esi_applicable, pt_applicable, bank_account_number, ifsc_code, bank_name, account_holder_name, effective_from, effective_to, is_active',
      )
      .eq('teacher_id', teacherId)
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new DatabaseError(error.message, { correlationId, teacherId })
    return data ?? null
  }

  async createSalaryStructure(
    teacherId: string,
    schoolId: string,
    input: CreateSalaryInput,
    correlationId: string,
  ): Promise<void> {
    this.logger.debug({ correlationId, teacherId, schoolId }, 'SalaryRepository.createSalaryStructure')

    const now = new Date().toISOString()
    const gross = this.computeGross(input)

    // Deactivate old structure
    await this.supabase
      .from('salary_structures')
      .update({ is_active: false, effective_to: now })
      .eq('teacher_id', teacherId)
      .eq('school_id', schoolId)
      .eq('is_active', true)

    const { error } = await this.supabase.from('salary_structures').insert({
      teacher_id: teacherId,
      school_id: schoolId,
      basic: input.basic,
      hra_type: input.hra_type,
      hra_value: input.hra_value,
      da_type: input.da_type,
      da_value: input.da_value,
      transport_allowance: input.transport_allowance,
      special_allowance: input.special_allowance,
      gross_monthly: gross,
      pf_applicable: input.pf_applicable,
      esi_applicable: input.esi_applicable,
      pt_applicable: input.pt_applicable,
      bank_account_number: input.bank_account_number ?? null,
      ifsc_code: input.ifsc_code ?? null,
      bank_name: input.bank_name ?? null,
      account_holder_name: input.account_holder_name ?? null,
      effective_from: input.effective_from,
      is_active: true,
    })

    if (error) throw new DatabaseError(error.message, { correlationId, teacherId })
  }
}
