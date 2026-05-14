import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type {
  TeacherListItem,
  TeacherDetail,
  TeacherLeaveData,
  CreateTeacherInput,
  CreateSalaryInput,
} from '@/types/common'

export function useTeachers(page = 1, limit = 20) {
  const school_id = useAuthStore((s) => s.school_id)
  return useQuery({
    queryKey: ['teachers', page, school_id],
    queryFn: () => api.list<TeacherListItem>('/teachers', { page, limit }),
    enabled: !!school_id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useTeacherProfile(teacherId: string | undefined) {
  return useQuery({
    queryKey: ['teachers', teacherId],
    queryFn: () => api.get<TeacherDetail>(`/teachers/${teacherId}`),
    enabled: !!teacherId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useTeacherLeave(teacherId: string | undefined) {
  return useQuery({
    queryKey: ['teachers', teacherId, 'leave'],
    queryFn: () => api.get<TeacherLeaveData>(`/teachers/${teacherId}/leave`),
    enabled: !!teacherId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateTeacher() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateTeacherInput) =>
      api.post<{ teacher_id: string; message: string }>('/teachers', body, {
        idempotencyKey: crypto.randomUUID(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teachers'] })
    },
  })
}

export function useSetSalary(teacherId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateSalaryInput) =>
      api.post<{ message: string; gross_monthly: number }>(`/teachers/${teacherId}/salary`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teachers', teacherId] })
    },
  })
}

export function useLeaveAction(teacherId: string, applicationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { action: 'APPROVE' | 'REJECT'; rejection_reason?: string }) =>
      api.put<{ message: string }>(`/teachers/${teacherId}/leave/${applicationId}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teachers', teacherId, 'leave'] })
    },
  })
}
