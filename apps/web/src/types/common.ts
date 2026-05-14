export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PRINCIPAL = 'PRINCIPAL',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  TEACHER = 'TEACHER',
  PARENT = 'PARENT',
  STUDENT = 'STUDENT',
  SYSTEM = 'SYSTEM',
}

export interface JWTPayload {
  sub: string
  role: UserRole
  school_id: string
  teacher_id?: string
  neura_id?: string
  linked_neura_ids?: string[]
  device_id?: string
  jti: string
  iat: number
  exp: number
}

export interface APIResponse<T> {
  data: T
}

export interface APIListResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
  }
}

export interface APIError {
  error: string
  code: string
  correlationId: string
  details?: Record<string, unknown>
}

export interface SchoolBranding {
  school_id: string
  school_name: string
  school_logo_url: string
  school_short_name: string
  brand_color: string
  brand_color_light: string
}

export type HealthBand = 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL'

export interface PriorityAction {
  id: string
  severity: 'critical' | 'warning' | 'positive'
  title: string
  description: string
  action_label: string
  action_href: string
}

export interface SchoolHealthDrivers {
  positive: string[]
  warnings: string[]
  critical: string[]
}

export interface SchoolHealthKPIs {
  total_students: number
  present_today: number
  present_today_pct: number
  active_smartpads: number
  total_smartpads: number
  mastery_avg: number
  at_risk_count: number
  fee_collection_pct: number
}

export interface SchoolHealthScore {
  overall_score: number
  band: HealthBand
  components: {
    attendance: number
    mastery: number
    at_risk_penalty: number
    fee_collection: number
    smartpad_sync: number
  }
  vs_last_week: number
  drivers: SchoolHealthDrivers
  priority_actions: PriorityAction[]
  kpis: SchoolHealthKPIs
  computed_at: string
  academic_year_id: string
}

// ─── Student Module Types ──────────────────────────────────────────────────

export interface StudentListFilters {
  class_year?: number
  section?: string
  status?: string
  search?: string
  _mastery_filter?: string  // frontend-only — not sent to API, applied client-side
}

export interface StudentListItem {
  neura_id: string
  full_name: string
  date_of_birth: string
  gender: string | null
  status: string
  band: string | null
  class_year: number
  section: string
  medium: string
  smartpad_id: string | null
  last_sync_at: string | null
  mastery_classification: string | null
}

export interface StudentDetail {
  neura_id: string
  full_name: string
  date_of_birth: string
  gender: string | null
  blood_group: string | null
  caste_category: string | null
  status: string
  band: string | null
  data_consent_given: boolean
  enrollment: {
    admission_number: string | null
    enrolled_at: string
    school_id: string
  }
  yearly_progress: {
    class_year: number
    section: string
    medium: string
    board: string
    smartpad_id: string | null
  } | null
  parents: Array<{
    parent_name: string
    relationship: string
    mobile: string
    is_primary: boolean
  }>
  mastery_summary: Array<{
    subject: string
    latest_percentile: number | null
    classification: string | null
    computed_date: string | null
  }>
}

// ─── Attendance Module Types ───────────────────────────────────────────────

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'APPROVED_LEAVE'

export interface AttendanceRecord {
  id: string
  neura_id: string
  full_name: string
  status: AttendanceStatus
  reason: string | null
  period_number: number | null
  marked_by_name: string
  marked_at: string
  device_id: string | null
  signature_hash: string
  correction?: {
    corrected_status: AttendanceStatus
    corrected_at: string
    corrected_by_name: string
    correction_time: string | null
    reason: string | null
  }
}

export interface ClassAttendanceResponse {
  date: string
  class_year: number
  section: string
  already_marked: boolean
  records: AttendanceRecord[]
  enrolled_students: Array<{ neura_id: string; full_name: string }>
  summary: {
    present: number
    absent: number
    late: number
    approved_leave: number
    total: number
  }
}

export interface MonthlyStudentAttendance {
  neura_id: string
  full_name: string
  monthly_records: Array<{ date: string; status: AttendanceStatus | null }>
  summary: {
    present: number
    absent: number
    late: number
    approved_leave: number
    attendance_rate: number
    school_days: number
  }
}

export type AnalyticsRange = 'day' | 'week' | 'month' | 'quarter'

export interface ClassAttendanceSummary {
  class_year: number
  section: string
  total: number
  present: number
  absent: number
  late: number
  approved_leave: number
  present_pct: number
  marked_by_name: string | null
  marked_at: string | null
}

export interface AttendanceTrendPoint {
  date: string
  total: number
  present: number
  absent: number
  late: number
  present_pct: number
}

export interface AttendanceStudentSummary {
  neura_id: string
  full_name: string
  class_year: number
  section: string
  reason?: string | null
}

export interface SchoolAttendanceAnalytics {
  range: AnalyticsRange
  date: string
  overall: {
    total_students: number
    present: number
    absent: number
    late: number
    approved_leave: number
    present_pct: number
    classes_marked: number
    total_classes: number
  }
  trend: AttendanceTrendPoint[]
  classes: ClassAttendanceSummary[]
  absent_students?: AttendanceStudentSummary[]
  present_students?: AttendanceStudentSummary[]
}

// ─── Teacher Module Types ──────────────────────────────────────────────────

export type Designation =
  'PRINCIPAL' | 'VP' | 'HM' | 'PGT' | 'TGT' | 'PRT' | 'PT' | 'ADMIN' | 'SUPPORT'

export type EmploymentType = 'REGULAR' | 'CONTRACT' | 'PART_TIME' | 'VISITING'

export interface CreateTeacherInput {
  full_name: string
  mobile: string
  email?: string
  date_of_birth?: string
  gender?: 'Male' | 'Female' | 'Other'
  pan_number?: string
  aadhaar_hash?: string
  teaching_qualification?: 'B.Ed' | 'D.Ed' | 'M.Ed' | 'None'
  designation: Designation
  employment_type: EmploymentType
  joining_date: string
  employee_id?: string
  subject_assignments: Array<{
    class_year: number
    section: string
    subject: string
    is_class_teacher: boolean
  }>
}

export interface CreateSalaryInput {
  basic: number
  hra_type: 'PERCENT' | 'FIXED'
  hra_value: number
  da_type: 'PERCENT' | 'FIXED'
  da_value: number
  transport_allowance: number
  special_allowance: number
  pf_applicable: boolean
  esi_applicable: boolean
  pt_applicable: boolean
  bank_account_number?: string
  ifsc_code?: string
  bank_name?: string
  account_holder_name?: string
  effective_from: string
}

export interface TeacherListItem {
  teacher_id: string
  full_name: string
  mobile: string
  designation: string
  employment_type: string
  status: string
  subjects: string[]
  class_teacher_of: string | null
  cl_remaining: number
  sl_remaining: number
}

export interface TeacherDetail {
  teacher_id: string
  full_name: string
  mobile: string
  email: string | null
  date_of_birth: string | null
  gender: string | null
  pan_number: string | null
  teaching_qualification: string | null
  status: string
  designation: string
  employment_type: string
  joining_date: string
  employee_id: string | null
  subject_assignments: Array<{
    class_year: number
    section: string
    subject: string
    is_class_teacher: boolean
  }>
  salary?: {
    basic: number
    gross_monthly: number
    hra_value: number
    da_value: number
    transport_allowance: number
    special_allowance: number
    pf_applicable: boolean
    esi_applicable: boolean
    bank_name: string | null
    ifsc_code: string | null
    effective_from: string
  }
  leave_balances: {
    leave_year_label: string
    cl_entitled: number
    cl_used: number
    sl_entitled: number
    sl_used: number
    el_entitled: number
    el_used: number
    lop_days: number
  } | null
}

export interface TeacherLeaveData {
  balances: {
    leave_year_label: string
    cl_entitled: number
    cl_used: number
    sl_entitled: number
    sl_used: number
    el_entitled: number
    el_used: number
    lop_days: number
  } | null
  applications: Array<{
    id: string
    leave_type: string
    from_date: string
    to_date: string
    days_count: number
    reason: string
    status: string | null
    rejection_reason: string | null
    created_at: string | null
    reviewed_at: string | null
  }>
}

// ─── Student Module Types ──────────────────────────────────────────────────

// ─── Fees Module Types ────────────────────────────────────────────────────

export type PaymentMode = 'CASH' | 'UPI' | 'CHEQUE' | 'NEFT' | 'ONLINE'
export type FeeStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE'

export interface FeeLedgerItem {
  id: string
  fee_head: string
  period_label: string | null
  amount_due: number
  amount_paid: number
  amount_waived: number
  balance: number
  due_date: string
  status: FeeStatus
}

export interface StudentFeeBalance {
  neura_id: string
  full_name: string
  class_year: number
  section: string
  total_due: number
  total_paid: number
  total_balance: number
  status: FeeStatus
  ledger: FeeLedgerItem[]
}

export interface RecentPayment {
  receipt_number: string
  student_name: string
  amount: number
  payment_date: string
  payment_mode: PaymentMode
}

export interface FeeCollectionSummary {
  current_month_label: string
  total_students: number
  total_due_month: number
  total_collected_month: number
  collection_rate: number
  paid_count: number
  partial_count: number
  overdue_count: number
  pending_count: number
  recent_payments: RecentPayment[]
}

export interface PaymentAllocation {
  fee_head: string
  period_label: string | null
  amount: number
}

export interface PaymentReceipt {
  receipt_number: string
  payment_id: string
  neura_id: string
  student_name: string
  class_year: number
  section: string
  school_name: string
  school_address: string
  payment_date: string
  amount: number
  payment_mode: PaymentMode
  transaction_reference: string | null
  allocations: PaymentAllocation[]
  collected_by_name: string
}

export interface RecordPaymentInput {
  neura_id: string
  amount: number
  payment_mode: PaymentMode
  transaction_reference?: string
  notes?: string
  ledger_allocations?: Array<{ ledger_id: string; amount: number }>
}

// ─── Fee Analytics Types ──────────────────────────────────────────────────

export interface FeeAnalyticsTrend {
  month_label: string
  due: number
  collected: number
  rate: number
}

export interface FeeHeadBreakdown {
  fee_head: string
  due: number
  collected: number
  rate: number
}

export interface FeeClassBreakdown {
  class_year: number
  section: string
  total_students: number
  paid_count: number
  overdue_count: number
  due: number
  collected: number
  rate: number
}

export interface FeeAnalyticsData {
  year_label: string
  total_due_year: number
  total_collected_year: number
  total_waived_year: number
  collection_rate_year: number
  overdue_amount: number
  monthly_trend: FeeAnalyticsTrend[]
  by_fee_head: FeeHeadBreakdown[]
  by_class: FeeClassBreakdown[]
}

export interface UnpaidStudentItem {
  neura_id: string
  full_name: string
  class_year: number
  section: string
  periods_overdue: number
  oldest_due_date: string
  total_outstanding: number
  current_period_paid_pct: number
  fee_heads_unpaid: string[]
}

export interface FeeStructureRow {
  class_year: number
  student_category: string
  admission_fee: number
  development_fee: number
  tuition_fee_monthly: number
  neuralife_sub_monthly: number
  exam_fee_per_term: number
  transport_fee_monthly: number
  smartpad_fee: number
  late_fee_amount: number
  late_fee_grace_days: number
  fee_due_day_of_month: number
}

export interface ConcessionRule {
  id: string
  rule_name: string
  concession_type: string
  eligibility_note: string | null
  applies_to_heads: string[] | null
  amount_type: 'PERCENT' | 'FIXED'
  concession_value: number
  max_cap: number | null
  auto_apply: boolean
  is_active: boolean
}

export interface CustomFeeHead {
  id: string
  head_code: string
  display_name: string
  description: string | null
  collection_type: 'MONTHLY' | 'TERMLY' | 'ANNUAL' | 'ONE_TIME'
  is_active: boolean
  amounts: Array<{ class_year: number | null; student_category: string | null; amount: number }>
}

// ─────────────────────────────────────────────────────────────────────────────

export interface AdmitStudentInput {
  full_name: string
  date_of_birth: string
  gender?: 'Male' | 'Female' | 'Other'
  blood_group?: string
  caste_category?: 'GENERAL' | 'OBC' | 'SC_ST' | 'EWS' | 'FREE'
  aadhaar_hash?: string
  class_year: number
  section: string
  medium: 'ENGLISH' | 'TELUGU'
  board?: string
  parents: Array<{
    parent_name: string
    relationship: 'FATHER' | 'MOTHER' | 'GUARDIAN' | 'OTHER'
    mobile: string
    email?: string
    is_primary: boolean
  }>
}
