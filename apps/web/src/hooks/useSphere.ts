import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  ModerationSummary,
  NeuraSpherePost,
  SphereAnalytics,
  NeuraSphereSettings,
  CreatePostInput,
  PostActionInput
} from '@/types/common';

// Get moderation summary for principals
export function useModeration() {
  return useQuery({
    queryKey: ['sphere', 'moderation'],
    queryFn: async () => {
      return await api.get<ModerationSummary>('/api/v1/sphere/moderation');
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Take moderation action on a post
export function useSphereAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, action }: { postId: string; action: PostActionInput['action'] }) => {
      return await api.put<{ success: boolean; post: NeuraSpherePost }>(
        `/api/v1/sphere/posts/${postId}/action`,
        { action }
      );
    },
    onSuccess: () => {
      // Invalidate moderation data to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['sphere', 'moderation'] });
      queryClient.invalidateQueries({ queryKey: ['sphere', 'posts'] });
    },
  });
}

// Get posts with filters
export function useSpherePosts(filters: {
  author_type?: string;
  class_year?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, value.toString());
    }
  });

  return useQuery({
    queryKey: ['sphere', 'posts', filters],
    queryFn: async () => {
      return await api.get<{ data: NeuraSpherePost[]; meta: { total: number; page: number; limit: number } }>(`/api/v1/sphere/posts?${params.toString()}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Create a new post (principal only)
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePostInput) => {
      return await api.post<NeuraSpherePost>('/api/v1/sphere/posts', data);
    },
    onSuccess: () => {
      // Invalidate posts to show the new post
      queryClient.invalidateQueries({ queryKey: ['sphere', 'posts'] });
      queryClient.invalidateQueries({ queryKey: ['sphere', 'analytics'] });
    },
  });
}

// Get sphere analytics
export function useSphereAnalytics() {
  return useQuery({
    queryKey: ['sphere', 'analytics'],
    queryFn: async () => {
      return await api.get<SphereAnalytics>('/api/v1/sphere/analytics');
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Get sphere settings
export function useSphereSettings() {
  return useQuery({
    queryKey: ['sphere', 'settings'],
    queryFn: async () => {
      return await api.get<NeuraSphereSettings>('/api/v1/sphere/settings');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Update sphere settings
export function useUpdateSphereSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<NeuraSphereSettings>) => {
      return await api.put<NeuraSphereSettings>('/api/v1/sphere/settings', updates);
    },
    onSuccess: () => {
      // Invalidate settings to reflect changes
      queryClient.invalidateQueries({ queryKey: ['sphere', 'settings'] });
    },
  });
}