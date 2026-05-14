import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import type { FastifyBaseLogger } from 'fastify'
import { DatabaseError, NotFoundError, ValidationError } from '../utils/errors.js'
import type { RecordPaymentInput, PaymentReceipt } from '../types/common.js'
import { FeeRepository } from './fee.repository.js'

function todayIST(): string {
  const now = new Date()
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0]
}

export class PaymentRepository {
  private feeRepo: FeeRepository

  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: FastifyBaseLogger,
  ) {
    this.feeRepo = new FeeRepository(supabase, logger)
  }

  async createPayment(
    input: RecordPaymentInput & {
      schoolId: string
      academicYearId: string
      collectedBy: string
    },
    receiptNumber: string,
    correlationId: string,
  ): Promise<{ payment_id: string }> {
    this.logger.debug(
      { correlationId, neuraId: input.neura_id, amount: input.amount },
      'PaymentRepository.createPayment',
    )

    // Step 1: Insert fee_payment
    const { data: payment, error: payErr } = await this.supabase
      .from('fee_payments')
      .insert({
        receipt_number: receiptNumber,
        neura_id: input.neura_id,
        school_id: input.schoolId,
        academic_year_id: input.academicYearId,
        total_amount: input.amount,
        payment_date: todayIST(),
        payment_mode: input.payment_mode as Database['public']['Enums']['payment_mode'],
        transaction_reference: input.transaction_reference ?? null,
        collected_by: input.collectedBy,
        notes: input.notes ?? null,
        voided: false,
      })
      .select('id')
      .single()

    if (payErr || !payment) throw new DatabaseError(payErr?.message ?? 'Insert failed', { correlationId })

    const paymentId = payment.id

    // Step 2: Determine allocations
    let allocations: Array<{ ledger_id: string; amount: number }>

    if (input.ledger_allocations && input.ledger_allocations.length > 0) {
      allocations = input.ledger_allocations
    } else {
      // Auto-allocate: oldest unpaid first
      const unpaid = await this.feeRepo.getUnpaidLedgerItems(
        input.neura_id,
        input.schoolId,
        input.academicYearId,
        correlationId,
      )

      allocations = []
      let remaining = input.amount

      for (const item of unpaid) {
        if (remaining <= 0) break
        const itemBalance = item.amount_due - item.amount_paid
        const alloc = Math.min(remaining, itemBalance)
        if (alloc > 0) {
          allocations.push({ ledger_id: item.id, amount: alloc })
          remaining -= alloc
        }
      }
    }

    // Step 3: Insert allocations
    if (allocations.length > 0) {
      const allocRows = allocations.map((a) => ({
        payment_id: paymentId,
        ledger_id: a.ledger_id,
        amount_allocated: a.amount,
      }))

      const { error: allocErr } = await this.supabase.from('fee_payment_allocations').insert(allocRows)
      if (allocErr) throw new DatabaseError(allocErr.message, { correlationId, paymentId })

      // Step 4: Update ledger items
      await Promise.all(
        allocations.map((a) =>
          this.feeRepo.updateLedgerAfterPayment(a.ledger_id, a.amount, correlationId),
        ),
      )
    }

    return { payment_id: paymentId }
  }

  async voidPayment(
    paymentId: string,
    schoolId: string,
    voidedBy: string,
    voidReason: string,
    correlationId: string,
  ): Promise<void> {
    this.logger.debug({ correlationId, paymentId }, 'PaymentRepository.voidPayment')

    // Fetch payment
    const { data: payment, error: fetchErr } = await this.supabase
      .from('fee_payments')
      .select('id, school_id, voided')
      .eq('id', paymentId)
      .eq('school_id', schoolId)
      .single()

    if (fetchErr || !payment) throw new NotFoundError('Payment not found', { paymentId })
    if (payment.voided) throw new ValidationError('Payment already voided', { paymentId })

    // Fetch allocations before voiding
    const { data: allocations, error: allocFetchErr } = await this.supabase
      .from('fee_payment_allocations')
      .select('ledger_id, amount_allocated')
      .eq('payment_id', paymentId)

    if (allocFetchErr) throw new DatabaseError(allocFetchErr.message, { correlationId })

    // Void the payment
    const { error: voidErr } = await this.supabase
      .from('fee_payments')
      .update({
        voided: true,
        voided_by: voidedBy,
        voided_at: new Date().toISOString(),
        void_reason: voidReason,
      })
      .eq('id', paymentId)

    if (voidErr) throw new DatabaseError(voidErr.message, { correlationId })

    // Reverse ledger updates
    await Promise.all(
      (allocations ?? []).map((a) =>
        this.feeRepo.reverseLedgerPayment(a.ledger_id, a.amount_allocated, correlationId),
      ),
    )
  }

  async getPaymentReceipt(
    paymentId: string,
    schoolId: string,
    correlationId: string,
  ): Promise<PaymentReceipt> {
    this.logger.debug({ correlationId, paymentId }, 'PaymentRepository.getPaymentReceipt')

    const [paymentResult, schoolResult] = await Promise.all([
      this.supabase
        .from('fee_payments')
        .select(`
          id, receipt_number, neura_id, total_amount, payment_date, payment_mode,
          transaction_reference,
          students!fee_payments_neura_id_fkey(full_name),
          teachers!fee_payments_collected_by_fkey(full_name),
          fee_payment_allocations(amount_allocated, fee_ledger(fee_head, period_label))
        `)
        .eq('id', paymentId)
        .eq('school_id', schoolId)
        .single(),

      this.supabase
        .from('schools')
        .select('name, full_address')
        .eq('id', schoolId)
        .single(),
    ])

    if (paymentResult.error || !paymentResult.data) {
      throw new NotFoundError('Payment not found', { paymentId, correlationId })
    }
    if (schoolResult.error || !schoolResult.data) {
      throw new DatabaseError('School not found', { schoolId, correlationId })
    }

    const p = paymentResult.data
    const school = schoolResult.data

    const studentArr = p.students as unknown as Array<{ full_name: string }> | null
    const teacherArr = p.teachers as unknown as Array<{ full_name: string }> | null
    const allocArr = p.fee_payment_allocations as unknown as Array<{
      amount_allocated: number
      fee_ledger: { fee_head: string; period_label: string | null } | null
    }> | null

    // Get class/section for student
    const { data: syp } = await this.supabase
      .from('student_yearly_progress')
      .select('class_year, section')
      .eq('neura_id', p.neura_id)
      .eq('school_id', schoolId)
      .maybeSingle()

    return {
      receipt_number: p.receipt_number,
      payment_id: paymentId,
      neura_id: p.neura_id,
      student_name: Array.isArray(studentArr) && studentArr.length > 0 ? studentArr[0].full_name : '',
      class_year: syp?.class_year ?? 0,
      section: syp?.section ?? '',
      school_name: school.name,
      school_address: school.full_address,
      payment_date: p.payment_date,
      amount: p.total_amount,
      payment_mode: p.payment_mode,
      transaction_reference: p.transaction_reference ?? null,
      allocations: (allocArr ?? []).map((a) => ({
        fee_head: a.fee_ledger?.fee_head ?? 'OTHER',
        period_label: a.fee_ledger?.period_label ?? null,
        amount: a.amount_allocated,
      })),
      collected_by_name:
        Array.isArray(teacherArr) && teacherArr.length > 0 ? teacherArr[0].full_name : 'Unknown',
    }
  }
}
