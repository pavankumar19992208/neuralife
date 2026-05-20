import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  SchoolProfile,
  AcademicYearRow,
  FeeCategory,
  FeeHead,
  SchoolAdminUser,
  OnboardingProgress,
  StudentPromotionInput,
  PromotionResult
} from '@/types/common';

// ─── SCHOOL PROFILE ─────────────────────────────────────────────────────────
export function useSchoolProfile() {
  return useQuery({
    queryKey: ['settings', 'profile'],
    queryFn: () => api.get<SchoolProfile>('/settings/profile'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

export function useUpdateSchoolProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<SchoolProfile>) =>
      api.put<SchoolProfile>('/settings/profile', updates),

    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['settings', 'profile'] });
      const previous = queryClient.getQueryData(['settings', 'profile']);

      queryClient.setQueryData(['settings', 'profile'], (old: SchoolProfile | undefined) => {
        if (!old) return old;
        return { ...old, ...updates };
      });

      return { previous };
    },

    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['settings', 'profile'], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'profile'] });
    },
  });
}

export function useUploadSchoolLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      return api.post<{ logo_url: string }>('/settings/branding/logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },

    onSuccess: (data) => {
      queryClient.setQueryData(['settings', 'profile'], (old: SchoolProfile | undefined) => {
        if (!old) return old;
        return { ...old, logo_url: data.logo_url };
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'profile'] });
    },
  });
}

export function useUpdateSchoolBranding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (branding: { accent_color: string; tagline?: string }) =>
      api.put<SchoolProfile>('/settings/branding', branding),

    onMutate: async (branding) => {
      await queryClient.cancelQueries({ queryKey: ['settings', 'profile'] });
      const previous = queryClient.getQueryData(['settings', 'profile']);

      queryClient.setQueryData(['settings', 'profile'], (old: SchoolProfile | undefined) => {
        if (!old) return old;
        return { ...old, ...branding };
      });

      return { previous };
    },

    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['settings', 'profile'], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'profile'] });
    },
  });
}

// ─── ACADEMIC YEARS ─────────────────────────────────────────────────────────
export function useAcademicYears() {
  return useQuery({
    queryKey: ['settings', 'academic-years'],
    queryFn: () => api.get<AcademicYearRow[]>('/settings/academic-years'),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCurrentAcademicYear() {
  return useQuery({
    queryKey: ['settings', 'current-academic-year'],
    queryFn: () => api.get<AcademicYearRow | null>('/settings/academic-years/current'),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

export function useCreateAcademicYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (academicYear: Omit<AcademicYearRow, 'id' | 'school_id' | 'created_at' | 'updated_at'>) =>
      api.post<AcademicYearRow>('/settings/academic-years', academicYear, {
        headers: { 'x-idempotency-key': crypto.randomUUID() }
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'current-academic-year'] });
    },
  });
}

export function useSetCurrentAcademicYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (academicYearId: string) =>
      api.put<void>(`/settings/academic-years/${academicYearId}/set-current`),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'current-academic-year'] });
    },
  });
}

export function useStudentPromotions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fromAcademicYearId,
      toAcademicYearId,
      promotions,
    }: StudentPromotionInput) =>
      api.post<PromotionResult>(
        `/settings/academic-years/${fromAcademicYearId}/promote/${toAcademicYearId}`,
        { promotions },
        { headers: { 'x-idempotency-key': crypto.randomUUID() } }
      ),

    onSuccess: () => {
      // Invalidate student-related queries as enrollments have changed
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'academic-years'] });
    },
  });
}

// ─── FEE STRUCTURE ──────────────────────────────────────────────────────────
export function useFeeCategories() {
  return useQuery({
    queryKey: ['settings', 'fee-categories'],
    queryFn: () => api.get<FeeCategory[]>('/settings/fee-structure/categories'),
    staleTime: 15 * 60 * 1000,
  });
}

export function useFeeHeads() {
  return useQuery({
    queryKey: ['settings', 'fee-heads'],
    queryFn: () => api.get<(FeeHead & { category_name: string })[]>('/settings/fee-structure/heads'),
    staleTime: 15 * 60 * 1000,
  });
}

export function useCreateFeeCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (category: Omit<FeeCategory, 'id' | 'school_id' | 'created_at' | 'updated_at'>) =>
      api.post<FeeCategory>('/settings/fee-structure/categories', category),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'fee-categories'] });
    },
  });
}

export function useCreateFeeHead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (feeHead: Omit<FeeHead, 'id' | 'school_id' | 'created_at' | 'updated_at'>) =>
      api.post<FeeHead>('/settings/fee-structure/heads', feeHead),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'fee-heads'] });
      queryClient.invalidateQueries({ queryKey: ['fees'] }); // Invalidate fees module as structure changed
    },
  });
}

export function useUpdateFeeHead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<FeeHead, 'id' | 'school_id' | 'created_at' | 'updated_at'>>;
    }) =>
      api.put<FeeHead>(`/settings/fee-structure/heads/${id}`, updates),

    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['settings', 'fee-heads'] });
      const previous = queryClient.getQueryData(['settings', 'fee-heads']);

      queryClient.setQueryData(
        ['settings', 'fee-heads'],
        (old: (FeeHead & { category_name: string })[] | undefined) => {
          if (!old) return old;
          return old.map((head) =>
            head.id === id ? { ...head, ...updates } : head
          );
        }
      );

      return { previous };
    },

    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['settings', 'fee-heads'], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'fee-heads'] });
      queryClient.invalidateQueries({ queryKey: ['fees'] });
    },
  });
}

export function useDeactivateFeeHead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (feeHeadId: string) =>
      api.delete<void>(`/settings/fee-structure/heads/${feeHeadId}`),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'fee-heads'] });
      queryClient.invalidateQueries({ queryKey: ['fees'] });
    },
  });
}

// ─── USER MANAGEMENT ────────────────────────────────────────────────────────
export function useSchoolAdminUsers() {
  return useQuery({
    queryKey: ['settings', 'admin-users'],
    queryFn: () => api.get<SchoolAdminUser[]>('/settings/users'),
    staleTime: 10 * 60 * 1000,
  });
}

export function useInviteSchoolAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (user: Omit<SchoolAdminUser, 'id' | 'school_id' | 'invited_at' | 'created_at' | 'updated_at'>) =>
      api.post<SchoolAdminUser>('/settings/users/invite', user, {
        headers: { 'x-idempotency-key': crypto.randomUUID() }
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'admin-users'] });
    },
  });
}

export function useDeactivateSchoolAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      api.delete<void>(`/settings/users/${userId}`),

    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ['settings', 'admin-users'] });
      const previous = queryClient.getQueryData(['settings', 'admin-users']);

      queryClient.setQueryData(
        ['settings', 'admin-users'],
        (old: SchoolAdminUser[] | undefined) => {
          if (!old) return old;
          return old.filter((user) => user.id !== userId);
        }
      );

      return { previous };
    },

    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['settings', 'admin-users'], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'admin-users'] });
    },
  });
}

// ─── STUDENT RELEASE ────────────────────────────────────────────────────────
export function useStudentsForRelease(academicYearId: string, classYear?: number) {
  return useQuery({
    queryKey: ['settings', 'students-for-release', academicYearId, classYear],
    queryFn: () =>
      api.get<Array<{
        neura_id: string;
        full_name: string;
        class_year: number;
        section: string;
        status: string;
      }>>('/settings/students/release', {
        academic_year_id: academicYearId,
        ...(classYear && { class_year: classYear }),
      }),
    enabled: !!academicYearId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useReleaseStudents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (releases: Array<{
      neura_id: string;
      exit_reason: string;
      exit_type: 'TRANSFER' | 'COMPLETED' | 'DISCONTINUED' | 'GRADUATED';
      destination_school?: string;
    }>) =>
      api.post<{ released: number }>('/settings/students/release', { releases }, {
        headers: { 'x-idempotency-key': crypto.randomUUID() }
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'students-for-release'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

// ─── NOTIFICATIONS ──────────────────────────────────────────────────────────
export function useNotificationSettings() {
  return useQuery({
    queryKey: ['settings', 'notifications'],
    queryFn: () => api.get<{
      sms_enabled: boolean;
      email_enabled: boolean;
      push_enabled: boolean;
      attendance_alerts: boolean;
      fee_reminders: boolean;
      exam_notifications: boolean;
    }>('/settings/notifications'),
    staleTime: 15 * 60 * 1000,
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: {
      sms_enabled?: boolean;
      email_enabled?: boolean;
      push_enabled?: boolean;
      attendance_alerts?: boolean;
      fee_reminders?: boolean;
      exam_notifications?: boolean;
    }) =>
      api.put<void>('/settings/notifications', settings),

    onMutate: async (settings) => {
      await queryClient.cancelQueries({ queryKey: ['settings', 'notifications'] });
      const previous = queryClient.getQueryData(['settings', 'notifications']);

      queryClient.setQueryData(['settings', 'notifications'], (old: any) => {
        if (!old) return old;
        return { ...old, ...settings };
      });

      return { previous };
    },

    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['settings', 'notifications'], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'notifications'] });
    },
  });
}

// ─── WORKING CALENDAR ───────────────────────────────────────────────────────
export function useWorkingCalendar() {
  return useQuery({
    queryKey: ['settings', 'calendar'],
    queryFn: () => api.get<{
      working_days: number[];
      holidays: Array<{
        date: string;
        name: string;
        type: 'NATIONAL' | 'STATE' | 'SCHOOL';
      }>;
    }>('/settings/calendar'),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours (calendar doesn't change often)
  });
}

export function useUpdateWorkingCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (calendar: {
      working_days?: number[];
      holidays?: Array<{
        date: string;
        name: string;
        type: 'NATIONAL' | 'STATE' | 'SCHOOL';
      }>;
    }) =>
      api.put<void>('/settings/calendar', calendar),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'calendar'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] }); // Calendar affects attendance calculations
    },
  });
}

// ─── ONBOARDING PROGRESS ────────────────────────────────────────────────────
export function useOnboardingProgress() {
  return useQuery({
    queryKey: ['settings', 'onboarding'],
    queryFn: () => api.get<OnboardingProgress[]>('/settings/onboarding'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateOnboardingStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      stepNumber,
      isCompleted,
      data,
    }: {
      stepNumber: number;
      isCompleted: boolean;
      data?: Record<string, any>;
    }) =>
      api.put<OnboardingProgress>(`/settings/onboarding/step/${stepNumber}`, {
        is_completed: isCompleted,
        ...(data && { data }),
      }),

    onMutate: async ({ stepNumber, isCompleted, data }) => {
      await queryClient.cancelQueries({ queryKey: ['settings', 'onboarding'] });
      const previous = queryClient.getQueryData(['settings', 'onboarding']);

      queryClient.setQueryData(
        ['settings', 'onboarding'],
        (old: OnboardingProgress[] | undefined) => {
          if (!old) return old;
          return old.map((step) =>
            step.step_number === stepNumber
              ? {
                  ...step,
                  is_completed: isCompleted,
                  completed_at: isCompleted ? new Date().toISOString() : null,
                  ...(data && { data: { ...step.data, ...data } }),
                }
              : step
          );
        }
      );

      return { previous };
    },

    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['settings', 'onboarding'], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'onboarding'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'profile'] }); // Update school onboarding status
    },
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<void>('/settings/onboarding/complete', {}, {
        headers: { 'x-idempotency-key': crypto.randomUUID() }
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'onboarding'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'profile'] });
    },
  });
}

// ─── SETTINGS VERIFICATION ──────────────────────────────────────────────────
export function useVerifySettings() {
  return useQuery({
    queryKey: ['settings', 'verification'],
    queryFn: () => api.get<{
      profile_complete: boolean;
      academic_year_setup: boolean;
      fee_structure_setup: boolean;
      admin_users_added: boolean;
      missing_requirements: string[];
    }>('/settings/verify'),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}