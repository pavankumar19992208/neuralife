-- ─── 1. Per-day school hours configuration ────────────────────────────────────
CREATE TABLE school_period_config (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id                TEXT NOT NULL REFERENCES schools(id),
  academic_year_id         UUID NOT NULL REFERENCES academic_years(id),
  day_of_week              TEXT NOT NULL,
  is_working_day           BOOLEAN DEFAULT TRUE,
  school_start_time        TIME,
  school_end_time          TIME,
  period_duration_minutes  INTEGER DEFAULT 45,
  short_break_after_periods INTEGER[] DEFAULT '{}',
  short_break_duration_min INTEGER DEFAULT 10,
  lunch_after_period       INTEGER,
  lunch_duration_minutes   INTEGER DEFAULT 30,
  UNIQUE(school_id, academic_year_id, day_of_week)
);

-- ─── 2. Assembly configuration ────────────────────────────────────────────────
CREATE TABLE school_assembly_config (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id            TEXT NOT NULL REFERENCES schools(id),
  academic_year_id     UUID NOT NULL REFERENCES academic_years(id),
  include_in_schedule  BOOLEAN DEFAULT TRUE,
  day_of_week          TEXT DEFAULT 'MON',
  duration_minutes     INTEGER DEFAULT 20,
  position             TEXT DEFAULT 'BEFORE_FIRST',
  UNIQUE(school_id, academic_year_id)
);

-- ─── 3. Subject/ECA weekly requirements per class ─────────────────────────────
CREATE TABLE timetable_requirements (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id               TEXT NOT NULL REFERENCES schools(id),
  academic_year_id        UUID NOT NULL REFERENCES academic_years(id),
  class_year              INTEGER NOT NULL CHECK (class_year BETWEEN 1 AND 12),
  subject                 TEXT NOT NULL,
  subject_type            TEXT NOT NULL DEFAULT 'ACADEMIC',
  eca_category            TEXT,
  periods_per_week        INTEGER NOT NULL DEFAULT 1,
  needs_double_period     BOOLEAN DEFAULT FALSE,
  double_period_count     INTEGER DEFAULT 0,
  preferred_position      TEXT DEFAULT 'ANY',
  teacher_id              UUID REFERENCES teachers(id),
  display_name            TEXT,
  color_hex               TEXT DEFAULT '#6366f1',
  UNIQUE(school_id, academic_year_id, class_year, subject)
);

-- ─── 4. Timetable generation run history ─────────────────────────────────────
CREATE TABLE timetable_generations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         TEXT NOT NULL REFERENCES schools(id),
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id),
  generated_at      TIMESTAMPTZ DEFAULT NOW(),
  generated_by      UUID REFERENCES teachers(id),
  status            TEXT DEFAULT 'DRAFT',
  conflict_count    INTEGER DEFAULT 0,
  total_entries     INTEGER DEFAULT 0,
  generation_seed   TEXT
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE school_period_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_assembly_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_generations  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_all_school_period_config"
  ON school_period_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_school_assembly_config"
  ON school_assembly_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_timetable_requirements"
  ON timetable_requirements FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_timetable_generations"
  ON timetable_generations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── also add is_double_period + double_period_end_time to timetable_slots ──
ALTER TABLE timetable_slots
  ADD COLUMN IF NOT EXISTS is_double_period BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS double_period_end_time TIME,
  ADD COLUMN IF NOT EXISTS subject_type TEXT DEFAULT 'ACADEMIC';
