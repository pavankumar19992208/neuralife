import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import type { FastifyPluginAsync } from 'fastify'
import { buildTestApp } from '../helpers/testApp.js'
import { makePrincipalJWT, makeTeacherJWT } from '../helpers/jwt.js'
import { UserRole } from '../../src/types/common.js'
import { signAccessToken } from '../../src/lib/jwt.js'
import type { SchoolHealthScore } from '../../src/types/common.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────

const DEMO_SCHOOL = 'SCH-AP-DEMO-0001'
const OTHER_SCHOOL = 'SCH-AP-DIFFERENT-0002'
const MISSING_SCHOOL = 'SCH-AP-DOESNOTEXIST'

const MOCK_SCORE: SchoolHealthScore = {
  overall_score: 62.5,
  band: 'NEEDS_ATTENTION',
  components: {
    attendance: 75.0,
    mastery: 55.0,
    at_risk_penalty: 58.0,
    fee_collection: 70.0,
    smartpad_sync: 66.0,
  },
  vs_last_week: 2.1,
  drivers: {
    positive: ['Fee collection strong at 90%'],
    warnings: ['3 students need learning support'],
    critical: ['4 AT_RISK students with no teacher intervention in 7 days'],
  },
  priority_actions: [
    {
      id: 'action-1',
      severity: 'critical',
      title: '4 students need immediate attention',
      description: 'AT_RISK students without teacher intervention for 7+ days',
      action_label: 'View students',
      action_href: '/students?filter=at_risk&no_intervention=true',
    },
  ],
  kpis: {
    total_students: 30,
    present_today: 27,
    present_today_pct: 90,
    active_smartpads: 2,
    total_smartpads: 3,
    mastery_avg: 55,
    at_risk_count: 4,
    fee_collection_pct: 90,
  },
  computed_at: new Date().toISOString(),
  academic_year_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
}

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockGetHealthScore = vi.fn()

vi.mock('../../src/services/analytics.service.js', () => ({
  AnalyticsService: vi.fn().mockImplementation(() => ({
    getHealthScore: mockGetHealthScore,
  })),
}))

vi.mock('../../src/repositories/analytics.repository.js', () => ({
  AnalyticsRepository: vi.fn().mockImplementation(() => ({})),
  todayIST: vi.fn().mockReturnValue('2026-05-11'),
  dateIST: vi.fn().mockReturnValue('2026-05-04'),
}))

vi.mock('../../src/lib/supabase.js', () => ({
  supabaseAdmin: {},
  supabaseAnon: {},
}))

vi.mock('../../src/lib/cache.js', () => ({
  cache: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    invalidate: vi.fn(),
  },
}))

// ─── Test app builder ─────────────────────────────────────────────────────

async function buildAnalyticsTestApp(): Promise<FastifyInstance> {
  const app = await buildTestApp()
  const { default: analyticsRoutes } = await import('../../src/routes/analytics.js') as {
    default: FastifyPluginAsync
  }
  await app.register(analyticsRoutes)
  await app.ready()
  return app
}

function makeSuperAdminJWT(schoolId = DEMO_SCHOOL) {
  return signAccessToken({
    sub: 'superadmin-uuid-001',
    role: UserRole.SUPER_ADMIN,
    school_id: schoolId,
  })
}

function makeSchoolAdminJWT(schoolId = DEMO_SCHOOL) {
  return signAccessToken({
    sub: 'schooladmin-uuid-001',
    role: UserRole.SCHOOL_ADMIN,
    school_id: schoolId,
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('GET /api/v1/analytics/school/:schoolId/health-score', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildAnalyticsTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetHealthScore.mockResolvedValue(MOCK_SCORE)
  })

  it('returns health score for PRINCIPAL with correct school', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/school/${DEMO_SCHOOL}/health-score`,
      headers: { authorization: `Bearer ${makePrincipalJWT(DEMO_SCHOOL)}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.overall_score).toBeGreaterThanOrEqual(0)
    expect(body.data.overall_score).toBeLessThanOrEqual(100)
    expect(['EXCELLENT', 'GOOD', 'NEEDS_ATTENTION', 'CRITICAL']).toContain(body.data.band)
    expect(body.data.kpis.at_risk_count).toBeGreaterThanOrEqual(4)
    expect(body.data.kpis.total_students).toBe(30)
    expect(Array.isArray(body.data.priority_actions)).toBe(true)
    expect(new Date(body.data.computed_at).getTime()).not.toBeNaN()
  })

  it('returns 403 when PRINCIPAL requests a different school', async () => {
    // JWT says school OTHER_SCHOOL, but route param is DEMO_SCHOOL
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/school/${DEMO_SCHOOL}/health-score`,
      headers: { authorization: `Bearer ${makePrincipalJWT(OTHER_SCHOOL)}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 404 for non-existent school when SUPER_ADMIN requests it', async () => {
    const { NotFoundError } = await import('../../src/utils/errors.js')
    mockGetHealthScore.mockRejectedValueOnce(
      new NotFoundError('No active academic year found for this school', { schoolId: MISSING_SCHOOL }),
    )

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/school/${MISSING_SCHOOL}/health-score`,
      headers: { authorization: `Bearer ${makeSuperAdminJWT()}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns 403 for TEACHER role', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/school/${DEMO_SCHOOL}/health-score`,
      headers: { authorization: `Bearer ${makeTeacherJWT()}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns same data on cache hit (second request)', async () => {
    const first = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/school/${DEMO_SCHOOL}/health-score`,
      headers: { authorization: `Bearer ${makePrincipalJWT(DEMO_SCHOOL)}` },
    })
    const second = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/school/${DEMO_SCHOOL}/health-score`,
      headers: { authorization: `Bearer ${makePrincipalJWT(DEMO_SCHOOL)}` },
    })
    expect(first.statusCode).toBe(200)
    expect(second.statusCode).toBe(200)
    expect(first.json().data.overall_score).toBe(second.json().data.overall_score)
  })

  it('returns 200 for SCHOOL_ADMIN with matching school', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/school/${DEMO_SCHOOL}/health-score`,
      headers: { authorization: `Bearer ${makeSchoolAdminJWT(DEMO_SCHOOL)}` },
    })
    expect(res.statusCode).toBe(200)
  })
})
