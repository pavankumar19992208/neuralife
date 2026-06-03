-- ============================================================
-- Migration 026: My Classes Demo Data + New Tables
-- Segment 04A - Teacher Mobile App
-- Purpose: Creates homework_submissions, doubts tables and seeds
--          comprehensive demo data for all class management features
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- A1: NEW TABLES
-- ──────────────────────────────────────────────────────────

-- homework_submissions table
CREATE TABLE IF NOT EXISTS homework_submissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id      UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  neura_id         TEXT NOT NULL REFERENCES students(neura_id),
  school_id        TEXT NOT NULL REFERENCES schools(id),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  submission_source TEXT NOT NULL DEFAULT 'PARENT_APP'
    CHECK (submission_source IN ('PARENT_APP','SMARTPAD','MANUAL')),
  submission_images TEXT[] DEFAULT '{}',  -- Supabase Storage URLs
  submitted_at     TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'NOT_SUBMITTED'
    CHECK (status IN ('NOT_SUBMITTED','SUBMITTED','LATE')),
  grading_status   TEXT NOT NULL DEFAULT 'UNGRADED'
    CHECK (grading_status IN ('UNGRADED','PERFECT','INCOMPLETE',
                               'NEEDS_ATTENTION','CUSTOM')),
  teacher_feedback TEXT,
  graded_at        TIMESTAMPTZ,
  graded_by        UUID REFERENCES teachers(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(homework_id, neura_id)
);

CREATE INDEX IF NOT EXISTS idx_hw_submissions_homework
  ON homework_submissions(homework_id);
CREATE INDEX IF NOT EXISTS idx_hw_submissions_student
  ON homework_submissions(neura_id, school_id);
CREATE INDEX IF NOT EXISTS idx_hw_submissions_grading
  ON homework_submissions(school_id, grading_status)
  WHERE grading_status = 'UNGRADED';

ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "hw_submissions_school" ON homework_submissions
  FOR ALL USING (school_id = auth_school_id() OR auth_role() = 'SUPER_ADMIN');

-- Add chapter_name to homework table for e-library mapping
ALTER TABLE homework
  ADD COLUMN IF NOT EXISTS chapter_name TEXT,
  ADD COLUMN IF NOT EXISTS topic_name   TEXT,
  ADD COLUMN IF NOT EXISTS reference_material_url TEXT;

-- doubts table
CREATE TABLE IF NOT EXISTS doubts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        TEXT NOT NULL REFERENCES schools(id),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  teacher_id       UUID NOT NULL REFERENCES teachers(id),
  neura_id         TEXT REFERENCES students(neura_id),  -- NULL = teacher-created
  class_year       INTEGER NOT NULL CHECK (class_year BETWEEN 1 AND 12),
  section          TEXT NOT NULL,
  subject          TEXT NOT NULL,
  question         TEXT NOT NULL,
  chapter_name     TEXT,
  topic_name       TEXT,
  page_reference   TEXT,       -- SmartPad page identifier
  paragraph_context TEXT,      -- surrounding text from SmartPad
  source           TEXT NOT NULL DEFAULT 'TEACHER_MANUAL'
    CHECK (source IN ('TEACHER_MANUAL','SMARTPAD','STUDENT_APP')),
  is_common        BOOLEAN NOT NULL DEFAULT FALSE,
  flagged_count    INTEGER NOT NULL DEFAULT 1,  -- incremented by SmartPad
  is_resolved      BOOLEAN NOT NULL DEFAULT FALSE,
  answer           TEXT,
  answered_at      TIMESTAMPTZ,
  answered_by      UUID REFERENCES teachers(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doubts_teacher
  ON doubts(teacher_id, is_resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doubts_class
  ON doubts(school_id, class_year, section, subject);
CREATE INDEX IF NOT EXISTS idx_doubts_common
  ON doubts(teacher_id, is_common) WHERE is_common = TRUE;

ALTER TABLE doubts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "doubts_school" ON doubts
  FOR ALL USING (school_id = auth_school_id() OR auth_role() = 'SUPER_ADMIN');

-- ──────────────────────────────────────────────────────────
-- A2: DEMO DATA — COMPREHENSIVE SEED
-- ──────────────────────────────────────────────────────────

-- Variables for consistent referencing
WITH
  demo_school AS (SELECT id FROM schools WHERE id = 'SCH-AP-DEMO-0001'),
  demo_teacher AS (SELECT id FROM teachers WHERE mobile = '9876543210'),
  demo_academic_year AS (SELECT id FROM academic_years
    WHERE school_id = 'SCH-AP-DEMO-0001' AND is_current = TRUE LIMIT 1)

-- ──── SECTION 1: Full Week Timetable for K. Suresh Kumar ────────

-- Clear existing timetable for demo teacher
DELETE FROM timetable_slots
WHERE school_id = 'SCH-AP-DEMO-0001'
  AND teacher_id = (SELECT id FROM teachers WHERE mobile = '9876543210');

INSERT INTO timetable_slots
  (school_id, academic_year_id, class_year, section, day_of_week,
   period_number, start_time, end_time, subject, teacher_id, period_type, room_number, subject_type)
SELECT
  'SCH-AP-DEMO-0001',
  (SELECT id FROM demo_academic_year),
  class_year, section, day_of_week, period_number, start_time, end_time,
  subject, (SELECT id FROM demo_teacher), period_type, room_number, subject_type
FROM (VALUES
  -- MONDAY
  (10, 'A', 'MON', 1, '08:30', '09:15', 'MATHEMATICS', 'REGULAR', 'Room 12', 'ACADEMIC'),
  (10, 'A', 'MON', 2, '09:15', '10:00', 'MATHEMATICS', 'REGULAR', 'Room 12', 'ACADEMIC'),
  (10, 'A', 'MON', -1, '10:00', '10:15', 'BREAK', 'BREAK', NULL, 'BREAK'),
  (10, 'A', 'MON', 3, '10:15', '11:00', 'MATHEMATICS', 'REGULAR', 'Room 12', 'ACADEMIC'),
  (10, 'A', 'MON', 4, '11:00', '11:45', 'FREE', 'FREE', 'Room 12', 'FREE'),
  (10, 'A', 'MON', -2, '11:45', '12:00', 'BREAK', 'BREAK', NULL, 'BREAK'),
  (10, 'A', 'MON', -100, '12:00', '13:00', 'LUNCH', 'LUNCH', NULL, 'LUNCH'),
  (10, 'A', 'MON', 5, '13:00', '13:45', 'MATHEMATICS', 'REGULAR', 'Room 12', 'ACADEMIC'),
  (10, 'A', 'MON', 6, '13:45', '14:30', 'MATHEMATICS', 'REGULAR', 'Room 12', 'ACADEMIC'),

  -- TUESDAY
  (9, 'B', 'TUE', 1, '08:30', '09:15', 'MATHEMATICS', 'REGULAR', 'Room 8', 'ACADEMIC'),
  (10, 'A', 'TUE', 2, '09:15', '10:00', 'MATHEMATICS', 'REGULAR', 'Room 12', 'ACADEMIC'),
  (10, 'A', 'TUE', -1, '10:00', '10:15', 'BREAK', 'BREAK', NULL, 'BREAK'),
  (10, 'A', 'TUE', 3, '10:15', '11:00', 'FREE', 'FREE', 'Room 12', 'FREE'),
  (8, 'A', 'TUE', 4, '11:00', '11:45', 'MATHEMATICS', 'REGULAR', 'Room 5', 'ACADEMIC'),
  (8, 'A', 'TUE', -2, '11:45', '12:00', 'BREAK', 'BREAK', NULL, 'BREAK'),
  (7, 'C', 'TUE', -100, '12:00', '13:00', 'LUNCH', 'LUNCH', NULL, 'LUNCH'),
  (7, 'C', 'TUE', 5, '13:00', '13:45', 'MATHEMATICS', 'REGULAR', 'Room 3', 'ACADEMIC'),
  (10, 'A', 'TUE', 6, '13:45', '14:30', 'MATHEMATICS', 'REGULAR', 'Room 12', 'ACADEMIC'),

  -- WEDNESDAY
  (8, 'A', 'WED', 1, '08:30', '09:15', 'MATHEMATICS', 'REGULAR', 'Room 5', 'ACADEMIC'),
  (10, 'A', 'WED', 2, '09:15', '10:00', 'MATHEMATICS', 'REGULAR', 'Room 12', 'ACADEMIC'),
  (10, 'A', 'WED', -1, '10:00', '10:15', 'BREAK', 'BREAK', NULL, 'BREAK'),
  (9, 'B', 'WED', 3, '10:15', '11:00', 'MATHEMATICS', 'REGULAR', 'Room 8', 'ACADEMIC'),
  (7, 'C', 'WED', 4, '11:00', '11:45', 'MATHEMATICS', 'REGULAR', 'Room 3', 'ACADEMIC'),
  (7, 'C', 'WED', -2, '11:45', '12:00', 'BREAK', 'BREAK', NULL, 'BREAK'),
  (7, 'C', 'WED', -100, '12:00', '13:00', 'LUNCH', 'LUNCH', NULL, 'LUNCH'),
  (7, 'C', 'WED', 5, '13:00', '13:45', 'FREE', 'FREE', 'Room 3', 'FREE'),
  (10, 'A', 'WED', 6, '13:45', '14:30', 'MATHEMATICS', 'REGULAR', 'Room 12', 'ACADEMIC'),

  -- THURSDAY
  (10, 'A', 'THU', 1, '08:30', '09:15', 'MATHEMATICS', 'REGULAR', 'Room 12', 'ACADEMIC'),
  (9, 'B', 'THU', 2, '09:15', '10:00', 'MATHEMATICS', 'REGULAR', 'Room 8', 'ACADEMIC'),
  (9, 'B', 'THU', -1, '10:00', '10:15', 'BREAK', 'BREAK', NULL, 'BREAK'),
  (8, 'A', 'THU', 3, '10:15', '11:00', 'MATHEMATICS', 'REGULAR', 'Room 5', 'ACADEMIC'),
  (10, 'A', 'THU', 4, '11:00', '11:45', 'MATHEMATICS', 'REGULAR', 'Room 12', 'ACADEMIC'),
  (10, 'A', 'THU', -2, '11:45', '12:00', 'BREAK', 'BREAK', NULL, 'BREAK'),
  (10, 'A', 'THU', -100, '12:00', '13:00', 'LUNCH', 'LUNCH', NULL, 'LUNCH'),
  (10, 'A', 'THU', 5, '13:00', '13:45', 'FREE', 'FREE', 'Room 12', 'FREE'),
  (7, 'C', 'THU', 6, '13:45', '14:30', 'MATHEMATICS', 'REGULAR', 'Room 3', 'ACADEMIC'),

  -- FRIDAY
  (7, 'C', 'FRI', 1, '08:30', '09:15', 'MATHEMATICS', 'REGULAR', 'Room 3', 'ACADEMIC'),
  (10, 'A', 'FRI', 2, '09:15', '10:00', 'MATHEMATICS', 'REGULAR', 'Room 12', 'ACADEMIC'),
  (10, 'A', 'FRI', -1, '10:00', '10:15', 'BREAK', 'BREAK', NULL, 'BREAK'),
  (9, 'B', 'FRI', 3, '10:15', '11:00', 'MATHEMATICS', 'REGULAR', 'Room 8', 'ACADEMIC'),
  (8, 'A', 'FRI', 4, '11:00', '11:45', 'MATHEMATICS', 'REGULAR', 'Room 5', 'ACADEMIC'),
  (8, 'A', 'FRI', -2, '11:45', '12:00', 'BREAK', 'BREAK', NULL, 'BREAK'),
  (8, 'A', 'FRI', -100, '12:00', '13:00', 'LUNCH', 'LUNCH', NULL, 'LUNCH'),
  (10, 'A', 'FRI', 5, '13:00', '13:45', 'MATHEMATICS', 'REGULAR', 'Room 12', 'ACADEMIC'),
  (10, 'A', 'FRI', 6, '13:45', '14:30', 'FREE', 'FREE', 'Room 12', 'FREE'),

  -- SATURDAY
  (10, 'A', 'SAT', 1, '08:30', '09:15', 'MATHEMATICS', 'REGULAR', 'Room 12', 'ACADEMIC'),
  (9, 'B', 'SAT', 2, '09:15', '10:00', 'MATHEMATICS', 'REGULAR', 'Room 8', 'ACADEMIC'),
  (9, 'B', 'SAT', -1, '10:00', '10:15', 'BREAK', 'BREAK', NULL, 'BREAK'),
  (8, 'A', 'SAT', 3, '10:15', '11:00', 'MATHEMATICS', 'REGULAR', 'Room 5', 'ACADEMIC'),
  (8, 'A', 'SAT', 4, '11:00', '11:45', 'FREE', 'FREE', 'Room 5', 'FREE'),
  (8, 'A', 'SAT', -2, '11:45', '12:00', 'BREAK', 'BREAK', NULL, 'BREAK'),
  (8, 'A', 'SAT', -100, '12:00', '13:00', 'LUNCH', 'LUNCH', NULL, 'LUNCH'),
  (8, 'A', 'SAT', 5, '13:00', '13:45', 'FREE', 'FREE', 'Room 5', 'FREE'),
  (8, 'A', 'SAT', 6, '13:45', '14:30', 'FREE', 'FREE', 'Room 5', 'FREE')
) AS slots(class_year, section, day_of_week, period_number, start_time, end_time, subject, period_type, room_number, subject_type)
ON CONFLICT DO NOTHING;

-- ──── SECTION 2: Students for 9-B, 8-A, 7-C ────────────────────

-- Insert students for Class 9-B
WITH new_students AS (
  INSERT INTO students
    (neura_id, school_id, full_name, gender, date_of_birth, admission_date, status, data_consent_given)
  VALUES
    ('NID-2025-AP-084401', 'SCH-AP-DEMO-0001', 'Priya Sharma', 'FEMALE', '2009-03-15', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084402', 'SCH-AP-DEMO-0001', 'Vikram Reddy', 'MALE', '2009-05-22', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084403', 'SCH-AP-DEMO-0001', 'Mounika Devi', 'FEMALE', '2009-01-30', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084404', 'SCH-AP-DEMO-0001', 'Santosh Kumar', 'MALE', '2009-07-11', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084405', 'SCH-AP-DEMO-0001', 'Harsha Vardhan', 'MALE', '2009-04-18', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084406', 'SCH-AP-DEMO-0001', 'Kavitha Rao', 'FEMALE', '2009-09-02', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084407', 'SCH-AP-DEMO-0001', 'Nikhil Goud', 'MALE', '2009-06-25', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084408', 'SCH-AP-DEMO-0001', 'Sreeja Patel', 'FEMALE', '2009-12-08', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084409', 'SCH-AP-DEMO-0001', 'Ranjith Kumar', 'MALE', '2009-10-14', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084410', 'SCH-AP-DEMO-0001', 'Deepika Singh', 'FEMALE', '2009-02-28', '2024-04-01', 'ACTIVE', TRUE)
  ON CONFLICT (neura_id) DO NOTHING
  RETURNING neura_id, school_id
)
INSERT INTO student_yearly_progress
  (neura_id, school_id, academic_year_id, class_year, section, roll_number, band, is_at_risk)
SELECT
  neura_id,
  school_id,
  (SELECT id FROM demo_academic_year),
  9,
  'B',
  ROW_NUMBER() OVER (ORDER BY neura_id),
  'GREEN',
  FALSE
FROM new_students
ON CONFLICT DO NOTHING;

-- Insert students for Class 8-A
WITH new_students AS (
  INSERT INTO students
    (neura_id, school_id, full_name, gender, date_of_birth, admission_date, status, data_consent_given)
  VALUES
    ('NID-2025-AP-084501', 'SCH-AP-DEMO-0001', 'Aditya Naidu', 'MALE', '2010-03-12', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084502', 'SCH-AP-DEMO-0001', 'Pallavi Krishna', 'FEMALE', '2010-08-19', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084503', 'SCH-AP-DEMO-0001', 'Mahesh Babu', 'MALE', '2010-01-07', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084504', 'SCH-AP-DEMO-0001', 'Sravani Reddy', 'FEMALE', '2010-11-24', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084505', 'SCH-AP-DEMO-0001', 'Ganesh Prasad', 'MALE', '2010-05-16', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084506', 'SCH-AP-DEMO-0001', 'Ananya Rao', 'FEMALE', '2010-09-03', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084507', 'SCH-AP-DEMO-0001', 'Kiran Kumar', 'MALE', '2010-12-11', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084508', 'SCH-AP-DEMO-0001', 'Bhavana Devi', 'FEMALE', '2010-06-28', '2024-04-01', 'ACTIVE', TRUE)
  ON CONFLICT (neura_id) DO NOTHING
  RETURNING neura_id, school_id
)
INSERT INTO student_yearly_progress
  (neura_id, school_id, academic_year_id, class_year, section, roll_number, band, is_at_risk)
SELECT
  neura_id,
  school_id,
  (SELECT id FROM demo_academic_year),
  8,
  'A',
  ROW_NUMBER() OVER (ORDER BY neura_id),
  'GREEN',
  FALSE
FROM new_students
ON CONFLICT DO NOTHING;

-- Insert students for Class 7-C
WITH new_students AS (
  INSERT INTO students
    (neura_id, school_id, full_name, gender, date_of_birth, admission_date, status, data_consent_given)
  VALUES
    ('NID-2025-AP-084601', 'SCH-AP-DEMO-0001', 'Rahul Yadav', 'MALE', '2011-04-05', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084602', 'SCH-AP-DEMO-0001', 'Pooja Sharma', 'FEMALE', '2011-07-21', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084603', 'SCH-AP-DEMO-0001', 'Suresh Goud', 'MALE', '2011-02-14', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084604', 'SCH-AP-DEMO-0001', 'Lakshmi Prasad', 'FEMALE', '2011-10-09', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084605', 'SCH-AP-DEMO-0001', 'Arjun Nair', 'MALE', '2011-08-17', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084606', 'SCH-AP-DEMO-0001', 'Divya Reddy', 'FEMALE', '2011-12-25', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084607', 'SCH-AP-DEMO-0001', 'Naveen Kumar', 'MALE', '2011-03-30', '2024-04-01', 'ACTIVE', TRUE),
    ('NID-2025-AP-084608', 'SCH-AP-DEMO-0001', 'Swati Patel', 'FEMALE', '2011-06-13', '2024-04-01', 'ACTIVE', TRUE)
  ON CONFLICT (neura_id) DO NOTHING
  RETURNING neura_id, school_id
)
INSERT INTO student_yearly_progress
  (neura_id, school_id, academic_year_id, class_year, section, roll_number, band, is_at_risk)
SELECT
  neura_id,
  school_id,
  (SELECT id FROM demo_academic_year),
  7,
  'C',
  ROW_NUMBER() OVER (ORDER BY neura_id),
  'GREEN',
  FALSE
FROM new_students
ON CONFLICT DO NOTHING;

-- ──── SECTION 3: Attendance Records (Past 7 School Days) ────────

-- Get list of 10-A students for attendance
WITH student_list AS (
  SELECT s.neura_id
  FROM students s
  JOIN student_yearly_progress syp ON s.neura_id = syp.neura_id
  WHERE syp.school_id = 'SCH-AP-DEMO-0001'
    AND syp.class_year = 10
    AND syp.section = 'A'
    AND s.status = 'ACTIVE'
),
demo_dates AS (
  SELECT
    (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '7 days' as day_7_ago,
    (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '6 days' as day_6_ago,
    (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '5 days' as day_5_ago,
    (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '4 days' as day_4_ago,
    (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '3 days' as day_3_ago,
    (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '2 days' as day_2_ago,
    (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '1 day' as yesterday
)

-- Day 7 ago: All 30 present
INSERT INTO attendance
  (neura_id, school_id, attendance_date, status, marked_by, signature_hash, device_id, created_at)
SELECT
  sl.neura_id,
  'SCH-AP-DEMO-0001',
  dd.day_7_ago,
  'PRESENT',
  (SELECT id FROM demo_teacher),
  encode(digest(concat((SELECT id FROM demo_teacher)::text, '|10|A|', dd.day_7_ago::text, '|DEMO-DEVICE-001'), 'sha256'), 'hex'),
  'DEMO-DEVICE-001',
  dd.day_7_ago + time '09:00:00'
FROM student_list sl, demo_dates dd
ON CONFLICT DO NOTHING;

-- Day 6 ago: 29 present, 1 absent (Arun Sharma - AT_RISK)
INSERT INTO attendance
  (neura_id, school_id, attendance_date, status, marked_by, signature_hash, device_id, created_at)
SELECT
  sl.neura_id,
  'SCH-AP-DEMO-0001',
  dd.day_6_ago,
  CASE WHEN sl.neura_id = 'NID-2025-AP-084303' THEN 'ABSENT' ELSE 'PRESENT' END,
  (SELECT id FROM demo_teacher),
  encode(digest(concat((SELECT id FROM demo_teacher)::text, '|10|A|', dd.day_6_ago::text, '|DEMO-DEVICE-001'), 'sha256'), 'hex'),
  'DEMO-DEVICE-001',
  dd.day_6_ago + time '09:00:00'
FROM student_list sl, demo_dates dd
ON CONFLICT DO NOTHING;

-- Day 5 ago: 28 present, 2 absent
INSERT INTO attendance
  (neura_id, school_id, attendance_date, status, marked_by, signature_hash, device_id, created_at)
SELECT
  sl.neura_id,
  'SCH-AP-DEMO-0001',
  dd.day_5_ago,
  CASE
    WHEN sl.neura_id = 'NID-2025-AP-084303' THEN 'ABSENT'
    WHEN sl.neura_id = 'NID-2025-AP-084295' THEN 'ABSENT'
    ELSE 'PRESENT'
  END,
  (SELECT id FROM demo_teacher),
  encode(digest(concat((SELECT id FROM demo_teacher)::text, '|10|A|', dd.day_5_ago::text, '|DEMO-DEVICE-001'), 'sha256'), 'hex'),
  'DEMO-DEVICE-001',
  dd.day_5_ago + time '09:00:00'
FROM student_list sl, demo_dates dd
ON CONFLICT DO NOTHING;

-- Day 4 ago: 29 present, 1 late (Arun Sharma late)
INSERT INTO attendance
  (neura_id, school_id, attendance_date, status, marked_by, signature_hash, device_id, created_at)
SELECT
  sl.neura_id,
  'SCH-AP-DEMO-0001',
  dd.day_4_ago,
  CASE WHEN sl.neura_id = 'NID-2025-AP-084303' THEN 'LATE' ELSE 'PRESENT' END,
  (SELECT id FROM demo_teacher),
  encode(digest(concat((SELECT id FROM demo_teacher)::text, '|10|A|', dd.day_4_ago::text, '|DEMO-DEVICE-001'), 'sha256'), 'hex'),
  'DEMO-DEVICE-001',
  dd.day_4_ago + time '09:00:00'
FROM student_list sl, demo_dates dd
ON CONFLICT DO NOTHING;

-- Day 3 ago: 30 present
INSERT INTO attendance
  (neura_id, school_id, attendance_date, status, marked_by, signature_hash, device_id, created_at)
SELECT
  sl.neura_id,
  'SCH-AP-DEMO-0001',
  dd.day_3_ago,
  'PRESENT',
  (SELECT id FROM demo_teacher),
  encode(digest(concat((SELECT id FROM demo_teacher)::text, '|10|A|', dd.day_3_ago::text, '|DEMO-DEVICE-001'), 'sha256'), 'hex'),
  'DEMO-DEVICE-001',
  dd.day_3_ago + time '09:00:00'
FROM student_list sl, demo_dates dd
ON CONFLICT DO NOTHING;

-- Day 2 ago: 29 present, 1 absent (different student)
INSERT INTO attendance
  (neura_id, school_id, attendance_date, status, marked_by, signature_hash, device_id, created_at)
SELECT
  sl.neura_id,
  'SCH-AP-DEMO-0001',
  dd.day_2_ago,
  CASE WHEN sl.neura_id = 'NID-2025-AP-084292' THEN 'ABSENT' ELSE 'PRESENT' END,
  (SELECT id FROM demo_teacher),
  encode(digest(concat((SELECT id FROM demo_teacher)::text, '|10|A|', dd.day_2_ago::text, '|DEMO-DEVICE-001'), 'sha256'), 'hex'),
  'DEMO-DEVICE-001',
  dd.day_2_ago + time '09:00:00'
FROM student_list sl, demo_dates dd
ON CONFLICT DO NOTHING;

-- Yesterday: 28 present, 1 absent (Arun Sharma absent AGAIN), 1 late
INSERT INTO attendance
  (neura_id, school_id, attendance_date, status, marked_by, signature_hash, device_id, created_at)
SELECT
  sl.neura_id,
  'SCH-AP-DEMO-0001',
  dd.yesterday,
  CASE
    WHEN sl.neura_id = 'NID-2025-AP-084303' THEN 'ABSENT'
    WHEN sl.neura_id = 'NID-2025-AP-084298' THEN 'LATE'
    ELSE 'PRESENT'
  END,
  (SELECT id FROM demo_teacher),
  encode(digest(concat((SELECT id FROM demo_teacher)::text, '|10|A|', dd.yesterday::text, '|DEMO-DEVICE-001'), 'sha256'), 'hex'),
  'DEMO-DEVICE-001',
  dd.yesterday + time '09:00:00'
FROM student_list sl, demo_dates dd
ON CONFLICT DO NOTHING;

-- Add attendance for 9-B (3 days)
WITH student_list_9b AS (
  SELECT s.neura_id
  FROM students s
  JOIN student_yearly_progress syp ON s.neura_id = syp.neura_id
  WHERE syp.school_id = 'SCH-AP-DEMO-0001'
    AND syp.class_year = 9
    AND syp.section = 'B'
    AND s.status = 'ACTIVE'
),
demo_dates AS (
  SELECT
    (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '3 days' as day_3_ago,
    (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '2 days' as day_2_ago,
    (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '1 day' as yesterday
)

-- Day 3 ago: 22 present, 2 absent
INSERT INTO attendance
  (neura_id, school_id, attendance_date, status, marked_by, signature_hash, device_id, created_at)
SELECT
  sl.neura_id,
  'SCH-AP-DEMO-0001',
  dd.day_3_ago,
  CASE
    WHEN ROW_NUMBER() OVER (ORDER BY sl.neura_id) <= 2 THEN 'ABSENT'
    ELSE 'PRESENT'
  END,
  (SELECT id FROM demo_teacher),
  encode(digest(concat((SELECT id FROM demo_teacher)::text, '|9|B|', dd.day_3_ago::text, '|DEMO-DEVICE-001'), 'sha256'), 'hex'),
  'DEMO-DEVICE-001',
  dd.day_3_ago + time '09:00:00'
FROM student_list_9b sl, demo_dates dd
ON CONFLICT DO NOTHING;

-- Day 2 ago: 24 present (all)
INSERT INTO attendance
  (neura_id, school_id, attendance_date, status, marked_by, signature_hash, device_id, created_at)
SELECT
  sl.neura_id,
  'SCH-AP-DEMO-0001',
  dd.day_2_ago,
  'PRESENT',
  (SELECT id FROM demo_teacher),
  encode(digest(concat((SELECT id FROM demo_teacher)::text, '|9|B|', dd.day_2_ago::text, '|DEMO-DEVICE-001'), 'sha256'), 'hex'),
  'DEMO-DEVICE-001',
  dd.day_2_ago + time '09:00:00'
FROM student_list_9b sl, demo_dates dd
ON CONFLICT DO NOTHING;

-- Yesterday: 23 present, 1 late
INSERT INTO attendance
  (neura_id, school_id, attendance_date, status, marked_by, signature_hash, device_id, created_at)
SELECT
  sl.neura_id,
  'SCH-AP-DEMO-0001',
  dd.yesterday,
  CASE
    WHEN ROW_NUMBER() OVER (ORDER BY sl.neura_id) = 1 THEN 'LATE'
    ELSE 'PRESENT'
  END,
  (SELECT id FROM demo_teacher),
  encode(digest(concat((SELECT id FROM demo_teacher)::text, '|9|B|', dd.yesterday::text, '|DEMO-DEVICE-001'), 'sha256'), 'hex'),
  'DEMO-DEVICE-001',
  dd.yesterday + time '09:00:00'
FROM student_list_9b sl, demo_dates dd
ON CONFLICT DO NOTHING;

-- ──── SECTION 4: Homework Assignments ────────────────────────────

INSERT INTO homework
  (school_id, academic_year_id, teacher_id, class_year, section, subject,
   title, instructions, homework_type, due_date, chapter_name, topic_name)
VALUES
  -- HW1: due 3 days ago
  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   10, 'A', 'MATHEMATICS',
   'Quadratic Equations Practice Set',
   'Solve problems 1-15 from Chapter 4. Show all working steps.',
   'PROBLEM_SET',
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '3 days',
   'Quadratic Equations', 'Quadratic Formula'),

  -- HW2: due 8 days ago
  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   10, 'A', 'MATHEMATICS',
   'Real Numbers - Euclid Division Problems',
   'Apply Euclid division lemma to find HCF. Problems 1-10.',
   'WRITTEN',
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '8 days',
   'Real Numbers', 'Euclid''s Division Lemma'),

  -- HW3: due today
  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   10, 'A', 'MATHEMATICS',
   'Polynomials - Find the Zeros',
   'Find all zeros for the given polynomials. Show factorisation.',
   'PROBLEM_SET',
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date,
   'Polynomials', 'Zeros of a Polynomial'),

  -- HW4: due 3 days from now
  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   10, 'A', 'MATHEMATICS',
   'Arithmetic Progressions - nth Term',
   'Find the nth term and sum of first n terms. Complete examples 1-8.',
   'WRITTEN',
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date + interval '3 days',
   'Arithmetic Progressions', 'nth Term of an AP'),

  -- HW5: due 2 days ago
  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   10, 'A', 'MATHEMATICS',
   'Pair of Linear Equations - Graphical Method',
   'Plot on graph paper and find intersection. Problems 1-5.',
   'DRAWING',
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '2 days',
   'Pair of Linear Equations', 'Graphical Method'),

  -- HW6: due 5 days ago
  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   10, 'A', 'MATHEMATICS',
   'Similar Triangles - Proof Problems',
   'Prove triangles similar using AA, SAS, SSS criteria. Questions 1-8.',
   'WRITTEN',
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '5 days',
   'Triangles', 'Similar Triangles')
ON CONFLICT DO NOTHING;

-- ──── SECTION 5: Homework Submissions ────────────────────────────

-- Get homework IDs and student list for submissions
WITH hw_assignments AS (
  SELECT id, title, due_date,
    CASE
      WHEN due_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '8 days' THEN 'HW2'
      WHEN due_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '5 days' THEN 'HW6'
      WHEN due_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '3 days' THEN 'HW1'
      WHEN due_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '2 days' THEN 'HW5'
      WHEN due_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date THEN 'HW3'
      ELSE 'HW4'
    END as hw_code
  FROM homework
  WHERE teacher_id = (SELECT id FROM demo_teacher)
    AND class_year = 10 AND section = 'A'
),
student_list AS (
  SELECT s.neura_id, ROW_NUMBER() OVER (ORDER BY syp.roll_number) as student_num
  FROM students s
  JOIN student_yearly_progress syp ON s.neura_id = syp.neura_id
  WHERE syp.school_id = 'SCH-AP-DEMO-0001'
    AND syp.class_year = 10
    AND syp.section = 'A'
    AND s.status = 'ACTIVE'
)

-- Create all NOT_SUBMITTED entries first
INSERT INTO homework_submissions
  (homework_id, neura_id, school_id, academic_year_id, submission_source, status, grading_status)
SELECT
  hw.id,
  sl.neura_id,
  'SCH-AP-DEMO-0001',
  (SELECT id FROM demo_academic_year),
  'PARENT_APP',
  'NOT_SUBMITTED',
  'UNGRADED'
FROM hw_assignments hw
CROSS JOIN student_list sl
ON CONFLICT (homework_id, neura_id) DO NOTHING;

-- Update submissions for HW2 (oldest, all done)
WITH hw2 AS (SELECT id FROM hw_assignments WHERE hw_code = 'HW2')
UPDATE homework_submissions
SET
  status = 'SUBMITTED',
  submitted_at = (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '8 days' + time '20:00:00',
  submission_images = ARRAY['https://placehold.co/800x600/1e3a8a/white?text=HW+Page+1', 'https://placehold.co/800x600/1e3a8a/white?text=HW+Page+2'],
  grading_status = CASE
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 14 THEN 'PERFECT'
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 22 THEN 'NEEDS_ATTENTION'
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 26 THEN 'INCOMPLETE'
    ELSE 'UNGRADED'
  END,
  graded_at = CASE
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 26
    THEN (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '7 days' + time '14:30:00'
    ELSE NULL
  END,
  graded_by = CASE
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 26
    THEN (SELECT id FROM demo_teacher)
    ELSE NULL
  END,
  teacher_feedback = CASE
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 14 THEN 'Excellent work!'
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 22 THEN 'Good effort, review step 3.'
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 26 THEN 'Incomplete solutions. Please redo.'
    ELSE NULL
  END
WHERE homework_id = (SELECT id FROM hw2);

-- Update submissions for HW6 (5 days old, mostly done)
WITH hw6 AS (SELECT id FROM hw_assignments WHERE hw_code = 'HW6')
UPDATE homework_submissions
SET
  status = CASE
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 29 THEN 'SUBMITTED'
    ELSE 'NOT_SUBMITTED'
  END,
  submitted_at = CASE
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 29
    THEN (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '4 days' + time '19:15:00'
    ELSE NULL
  END,
  submission_images = CASE
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 29
    THEN ARRAY['https://placehold.co/800x600/1e3a8a/white?text=Triangle+Proof+1', 'https://placehold.co/800x600/1e3a8a/white?text=Triangle+Proof+2']
    ELSE '{}'
  END,
  grading_status = CASE
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 22 THEN 'PERFECT'
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 29 THEN 'UNGRADED'
    ELSE 'UNGRADED'
  END
WHERE homework_id = (SELECT id FROM hw6);

-- Update submissions for HW5 (2 days old, most done)
WITH hw5 AS (SELECT id FROM hw_assignments WHERE hw_code = 'HW5')
UPDATE homework_submissions
SET
  status = CASE
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 24 THEN 'SUBMITTED'
    WHEN neura_id = 'NID-2025-AP-084303' THEN 'NOT_SUBMITTED'  -- Arun Sharma AT_RISK
    ELSE 'NOT_SUBMITTED'
  END,
  submitted_at = CASE
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 24
    THEN (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '1 day' + time '21:30:00'
    ELSE NULL
  END,
  submission_images = CASE
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 24
    THEN ARRAY['https://placehold.co/800x600/1e3a8a/white?text=Graph+Method+1']
    ELSE '{}'
  END
WHERE homework_id = (SELECT id FROM hw5);

-- Update submissions for HW1 (3 days old, most done)
WITH hw1 AS (SELECT id FROM hw_assignments WHERE hw_code = 'HW1')
UPDATE homework_submissions
SET
  status = CASE
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 27 THEN 'SUBMITTED'
    ELSE 'NOT_SUBMITTED'
  END,
  submitted_at = CASE
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 27
    THEN (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '2 days' + time '18:45:00'
    ELSE NULL
  END,
  submission_images = CASE
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 27
    THEN ARRAY['https://placehold.co/800x600/1e3a8a/white?text=Quadratic+Solutions']
    ELSE '{}'
  END,
  grading_status = CASE
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 15 THEN 'PERFECT'
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 27 THEN 'UNGRADED'
    ELSE 'UNGRADED'
  END
WHERE homework_id = (SELECT id FROM hw1);

-- Update submissions for HW3 (due today - in progress)
WITH hw3 AS (SELECT id FROM hw_assignments WHERE hw_code = 'HW3')
UPDATE homework_submissions
SET
  status = CASE
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 18 THEN 'SUBMITTED'
    ELSE 'NOT_SUBMITTED'
  END,
  submitted_at = CASE
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 18
    THEN (NOW() AT TIME ZONE 'Asia/Kolkata')::date + time '07:30:00'
    ELSE NULL
  END,
  submission_images = CASE
    WHEN (SELECT student_num FROM student_list WHERE neura_id = homework_submissions.neura_id) <= 18
    THEN ARRAY['https://placehold.co/800x600/1e3a8a/white?text=Polynomial+Zeros']
    ELSE '{}'
  END
WHERE homework_id = (SELECT id FROM hw3);

-- ──── SECTION 6: Exam Schedules & Results ────────────────────────

-- Insert exam schedules
INSERT INTO exams
  (school_id, academic_year_id, created_by, exam_name, exam_type, class_year, section,
   subject, total_marks, passing_marks, exam_date, status)
VALUES
  -- EXAM 1: FA1 (2 months ago)
  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   'FA1', 'FORMATIVE', 10, 'A', 'MATHEMATICS', 40, 14,
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '2 months',
   'RESULTS_PUBLISHED'),

  -- EXAM 2: FA2 (1 month ago)
  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   'FA2', 'FORMATIVE', 10, 'A', 'MATHEMATICS', 40, 14,
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '1 month',
   'RESULTS_PARTIAL'),

  -- EXAM 3: SA1 (upcoming)
  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   'SA1', 'SUMMATIVE', 10, 'A', 'MATHEMATICS', 100, 35,
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date + interval '2 months',
   'SCHEDULED'),

  -- EXAM 4: Class Test 1 (3 weeks ago)
  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   'Class Test 1', 'UNIT', 10, 'A', 'MATHEMATICS', 20, 7,
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '3 weeks',
   'RESULTS_PUBLISHED'),

  -- EXAM 5: FA1 for 9-B (6 weeks ago)
  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   'FA1', 'FORMATIVE', 9, 'B', 'MATHEMATICS', 40, 14,
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '6 weeks',
   'RESULTS_PUBLISHED')
ON CONFLICT DO NOTHING;

-- Insert exam results for FA1 10-A (all 30 students)
WITH fa1_exam AS (
  SELECT id FROM exams
  WHERE exam_name = 'FA1' AND class_year = 10 AND section = 'A'
    AND subject = 'MATHEMATICS'
),
student_list AS (
  SELECT s.neura_id, ROW_NUMBER() OVER (ORDER BY syp.roll_number) as student_num
  FROM students s
  JOIN student_yearly_progress syp ON s.neura_id = syp.neura_id
  WHERE syp.school_id = 'SCH-AP-DEMO-0001'
    AND syp.class_year = 10
    AND syp.section = 'A'
    AND s.status = 'ACTIVE'
)
INSERT INTO exam_results
  (exam_id, neura_id, marks_obtained, is_absent, created_by)
SELECT
  (SELECT id FROM fa1_exam),
  sl.neura_id,
  CASE
    WHEN sl.student_num <= 8 THEN 35 + (sl.student_num % 6)  -- 35-40 marks
    WHEN sl.student_num <= 20 THEN 28 + (sl.student_num % 7)  -- 28-34 marks
    WHEN sl.student_num <= 27 THEN 18 + (sl.student_num % 10) -- 18-27 marks
    WHEN sl.neura_id = 'NID-2025-AP-084303' THEN 12  -- Arun Sharma lowest
    ELSE 10 + (sl.student_num % 8)  -- 10-17 marks
  END,
  FALSE,
  (SELECT id FROM demo_teacher)
FROM student_list sl
ON CONFLICT DO NOTHING;

-- Insert exam results for Class Test 1 10-A (all 30 students)
WITH test_exam AS (
  SELECT id FROM exams
  WHERE exam_name = 'Class Test 1' AND class_year = 10 AND section = 'A'
),
student_list AS (
  SELECT s.neura_id, ROW_NUMBER() OVER (ORDER BY syp.roll_number) as student_num
  FROM students s
  JOIN student_yearly_progress syp ON s.neura_id = syp.neura_id
  WHERE syp.school_id = 'SCH-AP-DEMO-0001'
    AND syp.class_year = 10
    AND syp.section = 'A'
    AND s.status = 'ACTIVE'
)
INSERT INTO exam_results
  (exam_id, neura_id, marks_obtained, is_absent, created_by)
SELECT
  (SELECT id FROM test_exam),
  sl.neura_id,
  CASE
    WHEN sl.student_num <= 8 THEN 16 + (sl.student_num % 5)  -- 16-20 marks
    WHEN sl.student_num <= 20 THEN 12 + (sl.student_num % 5)  -- 12-16 marks
    WHEN sl.student_num <= 27 THEN 8 + (sl.student_num % 5)   -- 8-12 marks
    WHEN sl.neura_id = 'NID-2025-AP-084303' THEN 5   -- Arun Sharma low again
    ELSE 6 + (sl.student_num % 4)   -- 6-9 marks
  END,
  FALSE,
  (SELECT id FROM demo_teacher)
FROM student_list sl
ON CONFLICT DO NOTHING;

-- Insert PARTIAL results for FA2 (22/30 students)
WITH fa2_exam AS (
  SELECT id FROM exams
  WHERE exam_name = 'FA2' AND class_year = 10 AND section = 'A'
    AND subject = 'MATHEMATICS'
),
student_list AS (
  SELECT s.neura_id, ROW_NUMBER() OVER (ORDER BY syp.roll_number) as student_num
  FROM students s
  JOIN student_yearly_progress syp ON s.neura_id = syp.neura_id
  WHERE syp.school_id = 'SCH-AP-DEMO-0001'
    AND syp.class_year = 10
    AND syp.section = 'A'
    AND s.status = 'ACTIVE'
)
INSERT INTO exam_results
  (exam_id, neura_id, marks_obtained, is_absent, created_by)
SELECT
  (SELECT id FROM fa2_exam),
  sl.neura_id,
  CASE
    WHEN sl.student_num <= 7 THEN 34 + (sl.student_num % 7)   -- 34-40 marks
    WHEN sl.student_num <= 15 THEN 29 + (sl.student_num % 6)  -- 29-34 marks
    WHEN sl.student_num <= 22 THEN 20 + (sl.student_num % 9)  -- 20-28 marks
    ELSE NULL  -- No results for remaining 8 students
  END,
  CASE WHEN sl.student_num <= 22 THEN FALSE ELSE NULL END,
  CASE WHEN sl.student_num <= 22 THEN (SELECT id FROM demo_teacher) ELSE NULL END
FROM student_list sl
WHERE sl.student_num <= 30  -- Insert for all, but only first 22 have marks
ON CONFLICT DO NOTHING;

-- ──── SECTION 7: Syllabus Coverage ───────────────────────────────

INSERT INTO syllabus_coverage
  (school_id, academic_year_id, teacher_id, class_year, section, subject,
   coverage_date, period_number, chapter_name, topic_name, coverage_status, completion_pct, notes)
VALUES
  -- Chapter 1 (Real Numbers) - COMPLETED
  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   10, 'A', 'MATHEMATICS',
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '6 weeks', 1,
   'Real Numbers', 'Euclid''s Division Lemma', 'COVERED', 100, 'Good participation'),

  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   10, 'A', 'MATHEMATICS',
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '5 weeks 5 days', 1,
   'Real Numbers', 'Fundamental Theorem of Arithmetic', 'COVERED', 100, 'Clear examples given'),

  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   10, 'A', 'MATHEMATICS',
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '5 weeks', 1,
   'Real Numbers', 'Irrational Numbers Proof', 'PARTIAL', 75, 'Need more practice'),

  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   10, 'A', 'MATHEMATICS',
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '4 weeks 4 days', 1,
   'Real Numbers', 'Irrational Numbers Proof', 'COVERED', 100, 'Completed with examples'),

  -- Chapter 2 (Polynomials) - MOSTLY DONE
  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   10, 'A', 'MATHEMATICS',
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '4 weeks', 1,
   'Polynomials', 'Zeros of a Polynomial', 'COVERED', 100, 'Interactive session'),

  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   10, 'A', 'MATHEMATICS',
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '3 weeks 4 days', 1,
   'Polynomials', 'Relationship: Zeros and Coefficients', 'COVERED', 100, 'Formula memorized'),

  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   10, 'A', 'MATHEMATICS',
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '3 weeks', 1,
   'Polynomials', 'Division Algorithm', 'PARTIAL', 60, 'Need more examples'),

  -- Chapter 3 (Pair of Linear Equations) - IN PROGRESS
  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   10, 'A', 'MATHEMATICS',
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '2 weeks', 1,
   'Pair of Linear Equations', 'Graphical Method', 'COVERED', 100, 'Graph paper exercises'),

  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   10, 'A', 'MATHEMATICS',
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '1 week 4 days', 1,
   'Pair of Linear Equations', 'Substitution Method', 'COVERED', 100, 'Step by step approach'),

  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   10, 'A', 'MATHEMATICS',
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '1 day', 1,
   'Pair of Linear Equations', 'Elimination Method', 'PARTIAL', 50, 'Started today, continue tomorrow'),

  -- Also insert for 9-B (fewer records)
  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   9, 'B', 'MATHEMATICS',
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '2 weeks', 1,
   'Pair of Linear Equations', 'Graphical Method', 'COVERED', 100, 'Class 9 level'),

  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   9, 'B', 'MATHEMATICS',
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '1 week', 1,
   'Pair of Linear Equations', 'Substitution Method', 'COVERED', 100, 'Good understanding'),

  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   9, 'B', 'MATHEMATICS',
   (NOW() AT TIME ZONE 'Asia/Kolkata')::date - interval '3 days', 1,
   'Pair of Linear Equations', 'Elimination Method', 'PARTIAL', 40, 'Needs more practice')
ON CONFLICT DO NOTHING;

-- ──── SECTION 8: Doubts ──────────────────────────────────────────

INSERT INTO doubts
  (school_id, academic_year_id, teacher_id, neura_id, class_year, section, subject,
   question, chapter_name, topic_name, source, is_common, flagged_count, is_resolved,
   answer, answered_at, answered_by, created_at)
VALUES
  -- TEACHER_MANUAL doubts (5)
  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   NULL, 10, 'A', 'MATHEMATICS',
   'How do we know which root to choose in quadratic formula?',
   'Quadratic Equations', 'Quadratic Formula', 'TEACHER_MANUAL', TRUE, 8, FALSE,
   NULL, NULL, NULL,
   (NOW() AT TIME ZONE 'Asia/Kolkata') - interval '2 days'),

  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   NULL, 10, 'A', 'MATHEMATICS',
   'What is the difference between HCF and LCM?',
   'Real Numbers', 'Euclid''s Division Lemma', 'TEACHER_MANUAL', FALSE, 1, TRUE,
   'HCF is the largest common factor, LCM is the smallest common multiple. HCF divides both numbers, LCM is divisible by both.',
   (NOW() AT TIME ZONE 'Asia/Kolkata') - interval '1 week',
   (SELECT id FROM demo_teacher),
   (NOW() AT TIME ZONE 'Asia/Kolkata') - interval '1 week 2 days'),

  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   NULL, 10, 'A', 'MATHEMATICS',
   'Why does the discriminant determine the nature of roots?',
   'Quadratic Equations', 'Discriminant and Nature of Roots', 'TEACHER_MANUAL', TRUE, 6, FALSE,
   NULL, NULL, NULL,
   (NOW() AT TIME ZONE 'Asia/Kolkata') - interval '1 day'),

  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   NULL, 10, 'A', 'MATHEMATICS',
   'Can a polynomial have more zeros than its degree?',
   'Polynomials', 'Zeros of a Polynomial', 'TEACHER_MANUAL', FALSE, 2, FALSE,
   NULL, NULL, NULL,
   (NOW() AT TIME ZONE 'Asia/Kolkata') - interval '3 days'),

  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   NULL, 10, 'A', 'MATHEMATICS',
   'How do we verify that a zero is correct?',
   'Polynomials', 'Zeros of a Polynomial', 'TEACHER_MANUAL', FALSE, 3, TRUE,
   'Substitute the value back into the polynomial. If result is 0, it''s verified.',
   (NOW() AT TIME ZONE 'Asia/Kolkata') - interval '2 days',
   (SELECT id FROM demo_teacher),
   (NOW() AT TIME ZONE 'Asia/Kolkata') - interval '4 days'),

  -- SMARTPAD simulated doubts (7)
  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   'NID-2025-AP-084303', 10, 'A', 'MATHEMATICS',  -- Arun Sharma (AT_RISK student)
   'Step 2 in solving x² - 5x + 6 = 0 — sign error',
   'Quadratic Equations', 'Factorisation Method', 'SMARTPAD', FALSE, 1, FALSE,
   NULL, NULL, NULL,
   (NOW() AT TIME ZONE 'Asia/Kolkata')),

  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   'NID-2025-AP-084291', 10, 'A', 'MATHEMATICS',  -- Ravi Kumar (good student)
   'Understanding nth term formula derivation in AP',
   'Arithmetic Progressions', 'nth Term of an AP', 'SMARTPAD', FALSE, 1, FALSE,
   NULL, NULL, NULL,
   (NOW() AT TIME ZONE 'Asia/Kolkata') - interval '1 day'),

  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   'NID-2025-AP-084295', 10, 'A', 'MATHEMATICS',
   'Sign error in quadratic formula — denominator confusion',
   'Quadratic Equations', 'Quadratic Formula', 'SMARTPAD', FALSE, 4, FALSE,
   NULL, NULL, NULL,
   (NOW() AT TIME ZONE 'Asia/Kolkata') - interval '1 day'),

  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   'NID-2025-AP-084298', 9, 'B', 'MATHEMATICS',
   'Graphical method intersection point not clear',
   'Pair of Linear Equations', 'Graphical Method', 'SMARTPAD', FALSE, 2, FALSE,
   NULL, NULL, NULL,
   (NOW() AT TIME ZONE 'Asia/Kolkata') - interval '2 days'),

  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   'NID-2025-AP-084301', 10, 'A', 'MATHEMATICS',
   'Division algorithm remainder calculation wrong',
   'Polynomials', 'Division Algorithm', 'SMARTPAD', FALSE, 1, FALSE,
   NULL, NULL, NULL,
   (NOW() AT TIME ZONE 'Asia/Kolkata') - interval '3 days'),

  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   'NID-2025-AP-084294', 8, 'A', 'MATHEMATICS',
   'Basic algebra steps missing in linear equations',
   'Pair of Linear Equations', 'Substitution Method', 'SMARTPAD', FALSE, 1, FALSE,
   NULL, NULL, NULL,
   (NOW() AT TIME ZONE 'Asia/Kolkata') - interval '4 days'),

  ('SCH-AP-DEMO-0001', (SELECT id FROM demo_academic_year), (SELECT id FROM demo_teacher),
   'NID-2025-AP-084305', 7, 'C', 'MATHEMATICS',
   'Factorization steps not following order',
   'Quadratic Equations', 'Factorisation Method', 'SMARTPAD', FALSE, 3, FALSE,
   NULL, NULL, NULL,
   (NOW() AT TIME ZONE 'Asia/Kolkata') - interval '2 days')
ON CONFLICT DO NOTHING;

-- Mark quadratic formula doubts as common
UPDATE doubts
SET is_common = TRUE
WHERE teacher_id = (SELECT id FROM demo_teacher)
  AND topic_name = 'Quadratic Formula'
  AND is_resolved = FALSE;