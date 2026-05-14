import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { SchoolHealthScore } from '@/types/common'

export function useDashboard() {
  const school_id = useAuthStore((s) => s.school_id)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['dashboard', 'health-score', school_id],
    queryFn: () =>
      api.get<SchoolHealthScore>(`/analytics/school/${school_id}/health-score`),
    enabled: !!school_id,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
  })

  // Real-time invalidation when attendance changes (only when Supabase Realtime is configured)
  useEffect(() => {
    if (!school_id || !supabase) return

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const channel = supabase
      .channel(`dashboard:${school_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
          filter: `school_id=eq.${school_id}`,
        },
        () => {
          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => {
            void queryClient.invalidateQueries({
              queryKey: ['dashboard', 'health-score', school_id],
            })
          }, 10_000)
        },
      )
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      void supabase!.removeChannel(channel)
    }
  }, [school_id, queryClient])

  return query
}
