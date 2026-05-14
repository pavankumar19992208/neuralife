import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildTestApp } from '../helpers/testApp.js'
import {
  makePrincipalJWT,
  makeTeacherJWT,
  makeParentJWT,
} from '../helpers/jwt.js'

// ─── Constants ────────────────────────────────────────────────────────────

const DEMO_SCHOOL = 'SCH-AP-DEMO-0001'
const DEMO_STUDENT = 'NID-2025-AP-084291'
const DEMO_PAYMENT_ID = 'payment-uuid-001'
const IDEMPOTENCY_KEY = 'test-idem-key-001'

// ─── Mocks ────────────────────────────────────────────────────────────────

vi.mock('../../src/lib/supabase.js', () => ({
  supabaseAnon: {},
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
      single: vi.fn().mockResolvedValue({ data: { id: 'academic-year-id-001' }, error: null }),
    }),
  },
}))

const mockGetFeeStructure = vi.fn()
const mockGetCollectionSummary = vi.fn()
const mockGetStudentFeeBalance = vi.fn()
const mockGetUnpaidLedgerItems = vi.fn()
const mockUpdateLedgerAfterPayment = vi.fn()
const mockReverseLedgerPayment = vi.fn()

vi.mock('../../src/repositories/fee.repository.js', () => ({
  FeeRepository: vi.fn().mockImplementation(() => ({
    getFeeStructure: mockGetFeeStructure,
    getCollectionSummary: mockGetCollectionSummary,
    getStudentFeeBalance: mockGetStudentFeeBalance,
    getUnpaidLedgerItems: mockGetUnpaidLedgerItems,
    updateLedgerAfterPayment: mockUpdateLedgerAfterPayment,
    reverseLedgerPayment: mockReverseLedgerPayment,
  })),
}))

const mockCreatePayment = vi.fn()
const mockVoidPayment = vi.fn()
const mockGetPaymentReceipt = vi.fn()

vi.mock('../../src/repositories/payment.repository.js', () => ({
  PaymentRepository: vi.fn().mockImplementation(() => ({
    createPayment: mockCreatePayment,
    voidPayment: mockVoidPayment,
    getPaymentReceipt: mockGetPaymentReceipt,
  })),
}))

const mockGenerateReceiptNumber = vi.fn()

vi.mock('../../src/repositories/receipt.repository.js', () => ({
  ReceiptRepository: vi.fn().mockImplementation(() => ({
    generateReceiptNumber: mockGenerateReceiptNumber,
  })),
}))

const mockIdempotencyCheck = vi.fn()
const mockIdempotencyStore = vi.fn()

vi.mock('../../src/repositories/idempotency.repository.js', () => ({
  IdempotencyRepository: vi.fn().mockImplementation(() => ({
    check: mockIdempotencyCheck,
    store: mockIdempotencyStore,
  })),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────

const MOCK_COLLECTION_SUMMARY = {
  current_month_label: '2026-05',
  total_students: 30,
  total_due_month: 120000,
  total_collected_month: 85000,
  collection_rate: 71,
  paid_count: 17,
  partial_count: 2,
  overdue_count: 8,
  pending_count: 3,
  recent_payments: [],
}

const MOCK_FEE_BALANCE = {
  neura_id: DEMO_STUDENT,
  full_name: 'Arjun Reddy',
  class_year: 10,
  section: 'A',
  total_due: 4000,
  total_paid: 4000,
  total_balance: 0,
  status: 'PAID' as const,
  ledger: [],
}

const MOCK_RECEIPT = {
  receipt_number: 'VHS-2526-000001',
  payment_id: DEMO_PAYMENT_ID,
  neura_id: DEMO_STUDENT,
  student_name: 'Arjun Reddy',
  class_year: 10,
  section: 'A',
  school_name: 'Vikas High School',
  school_address: 'Guntur, AP',
  payment_date: '2026-05-12',
  amount: 4000,
  payment_mode: 'CASH' as const,
  transaction_reference: null,
  allocations: [{ fee_head: 'TUITION', period_label: '2026-05', amount: 4000 }],
  collected_by_name: 'K. Suresh Kumar',
}

const VALID_PAYMENT_BODY = {
  neura_id: DEMO_STUDENT,
  amount: 4000,
  payment_mode: 'CASH',
}

// ─── GET /api/v1/fees/collection ─────────────────────────────────────────

describe('GET /api/v1/fees/collection', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildTestApp()
    const feeRoutes = await import('../../src/routes/fees.js')
    await app.register(feeRoutes.default)
  })

  afterAll(() => app.close())

  beforeEach(() => {
    mockGetCollectionSummary.mockResolvedValue(MOCK_COLLECTION_SUMMARY)
  })

  it('returns 200 with summary for PRINCIPAL', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/fees/collection',
      headers: { authorization: `Bearer ${makePrincipalJWT()}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.total_students).toBe(30)
    expect(body.data.collection_rate).toBe(71)
    expect(body.data.paid_count).toBe(17)
  })

  it('returns 403 for TEACHER role', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/fees/collection',
      headers: { authorization: `Bearer ${makeTeacherJWT()}` },
    })
    expect(res.statusCode).toBe(403)
  })
})

// ─── GET /api/v1/fees/ledger/:neuraId ────────────────────────────────────

describe('GET /api/v1/fees/ledger/:neuraId', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildTestApp()
    const feeRoutes = await import('../../src/routes/fees.js')
    await app.register(feeRoutes.default)
  })

  afterAll(() => app.close())

  beforeEach(() => {
    mockGetStudentFeeBalance.mockResolvedValue(MOCK_FEE_BALANCE)
  })

  it('returns 200 for PRINCIPAL with full balance', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/fees/ledger/${DEMO_STUDENT}`,
      headers: { authorization: `Bearer ${makePrincipalJWT()}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.neura_id).toBe(DEMO_STUDENT)
    expect(body.data.status).toBe('PAID')
  })

  it('returns 403 for PARENT not linked to student', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/fees/ledger/${DEMO_STUDENT}`,
      headers: {
        authorization: `Bearer ${makeParentJWT(['NID-2025-AP-000000'])}`,
      },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 200 for PARENT linked to student', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/fees/ledger/${DEMO_STUDENT}`,
      headers: {
        authorization: `Bearer ${makeParentJWT([DEMO_STUDENT])}`,
      },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.total_balance).toBe(0)
  })
})

// ─── POST /api/v1/fees/payment ───────────────────────────────────────────

describe('POST /api/v1/fees/payment', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildTestApp()
    const feeRoutes = await import('../../src/routes/fees.js')
    await app.register(feeRoutes.default)
  })

  afterAll(() => app.close())

  beforeEach(() => {
    vi.clearAllMocks()
    mockIdempotencyCheck.mockResolvedValue(null)
    mockIdempotencyStore.mockResolvedValue(undefined)
    mockGetStudentFeeBalance.mockResolvedValue(MOCK_FEE_BALANCE)
    mockGenerateReceiptNumber.mockResolvedValue('VHS-2526-000001')
    mockCreatePayment.mockResolvedValue({ payment_id: DEMO_PAYMENT_ID })
    mockGetPaymentReceipt.mockResolvedValue(MOCK_RECEIPT)
  })

  it('returns 201 with receipt for PRINCIPAL + valid body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/fees/payment',
      headers: {
        authorization: `Bearer ${makePrincipalJWT()}`,
        'x-idempotency-key': IDEMPOTENCY_KEY,
      },
      payload: VALID_PAYMENT_BODY,
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.data.receipt_number).toBe('VHS-2526-000001')
    expect(body.data.amount).toBe(4000)
  })

  it('returns same 201 receipt on duplicate idempotency key', async () => {
    mockIdempotencyCheck.mockResolvedValue({ statusCode: 201, body: MOCK_RECEIPT })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/fees/payment',
      headers: {
        authorization: `Bearer ${makePrincipalJWT()}`,
        'x-idempotency-key': IDEMPOTENCY_KEY,
      },
      payload: VALID_PAYMENT_BODY,
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.receipt_number).toBe('VHS-2526-000001')
    expect(mockCreatePayment).not.toHaveBeenCalled()
  })

  it('returns 422 when x-idempotency-key header is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/fees/payment',
      headers: { authorization: `Bearer ${makePrincipalJWT()}` },
      payload: VALID_PAYMENT_BODY,
    })
    expect(res.statusCode).toBe(422)
  })

  it('returns 422 for amount <= 0', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/fees/payment',
      headers: {
        authorization: `Bearer ${makePrincipalJWT()}`,
        'x-idempotency-key': IDEMPOTENCY_KEY,
      },
      payload: { ...VALID_PAYMENT_BODY, amount: 0 },
    })
    expect(res.statusCode).toBe(422)
  })

  it('returns 422 for invalid payment_mode', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/fees/payment',
      headers: {
        authorization: `Bearer ${makePrincipalJWT()}`,
        'x-idempotency-key': IDEMPOTENCY_KEY,
      },
      payload: { ...VALID_PAYMENT_BODY, payment_mode: 'CRYPTO' },
    })
    expect(res.statusCode).toBe(422)
  })

  it('returns 403 for TEACHER role', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/fees/payment',
      headers: {
        authorization: `Bearer ${makeTeacherJWT()}`,
        'x-idempotency-key': IDEMPOTENCY_KEY,
      },
      payload: VALID_PAYMENT_BODY,
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 404 for non-existent neura_id', async () => {
    const { NotFoundError } = await import('../../src/utils/errors.js')
    mockGetStudentFeeBalance.mockRejectedValue(
      new NotFoundError('Student not found in this school', { neuraId: 'NID-FAKE-000000' }),
    )

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/fees/payment',
      headers: {
        authorization: `Bearer ${makePrincipalJWT()}`,
        'x-idempotency-key': IDEMPOTENCY_KEY,
      },
      payload: { ...VALID_PAYMENT_BODY, neura_id: 'NID-FAKE-000000' },
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── DELETE /api/v1/fees/payment/:paymentId ───────────────────────────────

describe('DELETE /api/v1/fees/payment/:paymentId', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildTestApp()
    const feeRoutes = await import('../../src/routes/fees.js')
    await app.register(feeRoutes.default)
  })

  afterAll(() => app.close())

  beforeEach(() => {
    mockVoidPayment.mockResolvedValue(undefined)
  })

  it('returns 200 for PRINCIPAL with valid reason', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/fees/payment/${DEMO_PAYMENT_ID}`,
      headers: { authorization: `Bearer ${makePrincipalJWT()}` },
      payload: { reason: 'Payment entered in error' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.message).toBe('Payment voided')
  })

  it('returns 403 for TEACHER role', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/fees/payment/${DEMO_PAYMENT_ID}`,
      headers: { authorization: `Bearer ${makeTeacherJWT()}` },
      payload: { reason: 'Payment entered in error' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 422 for reason shorter than 5 chars', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/fees/payment/${DEMO_PAYMENT_ID}`,
      headers: { authorization: `Bearer ${makePrincipalJWT()}` },
      payload: { reason: 'Bad' },
    })
    expect(res.statusCode).toBe(422)
  })
})
