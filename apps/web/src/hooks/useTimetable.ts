import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  TimetableStatus, TimetableConfig, TimetableSlotEntry,
  GeneratedTimetable, TimetableRequirement, PeriodConfigRow, AssemblyConfig,
} from '@/types/common'

export function useTimetableStatus() {
  return useQuery({
    queryKey: ['timetable', 'status'],
    queryFn: () => api.get<TimetableStatus>('/timetable/status'),
    staleTime: 30 * 1000,
  })
}

export function useTimetableConfig() {
  return useQuery({
    queryKey: ['timetable', 'config'],
    queryFn: () => api.get<TimetableConfig>('/timetable/config'),
    staleTime: 5 * 60 * 1000,
  })
}

export function useTimetable(classYear: number, section: string, enabled = true) {
  return useQuery({
    queryKey: ['timetable', 'entries', classYear, section],
    queryFn: () =>
      api.get<TimetableSlotEntry[]>('/timetable/entries', { class_year: classYear, section }),
    enabled,
    staleTime: 2 * 60 * 1000,
  })
}

export function useTeacherTimetable(teacherId: string, enabled = true) {
  return useQuery({
    queryKey: ['timetable', 'teacher', teacherId],
    queryFn: () => api.get<TimetableSlotEntry[]>(`/timetable/teacher/${teacherId}`),
    enabled,
    staleTime: 2 * 60 * 1000,
  })
}

export function useGenerateTimetable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { class_years?: number[]; seed?: number }) =>
      api.post<GeneratedTimetable>('/timetable/generate', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable', 'status'] })
    },
  })
}

export function useConfirmTimetable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      entries: TimetableSlotEntry[]
      conflict_count: number
      generation_id?: string
    }) => api.post<{ confirmed: true; entry_count: number }>('/timetable/confirm', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
    },
  })
}

export function useUpdateTimetableEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      class_year: number
      section: string
      day_of_week: string
      period_number: number
      subject: string
      teacher_id: string | null
      teacher_name?: string
      room_number?: string
    }) => api.put<TimetableSlotEntry>('/timetable/entry', body),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['timetable', 'entries', vars.class_year, vars.section] })
      queryClient.invalidateQueries({ queryKey: ['timetable', 'status'] })
    },
  })
}

export function useSaveTimetableConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      period_config?: PeriodConfigRow[]
      assembly_config?: AssemblyConfig | null
      requirements?: TimetableRequirement[]
    }) => api.post<TimetableConfig>('/timetable/config', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable', 'config'] })
    },
  })
}
