-- Migration 014: Exam Results + NeuraCoin
-- Replaces the old exam_schedules/exam_results schema with the new Layer 7 model.
-- Creates exam_results (computed at publish), neuracoin_ledger, adds neuracoin_balance to students.

-- ─── 1. Remove legacy unused tables ─────────────────────────────────────────
-- The initial schema had exam_schedules + a basic exam_results tied to it.
-- They were never used in any application code. Drop and replace cleanly.

DROP TABLE IF EXISTS exam_results CASCADE;
DROP TABLE IF EXISTS exam_schedules CASCADE;

-- ─── 2. exam_results (new) ────────────────────────────────────────────────────
-- Populated when a principal publishes an exam. Immutable after creation.

CREATE TABLE IF NOT EXISTS exam_results (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id               UUID           NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  neura_id              TEXT           NOT NULL REFERENCES students(neura_id),
  total_marks_obtained  NUMERIC(8,2)   NOT NULL,
  total_max_marks       INTEGER        NOT NULL,
  percentage            NUMERIC(5,2)   NOT NULL,
  grade                 TEXT           NOT NULL,
  class_rank            INTEGER,
  overall_rank          INTEGER,
  is_pass               BOOLEAN        NOT NULL,
  subject_results       JSONB          NOT NULL DEFAULT '[]',
  neuracoin_earned      INTEGER        NOT NULL DEFAULT 0,
  teacher_remarks       TEXT,
  computed_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (exam_id, neura_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_results_exam     ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student  ON exam_results(neura_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_grade    ON exam_results(exam_id, grade);

-- ─── 3. neuracoin_ledger ──────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE neuracoin_transaction_type AS ENUM (
    'EXAM_REWARD',
    'ATTENDANCE_REWARD',
    'HOMEWORK_REWARD',
    'SUBJECT_TOPPER_BONUS',
    'MANUAL_CREDIT',
    'MANUAL_DEDUCTION',
    'REDEMPTION'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS neuracoin_ledger (
  id                UUID                         PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id          TEXT                         NOT NULL REFERENCES students(neura_id),
  school_id         TEXT                         NOT NULL REFERENCES schools(id),
  transaction_type  neuracoin_transaction_type   NOT NULL,
  amount            INTEGER                      NOT NULL,
  reference_id      UUID,
  reference_type    TEXT,
  description       TEXT                         NOT NULL,
  created_at        TIMESTAMPTZ                  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_neuracoin_student ON neuracoin_ledger(neura_id);
CREATE INDEX IF NOT EXISTS idx_neuracoin_school  ON neuracoin_ledger(school_id);

-- ─── 4. Add neuracoin_balance to students ────────────────────────────────────

ALTER TABLE students ADD COLUMN IF NOT EXISTS neuracoin_balance INTEGER NOT NULL DEFAULT 0 CHECK (neuracoin_balance >= 0);

-- ─── 5. RLS Policies ─────────────────────────────────────────────────────────

ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE neuracoin_ledger ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'exam_results' AND policyname = 'service_all_exam_results'
  ) THEN
    CREATE POLICY "service_all_exam_results" ON exam_results FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'neuracoin_ledger' AND policyname = 'service_all_neuracoin'
  ) THEN
    CREATE POLICY "service_all_neuracoin" ON neuracoin_ledger FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── 6. RPC: increment_neuracoin_balance ─────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_neuracoin_balance(p_neura_id TEXT, p_amount INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE students
  SET neuracoin_balance = GREATEST(0, neuracoin_balance + p_amount)
  WHERE neura_id = p_neura_id;
END;
$$;
