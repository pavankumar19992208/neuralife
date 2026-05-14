import logger from '../lib/logger.js'
import { NotFoundError, ValidationError } from '../utils/errors.js'
import { auditLog } from '../utils/audit.js'
import type { FeeRepository } from '../repositories/fee.repository.js'
import type { PaymentRepository } from '../repositories/payment.repository.js'
import type { ReceiptRepository } from '../repositories/receipt.repository.js'
import type { IdempotencyRepository } from '../repositories/idempotency.repository.js'
import type { RecordPaymentInput, PaymentReceipt } from '../types/common.js'
import type { UserRole } from '../types/common.js'

export class FeeService {
  constructor(
    private readonly feeRepo: FeeRepository,
    private readonly paymentRepo: PaymentRepository,
    private readonly receiptRepo: ReceiptRepository,
    private readonly idempotencyRepo: IdempotencyRepository,
  ) {}

  async recordPayment(
    input: RecordPaymentInput,
    schoolId: string,
    collectedBy: string,
    collectedByRole: UserRole | string,
    academicYearId: string,
    idempotencyKey: string,
    correlationId: string,
  ): Promise<PaymentReceipt> {
    // 1. Idempotency check
    const existing = await this.idempotencyRepo.check(idempotencyKey, correlationId)
    if (existing) {
      logger.info({ correlationId, idempotencyKey }, 'Idempotency hit — returning cached receipt')
      return existing.body as PaymentReceipt
    }

    // 2. Validate student belongs to school (also gets balance for context)
    const balance = await this.feeRepo.getStudentFeeBalance(
      input.neura_id,
      schoolId,
      academicYearId,
      correlationId,
    )
    if (!balance) throw new NotFoundError('Student not found in this school', { neuraId: input.neura_id })

    // 3. Validate amount
    if (input.amount <= 0) {
      throw new ValidationError('Payment amount must be positive', { amount: input.amount })
    }

    // 4. Generate receipt number
    const receiptNumber = await this.receiptRepo.generateReceiptNumber(schoolId, correlationId)

    // 5. Create payment + allocations
    const { payment_id } = await this.paymentRepo.createPayment(
      { ...input, schoolId, academicYearId, collectedBy },
      receiptNumber,
      correlationId,
    )

    // 6. Fetch full receipt
    const receipt = await this.paymentRepo.getPaymentReceipt(payment_id, schoolId, correlationId)

    // 7. Store in idempotency cache
    await this.idempotencyRepo.store(idempotencyKey, 201, receipt, 24, correlationId)

    // 8. Audit log
    await auditLog({
      event_type: 'PAYMENT_RECORDED',
      actor_id: collectedBy,
      actor_role: collectedByRole,
      school_id: schoolId,
      target_neura_id: input.neura_id,
      result: 'SUCCESS',
      action_detail: { receipt_number: receiptNumber, amount: input.amount, payment_mode: input.payment_mode },
      correlationId,
    })

    return receipt
  }
}
