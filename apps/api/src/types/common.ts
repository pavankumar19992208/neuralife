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

export interface APISuccessResponse<T> {
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

export interface APIErrorResponse {
  error: string
  code: string
  correlationId: string
  details?: object
}

export interface OtpRequest {
  id: string
  mobile: string
  otp_hash: string
  attempt_count: number
  max_attempts: number
  expires_at: string
  verified_at: string | null
  locked_until: string | null
  created_at: string
}

export interface RefreshTokenRecord {
  id: string
  jti: string
  user_id: string
  user_role: string
  school_id: string | null
  expires_at: string
  revoked_at: string | null
}

export interface TeacherAuthRecord {
  teacher_id: string
  full_name: string
  mobile: string
  school_id: string
  role: 'PRINCIPAL' | 'SCHOOL_ADMIN' | 'TEACHER'
  designation: string
  status: string
}

export interface ParentAuthRecord {
  neura_ids: string[]
  school_ids: string[]
  primary_school_id: string
}

export interface StudentAuthRecord {
  neura_id: string
  full_name: string
  school_id: string
  pin_hash: string | null
  class_year: number
  section: string
  status: string
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

export interface RawSchoolHealthData {
  students: { total: number; at_risk: number; unintervened_at_risk: number }
  attendance: { present_today: number; expected_today: number; rate_7d: number }
  mastery: { avg_score: number | null; sample_count: number }
  fees: { paid_this_month: number; due_this_month: number }
  smartpads: { total: number; synced_48h: number; offline_9d: number }
  academic_year_id: string
}

// ─── Student Module Types ──────────────────────────────────────────────────

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

export interface UpdateTeacherInput {
  full_name?: string
  email?: string
  date_of_birth?: string
  gender?: string
  pan_number?: string
  teaching_qualification?: string
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

export interface LeaveApplicationInput {
  leave_type: 'CL' | 'SL' | 'EL' | 'LOP' | 'OTHER'
  from_date: string
  to_date: string
  days_count: number
  reason: string
  substitute_teacher_id?: string
}

// ─── Attendance Module Types ───────────────────────────────────────────────

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'APPROVED_LEAVE'

export interface AttendanceStudentRecord {
  neura_id: string
  full_name: string
  class_year: number
  section: string
  status: AttendanceStatus
  reason?: string
}

export interface MarkAttendanceInput {
  class_year: number
  section: string
  date: string
  records: Array<{
    neura_id: string
    status: AttendanceStatus
    reason?: string
  }>
}

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
  enrolled_students: Array<{
    neura_id: string
    full_name: string
  }>
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
  monthly_records: Array<{
    date: string
    status: AttendanceStatus | null
  }>
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

// ─── Fee Module Types ─────────────────────────────────────────────────────

export interface FeeStructureItem {
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

export interface FeeLedgerItem {
  id: string
  fee_head: string
  period_label: string | null
  amount_due: number
  amount_paid: number
  amount_waived: number
  balance: number
  due_date: string
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'WAIVED'
  concession?: { type: string; amount: number }
}

export interface StudentFeeBalance {
  neura_id: string
  full_name: string
  class_year: number
  section: string
  total_due: number
  total_paid: number
  total_balance: number
  status: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'PENDING'
  ledger: FeeLedgerItem[]
}

export interface RecordPaymentInput {
  neura_id: string
  amount: number
  payment_mode: 'CASH' | 'UPI' | 'CHEQUE' | 'NEFT' | 'ONLINE'
  transaction_reference?: string
  notes?: string
  ledger_allocations?: Array<{ ledger_id: string; amount: number }>
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
  payment_mode: string
  transaction_reference: string | null
  allocations: Array<{ fee_head: string; period_label: string | null; amount: number }>
  collected_by_name: string
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
  recent_payments: Array<{
    receipt_number: string
    student_name: string
    amount: number
    payment_date: string
    payment_mode: string
  }>
}

// ─── Student Module Types ──────────────────────────────────────────────────

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

export interface UpdateStudentInput {
  full_name?: string
  date_of_birth?: string
  gender?: string
  blood_group?: string
  caste_category?: string
}

export interface StudentListFilters {
  class_year?: number
  section?: string
  status?: string
  band?: 'FOUNDATION' | 'ELEMENTARY' | 'MIDDLE' | 'SECONDARY'
  search?: string
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

// ─── Exam Module Types ────────────────────────────────────────────────────

export type ExamType = 'FA1' | 'FA2' | 'FA3' | 'FA4' | 'SA1' | 'SA2' | 'UNIT_TEST' | 'PTM'
export type ExamStatus = 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'MARKS_PENDING' | 'PUBLISHED' | 'ARCHIVED'

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

export interface Exam {
  id: string
  school_id: string
  academic_year_id: string
  name: string
  exam_type: ExamType
  description: string | null
  start_date: string
  end_date: string
  status: ExamStatus
  created_by: string
  ai_insight: string | null
  chapter_ids: string[]
  created_at: string
  updated_at: string
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

export interface ExamMark {
  id: string
  exam_id: string
  exam_subject_id: string
  neura_id: string
  marks_obtained: number | null
  is_absent: boolean
  entered_by: string | null
  entered_at: string | null
  updated_at: string
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
  id: string
  exam_id: string
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
  exam: Pick<Exam, 'id' | 'name' | 'exam_type' | 'status'>
  subject: ExamSubject
  students: MarksSheetStudent[]
}

export interface ExamSummary {
  id: string
  school_id: string
  academic_year_id: string
  name: string
  exam_type: ExamType
  start_date: string
  end_date: string
  status: ExamStatus
  description: string | null
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

export interface CreateExamInput {
  name: string
  exam_type: ExamType
  description?: string
  start_date: string
  end_date: string
  chapter_ids?: string[]
  schedule_type?: 'INDIVIDUAL' | 'BATCH'
  subjects: Array<{
    subject: string
    class_year: number
    section?: string | null
    max_marks?: number
    pass_marks?: number
    teacher_id?: string | null
    exam_date?: string | null
  }>
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
  id: string
  school_id: string | null
  grade_label: string
  min_percentage: number
  max_percentage: number
  grade_points: number
  neuracoin_reward: number
  display_color: string
  sort_order: number
}

export interface ExamAnalyticsSubjectStat {
  subject: string
  avg_marks: number
  avg_percentage: number
  pass_rate: number
  max_marks: number
}

export interface ExamAnalyticsClassStat {
  class_year: number
  section: string
  total_students: number
  pass_rate: number
  avg_percentage: number
  avg_grade: string
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
  subject_stats: ExamAnalyticsSubjectStat[]
  class_stats: ExamAnalyticsClassStat[]
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

export interface NeuraCoinEntry {
  id: string
  neura_id: string
  transaction_type: string
  amount: number
  description: string
  reference_id: string | null
  created_at: string
}

export interface StudentNeuraCoinBalance {
  neura_id: string
  balance: number
  history: NeuraCoinEntry[]
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
  { key: 'PT',              label: 'PT / Sports',      color: '#10b981', position: 'FIRST_OR_LAST', periodsDefault: 3, needsDouble: false },
  { key: 'LIBRARY',         label: 'Library Period',   color: '#8b5cf6', position: 'ANY',           periodsDefault: 1, needsDouble: false },
  { key: 'COMPUTER_LAB',    label: 'Computer Lab',     color: '#0ea5e9', position: 'ANY',           periodsDefault: 2, needsDouble: true  },
  { key: 'DRAWING',         label: 'Drawing / Art',    color: '#f97316', position: 'ANY',           periodsDefault: 2, needsDouble: false },
  { key: 'MUSIC',           label: 'Music',            color: '#ec4899', position: 'ANY',           periodsDefault: 1, needsDouble: false },
  { key: 'YOGA',            label: 'Yoga / Meditation',color: '#84cc16', position: 'FIRST',         periodsDefault: 1, needsDouble: false },
  { key: 'MORAL_EDUCATION', label: 'Moral Education',  color: '#f59e0b', position: 'ANY',           periodsDefault: 1, needsDouble: false },
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

// ─── Fleet / SmartPad Module Types ───────────────────────────────────────────

export const LATEST_FIRMWARE = '1.4.0'

export type DeviceStatus = 'ACTIVE' | 'LOCKED' | 'LOST' | 'MAINTENANCE' | 'DECOMMISSIONED'
export type SyncStatus = 'RECENT' | 'WATCH' | 'OFFLINE' | 'CRITICAL'
export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO'
export type AlertType =
  | 'OFFLINE_CRITICAL' | 'OFFLINE_WARNING' | 'LOST'
  | 'LOW_BATTERY' | 'STORAGE_FULL' | 'FIRMWARE_OUTDATED'

export interface FleetDevice {
  device_id: string
  serial_number: string
  model: string
  school_id: string
  status: DeviceStatus
  firmware_version: string
  battery_level: number | null
  storage_used_mb: number | null
  location_lat: number | null
  location_lng: number | null
  last_sync_at: string | null
  last_seen_at: string | null
  total_sessions: number
  total_usage_hours: number
  assigned_neura_id: string | null
  student_name: string | null
  student_class: string | null
  sync_status: SyncStatus
  is_at_risk_student: boolean
  active_alert_count: number
}

export interface FleetAlert {
  id: string
  device_id: string
  school_id: string
  neura_id: string | null
  student_name: string | null
  alert_type: AlertType
  severity: AlertSeverity
  message: string
  triggered_at: string
  acknowledged_at: string | null
  acknowledged_by_name: string | null
  resolved_at: string | null
  is_active: boolean
}

export interface FleetKPIs {
  total_devices: number
  active_devices: number
  offline_devices: number
  critical_devices: number
  lost_devices: number
  firmware_outdated_count: number
  active_alerts: number
  sync_rate_pct: number
  avg_battery_pct: number
  avg_usage_hours: number
}

export interface FleetEfficiencyScore {
  overall: number
  sync_score: number
  usage_score: number
  device_health_score: number
  firmware_score: number
}

export interface FleetOverview {
  kpis: FleetKPIs
  efficiency: FleetEfficiencyScore
  devices: FleetDevice[]
  alerts: FleetAlert[]
}

export interface HealthSnapshot {
  id: string
  device_id: string
  snapshot_at: string
  battery_level: number | null
  storage_used_mb: number | null
  firmware_version: string | null
  sessions_count: number
  usage_minutes: number
  sync_type: string
}

export interface AssignmentHistoryItem {
  id: string
  neura_id: string
  student_name: string
  assigned_at: string
  returned_at: string | null
  condition_at_return: string | null
  damage_description: string | null
  repair_required: boolean
  repair_cost_estimate: number | null
  repair_status: string
  notes: string | null
}

export interface DeviceDetail extends FleetDevice {
  pending_firmware_version: string | null
  loss_reported: boolean
  loss_reported_at: string | null
  breakage_deposit_paid: number
  total_repair_cost: number
  active_alerts: FleetAlert[]
  health_snapshots: HealthSnapshot[]
  assignment_history: AssignmentHistoryItem[]
}

export interface OTACampaign {
  id: string
  school_id: string
  target_firmware: string
  launched_at: string
  target_device_ids: string[]
  updated_count: number
  failed_count: number
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  completed_at: string | null
}

export interface AssignDeviceInput {
  neura_id: string
}

export interface ReturnDeviceInput {
  condition: 'EXCELLENT' | 'GOOD' | 'MINOR_DAMAGE' | 'MAJOR_DAMAGE'
  damage_description?: string
  repair_required: boolean
  repair_cost_estimate?: number
  notes?: string
}

// ─── Analytics Deep Types ─────────────────────────────────────────────────────

export type AnalyticsPeriod = 'month' | 'term' | 'year'

export interface AnalyticsFilter {
  period: AnalyticsPeriod
  class_year?: number
  section?: string
  neura_id?: string
}

export interface SchoolNarrative {
  id: string
  school_id: string
  month_year: string
  neura_id: string | null
  narrative_text: string
  key_insights: string[]
  generated_at: string
  refresh_count: number
}

export interface TeacherPerformanceRow {
  teacher_id: string
  teacher_name: string
  designation: string
  classes_taught: string[]
  subject: string
  student_count: number
  avg_mastery_score: number | null
  vs_school_avg: number | null
  mastery_velocity: number | null
  engagement_rate: number | null
  at_risk_count: number
  intervention_rate: number | null
  leave_days_month: number
  context_flags: string[]
  ai_insight: string | null
}

export interface CurriculumGapRow {
  subject: string
  chapter_number: number
  chapter_title: string
  mastery_pct: number
  student_count: number
}

export interface SubjectMasteryRow {
  subject: string
  avg_score: number
  student_count: number
  trend_delta: number | null
}

export interface ExamProgressionRow {
  subject: string
  exam_type: string
  school_avg: number
  period_label: string
}

export interface AtRiskFunnelData {
  stage_1_total: number
  stage_2_declining: number
  stage_3_at_risk: number
  stage_4_unintervened: number
  stage_5_critical: number
}

export interface RteComparisonData {
  rte_students: number
  non_rte_students: number
  rte_mastery_avg: number
  non_rte_mastery_avg: number
  rte_attendance_avg: number
  non_rte_attendance_avg: number
}

export interface AttendanceTrendDay {
  date: string
  rate: number
  present_count: number
  total_count: number
}

export interface ClassHeatmapEntry {
  class_year: number
  section: string
  day_of_week: string
  rate: number
}

export interface DayOfWeekStat {
  day: string
  avg_rate: number
  below_school_avg: boolean
}

export interface ChronicAbsentee {
  neura_id: string
  name: string
  class_year: number
  section: string
  absent_days: number
  rate: number
  last_attended: string | null
  fee_status: 'PAID' | 'PARTIAL' | 'OVERDUE'
}

export interface AcademicAnalytics {
  teacher_performance: TeacherPerformanceRow[]
  subject_mastery: SubjectMasteryRow[]
  curriculum_gaps: CurriculumGapRow[]
  exam_progression: ExamProgressionRow[]
  at_risk_funnel: AtRiskFunnelData
  rte_comparison: RteComparisonData | null
}

export interface AttendanceDeepAnalytics {
  trend_30d: AttendanceTrendDay[]
  class_heatmap: ClassHeatmapEntry[]
  day_of_week: DayOfWeekStat[]
  chronic_absentees: ChronicAbsentee[]
}

export interface FinancialCollectionPoint {
  month: string
  collected: number
  total_due: number
  rate: number
}

export interface FinancialAnalytics {
  collection_trend: FinancialCollectionPoint[]
  outstanding_by_class: Array<{ class_year: number; outstanding: number; defaulters: number }>
  salary_revenue_ratio: { salary_expense: number; fee_revenue: number; ratio: number }
  financial_summary: { revenue: number; salary: number; surplus: number; annual_projection: number }
  rte_fee_summary: { rte_students: number; rte_fee_waived: number; fee_paying_revenue: number }
}

export interface DigitalAnalytics {
  utilization_trend: Array<{ date: string; utilization_pct: number }>
  usage_mastery_scatter: Array<{ neura_id: string; avg_daily_hours: number; mastery_pct: number; is_at_risk: boolean }>
  top_content: Array<{ chapter_id: string; chapter_title: string; subject: string; session_count: number }>
  error_patterns: Array<{ pattern: string; occurrences: number; pct_of_total: number; vs_section_avg: number }>
  underutilized: Array<{ neura_id: string; name: string; class_year: number; section: string; sessions_this_week: number; last_session: string | null; is_at_risk: boolean }>
}

export interface YoYComparison {
  metric: string
  this_year: number
  last_year: number
  delta: number
}

export interface BenchmarkData {
  metric: string
  school_value: number
  p25: number
  p50: number
  p75: number
  percentile_label: 'TOP_25' | 'TOP_50' | 'TOP_75' | 'BOTTOM_25'
  school_count: number
}

export interface StudentMasterySubject {
  subject: string
  mastery_pct: number
  trend_delta: number | null
  percentile: number | null
  vs_class_avg: number | null
  vs_school_avg: number | null
  classification: string | null
}

export interface StudentMasteryPoint {
  month: string
  avg_percentile: number
}

export interface StudentIntelligence {
  neura_id: string
  full_name: string
  class_year: number
  section: string
  medium: string
  band: string | null
  status: string
  smartpad_id: string | null
  is_rte_student: boolean
  mastery: StudentMasterySubject[]
  mastery_trajectory: StudentMasteryPoint[]
  attendance_90d: Array<{ date: string; status: string | null }>
  attendance_rate_90d: number
  smartpad_sessions_90d: number
  avg_session_minutes: number
  error_patterns: Array<{ pattern: string; occurrences: number; subject: string }>
  exam_history: Array<{ exam_name: string; exam_type: string; subject: string; marks: number | null; max_marks: number; percentage: number | null }>
  section_avg_mastery: number | null
  class_avg_mastery: number | null
  school_avg_mastery: number | null
  ai_insight: string | null
}

export interface SectionComparison {
  section: string
  mastery_avg: number
  attendance_avg: number
  at_risk_count: number
  smartpad_usage_avg: number
  fee_collection_pct: number
}

export interface BookmarkItem {
  id: string
  url: string
  title: string
  icon: string | null
  sort_order: number
  created_at: string
}

export interface ShareToken {
  token: string
  url_path: string
  expires_at: string
}

export interface BoardExamResult {
  neura_id: string
  subject: string
  marks: number
  max_marks: number
  grade: string | null
}

export interface PredictionAccuracy {
  subject: string
  predicted_avg: number
  actual_avg: number
  accuracy_pct: number
}

// ─── NeuraSphere Types ─────────────────────────────────────────────────────

export interface NeuraSpherePost {
  id: string;
  neura_id: string | null;
  school_id: string;
  post_type: 'ACHIEVEMENT' | 'MANUAL' | 'DOUBT' | 'CONTEXTUAL';
  content_text: string;
  image_url: string | null;
  tags: string[];
  badge_id: string | null;
  source: string;
  moderation_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'HUMAN_REVIEW' | 'REMOVED_BY_AI' | 'REMOVED_BY_PRINCIPAL';
  moderation_confidence: number | null;
  moderation_reason: string | null;
  published_at: string | null;
  parent_visible: boolean;
  deleted_at: string | null;
  created_at: string;
  // New columns from migration
  ai_score: 'SAFE' | 'REVIEW' | 'REMOVE' | null;
  ai_confidence: number | null;
  ai_category: string | null;
  ai_reason: string | null;
  ai_checked_at: string | null;
  author_type: 'STUDENT' | 'PRINCIPAL' | 'TEACHER' | 'SYSTEM';
  scheduled_at: string | null;
  is_pinned: boolean;
  is_cross_school: boolean;
  status: 'ACTIVE' | 'SCHEDULED' | 'REMOVED_BY_AI' | 'REMOVED_BY_PRINCIPAL' | 'DRAFT';
  post_category: 'GENERAL' | 'STUDY_TIP' | 'ACHIEVEMENT' | 'ANNOUNCEMENT' | 'QUESTION' | 'PROJECT';
  // Enriched fields
  author_name?: string;
  author_class?: string;
  author_section?: string;
  report_count?: number;
  reaction_count?: number;
  comment_count?: number;
}

export interface PostReport {
  id: string;
  post_id: string;
  reported_by_neura_id: string;
  reporter_school_id: string;
  report_reason: 'INAPPROPRIATE' | 'SPAM' | 'BULLYING' | 'PERSONAL_INFO' | 'OTHER';
  report_details: string | null;
  status: 'PENDING' | 'REVIEWED' | 'DISMISSED';
  reviewed_by_teacher_id: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface ModerationAction {
  id: string;
  post_id: string;
  action: 'REMOVE' | 'RESTORE' | 'PIN' | 'UNPIN' | 'WARN' | 'BLOCK' | 'APPROVE' | 'REJECT';
  taken_by: string; // 'SYSTEM' for AI, or teacher_id/principal_id
  taken_by_type: 'SYSTEM' | 'TEACHER' | 'PRINCIPAL';
  reason: string | null;
  action_metadata: Record<string, any>;
  created_at: string;
}

export interface NeuraSphereSettings {
  id: string;
  school_id: string;
  allow_cross_school: boolean;
  require_approval: boolean;
  max_posts_per_day: number;
  keyword_blocklist: string[];
  blocked_posters: string[];
  posting_hours_start: string;
  posting_hours_end: string;
  enable_achievements: boolean;
  enable_manual_posts: boolean;
  enable_photo_posts: boolean;
  settings_audit_log: Record<string, any>[];
  created_at: string;
  updated_at: string;
}

export interface ModerationSummary {
  flagged_by_ai: NeuraSpherePost[];
  reported_by_community: NeuraSpherePost[];
  recently_auto_removed: NeuraSpherePost[];
}

export interface SphereAnalytics {
  active_posters_week: number;
  total_posts_month: number;
  ai_review_rate: number;
  cross_school_views: number;
  top_posts: Array<{
    post: NeuraSpherePost;
    engagement_score: number;
  }>;
  posting_trend: Array<{
    date: string;
    poster_count: number;
  }>;
  category_breakdown: Array<{
    category: string;
    count: number;
  }>;
  moderation_summary: {
    total: number;
    auto_removed: number;
    principal_removed: number;
    restored: number;
  };
}

export interface CreatePostInput {
  content: string;
  post_category: 'GENERAL' | 'STUDY_TIP' | 'ACHIEVEMENT' | 'ANNOUNCEMENT' | 'QUESTION' | 'PROJECT';
  is_cross_school: boolean;
  scheduled_at?: string;
  image_urls?: string[];
}

export interface PostActionInput {
  action: 'REMOVE' | 'RESTORE' | 'PIN' | 'UNPIN' | 'WARN' | 'BLOCK';
}
