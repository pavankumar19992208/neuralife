import { useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  ExamSummary,
  ExamDetail,
  ExamResult,
  ExamAnalytics,
  MarksSheet,
  ReportCardData,
  StudentExamHistoryItem,
  CreateExamInput,
  BulkMarksInput,
  SyllabusChapter,
  ExamType,
  BatchPrepareResult,
} from '@/types/common'

// ─── List exams ───────────────────────────────────────────────────────────────

export function useExams(filters?: { status?: string; exam_type?: string }) {
  return useQuery({
    queryKey: ['exams', filters],
    queryFn: () => api.get<ExamSummary[]>('/exams', filters as Record<string, unknown>),
    staleTime: 2 * 60 * 1000,
  })
}

// ─── Exam detail ──────────────────────────────────────────────────────────────

export const useExam = (examId: string | undefined) => useExamDetail(examId)

export function useExamDetail(examId: string | undefined) {
  return useQuery({
    queryKey: ['exams', examId],
    queryFn: () => api.get<ExamDetail>(`/exams/${examId}`),
    enabled: !!examId,
    staleTime: 2 * 60 * 1000,
  })
}

// ─── Create exam ──────────────────────────────────────────────────────────────

export function useCreateExam() {
  const queryClient = useQueryClient()
  const idempotencyKey = useRef(crypto.randomUUID())
  return useMutation({
    mutationFn: (input: CreateExamInput) =>
      api.post<ExamDetail>('/exams', input, { idempotencyKey: idempotencyKey.current }),
    onSuccess: () => {
      idempotencyKey.current = crypto.randomUUID()
      void queryClient.invalidateQueries({ queryKey: ['exams'] })
    },
  })
}

// ─── Update exam ──────────────────────────────────────────────────────────────

export function useUpdateExam(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (updates: { name?: string; description?: string; start_date?: string; end_date?: string }) =>
      api.put<ExamDetail>(`/exams/${examId}`, updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exams'] })
    },
  })
}

// ─── Publish exam ─────────────────────────────────────────────────────────────

export function usePublishExam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (examId: string) =>
      api.post<{ results_count: number; total_neuracoin: number }>(`/exams/${examId}/publish`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exams'] })
    },
  })
}

// ─── Delete exam ──────────────────────────────────────────────────────────────

export function useDeleteExam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (examId: string) => api.delete<{ deleted: boolean }>(`/exams/${examId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exams'] })
    },
  })
}

// ─── Marks sheet ──────────────────────────────────────────────────────────────

export function useMarksSheet(examId: string | undefined, examSubjectId: string | undefined) {
  return useQuery({
    queryKey: ['marks-sheet', examId, examSubjectId],
    queryFn: () =>
      api.get<MarksSheet>(`/exams/${examId}/marks`, { exam_subject_id: examSubjectId } as Record<string, unknown>),
    enabled: !!examId && !!examSubjectId,
    staleTime: 30 * 1000,
  })
}

// ─── Submit marks (bulk) ──────────────────────────────────────────────────────

export function useSubmitMarks(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BulkMarksInput) =>
      api.post<{ saved: number }>(`/exams/${examId}/marks`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['marks-sheet', examId] })
      void queryClient.invalidateQueries({ queryKey: ['exams', examId] })
    },
  })
}

// ─── Update single student mark ───────────────────────────────────────────────

export function useUpdateMark(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      neuraId,
      examSubjectId,
      marks_obtained,
      is_absent,
    }: {
      neuraId: string
      examSubjectId: string
      marks_obtained?: number | null
      is_absent?: boolean
    }) =>
      api.patch<unknown>(`/exams/${examId}/marks/${neuraId}?exam_subject_id=${examSubjectId}`, {
        marks_obtained,
        is_absent,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['marks-sheet', examId] })
    },
  })
}

// ─── Exam results ─────────────────────────────────────────────────────────────

export function useExamResults(examId: string | undefined) {
  return useQuery({
    queryKey: ['exam-results', examId],
    queryFn: () => api.get<ExamResult[]>(`/exams/${examId}/results`),
    enabled: !!examId,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── Exam analytics ───────────────────────────────────────────────────────────

export function useExamAnalytics(examId: string | undefined) {
  return useQuery({
    queryKey: ['exam-analytics', examId],
    queryFn: () => api.get<ExamAnalytics>(`/exams/${examId}/analytics`),
    enabled: !!examId,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── Report card ──────────────────────────────────────────────────────────────

export function useReportCard(examId: string | undefined, neuraId: string | undefined) {
  return useQuery({
    queryKey: ['report-card', examId, neuraId],
    queryFn: () => api.get<ReportCardData>(`/exams/${examId}/report-card/${neuraId}`),
    enabled: !!examId && !!neuraId,
    staleTime: 10 * 60 * 1000,
  })
}

// ─── Student exam history ─────────────────────────────────────────────────────

export function useStudentExamHistory(neuraId: string | undefined) {
  return useQuery({
    queryKey: ['student-exam-history', neuraId],
    queryFn: () => api.get<StudentExamHistoryItem[]>(`/exams/student/${neuraId}`),
    enabled: !!neuraId,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── Chapters from Content Studio ────────────────────────────────────────────

export function useBatchPrepare() {
  return useMutation({
    mutationFn: (params: {
      board: string
      class_from: number
      class_to: number
      exam_type: ExamType
      start_date: string
      end_date: string
    }) => api.get<BatchPrepareResult>('/exams/batch/prepare', params as Record<string, unknown>),
  })
}

export function useSubjectsForGrade(board: string | undefined, grade: number | undefined) {
  return useQuery({
    queryKey: ['exam-subjects-for-grade', board, grade],
    queryFn: () => api.get<string[]>('/exams/subjects', { board, grade } as Record<string, unknown>),
    enabled: !!board && !!grade,
    staleTime: 60 * 60 * 1000,
  })
}

export function useChapters(board: string | undefined, grade: number | undefined, subject: string | undefined) {
  return useQuery({
    queryKey: ['exam-chapters', board, grade, subject],
    queryFn: () =>
      api.get<SyllabusChapter[]>('/exams/chapters', {
        board,
        grade,
        subject,
      } as Record<string, unknown>),
    enabled: !!board && !!grade && !!subject,
    staleTime: 60 * 60 * 1000,
  })
}

export function useAutoSelectChapters() {
  return useMutation({
    mutationFn: ({
      board,
      grade,
      subject,
      exam_type,
    }: {
      board: string
      grade: number
      subject: string
      exam_type: ExamType
    }) =>
      api.get<{ chapter_ids: string[] }>('/exams/chapters/auto-select', {
        board,
        grade,
        subject,
        exam_type,
      } as Record<string, unknown>),
  })
}

// ─── Generate question paper ──────────────────────────────────────────────────

export function useGenerateQuestionPaper() {
  return useMutation({
    mutationFn: (examId: string) =>
      api.post<{ question_paper: string }>(`/exams/${examId}/question-paper`, {}),
  })
}
