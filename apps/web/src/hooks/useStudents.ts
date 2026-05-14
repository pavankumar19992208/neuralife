import { useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { StudentListFilters, StudentListItem, StudentDetail, AdmitStudentInput } from '@/types/common'

export function useStudents(filters: StudentListFilters, page: number, limit = 20) {
  const school_id = useAuthStore((s) => s.school_id)
  const queryClient = useQueryClient()

  // Strip _mastery_filter — it's applied client-side, not sent to API
  const apiParams = useMemo(() => {
    const { _mastery_filter: _mf, ...rest } = filters
    // When AT_RISK is selected, fetch more to ensure we get all AT_RISK students
    const effectiveLimit = _mf ? 100 : limit
    return { ...rest, page: _mf ? 1 : page, limit: effectiveLimit } as Record<string, unknown>
  }, [filters, page, limit])

  const query = useQuery({
    queryKey: ['students', apiParams, school_id],
    queryFn: () => api.list<StudentListItem>('/students', apiParams),
    enabled: !!school_id,
    staleTime: 2 * 60 * 1000,
  })

  // Apply client-side mastery filter for AT_RISK view
  const data = useMemo(() => {
    if (!query.data) return query.data
    const mf = filters._mastery_filter
    if (!mf) return query.data
    const filtered = query.data.data.filter((s) => s.mastery_classification === mf)
    const start = (page - 1) * limit
    const paginated = filtered.slice(start, start + limit)
    return {
      data: paginated,
      meta: { total: filtered.length, page, limit },
    }
  }, [query.data, filters._mastery_filter, page, limit])

  // Realtime: invalidate when mastery scores change
  useEffect(() => {
    if (!school_id || !supabase) return

    const channel = supabase
      .channel(`mastery:${school_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calibrated_mastery_scores',
          filter: `school_id=eq.${school_id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['students'] })
        },
      )
      .subscribe()

    return () => {
      void supabase!.removeChannel(channel)
    }
  }, [school_id, queryClient])

  return { ...query, data: data ?? query.data }
}

export function useStudentProfile(neuraId: string | undefined) {
  return useQuery({
    queryKey: ['students', neuraId],
    queryFn: () => api.get<StudentDetail>(`/students/${neuraId}`),
    enabled: !!neuraId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useAdmitStudent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: AdmitStudentInput; idempotencyKey: string }) =>
      api.post<StudentDetail>('/students', body, { idempotencyKey }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })
}

export function useUpdateStudent(neuraId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.put<{ message: string }>(`/students/${neuraId}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['students', neuraId] })
    },
  })
}
