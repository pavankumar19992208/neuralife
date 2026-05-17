-- Migration 018: Batch exam scheduling
-- Adds per-subject exam date and schedule_type to exams

ALTER TABLE exam_subjects
  ADD COLUMN IF NOT EXISTS exam_date DATE;

ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS schedule_type TEXT NOT NULL DEFAULT 'INDIVIDUAL',
  ADD CONSTRAINT exams_schedule_type_check CHECK (schedule_type IN ('INDIVIDUAL', 'BATCH'));
