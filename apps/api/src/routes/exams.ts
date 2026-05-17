import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { ExamRepository } from '../repositories/exam.repository.js'
import { NeuraCoinRepository } from '../repositories/neuracoin.repository.js'
import { SyllabusRepository } from '../repositories/syllabus.repository.js'
import { ExamService } from '../services/exam.service.js'
import { EnrollmentRepository } from '../repositories/enrollment.repository.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { requireRole } from '../middleware/roleGuard.js'
import { ValidationError } from '../utils/errors.js'
import { UserRole } from '../types/common.js'
import logger from '../lib/logger.js'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const ExamIdParamsSchema = z.object({
  examId: z.string().uuid('Invalid exam ID'),
})

const ExamSubjectIdParamsSchema = z.object({
  examId: z.string().uuid('Invalid exam ID'),
  subjectId: z.string().uuid('Invalid subject ID'),
})

const ExamNeuraIdParamsSchema = z.object({
  examId: z.string().uuid('Invalid exam ID'),
  neuraId: z.string().min(1),
})

const NeuraIdParamsSchema = z.object({
  neuraId: z.string().min(1),
})

const ListExamsQuerySchema = z.object({
  status: z.string().optional(),
  exam_type: z.string().optional(),
})

const ExamSubjectInputSchema = z.object({
  subject: z.string().min(1).max(100).trim(),
  class_year: z.number().int().min(1).max(12),
  section: z.string().max(5).nullable().optional(),
  max_marks: z.number().int().min(1).max(1000).default(100),
  pass_marks: z.number().int().min(0).max(1000).default(35),
  teacher_id: z.string().uuid().nullable().optional(),
  exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

const CreateExamSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  exam_type: z.enum(['FA1', 'FA2', 'FA3', 'FA4', 'SA1', 'SA2', 'UNIT_TEST', 'PTM']),
  description: z.string().max(500).trim().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date must be YYYY-MM-DD'),
  subjects: z.array(ExamSubjectInputSchema).min(1, 'At least one subject required'),
  chapter_ids: z.array(z.string().uuid()).optional(),
  board: z.string().max(20).optional(),
  schedule_type: z.enum(['INDIVIDUAL', 'BATCH']).default('INDIVIDUAL'),
})

const ChaptersQuerySchema = z.object({
  board: z.string().min(1),
  grade: z.coerce.number().int().min(1).max(12),
  subject: z.string().min(1),
})

const AutoSelectChaptersQuerySchema = z.object({
  board: z.string().min(1),
  grade: z.coerce.number().int().min(1).max(12),
  subject: z.string().min(1),
  exam_type: z.enum(['FA1', 'FA2', 'FA3', 'FA4', 'SA1', 'SA2', 'UNIT_TEST', 'PTM']),
})

const BatchPrepareQuerySchema = z.object({
  board: z.string().min(1),
  class_from: z.coerce.number().int().min(1).max(12),
  class_to: z.coerce.number().int().min(1).max(12),
  exam_type: z.enum(['FA1', 'FA2', 'FA3', 'FA4', 'SA1', 'SA2', 'UNIT_TEST', 'PTM']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const UpdateExamSchema = z.object({
  name: z.string().min(2).max(200).trim().optional(),
  description: z.string().max(500).trim().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

const BulkMarksSchema = z.object({
  exam_subject_id: z.string().uuid('Invalid exam_subject_id'),
  marks: z.array(
    z.object({
      neura_id: z.string().min(1),
      marks_obtained: z.number().min(0).max(10000).nullable().default(null),
      is_absent: z.boolean().default(false),
    }),
  ).min(1),
})

const UpdateMarkSchema = z.object({
  marks_obtained: z.number().min(0).max(10000).nullable().optional(),
  is_absent: z.boolean().optional(),
})

const GetMarksQuerySchema = z.object({
  exam_subject_id: z.string().uuid('exam_subject_id is required'),
})

// ─── Routes ───────────────────────────────────────────────────────────────────

const examRoutes: FastifyPluginAsync = async (fastify) => {
  const examRepo = new ExamRepository(supabaseAdmin, logger)
  const coinRepo = new NeuraCoinRepository(supabaseAdmin, logger)
  const syllabusRepo = new SyllabusRepository(supabaseAdmin, logger)
  const enrollmentRepo = new EnrollmentRepository(supabaseAdmin, logger)
  const examService = new ExamService(examRepo, coinRepo, syllabusRepo, logger)

  // GET /api/v1/exams/batch/prepare — prepare batch schedule (auto-populates all classes + subjects)
  // Must be before /:examId routes
  fastify.get(
    '/api/v1/exams/batch/prepare',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id, sub: createdBy } = request.jwtPayload
      const { board, class_from, class_to, exam_type, start_date, end_date } =
        BatchPrepareQuerySchema.parse(request.query)

      if (class_to < class_from) throw new ValidationError('class_to must be >= class_from')
      if (new Date(end_date) < new Date(start_date)) throw new ValidationError('end_date must be >= start_date')

      const academicYearId = await enrollmentRepo.getCurrentAcademicYear(school_id, correlationId)

      const result = await examService.prepareBatch(
        school_id, academicYearId, board, class_from, class_to,
        exam_type, start_date, end_date, correlationId,
      )

      void createdBy
      return reply.send({ data: result })
    },
  )

  // GET /api/v1/exams/subjects — list subjects available in content studio for a board+grade
  // Must be before /:examId routes
  fastify.get(
    '/api/v1/exams/subjects',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { board, grade } = z.object({
        board: z.string().min(1),
        grade: z.coerce.number().int().min(1).max(12),
      }).parse(request.query)
      const subjects = await syllabusRepo.getSubjectsForGrade(board, grade, correlationId)
      return reply.send({ data: subjects })
    },
  )

  // GET /api/v1/exams/chapters — list chapters from content studio for a grade/subject
  // Must be before /:examId routes
  fastify.get(
    '/api/v1/exams/chapters',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { board, grade, subject } = ChaptersQuerySchema.parse(request.query)

      const chapters = await syllabusRepo.getChapters(board, grade, subject, correlationId)
      return reply.send({ data: chapters })
    },
  )

  // GET /api/v1/exams/chapters/auto-select — get auto-selected chapter IDs for an exam type
  fastify.get(
    '/api/v1/exams/chapters/auto-select',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { board, grade, subject, exam_type } = AutoSelectChaptersQuerySchema.parse(request.query)

      const chapterIds = await syllabusRepo.autoSelectChapters(board, grade, subject, exam_type, correlationId)
      return reply.send({ data: { chapter_ids: chapterIds } })
    },
  )

  // GET /api/v1/exams/analytics — school-wide analytics across exams (PRINCIPAL only)
  // Must be before /:examId routes
  fastify.get(
    '/api/v1/exams/analytics',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id } = request.jwtPayload

      const academicYearId = await enrollmentRepo.getCurrentAcademicYear(school_id, correlationId)
      const exams = await examService.listExams(school_id, academicYearId, correlationId, { status: 'PUBLISHED' })

      return reply.send({ data: exams })
    },
  )

  // GET /api/v1/exams/student/:neuraId — student's full exam history
  fastify.get(
    '/api/v1/exams/student/:neuraId',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id } = request.jwtPayload
      const { neuraId } = NeuraIdParamsSchema.parse(request.params)

      const history = await examService.getStudentExamHistory(neuraId, school_id, correlationId)
      return reply.send({ data: history })
    },
  )

  // GET /api/v1/exams — list all exams
  fastify.get(
    '/api/v1/exams',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id } = request.jwtPayload
      const query = ListExamsQuerySchema.parse(request.query)

      const academicYearId = await enrollmentRepo.getCurrentAcademicYear(school_id, correlationId)
      const exams = await examService.listExams(school_id, academicYearId, correlationId, query)

      return reply.send({ data: exams })
    },
  )

  // POST /api/v1/exams — create exam (PRINCIPAL only)
  fastify.post(
    '/api/v1/exams',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id, sub } = request.jwtPayload

      const body = CreateExamSchema.parse(request.body)
      const academicYearId = await enrollmentRepo.getCurrentAcademicYear(school_id, correlationId)

      const exam = await examService.createExam(school_id, academicYearId, body, sub, correlationId)

      logger.info({ correlationId, examId: exam.id }, 'Exam created')
      return reply.code(201).send({ data: exam })
    },
  )

  // GET /api/v1/exams/:examId — get exam detail
  fastify.get(
    '/api/v1/exams/:examId',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id } = request.jwtPayload
      const { examId } = ExamIdParamsSchema.parse(request.params)

      const exam = await examService.getExam(examId, school_id, correlationId)
      return reply.send({ data: exam })
    },
  )

  // PUT /api/v1/exams/:examId — update exam
  fastify.put(
    '/api/v1/exams/:examId',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id } = request.jwtPayload
      const { examId } = ExamIdParamsSchema.parse(request.params)
      const body = UpdateExamSchema.parse(request.body)

      const exam = await examService.updateExam(examId, school_id, body, correlationId)
      return reply.send({ data: exam })
    },
  )

  // DELETE /api/v1/exams/:examId — cancel/delete exam
  fastify.delete(
    '/api/v1/exams/:examId',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id } = request.jwtPayload
      const { examId } = ExamIdParamsSchema.parse(request.params)

      await examService.deleteExam(examId, school_id, correlationId)
      return reply.send({ data: { deleted: true } })
    },
  )

  // POST /api/v1/exams/:examId/publish — publish results + NeuraCoin
  fastify.post(
    '/api/v1/exams/:examId/publish',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id } = request.jwtPayload
      const { examId } = ExamIdParamsSchema.parse(request.params)

      const result = await examService.publishExam(examId, school_id, correlationId)

      logger.info({ correlationId, examId, ...result }, 'Exam published')
      return reply.send({ data: result })
    },
  )

  // GET /api/v1/exams/:examId/marks — marks sheet for a subject
  fastify.get(
    '/api/v1/exams/:examId/marks',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id, role, teacher_id } = request.jwtPayload
      const { examId } = ExamIdParamsSchema.parse(request.params)
      const { exam_subject_id } = GetMarksQuerySchema.parse(request.query)

      const sheet = await examService.getMarksSheet(
        examId,
        exam_subject_id,
        school_id,
        teacher_id,
        role,
        correlationId,
      )

      return reply.send({ data: sheet })
    },
  )

  // POST /api/v1/exams/:examId/marks — bulk submit marks
  fastify.post(
    '/api/v1/exams/:examId/marks',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id, sub, role, teacher_id } = request.jwtPayload
      const { examId } = ExamIdParamsSchema.parse(request.params)
      const body = BulkMarksSchema.parse(request.body)

      const result = await examService.submitMarks(examId, school_id, body, sub, teacher_id, role, correlationId)

      logger.info({ correlationId, examId, saved: result.saved }, 'Marks submitted')
      return reply.send({ data: result })
    },
  )

  // PATCH /api/v1/exams/:examId/marks/:neuraId — update single student mark
  fastify.patch(
    '/api/v1/exams/:examId/marks/:neuraId',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id, sub, role, teacher_id } = request.jwtPayload
      const { examId, neuraId } = ExamNeuraIdParamsSchema.parse(request.params)
      const body = UpdateMarkSchema.parse(request.body)

      // Derive exam_subject_id from query param
      const q = z.object({ exam_subject_id: z.string().uuid() }).parse(request.query)

      const mark = await examService.updateStudentMark(
        examId,
        q.exam_subject_id,
        neuraId,
        school_id,
        body,
        sub,
        teacher_id,
        role,
        correlationId,
      )

      return reply.send({ data: mark })
    },
  )

  // GET /api/v1/exams/:examId/results — full results table
  fastify.get(
    '/api/v1/exams/:examId/results',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id } = request.jwtPayload
      const { examId } = ExamIdParamsSchema.parse(request.params)

      const results = await examService.getExamResults(examId, school_id, correlationId)
      return reply.send({ data: results })
    },
  )

  // GET /api/v1/exams/:examId/analytics — per-exam analytics
  fastify.get(
    '/api/v1/exams/:examId/analytics',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id } = request.jwtPayload
      const { examId } = ExamIdParamsSchema.parse(request.params)

      const analytics = await examService.getExamAnalytics(examId, school_id, correlationId)
      return reply.send({ data: analytics })
    },
  )

  // POST /api/v1/exams/:examId/question-paper — generate AI question paper via Bedrock
  fastify.post(
    '/api/v1/exams/:examId/question-paper',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id } = request.jwtPayload
      const { examId } = ExamIdParamsSchema.parse(request.params)

      const questionPaper = await examService.generateQuestionPaper(examId, school_id, correlationId)
      return reply.send({ data: { question_paper: questionPaper } })
    },
  )

  // GET /api/v1/exams/:examId/report-card/:neuraId — report card data
  fastify.get(
    '/api/v1/exams/:examId/report-card/:neuraId',
    {
      preHandler: [
        fastify.authenticate,
        requireRole([UserRole.PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.TEACHER]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId
      const { school_id } = request.jwtPayload
      const { examId, neuraId } = ExamNeuraIdParamsSchema.parse(request.params)

      const card = await examService.getReportCard(examId, neuraId, school_id, correlationId)
      return reply.send({ data: card })
    },
  )
}

export default examRoutes
