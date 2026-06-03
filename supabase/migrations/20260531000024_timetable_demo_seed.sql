-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 024 — Timetable Demo Seed + Homework Demo Data
-- Purpose: Inject a complete 5-day weekly timetable for Vikas High School demo
--          so the Teacher Mobile App Home Screen has real data to display.
--          Also seeds homework entries for K. Suresh Kumar's classes.
-- ─────────────────────────────────────────────────────────────────────────────
-- Teacher IDs:
--   T1 = 11000000-0000-0000-0000-000000000001  K. Suresh Kumar   MATHEMATICS
--   T2 = 11000000-0000-0000-0000-000000000002  P. Venkat Rao     PHYSICAL_SCIENCE
--   T3 = 11000000-0000-0000-0000-000000000003  S. Lakshmi Devi   ENGLISH
--   T4 = 11000000-0000-0000-0000-000000000004  M. Rama Krishna   TELUGU
--   T5 = 11000000-0000-0000-0000-000000000005  T. Anand Babu     SOCIAL_STUDIES
--   T6 = 11000000-0000-0000-0000-000000000006  R. Priya Kumari   BIOLOGICAL_SCIENCE
--
-- Sections seeded: 10-A (Suresh's class), 10-B, 9-A
-- Rooms: 10-A → 101, 10-B → 102, 9-A → 201
--
-- CONSTRAINT: for any (day, period_number) pair, each teacher_id appears at most
--             once across all class sections on that day.
--
-- Period times:
--   MON (assembly day): P0=08:30-08:50  P1=08:50-09:35  P2=09:35-10:20
--                       BREAK=10:20-10:30  P3=10:30-11:15  P4=11:15-12:00
--                       LUNCH=12:00-12:30  P5=12:30-13:15  P6=13:15-14:00
--                       P7=14:00-14:45
--   TUE-FRI:            P1=08:30-09:15  P2=09:15-10:00
--                       BREAK=10:00-10:10  P3=10:10-10:55  P4=10:55-11:40
--                       LUNCH=11:40-12:10  P5=12:10-12:55  P6=12:55-13:40
--                       P7=13:40-14:25
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Timetable generation record ─────────────────────────────────────────────
INSERT INTO timetable_generations
  (school_id, academic_year_id, generated_by, status, conflict_count, total_entries)
VALUES
  ('SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   '11000000-0000-0000-0000-000000000001', 'CONFIRMED', 0, 138)
ON CONFLICT DO NOTHING;

-- ─── Period configuration (school hours) ─────────────────────────────────────
INSERT INTO school_period_config
  (school_id, academic_year_id, day_of_week, is_working_day,
   school_start_time, school_end_time, period_duration_minutes,
   short_break_after_periods, short_break_duration_min,
   lunch_after_period, lunch_duration_minutes)
VALUES
  ('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890','MON',TRUE,'08:30','14:45',45,ARRAY[2],10,4,30),
  ('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890','TUE',TRUE,'08:30','14:25',45,ARRAY[2],10,4,30),
  ('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890','WED',TRUE,'08:30','14:25',45,ARRAY[2],10,4,30),
  ('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890','THU',TRUE,'08:30','14:25',45,ARRAY[2],10,4,30),
  ('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890','FRI',TRUE,'08:30','14:25',45,ARRAY[2],10,4,30),
  ('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890','SAT',FALSE,'08:30','13:00',45,ARRAY[2],10,NULL,0)
ON CONFLICT (school_id, academic_year_id, day_of_week) DO NOTHING;

-- ─── Assembly configuration ───────────────────────────────────────────────────
INSERT INTO school_assembly_config
  (school_id, academic_year_id, include_in_schedule, day_of_week, duration_minutes, position)
VALUES
  ('SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', TRUE, 'MON', 20, 'BEFORE_FIRST')
ON CONFLICT (school_id, academic_year_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- TIMETABLE SLOTS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO timetable_slots
  (school_id, academic_year_id, class_year, section, day_of_week,
   period_number, start_time, end_time, subject, teacher_id, period_type, room_number, subject_type)
VALUES

-- ═══════════════════════════════════════════════════════════════════════════
-- MONDAY — Class 10-A  (schedule: Asm P0, P1=T1, P2=T3, BRK, P3=T2, P4=T4, LCH, P5=T5, P6=T6, P7=FREE)
-- ═══════════════════════════════════════════════════════════════════════════
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','MON',  0,'08:30','08:50','ASSEMBLY',    NULL,                                         'ASSEMBLY','Hall','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','MON',  1,'08:50','09:35','MATHEMATICS', '11000000-0000-0000-0000-000000000001',        'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','MON',  2,'09:35','10:20','ENGLISH',     '11000000-0000-0000-0000-000000000003',        'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','MON', -2,'10:20','10:30','BREAK',       NULL,                                         'BREAK',   NULL, 'BREAK'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','MON',  3,'10:30','11:15','PHYSICAL_SCIENCE','11000000-0000-0000-0000-000000000002',   'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','MON',  4,'11:15','12:00','TELUGU',      '11000000-0000-0000-0000-000000000004',        'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','MON',-104,'12:00','12:30','LUNCH',      NULL,                                         'LUNCH',   NULL, 'LUNCH'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','MON',  5,'12:30','13:15','SOCIAL_STUDIES','11000000-0000-0000-0000-000000000005',     'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','MON',  6,'13:15','14:00','BIOLOGICAL_SCIENCE','11000000-0000-0000-0000-000000000006', 'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','MON',  7,'14:00','14:45','FREE',        NULL,                                         'FREE',    '101','FREE'),

-- MONDAY — Class 10-B  (P0=Asm, P1=T3, P2=T1, BRK, P3=T4, P4=T2, LCH, P5=T6, P6=T5, P7=FREE)
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','MON',  0,'08:30','08:50','ASSEMBLY',    NULL,                                         'ASSEMBLY','Hall','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','MON',  1,'08:50','09:35','ENGLISH',     '11000000-0000-0000-0000-000000000003',        'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','MON',  2,'09:35','10:20','MATHEMATICS', '11000000-0000-0000-0000-000000000001',        'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','MON', -2,'10:20','10:30','BREAK',       NULL,                                         'BREAK',   NULL, 'BREAK'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','MON',  3,'10:30','11:15','TELUGU',      '11000000-0000-0000-0000-000000000004',        'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','MON',  4,'11:15','12:00','PHYSICAL_SCIENCE','11000000-0000-0000-0000-000000000002',   'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','MON',-104,'12:00','12:30','LUNCH',      NULL,                                         'LUNCH',   NULL, 'LUNCH'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','MON',  5,'12:30','13:15','BIOLOGICAL_SCIENCE','11000000-0000-0000-0000-000000000006', 'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','MON',  6,'13:15','14:00','SOCIAL_STUDIES','11000000-0000-0000-0000-000000000005',     'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','MON',  7,'14:00','14:45','FREE',        NULL,                                         'FREE',    '102','FREE'),

-- MONDAY — Class 9-A  (P0=Asm, P1=T4, P2=T2, BRK, P3=T1, P4=T6, LCH, P5=T3, P6=T1, P7=T5)
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','MON',  0,'08:30','08:50','ASSEMBLY',    NULL,                                         'ASSEMBLY','Hall','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','MON',  1,'08:50','09:35','TELUGU',      '11000000-0000-0000-0000-000000000004',        'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','MON',  2,'09:35','10:20','PHYSICAL_SCIENCE','11000000-0000-0000-0000-000000000002',   'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','MON', -2,'10:20','10:30','BREAK',       NULL,                                         'BREAK',   NULL, 'BREAK'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','MON',  3,'10:30','11:15','MATHEMATICS', '11000000-0000-0000-0000-000000000001',        'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','MON',  4,'11:15','12:00','BIOLOGICAL_SCIENCE','11000000-0000-0000-0000-000000000006', 'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','MON',-104,'12:00','12:30','LUNCH',      NULL,                                         'LUNCH',   NULL, 'LUNCH'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','MON',  5,'12:30','13:15','ENGLISH',     '11000000-0000-0000-0000-000000000003',        'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','MON',  6,'13:15','14:00','MATHEMATICS', '11000000-0000-0000-0000-000000000001',        'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','MON',  7,'14:00','14:45','SOCIAL_STUDIES','11000000-0000-0000-0000-000000000005',     'REGULAR', '201','ACADEMIC'),

-- ═══════════════════════════════════════════════════════════════════════════
-- TUESDAY — Class 10-A  (P1=T4, P2=T1, BRK, P3=T3, P4=T6, LCH, P5=T2, P6=T5, P7=FREE)
-- ═══════════════════════════════════════════════════════════════════════════
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','TUE',  1,'08:30','09:15','TELUGU',      '11000000-0000-0000-0000-000000000004',        'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','TUE',  2,'09:15','10:00','MATHEMATICS', '11000000-0000-0000-0000-000000000001',        'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','TUE', -2,'10:00','10:10','BREAK',       NULL,                                         'BREAK',   NULL, 'BREAK'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','TUE',  3,'10:10','10:55','ENGLISH',     '11000000-0000-0000-0000-000000000003',        'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','TUE',  4,'10:55','11:40','BIOLOGICAL_SCIENCE','11000000-0000-0000-0000-000000000006', 'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','TUE',-104,'11:40','12:10','LUNCH',      NULL,                                         'LUNCH',   NULL, 'LUNCH'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','TUE',  5,'12:10','12:55','PHYSICAL_SCIENCE','11000000-0000-0000-0000-000000000002',   'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','TUE',  6,'12:55','13:40','SOCIAL_STUDIES','11000000-0000-0000-0000-000000000005',     'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','TUE',  7,'13:40','14:25','FREE',        NULL,                                         'FREE',    '101','FREE'),

-- TUESDAY — Class 10-B  (P1=T1, P2=T3, BRK, P3=T6, P4=T4, LCH, P5=T5, P6=T2, P7=FREE)
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','TUE',  1,'08:30','09:15','MATHEMATICS', '11000000-0000-0000-0000-000000000001',        'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','TUE',  2,'09:15','10:00','ENGLISH',     '11000000-0000-0000-0000-000000000003',        'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','TUE', -2,'10:00','10:10','BREAK',       NULL,                                         'BREAK',   NULL, 'BREAK'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','TUE',  3,'10:10','10:55','BIOLOGICAL_SCIENCE','11000000-0000-0000-0000-000000000006', 'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','TUE',  4,'10:55','11:40','TELUGU',      '11000000-0000-0000-0000-000000000004',        'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','TUE',-104,'11:40','12:10','LUNCH',      NULL,                                         'LUNCH',   NULL, 'LUNCH'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','TUE',  5,'12:10','12:55','SOCIAL_STUDIES','11000000-0000-0000-0000-000000000005',     'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','TUE',  6,'12:55','13:40','PHYSICAL_SCIENCE','11000000-0000-0000-0000-000000000002',   'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','TUE',  7,'13:40','14:25','FREE',        NULL,                                         'FREE',    '102','FREE'),

-- TUESDAY — Class 9-A  (P1=T3, P2=T4, BRK, P3=T1, P4=T2, LCH, P5=T6, P6=T1, P7=T5)
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','TUE',  1,'08:30','09:15','ENGLISH',     '11000000-0000-0000-0000-000000000003',        'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','TUE',  2,'09:15','10:00','TELUGU',      '11000000-0000-0000-0000-000000000004',        'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','TUE', -2,'10:00','10:10','BREAK',       NULL,                                         'BREAK',   NULL, 'BREAK'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','TUE',  3,'10:10','10:55','MATHEMATICS', '11000000-0000-0000-0000-000000000001',        'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','TUE',  4,'10:55','11:40','PHYSICAL_SCIENCE','11000000-0000-0000-0000-000000000002',   'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','TUE',-104,'11:40','12:10','LUNCH',      NULL,                                         'LUNCH',   NULL, 'LUNCH'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','TUE',  5,'12:10','12:55','BIOLOGICAL_SCIENCE','11000000-0000-0000-0000-000000000006', 'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','TUE',  6,'12:55','13:40','MATHEMATICS', '11000000-0000-0000-0000-000000000001',        'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','TUE',  7,'13:40','14:25','SOCIAL_STUDIES','11000000-0000-0000-0000-000000000005',     'REGULAR', '201','ACADEMIC'),

-- ═══════════════════════════════════════════════════════════════════════════
-- WEDNESDAY — Class 10-A  (P1=T2, P2=T4, BRK, P3=T1, P4=T6, LCH, P5=T3, P6=T1, P7=T5)
-- ═══════════════════════════════════════════════════════════════════════════
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','WED',  1,'08:30','09:15','PHYSICAL_SCIENCE','11000000-0000-0000-0000-000000000002',   'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','WED',  2,'09:15','10:00','TELUGU',      '11000000-0000-0000-0000-000000000004',        'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','WED', -2,'10:00','10:10','BREAK',       NULL,                                         'BREAK',   NULL, 'BREAK'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','WED',  3,'10:10','10:55','MATHEMATICS', '11000000-0000-0000-0000-000000000001',        'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','WED',  4,'10:55','11:40','BIOLOGICAL_SCIENCE','11000000-0000-0000-0000-000000000006', 'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','WED',-104,'11:40','12:10','LUNCH',      NULL,                                         'LUNCH',   NULL, 'LUNCH'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','WED',  5,'12:10','12:55','ENGLISH',     '11000000-0000-0000-0000-000000000003',        'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','WED',  6,'12:55','13:40','MATHEMATICS', '11000000-0000-0000-0000-000000000001',        'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','WED',  7,'13:40','14:25','SOCIAL_STUDIES','11000000-0000-0000-0000-000000000005',     'REGULAR', '101','ACADEMIC'),

-- WEDNESDAY — Class 10-B  (P1=T4, P2=T2, BRK, P3=T3, P4=T1, LCH, P5=T6, P6=T5, P7=FREE)
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','WED',  1,'08:30','09:15','TELUGU',      '11000000-0000-0000-0000-000000000004',        'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','WED',  2,'09:15','10:00','PHYSICAL_SCIENCE','11000000-0000-0000-0000-000000000002',   'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','WED', -2,'10:00','10:10','BREAK',       NULL,                                         'BREAK',   NULL, 'BREAK'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','WED',  3,'10:10','10:55','ENGLISH',     '11000000-0000-0000-0000-000000000003',        'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','WED',  4,'10:55','11:40','MATHEMATICS', '11000000-0000-0000-0000-000000000001',        'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','WED',-104,'11:40','12:10','LUNCH',      NULL,                                         'LUNCH',   NULL, 'LUNCH'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','WED',  5,'12:10','12:55','BIOLOGICAL_SCIENCE','11000000-0000-0000-0000-000000000006', 'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','WED',  6,'12:55','13:40','SOCIAL_STUDIES','11000000-0000-0000-0000-000000000005',     'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','WED',  7,'13:40','14:25','FREE',        NULL,                                         'FREE',    '102','FREE'),

-- WEDNESDAY — Class 9-A  (P1=T1, P2=T3, BRK, P3=T4, P4=T2, LCH, P5=T5, P6=T6, P7=FREE)
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','WED',  1,'08:30','09:15','MATHEMATICS', '11000000-0000-0000-0000-000000000001',        'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','WED',  2,'09:15','10:00','ENGLISH',     '11000000-0000-0000-0000-000000000003',        'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','WED', -2,'10:00','10:10','BREAK',       NULL,                                         'BREAK',   NULL, 'BREAK'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','WED',  3,'10:10','10:55','TELUGU',      '11000000-0000-0000-0000-000000000004',        'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','WED',  4,'10:55','11:40','PHYSICAL_SCIENCE','11000000-0000-0000-0000-000000000002',   'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','WED',-104,'11:40','12:10','LUNCH',      NULL,                                         'LUNCH',   NULL, 'LUNCH'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','WED',  5,'12:10','12:55','SOCIAL_STUDIES','11000000-0000-0000-0000-000000000005',     'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','WED',  6,'12:55','13:40','BIOLOGICAL_SCIENCE','11000000-0000-0000-0000-000000000006', 'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','WED',  7,'13:40','14:25','FREE',        NULL,                                         'FREE',    '201','FREE'),

-- ═══════════════════════════════════════════════════════════════════════════
-- THURSDAY — Class 10-A  (P1=T3, P2=T5, BRK, P3=T4, P4=T1, LCH, P5=T6, P6=T2, P7=T1)
-- ═══════════════════════════════════════════════════════════════════════════
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','THU',  1,'08:30','09:15','ENGLISH',     '11000000-0000-0000-0000-000000000003',        'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','THU',  2,'09:15','10:00','SOCIAL_STUDIES','11000000-0000-0000-0000-000000000005',     'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','THU', -2,'10:00','10:10','BREAK',       NULL,                                         'BREAK',   NULL, 'BREAK'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','THU',  3,'10:10','10:55','TELUGU',      '11000000-0000-0000-0000-000000000004',        'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','THU',  4,'10:55','11:40','MATHEMATICS', '11000000-0000-0000-0000-000000000001',        'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','THU',-104,'11:40','12:10','LUNCH',      NULL,                                         'LUNCH',   NULL, 'LUNCH'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','THU',  5,'12:10','12:55','BIOLOGICAL_SCIENCE','11000000-0000-0000-0000-000000000006', 'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','THU',  6,'12:55','13:40','PHYSICAL_SCIENCE','11000000-0000-0000-0000-000000000002',   'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','THU',  7,'13:40','14:25','MATHEMATICS', '11000000-0000-0000-0000-000000000001',        'REGULAR', '101','ACADEMIC'),

-- THURSDAY — Class 10-B  (P1=T2, P2=T3, BRK, P3=T1, P4=T5, LCH, P5=T4, P6=T6, P7=FREE)
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','THU',  1,'08:30','09:15','PHYSICAL_SCIENCE','11000000-0000-0000-0000-000000000002',   'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','THU',  2,'09:15','10:00','ENGLISH',     '11000000-0000-0000-0000-000000000003',        'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','THU', -2,'10:00','10:10','BREAK',       NULL,                                         'BREAK',   NULL, 'BREAK'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','THU',  3,'10:10','10:55','MATHEMATICS', '11000000-0000-0000-0000-000000000001',        'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','THU',  4,'10:55','11:40','SOCIAL_STUDIES','11000000-0000-0000-0000-000000000005',     'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','THU',-104,'11:40','12:10','LUNCH',      NULL,                                         'LUNCH',   NULL, 'LUNCH'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','THU',  5,'12:10','12:55','TELUGU',      '11000000-0000-0000-0000-000000000004',        'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','THU',  6,'12:55','13:40','BIOLOGICAL_SCIENCE','11000000-0000-0000-0000-000000000006', 'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','THU',  7,'13:40','14:25','FREE',        NULL,                                         'FREE',    '102','FREE'),

-- THURSDAY — Class 9-A  (P1=T5, P2=T2, BRK, P3=T3, P4=T4, LCH, P5=T1, P6=T3, P7=T5)
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','THU',  1,'08:30','09:15','SOCIAL_STUDIES','11000000-0000-0000-0000-000000000005',     'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','THU',  2,'09:15','10:00','PHYSICAL_SCIENCE','11000000-0000-0000-0000-000000000002',   'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','THU', -2,'10:00','10:10','BREAK',       NULL,                                         'BREAK',   NULL, 'BREAK'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','THU',  3,'10:10','10:55','ENGLISH',     '11000000-0000-0000-0000-000000000003',        'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','THU',  4,'10:55','11:40','TELUGU',      '11000000-0000-0000-0000-000000000004',        'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','THU',-104,'11:40','12:10','LUNCH',      NULL,                                         'LUNCH',   NULL, 'LUNCH'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','THU',  5,'12:10','12:55','MATHEMATICS', '11000000-0000-0000-0000-000000000001',        'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','THU',  6,'12:55','13:40','BIOLOGICAL_SCIENCE','11000000-0000-0000-0000-000000000006', 'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','THU',  7,'13:40','14:25','SOCIAL_STUDIES','11000000-0000-0000-0000-000000000005',     'REGULAR', '201','ACADEMIC'),

-- ═══════════════════════════════════════════════════════════════════════════
-- FRIDAY — Class 10-A  (P1=T6, P2=T1, BRK, P3=T5, P4=T3, LCH, P5=T2, P6=T4, P7=T1)
-- ═══════════════════════════════════════════════════════════════════════════
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','FRI',  1,'08:30','09:15','BIOLOGICAL_SCIENCE','11000000-0000-0000-0000-000000000006', 'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','FRI',  2,'09:15','10:00','MATHEMATICS', '11000000-0000-0000-0000-000000000001',        'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','FRI', -2,'10:00','10:10','BREAK',       NULL,                                         'BREAK',   NULL, 'BREAK'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','FRI',  3,'10:10','10:55','SOCIAL_STUDIES','11000000-0000-0000-0000-000000000005',     'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','FRI',  4,'10:55','11:40','ENGLISH',     '11000000-0000-0000-0000-000000000003',        'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','FRI',-104,'11:40','12:10','LUNCH',      NULL,                                         'LUNCH',   NULL, 'LUNCH'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','FRI',  5,'12:10','12:55','PHYSICAL_SCIENCE','11000000-0000-0000-0000-000000000002',   'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','FRI',  6,'12:55','13:40','TELUGU',      '11000000-0000-0000-0000-000000000004',        'REGULAR', '101','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'A','FRI',  7,'13:40','14:25','MATHEMATICS', '11000000-0000-0000-0000-000000000001',        'REGULAR', '101','ACADEMIC'),

-- FRIDAY — Class 10-B  (P1=T5, P2=T6, BRK, P3=T2, P4=T1, LCH, P5=T3, P6=FREE, P7=T4)
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','FRI',  1,'08:30','09:15','SOCIAL_STUDIES','11000000-0000-0000-0000-000000000005',     'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','FRI',  2,'09:15','10:00','BIOLOGICAL_SCIENCE','11000000-0000-0000-0000-000000000006', 'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','FRI', -2,'10:00','10:10','BREAK',       NULL,                                         'BREAK',   NULL, 'BREAK'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','FRI',  3,'10:10','10:55','PHYSICAL_SCIENCE','11000000-0000-0000-0000-000000000002',   'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','FRI',  4,'10:55','11:40','MATHEMATICS', '11000000-0000-0000-0000-000000000001',        'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','FRI',-104,'11:40','12:10','LUNCH',      NULL,                                         'LUNCH',   NULL, 'LUNCH'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','FRI',  5,'12:10','12:55','ENGLISH',     '11000000-0000-0000-0000-000000000003',        'REGULAR', '102','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','FRI',  6,'12:55','13:40','FREE',        NULL,                                         'FREE',    '102','FREE'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',10,'B','FRI',  7,'13:40','14:25','TELUGU',      '11000000-0000-0000-0000-000000000004',        'REGULAR', '102','ACADEMIC'),

-- FRIDAY — Class 9-A  (P1=T2, P2=T5, BRK, P3=T6, P4=T4, LCH, P5=T1, P6=T3, P7=FREE)
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','FRI',  1,'08:30','09:15','PHYSICAL_SCIENCE','11000000-0000-0000-0000-000000000002',   'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','FRI',  2,'09:15','10:00','SOCIAL_STUDIES','11000000-0000-0000-0000-000000000005',     'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','FRI', -2,'10:00','10:10','BREAK',       NULL,                                         'BREAK',   NULL, 'BREAK'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','FRI',  3,'10:10','10:55','BIOLOGICAL_SCIENCE','11000000-0000-0000-0000-000000000006', 'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','FRI',  4,'10:55','11:40','TELUGU',      '11000000-0000-0000-0000-000000000004',        'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','FRI',-104,'11:40','12:10','LUNCH',      NULL,                                         'LUNCH',   NULL, 'LUNCH'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','FRI',  5,'12:10','12:55','MATHEMATICS', '11000000-0000-0000-0000-000000000001',        'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','FRI',  6,'12:55','13:40','ENGLISH',     '11000000-0000-0000-0000-000000000003',        'REGULAR', '201','ACADEMIC'),
('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,'A','FRI',  7,'13:40','14:25','FREE',        NULL,                                         'FREE',    '201','FREE')

ON CONFLICT (academic_year_id, school_id, class_year, section, day_of_week, period_number) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- HOMEWORK DEMO DATA
-- Gives K. Suresh Kumar real KPI values on the home screen.
-- 2 assignments due today (2026-05-31), 1 upcoming, 1 overdue.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO homework
  (school_id, academic_year_id, teacher_id, class_year, section, subject,
   title, instructions, homework_type, due_date)
VALUES
  -- Due today → shows in homeworkDueToday KPI
  ('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   '11000000-0000-0000-0000-000000000001',
   10,'A','MATHEMATICS',
   'Quadratic Equations — Practice Set',
   'Solve exercises 1–15 from Chapter 4. Show all working steps.',
   'PROBLEM_SET','2026-05-31'),

  ('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   '11000000-0000-0000-0000-000000000001',
   10,'B','MATHEMATICS',
   'Arithmetic Progressions — Review',
   'Complete the worksheet handed in class. Section A is mandatory.',
   'WRITTEN','2026-05-31'),

  -- Upcoming
  ('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   '11000000-0000-0000-0000-000000000001',
   9,'A','MATHEMATICS',
   'Triangles — Properties and Proofs',
   'Write formal proofs for theorems 1–3. Use proper notation.',
   'WRITTEN','2026-06-03'),

  -- Overdue (past due, not yet today) — triggers HOMEWORK_NOT_SUBMITTED alert
  ('SCH-AP-DEMO-0001','a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   '11000000-0000-0000-0000-000000000001',
   10,'A','MATHEMATICS',
   'Real Numbers — Euclid''s Algorithm',
   'Complete page 12–14 exercises. Show prime factorisation.',
   'PROBLEM_SET','2026-05-28')

ON CONFLICT DO NOTHING;
