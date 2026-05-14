-- ============================================================
-- NeuraLife — Complete Database Schema
-- Migration: 001_initial_schema.sql
-- Region: ap-south-1 (Mumbai) — DPDP Act compliance
-- Design: Single database, school_id on all tables, RLS enforced
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for text search on names

-- ============================================================
-- ENUMS — define once, use everywhere
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN',     -- NeuraLife team
  'PRINCIPAL',       -- School principal (stored as teacher with this role)
  'SCHOOL_ADMIN',    -- Office admin
  'TEACHER',         -- Subject teacher / Class teacher
  'PARENT',          -- Parent login
  'STUDENT',         -- Student login (SmartPad + Student Login in mobile)
  'SYSTEM'           -- ML microservice
);

CREATE TYPE age_band AS ENUM (
  'FOUNDATION',   -- Class 1-3
  'ELEMENTARY',   -- Class 4-6
  'MIDDLE',       -- Class 7-8
  'SECONDARY'     -- Class 9-10
);

CREATE TYPE board_type AS ENUM (
  'SCERT_AP',
  'SCERT_TS',
  'CBSE',
  'ICSE'
);

CREATE TYPE medium_type AS ENUM ('ENGLISH', 'TELUGU', 'BOTH');

CREATE TYPE school_type AS ENUM ('GOVERNMENT', 'PRIVATE', 'AIDED');

CREATE TYPE student_status AS ENUM (
  'ACTIVE',
  'ALUMNI',       -- Left the NeuraLife ecosystem
  'TRANSFERRING', -- Mid-transfer to another school
  'DEACTIVATED'   -- DPDP deletion completed
);

CREATE TYPE mastery_classification AS ENUM (
  'MASTERED',
  'GOOD',
  'DEVELOPING',
  'AT_RISK'
);

CREATE TYPE fee_category AS ENUM (
  'GENERAL',
  'SC_ST',
  'OBC',
  'EWS',
  'FREE'
);

CREATE TYPE fee_head AS ENUM (
  'ADMISSION',
  'DEVELOPMENT',
  'TUITION',
  'EXAM',
  'TRANSPORT',
  'NEURALIFE_SUBSCRIPTION',
  'SMARTPAD',
  'SMARTPAD_EMI',
  'LATE_FEE',
  'OTHER'
);

CREATE TYPE fee_status AS ENUM (
  'PENDING',
  'PARTIAL',
  'PAID',
  'OVERDUE',
  'WAIVED'
);

CREATE TYPE payment_mode AS ENUM ('CASH', 'UPI', 'CHEQUE', 'NEFT', 'ONLINE');

CREATE TYPE leave_type AS ENUM ('CL', 'SL', 'EL', 'MATERNITY', 'PATERNITY', 'LOP', 'OTHER');

CREATE TYPE leave_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TYPE attendance_status AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'APPROVED_LEAVE', 'HOLIDAY');

CREATE TYPE day_of_week AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

CREATE TYPE device_status AS ENUM ('ACTIVE', 'LOCKED', 'LOST', 'MAINTENANCE', 'DECOMMISSIONED');

CREATE TYPE sync_status AS ENUM ('PENDING', 'SYNCED', 'FAILED');

CREATE TYPE notification_severity AS ENUM ('S1', 'S2', 'S3', 'S4');

CREATE TYPE notification_channel AS ENUM ('FCM', 'SMS', 'EMAIL', 'IN_APP');

CREATE TYPE notification_status AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

CREATE TYPE post_type AS ENUM ('ACHIEVEMENT', 'MANUAL', 'DOUBT', 'CONTEXTUAL');

CREATE TYPE moderation_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'HUMAN_REVIEW');

CREATE TYPE concession_type AS ENUM (
  'MERIT_SCHOLARSHIP',
  'SC_ST_WAIVER',
  'SIBLING_DISCOUNT',
  'STAFF_WARD',
  'MANAGEMENT_QUOTA',
  'OTHER'
);

CREATE TYPE behaviour_category AS ENUM (
  'POSITIVE_RECOGNITION',
  'DISRUPTION',
  'BULLYING',
  'PROPERTY_DAMAGE',
  'ATTENDANCE_ISSUE',
  'ACADEMIC_CONCERN',
  'OTHER'
);

CREATE TYPE employment_type AS ENUM ('REGULAR', 'CONTRACT', 'PART_TIME', 'VISITING');

CREATE TYPE pattern_type AS ENUM ('CURRICULUM_GAP', 'TEACHING_PATTERN', 'MIXED_SIGNAL');

CREATE TYPE transfer_reason AS ENUM ('TRANSFER', 'GRADUATION', 'DROPOUT', 'EXPULSION', 'OTHER');

-- ============================================================
-- DOMAIN 1 — SCHOOLS
-- ============================================================

CREATE TABLE schools (
  id                      TEXT PRIMARY KEY,  -- SCH-AP-00142
  name                    TEXT NOT NULL,
  udise_code              TEXT UNIQUE,       -- Government ID, nullable until verified
  board                   board_type NOT NULL,
  affiliation_number      TEXT,
  school_type             school_type NOT NULL DEFAULT 'PRIVATE',
  medium                  medium_type NOT NULL,
  district                TEXT NOT NULL,
  mandal                  TEXT,
  state                   TEXT NOT NULL DEFAULT 'AP',
  full_address            TEXT NOT NULL,
  pincode                 TEXT,
  gps_lat                 NUMERIC(10,7),
  gps_lng                 NUMERIC(10,7),

  -- Contact
  principal_name          TEXT NOT NULL,
  principal_mobile        TEXT NOT NULL,
  principal_email         TEXT,
  school_phone            TEXT,
  school_email            TEXT,

  -- Academic config
  establishment_year      INTEGER,
  recognition_status      TEXT DEFAULT 'RECOGNISED',
  shifts                  INTEGER DEFAULT 1 CHECK (shifts IN (1, 2)),
  working_days            day_of_week[] DEFAULT ARRAY['MON','TUE','WED','THU','FRI','SAT']::day_of_week[],
  school_start_time       TIME DEFAULT '09:00',
  school_end_time         TIME DEFAULT '16:00',
  exam_pattern            TEXT DEFAULT 'FA_SA',   -- FA_SA | TERM | CUSTOM
  grading_system          TEXT DEFAULT 'MARKS',   -- MARKS | CGPA | BOTH

  -- Leave config
  leave_year_start_month  INTEGER DEFAULT 6 CHECK (leave_year_start_month IN (1, 6)),
  -- 6 = June (academic year), 1 = January (calendar year)

  -- Salary config
  salary_cycle            TEXT DEFAULT 'MONTHLY', -- MONTHLY only for v1
  salary_pay_day          INTEGER DEFAULT 1,      -- Day of month salary is processed

  -- NeuraLife contract
  subscription_tier       TEXT DEFAULT 'GROWTH',  -- STARTER | GROWTH | SCALE | ENTERPRISE
  subscription_start      DATE,
  subscription_end        DATE,
  contract_reference      TEXT,                   -- NL-SCH-2025-0142

  -- Status
  status                  TEXT DEFAULT 'ACTIVE',  -- ACTIVE | INACTIVE | SUSPENDED
  onboarding_step         INTEGER DEFAULT 1,      -- 1-8, tracks wizard progress
  onboarding_complete     BOOLEAN DEFAULT FALSE,

  deleted_at              TIMESTAMPTZ,            -- soft delete
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- School sequence counter for NeuraID generation
CREATE TABLE school_sequences (
  state_code              TEXT NOT NULL,          -- AP | TS
  enrollment_year         INTEGER NOT NULL,
  last_sequence           INTEGER DEFAULT 0,
  PRIMARY KEY (state_code, enrollment_year)
);

-- ============================================================
-- DOMAIN 2 — ACADEMIC YEARS
-- Each school has their own academic year records
-- ============================================================

CREATE TABLE academic_years (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  year_label              TEXT NOT NULL,          -- '2025-26'
  start_date              DATE NOT NULL,
  end_date                DATE NOT NULL,
  is_current              BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, year_label)
);

-- Holidays per school per academic year
CREATE TABLE school_holidays (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  academic_year_id        UUID NOT NULL REFERENCES academic_years(id),
  holiday_date            DATE NOT NULL,
  holiday_name            TEXT NOT NULL,
  holiday_type            TEXT DEFAULT 'SCHOOL', -- GOVERNMENT | SCHOOL | REGIONAL
  UNIQUE(school_id, holiday_date)
);

-- ============================================================
-- DOMAIN 3 — PEOPLE: TEACHERS
-- ============================================================

CREATE TABLE teachers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name               TEXT NOT NULL,
  mobile                  TEXT NOT NULL,
  email                   TEXT,
  date_of_birth           DATE,
  gender                  TEXT,
  aadhaar_hash            TEXT,                   -- SHA-256, never raw
  pan_number              TEXT,                   -- for salary/TDS
  address                 TEXT,

  -- Qualifications (stored as JSONB for flexibility)
  qualifications          JSONB DEFAULT '[]',
  -- [{ degree: "M.Sc", subject: "Mathematics", institution: "Osmania", year: 2018 }]
  teaching_qualification  TEXT,                   -- B.Ed | D.Ed | None

  -- Status
  status                  TEXT DEFAULT 'ACTIVE',  -- ACTIVE | INACTIVE | RESIGNED
  deleted_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Teacher ↔ School many-to-many with role per school
CREATE TABLE teacher_school_assignments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id              UUID NOT NULL REFERENCES teachers(id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  academic_year_id        UUID NOT NULL REFERENCES academic_years(id),

  employee_id             TEXT,                   -- School's own numbering
  designation             TEXT NOT NULL,
  -- PRINCIPAL | VP | HM | PGT | TGT | PRT | PT | ADMIN | SUPPORT
  employment_type         employment_type DEFAULT 'REGULAR',
  joining_date            DATE NOT NULL,
  probation_end_date      DATE,
  reporting_to            UUID REFERENCES teachers(id),

  status                  TEXT DEFAULT 'ACTIVE',  -- ACTIVE | ON_LEAVE | RESIGNED | TERMINATED
  exit_date               DATE,
  exit_reason             TEXT,

  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, school_id, academic_year_id)
);

-- What a teacher teaches (subjects + classes) per assignment
CREATE TABLE teacher_subject_assignments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id           UUID NOT NULL REFERENCES teacher_school_assignments(id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  academic_year_id        UUID NOT NULL REFERENCES academic_years(id),
  class_year              INTEGER NOT NULL CHECK (class_year BETWEEN 1 AND 12),
  section                 TEXT NOT NULL,
  subject                 TEXT NOT NULL,
  is_class_teacher        BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(academic_year_id, school_id, class_year, section, subject)
);

-- Teacher salary structure (effective_from allows revision tracking)
CREATE TABLE salary_structures (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id              UUID NOT NULL REFERENCES teachers(id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  effective_from          DATE NOT NULL,
  effective_to            DATE,                   -- NULL = current structure

  -- Earnings
  basic                   NUMERIC(10,2) NOT NULL,
  hra_type                TEXT DEFAULT 'PERCENT', -- PERCENT | FIXED
  hra_value               NUMERIC(10,2) DEFAULT 0,
  da_type                 TEXT DEFAULT 'PERCENT',
  da_value                NUMERIC(10,2) DEFAULT 0,
  transport_allowance     NUMERIC(10,2) DEFAULT 0,
  special_allowance       NUMERIC(10,2) DEFAULT 0,

  -- Computed (stored for payslip generation, recalculated on change)
  gross_monthly           NUMERIC(10,2),

  -- Deductions config
  pf_applicable           BOOLEAN DEFAULT FALSE,
  esi_applicable          BOOLEAN DEFAULT FALSE,
  pt_applicable           BOOLEAN DEFAULT TRUE,   -- Professional tax (AP/TS = ₹200/mo)

  -- Bank details
  bank_account_number     TEXT,
  ifsc_code               TEXT,
  bank_name               TEXT,
  account_holder_name     TEXT,

  is_active               BOOLEAN DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Leave balances (one record per teacher per leave year)
CREATE TABLE leave_balances (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id              UUID NOT NULL REFERENCES teachers(id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  leave_year_label        TEXT NOT NULL,          -- '2025-26' or '2025' depending on school config
  cl_entitled             INTEGER DEFAULT 12,
  cl_used                 NUMERIC(4,1) DEFAULT 0, -- half-day leave possible
  sl_entitled             INTEGER DEFAULT 10,
  sl_used                 NUMERIC(4,1) DEFAULT 0,
  el_entitled             INTEGER DEFAULT 8,
  el_used                 NUMERIC(4,1) DEFAULT 0,
  lop_days                NUMERIC(4,1) DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, school_id, leave_year_label)
);

CREATE TABLE leave_applications (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id              UUID NOT NULL REFERENCES teachers(id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  leave_type              leave_type NOT NULL,
  from_date               DATE NOT NULL,
  to_date                 DATE NOT NULL,
  days_count              NUMERIC(4,1) NOT NULL,  -- includes half-day support
  reason                  TEXT NOT NULL,
  substitute_teacher_id   UUID REFERENCES teachers(id),
  status                  leave_status DEFAULT 'PENDING',
  reviewed_by             UUID REFERENCES teachers(id),
  reviewed_at             TIMESTAMPTZ,
  rejection_reason        TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Document checklist for teachers
CREATE TABLE teacher_documents (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id              UUID NOT NULL REFERENCES teachers(id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  document_name           TEXT NOT NULL,
  status                  TEXT DEFAULT 'PENDING', -- PENDING | RECEIVED | NOT_APPLICABLE
  received_date           DATE,
  notes                   TEXT,
  updated_by              UUID REFERENCES teachers(id),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOMAIN 4 — PEOPLE: STUDENTS
-- ============================================================

CREATE TABLE students (
  neura_id                TEXT PRIMARY KEY,       -- NID-2025-AP-084291
  full_name               TEXT NOT NULL,
  date_of_birth           DATE NOT NULL,
  gender                  TEXT,
  aadhaar_hash            TEXT UNIQUE,            -- SHA-256 client-side
  apaar_id                TEXT UNIQUE,            -- v3: APAAR integration
  blood_group             TEXT,
  nationality             TEXT DEFAULT 'Indian',
  religion                TEXT,
  caste_category          fee_category DEFAULT 'GENERAL',

  status                  student_status DEFAULT 'ACTIVE',
  band                    age_band,               -- computed from current class_year, updated on promotion

  data_consent_given      BOOLEAN DEFAULT FALSE,
  consent_version         TEXT,
  data_retain_on_exit     BOOLEAN DEFAULT TRUE,

  deleted_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- One enrollment per student (master record)
CREATE TABLE school_enrollments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  admission_number        TEXT,
  enrolled_at             DATE NOT NULL,
  exited_at               DATE,
  exit_reason             transfer_reason,
  status                  TEXT DEFAULT 'ACTIVE',  -- ACTIVE | EXITED | TRANSFERRING
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(neura_id, school_id)
);

-- Year-specific data: class, section, medium per academic year
CREATE TABLE student_yearly_progress (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  academic_year_id        UUID NOT NULL REFERENCES academic_years(id),
  academic_year_label     TEXT NOT NULL,          -- '2025-26' (denormalised for fast queries)
  class_year              INTEGER NOT NULL CHECK (class_year BETWEEN 1 AND 12),
  section                 TEXT NOT NULL,
  medium                  medium_type NOT NULL,
  preferred_content_medium medium_type,           -- NULL = use medium column
  board                   board_type NOT NULL,
  smartpad_id             TEXT,                   -- current assigned pad
  promotion_status        TEXT,                   -- PROMOTED | HELD_BACK | PENDING | NOT_APPLICABLE
  promoted_to_class       INTEGER,
  promoted_at             DATE,
  promoted_by             UUID REFERENCES teachers(id),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(neura_id, academic_year_id)
);

-- Tracks section changes mid-year
CREATE TABLE section_history (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  academic_year_id        UUID NOT NULL REFERENCES academic_years(id),
  class_year              INTEGER NOT NULL,
  from_section            TEXT NOT NULL,
  to_section              TEXT NOT NULL,
  changed_at              DATE NOT NULL,
  reason                  TEXT,
  changed_by              UUID REFERENCES teachers(id),
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Parent contacts (multiple per student — all mobiles from admission form)
CREATE TABLE parent_contacts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  parent_name             TEXT NOT NULL,
  relationship            TEXT NOT NULL,          -- FATHER | MOTHER | GUARDIAN | OTHER
  mobile                  TEXT NOT NULL,
  email                   TEXT,
  occupation              TEXT,
  annual_income           NUMERIC(12,2),
  is_primary              BOOLEAN DEFAULT FALSE,  -- primary contact for urgent SMS
  can_login               BOOLEAN DEFAULT TRUE,   -- all mobiles can login by default
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(neura_id, mobile)
);

-- Auth links: which mobiles can see which neura_ids
-- Built automatically from parent_contacts, allows parent to see all their children
CREATE TABLE parent_auth_links (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile                  TEXT NOT NULL,
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mobile, neura_id)
);

-- Document checklist for students
CREATE TABLE student_documents (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  document_name           TEXT NOT NULL,
  -- BIRTH_CERTIFICATE | AADHAAR | TC | STUDY_CERT | CASTE_CERT | ADDRESS_PROOF | PHOTOS | MARKS_MEMO
  status                  TEXT DEFAULT 'PENDING',
  received_date           DATE,
  tc_number               TEXT,                   -- for Transfer Certificate
  notes                   TEXT,
  updated_by              UUID REFERENCES teachers(id),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Transfer tokens (for school-to-school NeuraID transfer)
CREATE TABLE transfer_tokens (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  from_school_id          TEXT NOT NULL REFERENCES schools(id),
  token_hash              TEXT NOT NULL,           -- bcrypt of 6-digit code
  expires_at              TIMESTAMPTZ NOT NULL,    -- 30 days
  used_at                 TIMESTAMPTZ,
  used_by_school_id       TEXT REFERENCES schools(id),
  created_by              UUID REFERENCES teachers(id),
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOMAIN 5 — TRANSPORT
-- ============================================================

CREATE TABLE bus_routes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  route_name              TEXT NOT NULL,          -- 'Route 3 — Dilsukhnagar'
  route_number            TEXT,
  vehicle_number          TEXT,
  driver_name             TEXT,
  driver_mobile           TEXT,
  conductor_name          TEXT,
  status                  TEXT DEFAULT 'ACTIVE',
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bus_stops (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id                UUID NOT NULL REFERENCES bus_routes(id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  stop_name               TEXT NOT NULL,
  stop_order              INTEGER NOT NULL,
  morning_pickup_time     TIME,
  afternoon_drop_time     TIME,
  UNIQUE(route_id, stop_order)
);

CREATE TABLE student_bus_assignments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  academic_year_id        UUID NOT NULL REFERENCES academic_years(id),
  route_id                UUID NOT NULL REFERENCES bus_routes(id),
  stop_id                 UUID NOT NULL REFERENCES bus_stops(id),
  direction               TEXT DEFAULT 'BOTH',    -- PICKUP | DROP | BOTH
  monthly_fee             NUMERIC(8,2),
  status                  TEXT DEFAULT 'ACTIVE',
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(neura_id, academic_year_id)
);

-- ============================================================
-- DOMAIN 6 — TIMETABLE
-- ============================================================

-- Weekly repeating base timetable
CREATE TABLE timetable_slots (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  academic_year_id        UUID NOT NULL REFERENCES academic_years(id),
  class_year              INTEGER NOT NULL,
  section                 TEXT NOT NULL,
  day_of_week             day_of_week NOT NULL,
  period_number           INTEGER NOT NULL,
  start_time              TIME NOT NULL,
  end_time                TIME NOT NULL,
  subject                 TEXT NOT NULL,
  teacher_id              UUID REFERENCES teachers(id),
  period_type             TEXT DEFAULT 'REGULAR', -- REGULAR | LUNCH | BREAK | ASSEMBLY | LIBRARY
  room_number             TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(academic_year_id, school_id, class_year, section, day_of_week, period_number)
);

-- Exceptions override the base timetable for specific dates
CREATE TABLE timetable_exceptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  exception_date          DATE NOT NULL,
  class_year              INTEGER NOT NULL,
  section                 TEXT NOT NULL,
  period_number           INTEGER NOT NULL,
  exception_type          TEXT NOT NULL,          -- SUBSTITUTE | CANCELLED | RESCHEDULED | EXAM
  original_teacher_id     UUID REFERENCES teachers(id),
  substitute_teacher_id   UUID REFERENCES teachers(id),
  subject                 TEXT,
  reason                  TEXT,
  created_by              UUID REFERENCES teachers(id),
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOMAIN 7 — ATTENDANCE
-- ============================================================

CREATE TABLE attendance (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  academic_year_id        UUID NOT NULL REFERENCES academic_years(id),
  attendance_date         DATE NOT NULL,
  status                  attendance_status NOT NULL,
  period_number           INTEGER,                -- NULL = full day, 1-8 = period-level
  reason                  TEXT,                   -- Medical | Family | Other
  marked_by               UUID NOT NULL REFERENCES teachers(id),
  marked_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Digital signature fields
  device_id               TEXT,
  signature_hash          TEXT                    -- sha256(teacher_id+class+date+period+timestamp)
);

-- Corrections preserve the original record
CREATE TABLE attendance_corrections (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_attendance_id  UUID NOT NULL REFERENCES attendance(id),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  attendance_date         DATE NOT NULL,
  original_status         attendance_status NOT NULL,
  corrected_status        attendance_status NOT NULL,
  corrected_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  correction_time         TIME,                   -- actual arrival time for late corrections
  corrected_by            UUID NOT NULL REFERENCES teachers(id),
  reason                  TEXT
);

-- ============================================================
-- DOMAIN 8 — ACADEMIC OPERATIONS
-- ============================================================

-- Exam schedule (FA1, FA2, SA1, SA2 or custom)
CREATE TABLE exam_schedules (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  academic_year_id        UUID NOT NULL REFERENCES academic_years(id),
  exam_name               TEXT NOT NULL,          -- FA1 | FA2 | SA1 | SA2 | Unit Test | Custom
  exam_type               TEXT NOT NULL,          -- FORMATIVE | SUMMATIVE | UNIT | CLASS_TEST
  class_year              INTEGER NOT NULL,
  subject                 TEXT NOT NULL,
  exam_date               DATE NOT NULL,
  total_marks             NUMERIC(5,2) NOT NULL,
  passing_marks           NUMERIC(5,2),
  duration_minutes        INTEGER,
  auto_generate_fee       BOOLEAN DEFAULT FALSE,  -- if TRUE, creates fee ledger on creation
  exam_fee_amount         NUMERIC(8,2),
  created_by              UUID REFERENCES teachers(id),
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exam_results (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_schedule_id        UUID NOT NULL REFERENCES exam_schedules(id),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  marks_obtained          NUMERIC(5,2),
  is_absent               BOOLEAN DEFAULT FALSE,
  remarks                 TEXT,
  entered_by              UUID NOT NULL REFERENCES teachers(id),
  entered_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_schedule_id, neura_id)
);

CREATE TABLE homework (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  academic_year_id        UUID NOT NULL REFERENCES academic_years(id),
  teacher_id              UUID NOT NULL REFERENCES teachers(id),
  class_year              INTEGER NOT NULL,
  section                 TEXT NOT NULL,
  subject                 TEXT NOT NULL,
  title                   TEXT NOT NULL,
  instructions            TEXT,
  homework_type           TEXT DEFAULT 'WRITTEN', -- WRITTEN | PROBLEM_SET | READING | DRAWING | PROJECT
  due_date                DATE NOT NULL,
  content_ref             TEXT,                   -- content chapter ID (MATH-10-CH3)
  has_differentiated      BOOLEAN DEFAULT FALSE,  -- if TRUE, AT_RISK students get different version
  standard_version        TEXT,                   -- instructions for standard students
  differentiated_version  TEXT,                   -- instructions for AT_RISK students (v1: manual)
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Submission tracked from SmartPad sync
CREATE TABLE homework_submissions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id             UUID NOT NULL REFERENCES homework(id),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  submitted_at            TIMESTAMPTZ,
  is_late                 BOOLEAN DEFAULT FALSE,
  submission_source       TEXT DEFAULT 'SMARTPAD', -- SMARTPAD | MANUAL
  canvas_page_ref         TEXT,                   -- SmartPad canvas page ID
  status                  TEXT DEFAULT 'PENDING', -- PENDING | SUBMITTED | GRADED
  teacher_remarks         TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(homework_id, neura_id)
);

CREATE TABLE behaviour_incidents (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  academic_year_id        UUID NOT NULL REFERENCES academic_years(id),
  incident_date           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category                behaviour_category NOT NULL,
  description             TEXT NOT NULL,
  action_taken            TEXT,
  -- VERBAL_WARNING | WRITTEN_WARNING | PARENT_INFORMED | PRINCIPAL_INFORMED | NO_ACTION
  logged_by               UUID NOT NULL REFERENCES teachers(id),

  -- Smart default: serious incidents visible to parents, minor = internal
  -- POSITIVE_RECOGNITION → TRUE, BULLYING/PROPERTY_DAMAGE → TRUE, rest → FALSE
  parent_visible          BOOLEAN NOT NULL,

  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE interventions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  logged_by               UUID NOT NULL REFERENCES teachers(id),
  intervention_type       TEXT NOT NULL,
  -- HOMEWORK | PARENT_MEETING | REMEDIAL | COUNSELLOR | SUBJECT_HELP | NOTE
  subject                 TEXT,
  notes                   TEXT,
  outcome                 TEXT,
  follow_up_date          DATE,
  logged_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Parent-teacher meeting scheduling
CREATE TABLE parent_meetings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  teacher_id              UUID NOT NULL REFERENCES teachers(id),
  scheduled_at            TIMESTAMPTZ NOT NULL,
  duration_minutes        INTEGER DEFAULT 15,
  meeting_type            TEXT DEFAULT 'PTM',     -- PTM | ONE_ON_ONE | URGENT
  agenda                  TEXT,
  status                  TEXT DEFAULT 'SCHEDULED',
  -- SCHEDULED | CONFIRMED | COMPLETED | CANCELLED
  parent_confirmed        BOOLEAN DEFAULT FALSE,
  notes_after             TEXT,                   -- post-meeting notes
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOMAIN 9 — FEE MANAGEMENT
-- ============================================================

CREATE TABLE fee_structures (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  academic_year_id        UUID NOT NULL REFERENCES academic_years(id),
  class_year              INTEGER NOT NULL,
  student_category        fee_category NOT NULL,

  -- One-time fees
  admission_fee           NUMERIC(10,2) DEFAULT 0,
  development_fee         NUMERIC(10,2) DEFAULT 0,   -- collected annually
  smartpad_fee            NUMERIC(10,2) DEFAULT 0,   -- one-time per device

  -- Monthly fees
  tuition_fee_monthly     NUMERIC(10,2) DEFAULT 0,
  neuralife_sub_monthly   NUMERIC(10,2) DEFAULT 500, -- NeuraLife subscription (fixed ₹500)

  -- Per-term fees
  exam_fee_per_term       NUMERIC(10,2) DEFAULT 0,

  -- Transport (overridden by student_bus_assignments if defined)
  transport_fee_monthly   NUMERIC(10,2) DEFAULT 0,

  -- SmartPad EMI option
  smartpad_emi_months     INTEGER DEFAULT 0,         -- 0 = no EMI, 12 = 12 monthly payments
  smartpad_emi_amount     NUMERIC(10,2),             -- monthly EMI amount

  -- Late fee config
  late_fee_amount         NUMERIC(8,2) DEFAULT 50,
  late_fee_grace_days     INTEGER DEFAULT 5,
  fee_due_day_of_month    INTEGER DEFAULT 1,

  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, academic_year_id, class_year, student_category)
);

-- Individual student fee ledger
CREATE TABLE fee_ledger (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  academic_year_id        UUID NOT NULL REFERENCES academic_years(id),
  fee_head                fee_head NOT NULL,
  period_label            TEXT,
  -- NULL for one-time, '2025-08' for monthly, '2025-SA1' for exam term
  amount_due              NUMERIC(10,2) NOT NULL,
  amount_paid             NUMERIC(10,2) DEFAULT 0,
  amount_waived           NUMERIC(10,2) DEFAULT 0,
  due_date                DATE NOT NULL,
  status                  fee_status DEFAULT 'PENDING',
  exam_schedule_id        UUID REFERENCES exam_schedules(id),
  -- populated when auto-generated from exam_schedules.auto_generate_fee = TRUE
  auto_generated          BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Concessions / scholarships (deductions with tags)
CREATE TABLE concessions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  academic_year_id        UUID NOT NULL REFERENCES academic_years(id),
  concession_type         concession_type NOT NULL,
  fee_head                fee_head,               -- NULL = applies to all fee heads
  deduction_amount        NUMERIC(10,2),          -- fixed amount OR
  deduction_percentage    NUMERIC(5,2),           -- percentage of fee head
  reason                  TEXT,
  approved_by             UUID REFERENCES teachers(id),
  approved_at             TIMESTAMPTZ,
  valid_from              DATE NOT NULL,
  valid_to                DATE,
  is_active               BOOLEAN DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Fee payments (one payment can cover multiple ledger items)
CREATE TABLE fee_payments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number          TEXT NOT NULL,
  -- Format: VHS-2526-000142 (school_short-year-sequence)
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  academic_year_id        UUID NOT NULL REFERENCES academic_years(id),
  total_amount            NUMERIC(10,2) NOT NULL,
  payment_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode            payment_mode NOT NULL,
  transaction_reference   TEXT,
  collected_by            UUID NOT NULL REFERENCES teachers(id),
  notes                   TEXT,
  voided                  BOOLEAN DEFAULT FALSE,
  voided_by               UUID REFERENCES teachers(id),
  voided_at               TIMESTAMPTZ,
  void_reason             TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(receipt_number)
);

-- Which ledger items does each payment cover
CREATE TABLE fee_payment_allocations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id              UUID NOT NULL REFERENCES fee_payments(id),
  ledger_id               UUID NOT NULL REFERENCES fee_ledger(id),
  amount_allocated        NUMERIC(10,2) NOT NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payment_id, ledger_id)
);

-- Sequence counter for receipt numbers per school per year
CREATE TABLE receipt_sequence_counters (
  school_id               TEXT NOT NULL REFERENCES schools(id),
  academic_year_label     TEXT NOT NULL,
  school_short_code       TEXT NOT NULL,          -- VHS for Vikas High School
  last_sequence           INTEGER DEFAULT 0,
  PRIMARY KEY (school_id, academic_year_label)
);

-- ============================================================
-- DOMAIN 10 — SALARY & PAYROLL
-- ============================================================

CREATE TABLE payroll_runs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  month_label             TEXT NOT NULL,          -- '2025-08'
  month_start             DATE NOT NULL,
  month_end               DATE NOT NULL,
  status                  TEXT DEFAULT 'DRAFT',
  -- DRAFT | VALIDATED | APPROVED | DISBURSED
  total_gross             NUMERIC(12,2),
  total_deductions        NUMERIC(12,2),
  total_net               NUMERIC(12,2),
  validated_by            UUID REFERENCES teachers(id),
  validated_at            TIMESTAMPTZ,
  approved_by             UUID REFERENCES teachers(id),
  approved_at             TIMESTAMPTZ,
  disbursed_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, month_label)
);

CREATE TABLE payroll_entries (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id          UUID NOT NULL REFERENCES payroll_runs(id),
  teacher_id              UUID NOT NULL REFERENCES teachers(id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  salary_structure_id     UUID NOT NULL REFERENCES salary_structures(id),

  -- Working days
  working_days_in_month   INTEGER NOT NULL,
  lop_days                NUMERIC(4,1) DEFAULT 0,
  earned_days             NUMERIC(5,1) NOT NULL,

  -- Earnings (computed and stored for payslip permanence)
  basic_earned            NUMERIC(10,2),
  hra_earned              NUMERIC(10,2),
  da_earned               NUMERIC(10,2),
  transport_allowance     NUMERIC(10,2),
  special_allowance       NUMERIC(10,2),
  gross_earned            NUMERIC(10,2) NOT NULL,

  -- Deductions
  pf_deduction            NUMERIC(10,2) DEFAULT 0,
  esi_deduction           NUMERIC(10,2) DEFAULT 0,
  pt_deduction            NUMERIC(10,2) DEFAULT 0,
  tds_deduction           NUMERIC(10,2) DEFAULT 0,
  other_deductions        NUMERIC(10,2) DEFAULT 0,
  total_deductions        NUMERIC(10,2) NOT NULL,

  net_salary              NUMERIC(10,2) NOT NULL,
  payslip_generated       BOOLEAN DEFAULT FALSE,
  payslip_url             TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payroll_run_id, teacher_id)
);

-- ============================================================
-- DOMAIN 11 — CONTENT LIBRARY
-- ============================================================

CREATE TABLE content_chapters (
  id                      TEXT PRIMARY KEY,       -- MATH-10-CH3
  subject                 TEXT NOT NULL,
  class_year              INTEGER NOT NULL,
  chapter_number          INTEGER NOT NULL,
  chapter_title           TEXT NOT NULL,
  board                   board_type NOT NULL,
  medium                  medium_type NOT NULL,
  band                    age_band NOT NULL,
  bundle_url              TEXT,                   -- Supabase Storage path to .nlc file
  bundle_size_kb          INTEGER,
  checksum_sha256         TEXT,
  bundle_version          TEXT DEFAULT '1.0.0',
  topic_count             INTEGER DEFAULT 0,
  prerequisite_chapters   TEXT[] DEFAULT '{}',
  published               BOOLEAN DEFAULT FALSE,
  audit_status            TEXT DEFAULT 'PENDING',
  -- PENDING | IN_REVIEW | APPROVED | REJECTED
  audited_by              TEXT,                   -- auditor identifier
  audited_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject, class_year, chapter_number, board, medium)
);

CREATE TABLE content_topics (
  id                      TEXT PRIMARY KEY,       -- MATH-10-CH3-T01
  chapter_id              TEXT NOT NULL REFERENCES content_chapters(id),
  topic_number            INTEGER NOT NULL,
  topic_title             TEXT NOT NULL,
  has_diagram             BOOLEAN DEFAULT FALSE,
  has_animation           BOOLEAN DEFAULT FALSE,
  has_interaction         BOOLEAN DEFAULT FALSE,
  interaction_type        TEXT,
  problem_count           INTEGER DEFAULT 0,
  error_pattern_tags      TEXT[] DEFAULT '{}',
  prerequisite_topics     TEXT[] DEFAULT '{}',
  estimated_minutes       INTEGER,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chapter_id, topic_number)
);

CREATE TABLE problem_sets (
  id                      TEXT PRIMARY KEY,       -- PS-MATH-10-QE-F-001
  chapter_id              TEXT NOT NULL REFERENCES content_chapters(id),
  topic_id                TEXT NOT NULL REFERENCES content_topics(id),
  difficulty              TEXT NOT NULL,          -- FOUNDATION | STANDARD | ADVANCED
  problems                JSONB NOT NULL,
  -- [{ q: "text", input_type: "STYLUS", target_errors: [], hints: [], solution_steps: [] }]
  target_error_patterns   TEXT[] DEFAULT '{}',
  created_by              TEXT DEFAULT 'AGENT',
  audit_status            TEXT DEFAULT 'PENDING',
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE youtube_refs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id                TEXT NOT NULL REFERENCES content_topics(id),
  medium                  medium_type NOT NULL,
  video_title             TEXT NOT NULL,
  channel_name            TEXT NOT NULL,
  youtube_url             TEXT NOT NULL,
  start_time_seconds      INTEGER DEFAULT 0,
  duration_seconds        INTEGER,
  ref_type                TEXT DEFAULT 'TOPIC',   -- TOPIC | CHAPTER
  curated_by              TEXT NOT NULL,
  is_approved             BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(topic_id, medium, ref_type)
);

-- ============================================================
-- DOMAIN 12 — EDGE AI SYNC DATA
-- ============================================================

CREATE TABLE student_sessions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL,
  smartpad_id             TEXT NOT NULL,
  session_date            DATE NOT NULL,
  started_at              TIMESTAMPTZ NOT NULL,
  ended_at                TIMESTAMPTZ,
  subject                 TEXT,
  content_ref             TEXT,                   -- chapter ID being studied
  total_words_written     INTEGER DEFAULT 0,
  hint_requests           INTEGER DEFAULT 0,
  hint_was_helpful        BOOLEAN,
  authenticity_weight     NUMERIC(3,2) DEFAULT 1.00,
  gaming_score            NUMERIC(3,2) DEFAULT 0.00,
  copying_score           NUMERIC(3,2) DEFAULT 0.00,
  hwr_model_version       TEXT,
  gap_model_version       TEXT,
  synced_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Daily aggregate mastery per topic (UPSERT on sync)
CREATE TABLE mastery_snapshots (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL,
  snapshot_date           DATE NOT NULL,
  subject                 TEXT NOT NULL,
  topic                   TEXT NOT NULL,
  raw_score               NUMERIC(4,3) NOT NULL,  -- 0.000 to 1.000
  error_patterns          TEXT[] DEFAULT '{}',
  hesitation_count        INTEGER DEFAULT 0,
  hint_dependency_rate    NUMERIC(4,3) DEFAULT 0.000,
  session_count           INTEGER DEFAULT 1,       -- sessions contributing today
  authenticity_weight     NUMERIC(3,2) DEFAULT 1.00,
  edge_model_version      TEXT,
  synced_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(neura_id, snapshot_date, subject, topic)
);

-- Monthly writing skill aggregates (WSS-1 output — v2)
CREATE TABLE writing_skill_snapshots (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL,
  month_label             TEXT NOT NULL,          -- '2025-09'
  clarity_score_avg       NUMERIC(5,2),           -- 0-100
  writing_speed_wpm_avg   NUMERIC(5,2),
  spelling_accuracy_pct   NUMERIC(5,2),
  sentence_formation      TEXT,                   -- DEVELOPING | PROFICIENT | ADVANCED
  active_writing_days     INTEGER,
  total_session_minutes   INTEGER,
  wss_model_version       TEXT,
  synced_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(neura_id, month_label)
);

-- Daily study habit signals (SHE-1 output — v2)
CREATE TABLE study_habit_records (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL,
  record_date             DATE NOT NULL,
  focus_score             NUMERIC(3,2),           -- 0.00 to 1.00
  session_start_time      TIME,
  session_duration_minutes INTEGER,
  start_time_consistency  NUMERIC(3,2),
  pause_count             INTEGER,
  distraction_flags       TEXT[] DEFAULT '{}',
  habit_trend             TEXT,                   -- IMPROVING | STABLE | DECLINING
  she_model_version       TEXT,
  synced_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(neura_id, record_date)
);

-- OCR fallback batches sent to Cloud Vision for model training
CREATE TABLE ocr_fallback_batches (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id              UUID REFERENCES student_sessions(id),
  school_id               TEXT NOT NULL,
  on_device_text          TEXT,                   -- what HWR-1 thought it was
  on_device_confidence    NUMERIC(3,2) NOT NULL,
  cloud_vision_result     TEXT,
  is_agreement            BOOLEAN,
  subject_context         TEXT,
  stroke_hash             TEXT,
  processed_at            TIMESTAMPTZ,
  became_training_pair    BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOMAIN 13 — CLOUD AI OUTPUT
-- ============================================================

CREATE TABLE calibration_baselines (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject                 TEXT NOT NULL,
  topic                   TEXT NOT NULL,
  class_year              INTEGER NOT NULL,
  board                   board_type NOT NULL,
  computed_at             TIMESTAMPTZ NOT NULL,
  sample_size             INTEGER NOT NULL,
  mean_raw_score          NUMERIC(4,3) NOT NULL,
  std_dev                 NUMERIC(4,3) NOT NULL,
  p25                     NUMERIC(4,3),
  p50                     NUMERIC(4,3),
  p75                     NUMERIC(4,3),
  p90                     NUMERIC(4,3),
  at_risk_threshold       NUMERIC(4,3),           -- below this = AT_RISK
  mastered_threshold      NUMERIC(4,3),           -- above this = MASTERED
  UNIQUE(subject, topic, class_year, board, computed_at)
);

CREATE TABLE calibrated_mastery_scores (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL,
  computed_date           DATE NOT NULL,
  subject                 TEXT NOT NULL,
  topic                   TEXT NOT NULL,
  raw_score               NUMERIC(4,3) NOT NULL,
  calibrated_percentile   INTEGER CHECK (calibrated_percentile BETWEEN 0 AND 100),
  classification          mastery_classification NOT NULL,
  vs_class_avg            NUMERIC(5,3),
  vs_school_avg           NUMERIC(5,3),
  population_sample_size  INTEGER,
  calibration_version     TEXT,
  UNIQUE(neura_id, computed_date, subject, topic)
);

CREATE TABLE student_insights (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL,
  generated_date          DATE NOT NULL,
  insight_type            TEXT NOT NULL,
  -- DAILY | WEEKLY | MONTHLY | POST_EXAM | MILESTONE | AT_RISK
  language                medium_type NOT NULL,
  subject                 TEXT,                   -- NULL for multi-subject insights
  summary_text            TEXT NOT NULL,
  conversation_starter    TEXT,                   -- "Tonight ask {name}: ..."
  action_items            TEXT[] DEFAULT '{}',
  severity                TEXT DEFAULT 'INFO',    -- INFO | WARNING | CRITICAL
  sent_to_parent          BOOLEAN DEFAULT FALSE,
  sent_to_teacher         BOOLEAN DEFAULT FALSE,
  notification_pending    BOOLEAN DEFAULT TRUE,
  claude_model_version    TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE content_recommendations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL,
  recommended_at          TIMESTAMPTZ DEFAULT NOW(),
  subject                 TEXT NOT NULL,
  topic                   TEXT NOT NULL,
  reason                  TEXT NOT NULL,
  -- AT_RISK_REMEDIAL | PREREQUISITE_GAP | REVISION | NEXT_TOPIC | TEACHER_PUSH
  chapter_ids             TEXT[] DEFAULT '{}',
  problem_set_ids         TEXT[] DEFAULT '{}',
  pushed_to_device        BOOLEAN DEFAULT FALSE,
  pushed_at               TIMESTAMPTZ,
  started_at              TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ
);

CREATE TABLE curriculum_patterns (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id               TEXT,                   -- NULL = cross-school pattern
  detected_at             TIMESTAMPTZ DEFAULT NOW(),
  pattern_type            pattern_type NOT NULL,
  subject                 TEXT NOT NULL,
  topic                   TEXT NOT NULL,
  class_year              INTEGER,
  board                   board_type,
  failure_rate            NUMERIC(4,3) NOT NULL,
  affected_students       INTEGER,
  affected_schools        INTEGER,
  top_error_patterns      TEXT[] DEFAULT '{}',
  ai_recommendation       TEXT,
  severity                TEXT DEFAULT 'MEDIUM',  -- LOW | MEDIUM | HIGH
  status                  TEXT DEFAULT 'OPEN',    -- OPEN | ACKNOWLEDGED | RESOLVED
  acknowledged_by         UUID REFERENCES teachers(id),
  acknowledged_at         TIMESTAMPTZ,
  resolution_note         TEXT
);

-- ============================================================
-- DOMAIN 14 — DEVICE MANAGEMENT
-- ============================================================

CREATE TABLE smartpad_devices (
  id                      TEXT PRIMARY KEY,       -- PAD-0042
  school_id               TEXT NOT NULL REFERENCES schools(id),
  serial_number           TEXT UNIQUE NOT NULL,
  assigned_neura_id       TEXT UNIQUE REFERENCES students(neura_id),
  -- UNIQUE enforces strict 1:1 assignment
  assigned_at             DATE,
  academic_year_id        UUID REFERENCES academic_years(id),
  os_version              TEXT,
  kiosk_app_version       TEXT,
  model_versions          JSONB DEFAULT '{}',
  -- { "HWR-1-S": "1.4.2", "GAP-1": "1.2.0" }
  battery_pct             INTEGER,
  is_charging             BOOLEAN,
  storage_used_mb         INTEGER,
  storage_total_mb        INTEGER DEFAULT 32768,
  gps_lat                 NUMERIC(10,7),
  gps_lng                 NUMERIC(10,7),
  last_gps_at             TIMESTAMPTZ,
  last_sync_at            TIMESTAMPTZ,
  last_seen_at            TIMESTAMPTZ,
  status                  device_status DEFAULT 'ACTIVE',
  locked                  BOOLEAN DEFAULT FALSE,
  loss_reported           BOOLEAN DEFAULT FALSE,
  loss_reported_at        TIMESTAMPTZ,
  exam_lock_active        BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- History of SmartPad assignments (1:1 per year, can reassign next year)
CREATE TABLE smartpad_assignment_history (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smartpad_id             TEXT NOT NULL REFERENCES smartpad_devices(id),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  academic_year_id        UUID NOT NULL REFERENCES academic_years(id),
  assigned_at             DATE NOT NULL,
  returned_at             DATE,
  return_condition        TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE model_versions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type              TEXT NOT NULL,          -- HWR-1-S | HWR-1-E | HWR-1-F | GAP-1 | WSS-1 | SHE-1
  version                 TEXT NOT NULL,
  file_url                TEXT NOT NULL,
  checksum_sha256         TEXT NOT NULL,
  file_size_mb            NUMERIC(6,2),
  min_os_version          TEXT,
  min_app_version         TEXT,
  target_band             age_band,               -- NULL = all bands
  changelog               TEXT,
  trained_on_samples      INTEGER,
  published_at            TIMESTAMPTZ DEFAULT NOW(),
  is_active               BOOLEAN DEFAULT TRUE,
  UNIQUE(model_type, version)
);

CREATE TABLE ota_update_log (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smartpad_id             TEXT NOT NULL REFERENCES smartpad_devices(id),
  model_type              TEXT NOT NULL,
  from_version            TEXT,
  to_version              TEXT NOT NULL,
  status                  TEXT NOT NULL,          -- PENDING | DOWNLOADING | INSTALLED | FAILED | ROLLED_BACK
  initiated_at            TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,
  error_message           TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOMAIN 15 — NEURASPHERE
-- ============================================================

CREATE TABLE neurasphere_posts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  post_type               post_type NOT NULL,
  content_text            TEXT NOT NULL CHECK (LENGTH(content_text) <= 300),
  image_url               TEXT,
  tags                    TEXT[] DEFAULT '{}',
  badge_id                UUID,                   -- if ACHIEVEMENT post
  source                  TEXT DEFAULT 'MOBILE',  -- MOBILE | SMARTPAD
  moderation_status       moderation_status DEFAULT 'PENDING',
  moderation_confidence   NUMERIC(3,2),
  moderation_reason       TEXT,
  published_at            TIMESTAMPTZ,
  parent_visible          BOOLEAN DEFAULT TRUE,
  deleted_at              TIMESTAMPTZ,            -- soft delete
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE post_reactions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id                 UUID NOT NULL REFERENCES neurasphere_posts(id),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  reaction_type           TEXT NOT NULL,          -- LIKE | CELEBRATE | HELPFUL
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, neura_id, reaction_type)
);

CREATE TABLE post_comments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id                 UUID NOT NULL REFERENCES neurasphere_posts(id),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  comment_text            TEXT NOT NULL CHECK (LENGTH(comment_text) <= 150),
  moderation_status       moderation_status DEFAULT 'PENDING',
  published_at            TIMESTAMPTZ,
  deleted_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE learning_circles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  description             TEXT,
  subject_tag             TEXT,
  created_by              TEXT NOT NULL REFERENCES students(neura_id),
  member_count            INTEGER DEFAULT 1,
  is_public               BOOLEAN DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE circle_memberships (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id               UUID NOT NULL REFERENCES learning_circles(id),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  status                  TEXT DEFAULT 'ACTIVE',  -- PENDING | ACTIVE | REMOVED
  joined_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(circle_id, neura_id)
);

-- Cross-student connections (Learning Circle follow system)
CREATE TABLE student_connections (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_neura_id      TEXT NOT NULL REFERENCES students(neura_id),
  target_neura_id         TEXT NOT NULL REFERENCES students(neura_id),
  status                  TEXT DEFAULT 'PENDING', -- PENDING | ACCEPTED | REJECTED | BLOCKED
  connection_type         TEXT DEFAULT 'SAME_SCHOOL',
  -- SAME_SCHOOL | INTER_SCHOOL
  parent_notified         BOOLEAN DEFAULT FALSE,
  requested_at            TIMESTAMPTZ DEFAULT NOW(),
  responded_at            TIMESTAMPTZ,
  UNIQUE(requester_neura_id, target_neura_id)
);

CREATE TABLE badges (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  badge_type              TEXT NOT NULL,
  badge_name              TEXT NOT NULL,
  badge_description       TEXT,
  subject                 TEXT,
  earned_at               TIMESTAMPTZ DEFAULT NOW(),
  academic_year_id        UUID REFERENCES academic_years(id),
  model_version           TEXT,
  pinned_on_profile       BOOLEAN DEFAULT FALSE,
  pin_position            INTEGER CHECK (pin_position IN (1,2,3)),
  auto_posted_to_sphere   BOOLEAN DEFAULT FALSE,
  sphere_post_id          UUID REFERENCES neurasphere_posts(id),
  visible_band_minimum    age_band DEFAULT 'MIDDLE'
);

-- ============================================================
-- DOMAIN 16 — NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id               TEXT NOT NULL,
  recipient_type          user_role NOT NULL,
  recipient_id            UUID NOT NULL,
  channel                 notification_channel NOT NULL,
  category                TEXT NOT NULL,
  -- ACADEMIC | ATTENDANCE | HOMEWORK | DEVICE | ADMIN | SOCIAL | SYSTEM
  severity                notification_severity NOT NULL,
  title                   TEXT NOT NULL,
  body                    TEXT NOT NULL,
  language                medium_type DEFAULT 'ENGLISH',
  action_type             TEXT,                   -- deep link action
  action_payload          JSONB,
  related_neura_id        TEXT,
  status                  notification_status DEFAULT 'PENDING',
  sent_at                 TIMESTAMPTZ,
  delivered_at            TIMESTAMPTZ,
  read_at                 TIMESTAMPTZ,
  failure_reason          TEXT,
  retry_count             INTEGER DEFAULT 0,
  hold_until              TIMESTAMPTZ,            -- quiet hours hold
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fcm_tokens (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL,
  user_type               user_role NOT NULL,
  token                   TEXT NOT NULL UNIQUE,
  device_platform         TEXT DEFAULT 'ANDROID',
  app_version             TEXT,
  registered_at           TIMESTAMPTZ DEFAULT NOW(),
  last_used_at            TIMESTAMPTZ,
  is_active               BOOLEAN DEFAULT TRUE
);

CREATE TABLE notification_preferences (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL,
  user_type               user_role NOT NULL,
  language                medium_type DEFAULT 'ENGLISH',
  academic_push           BOOLEAN DEFAULT TRUE,
  homework_push           BOOLEAN DEFAULT TRUE,
  social_push             BOOLEAN DEFAULT TRUE,
  device_push             BOOLEAN DEFAULT TRUE,
  admin_push              BOOLEAN DEFAULT TRUE,
  sms_enabled             BOOLEAN DEFAULT TRUE,
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, user_type)
);

CREATE TABLE notification_dedup (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedup_key               TEXT NOT NULL UNIQUE,
  -- Format: {category}:{recipient_id}:{related_entity}:{week_or_day}
  notification_id         UUID REFERENCES notifications(id),
  expires_at              TIMESTAMPTZ NOT NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Teacher ↔ Parent message threads
CREATE TABLE message_threads (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  teacher_id              UUID NOT NULL REFERENCES teachers(id),
  parent_mobile           TEXT NOT NULL,
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  initiated_by            user_role NOT NULL,
  class_teacher_visible   BOOLEAN DEFAULT TRUE,
  principal_visible       BOOLEAN DEFAULT TRUE,
  last_message_at         TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, neura_id)
);

CREATE TABLE messages (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id               UUID NOT NULL REFERENCES message_threads(id),
  sender_type             user_role NOT NULL,     -- TEACHER | PARENT
  sender_id               TEXT NOT NULL,          -- teacher UUID or parent mobile
  message_text            TEXT NOT NULL CHECK (LENGTH(message_text) <= 500),
  sent_at                 TIMESTAMPTZ DEFAULT NOW(),
  read_at                 TIMESTAMPTZ,
  sms_fallback_sent       BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- DOMAIN 17 — COMPLIANCE & AUDIT
-- ============================================================

CREATE TABLE consent_records (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  consent_type            TEXT NOT NULL,
  -- ENROLLMENT_PRINCIPAL | PARENT_FIRST_LOGIN | DATA_PROCESSING
  consented_by_role       user_role NOT NULL,
  consented_by_id         UUID,
  consented_by_mobile     TEXT,                   -- for parent consent
  school_id               TEXT NOT NULL,
  consent_text_version    TEXT NOT NULL,
  consented_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address_hash         TEXT,
  withdrawn_at            TIMESTAMPTZ,
  withdrawal_reason       TEXT
);

CREATE TABLE deletion_requests (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id                TEXT NOT NULL REFERENCES students(neura_id),
  requested_by_mobile     TEXT NOT NULL,
  reference_code          TEXT NOT NULL UNIQUE,   -- DEL-00421
  status                  TEXT DEFAULT 'PENDING',
  -- PENDING | CANCELLATION_WINDOW | EXECUTING | COMPLETED | CANCELLED
  requested_at            TIMESTAMPTZ DEFAULT NOW(),
  cancellation_deadline   TIMESTAMPTZ,            -- +7 days
  execution_deadline      TIMESTAMPTZ,            -- +30 days
  cancelled_at            TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,
  completion_confirmed_at TIMESTAMPTZ
);

CREATE TABLE audit_log (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type              TEXT NOT NULL,
  actor_id                UUID,
  actor_role              user_role,
  actor_mobile            TEXT,
  school_id               TEXT,
  target_neura_id         TEXT,
  target_table            TEXT,
  target_id               TEXT,
  action_detail           JSONB,
  ip_address_hash         TEXT,
  result                  TEXT NOT NULL,          -- SUCCESS | FAILURE | BLOCKED
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE otp_requests (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile                  TEXT NOT NULL,
  otp_hash                TEXT NOT NULL,          -- SHA-256 of OTP, never plain
  attempt_count           INTEGER DEFAULT 0,
  max_attempts            INTEGER DEFAULT 5,
  expires_at              TIMESTAMPTZ NOT NULL,   -- +10 minutes
  verified_at             TIMESTAMPTZ,
  locked_until            TIMESTAMPTZ,            -- set after max attempts
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES — critical for performance
-- ============================================================

-- Students
CREATE INDEX idx_students_status ON students(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_students_name ON students USING GIN (full_name gin_trgm_ops);

-- Enrollments
CREATE INDEX idx_enrollments_school ON school_enrollments(school_id, status);
CREATE INDEX idx_yearly_progress_school_year ON student_yearly_progress(school_id, academic_year_id);
CREATE INDEX idx_yearly_progress_class ON student_yearly_progress(school_id, academic_year_id, class_year, section);

-- Attendance
CREATE INDEX idx_attendance_date ON attendance(school_id, attendance_date);
CREATE INDEX idx_attendance_student_date ON attendance(neura_id, attendance_date);
-- Unique per student per day per period (NULL period = full-day, treated as -1 for uniqueness)
CREATE UNIQUE INDEX idx_attendance_unique_period
  ON attendance(neura_id, attendance_date, COALESCE(period_number, -1));

-- Mastery snapshots (most queried table)
CREATE INDEX idx_mastery_student ON mastery_snapshots(neura_id, snapshot_date DESC);
CREATE INDEX idx_mastery_school_date ON mastery_snapshots(school_id, snapshot_date DESC);
CREATE INDEX idx_mastery_topic ON mastery_snapshots(subject, topic, snapshot_date DESC);

-- Calibrated scores
CREATE INDEX idx_calibrated_student ON calibrated_mastery_scores(neura_id, computed_date DESC);
CREATE INDEX idx_calibrated_date ON calibrated_mastery_scores(school_id, computed_date DESC);

-- Insights
CREATE INDEX idx_insights_pending ON student_insights(notification_pending) WHERE notification_pending = TRUE;
CREATE INDEX idx_insights_student ON student_insights(neura_id, generated_date DESC);

-- Fee ledger
CREATE INDEX idx_fee_ledger_student ON fee_ledger(neura_id, academic_year_id);
CREATE INDEX idx_fee_ledger_status ON fee_ledger(school_id, status, due_date);
CREATE INDEX idx_fee_ledger_overdue ON fee_ledger(school_id, due_date) WHERE status = 'PENDING';

-- Notifications
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, status);
CREATE INDEX idx_notifications_pending ON notifications(status, hold_until) WHERE status = 'PENDING';
CREATE INDEX idx_notifications_school ON notifications(school_id, created_at DESC);

-- NeuraSphere
CREATE INDEX idx_posts_school ON neurasphere_posts(school_id, published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_student ON neurasphere_posts(neura_id, created_at DESC);
CREATE INDEX idx_posts_moderation ON neurasphere_posts(moderation_status) WHERE moderation_status = 'PENDING';

-- Sessions
CREATE INDEX idx_sessions_student_date ON student_sessions(neura_id, session_date DESC);
CREATE INDEX idx_sessions_smartpad ON student_sessions(smartpad_id, session_date DESC);

-- SmartPads
CREATE INDEX idx_pads_school ON smartpad_devices(school_id, status);
CREATE INDEX idx_pads_last_sync ON smartpad_devices(school_id, last_sync_at);

-- Audit
CREATE INDEX idx_audit_school ON audit_log(school_id, created_at DESC);
CREATE INDEX idx_audit_neura ON audit_log(target_neura_id, created_at DESC);

-- Teacher assignments
CREATE INDEX idx_teacher_assignments_school ON teacher_school_assignments(school_id, academic_year_id, status);
CREATE INDEX idx_subject_assignments_class ON teacher_subject_assignments(school_id, academic_year_id, class_year, section);

-- Timetable
CREATE INDEX idx_timetable_class ON timetable_slots(school_id, academic_year_id, class_year, section);
CREATE INDEX idx_timetable_teacher ON timetable_slots(teacher_id);
CREATE INDEX idx_exceptions_date ON timetable_exceptions(school_id, exception_date);

-- OTP (fast expiry lookups)
CREATE INDEX idx_otp_mobile ON otp_requests(mobile, expires_at) WHERE verified_at IS NULL;

-- ============================================================
-- SOFT DELETE — tables that get deleted_at
-- ============================================================
-- students                ✅ (DPDP: deleted_at set, then PII nulled)
-- teachers                ✅
-- schools                 ✅
-- neurasphere_posts       ✅
-- post_comments           ✅
-- (all other tables: hard delete or status field for deactivation)

-- ============================================================
-- TABLE COUNT SUMMARY
-- ============================================================
-- Domain 1:  Schools (3 tables)
-- Domain 2:  Academic Years (2 tables)
-- Domain 3:  Teachers (6 tables)
-- Domain 4:  Students (7 tables)
-- Domain 5:  Transport (3 tables)
-- Domain 6:  Timetable (2 tables)
-- Domain 7:  Attendance (2 tables)
-- Domain 8:  Academic Operations (7 tables)
-- Domain 9:  Fee Management (5 tables)
-- Domain 10: Salary & Payroll (2 tables)
-- Domain 11: Content Library (4 tables)
-- Domain 12: Edge AI Sync (4 tables)
-- Domain 13: Cloud AI Output (5 tables)
-- Domain 14: Device Management (4 tables)
-- Domain 15: NeuraSphere (7 tables)
-- Domain 16: Notifications (7 tables)
-- Domain 17: Compliance & Audit (4 tables)
-- ============================================================
-- TOTAL: 74 tables
-- ============================================================