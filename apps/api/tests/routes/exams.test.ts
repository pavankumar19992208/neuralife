import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildTestApp } from '../helpers/testApp.js'
import {
  makePrincipalJWT,
  makeTeacherJWT,
  makeParentJWT,
} from '../helpers/jwt.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const DEMO_SCHOOL = 'SCH-AP-DEMO-0001'
const ACADEMIC_YEAR_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const EXAM_ID = '00000000-0000-0000-0000-000000000e01'
const SUBJECT_ID = '00000000-0000-0000-0000-0000000005b1'
const STUDENT_NEURA_ID = 'NID-2025-AP-084291'

const CREATE_EXAM_PAYLOAD = {
  name: 'FA 1 — 2025-26',
  exam_type: 'FA1',
  start_date: '2025-06-10',
  end_date: '2025-06-14',
  subjects: [
    { subject: 'Mathematics', class_year: 10, section: 'A', max_marks: 50, pass_marks: 18 },
  ],
}

const BULK_MARKS_PAYLOAD = {
  exam_subject_id: SUBJECT_ID,
  marks: [
    { neura_id: STUDENT_NEURA_ID, marks_obtained: 42, is_absent: false },
    { neura_id: 'NID-2025-AP-084292', marks_obtained: null, is_absent: true },
  ],
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/lib/supabase.js', () => ({
  supabaseAnon: {},
  supabaseAdmin: {},
}))

const mockCreateExam = vi.fn()
const mockListExams = vi.fn()
const mockGetExamById = vi.fn()
const mockUpdateExam = vi.fn()
const mockSoftDeleteExam = vi.fn()
const mockGetMarksSheet = vi.fn()
const mockBulkUpsertMarks = vi.fn()
const mockUpdateSingleStudentMark = vi.fn()
const mockGetExamResults = vi.fn()
const mockSaveExamResults = vi.fn()
const mockGetGradeConfig = vi.fn()
const mockGetMarksForExam = vi.fn()
const mockGetSubjectsForExam = vi.fn()
const mockGetStudentExamHistory = vi.fn()
const mockGetReportCardData = vi.fn()
const mockGetEnrolledStudentIds = vi.fn()

vi.mock('../../src/repositories/exam.repository.js', () => ({
  ExamRepository: vi.fn().mockImplementation(() => ({
    createExam: mockCreateExam,
    listExams: mockListExams,
    getExamById: mockGetExamById,
    updateExam: mockUpdateExam,
    softDeleteExam: mockSoftDeleteExam,
    addSubjects: vi.fn().mockResolvedValue([]),
    getMarksSheet: mockGetMarksSheet,
    bulkUpsertMarks: mockBulkUpsertMarks,
    updateSingleStudentMark: mockUpdateSingleStudentMark,
    getExamResults: mockGetExamResults,
    saveExamResults: mockSaveExamResults,
    getGradeConfig: mockGetGradeConfig,
    getMarksForExam: mockGetMarksForExam,
    getSubjectsForExam: mockGetSubjectsForExam,
    getStudentExamHistory: mockGetStudentExamHistory,
    getReportCardData: mockGetReportCardData,
    getEnrolledStudentIds: mockGetEnrolledStudentIds,
    storeAiInsight: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock('../../src/lib/claude.js', () => ({
  generateInsight: vi.fn().mockResolvedValue('AI insight text'),
  generateContent: vi.fn().mockResolvedValue('Content'),
}))

const mockCreditBulk = vi.fn()
vi.mock('../../src/repositories/neuracoin.repository.js', () => ({
  NeuraCoinRepository: vi.fn().mockImplementation(() => ({
    creditBulk: mockCreditBulk,
    getStudentBalance: vi.fn().mockResolvedValue(100),
    getStudentHistory: vi.fn().mockResolvedValue([]),
  })),
}))

vi.mock('../../src/repositories/enrollment.repository.js', () => ({
  EnrollmentRepository: vi.fn().mockImplementation(() => ({
    getCurrentAcademicYear: vi.fn().mockResolvedValue(ACADEMIC_YEAR_ID),
  })),
}))

const mockGetChapters = vi.fn()
const mockAutoSelectChapters = vi.fn()
vi.mock('../../src/repositories/syllabus.repository.js', () => ({
  SyllabusRepository: vi.fn().mockImplementation(() => ({
    getChapters: mockGetChapters,
    autoSelectChapters: mockAutoSelectChapters,
  })),
}))

const MOCK_EXAM = {
  id: EXAM_ID,
  school_id: DEMO_SCHOOL,
  academic_year_id: ACADEMIC_YEAR_ID,
  name: 'FA 1 — 2025-26',
  exam_type: 'FA1',
  description: null,
  start_date: '2025-06-10',
  end_date: '2025-06-14',
  status: 'DRAFT',
  created_by: 'user-001',
  created_at: '2025-06-01T10:00:00Z',
  updated_at: '2025-06-01T10:00:00Z',
  subjects: [
    {
      id: SUBJECT_ID,
      exam_id: EXAM_ID,
      subject: 'Mathematics',
      class_year: 10,
      section: 'A',
      max_marks: 50,
      pass_marks: 18,
      teacher_id: null,
      teacher_name: null,
      created_at: '2025-06-01T10:00:00Z',
    },
  ],
}

const MOCK_GRADE_CONFIG = [
  { id: '1', school_id: null, grade_label: 'A+', min_percentage: 90, max_percentage: 100, grade_points: 10, neuracoin_reward: 100, display_color: '#10b981', sort_order: 1 },
  { id: '2', school_id: null, grade_label: 'A', min_percentage: 75, max_percentage: 89.99, grade_points: 9, neuracoin_reward: 75, display_color: '#0d9488', sort_order: 2 },
  { id: '3', school_id: null, grade_label: 'B', min_percentage: 60, max_percentage: 74.99, grade_points: 8, neuracoin_reward: 50, display_color: '#1e40af', sort_order: 3 },
  { id: '4', school_id: null, grade_label: 'C', min_percentage: 50, max_percentage: 59.99, grade_points: 7, neuracoin_reward: 30, display_color: '#6366f1', sort_order: 4 },
  { id: '5', school_id: null, grade_label: 'D', min_percentage: 35, max_percentage: 49.99, grade_points: 6, neuracoin_reward: 15, display_color: '#f59e0b', sort_order: 5 },
  { id: '6', school_id: null, grade_label: 'F', min_percentage: 0, max_percentage: 34.99, grade_points: 0, neuracoin_reward: 0, display_color: '#ef4444', sort_order: 6 },
]

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Exam Routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildTestApp()
    const examRoutes = await import('../../src/routes/exams.js')
    await app.register(examRoutes.default)
  })
  afterAll(async () => {
    await app.close()
  })
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetExamById.mockResolvedValue(MOCK_EXAM)
    mockGetGradeConfig.mockResolvedValue(MOCK_GRADE_CONFIG)
    mockCreditBulk.mockResolvedValue(undefined)
  })

  // ─── POST /api/v1/exams ────────────────────────────────────────────────────

  describe('POST /api/v1/exams', () => {
    it('creates exam for principal', async () => {
      mockCreateExam.mockResolvedValue({ ...MOCK_EXAM })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/exams',
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
        payload: CREATE_EXAM_PAYLOAD,
      })
      expect(res.statusCode).toBe(201)
      expect(res.json().data.exam_type).toBe('FA1')
    })

    it('rejects teacher creating exam', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/exams',
        headers: { authorization: `Bearer ${makeTeacherJWT()}` },
        payload: CREATE_EXAM_PAYLOAD,
      })
      expect(res.statusCode).toBe(403)
    })

    it('rejects invalid exam_type', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/exams',
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
        payload: { ...CREATE_EXAM_PAYLOAD, exam_type: 'INVALID' },
      })
      expect(res.statusCode).toBe(422)
    })

    it('rejects if end_date before start_date', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/exams',
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
        payload: { ...CREATE_EXAM_PAYLOAD, start_date: '2025-06-14', end_date: '2025-06-10' },
      })
      expect([422, 400]).toContain(res.statusCode)
    })

    it('rejects parent access', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/exams',
        headers: { authorization: `Bearer ${makeParentJWT()}` },
        payload: CREATE_EXAM_PAYLOAD,
      })
      expect(res.statusCode).toBe(403)
    })
  })

  // ─── GET /api/v1/exams ─────────────────────────────────────────────────────

  describe('GET /api/v1/exams', () => {
    it('returns exam list for principal', async () => {
      mockListExams.mockResolvedValue([
        { ...MOCK_EXAM, subjects_count: 1, marks_entered_count: 0, marks_total_count: 0 },
      ])

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/exams',
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().data).toHaveLength(1)
    })

    it('returns exam list for teacher', async () => {
      mockListExams.mockResolvedValue([])
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/exams',
        headers: { authorization: `Bearer ${makeTeacherJWT()}` },
      })
      expect(res.statusCode).toBe(200)
    })

    it('rejects unauthenticated request', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/exams' })
      expect(res.statusCode).toBe(401)
    })
  })

  // ─── GET /api/v1/exams/:examId ─────────────────────────────────────────────

  describe('GET /api/v1/exams/:examId', () => {
    it('returns exam detail', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/exams/${EXAM_ID}`,
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().data.id).toBe(EXAM_ID)
    })

    it('rejects invalid UUID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/exams/not-a-uuid',
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
      })
      expect(res.statusCode).toBe(422)
    })
  })

  // ─── POST /api/v1/exams/:examId/marks ──────────────────────────────────────

  describe('POST /api/v1/exams/:examId/marks — bulk marks entry', () => {
    it('accepts valid marks from principal', async () => {
      mockBulkUpsertMarks.mockResolvedValue(2)
      mockUpdateExam.mockResolvedValue({ ...MOCK_EXAM, status: 'MARKS_PENDING' })

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/exams/${EXAM_ID}/marks`,
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
        payload: BULK_MARKS_PAYLOAD,
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().data.saved).toBe(2)
    })

    it('accepts marks from teacher for their subject', async () => {
      mockBulkUpsertMarks.mockResolvedValue(2)
      mockUpdateExam.mockResolvedValue({ ...MOCK_EXAM, status: 'MARKS_PENDING' })

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/exams/${EXAM_ID}/marks`,
        headers: { authorization: `Bearer ${makeTeacherJWT()}` },
        payload: BULK_MARKS_PAYLOAD,
      })
      expect(res.statusCode).toBe(200)
    })

    it('rejects marks > max_marks', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/exams/${EXAM_ID}/marks`,
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
        payload: {
          ...BULK_MARKS_PAYLOAD,
          marks: [{ neura_id: STUDENT_NEURA_ID, marks_obtained: 9999, is_absent: false }],
        },
      })
      // validation error: marks > max_marks (50)
      expect([400, 422]).toContain(res.statusCode)
    })

    it('rejects marks entry for published exam', async () => {
      mockGetExamById.mockResolvedValue({ ...MOCK_EXAM, status: 'PUBLISHED' })

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/exams/${EXAM_ID}/marks`,
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
        payload: BULK_MARKS_PAYLOAD,
      })
      expect([400, 422]).toContain(res.statusCode)
    })
  })

  // ─── POST /api/v1/exams/:examId/publish ────────────────────────────────────

  describe('POST /api/v1/exams/:examId/publish', () => {
    it('publishes exam and returns counts', async () => {
      mockGetSubjectsForExam.mockResolvedValue(MOCK_EXAM.subjects)
      mockGetMarksForExam.mockResolvedValue([
        { id: 'm1', exam_id: EXAM_ID, exam_subject_id: SUBJECT_ID, neura_id: STUDENT_NEURA_ID, marks_obtained: 45, is_absent: false, entered_by: 'user-001', entered_at: '2025-06-14T10:00:00Z', updated_at: '2025-06-14T10:00:00Z' },
      ])
      mockSaveExamResults.mockResolvedValue(undefined)
      mockUpdateExam.mockResolvedValue({ ...MOCK_EXAM, status: 'PUBLISHED' })

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/exams/${EXAM_ID}/publish`,
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().data.results_count).toBe(1)
    })

    it('computes correct grade for 90% score', async () => {
      mockGetSubjectsForExam.mockResolvedValue(MOCK_EXAM.subjects)
      mockGetMarksForExam.mockResolvedValue([
        { id: 'm1', exam_id: EXAM_ID, exam_subject_id: SUBJECT_ID, neura_id: STUDENT_NEURA_ID, marks_obtained: 45, is_absent: false, entered_by: 'u1', entered_at: '', updated_at: '' },
      ])
      mockSaveExamResults.mockResolvedValue(undefined)
      mockUpdateExam.mockResolvedValue({ ...MOCK_EXAM, status: 'PUBLISHED' })

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/exams/${EXAM_ID}/publish`,
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
      })
      expect(res.statusCode).toBe(200)
      // 45/50 = 90% → A+ → 100 coins + 25 topper bonus = 125 coins
      expect(res.json().data.total_neuracoin).toBe(125)
    })

    it('awards 0 coins for failing student', async () => {
      mockGetSubjectsForExam.mockResolvedValue(MOCK_EXAM.subjects)
      mockGetMarksForExam.mockResolvedValue([
        { id: 'm1', exam_id: EXAM_ID, exam_subject_id: SUBJECT_ID, neura_id: STUDENT_NEURA_ID, marks_obtained: 10, is_absent: false, entered_by: 'u1', entered_at: '', updated_at: '' },
      ])
      mockSaveExamResults.mockResolvedValue(undefined)
      mockUpdateExam.mockResolvedValue({ ...MOCK_EXAM, status: 'PUBLISHED' })

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/exams/${EXAM_ID}/publish`,
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
      })
      expect(res.statusCode).toBe(200)
      // 10/50 = 20% → F → 0 coins
      expect(res.json().data.total_neuracoin).toBe(0)
    })

    it('rejects re-publishing an already published exam', async () => {
      mockGetExamById.mockResolvedValue({ ...MOCK_EXAM, status: 'PUBLISHED' })

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/exams/${EXAM_ID}/publish`,
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
      })
      expect([400, 422]).toContain(res.statusCode)
    })

    it('allows teacher to publish', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/exams/${EXAM_ID}/publish`,
        headers: { authorization: `Bearer ${makeTeacherJWT()}` },
      })
      expect([200, 400, 422]).toContain(res.statusCode)
    })
  })

  // ─── DELETE /api/v1/exams/:examId ──────────────────────────────────────────

  describe('DELETE /api/v1/exams/:examId', () => {
    it('deletes draft exam', async () => {
      mockSoftDeleteExam.mockResolvedValue(undefined)

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/exams/${EXAM_ID}`,
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
      })
      expect(res.statusCode).toBe(200)
    })

    it('rejects deleting published exam', async () => {
      mockGetExamById.mockResolvedValue({ ...MOCK_EXAM, status: 'PUBLISHED' })

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/exams/${EXAM_ID}`,
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
      })
      expect([400, 422]).toContain(res.statusCode)
    })
  })

  // ─── Student exam history ──────────────────────────────────────────────────

  describe('GET /api/v1/exams/student/:neuraId', () => {
    it('returns student exam history', async () => {
      mockGetStudentExamHistory.mockResolvedValue([
        { exam_name: 'FA 1', exam_type: 'FA1', start_date: '2025-06-10', percentage: 84, grade: 'A', class_rank: 3, is_pass: true, neuracoin_earned: 75 },
      ])

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/exams/student/${STUDENT_NEURA_ID}`,
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().data).toHaveLength(1)
      expect(res.json().data[0].grade).toBe('A')
    })

    it('rejects parent access to student history', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/exams/student/${STUDENT_NEURA_ID}`,
        headers: { authorization: `Bearer ${makeParentJWT()}` },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  // ─── GET /api/v1/exams/chapters ───────────────────────────────────────────

  describe('GET /api/v1/exams/chapters', () => {
    const MOCK_CHAPTERS = [
      { id: 'ch-001', chapter_number: 1, title_en: 'Real Numbers', title_te: 'వాస్తవ సంఖ్యలు', textbook_id: 'tb-001', subject: 'Mathematics', grade: 10, board: 'SCERT_AP' },
      { id: 'ch-002', chapter_number: 2, title_en: 'Polynomials', title_te: 'బహుపదులు', textbook_id: 'tb-001', subject: 'Mathematics', grade: 10, board: 'SCERT_AP' },
    ]

    it('returns chapters for a grade/subject', async () => {
      mockGetChapters.mockResolvedValue(MOCK_CHAPTERS)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/exams/chapters?board=SCERT_AP&grade=10&subject=Mathematics',
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().data).toHaveLength(2)
      expect(res.json().data[0].title_en).toBe('Real Numbers')
    })

    it('returns empty array when no chapters found', async () => {
      mockGetChapters.mockResolvedValue([])

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/exams/chapters?board=SCERT_AP&grade=10&subject=Mathematics',
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().data).toHaveLength(0)
    })

    it('rejects missing query params', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/exams/chapters?board=SCERT_AP',
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
      })
      expect([400, 422]).toContain(res.statusCode)
    })

    it('rejects unauthenticated access', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/exams/chapters?board=SCERT_AP&grade=10&subject=Mathematics',
      })
      expect(res.statusCode).toBe(401)
    })
  })

  // ─── GET /api/v1/exams/chapters/auto-select ───────────────────────────────

  describe('GET /api/v1/exams/chapters/auto-select', () => {
    it('returns auto-selected chapter IDs for FA1', async () => {
      mockAutoSelectChapters.mockResolvedValue(['ch-001', 'ch-002'])

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/exams/chapters/auto-select?board=SCERT_AP&grade=10&subject=Mathematics&exam_type=FA1',
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().data.chapter_ids).toEqual(['ch-001', 'ch-002'])
    })

    it('returns empty array for PTM exam type', async () => {
      mockAutoSelectChapters.mockResolvedValue([])

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/exams/chapters/auto-select?board=SCERT_AP&grade=10&subject=Mathematics&exam_type=PTM',
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().data.chapter_ids).toEqual([])
    })

    it('rejects invalid exam_type', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/exams/chapters/auto-select?board=SCERT_AP&grade=10&subject=Mathematics&exam_type=INVALID',
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
      })
      expect([400, 422]).toContain(res.statusCode)
    })
  })

  // ─── POST /api/v1/exams/:examId/question-paper ────────────────────────────

  describe('POST /api/v1/exams/:examId/question-paper', () => {
    it('returns generated question paper', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/exams/${EXAM_ID}/question-paper`,
        headers: { authorization: `Bearer ${makePrincipalJWT()}` },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().data.question_paper).toBeTruthy()
    })

    it('rejects parent from generating question paper', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/exams/${EXAM_ID}/question-paper`,
        headers: { authorization: `Bearer ${makeParentJWT()}` },
      })
      expect(res.statusCode).toBe(403)
    })
  })
})
