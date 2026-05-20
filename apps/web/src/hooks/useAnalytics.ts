import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  SchoolNarrative, AcademicAnalytics, AttendanceDeepAnalytics,
  FinancialAnalytics, DigitalAnalytics, YoYComparison, BenchmarkData,
  StudentIntelligence, SectionComparison, BoardExamResult, PredictionAccuracy,
  ShareToken, AnalyticsPeriod,
} from '@/types/common'

function periodParams(period: AnalyticsPeriod, classYear?: number, section?: string) {
  return {
    period,
    ...(classYear !== undefined ? { class_year: classYear } : {}),
    ...(section ? { section } : {}),
  }
}

export function useNarrative(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: ['analytics', 'narrative', period],
    queryFn: () => api.get<SchoolNarrative>('/analytics/narrative', { period }),
    staleTime: 24 * 60 * 60 * 1000,
  })
}

export function useRefreshNarrative() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (period: AnalyticsPeriod) =>
      api.post<SchoolNarrative>('/analytics/narrative', { period }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analytics', 'narrative'] }),
  })
}

export function useAcademicAnalytics(period: AnalyticsPeriod, classYear?: number) {
  return useQuery({
    queryKey: ['analytics', 'academic', period, classYear],
    queryFn: () => api.get<AcademicAnalytics>('/analytics/academic', periodParams(period, classYear)),
    staleTime: 30 * 60 * 1000,
  })
}

export function useAttendanceDeepAnalytics(
  period: AnalyticsPeriod,
  classYear?: number,
  section?: string,
) {
  return useQuery({
    queryKey: ['analytics', 'attendance', period, classYear, section],
    queryFn: () =>
      api.get<AttendanceDeepAnalytics>('/analytics/attendance', periodParams(period, classYear, section)),
    staleTime: 30 * 60 * 1000,
  })
}

export function useFinancialAnalytics(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: ['analytics', 'financial', period],
    queryFn: () => api.get<FinancialAnalytics>('/analytics/financial', { period }),
    staleTime: 30 * 60 * 1000,
  })
}

export function useDigitalAnalytics(period: AnalyticsPeriod, classYear?: number, section?: string) {
  return useQuery({
    queryKey: ['analytics', 'digital', period, classYear, section],
    queryFn: () =>
      api.get<DigitalAnalytics>('/analytics/digital', periodParams(period, classYear, section)),
    staleTime: 30 * 60 * 1000,
  })
}

export function useYoYComparison() {
  return useQuery({
    queryKey: ['analytics', 'yoy'],
    queryFn: () => api.get<YoYComparison[]>('/analytics/yoy'),
    staleTime: 24 * 60 * 60 * 1000,
  })
}

export function useBenchmarks() {
  return useQuery({
    queryKey: ['analytics', 'benchmarks'],
    queryFn: () => api.get<BenchmarkData[]>('/analytics/benchmarks'),
    staleTime: 4 * 60 * 60 * 1000,
  })
}

export function useStudentIntelligence(neuraId: string) {
  return useQuery({
    queryKey: ['analytics', 'student', neuraId],
    queryFn: () => api.get<StudentIntelligence>(`/analytics/student/${neuraId}`),
    staleTime: 30 * 60 * 1000,
    enabled: !!neuraId,
  })
}

export function useRefreshStudentInsight() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (neuraId: string) =>
      api.post<StudentIntelligence>(`/analytics/student/${neuraId}`),
    onSuccess: (_, neuraId) =>
      qc.invalidateQueries({ queryKey: ['analytics', 'student', neuraId] }),
  })
}

export function useSectionAnalytics(classYear: number, section: string, period: AnalyticsPeriod) {
  return useQuery({
    queryKey: ['analytics', 'section', classYear, section, period],
    queryFn: () =>
      api.get<{ students: StudentIntelligence[]; section_summary: SectionComparison }>(
        `/analytics/section/${classYear}/${section}`,
        { period },
      ),
    staleTime: 30 * 60 * 1000,
    enabled: !!classYear && !!section,
  })
}

export function useClassAnalytics(classYear: number, period: AnalyticsPeriod) {
  return useQuery({
    queryKey: ['analytics', 'class', classYear, period],
    queryFn: () =>
      api.get<{
        sections: SectionComparison[]
        top_students: StudentIntelligence[]
        bottom_students: StudentIntelligence[]
      }>(`/analytics/class/${classYear}`, { period }),
    staleTime: 30 * 60 * 1000,
    enabled: !!classYear,
  })
}

export function useBoardResults() {
  return useQuery({
    queryKey: ['analytics', 'board-results'],
    queryFn: () => api.get<BoardExamResult[]>('/analytics/board-results'),
    staleTime: 24 * 60 * 60 * 1000,
  })
}

export function usePredictionAccuracy() {
  return useQuery({
    queryKey: ['analytics', 'board-results', 'accuracy'],
    queryFn: () => api.get<PredictionAccuracy[]>('/analytics/board-results/accuracy'),
    staleTime: 24 * 60 * 60 * 1000,
  })
}

export function useCreateShareToken() {
  return useMutation({
    mutationFn: (urlPath: string) =>
      api.post<ShareToken>('/analytics/share', { url_path: urlPath }),
  })
}

export function useSharedAnalytics(token: string) {
  return useQuery({
    queryKey: ['shared-analytics', token],
    queryFn: () =>
      api.get<{ narrative: SchoolNarrative; academic: AcademicAnalytics }>(`/share/${token}`),
    staleTime: 5 * 60 * 1000,
    enabled: !!token,
  })
}
