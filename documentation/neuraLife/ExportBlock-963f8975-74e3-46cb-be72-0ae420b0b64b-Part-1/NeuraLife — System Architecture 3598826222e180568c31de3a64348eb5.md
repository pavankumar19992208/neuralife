# NeuraLife — System Architecture

*The complete technical map of every service, data flow, API contract, database schema, auth model, real-time strategy, and infrastructure decision that connects all components of the NeuraLife platform.*

---

## 1. What This Document Is

This is the single authoritative reference for how NeuraLife works as an engineering system. Every other spec document (Admin Console, Teacher App, Edge AI, etc.) describes what a component does. This document describes how all components are wired together.

**Audience:** Technical co-founder reading on day one. Investor's CTO during due diligence. First engineer you hire.

**Scope:** Full v1 + v2 architecture. v3 additions are noted where relevant but not fully specified.

---

## 2. Platform Philosophy

NeuraLife is a **closed-loop learning infrastructure platform** — not a school management app. The distinction matters architecturally:

- A school app is a tool schools use. Data lives inside the school.
- An infrastructure platform is a layer schools plug into. Data lives on the platform, persists across schools, and compounds in value as more schools join.

Every architectural decision flows from this:

| Decision | Because we are infrastructure, not an app |
| --- | --- |
| Single shared database, `school_id` scoped | Cross-school calibration requires all data queryable together |
| NeuraID persists across school transfers | Student identity belongs to the student, not the school |
| Edge AI sends signals, not raw data | Platform owns the intelligence, not the device |
| Offline-first SmartPad design | Schools in AP/TS have unreliable WiFi — the product cannot depend on connectivity |
| Claude API for language generation | Insight quality in Telugu + English cannot be templated — it requires LLM |

---

## 3. Full Service Map

Every process that runs in the NeuraLife ecosystem:

### Core Backend Services

| Service | Runtime | Primary Responsibility | Host (v1) | Host (v2) |
| --- | --- | --- | --- | --- |
| **API Gateway** | Node.js 20 + TypeScript + Fastify | Auth, routing, business logic, WebSocket hub, OTA dispatch | Railway | Railway (scaled) |
| **ML Microservice** | Python 3.11 + FastAPI | 5 AI pipelines: Calibration, Insights, Recommendations, Curriculum Patterns, Model Training | Railway | Modal.com (GPU) |
| **OTA Update Server** | Node.js (part of API Gateway, separate route group) | Push model binaries + OS patches to SmartPads | Railway | Railway |
| **Job Scheduler** | node-cron (v1), BullMQ (v2) | Trigger nightly/weekly/monthly ML pipeline runs | In-process v1 | Redis + BullMQ v2 |

### Data Services

| Service | Technology | Responsibility | Host |
| --- | --- | --- | --- |
| **Primary Database** | PostgreSQL 15 via Supabase | All persistent platform data | Supabase |
| **Auth Service** | Supabase Auth (GoTrue) | OTP-based auth, JWT issuance, session management | Supabase |
| **Realtime Engine** | Supabase Realtime (Phoenix Channels) | Teacher app live updates, principal dashboard refresh | Supabase |
| **File Storage** | Supabase Storage (S3-compatible) | Textbook SVGs, animated content, model binaries, OTA packages | Supabase |

### Client Applications

| Application | Runtime | Primary Users | Delivery |
| --- | --- | --- | --- |
| **Web Admin Console** | React 18 + Vite + Tailwind + shadcn/ui | School Principal, Super Admin | Vercel |
| **Teacher Mobile App** | React Native 0.74, Android-first | Subject Teacher, Class Teacher | APK (v1), Play Store (v2) |
| **Parent & Student App** | React Native 0.74, Android-first | Parent, Student (Class 7–12) | APK (v1), Play Store (v2) |
| **SmartPad App** | Kotlin + Jetpack Compose + TFLite | Student on NeuraOS device | Pre-installed on NeuraOS |

### Device Layer

| Component | Technology | Responsibility |
| --- | --- | --- |
| **NeuraOS** | AOSP 13 (Android fork) | Locked educational OS on SmartPad |
| **Edge AI Engine** | Kotlin + TFLite runtime | On-device inference: HWR-1, GAP-1, WSS-1, SHE-1 |
| **Sync Agent** | Kotlin service (foreground) | Queue session deltas, upload on WiFi, download content + OTA |
| **Local Database** | SQLite (Room ORM) | Offline mastery map, session queue, cached content |

### Third-Party Services

| Service | Provider | Purpose | Trigger |
| --- | --- | --- | --- |
| **Push Notifications** | Firebase Cloud Messaging | Teacher alerts, parent notifications | AT_RISK flag, homework, meeting |
| **SMS Gateway** | MSG91 (India) | OTP delivery, parent fee alerts, enrollment confirmation | Auth, fee events, enrollment |
| **Email** | Resend.com | Staff credentials, admin reports | Account creation, monthly reports |
| **Cloud OCR Fallback** | Google Cloud Vision API | HWR-1 accuracy flywheel (low-confidence stroke recheck) | On sync, confidence < 0.75 |
| **Claude API** | Anthropic | Insight generation (Telugu + English), NeuraSphere moderation | Nightly insight run, post submission |
| **YouTube** | Google (embed API) | Referenced video explanations in content layer | Student opens content chapter |

---

## 4. Architecture Diagram

```
╔══════════════════════════════════════════════════════════════════════════╗
║                        NeuraLife Platform                               ║
║                                                                          ║
║  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     ║
║  │  Web Admin      │    │  Teacher        │    │  Parent &       │     ║
║  │  Console        │    │  Mobile App     │    │  Student App    │     ║
║  │  (React 18)     │    │  (React Native) │    │  (React Native) │     ║
║  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘     ║
║           │                      │                       │              ║
║           └──────────────────────┼───────────────────────┘              ║
║                                  │ HTTPS + WebSocket                    ║
║                                  ▼                                       ║
║           ┌──────────────────────────────────────────────┐             ║
║           │           API Gateway (Node.js + Fastify)     │             ║
║           │  • JWT auth middleware                         │             ║
║           │  • Role-based route guards                     │             ║
║           │  • WebSocket hub (Supabase Realtime bridge)   │             ║
║           │  • OTA dispatch routes                         │             ║
║           │  • Job scheduler (node-cron → BullMQ v2)      │             ║
║           └───────────┬──────────────────────┬────────────┘             ║
║                       │                      │                           ║
║            ┌──────────▼──────┐    ┌──────────▼──────────┐              ║
║            │   Supabase      │    │  ML Microservice     │              ║
║            │   PostgreSQL    │◄───│  (Python + FastAPI)  │              ║
║            │   + Auth        │    │                       │              ║
║            │   + Realtime    │    │  Pipeline 1: Calibrate│              ║
║            │   + Storage     │    │  Pipeline 2: Insights │              ║
║            └────────▲────────┘    │  Pipeline 3: Reco     │              ║
║                     │             │  Pipeline 4: Patterns │              ║
║              WiFi sync            │  Pipeline 5: Training │              ║
║                     │             └──────────┬────────────┘              ║
║           ┌─────────┴──────────┐             │ Claude API               ║
║           │  SmartPad          │             │ (Insights + Moderation)  ║
║           │  (NeuraOS AOSP 13) │             ▼                           ║
║           │                    │   ┌──────────────────────┐             ║
║           │  Edge AI Engine    │   │   Anthropic Claude   │             ║
║           │  HWR-1 (OCR)       │   │   API                │             ║
║           │  GAP-1 (Gaps)      │   └──────────────────────┘             ║
║           │  WSS-1 (Writing)   │                                         ║
║           │  SHE-1 (Habits)    │   ┌──────────────────────┐             ║
║           │                    │   │  Third-Party          │             ║
║           │  SQLite (offline)  │   │  FCM, MSG91, Resend   │             ║
║           │  Sync Agent        │   │  Google Vision API    │             ║
║           └────────────────────┘   └──────────────────────┘             ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 5. Database Architecture

### Design Decision: Single Database, `school_id` on Every Table

All schools share one PostgreSQL database. Every table that contains school-specific data carries a `school_id` foreign key. Supabase Row-Level Security (RLS) enforces that a school's users can only read/write their own school's rows.

**Why this is correct for NeuraLife:**

- The Mastery Calibration Engine must query mastery scores across all schools in a single SQL query. Separate schemas make this impossible or extremely slow.
- One migration file updates all schools simultaneously.
- Supabase RLS is purpose-built for this pattern. The policy `WHERE school_id = auth.jwt()->>'school_id'` enforces isolation at the database layer — no application-layer enforcement required.
- At 500+ schools and 500k+ students, evaluate sharding by state (AP vs TS). Not before.

### Schema — Core Tables

```sql
-- ════════════════════════════════════════
-- IDENTITY & ENROLLMENT
-- ════════════════════════════════════════

CREATE TABLE schools (
  id              TEXT PRIMARY KEY,              -- SCH-AP-00142
  name            TEXT NOT NULL,
  district        TEXT NOT NULL,
  mandal          TEXT,
  state           TEXT NOT NULL,                 -- AP | TS
  board           TEXT NOT NULL,                 -- AP_STATE | TS_STATE | CBSE | ICSE
  medium          TEXT NOT NULL,                 -- ENGLISH | TELUGU | BOTH
  school_type     TEXT NOT NULL,                 -- GOVERNMENT | PRIVATE | AIDED
  principal_name  TEXT NOT NULL,
  principal_mobile TEXT NOT NULL,
  status          TEXT DEFAULT 'ACTIVE',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id        TEXT UNIQUE NOT NULL,          -- NID-2025-AP-084291
  full_name       TEXT NOT NULL,
  date_of_birth   DATE NOT NULL,
  gender          TEXT,
  aadhaar_hash    TEXT UNIQUE,                   -- SHA-256, client-side hashed
  parent_mobile   TEXT NOT NULL,
  status          TEXT DEFAULT 'ACTIVE',         -- ACTIVE | ALUMNI | DEACTIVATED
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE school_enrollments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id        TEXT REFERENCES students(neura_id),
  school_id       TEXT REFERENCES schools(id),
  class_year      INTEGER NOT NULL,              -- 1 through 12
  section         TEXT NOT NULL,                 -- A, B, C
  medium          TEXT NOT NULL,
  enrolled_at     DATE NOT NULL,
  exited_at       DATE,
  exit_reason     TEXT,                          -- TRANSFER | GRADUATION | DROPOUT
  status          TEXT DEFAULT 'ACTIVE',
  smartpad_id     TEXT,                          -- assigned device
  UNIQUE(neura_id, school_id, class_year)
);

CREATE TABLE teachers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       TEXT REFERENCES schools(id),
  full_name       TEXT NOT NULL,
  mobile          TEXT NOT NULL,
  employee_id     TEXT,
  designation     TEXT,                          -- SUBJECT_TEACHER | CLASS_TEACHER | HOD | VP
  subjects        TEXT[],                        -- ['MATHEMATICS', 'SCIENCE']
  status          TEXT DEFAULT 'ACTIVE',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE class_teacher_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      UUID REFERENCES teachers(id),
  school_id       TEXT REFERENCES schools(id),
  class_year      INTEGER NOT NULL,
  section         TEXT NOT NULL,
  academic_year   TEXT NOT NULL,                 -- '2025-26'
  role            TEXT NOT NULL                  -- SUBJECT_TEACHER | CLASS_TEACHER
);

-- ════════════════════════════════════════
-- ACADEMIC STRUCTURE
-- ════════════════════════════════════════

CREATE TABLE timetable_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       TEXT REFERENCES schools(id),
  class_year      INTEGER NOT NULL,
  section         TEXT NOT NULL,
  day_of_week     INTEGER NOT NULL,              -- 1 (Mon) to 6 (Sat)
  period_number   INTEGER NOT NULL,
  subject         TEXT NOT NULL,
  teacher_id      UUID REFERENCES teachers(id),
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL
);

CREATE TABLE homework (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       TEXT REFERENCES schools(id),
  teacher_id      UUID REFERENCES teachers(id),
  class_year      INTEGER NOT NULL,
  section         TEXT NOT NULL,
  subject         TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  content_refs    JSONB,                         -- { chapters: [], problem_ids: [] }
  due_date        DATE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       TEXT REFERENCES schools(id),
  neura_id        TEXT REFERENCES students(neura_id),
  date            DATE NOT NULL,
  status          TEXT NOT NULL,                 -- PRESENT | ABSENT | LATE | EXCUSED
  marked_by       UUID REFERENCES teachers(id),
  marked_at       TIMESTAMPTZ,
  UNIQUE(school_id, neura_id, date)
);

CREATE TABLE exam_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       TEXT REFERENCES schools(id),
  neura_id        TEXT REFERENCES students(neura_id),
  exam_name       TEXT NOT NULL,
  academic_year   TEXT NOT NULL,
  class_year      INTEGER NOT NULL,
  subject         TEXT NOT NULL,
  marks_obtained  NUMERIC,
  total_marks     NUMERIC,
  exam_date       DATE,
  entered_by      UUID REFERENCES teachers(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════
-- EDGE AI SYNC DATA
-- ════════════════════════════════════════

CREATE TABLE student_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id        TEXT REFERENCES students(neura_id),
  school_id       TEXT NOT NULL,
  smartpad_id     TEXT NOT NULL,
  session_date    DATE NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ NOT NULL,
  subject         TEXT,
  content_ref     TEXT,                          -- which chapter/problem was active
  total_words_written INTEGER,
  hint_requests   INTEGER DEFAULT 0,
  synced_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mastery_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id        TEXT REFERENCES students(neura_id),
  school_id       TEXT NOT NULL,
  snapshot_date   DATE NOT NULL,
  subject         TEXT NOT NULL,
  topic           TEXT NOT NULL,
  raw_score       NUMERIC NOT NULL,              -- 0.00 to 1.00 from Edge AI
  error_patterns  TEXT[],                        -- from GAP-1
  hesitation_count INTEGER,
  hint_dependency_rate NUMERIC,
  session_count   INTEGER,                       -- number of sessions this is based on
  edge_model_version TEXT,                       -- which GAP-1 version generated this
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(neura_id, snapshot_date, subject, topic)
);

CREATE TABLE writing_skill_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id        TEXT REFERENCES students(neura_id),
  school_id       TEXT NOT NULL,
  month           TEXT NOT NULL,                 -- '2025-09'
  handwriting_clarity_avg NUMERIC,
  writing_speed_wpm_avg   NUMERIC,
  spelling_accuracy_pct   NUMERIC,
  sentence_formation_level TEXT,
  active_writing_days     INTEGER,
  total_session_minutes   INTEGER,
  edge_model_version      TEXT,
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(neura_id, month)
);

CREATE TABLE study_habit_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id        TEXT REFERENCES students(neura_id),
  school_id       TEXT NOT NULL,
  session_date    DATE NOT NULL,
  focus_score     NUMERIC,                       -- 0 to 1 from SHE-1
  distraction_flags TEXT[],
  session_start_consistency NUMERIC,             -- how regular the study time is
  synced_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════
-- CLOUD AI OUTPUT
-- ════════════════════════════════════════

CREATE TABLE calibrated_mastery_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id        TEXT REFERENCES students(neura_id),
  school_id       TEXT NOT NULL,
  computed_date   DATE NOT NULL,
  subject         TEXT NOT NULL,
  topic           TEXT NOT NULL,
  raw_score       NUMERIC NOT NULL,
  calibrated_percentile INTEGER,                 -- 0 to 100
  classification  TEXT NOT NULL,                 -- MASTERED | GOOD | DEVELOPING | AT_RISK
  vs_class_avg    NUMERIC,                       -- delta from class mean
  vs_school_avg   NUMERIC,                       -- delta from school mean
  population_sample_size INTEGER,
  calibration_version TEXT,
  UNIQUE(neura_id, computed_date, subject, topic)
);

CREATE TABLE student_insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id        TEXT REFERENCES students(neura_id),
  school_id       TEXT NOT NULL,
  generated_date  DATE NOT NULL,
  language        TEXT NOT NULL,                 -- ENGLISH | TELUGU
  insight_type    TEXT NOT NULL,                 -- DAILY | WEEKLY | MILESTONE | AT_RISK
  subject         TEXT,
  summary_text    TEXT NOT NULL,                 -- Claude-generated plain language
  action_items    TEXT[],                        -- specific next steps
  severity        TEXT DEFAULT 'INFO',           -- INFO | WARNING | CRITICAL
  sent_to_parent  BOOLEAN DEFAULT FALSE,
  sent_to_teacher BOOLEAN DEFAULT FALSE,
  notification_pending BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE content_recommendations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id        TEXT REFERENCES students(neura_id),
  school_id       TEXT NOT NULL,
  recommended_at  TIMESTAMPTZ DEFAULT NOW(),
  subject         TEXT NOT NULL,
  topic           TEXT NOT NULL,
  reason          TEXT NOT NULL,                 -- AT_RISK_REMEDIAL | PREREQUISITE_GAP | NEXT_TOPIC
  content_ids     TEXT[],                        -- references to content_library
  problem_set_ids TEXT[],
  pushed_to_device BOOLEAN DEFAULT FALSE,
  pushed_at       TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);

-- ════════════════════════════════════════
-- CALIBRATION BASELINES
-- ════════════════════════════════════════

CREATE TABLE calibration_baselines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject         TEXT NOT NULL,
  topic           TEXT NOT NULL,
  class_year      INTEGER NOT NULL,
  computed_at     TIMESTAMPTZ NOT NULL,
  sample_size     INTEGER NOT NULL,
  mean_raw_score  NUMERIC NOT NULL,
  std_dev         NUMERIC NOT NULL,
  p25             NUMERIC,
  p50             NUMERIC,
  p75             NUMERIC,
  p90             NUMERIC,
  at_risk_threshold NUMERIC,
  mastered_threshold NUMERIC,
  UNIQUE(subject, topic, class_year, computed_at)
);

-- ════════════════════════════════════════
-- CONTENT LIBRARY
-- ════════════════════════════════════════

CREATE TABLE content_chapters (
  id              TEXT PRIMARY KEY,              -- MATH-10-CH3
  subject         TEXT NOT NULL,
  class_year      INTEGER NOT NULL,
  chapter_number  INTEGER NOT NULL,
  chapter_title   TEXT NOT NULL,
  board           TEXT NOT NULL,                 -- AP_STATE | TS_STATE | CBSE
  medium          TEXT NOT NULL,                 -- ENGLISH | TELUGU
  svg_content_url TEXT,                          -- Supabase Storage path
  animation_url   TEXT,
  youtube_refs    TEXT[],                        -- curated video links
  topic_tags      TEXT[],                        -- maps to mastery topic taxonomy
  published       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE problem_sets (
  id              TEXT PRIMARY KEY,              -- PS-MATH-10-QE-001
  subject         TEXT NOT NULL,
  class_year      INTEGER NOT NULL,
  topic           TEXT NOT NULL,
  difficulty      TEXT NOT NULL,                 -- FOUNDATION | STANDARD | ADVANCED
  board           TEXT NOT NULL,
  medium          TEXT NOT NULL,
  problems        JSONB NOT NULL,                -- array of problem objects
  target_error_patterns TEXT[],                  -- which GAP-1 patterns this addresses
  created_by      TEXT DEFAULT 'SYSTEM',         -- SYSTEM | teacher_id
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════
-- DEVICE MANAGEMENT
-- ════════════════════════════════════════

CREATE TABLE smartpad_devices (
  id              TEXT PRIMARY KEY,              -- PAD-0042
  school_id       TEXT REFERENCES schools(id),
  serial_number   TEXT UNIQUE NOT NULL,
  assigned_neura_id TEXT REFERENCES students(neura_id),
  os_version      TEXT,
  status          TEXT DEFAULT 'ACTIVE',         -- ACTIVE | LOCKED | LOST | MAINTENANCE
  last_seen_at    TIMESTAMPTZ,
  last_sync_at    TIMESTAMPTZ,
  gps_lat         NUMERIC,
  gps_lng         NUMERIC,
  battery_pct     INTEGER,
  storage_used_mb INTEGER,
  model_versions  JSONB                          -- { HWR-1: '1.4', GAP-1: '1.2', ... }
);

CREATE TABLE model_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type      TEXT NOT NULL,                 -- HWR-1 | GAP-1 | WSS-1 | SHE-1
  version         TEXT NOT NULL,
  file_url        TEXT NOT NULL,                 -- Supabase Storage
  checksum_sha256 TEXT NOT NULL,
  file_size_mb    NUMERIC,
  min_os_version  TEXT,
  changelog       TEXT,
  published_at    TIMESTAMPTZ DEFAULT NOW(),
  is_active       BOOLEAN DEFAULT TRUE
);

CREATE TABLE ota_update_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id       TEXT REFERENCES smartpad_devices(id),
  model_type      TEXT NOT NULL,
  from_version    TEXT,
  to_version      TEXT NOT NULL,
  status          TEXT NOT NULL,                 -- PENDING | DOWNLOADING | INSTALLED | FAILED
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error_message   TEXT
);

-- ════════════════════════════════════════
-- NEURASPHERE
-- ════════════════════════════════════════

CREATE TABLE neurasphere_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id        TEXT REFERENCES students(neura_id),
  school_id       TEXT NOT NULL,
  content_text    TEXT NOT NULL,
  media_urls      TEXT[],
  post_type       TEXT NOT NULL,                 -- ACHIEVEMENT | STUDY_TIP | MILESTONE | DOUBT
  moderation_status TEXT DEFAULT 'PENDING',      -- PENDING | APPROVED | REJECTED
  moderation_reason TEXT,
  claude_moderation_score NUMERIC,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE learning_circles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  subject         TEXT,
  class_year_range INT4RANGE,
  created_by      TEXT REFERENCES students(neura_id),
  member_count    INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE badges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id        TEXT REFERENCES students(neura_id),
  badge_type      TEXT NOT NULL,
  badge_title     TEXT NOT NULL,
  description     TEXT,
  earned_at       TIMESTAMPTZ DEFAULT NOW(),
  visible_on_sphere BOOLEAN DEFAULT TRUE
);

-- ════════════════════════════════════════
-- NOTIFICATIONS & ALERTS
-- ════════════════════════════════════════

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       TEXT NOT NULL,
  recipient_type  TEXT NOT NULL,                 -- TEACHER | PARENT | PRINCIPAL
  recipient_id    UUID NOT NULL,
  channel         TEXT NOT NULL,                 -- FCM | SMS | IN_APP
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  data_payload    JSONB,
  priority        TEXT DEFAULT 'NORMAL',         -- LOW | NORMAL | HIGH | CRITICAL
  sent_at         TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  status          TEXT DEFAULT 'PENDING',        -- PENDING | SENT | DELIVERED | FAILED
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE intervention_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id        TEXT REFERENCES students(neura_id),
  school_id       TEXT NOT NULL,
  logged_by       UUID REFERENCES teachers(id),
  intervention_type TEXT NOT NULL,               -- HOMEWORK | PARENT_MEETING | REMEDIAL | NOTE
  notes           TEXT,
  outcome         TEXT,
  logged_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policy Pattern

Every table with `school_id` gets this policy:

```sql
-- Example: mastery_snapshots
ALTER TABLE mastery_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_isolation" ON mastery_snapshots
  FOR ALL
  USING (school_id = (auth.jwt() ->> 'school_id'));

-- SmartPad sync (SYSTEM role bypasses school isolation to write cross-school)
CREATE POLICY "system_write" ON mastery_snapshots
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') = 'SYSTEM');
```

---

## 6. Auth & Role Model

### Auth Flow

NeuraLife uses **OTP-based auth** for all human users. No passwords.

```
Teacher / Parent / Principal:
  POST /auth/otp/request  { mobile: '+91-9876543210' }
  → MSG91 sends 6-digit OTP via SMS
  POST /auth/otp/verify   { mobile, otp }
  → Returns JWT (24hr expiry) + refresh token (30 days)

Student on SmartPad:
  Logs in via NeuraID + 4-digit PIN (set at first enrollment)
  No OTP (students may not have personal mobile)
  PIN stored as bcrypt hash in smartpad_devices.pin_hash
  JWT issued by API Gateway, valid for device session only

System (ML Microservice → API Gateway):
  Static API key in environment variable
  Role = SYSTEM, no school_id binding
  Used only for batch write operations from ML pipelines
```

### JWT Payload

```json
{
  "sub": "uuid-of-auth-record",
  "role": "PRINCIPAL | TEACHER | PARENT | STUDENT | SYSTEM",
  "school_id": "SCH-AP-00142",
  "neura_id": "NID-2025-AP-084291",
  "teacher_id": "uuid",
  "name": "S. Lakshmi",
  "iat": 1720000000,
  "exp": 1720086400
}
```

### Role Capabilities Matrix

| Capability | Principal | Class Teacher | Subject Teacher | Parent | Student | System |
| --- | --- | --- | --- | --- | --- | --- |
| School configuration | ✅ Write | ❌ | ❌ | ❌ | ❌ | ✅ |
| Enroll / transfer student | ✅ Write | ❌ | ❌ | ❌ | ❌ | ❌ |
| View all students (own school) | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| View student mastery | ✅ | ✅ own class | ✅ own subject | ✅ own child | ✅ self | ✅ |
| Mark attendance | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assign homework | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Log intervention | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View insights | ✅ | ✅ | ✅ | ✅ own child | ✅ self | ✅ |
| Publish insights | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Push OTA updates | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Lock / unlock SmartPad | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Sync mastery data | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (device) |

---

## 7. API Surface

### Base Configuration

```
v1 Production:  https://api.neuralife.in/api/v1
v1 Development: http://localhost:3001/api/v1
ML Service:     http://localhost:8000  (internal, never public)
```

All requests (except `/auth/*`, `/health`) require:

```
Authorization: Bearer {jwt}
X-App-Version: 1.0.0
Content-Type: application/json
```

SmartPad sync requests additionally require:

```
X-Device-ID: PAD-0042
X-Device-Signature: {hmac-sha256 of body}
```

### Auth Routes

```
POST   /auth/otp/request              # Send OTP to mobile
POST   /auth/otp/verify               # Verify OTP → JWT
POST   /auth/pin/set                  # Student sets SmartPad PIN
POST   /auth/pin/verify               # Student PIN auth
POST   /auth/refresh                  # Refresh JWT
DELETE /auth/session                  # Logout
```

### Identity Routes (NeuraID)

```
POST   /identity/generate             # Enroll student, create NeuraID
GET    /identity/:neuraId             # Fetch full student profile
PUT    /identity/:neuraId             # Update identity fields (principal only)
POST   /identity/transfer             # Transfer to new school
DELETE /identity/:neuraId             # Deactivate (DPDP deletion request)
GET    /identity/check-duplicate      # Pre-enrollment aadhaar_hash check
GET    /identity/:neuraId/history     # Full school + mastery history
```

### School & Admin Routes

```
POST   /schools                       # Register school (platform admin only)
GET    /schools/:schoolId             # School profile
PUT    /schools/:schoolId             # Update school config
GET    /schools/:schoolId/stats       # Aggregate health metrics
POST   /schools/:schoolId/classes     # Add class + section
GET    /schools/:schoolId/timetable   # Full timetable
PUT    /schools/:schoolId/timetable   # Update timetable
GET    /schools/:schoolId/teachers    # List teachers
POST   /schools/:schoolId/teachers    # Add teacher
PUT    /schools/:schoolId/teachers/:teacherId  # Update teacher record
GET    /schools/:schoolId/fleet       # SmartPad fleet status
POST   /schools/:schoolId/announcements  # Broadcast to school
```

### Student Data Routes

```
GET    /students/:neuraId/mastery            # Calibrated mastery scores
GET    /students/:neuraId/insights           # AI-generated insights
GET    /students/:neuraId/writing-skills     # WSS-1 skill history
GET    /students/:neuraId/attendance         # Attendance record
GET    /students/:neuraId/exam-results       # All exam records
GET    /students/:neuraId/recommendations    # Content recommendations
GET    /students/:neuraId/achievements       # Badges + milestones
GET    /students/:neuraId/360               # Full 360 profile (class teacher only)
POST   /students/:neuraId/interventions      # Log teacher intervention
```

### Teacher Workflow Routes

```
GET    /teacher/schedule                     # Today's periods + classes
POST   /teacher/attendance                   # Mark class attendance
GET    /teacher/attendance/:classId/:date    # View attendance for a class
POST   /teacher/homework                     # Assign homework
GET    /teacher/homework                     # List homework assigned by teacher
POST   /teacher/marks                        # Enter exam marks
GET    /teacher/class/:classId/mastery       # Class-level mastery overview
GET    /teacher/class/:classId/at-risk       # AT_RISK students
POST   /teacher/push-resource                # Push content to student SmartPads
POST   /teacher/meetings                     # Schedule parent meeting
```

### Sync Routes (SmartPad → Cloud)

```
POST   /sync/session                         # Upload session delta
POST   /sync/batch                           # Bulk upload after offline period
GET    /sync/status/:deviceId               # Last sync time, pending queue depth
POST   /sync/ocr-fallback                   # Low-confidence strokes for Cloud OCR
GET    /sync/recommendations/:neuraId       # Download pending recommendations
GET    /sync/content/:contentId             # Download content chapter for offline
```

### OTA Routes

```
GET    /ota/check                            # Check for available model updates
POST   /ota/download/initiate               # Register download start
POST   /ota/confirm                         # Confirm successful install
GET    /ota/fleet-status/:schoolId          # Update rollout progress (principal)
```

### NeuraSphere Routes

```
GET    /sphere/feed/:neuraId                # Personal + community feed
POST   /sphere/posts                        # Submit post for moderation
GET    /sphere/posts/:postId                # Single post
DELETE /sphere/posts/:postId               # Delete own post / parent report
GET    /sphere/circles                      # Browse learning circles
POST   /sphere/circles                      # Create circle
POST   /sphere/circles/:circleId/join       # Join circle
GET    /sphere/leaderboard                  # Class / school / platform rankings
GET    /sphere/profile/:neuraId             # Public student profile
POST   /sphere/report/:postId              # Report post (parent / teacher)
```

### Notification Routes

```
GET    /notifications                        # Inbox for authenticated user
PUT    /notifications/:id/read              # Mark as read
GET    /notifications/unread-count          # Badge count
POST   /notifications/push-token           # Register FCM token
```

### ML Microservice Internal Routes (not public)

```
POST   /ml/calibrate/run                    # Trigger calibration run (nightly)
POST   /ml/insights/generate               # Generate insights for neura_id batch
POST   /ml/recommendations/compute         # Compute recommendations
POST   /ml/patterns/detect                 # Curriculum pattern detection (weekly)
POST   /ml/training/trigger                # Trigger model retraining (monthly)
GET    /ml/health                          # Pipeline health check
```

---

## 8. Real-Time Architecture

### What Uses Supabase Realtime

Supabase Realtime listens to PostgreSQL changes (via logical replication) and pushes them to subscribed clients via WebSocket.

| Event | Realtime trigger | Subscriber | Latency target |
| --- | --- | --- | --- |
| New `student_insights` row where `severity = CRITICAL` | INSERT on `student_insights` | Teacher app (class teacher) | < 3 seconds |
| New `attendance` row | INSERT on `attendance` | Principal dashboard | < 5 seconds |
| `smartpad_devices.status` changes | UPDATE on `smartpad_devices` | Principal fleet dashboard | < 5 seconds |
| New `neurasphere_posts` where `moderation_status = APPROVED` | UPDATE on `neurasphere_posts` | Student/parent app feed | < 5 seconds |
| New `notifications` row | INSERT on `notifications` | All apps (in-app badge) | < 2 seconds |

### What Uses Batch (not realtime)

| Data | Update frequency | Mechanism |
| --- | --- | --- |
| Calibrated mastery scores | Nightly (2 AM) | ML pipeline cron, parent app refreshes at 8 PM |
| Student insights (non-critical) | Nightly | Batched FCM push after ML run completes |
| Writing skill snapshots | Monthly aggregate | End-of-month ML pipeline |
| Principal stats dashboard | Hourly | API polling, not Supabase Realtime |
| Content recommendations | Post-sync | ML pipeline triggered after each sync batch |
| Calibration baselines | Weekly (Sunday 2 AM) | Cron job in ML Microservice |

### FCM Push Strategy

```
CRITICAL (AT_RISK student flagged):
  → Immediate FCM high-priority push to Class Teacher
  → SMS to parent if teacher does not open within 2 hours
  → Logged in notifications table

NORMAL (daily insight ready):
  → Batched FCM at 8 PM to parent
  → In-app badge update via Supabase Realtime

LOW (content recommendation available):
  → In-app only, no FCM
  → Visible next time user opens app
```

---

## 9. Offline Sync Architecture (Overview)

> Full specification: **Segment 10 — Offline Sync Architecture**
> 

The SmartPad is the primary data producer. It spends the majority of its time offline (school hours, home use). The sync architecture must handle this without data loss or mastery corruption.

### Core Principle

The SmartPad never waits for the cloud. It operates fully on local SQLite. The sync layer is a background service — not a blocker for any student interaction.

### Sync Queue Structure (SQLite on device)

```json
{
  "queue_id": "Q-20250910-084291-001",
  "neura_id": "NID-2025-AP-084291",
  "payload_type": "SESSION_DELTA | OCR_FALLBACK | CONFIRMATION",
  "payload": { ... },
  "created_at": "2025-09-10T14:23:00",
  "sync_attempts": 0,
  "last_attempt_at": null,
  "status": "PENDING | SYNCED | FAILED"
}
```

### Sync Trigger

```
WiFi connected → Sync Agent wakes
→ POST /sync/batch (all PENDING items, max 50 per request)
→ Server responds: { accepted: [...ids], rejected: [...ids with reasons] }
→ Accepted items marked SYNCED in local queue
→ Rejected items logged + flagged for review (not retried automatically)
→ Download: new content recommendations + OTA checks
```

### Conflict Resolution Rule

The SmartPad is always the source of truth for raw mastery data. The cloud is the source of truth for calibrated mastery. These never conflict — they are different columns on different tables. A sync conflict (same `neura_id + snapshot_date + subject + topic`) is resolved: **latest timestamp wins**, with the older record preserved in an audit log.

---

## 10. Infrastructure — v1 vs v2

### v1 — Demo & First School (solo buildable, low cost)

| Component | Service | Estimated Monthly Cost |
| --- | --- | --- |
| API Gateway | Railway Starter | $5–20 |
| ML Microservice | Railway Starter | $10–20 |
| Database + Auth + Realtime + Storage | Supabase Pro | $25 |
| Web Admin Console | Vercel Hobby | Free |
| SMS (MSG91) | Pay per SMS | ~₹0.25/SMS |
| Claude API | Anthropic pay-per-use | $10–30 (nightly runs) |
| FCM | Firebase | Free tier sufficient |
| **Total** |  | **~$50–100/month** |

### v2 — Post First School Deal (multi-school, production grade)

| Addition | Purpose | Estimated Cost |
| --- | --- | --- |
| Redis (Upstash) | Job queue, rate limiting, session cache | $10/mo |
| BullMQ | Async ML pipeline management | (uses Redis) |
| Cloudflare CDN | Textbook SVG/PDF delivery to SmartPads | $20/mo |
| Railway Pro (scaled) | API Gateway autoscaling | $50–100/mo |
| Modal.com (GPU) | Monthly model training jobs | $50–100/run |
| Elasticsearch (Elastic Cloud) | NeuraSphere search, content search | $30/mo |
| Sentry | Error tracking, performance monitoring | $26/mo |

### v3 — Scale (100+ schools)

- Evaluate sharding by state (AP schema / TS schema) after 50k+ students
- Replace Railway with AWS ECS or GCP Cloud Run for API Gateway
- ML pipeline moves to Kubernetes (GKE) with GPU node pools
- PostgreSQL → Aurora Postgres for read replicas
- SmartPad content delivery moves to dedicated CDN edge nodes in AP/TS

---

## 11. Security Architecture

> Full specification: **Segment 13 — Security & Compliance (DPDP Act 2023)**
> 

### Non-negotiable security decisions (v1)

| Concern | Implementation |
| --- | --- |
| Aadhaar number | SHA-256 hashed **client-side** before transmission. Raw number never touches NeuraLife servers. |
| Raw handwriting strokes | Never leave the SmartPad. Only classified signals sync. |
| JWT secrets | Stored in Railway environment variables, rotated every 90 days. |
| Database | Supabase RLS on every table. No direct DB access from client apps. |
| API keys (Claude, MSG91) | Server-side only. Never in client bundles. |
| SmartPad sync | HMAC-SHA256 body signature required. Replay attack prevention via nonce. |
| HTTPS | Enforced everywhere. Supabase and Railway enforce TLS by default. |
| Child data | Students under 13 (Class 1–7) — no PII beyond name, DOB, parent contact in any client-facing payload. |

---

## 12. Data Flows — Four Critical Paths

### Path 1 — Student Session to Insight (Core Loop)

```
Student writes on SmartPad
  → Edge AI: HWR-1 + GAP-1 + WSS-1 + SHE-1 process strokes (offline)
  → Local SQLite: mastery map + session queue updated
  → [WiFi connects]
  → POST /sync/batch: session deltas uploaded
  → PostgreSQL: mastery_snapshots, writing_skill_snapshots written
  → [Nightly 2 AM]
  → ML Pipeline 1: calibrated_mastery_scores computed
  → ML Pipeline 2: Claude API generates student_insights
  → notifications table: new rows created
  → Supabase Realtime: Teacher app receives CRITICAL alerts immediately
  → FCM: Parent receives insight push at 8 PM
  → [Student next session]
  → SmartPad downloads content_recommendations at next sync
  → Loop continues
```

### Path 2 — Student Enrollment

```
Principal in Web Admin Console
  → Enters student name, DOB, Aadhaar
  → Client: SHA-256(aadhaar) generated
  → POST /identity/generate { name, dob, aadhaar_hash, school_id, class_year }
  → API Gateway: check aadhaar_hash duplicate
    → DUPLICATE: return existing NeuraID → show transfer option
    → NEW: generate NID-{YEAR}-{STATE}-{SEQ}
      → INSERT into students, school_enrollments
      → MSG91: SMS to parent_mobile
      → Return NeuraID to principal
  → Principal assigns SmartPad
  → INSERT into smartpad_devices.assigned_neura_id
  → Student logs in with NeuraID + PIN
  → Edge AI initialises local profile for this NeuraID
```

### Path 3 — OTA Model Update

```
ML Training Pipeline completes monthly run
  → New .tflite binary uploaded to Supabase Storage
  → INSERT into model_versions { type, version, url, checksum }
  → [SmartPad connects to WiFi]
  → GET /ota/check → { update_available: true, download_url, checksum }
  → Sync Agent downloads binary in background (student unaware)
  → SHA-256 verification
  → Atomic file replace
  → Edge AI Engine restarts (< 2 second interruption)
  → POST /ota/confirm { device_id, model_type, version, installed_at }
  → smartpad_devices.model_versions updated
  → Principal fleet dashboard shows 100% rollout
```

### Path 4 — NeuraSphere Post Moderation

```
Student submits post in NeuraSphere
  → POST /sphere/posts { content_text, post_type }
  → API Gateway: INSERT into neurasphere_posts { status: PENDING }
  → Student sees: "Post under review"
  → API Gateway triggers async moderation job:
    → Claude API: evaluate content safety, age-appropriateness
    → Score returned: 0.0 (unsafe) to 1.0 (safe)
    → Score > 0.85: UPDATE neurasphere_posts SET status = APPROVED, published_at = NOW()
    → Score 0.60–0.85: Human review queue (teacher/admin)
    → Score < 0.60: UPDATE status = REJECTED, moderation_reason set
  → On APPROVED: Supabase Realtime pushes to follower feeds
  → Parent app: post visible in child's activity log
  → On REJECTED: Student notified in-app with reason
```

---

## 13. Version Milestones

### v1 — Demo Ready

| Service | Status | Notes |
| --- | --- | --- |
| API Gateway — auth, NeuraID, school mgmt, sync | Build | Core routes only |
| Supabase schema — all tables above | Build | Full schema from day one |
| Web Admin Console | Build | Onboarding + mastery dashboard + fleet |
| Teacher Mobile App | Build | Schedule, attendance, mastery, alerts |
| Parent App | Build | Insights, attendance, homework view |
| Edge AI — HWR-1 + GAP-1 on Android | Build | ML Kit base + basic gap detection |
| ML Pipeline 1 — Calibration | Build | Weekly cron |
| ML Pipeline 2 — Insights (Claude API) | Build | Nightly cron |
| FCM push notifications | Build | CRITICAL alerts + daily batch |
| OTA update server | Build | Manual trigger for v1 |
| NeuraOS kiosk mode on stock tablet | Build | Full AOSP fork = v2 |

### v2 — Post First School Deal

| Addition | Notes |
| --- | --- |
| Edge AI — WSS-1 + SHE-1 | Requires 6 months training data |
| ML Pipeline 3 — Recommendations | Requires calibration baseline maturity |
| ML Pipeline 4 — Curriculum Patterns | Requires 5+ schools |
| NeuraSphere full | Social network + moderated chat |
| Real NeuraOS AOSP build | Custom fork + OTA OS updates |
| Redis + BullMQ | Replace node-cron for job management |
| Play Store release | Both apps |
| Bulk student CSV import | Admin console |

### v3 — Scale

| Addition | Notes |
| --- | --- |
| ML Pipeline 5 — Model Training | Requires 50k+ student dataset |
| Government / District reporting | API for AP/TS education department |
| Inter-school benchmarking (public) | Opt-in school rankings |
| SmartPad hardware procurement | OEM manufacturing in India |
| Sharding by state | If > 500 schools |

---

## 14. Confirmed Decisions

| Decision | Rationale |
| --- | --- |
| Single PostgreSQL database, `school_id` on all tables | Cross-school calibration requires unified queryable data |
| Supabase RLS for data isolation | Row-level isolation without application-layer complexity |
| OTP auth for humans, PIN auth for students on SmartPad | Students may not have personal mobiles |
| Raw strokes never leave SmartPad | Privacy + bandwidth + competitive moat |
| Aadhaar hashed client-side | UIDAI compliance, raw number never on NeuraLife servers |
| Teacher alerts: real-time via Supabase Realtime + FCM | Teachers need to act during the school day |
| Parent mastery update: end-of-day batch at 8 PM | Reduces anxiety, more trustworthy than hourly noise |
| Principal dashboard: hourly refresh (not real-time) | Trends are meaningful at hourly granularity |
| API Gateway on Node.js + Fastify | TypeScript coverage across web + backend, Fastify is 2× faster than Express |
| ML Microservice on Python + FastAPI | NumPy/Pandas/scikit-learn ecosystem, async-native |
| Content: SCERT AP + SCERT TS + NCERT digitized as SVG + animated explanations + YouTube refs | Platform owns content format and curriculum mapping. Board loaded per school config. |
| NeuraOS v1: kiosk app on stock Android tablet | Full AOSP fork is a 6-month build, not a demo build |
| Curriculum coverage: SCERT AP + SCERT TS + NCERT | School's board selection at onboarding determines default syllabus. Teachers in primary schools can add supplementary content on top of platform base content. |
| Content navigation hierarchy: Grade → Subject → Chapter → Topic/Segment/Exercise | Student's current grade opens by default. Student can switch to any other grade. Full textbook coverage — theory, examples, exercises, all segments. |
| YouTube curation: 1 focused video per topic + 1 chapter-length video per chapter | Per-subject recommended primary channel (Telugu + English medium). Teachers can suggest alternates via Teacher App — approved by you before publishing. |
| SMS cost model: absorbed into platform subscription | Subscription pricing must cover MSG91 cost (approx ₹225/month per 500-student school). Fully modelled in Business Model spec (Segment 16). |
| Supabase Realtime: use through v1 and v2 | Handles thousands of concurrent connections. Revisit only at 50+ concurrent schools if latency > 500ms. |
| OCR accuracy path: ML Kit base → Cloud Vision flywheel → custom TFLite by Month 9 | Month 0–3: ML Kit. Month 3–6: fine-tune on real data. Month 6–12: fully custom model. Cloud Vision cost ~$150/month at 500 students is acceptable during flywheel phase. |
| DPDP Act 2023: no DPO required at current scale | Not a Significant Data Fiduciary at demo/early scale. v1: consent checkbox at enrollment + Supabase Mumbai region (ap-south-1) + data deletion API (already in spec). v2: lawyer-drafted privacy policy + grievance officer listed on website. Full spec in Segment 13. |
| SmartPad hardware — demo: stock Android tablet (₹8–12k). v2: India OEM partner at 200–500 unit MOQ. v3: direct manufacturing relationship (Foxconn India or equivalent) | Make in India narrative supports government school deals. No import duty complexity. Easier warranty and after-sales in AP/TS. |
| Content pre-download strategy: current grade fully pre-downloaded on first sync | All subjects for student's enrolled grade cached on device at first sync — fully accessible offline. Other grades: chapter-level on-demand download (student selects chapter → downloads fully → navigable offline). YouTube video links open only when WiFi available (supplementary, not core). |

---

## 15. Open Questions

*All previously open questions resolved as of System Architecture v1.1. No open questions remain for this document.*

*Questions that feed into upcoming spec documents:*

| Question | Resolved in Segment |
| --- | --- |
| Full AP/TS/NCERT curriculum topic taxonomy (controlled vocabulary for `topic` field) | Segment 11 — Content Layer |
| YouTube channel map per subject (Telugu + English medium) | Segment 11 — Content Layer |
| Subscription pricing tiers covering SMS + infra + team costs | Segment 16 — Business Model |
| DPDP compliance implementation detail + consent flow copy | Segment 13 — Security & Compliance |
| India OEM partner shortlist for SmartPad v2 | Segment 16 — Business Model |

---

*Next document: **Segment 10 — Offline Sync Architecture***