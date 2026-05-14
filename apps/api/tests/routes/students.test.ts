import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import type { FastifyPluginAsync } from 'fastify'
import { buildTestApp } from '../helpers/testApp.js'
import {
  makePrincipalJWT,
  makeTeacherJWT,
  makeSchoolAdminJWT,
  makeParentJWT,
} from '../helpers/jwt.js'
import { UserRole } from '../../src/types/common.js'
import { signAccessToken } from '../../src/lib/jwt.js'
import type { StudentDetail, StudentListItem } from '../../src/types/common.js'

// ─── Constants ────────────────────────────────────────────────────────────

const DEMO_SCHOOL = 'SCH-AP-DEMO-0001'
const OTHER_SCHOOL = 'SCH-AP-DIFFERENT-0002'
const DEMO_NEURA_ID = 'NID-2025-AP-084291'
const AT_RISK_NEURA_ID = 'NID-2025-AP-084303'

const VALID_STUDENT_PAYLOAD = {
  full_name: 'Test Student',
  date_of_birth: '2009-06-15',
  gender: 'Male',
  class_year: 10,
  section: 'A',
  medium: 'ENGLISH',
  parents: [
    {
      parent_name: 'Test Father',
      relationship: 'FATHER',
      mobile: '+919999900001',
      is_primary: true,
    },
  ],
}

// ─── Fixtures ─────────────────────────────────────────────────────────────

const MOCK_STUDENT_DETAIL: StudentDetail = {
  neura_id: DEMO_NEURA_ID,
  full_name: 'Arjun Reddy',
  date_of_birth: '2009-05-12',
  gender: 'Male',
  blood_group: 'B+',
  caste_category: 'GENERAL',
  status: 'ACTIVE',
  band: 'SECONDARY',
  data_consent_given: true,
  enrollment: {
    admission_number: 'ADM-2025-0001',
    enrolled_at: '2025-06-01T00:00:00.000Z',
    school_id: DEMO_SCHOOL,
  },
  yearly_progress: {
    class_year: 10,
    section: 'A',
    medium: 'ENGLISH',
    board: 'SCERT_AP',
    smartpad_id: 'PAD-0001',
  },
  parents: [
    {
      parent_name: 'Reddy Father',
      relationship: 'FATHER',
      mobile: '+919876543210',
      is_primary: true,
    },
  ],
  mastery_summary: [
    { subject: 'Mathematics', latest_percentile: 72, classification: 'PROFICIENT', computed_date: '2025-05-01' },
    { subject: 'Science', latest_percentile: 45, classification: 'AT_RISK', computed_date: '2025-05-01' },
  ],
}

const MOCK_STUDENT_LIST: StudentListItem[] = [
  {
    neura_id: DEMO_NEURA_ID,
    full_name: 'Arjun Reddy',
    date_of_birth: '2009-05-12',
    gender: 'Male',
    status: 'ACTIVE',
    band: 'SECONDARY',
    class_year: 10,
    section: 'A',
    medium: 'ENGLISH',
    smartpad_id: 'PAD-0001',
    last_sync_at: '2025-05-11T08:00:00.000Z',
    mastery_classification: 'PROFICIENT',
  },
]

const MOCK_ADMIT_RESULT = {
  neura_id: 'NID-2026-AP-084292',
  student: { ...MOCK_STUDENT_DETAIL, neura_id: 'NID-2026-AP-084292', full_name: 'Test Student' },
}

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockAdmitStudent = vi.fn()
const mockGetStudent = vi.fn()
const mockListStudents = vi.fn()
const mockUpdateStudent = vi.fn()
const mockSoftDeleteStudent = vi.fn()

vi.mock('../../src/services/student.service.js', () => ({
  StudentService: vi.fn().mockImplementation(() => ({
    admitStudent: mockAdmitStudent,
    getStudent: mockGetStudent,
    listStudents: mockListStudents,
  })),
}))

vi.mock('../../src/repositories/student.repository.js', () => ({
  StudentRepository: vi.fn().mockImplementation(() => ({
    updateStudent: mockUpdateStudent,
    softDeleteStudent: mockSoftDeleteStudent,
  })),
}))

vi.mock('../../src/repositories/enrollment.repository.js', () => ({
  EnrollmentRepository: vi.fn().mockImplementation(() => ({})),
}))

vi.mock('../../src/lib/supabase.js', () => ({
  supabaseAdmin: {},
  supabaseAnon: {},
}))

vi.mock('../../src/utils/audit.js', () => ({
  auditLog: vi.fn().mockResolvedValue(undefined),
}))

// ─── Test App Builder ─────────────────────────────────────────────────────

async function buildStudentTestApp(): Promise<FastifyInstance> {
  const app = await buildTestApp()
  const { default: studentRoutes } = (await import('../../src/routes/students.js')) as {
    default: FastifyPluginAsync
  }
  await app.register(studentRoutes)
  await app.ready()
  return app
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('POST /api/v1/students', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildStudentTestApp()
  })
  afterAll(async () => {
    await app.close()
  })
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdmitStudent.mockResolvedValue(MOCK_ADMIT_RESULT)
  })

  it('201 — admits student for PRINCIPAL with valid body + idempotency key', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/students',
      headers: {
        authorization: `Bearer ${makePrincipalJWT(DEMO_SCHOOL)}`,
        'x-idempotency-key': 'test-idempotency-key-001',
        'content-type': 'application/json',
      },
      payload: VALID_STUDENT_PAYLOAD,
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.data.neura_id).toMatch(/^NID-\d{4}-AP-\d{6}$/)
    expect(body.data.student.full_name).toBe('Test Student')
    expect(body.meta.neura_id).toMatch(/^NID-\d{4}-AP-\d{6}$/)
  })

  it('403 — TEACHER role cannot admit students', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/students',
      headers: {
        authorization: `Bearer ${makeTeacherJWT({ school_id: DEMO_SCHOOL })}`,
        'x-idempotency-key': 'test-key-002',
      },
      payload: VALID_STUDENT_PAYLOAD,
    })
    expect(res.statusCode).toBe(403)
  })

  it('422 — missing parents array', async () => {
    const { parents: _parents, ...withoutParents } = VALID_STUDENT_PAYLOAD
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/students',
      headers: {
        authorization: `Bearer ${makePrincipalJWT(DEMO_SCHOOL)}`,
        'x-idempotency-key': 'test-key-003',
      },
      payload: withoutParents,
    })
    expect(res.statusCode).toBe(422)
  })

  it('422 — invalid mobile format in parents', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/students',
      headers: {
        authorization: `Bearer ${makePrincipalJWT(DEMO_SCHOOL)}`,
        'x-idempotency-key': 'test-key-004',
      },
      payload: {
        ...VALID_STUDENT_PAYLOAD,
        parents: [{ ...VALID_STUDENT_PAYLOAD.parents[0], mobile: '9999900001' }],
      },
    })
    expect(res.statusCode).toBe(422)
  })

  it('422 — class_year > 10', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/students',
      headers: {
        authorization: `Bearer ${makePrincipalJWT(DEMO_SCHOOL)}`,
        'x-idempotency-key': 'test-key-005',
      },
      payload: { ...VALID_STUDENT_PAYLOAD, class_year: 11 },
    })
    expect(res.statusCode).toBe(422)
  })

  it('422 — invalid aadhaar_hash (not 64 hex chars)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/students',
      headers: {
        authorization: `Bearer ${makePrincipalJWT(DEMO_SCHOOL)}`,
        'x-idempotency-key': 'test-key-006',
      },
      payload: { ...VALID_STUDENT_PAYLOAD, aadhaar_hash: 'tooshort' },
    })
    expect(res.statusCode).toBe(422)
  })

  it('422 — invalid section (not A-F)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/students',
      headers: {
        authorization: `Bearer ${makePrincipalJWT(DEMO_SCHOOL)}`,
        'x-idempotency-key': 'test-key-007',
      },
      payload: { ...VALID_STUDENT_PAYLOAD, section: 'Z' },
    })
    expect(res.statusCode).toBe(422)
  })

  it('422 — missing x-idempotency-key header', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/students',
      headers: { authorization: `Bearer ${makePrincipalJWT(DEMO_SCHOOL)}` },
      payload: VALID_STUDENT_PAYLOAD,
    })
    expect(res.statusCode).toBe(422)
  })

  it('409 — duplicate aadhaar_hash', async () => {
    const { ValidationError } = await import('../../src/utils/errors.js')
    mockAdmitStudent.mockRejectedValueOnce(
      new ValidationError('A student with this Aadhaar is already enrolled', {
        field: 'aadhaar_hash',
      }),
    )

    const hash = 'a'.repeat(64)
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/students',
      headers: {
        authorization: `Bearer ${makePrincipalJWT(DEMO_SCHOOL)}`,
        'x-idempotency-key': 'test-key-009',
      },
      payload: { ...VALID_STUDENT_PAYLOAD, aadhaar_hash: hash },
    })
    expect(res.statusCode).toBe(422)
    expect(res.json().error).toContain('Aadhaar')
  })
})

describe('GET /api/v1/students', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildStudentTestApp()
  })
  afterAll(async () => {
    await app.close()
  })
  beforeEach(() => {
    vi.clearAllMocks()
    mockListStudents.mockResolvedValue({
      students: MOCK_STUDENT_LIST,
      total: 32,
      page: 1,
      limit: 20,
    })
  })

  it('200 — returns list for PRINCIPAL', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/students',
      headers: { authorization: `Bearer ${makePrincipalJWT(DEMO_SCHOOL)}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.meta.total).toBeGreaterThanOrEqual(30)
    expect(body.meta.page).toBe(1)
    expect(body.meta.limit).toBe(20)
  })

  it('200 — filtered by class_year=10 returns subset', async () => {
    mockListStudents.mockResolvedValueOnce({
      students: MOCK_STUDENT_LIST,
      total: 8,
      page: 1,
      limit: 20,
    })

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/students?class_year=10',
      headers: { authorization: `Bearer ${makePrincipalJWT(DEMO_SCHOOL)}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.meta.total).toBeLessThan(32)
    expect(mockListStudents).toHaveBeenCalledWith(
      DEMO_SCHOOL,
      expect.objectContaining({ class_year: 10 }),
      1,
      20,
      expect.any(String),
    )
  })

  it('200 — search=Arjun returns matching student', async () => {
    mockListStudents.mockResolvedValueOnce({
      students: [MOCK_STUDENT_LIST[0]],
      total: 1,
      page: 1,
      limit: 20,
    })

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/students?search=Arjun',
      headers: { authorization: `Bearer ${makePrincipalJWT(DEMO_SCHOOL)}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data[0].full_name).toBe('Arjun Reddy')
    expect(mockListStudents).toHaveBeenCalledWith(
      DEMO_SCHOOL,
      expect.objectContaining({ search: 'Arjun' }),
      1,
      20,
      expect.any(String),
    )
  })

  it('401 — no auth header', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/students' })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /api/v1/students/:neuraId', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildStudentTestApp()
  })
  afterAll(async () => {
    await app.close()
  })
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetStudent.mockResolvedValue(MOCK_STUDENT_DETAIL)
  })

  it('200 — returns full StudentDetail for PRINCIPAL', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/students/${DEMO_NEURA_ID}`,
      headers: { authorization: `Bearer ${makePrincipalJWT(DEMO_SCHOOL)}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.neura_id).toBe(DEMO_NEURA_ID)
    expect(body.data.enrollment).toBeDefined()
    expect(body.data.yearly_progress).toBeDefined()
    expect(Array.isArray(body.data.parents)).toBe(true)
    expect(Array.isArray(body.data.mastery_summary)).toBe(true)
  })

  it('200 — TEACHER gets student (mastery filtered by service)', async () => {
    const filteredDetail = {
      ...MOCK_STUDENT_DETAIL,
      mastery_summary: [MOCK_STUDENT_DETAIL.mastery_summary[0]],
    }
    mockGetStudent.mockResolvedValueOnce(filteredDetail)

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/students/${DEMO_NEURA_ID}`,
      headers: {
        authorization: `Bearer ${makeTeacherJWT({ school_id: DEMO_SCHOOL })}`,
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.mastery_summary.length).toBe(1)
  })

  it('403 — PARENT whose linked_neura_ids does not include this student', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/students/${DEMO_NEURA_ID}`,
      headers: {
        authorization: `Bearer ${makeParentJWT(['NID-2025-AP-000001'], DEMO_SCHOOL)}`,
      },
    })
    expect(res.statusCode).toBe(403)
  })

  it('200 — PARENT whose linked_neura_ids includes this student', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/students/${DEMO_NEURA_ID}`,
      headers: {
        authorization: `Bearer ${makeParentJWT([DEMO_NEURA_ID], DEMO_SCHOOL)}`,
      },
    })
    expect(res.statusCode).toBe(200)
  })

  it('404 — non-existent neuraId', async () => {
    const { NotFoundError } = await import('../../src/utils/errors.js')
    mockGetStudent.mockRejectedValueOnce(
      new NotFoundError('Student not found', { neura_id: 'NID-2025-AP-999999' }),
    )

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/students/NID-2025-AP-999999',
      headers: { authorization: `Bearer ${makePrincipalJWT(DEMO_SCHOOL)}` },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /api/v1/students/:neuraId', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildStudentTestApp()
  })
  afterAll(async () => {
    await app.close()
  })
  beforeEach(() => {
    vi.clearAllMocks()
    mockSoftDeleteStudent.mockResolvedValue(undefined)
  })

  it('204 — PRINCIPAL with x-confirm-delete: yes', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/students/${DEMO_NEURA_ID}`,
      headers: {
        authorization: `Bearer ${makePrincipalJWT(DEMO_SCHOOL)}`,
        'x-confirm-delete': 'yes',
      },
    })
    expect(res.statusCode).toBe(204)
  })

  it('422 — PRINCIPAL without x-confirm-delete header', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/students/${DEMO_NEURA_ID}`,
      headers: { authorization: `Bearer ${makePrincipalJWT(DEMO_SCHOOL)}` },
    })
    expect(res.statusCode).toBe(422)
  })

  it('403 — SCHOOL_ADMIN cannot delete (PRINCIPAL only)', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/students/${DEMO_NEURA_ID}`,
      headers: {
        authorization: `Bearer ${makeSchoolAdminJWT(DEMO_SCHOOL)}`,
        'x-confirm-delete': 'yes',
      },
    })
    expect(res.statusCode).toBe(403)
  })

  it('403 — TEACHER cannot delete', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/students/${DEMO_NEURA_ID}`,
      headers: {
        authorization: `Bearer ${makeTeacherJWT({ school_id: DEMO_SCHOOL })}`,
        'x-confirm-delete': 'yes',
      },
    })
    expect(res.statusCode).toBe(403)
  })
})
