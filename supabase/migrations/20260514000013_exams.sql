-- Migration 013: Exams Module
-- Creates core exam tables: exams, exam_subjects, exam_marks, grade_config

-- ─── Enum types ──────────────────────────────────────────────────────────────

DO $$ BEGIN CREATE TYPE exam_type AS ENUM ('FA1','FA2','FA3','FA4','SA1','SA2','UNIT_TEST','PTM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE exam_status AS ENUM ('DRAFT','SCHEDULED','IN_PROGRESS','MARKS_PENDING','PUBLISHED','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 1. exams ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exams (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         TEXT        NOT NULL REFERENCES schools(id),
  academic_year_id  UUID        NOT NULL REFERENCES academic_years(id),
  name              TEXT        NOT NULL,
  exam_type         exam_type   NOT NULL,
  description       TEXT,
  start_date        DATE        NOT NULL,
  end_date          DATE        NOT NULL,
  status            exam_status NOT NULL DEFAULT 'DRAFT',
  created_by        TEXT        NOT NULL,   -- JWT sub of creator
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT exams_dates_check CHECK (end_date >= start_date)
);

CREATE INDEX idx_exams_school_year ON exams(school_id, academic_year_id);
CREATE INDEX idx_exams_status ON exams(status) WHERE deleted_at IS NULL;

-- ─── 2. exam_subjects ─────────────────────────────────────────────────────────
-- One row per subject-class-section combination in an exam.
-- section = NULL means the subject applies to ALL sections of that class_year.

CREATE TABLE IF NOT EXISTS exam_subjects (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id     UUID    NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject     TEXT    NOT NULL,
  class_year  INTEGER NOT NULL CHECK (class_year BETWEEN 1 AND 12),
  section     TEXT,                              -- NULL = all sections
  max_marks   INTEGER NOT NULL DEFAULT 100 CHECK (max_marks > 0),
  pass_marks  INTEGER NOT NULL DEFAULT 35 CHECK (pass_marks >= 0),
  teacher_id  UUID    REFERENCES teachers(id),   -- NULL = principal enters marks
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (exam_id, subject, class_year, section)
);

CREATE INDEX idx_exam_subjects_exam ON exam_subjects(exam_id);
CREATE INDEX idx_exam_subjects_teacher ON exam_subjects(teacher_id) WHERE teacher_id IS NOT NULL;

-- ─── 3. exam_marks ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exam_marks (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id          UUID           NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  exam_subject_id  UUID           NOT NULL REFERENCES exam_subjects(id) ON DELETE CASCADE,
  neura_id         TEXT           NOT NULL REFERENCES students(neura_id),
  marks_obtained   NUMERIC(6,2),                -- NULL = not yet entered
  is_absent        BOOLEAN        NOT NULL DEFAULT FALSE,
  entered_by       TEXT,                        -- JWT sub of teacher/principal who entered
  entered_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (exam_subject_id, neura_id)
);

CREATE INDEX idx_exam_marks_exam ON exam_marks(exam_id);
CREATE INDEX idx_exam_marks_student ON exam_marks(neura_id);

-- ─── 4. grade_config ──────────────────────────────────────────────────────────
-- school_id = NULL means these are the global AP/TS defaults.
-- Schools can override by inserting rows with their school_id.

CREATE TABLE IF NOT EXISTS grade_config (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        TEXT           REFERENCES schools(id),  -- NULL = default
  grade_label      TEXT           NOT NULL,
  min_percentage   NUMERIC(5,2)   NOT NULL,
  max_percentage   NUMERIC(5,2)   NOT NULL,
  grade_points     NUMERIC(3,1)   NOT NULL DEFAULT 0,
  neuracoin_reward INTEGER        NOT NULL DEFAULT 0,
  display_color    TEXT           NOT NULL DEFAULT '#64748b',
  sort_order       INTEGER        NOT NULL DEFAULT 0,
  UNIQUE (school_id, grade_label)
);

-- AP/TS Standard Grade Scale (default, school_id = NULL)
INSERT INTO grade_config (school_id, grade_label, min_percentage, max_percentage, grade_points, neuracoin_reward, display_color, sort_order) VALUES
  (NULL, 'A+', 90.00, 100.00, 10.0, 100, '#10b981', 1),
  (NULL, 'A',  75.00,  89.99,  9.0,  75, '#0d9488', 2),
  (NULL, 'B',  60.00,  74.99,  8.0,  50, '#1e40af', 3),
  (NULL, 'C',  50.00,  59.99,  7.0,  30, '#6366f1', 4),
  (NULL, 'D',  35.00,  49.99,  6.0,  15, '#f59e0b', 5),
  (NULL, 'F',   0.00,  34.99,  0.0,   0, '#ef4444', 6)
ON CONFLICT (school_id, grade_label) DO NOTHING;

-- ─── 5. RLS Policies ─────────────────────────────────────────────────────────

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_config ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by API via supabaseAdmin)
CREATE POLICY "service_all_exams"        ON exams        FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_exam_subjects" ON exam_subjects FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_exam_marks"   ON exam_marks    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_grade_config" ON grade_config  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Anon/authenticated read (anon client used by API in some cases)
CREATE POLICY "anon_read_grade_config" ON grade_config FOR SELECT TO anon, authenticated USING (true);
