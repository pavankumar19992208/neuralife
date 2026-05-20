import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { BookmarkItem } from '@/types/common'

export function useBookmarks() {
  return useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => api.get<BookmarkItem[]>('/bookmarks'),
    staleTime: 5 * 60 * 1000,
  })
}

export function useAddBookmark() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { url: string; title: string; icon?: string }) =>
      api.post<BookmarkItem>('/bookmarks', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookmarks'] }),
  })
}

export function useRemoveBookmark() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/bookmarks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookmarks'] }),
  })
}
