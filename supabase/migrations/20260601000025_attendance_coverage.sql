-- ============================================================
-- Migration 025: Attendance Coverage + FCM Enhancements
-- Teacher Mobile App - Segment 02
-- ============================================================

-- ── B1: Alter fcm_tokens ──────────────────────────────────

ALTER TABLE fcm_tokens
  ADD COLUMN IF NOT EXISTS device_id   TEXT,
  ADD COLUMN IF NOT EXISTS school_id   TEXT REFERENCES schools(id);

-- Backfill device_id for existing rows
UPDATE fcm_tokens
  SET device_id = gen_random_uuid()::TEXT
  WHERE device_id IS NULL;

-- Make device_id NOT NULL
ALTER TABLE fcm_tokens
  ALTER COLUMN device_id SET NOT NULL;

-- Drop old unique on token alone (token rotates); add correct one per user+device
ALTER TABLE fcm_tokens
  DROP CONSTRAINT IF EXISTS fcm_tokens_token_key;

ALTER TABLE fcm_tokens
  ADD CONSTRAINT IF NOT EXISTS fcm_tokens_user_device_unique
    UNIQUE (user_id, user_type, device_id);

CREATE INDEX IF NOT EXISTS idx_fcm_user_active
  ON fcm_tokens(user_id, user_type, is_active)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_fcm_school_teacher
  ON fcm_tokens(school_id, user_type, is_active)
  WHERE is_active = TRUE;

COMMENT ON COLUMN fcm_tokens.device_id IS
  'Stable UUID generated on first install, stored in Android Keychain.
   Same value used in attendance signature hashes for audit traceability.
   UNIQUE per user+device — allows multiple devices per teacher.';

COMMENT ON COLUMN fcm_tokens.school_id IS
  'Active school context at token registration time.';

-- ── B2: Attendance mode on schools ───────────────────────

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS attendance_mode
    TEXT NOT NULL DEFAULT 'ONCE_PER_DAY'
    CHECK (attendance_mode IN ('ONCE_PER_DAY', 'PER_PERIOD'));

COMMENT ON COLUMN schools.attendance_mode IS
  'ONCE_PER_DAY: one record per student per day.
   PER_PERIOD: separate record per student per period.
   Set by principal in Web Admin → Settings → Academic.';

-- ── Attendance table enhancements for signature + device audit ──

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS device_id       TEXT,
  ADD COLUMN IF NOT EXISTS signature_hash  TEXT,
  ADD COLUMN IF NOT EXISTS period_number   INTEGER;

-- Unique index for ONCE_PER_DAY upsert (period_number IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS attendance_once_per_day_idx
  ON attendance(neura_id, attendance_date)
  WHERE period_number IS NULL;

-- Unique index for PER_PERIOD upsert
CREATE UNIQUE INDEX IF NOT EXISTS attendance_per_period_idx
  ON attendance(neura_id, attendance_date, period_number)
  WHERE period_number IS NOT NULL;

-- ── B3: syllabus_coverage ────────────────────────────────

CREATE TABLE IF NOT EXISTS syllabus_coverage (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        TEXT NOT NULL REFERENCES schools(id),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  teacher_id       UUID NOT NULL REFERENCES teachers(id),
  class_year       INTEGER NOT NULL CHECK (class_year BETWEEN 1 AND 12),
  section          TEXT NOT NULL,
  subject          TEXT NOT NULL,
  coverage_date    DATE NOT NULL,
  period_number    INTEGER,
  chapter_name     TEXT NOT NULL,
  topic_name       TEXT NOT NULL,
  coverage_status  TEXT NOT NULL
    CHECK (coverage_status IN ('COVERED', 'PARTIAL', 'POSTPONED')),
  completion_pct   INTEGER NOT NULL DEFAULT 100
    CHECK (completion_pct BETWEEN 0 AND 100),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coverage_unique
  ON syllabus_coverage(school_id, academic_year_id, teacher_id,
    class_year, section, subject, coverage_date,
    COALESCE(period_number, -1), topic_name);

CREATE INDEX IF NOT EXISTS idx_coverage_teacher_date
  ON syllabus_coverage(teacher_id, coverage_date DESC);

CREATE INDEX IF NOT EXISTS idx_coverage_class
  ON syllabus_coverage(school_id, academic_year_id, class_year, section, subject);

ALTER TABLE syllabus_coverage ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "coverage_select" ON syllabus_coverage FOR SELECT
  USING (school_id = auth_school_id() OR auth_role() = 'SUPER_ADMIN');

CREATE POLICY IF NOT EXISTS "coverage_insert" ON syllabus_coverage FOR INSERT
  WITH CHECK (school_id = auth_school_id()
    AND auth_role() IN ('TEACHER','PRINCIPAL','SCHOOL_ADMIN'));

CREATE POLICY IF NOT EXISTS "coverage_update" ON syllabus_coverage FOR UPDATE
  USING (school_id = auth_school_id()
    AND auth_role() IN ('TEACHER','PRINCIPAL','SCHOOL_ADMIN'));

-- ── B4: curriculum_topics ────────────────────────────────

CREATE TABLE IF NOT EXISTS curriculum_topics (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board          TEXT NOT NULL,
  class_year     INTEGER NOT NULL CHECK (class_year BETWEEN 1 AND 12),
  subject        TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  chapter_name   TEXT NOT NULL,
  topic_number   INTEGER NOT NULL,
  topic_name     TEXT NOT NULL,
  UNIQUE (board, class_year, subject, chapter_number, topic_number)
);

CREATE INDEX IF NOT EXISTS idx_topics_lookup
  ON curriculum_topics(board, class_year, subject, chapter_number);

-- Seed: Class 10 Mathematics SCERT AP
INSERT INTO curriculum_topics
  (board, class_year, subject, chapter_number, chapter_name, topic_number, topic_name)
VALUES
  ('SCERT_AP',10,'Mathematics',1,'Real Numbers',1,'Euclid''s Division Lemma'),
  ('SCERT_AP',10,'Mathematics',1,'Real Numbers',2,'Fundamental Theorem of Arithmetic'),
  ('SCERT_AP',10,'Mathematics',1,'Real Numbers',3,'Irrational Numbers Proof'),
  ('SCERT_AP',10,'Mathematics',2,'Polynomials',1,'Zeros of a Polynomial'),
  ('SCERT_AP',10,'Mathematics',2,'Polynomials',2,'Relationship: Zeros and Coefficients'),
  ('SCERT_AP',10,'Mathematics',2,'Polynomials',3,'Division Algorithm'),
  ('SCERT_AP',10,'Mathematics',3,'Pair of Linear Equations',1,'Graphical Method'),
  ('SCERT_AP',10,'Mathematics',3,'Pair of Linear Equations',2,'Substitution Method'),
  ('SCERT_AP',10,'Mathematics',3,'Pair of Linear Equations',3,'Elimination Method'),
  ('SCERT_AP',10,'Mathematics',3,'Pair of Linear Equations',4,'Cross Multiplication'),
  ('SCERT_AP',10,'Mathematics',4,'Quadratic Equations',1,'Standard Form and Roots'),
  ('SCERT_AP',10,'Mathematics',4,'Quadratic Equations',2,'Factorisation Method'),
  ('SCERT_AP',10,'Mathematics',4,'Quadratic Equations',3,'Completing the Square'),
  ('SCERT_AP',10,'Mathematics',4,'Quadratic Equations',4,'Quadratic Formula'),
  ('SCERT_AP',10,'Mathematics',4,'Quadratic Equations',5,'Discriminant and Nature of Roots'),
  ('SCERT_AP',10,'Mathematics',5,'Arithmetic Progressions',1,'Introduction to AP'),
  ('SCERT_AP',10,'Mathematics',5,'Arithmetic Progressions',2,'nth Term of an AP'),
  ('SCERT_AP',10,'Mathematics',5,'Arithmetic Progressions',3,'Sum of First n Terms'),
  ('SCERT_AP',10,'Mathematics',6,'Triangles',1,'Similar Triangles'),
  ('SCERT_AP',10,'Mathematics',6,'Triangles',2,'Basic Proportionality Theorem'),
  ('SCERT_AP',10,'Mathematics',6,'Triangles',3,'Pythagoras Theorem')
ON CONFLICT DO NOTHING;

-- ── B5: DB functions for notification cron ───────────────

CREATE OR REPLACE FUNCTION get_attendance_due_periods(
  p_day_of_week TEXT,
  p_time_from   TIME,
  p_time_to     TIME,
  p_date        DATE
) RETURNS TABLE (
  slot_id UUID, teacher_id UUID, school_id TEXT,
  class_year INTEGER, section TEXT, subject TEXT,
  start_time TIME
) LANGUAGE sql STABLE AS $$
  SELECT
    ts.id        AS slot_id,
    ts.teacher_id,
    ts.school_id,
    ts.class_year,
    ts.section,
    ts.subject,
    ts.start_time
  FROM timetable_slots ts
  WHERE ts.day_of_week = p_day_of_week::day_of_week
    AND ts.start_time BETWEEN p_time_from AND p_time_to
    AND ts.period_type = 'REGULAR'
    AND ts.teacher_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM attendance a
      INNER JOIN student_yearly_progress syp
        ON syp.neura_id = a.neura_id
        AND syp.school_id = ts.school_id
        AND syp.class_year = ts.class_year
        AND syp.section = ts.section
      WHERE a.attendance_date = p_date
        AND a.school_id = ts.school_id
      LIMIT 1
    );
$$;

CREATE OR REPLACE FUNCTION get_coverage_due_periods(
  p_day_of_week TEXT,
  p_end_from    TIME,
  p_end_to      TIME,
  p_date        DATE
) RETURNS TABLE (
  slot_id UUID, teacher_id UUID, school_id TEXT,
  class_year INTEGER, section TEXT, subject TEXT,
  end_time TIME
) LANGUAGE sql STABLE AS $$
  SELECT
    ts.id        AS slot_id,
    ts.teacher_id,
    ts.school_id,
    ts.class_year,
    ts.section,
    ts.subject,
    ts.end_time
  FROM timetable_slots ts
  WHERE ts.day_of_week = p_day_of_week::day_of_week
    AND ts.end_time BETWEEN p_end_from AND p_end_to
    AND ts.period_type = 'REGULAR'
    AND ts.teacher_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM syllabus_coverage sc
      WHERE sc.teacher_id = ts.teacher_id
        AND sc.school_id  = ts.school_id
        AND sc.class_year = ts.class_year
        AND sc.section    = ts.section
        AND sc.subject    = ts.subject
        AND sc.coverage_date = p_date
        AND (sc.period_number = ts.period_number OR sc.period_number IS NULL)
    );
$$;
