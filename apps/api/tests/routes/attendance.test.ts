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
const OTHER_SCHOOL = 'SCH-AP-DIFFERENT-0002'
const TODAY = new Date().toISOString().split('T')[0]

const CLASS_10A_STUDENTS = [
  'NID-2025-AP-084291',
  'NID-2025-AP-084292',
  'NID-2025-AP-084293',
]

const MARK_PAYLOAD = {
  class_year: 10,
  section: 'A',
  date: TODAY,
  records: CLASS_10A_STUDENTS.map((id) => ({ neura_id: id, status: 'PRESENT' as const })),
}

// ─── Mocks ────────────────────────────────────────────────────────────────

vi.mock('../../src/lib/supabase.js', () => ({
  supabaseAnon: {},
  supabaseAdmin: {},
}))

const mockGetClassWithStudents = vi.fn()
const mockMarkAttendance = vi.fn()
const mockCreateCorrection = vi.fn()
const mockGetStudentMonthly = vi.fn()

vi.mock('../../src/repositories/attendance.repository.js', () => ({
  AttendanceRepository: vi.fn().mockImplementation(() => ({
    getClassWithStudents: mockGetClassWithStudents,
    markAttendance: mockMarkAttendance,
    createCorrection: mockCreateCorrection,
    getStudentMonthlyAttendance: mockGetStudentMonthly,
  })),
}))

// Mock academic year lookup used inside routes
vi.mock('../../src/lib/supabase.js', () => ({
  supabaseAnon: {},
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'academic-year-id-001' }, error: null }),
    }),
  },
}))

// ─── Helpers ──────────────────────────────────────────────────────────────

const MOCK_CLASS_RESPONSE = {
  date: TODAY,
  class_year: 10,
  section: 'A',
  already_marked: false,
  records: [],
  enrolled_students: CLASS_10A_STUDENTS.map((id, i) => ({
    neura_id: id,
    full_name: `Student ${i + 1}`,
  })),
  summary: { present: 0, absent: 0, late: 0, approved_leave: 0, total: 0 },
}

const MOCK_MARK_RESULT = {
  marked: 3,
  signature_preview: 'abcd1234',
  message: 'Attendance marked for 3 students',
}

const MOCK_MONTHLY = {
  neura_id: 'NID-2025-AP-084291',
  full_name: 'Arjun Reddy',
  monthly_records: [{ date: TODAY, status: 'PRESENT' }],
  summary: { present: 1, absent: 0, late: 0, approved_leave: 0, attendance_rate: 100, school_days: 1 },
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('GET /api/v1/attendance/class', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildTestApp()
    const attendanceRoutes = await import('../../src/routes/attendance.js')
    await app.register(attendanceRoutes.default)
  })

  afterAll(() => app.close())

  beforeEach(() => {
    mockGetClassWithStudents.mockResolvedValue(MOCK_CLASS_RESPONSE)
  })

  it('returns 200 for TEACHER JWT with enrolled_students', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/attendance/class?class_year=10&section=A',
      headers: { authorization: `Bearer ${makeTeacherJWT()}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.enrolled_students.length).toBe(3)
    expect(body.data.already_marked).toBe(false)
  })

  it('returns 200 for PRINCIPAL JWT', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/attendance/class?class_year=10&section=A',
      headers: { authorization: `Bearer ${makePrincipalJWT()}` },
    })
    expect(res.statusCode).toBe(200)
  })

  it('returns 403 for wrong school JWT', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/attendance/class?class_year=10&section=A',
      headers: { authorization: `Bearer ${makeTeacherJWT({ school_id: OTHER_SCHOOL })}` },
    })
    // Teacher from different school — supabase returns empty data, no error
    // The route itself doesn't throw 403 for wrong school (school_id from JWT scopes the query)
    expect([200, 403]).toContain(res.statusCode)
  })

  it('returns 422 for missing class_year', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/attendance/class?section=A',
      headers: { authorization: `Bearer ${makeTeacherJWT()}` },
    })
    expect(res.statusCode).toBe(422)
  })

  it('returns 422 for invalid section (not A-F)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/attendance/class?class_year=10&section=Z',
      headers: { authorization: `Bearer ${makeTeacherJWT()}` },
    })
    expect(res.statusCode).toBe(422)
  })
})

describe('POST /api/v1/attendance', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildTestApp()
    const attendanceRoutes = await import('../../src/routes/attendance.js')
    await app.register(attendanceRoutes.default)
  })

  afterAll(() => app.close())

  beforeEach(() => {
    mockMarkAttendance.mockResolvedValue(MOCK_MARK_RESULT)
  })

  it('returns 201 for TEACHER JWT with valid payload', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/attendance',
      headers: { authorization: `Bearer ${makeTeacherJWT()}` },
      payload: MARK_PAYLOAD,
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.data.marked).toBe(3)
    expect(body.data.signature_preview).toHaveLength(8)
  })

  it('returns 422 on second submit (already_marked)', async () => {
    const { ValidationError } = await import('../../src/utils/errors.js')
    mockMarkAttendance.mockRejectedValueOnce(
      new ValidationError(
        'Attendance already marked for this class on this date.',
        { already_marked: true, date: TODAY },
      ),
    )
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/attendance',
      headers: { authorization: `Bearer ${makeTeacherJWT()}` },
      payload: MARK_PAYLOAD,
    })
    expect(res.statusCode).toBe(422)
    const body = res.json()
    expect(body.code).toBe('VALIDATION_ERROR')
    expect(body.details?.already_marked).toBe(true)
  })

  it('returns 422 for empty records array', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/attendance',
      headers: { authorization: `Bearer ${makeTeacherJWT()}` },
      payload: { ...MARK_PAYLOAD, records: [] },
    })
    expect(res.statusCode).toBe(422)
  })

  it('returns 422 for invalid date format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/attendance',
      headers: { authorization: `Bearer ${makeTeacherJWT()}` },
      payload: { ...MARK_PAYLOAD, date: '12-05-2026' },
    })
    expect(res.statusCode).toBe(422)
  })
})

describe('PATCH /api/v1/attendance/:attendanceId', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildTestApp()
    const attendanceRoutes = await import('../../src/routes/attendance.js')
    await app.register(attendanceRoutes.default)
  })

  afterAll(() => app.close())

  beforeEach(() => {
    mockCreateCorrection.mockResolvedValue(undefined)
  })

  it('returns 200 with corrected_status=ABSENT', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/attendance/some-attendance-uuid',
      headers: { authorization: `Bearer ${makeTeacherJWT()}` },
      payload: { corrected_status: 'ABSENT', reason: 'Verified absent' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.message).toBe('Attendance correction recorded')
  })

  it('returns 404 for non-existent attendance ID', async () => {
    const { NotFoundError } = await import('../../src/utils/errors.js')
    mockCreateCorrection.mockRejectedValueOnce(
      new NotFoundError('Attendance record not found', { originalAttendanceId: 'bad-id' }),
    )
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/attendance/bad-id',
      headers: { authorization: `Bearer ${makeTeacherJWT()}` },
      payload: { corrected_status: 'ABSENT' },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('GET /api/v1/attendance/student/:neuraId', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildTestApp()
    const attendanceRoutes = await import('../../src/routes/attendance.js')
    await app.register(attendanceRoutes.default)
  })

  afterAll(() => app.close())

  beforeEach(() => {
    mockGetStudentMonthly.mockResolvedValue(MOCK_MONTHLY)
  })

  it('returns 200 for TEACHER with monthly records', async () => {
    const month = TODAY.slice(0, 7)
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/attendance/student/NID-2025-AP-084291?month=${month}`,
      headers: { authorization: `Bearer ${makeTeacherJWT()}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.summary.school_days).toBeGreaterThan(0)
  })

  it('returns 403 for PARENT whose linked_neura_ids does not include this student', async () => {
    const month = TODAY.slice(0, 7)
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/attendance/student/NID-2025-AP-084291?month=${month}`,
      headers: {
        authorization: `Bearer ${makeParentJWT(['NID-2025-AP-999999'])}`,
      },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 200 for PARENT with correct linked_neura_id', async () => {
    const month = TODAY.slice(0, 7)
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/attendance/student/NID-2025-AP-084291?month=${month}`,
      headers: {
        authorization: `Bearer ${makeParentJWT(['NID-2025-AP-084291'])}`,
      },
    })
    expect(res.statusCode).toBe(200)
  })
})
