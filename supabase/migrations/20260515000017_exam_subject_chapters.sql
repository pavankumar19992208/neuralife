-- Migration 017: exam_subject_chapters join table
-- Links cs_chapters to exam_subjects (which chapters a subject-exam tests)

CREATE TABLE IF NOT EXISTS exam_subject_chapters (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_subject_id  UUID NOT NULL REFERENCES exam_subjects(id) ON DELETE CASCADE,
  chapter_id       UUID NOT NULL REFERENCES cs_chapters(id) ON DELETE CASCADE,
  UNIQUE (exam_subject_id, chapter_id)
);

ALTER TABLE exam_subject_chapters ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'exam_subject_chapters' AND policyname = 'service_all_exam_sub_chapters'
  ) THEN
    CREATE POLICY "service_all_exam_sub_chapters"
      ON exam_subject_chapters FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
