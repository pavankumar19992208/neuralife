-- cs_grade_subjects: stores subject names per board+grade
-- Used by Content Studio when a grade has no subjects defined in the frontend constant
-- (primarily for grades 1-5 where primary subjects vary by school/board)

CREATE TABLE IF NOT EXISTS cs_grade_subjects (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  board      TEXT        NOT NULL,
  grade      INTEGER     NOT NULL CHECK (grade >= 1 AND grade <= 12),
  subject_en TEXT        NOT NULL,
  subject_te TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cs_grade_subjects_unique UNIQUE (board, grade, subject_en)
);

CREATE INDEX idx_cs_grade_subjects_board_grade ON cs_grade_subjects (board, grade);

GRANT SELECT, INSERT, UPDATE, DELETE ON cs_grade_subjects TO service_role;
