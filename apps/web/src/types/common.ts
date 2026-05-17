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
  neuracoin_balance: number
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

// ─── Exam Module Types ────────────────────────────────────────────────────────

export type ExamType = 'FA1' | 'FA2' | 'FA3' | 'FA4' | 'SA1' | 'SA2' | 'UNIT_TEST' | 'PTM'
export type ExamStatus = 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'MARKS_PENDING' | 'PUBLISHED' | 'ARCHIVED'

export interface ExamSubjectInput {
  subject: string
  class_year: number
  section?: string | null
  max_marks?: number
  pass_marks?: number
  teacher_id?: string | null
  exam_date?: string | null
}

export interface CreateExamInput {
  name: string
  exam_type: ExamType
  description?: string
  start_date: string
  end_date: string
  subjects: ExamSubjectInput[]
  chapter_ids?: string[]
  board?: string
  schedule_type?: 'INDIVIDUAL' | 'BATCH'
}

export interface SyllabusChapter {
  id: string
  chapter_number: number
  title_en: string
  title_te: string | null
  textbook_id: string
  subject: string
  grade: number
  board: string
}

export interface ExamSubject {
  id: string
  exam_id: string
  subject: string
  class_year: number
  section: string | null
  max_marks: number
  pass_marks: number
  teacher_id: string | null
  teacher_name?: string | null
  exam_date: string | null
  created_at: string
}

export interface ExamSummary {
  id: string
  school_id: string
  academic_year_id: string
  name: string
  exam_type: ExamType
  description: string | null
  start_date: string
  end_date: string
  status: ExamStatus
  subjects_count: number
  marks_entered_count: number
  marks_total_count: number
  ai_insight: string | null
  chapter_ids: string[]
  class_range: string | null
  schedule_type: 'INDIVIDUAL' | 'BATCH'
  created_at: string
}

export interface BatchSubjectSlot {
  subject: string
  exam_date: string
  chapter_ids: string[]
  max_marks: number
  pass_marks: number
}

export interface BatchClassSection {
  class_year: number
  section: string
  subjects: BatchSubjectSlot[]
}

export interface BatchPrepareResult {
  sections: BatchClassSection[]
  working_days: string[]
}

export interface ExamDetail extends ExamSummary {
  created_by: string
  updated_at: string
  subjects: ExamSubject[]
}

export interface ExamResultSubject {
  subject: string
  max_marks: number
  marks_obtained: number | null
  is_absent: boolean
  percentage: number | null
  grade: string
  is_pass: boolean
  subject_rank: number | null
}

export interface ExamResult {
  neura_id: string
  student_name: string
  class_year: number
  section: string
  total_marks_obtained: number
  total_max_marks: number
  percentage: number
  grade: string
  class_rank: number | null
  overall_rank: number | null
  is_pass: boolean
  subject_results: ExamResultSubject[]
  neuracoin_earned: number
  teacher_remarks: string | null
  computed_at: string
}

export interface MarksSheetStudent {
  neura_id: string
  full_name: string
  marks_obtained: number | null
  is_absent: boolean
  percentage: number | null
  grade: string | null
  entered_at: string | null
}

export interface MarksSheet {
  exam: { id: string; name: string; exam_type: ExamType; status: ExamStatus }
  subject: ExamSubject
  students: MarksSheetStudent[]
}

export interface BulkMarksInput {
  exam_subject_id: string
  marks: Array<{
    neura_id: string
    marks_obtained: number | null
    is_absent: boolean
  }>
}

export interface GradeConfig {
  grade_label: string
  min_percentage: number
  max_percentage: number
  grade_points: number
  neuracoin_reward: number
  display_color: string
  sort_order: number
}

export interface ExamAnalytics {
  exam_id: string
  exam_name: string
  exam_type: ExamType
  overall_stats: {
    total_students: number
    passed: number
    failed: number
    pass_rate: number
    avg_percentage: number
    avg_grade: string
  }
  grade_distribution: Array<{ grade: string; count: number; pct: number; color: string }>
  subject_stats: Array<{ subject: string; avg_marks: number; avg_percentage: number; pass_rate: number; max_marks: number }>
  class_stats: Array<{ class_year: number; section: string; total_students: number; pass_rate: number; avg_percentage: number; avg_grade: string }>
  toppers: Array<{ class_year: number; section: string; neura_id: string; student_name: string; percentage: number; grade: string }>
}

export interface ReportCardData {
  exam: {
    id: string
    name: string
    exam_type: ExamType
    start_date: string
    end_date: string
    academic_year_label: string
  }
  school: {
    id: string
    name: string
    address: string | null
    district: string | null
    board: string | null
  }
  student: {
    neura_id: string
    full_name: string
    class_year: number
    section: string
    date_of_birth: string | null
    gender: string | null
    parent_name: string | null
  }
  subject_results: ExamResultSubject[]
  totals: {
    total_max_marks: number
    total_marks_obtained: number
    percentage: number
    grade: string
    class_rank: number | null
    total_students: number
    is_pass: boolean
  }
  attendance_pct: number | null
  neuracoin_earned: number
  teacher_remarks: string | null
  is_published: boolean
}

export interface StudentExamHistoryItem {
  exam_name: string
  exam_type: ExamType
  start_date: string
  percentage: number
  grade: string
  class_rank: number | null
  is_pass: boolean
  neuracoin_earned: number
}

// ─── Timetable Module Types ───────────────────────────────────────────────────

export const DAYS_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const
export const DAYS_FULL: Record<string, string> = {
  MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday',
  THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday',
}

export const SCERT_AP_DEFAULTS: Record<string, Record<number, number>> = {
  'MATHEMATICS':        { 6: 6, 7: 6, 8: 6, 9: 6, 10: 6 },
  'PHYSICAL_SCIENCE':   { 6: 4, 7: 4, 8: 5, 9: 5, 10: 5 },
  'BIOLOGICAL_SCIENCE': { 6: 4, 7: 4, 8: 4, 9: 4, 10: 4 },
  'SOCIAL_STUDIES':     { 6: 5, 7: 5, 8: 5, 9: 5, 10: 5 },
  'ENGLISH':            { 6: 5, 7: 5, 8: 5, 9: 5, 10: 5 },
  'TELUGU':             { 6: 5, 7: 5, 8: 5, 9: 5, 10: 5 },
  'HINDI':              { 6: 4, 7: 4, 8: 4, 9: 4, 10: 4 },
}

export const ECA_PRESETS = [
  { key: 'PT',              label: 'PT / Sports',       color: '#10b981', position: 'FIRST_OR_LAST', periodsDefault: 3, needsDouble: false },
  { key: 'LIBRARY',         label: 'Library Period',    color: '#8b5cf6', position: 'ANY',           periodsDefault: 1, needsDouble: false },
  { key: 'COMPUTER_LAB',    label: 'Computer Lab',      color: '#0ea5e9', position: 'ANY',           periodsDefault: 2, needsDouble: true  },
  { key: 'DRAWING',         label: 'Drawing / Art',     color: '#f97316', position: 'ANY',           periodsDefault: 2, needsDouble: false },
  { key: 'MUSIC',           label: 'Music',             color: '#ec4899', position: 'ANY',           periodsDefault: 1, needsDouble: false },
  { key: 'YOGA',            label: 'Yoga / Meditation', color: '#84cc16', position: 'FIRST',         periodsDefault: 1, needsDouble: false },
  { key: 'MORAL_EDUCATION', label: 'Moral Education',   color: '#f59e0b', position: 'ANY',           periodsDefault: 1, needsDouble: false },
] as const

export interface PeriodConfigRow {
  day_of_week: string
  is_working_day: boolean
  school_start_time: string
  school_end_time: string
  period_duration_minutes: number
  short_break_after_periods: number[]
  short_break_duration_min: number
  lunch_after_period: number | null
  lunch_duration_minutes: number
}

export interface AssemblyConfig {
  include_in_schedule: boolean
  day_of_week: string
  duration_minutes: number
  position: 'BEFORE_FIRST' | 'FIRST_PERIOD'
}

export interface TimetableRequirement {
  id?: string
  class_year: number
  subject: string
  subject_type: 'ACADEMIC' | 'ECA'
  eca_category?: string | null
  periods_per_week: number
  needs_double_period: boolean
  double_period_count: number
  preferred_position: 'FIRST' | 'LAST' | 'FIRST_OR_LAST' | 'ANY'
  teacher_id?: string | null
  teacher_name?: string
  display_name?: string | null
  color_hex: string
}

export interface TeacherSubjectAssignment {
  subject: string
  class_year: number
  teacher_id: string
  teacher_name: string
}

export interface TimetableConfig {
  period_config: PeriodConfigRow[]
  assembly_config: AssemblyConfig | null
  requirements: TimetableRequirement[]
  teacher_assignments: TeacherSubjectAssignment[]
}

export interface TimetableSlotEntry {
  id?: string
  school_id: string
  academic_year_id: string
  class_year: number
  section: string
  day_of_week: string
  period_number: number
  start_time: string
  end_time: string
  subject: string
  subject_type: 'ACADEMIC' | 'ECA' | 'BREAK' | 'LUNCH' | 'ASSEMBLY' | 'FREE'
  teacher_id: string | null
  teacher_name?: string
  is_double_period: boolean
  double_period_end_time?: string | null
  room_number?: string | null
  period_type: string
}

export interface TimetableConflict {
  type: 'TEACHER_DOUBLE_BOOKED' | 'SUBJECT_TWICE_SAME_DAY' | 'TEACHER_OVERLOADED' | 'UNASSIGNED' | 'LAB_NO_CONSECUTIVE_SLOT'
  severity: 'ERROR' | 'WARNING'
  class_year: number
  section: string
  day: string
  period: number
  teacher_id?: string
  teacher_name?: string
  conflicting_class?: string
  subject?: string
  message: string
}

export interface GeneratedTimetable {
  entries: TimetableSlotEntry[]
  conflicts: TimetableConflict[]
  teacher_workload: Array<{
    teacher_id: string
    teacher_name: string
    periods_per_week: number
    is_overloaded: boolean
  }>
  slot_utilization: {
    total_slots: number
    filled_slots: number
    free_slots: number
    conflict_slots: number
  }
}

export interface TimetableStatus {
  has_confirmed_timetable: boolean
  last_generated_at: string | null
  conflict_count: number
  class_sections: Array<{ class_year: number; section: string }>
}

// ─── Salary & Payroll Module Types ───────────────────────────────────────────

export type PayrollStatus = 'DRAFT' | 'GENERATED' | 'APPROVED' | 'PAID'
export type PayslipStatus = 'GENERATED' | 'ON_HOLD' | 'PAID'
export type AdjustmentType = 'BONUS' | 'ADVANCE_RECOVERY' | 'FINE' | 'ARREAR' | 'OTHER'

export interface PayrollAdjustment {
  id: string
  payslip_id: string
  adjustment_type: AdjustmentType
  label: string
  amount: number
  is_deduction: boolean
  created_at: string
}

export interface PayslipRow {
  id: string
  payroll_run_id: string
  teacher_id: string
  teacher_name: string
  employee_id: string | null
  designation: string
  basic: number
  hra: number
  da: number
  transport_allowance: number
  special_allowance: number
  gross_salary: number
  working_days: number
  present_days: number
  lop_days: number
  pf_employee: number
  esi_employee: number
  professional_tax: number
  lop_deduction: number
  adjustments: PayrollAdjustment[]
  total_deductions: number
  net_salary: number
  status: PayslipStatus
  payment_date: string | null
  payment_reference: string | null
  bank_account_number: string | null
  ifsc_code: string | null
  bank_name: string | null
}

export interface PayrollSummary {
  id: string
  school_id: string
  academic_year_id: string
  month: number
  year: number
  month_label: string
  status: PayrollStatus
  total_gross: number
  total_deductions: number
  total_net: number
  teacher_count: number
  generated_at: string | null
  approved_at: string | null
  paid_at: string | null
  payslips: PayslipRow[]
}

export interface NEFTExportRow {
  teacher_name: string
  account_number: string
  ifsc_code: string
  bank_name: string
  net_salary: number
  remarks: string
}
