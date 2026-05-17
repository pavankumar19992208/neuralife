-- Migration 015: Exam module extensions
-- Adds AI insight + chapter_ids to exams, marks_entry_audit table

-- ─── 1. Extend exams table ────────────────────────────────────────────────────

ALTER TABLE exams ADD COLUMN IF NOT EXISTS ai_insight TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS chapter_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ─── 2. Marks entry audit ─────────────────────────────────────────────────────
-- Immutable log of every marks entry / edit action

CREATE TABLE IF NOT EXISTS marks_entry_audit (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id         UUID        NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  exam_subject_id UUID        NOT NULL REFERENCES exam_subjects(id) ON DELETE CASCADE,
  neura_id        TEXT        NOT NULL REFERENCES students(neura_id),
  action          TEXT        NOT NULL CHECK (action IN ('ENTERED', 'MODIFIED', 'DELETED')),
  old_marks       NUMERIC(6,2),
  new_marks       NUMERIC(6,2),
  entered_by      TEXT        NOT NULL,
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mea_exam     ON marks_entry_audit(exam_id);
CREATE INDEX IF NOT EXISTS idx_mea_student  ON marks_entry_audit(neura_id);

ALTER TABLE marks_entry_audit ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'marks_entry_audit' AND policyname = 'service_all_mea'
  ) THEN
    CREATE POLICY "service_all_mea" ON marks_entry_audit
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
