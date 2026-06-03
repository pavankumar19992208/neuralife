# NeuraLife — Monorepo Root Context

> Claude Code reads this file automatically at every session start.
> Read this COMPLETELY before touching any file in any package.
> This is the single source of truth for the entire codebase.

---

## What NeuraLife Is

NeuraLife is a closed-loop EdTech AI platform for AP and Telangana schools.
It connects school principals, teachers, parents, students, and AI-powered SmartPads
into one system — managing attendance, learning, fees, and communication.

**This is a monorepo.** All packages live here. Claude Code can see all of them.

---

## Current Build Phase

> **UPDATE THIS AT THE START OF EVERY SESSION.**

**Teacher Mobile App — Foundation (apps/mobile)** ← IN PROGRESS

**Completed — Teacher App Foundation:**

- [x] React Native 0.74 scaffolded into apps/mobile (android/ + ios/, package `in.neuralife.teacher`, portrait-locked, minSdk 24/target 34)
- [x] Monorepo wiring: metro.config.js (watchFolders root), babel module-resolver aliases, tsconfig paths, .env.development/.production/.example, turbo.json mobile tasks
- [x] Android: BLE/biometric/camera/storage permissions, jitpack repo, WatermelonDB jsi aar
- [x] Design system: NeuraLife Intelligence OS v3.0 (neural academy palette, teacher-optimized typography, AI components)
- [x] Core libs: dates (IST), api client (correlation-id + 401 logout), storage (Keychain), responsive (rv()), branding (useBranding()), haptics
- [x] Stores: authStore (decodes real apps/api JWT, derives roles, setClassTeacher), schoolStore (branding), syncStore
- [x] Hooks: useEntryAnimation / useStaggerAnimation / useTitleAnimation
- [x] UI components: SyncPill, SegmentHeader, Card, Badge (+ custom color prop), Avatar, Button (haptic+school accent), Skeleton/CardSkeleton, EmptyState, ErrorState, Text (variant system + Telugu support)
- [x] Navigation: AppNavigator (native-stack auth gate), TeacherNavigator (bottom tabs, conditional My Class)
- [x] Auth screens: LoginScreen (rotating power statements, pulse mark, /auth/otp/request) + OTPScreen (6 boxes, paste, dev-OTP prefill, resend countdown, role guard)
- [x] 6 placeholder screens (Attendance/MyClasses/MyClass/Chat/Profile) + index.js (GestureHandler + SafeAreaProvider + QueryClient)
- [x] Spec doc: docs/specs/NeuraLife — Teacher App Foundation.md

**Completed — Home Screen (Teaching Command Center):**

- [x] Migration 024: full 5-day timetable seed (138 slots, 3 sections, no teacher conflicts) + homework demo data
- [x] API: `GET /api/v1/teacher/home` — teacher-mobile.ts + teacher-mobile.repository.ts (IST-aware, class teacher detection, attendance/alert queries)
- [x] Types: `src/types/home.ts` (PeriodCard, KpiData, AlertItem, HomeData, ContextState)
- [x] Hook: `useHomeData.ts` (staleTime 0, branding sync into schoolStore)
- [x] Hook: `usePeriodStatus.ts` (minute-aligned IST clock, 6 ContextState values, live elapsedPct)
- [x] Components: SchoolHeader, KpiStrip (AI-pending state), ContextBar (cross-fade + PulseDot), PeriodCard (NOW breathing + progress bar), AlertItem, PeriodActionSheet (spring bottom sheet)
- [x] HomeScreen: sticky header pattern (SchoolHeader + KpiStrip + ContextBar above SectionList), Sunday/empty/error states
- [x] 0 TypeScript errors (API + mobile)

**Completed — NeuraLife Intelligence OS Design System (v3.0):**

- [x] Complete theme system redesign: Neural Academy Palette with neural intelligence core (#1E40AF/#4338CA/#7C3AED) + academic heritage (#D97706) 
- [x] Three-tier typography: Academic (Libre Baskerville serif), Neural (Inter sans), Teacher efficiency (Inter optimized)
- [x] Enhanced component system: Neural variants for Card/Button/Badge/Text with AI processing states
- [x] Neural Intelligence components: IntelligenceIndicator, NeuralPulse, StatCard with AI visualization
- [x] Background intelligence system: Neural network visualization (dark) + clean intelligence grid (light)
- [x] Teacher-optimized architecture: Spacing/animations/touch targets sized for classroom conditions
- [x] Screen containers: Teaching/Auth/Data/Neural optimized layouts with scrim intelligence
- [x] Cultural integration: Telugu support + academic tradition respect + modern neural technology
- [x] Documentation: Complete CLAUDE.md updates + neural intelligence redesign summary
- [x] Teacher experience: Feel like neural operators of school intelligence OS
- [x] 0 TypeScript errors (full transformation complete)

**Layer 12 — NeuraSphere (Moderation + Feed)** ← LATER

**Completed — Analytics Web UI (Layer 11):**

- [x] Analytics types appended to `apps/web/src/types/common.ts` (AnalyticsPeriod through PredictionAccuracy — 24 types)
- [x] `apps/web/src/hooks/useBookmarks.ts` — useBookmarks, useAddBookmark, useRemoveBookmark
- [x] `apps/web/src/hooks/useAnalytics.ts` — 16 hooks (narrative, academic, attendance, financial, digital, yoy, benchmarks, student intel, section/class analytics, board results, share token, shared)
- [x] `apps/web/src/components/ui/BookmarkButton.tsx` — filled/outline amber toggle
- [x] `apps/web/src/components/layout/PageHeader.tsx` — bookmarkUrl + bookmarkTitle props added
- [x] `apps/web/src/components/layout/Sidebar.tsx` — Bookmarks section with pinned links below nav
- [x] `apps/web/src/pages/Analytics/AnalyticsPage.tsx` — 5-section page with sticky left nav, period selector, AI narrative, recharts charts for Academic/Attendance/Financial/Digital/YoY+Benchmarks
- [x] `apps/web/src/pages/Analytics/ClassAnalyticsPage.tsx` — section comparison, top/bottom students, drill-down to section
- [x] `apps/web/src/pages/Analytics/SectionAnalyticsPage.tsx` — KPI strip, searchable/sortable student roster
- [x] `apps/web/src/pages/Analytics/StudentAnalyticsPage.tsx` — radar, subject mastery, mastery trajectory, attendance calendar, exam history, error patterns, AI insight, share
- [x] `apps/web/src/pages/Analytics/BoardResultsPage.tsx` — empty state, subject avg chart, prediction accuracy, grade grid
- [x] `apps/web/src/pages/Analytics/SharedAnalyticsPage.tsx` — public (no auth), narrative + mastery + risk summary
- [x] `apps/web/src/App.tsx` — 5 new protected routes + public /shared/analytics/:token
- [x] 0 TypeScript errors (full monorepo typecheck SUCCESS)

**Completed — Analytics API Foundation (Layer 10):**

- [x] Migration 022: `school_groups`, `school_group_memberships`, `school_analytics_narratives`, `school_health_scores`, `teacher_performance_snapshots`, `board_exam_results`, `neuralife_benchmark_stats`, `user_bookmarks`, `analytics_share_tokens` + RLS + seed (12-month health scores, 2 teacher snapshots, 4 benchmark metrics)
- [x] ALTER `student_yearly_progress`: `is_rte_student BOOLEAN`, `admission_category TEXT`
- [x] Types (api + web): `AnalyticsPeriod`, `AnalyticsFilter`, `SchoolNarrative`, `TeacherPerformanceRow`, `CurriculumGapRow`, `SubjectMasteryRow`, `ExamProgressionRow`, `AtRiskFunnelData`, `RteComparisonData`, `AcademicAnalytics`, `AttendanceDeepAnalytics`, `FinancialAnalytics`, `DigitalAnalytics`, `YoYComparison`, `BenchmarkData`, `StudentIntelligence`, `SectionComparison`, `BookmarkItem`, `ShareToken`, `BoardExamResult`, `PredictionAccuracy`, `SchoolNarrative` + attendance sub-types
- [x] `AnalyticsDeepRepository` (50+ methods): school/AY info, narratives, teacher perf snapshots, subject mastery, curriculum gaps, exam progression, at-risk funnel, RTE comparison, attendance trend/heatmap/day-of-week/chronic absentees, fee collection trend/outstanding, salary-revenue ratio, SmartPad utilization, YoY comparisons, benchmark stats, student intelligence (profile/mastery/trajectory/attendance/sessions/errors/exam history), section comparison, board exam results/prediction accuracy, share tokens, bookmarks
- [x] `analytics-deep.ts` (16 routes): GET/POST narrative, GET academic/attendance/financial/digital/yoy/benchmark, GET/POST student intelligence, GET section/class analytics, GET/POST board-results, POST share token, GET share/:token (public)
- [x] `bookmarks.ts` (3 routes): GET/POST/DELETE bookmarks (max 10 per user)
- [x] Column fixes: `label` → `year_label` (academic_years), `address` → `full_address` (schools), `class_year`/`section` filters removed from attendance table (use neura_id-based filtering), `balance` → computed from `amount_due - amount_paid - amount_waived`, `designation` removed from teachers join
- [x] 0 TypeScript errors (full monorepo typecheck SUCCESS)

**Completed — Fleet / SmartPad Management (Layer 9):**

- [x] Migration 021: extends `smartpad_devices` (+7 cols), extends `smartpad_assignment_history` (+10 cols, nullable academic_year_id), creates `smartpad_health_snapshots`, `smartpad_alerts`, `smartpad_ota_campaigns` + RLS + demo seed (10 devices, 5 alerts, 1 OTA campaign, 14-day health snapshots)
- [x] Types (api + web): `LATEST_FIRMWARE`, `DeviceStatus`, `SyncStatus`, `AlertSeverity`, `AlertType`, `FleetDevice`, `FleetAlert`, `FleetKPIs`, `FleetEfficiencyScore`, `FleetOverview`, `HealthSnapshot`, `AssignmentHistoryItem`, `DeviceDetail`, `OTACampaign`, `AssignDeviceInput`, `ReturnDeviceInput`
- [x] `FleetRepository` (16 methods: list/find devices, update status, assign/return/markLost, list/acknowledge/resolve/insert alerts, health snapshots, assignment history, OTA campaigns, student enrichment helpers)
- [x] `FleetService` (computeSyncStatus, computeKPIs, computeEfficiency, getOverview, getDeviceDetail, updateStatus, markLost, assignDevice, returnDevice, getAlerts, acknowledgeAlert, launchOTA, listOTACampaigns)
- [x] 11 API routes in `fleet.ts`: GET overview, GET devices, GET device/:id, PUT status, PUT mark-lost, PUT assign, POST return, GET alerts, PUT alert acknowledge, GET ota/campaigns, POST ota/push
- [x] `useFleet.ts` (9 hooks: useFleetOverview, useFleetDevices, useDeviceDetail, useFleetAlerts, useOTACampaigns, useUpdateDeviceStatus, useMarkDeviceLost, useAssignDevice, useReturnDevice, useAcknowledgeAlert, useLaunchOTA)
- [x] `FleetPage` — 3 tabs: Overview (KPI strip, Leaflet map, alerts panel, device list with sync/status filters), OTA Management, Analytics
- [x] `FleetMap.tsx` — react-leaflet@4.2.1 map with color-coded CircleMarker pins (green/amber/orange/red/grey by sync status)
- [x] `DeviceDetailPanel.tsx` — slide-in panel: status badges, stat cards (battery/storage/sync/GPS), student assignment, battery trend chart, active alerts, assignment history chain with conditions/costs, usage stats
- [x] `AssignDeviceModal.tsx`, `ReturnDeviceModal.tsx`, `MarkLostModal.tsx` — device lifecycle modals
- [x] `OTAManagement.tsx` — outdated device checklist, select-all, launch OTA campaign, campaign history
- [x] `FleetAnalytics.tsx` — sync distribution bar chart, battery histogram, fleet efficiency score gauge with breakdown bars, top-devices-by-usage bar chart
- [x] App.tsx fleet route updated: PRINCIPAL + SCHOOL_ADMIN (was PRINCIPAL only)
- [x] 0 TypeScript errors (web + api), full monorepo typecheck SUCCESS

**Completed — Salary & Payroll (Layer 8):**

- [x] Migration 020: `payroll_runs`, `payslips`, `payroll_adjustments` + RLS service_role policies
- [x] Types (api + web): `PayrollStatus`, `PayslipStatus`, `AdjustmentType`, `PayrollAdjustment`, `PayslipRow`, `PayrollSummary`, `NEFTExportRow`
- [x] `PayrollRepository` (15 methods), `PayrollService` (LOP+PT+PF+ESI computation, generate/approve/pay/adjust/hold)
- [x] 10 API routes in `salary.ts`: GET payroll, POST generate (server-side academic year lookup), POST approve, POST mark-paid, POST/DELETE adjustment, GET neft-export, GET payslip/:id, GET history, PATCH hold/release
- [x] `useSalary.ts` (9 hooks), `generatePayslipPDF.ts` (A4 portrait jsPDF), `buildNEFTCSV` helper
- [x] `SalaryPage` — 3 tabs: Monthly Payroll (generate/approve/pay, payslip table, NEFT export), History, Revisions
- [x] PayslipDrawer — net pay box, earnings/deductions breakdown, adjustment CRUD, hold/release, PDF download per payslip
- [x] 0 TypeScript errors (web + api)

**Completed — Timetable Builder:**

- [x] Migration 019: `school_period_config`, `school_assembly_config`, `timetable_requirements`, `timetable_generations` + RLS + `timetable_slots` column additions
- [x] `TimetableRepository` (13 methods), `TimetableService` (CSP algorithm with LCG seeded shuffle), 10 timetable routes
- [x] Types (api + web): `PeriodConfigRow`, `AssemblyConfig`, `TimetableRequirement`, `TimetableConfig`, `TimetableSlotEntry`, `TimetableConflict`, `GeneratedTimetable`, `TimetableStatus`, `TeacherSubjectAssignment`
- [x] `TimetableConfig` includes `teacher_assignments[]` — enrollment-sourced teacher→subject→grade map, always returned by `GET /timetable/config`
- [x] `useTimetable.ts` (7 hooks), `generateTimetablePDF.ts` (A4 landscape + JSZip), `switch.tsx` component
- [x] `TimetablePage` → `SetupWizard` (3 steps) → `TimetableView` with Class/Teacher toggle
- [x] Step1: SCERT AP pre-filled subjects, ECA add/remove, Assembly config, live summary
- [x] Step2: Working days, per-day period timeline, break/lunch config, slot checker
- [x] Step3: CSP loading animation, conflict panel, teacher workload, class tabs, editable grid, EditPeriodPanel
- [x] `TimetableGrid`: color-coded cells, hover edit, double-period markers, conflict highlights, drag-to-swap day rows
- [x] `EditPeriodPanel`: subject grid → teacher card list with Available / Busy / Here badges; auto-selects first free teacher; conflict warning on save
- [x] Bugfix: BREAK slots got duplicate `period_number: -1` causing 500 on confirm — fixed to use `-(period)` per break slot
- [x] Sidebar: CalendarRange icon + Timetable nav item
- [x] 0 TypeScript errors (web + api), build SUCCESS

**Completed — Layer 7 (Exams Module):**

- [x] Migration 018: `exam_date DATE` on `exam_subjects`, `schedule_type TEXT` on `exams`
- [x] SyllabusRepository: `getSubjectsForGrade`, `getClassSections` (from student_yearly_progress), SA1 chapter fix (first 50%)
- [x] ExamRepository: `createExam` with exam_date per subject, `listExams` with class_range computed, `getExamById` with exam_date
- [x] ExamService: `prepareBatch` (working days, round-robin date assignment, auto chapter selection), board defaults helpers
- [x] Routes: `GET /exams/batch/prepare`, `GET /exams/subjects`, `GET /exams/chapters`, `GET /exams/chapters/auto-select`
- [x] Types (api + web): `BatchSubjectSlot`, `BatchClassSection`, `BatchPrepareResult`, `exam_date`, `class_range`, `schedule_type`
- [x] apps/web: `CreateExamModal` — mode selection (Individual vs Batch), batch Gantt flow, `BatchGanttStep` drag-drop
- [x] apps/web: `ExamsPage` — "Classes" column with class_range chip
- [x] apps/web: `useExams.ts` — `useBatchPrepare`, `useSubjectsForGrade`, `useExam` alias
- [x] shadcn: `textarea.tsx`, `tooltip.tsx` (installed @radix-ui/react-tooltip)
- [x] `neuracoin_balance` added to StudentDetail (api + web) + displayed in StudentProfilePage
- [x] 130/130 tests passing, 0 TypeScript errors

**Completed — Content Studio (Extended):**

- [x] Telugu-aware prompts: explicit language instructions in buildBatch1Prompt, buildSvgPrompt, buildCssPrompt
- [x] Language-aware SVG diagrams: all labels/captions in Telugu when medium=TELUGU
- [x] Language-aware CSS diagrams: all text/labels in Telugu when medium=TELUGU
- [x] free_style segment (12th): responsive HTML block rendered outside device frame on ContentStudioPage
- [x] Segment audit system: 3-icon overlay (Comment→Claude, Regenerate, Tick) per segment via SegmentAuditWrapper
- [x] Submit to Database button: appears when all segments approved, calls approve endpoint (sets audit_status=APPROVED)
- [x] Real Tap-to-Sequence game: shuffled steps, tap to order, success/wrong feedback with reset
- [x] YouTube links checklist: 3-4 real video recommendations with search URLs + auditor checkboxes
- [x] Language consistency (BOTH medium): English generated first, Telugu uses EN as structural reference (sequential, not parallel)
- [x] Prerequisites from DB: GET /api/v1/content-studio/prerequisites queries cs_textbooks grades 4→(grade-1)
- [x] POST /api/v1/content-studio/refine-segment: comment-driven or regenerate any single segment
- [x] POST /api/v1/content-studio/generated-content/:id/approve: sets audit_status=APPROVED
- [x] ContentStudioRepository: getPreviousGradeTopics, approveGeneratedContent
- [x] 0 TypeScript errors (web + api), 98/98 tests passing

**Completed — Layer 1 (Auth) + Layer 2 (Dashboard) + Layer 3 (Students) + Layer 4 (Teachers):**

- [x] Supabase schema pushed (74 tables, RLS, demo seed)
- [x] TypeScript types generated → packages/shared/src/types/database.ts
- [x] Monorepo scaffold + pnpm-workspace.yaml
- [x] packages/shared — package.json, tsconfig.json, helpers.ts (Tables<T>)
- [x] apps/api full foundation — server.ts, config.ts, supabase.ts, jwt.ts, logger.ts, errors.ts, retry.ts, correlationId.ts — LIVE on :3001 ✅
- [x] apps/web full foundation — Vite + Tailwind + shadcn (13 components) + Zustand + TanStack Query + Framer Motion — LIVE on :5173 ✅
- [x] Migration 004–007 all pushed (007 = increment_school_sequence Postgres function)
- [x] All auth routes (otp/request, otp/verify, pin/verify, pin/set, refresh, session DELETE)
- [x] JWT middleware + requireRole guard + AuthRepository + AuthService
- [x] 69 tests passing — 0 TypeScript errors
- [x] apps/web: Full auth flow (Login → OTP → Dashboard), AppShell, ProtectedRoute, Zustand store
- [x] dev/prod environment split
- [x] GET /api/v1/analytics/school/:schoolId/health-score — LIVE ✅
- [x] AnalyticsRepository + AnalyticsService + MemoryCache (5-min TTL)
- [x] apps/web: Dashboard page — SchoolHealthScoreCard, PriorityPanel, KPIStrip, SmartPadStatus, AtRiskTable — LIVE ✅
- [x] apps/web: useDashboard hook — TanStack Query + Supabase Realtime
- [x] StudentRepository (generateNeuraId, findByNeuraId, findBySchool, createStudent, updateStudent, softDeleteStudent)
- [x] EnrollmentRepository (getCurrentAcademicYear, enroll, addParentContacts, createConsentRecord)
- [x] StudentService (admitStudent 9-step, getStudent role-filtered mastery, listStudents)
- [x] 5 student routes (POST, GET list, GET :neuraId, PUT :neuraId, DELETE :neuraId) — LIVE ✅
- [x] apps/web: StudentsPage — table + card views, filters (class/section/status/search), pagination, AT_RISK row highlight — LIVE ✅
- [x] apps/web: StudentProfilePage — 6-tab layout (Overview, Mastery radar, Attendance, Homework, Behaviour, Parents) — LIVE ✅
- [x] apps/web: AdmitStudentModal — 4-step form with Aadhaar SHA-256 hashing, NeuraID success screen, print card — LIVE ✅
- [x] apps/web: useStudents, useStudentProfile, useAdmitStudent, useUpdateStudent hooks
- [x] apps/web: Pagination, EmptyState, timeAgo utility components
- [x] Live demo: 32 students, Arun Sharma (NID-2025-AP-084303) AT_RISK confirmed
- [x] TeacherRepository (computeLeaveYearLabel, findBySchool, findById, createTeacher, updateTeacher, softDeleteTeacher)
- [x] SalaryRepository (computeGross, findCurrent, createSalaryStructure)
- [x] LeaveRepository (getBalancesAndHistory, submitApplication, approveApplication, rejectApplication)
- [x] TeacherService (createTeacher, listTeachers, getTeacherProfile, setSalaryStructure, softDeleteTeacher)
- [x] 9 teacher routes (POST, GET list, GET :id, PUT :id, DELETE :id, GET/POST salary, GET leave, PUT leave action) — LIVE ✅
- [x] apps/web: TeachersPage — table with designation/subjects/class_teacher/status/leave balance — LIVE ✅
- [x] apps/web: AddTeacherModal — 3-step wizard (Personal → Assignment+Subjects → Salary) — LIVE ✅
- [x] apps/web: TeacherProfilePage — 4-tab layout (Info, Subjects, Salary[PRINCIPAL], Leave) — LIVE ✅
- [x] apps/web: useTeachers, useTeacherProfile, useTeacherLeave, useCreateTeacher, useSetSalary, useLeaveAction hooks
- [x] Live demo: K. Suresh Kumar (11000000-0000-0000-0000-000000000001) — salary gross=32800, CL:9 remaining, 10-A MATHEMATICS class_teacher=true

**Completed — Layer 5 (Attendance):**

- [x] POST /api/v1/attendance — mark daily attendance (class-wise, digital signature)
- [x] GET /api/v1/attendance/class — class roster + existing records (supports already_marked state)
- [x] PATCH /api/v1/attendance/:id — immutable correction audit trail
- [x] GET /api/v1/attendance/student/:neuraId — monthly calendar with holiday awareness
- [x] GET /api/v1/attendance/analytics — school-wide analytics (day/week/month/quarter ranges)
- [x] AttendanceRepository (5 methods: getClassWithStudents, markAttendance, createCorrection, getStudentMonthlyAttendance, getSchoolAttendanceAnalytics)
- [x] apps/web: AttendancePage — all-present-by-default mark mode, read-only correction mode, amber already_marked banner
- [x] apps/web: AttendanceStudentRow — P/A/L buttons, ABSENT reason dropdown, inline CorrectionForm
- [x] apps/web: AttendanceAnalyticsPage (/attendance/analytics) — KPI strip, Bar+Line/Heatmap toggle, class breakdown, absent/present student lists with class filter
- [x] apps/web: useAttendance hooks (useClassAttendance, useMarkAttendance, useCorrectAttendance, useStudentMonthlyAttendance, useAttendanceAnalytics)
- [x] 14 API tests passing

**Completed — Layer 6 (Fees):**

- [x] Migration 008 — idempotency_keys table + generate_receipt_number() PostgreSQL function
- [x] Migration 009 — demo fee ledger seed (30 students: 17 PAID, 2 PARTIAL, rest OVERDUE)
- [x] TypeScript types regenerated (packages/shared/src/types/database.ts)
- [x] IdempotencyRepository (check, store)
- [x] ReceiptRepository (generateReceiptNumber via RPC)
- [x] FeeRepository (getFeeStructure, getStudentFeeBalance, getCollectionSummary, getUnpaidLedgerItems, updateLedgerAfterPayment, reverseLedgerPayment)
- [x] PaymentRepository (createPayment with auto-allocation oldest-first, voidPayment + ledger reversal, getPaymentReceipt)
- [x] FeeService (recordPayment: idempotency → validate → receipt number → payment → audit)
- [x] 5 fee routes (GET structure, GET collection, GET ledger/:neuraId, POST payment, DELETE payment/:id)
- [x] 15 API fee tests passing (98 total — 0 failures)
- [x] apps/web: fee types added to common.ts
- [x] apps/web: useFees.ts (useFeeCollection, useStudentLedger, useRecordPayment, useVoidPayment)
- [x] apps/web: generateReceiptPDF.ts — A5 jsPDF layout with allocations table
- [x] apps/web: FeeCollectionSummary component — KPI strip, progress bar, recent payments
- [x] apps/web: RecordPaymentModal — 3-screen flow (form → confirm → receipt with PDF download)
- [x] apps/web: FeesPage — collection dashboard (left) + student ledger lookup (right)
- [x] 0 TypeScript errors (web + api)

**Completed — Layer 6 (Fees) Extended:**

- [x] Migration 010 — fee_head + concession_type enum extensions, custom_fee_heads, custom_fee_head_amounts, fee_concession_rules tables, fee_ledger custom_head columns
- [x] New types in api/types/common.ts: FeeAnalyticsData, FeeAnalyticsTrend, FeeHeadBreakdown, FeeClassBreakdown, UnpaidStudentItem, FeeStructureRow, ConcessionRule, CustomFeeHead
- [x] New types mirrored in web/types/common.ts
- [x] FeeRepository extended: getAnalytics, getUnpaidStudents, updateFeeStructure
- [x] ConcessionRepository: listRules, createRule, updateRule, deactivateRule
- [x] CustomFeeHeadRepository: list, create, update, deactivate
- [x] 11 new API routes: GET/PUT analytics, GET analytics/unpaid, PUT structure, GET/POST/PUT/DELETE concession-rules, GET/POST/PUT/DELETE custom-heads
- [x] useFees.ts hooks: useFeeAnalytics, useUnpaidStudents, useConcessionRules, useCreateConcessionRule, useDeactivateConcessionRule, useCustomFeeHeads, useCreateCustomFeeHead, useUpdateFeeStructure, useFeeStructure
- [x] apps/web: FeeAnalyticsPage — KPI strip, Recharts ComposedChart trend, fee-head breakdown, class breakdown, unpaid students list with Pay Now
- [x] apps/web: FeeSettingsModal — 3 tabs (Fee Structure editable grid, Concession Rules CRUD, Custom Fee Heads CRUD)
- [x] apps/web: RecordPaymentModal enhanced — initialNeuraId prop, unpaid checklist with auto-amount, Select All Unpaid
- [x] apps/web: FeesPage updated — Analytics button, Settings icon button, LedgerPanel Pay button with pre-fill, ?pay= query param support
- [x] App.tsx: /fees/analytics route added (PRINCIPAL + SCHOOL_ADMIN)
- [x] 0 TypeScript errors (web + api)

---

## Monorepo Structure

```
neuralife/
├── apps/
│   ├── api/        Node.js 20 + TypeScript + Fastify    (API Gateway)
│   ├── web/        React 18 + Vite + Tailwind            (Web Admin Console)
│   ├── mobile/     React Native 0.74                     (Teacher + Parent App)
│   └── ml/         Python 3.11 + FastAPI                 (ML Microservice)
├── packages/
│   └── shared/     TypeScript types + constants          (used by all apps)
├── supabase/
│   └── migrations/ 001–006 SQL files (all pushed ✅)
└── docs/
    ├── specs/      17 NeuraLife specification documents
    └── context/    build-log.md, decisions.md, api-contracts.md
```

---

## Tech Stack — LOCKED. Never suggest alternatives.

| App    | Runtime           | Framework       | Key Libraries                                               |
| ------ | ----------------- | --------------- | ----------------------------------------------------------- |
| api    | Node.js 20        | Fastify 4.x     | Supabase JS v2, Zod, Pino, Vitest                           |
| web    | Node.js 20        | React 18 + Vite | Tailwind, shadcn/ui, Framer Motion, TanStack Query, Zustand |
| mobile | React Native 0.74 | Expo managed    | WatermelonDB, React Navigation v6, Reanimated 3             |
| ml     | Python 3.11       | FastAPI         | Supabase Python, boto3 (Bedrock), pandas                    |
| shared | TypeScript        | —               | Supabase generated types                                    |

---

## Architecture Principles — Apply to Every Package

### 1. Layered Architecture (strict)

```
Request → Route Handler → Service → Repository → Database
                                 ↘ External API (Bedrock, FCM, MSG91)

Rules:
- Route handlers: validation + auth only. Call services. Return response.
- Services: business logic. Orchestrate repositories. Never touch DB directly.
- Repositories: all DB queries live here. Never in routes or services.
- No skipping layers. A route handler NEVER queries the database directly.
```

### 2. SOLID Principles

```
S — Single Responsibility: one file, one purpose. auth.service.ts handles auth only.
O — Open/Closed: extend via new files, not by modifying existing ones.
L — Liskov: if you override, the override must honour the original contract.
I — Interface Segregation: small, focused TypeScript interfaces. No giant god objects.
D — Dependency Injection: inject dependencies into constructors/functions. No globals.
```

### 3. Error Handling (non-negotiable)

Every function that can fail must:

- Use typed error classes (not `throw new Error('string')`)
- Never swallow errors silently
- Log with correlation ID before throwing
- Return typed error responses to clients

```typescript
// ✅ CORRECT
try {
  const result = await studentRepo.findByNeuraId(neuraId)
  if (!result) throw new NotFoundError('Student not found', { neura_id: neuraId })
  return result
} catch (error) {
  logger.error({ correlationId, error, neuraId }, 'Failed to fetch student')
  throw error
}

// ❌ WRONG — never do these
} catch (e) { console.log(e) }     // silent swallow
throw new Error('something failed') // untyped
```

### 4. Observability (mandatory from day one)

Every request must have:

- **Correlation ID**: generated at request entry, passed through every function call
- **Structured logging**: Pino logger, JSON format, never console.log
- **Request timing**: response time logged on every route
- **Error context**: what failed, why, what the user was trying to do

```typescript
// Every route handler receives and passes correlationId
const correlationId = request.headers["x-correlation-id"] ?? generateId();
logger.info({ correlationId, path: request.url }, "Request received");
```

### 5. Retry and Resilience

External API calls (Bedrock, FCM, MSG91, Supabase) must:

- Retry on transient failures (network timeout, 429, 503) — max 3 attempts
- Use exponential backoff: 1s → 2s → 4s
- Circuit breaker: if 5 consecutive failures → open circuit for 30 seconds
- Never let one failed external call crash the entire request

```typescript
// Use the retry utility from utils/retry.ts
const result = await withRetry(() => bedrockClient.generateInsight(prompt), {
  maxAttempts: 3,
  backoffMs: 1000,
});
```

### 6. Idempotency (critical for financial operations)

All operations that mutate data (fee payments, student enrollment, salary processing) must:

- Accept an idempotency key in the request header: `x-idempotency-key`
- Check if this key was already processed
- Return the same response if it was (no duplicate processing)
- Store idempotency records for 24 hours minimum

### 7. Input Sanitization

All user-provided text before storing to DB:

- Trim whitespace
- Sanitize HTML (DOMPurify server-side for any text that renders as HTML)
- Validate against Zod schema (length limits, format, character restrictions)
- Never trust the client — validate server-side always

---

## Spec Sync Rule (mandatory)

**When you build or modify any feature:**

1. Identify which spec documents in `docs/specs/` describe this feature
2. If your implementation differs from the spec (even slightly): update the spec
3. If your implementation resolves an "Open Question" in the spec: close it
4. If your implementation creates a new decision: add it to "Confirmed Decisions"
5. Run `/project:sync-spec` to verify specs are consistent with code

**Never let code and spec diverge.** The spec is the contract. The code is the implementation. Both must match.

---

## Database — Critical Rules

### Clients

```typescript
// supabaseAnon  → user-facing queries (RLS enforced automatically)
// supabaseAdmin → background jobs, ML pipeline only (bypasses RLS)
// NEVER use supabaseAdmin in a user-facing route handler
```

### Query Rules

```typescript
// ✅ CORRECT
const { data, error } = await supabaseAnon
  .from('students')
  .select('neura_id, full_name, band, status')   // explicit columns
  .eq('neura_id', neuraId)
  .single()

// ❌ WRONG
.select('*')                    // never SELECT *
req.body.school_id              // school_id from body
supabaseAdmin in route handler  // never bypass RLS for user requests
```

### Repository Pattern

All DB access goes through repositories in `src/repositories/`:

```typescript
// src/repositories/student.repository.ts
export class StudentRepository {
  constructor(private supabase: SupabaseClient) {}

  async findByNeuraId(neuraId: string, schoolId: string) {
    const { data, error } = await this.supabase
      .from("students")
      .select("neura_id, full_name, band, status, data_consent_given")
      .eq("neura_id", neuraId)
      .single();
    if (error) throw new DatabaseError(error.message, { neuraId });
    return data;
  }
}
```

---

## Auth Model

```typescript
interface JWTPayload {
  sub: string; // user UUID
  role: UserRole; // SUPER_ADMIN|PRINCIPAL|SCHOOL_ADMIN|TEACHER|PARENT|STUDENT|SYSTEM
  school_id: string; // for RLS
  teacher_id?: string;
  neura_id?: string;
  linked_neura_ids?: string[];
  device_id?: string;
  jti: string;
  iat: number;
  exp: number; // access: 24hr | refresh: 30 days
}

// school_id ALWAYS from JWT, never from request body
const { school_id, role } = request.jwtPayload;
```

---

## UI/UX Standards (applies to web and mobile)

### NeuraLife Design Identity

```
Primary:     #1E40AF  (deep blue — trust, intelligence)
Secondary:   #0D9488  (teal — growth, learning)
Accent:      #F59E0B  (amber — alerts, attention, SmartPad)
Success:     #10B981  (green — mastery, achievement)
Danger:      #EF4444  (red — AT_RISK, urgent)
Warning:     #F59E0B  (amber — watch, declining)
Background:  #F8FAFC  (near white — clean)
Surface:     #FFFFFF  (cards, panels)
Text:        #0F172A  (near black — sharp, readable)
Muted:       #64748B  (secondary text)

Border:      #E2E8F0
Radius:      12px (cards), 8px (inputs), 6px (badges), 999px (pills)
Shadow:      0 1px 3px rgba(0,0,0,0.08) — subtle, not heavy
```

### Typography

```
Primary font:   Inter (web) | SF Pro (iOS) | Roboto (Android)
Telugu font:    Noto Sans Telugu — always applied to Telugu text
Heading:        font-bold, tracking-tight
Body:           font-normal, leading-relaxed
Code:           JetBrains Mono
```

### Animation Standards

```
Micro-interactions:  150ms ease-out  (button press, toggle)
Page transitions:    250ms ease-in-out
Data loading:        Skeleton screens — NEVER show empty white space
Success feedback:    Scale 1.0 → 1.05 → 1.0 (200ms)
Error feedback:      Shake horizontal (300ms)
List item enter:     Slide up + fade (200ms, staggered 30ms apart)
Number changes:      Count animation (300ms)

Principle: animations must feel instant, not decorative.
Every animation serves a purpose. No pure decoration.
```

### Loading States (mandatory — never skip)

```typescript
// Every data-fetching component MUST show:
// 1. Skeleton while loading (matches exact layout of loaded state)
// 2. Error state with retry button
// 3. Empty state with action (not blank screen)
// 4. Optimistic update on mutation (don't wait for server)
```

### Accessibility (WCAG 2.1 AA minimum)

```
- Every interactive element: aria-label or visible label
- Color is never the only indicator (add icon or text)
- Focus visible on all interactive elements (no outline: none)
- Touch target minimum: 44×44px
- Text contrast: 4.5:1 minimum
- Images: alt text always
- Telugu content: proper font-family, correct lang attribute
```

---

## Shared Rules — Every Package

1. **No `any` type** — use `Tables<'table_name'>` or define proper interfaces
2. **school_id from JWT only** — never from request body
3. **Explicit DB columns** — never `SELECT *`
4. **Spec first** — read `docs/specs/` before building any module
5. **Test immediately** — write tests in same session as the feature
6. **Build log** — update `docs/context/build-log.md` at session end
7. **No secrets in code** — all values from config module
8. **Correlation ID** — every request, every log line
9. **Typed errors** — use error classes from utils/errors.ts
10. **Repo pattern** — DB queries only in repositories
11. **Retry on externals** — Bedrock, FCM, MSG91 all have retry logic
12. **Spec sync** — code changes = spec review

---

## Demo Reference Data

```
School:        SCH-AP-DEMO-0001  (Vikas High School, Guntur)
Academic year: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Student good:  NID-2025-AP-084291  (Arjun Reddy, 10-A)
Student risk:  NID-2025-AP-084303  (Arun Sharma, 10-B — AT_RISK)
Teacher:       11000000-0000-0000-0000-000000000001  (K. Suresh Kumar)
SmartPad live: PAD-0001  |  SmartPad dead: PAD-0027 (offline 9 days)
```

## Login Test Credentials (dev mode — use in LoginPage)

| Mobile (enter without +91) | Name                   | Role logged in as |
|----------------------------|------------------------|-------------------|
| `9876543210`               | Dr. S. Ramana Murthy   | PRINCIPAL         |
| `9876543211`               | K. Suresh Kumar        | TEACHER           |
| `9876543212`               | P. Venkat Rao          | TEACHER           |
| `9000000002`               | Dev Test Principal     | PRINCIPAL         |
| `9000000001`               | Dev Test Teacher       | TEACHER           |
| `9000000003`               | Dev Test Parent        | PARENT            |
| `9901110001`–`9901110030`  | Demo parents           | PARENT            |

OTP is returned in the API response (devOtp) and pre-filled in the OTP screen when ENABLE_SMS_OTP=false.

## Environment Modes

```
npm run dev   → NODE_ENV=development  (reads .env + .env.development)
               - ENABLE_SMS_OTP=false    OTP in API response, pre-filled on screen
               - ENABLE_RATE_LIMIT=false No HTTP/OTP lockout limits
               - ENABLE_EMAIL=false      Email logged to console
               - ENABLE_FCM_PUSH=false   Push skipped

npm run prod  → NODE_ENV=production   (reads .env + .env.production)
               - ENABLE_SMS_OTP=true     Real MSG91 SMS
               - ENABLE_RATE_LIMIT=true  100 req/min + OTP lockouts
               - ENABLE_EMAIL=true       Real Resend email
               - ENABLE_FCM_PUSH=true    Real FCM push

Secrets (.env — gitignored):   Supabase keys, JWT keys, MSG91, Resend, FCM, AWS
Feature flags (.env.development / .env.production — committed, no secrets)
```

---

## Mobile App (apps/mobile)

Tech: React Native 0.74, WatermelonDB, Zustand, TanStack Query
Platform: Android-first (iOS in v2)
APK package: in.neuralife.teacher
Demo teacher: 9876543210 (K. Suresh Kumar, PRINCIPAL + CLASS_TEACHER)

Running the app:
  cd apps/mobile
  npx react-native run-android
  (Ensure Android emulator is running or physical device connected via USB)

Metro server (separate terminal):
  cd apps/mobile && npx react-native start

Building debug APK:
  cd apps/mobile/android && ./gradlew assembleDebug
  APK location: android/app/build/outputs/apk/debug/app-debug.apk

Key files:
  src/navigation/AppNavigator.tsx  — root navigation (native-stack, auth gate)
  src/store/authStore.ts          — JWT auth state (decodes apps/api access token)
  src/lib/api.ts                  — API client (uses local IP in dev)
  src/constants/colors.ts         — design system colors
  src/hooks/useEntryAnimation.ts  — screen entry animations

Auth contract (apps/api): POST /auth/otp/request → {devOtp?}, POST /auth/otp/verify
  → {accessToken, refreshToken, role, expiresIn}. JWT carries a single `role`
  (PRINCIPAL|TEACHER|SCHOOL_ADMIN) + school_id + teacher_id. CLASS_TEACHER status
  is NOT in the JWT — set later via setClassTeacher() from a profile fetch.

Screen template: .claude/commands/new-screen.md
API route guide: .claude/commands/mobile-api-route.md

pnpm note: apps/mobile/.npmrc requests hoisted linking, but pnpm reads .npmrc
from the workspace root during a workspace install. For native Android builds,
node_modules must be hoisted so gradle resolves @react-native-community/cli-platform-android
via ../node_modules. See docs/specs for the foundation spec.
