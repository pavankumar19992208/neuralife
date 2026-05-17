-- Migration 016: Add class_year + section to exam_results
-- Fixes: getExamResults was joining student_yearly_progress via a non-existent FK.
-- Store class_year/section at publish time so the results table is self-contained.

ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS class_year INTEGER;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS section    TEXT;
