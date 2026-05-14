export interface SchoolSummary {
  school_name: string
  school_logo_url: string
  at_risk_count: number
  fee_overdue_count: number
  salary_pending_count: number
  smartpad_offline_count: number
  sphere_pending_moderation: number
  notification_unread_count: number
}

// Stub — replace with TanStack Query against GET /api/v1/analytics/school/:id/summary
const STUB_SUMMARY: SchoolSummary = {
  school_name: 'Vikas High School',
  school_logo_url: '',
  at_risk_count: 4,
  fee_overdue_count: 67,
  salary_pending_count: 0,
  smartpad_offline_count: 1,
  sphere_pending_moderation: 0,
  notification_unread_count: 3,
}

export function useSchool(): { data: SchoolSummary; isLoading: boolean } {
  return { data: STUB_SUMMARY, isLoading: false }
}
