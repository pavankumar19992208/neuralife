import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { ClassAttendanceResponse, MonthlyStudentAttendance, AttendanceStatus, SchoolAttendanceAnalytics, AnalyticsRange } from '@/types/common'

export function useClassAttendance(
  classYear: number | null,
  section: string | null,
  date: string,
) {
  const school_id = useAuthStore((s) => s.school_id)
  return useQuery({
    queryKey: ['attendance', 'class', classYear, section, date, school_id],
    queryFn: () =>
      api.get<ClassAttendanceResponse>('/attendance/class', {
        class_year: classYear,
        section,
        date,
      }),
    enabled: !!classYear && !!section,
    staleTime: 0,
  })
}

export function useMarkAttendance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      class_year: number
      section: string
      date: string
      records: Array<{ neura_id: string; status: AttendanceStatus; reason?: string }>
    }) => api.post<{ marked: number; signature_preview: string; message: string }>('/attendance', payload),
    onSuccess: (data, variables) => {
      toast.success(`Attendance submitted · Verified: ...${data.signature_preview}`)
      void queryClient.invalidateQueries({
        queryKey: ['attendance', 'class', variables.class_year, variables.section, variables.date],
      })
    },
  })
}

export function useCorrectAttendance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      attendanceId,
      corrected_status,
      correction_time,
      reason,
    }: {
      attendanceId: string
      corrected_status: AttendanceStatus
      correction_time?: string
      reason?: string
    }) =>
      api.patch<{ message: string }>(`/attendance/${attendanceId}`, {
        corrected_status,
        correction_time,
        reason,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['attendance', 'class'] })
    },
  })
}

export function useStudentMonthlyAttendance(neuraId: string, month: string) {
  return useQuery({
    queryKey: ['attendance', 'student', neuraId, month],
    queryFn: () =>
      api.get<MonthlyStudentAttendance>(`/attendance/student/${neuraId}`, { month }),
    enabled: !!neuraId && !!month,
    staleTime: 5 * 60 * 1000,
  })
}

export function useAttendanceAnalytics(range: AnalyticsRange, date: string) {
  return useQuery({
    queryKey: ['attendance', 'analytics', range, date],
    queryFn: () =>
      api.get<SchoolAttendanceAnalytics>('/attendance/analytics', { range, date }),
    staleTime: 5 * 60 * 1000,
  })
}
