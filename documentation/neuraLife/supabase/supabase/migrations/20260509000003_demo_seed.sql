-- ============================================================
-- NeuraLife — Demo Seed Data
-- Migration: 003_demo_seed.sql
-- Run AFTER: 002_rls_policies.sql
--
-- PURPOSE: Populate the database with a realistic demo school
-- so you have real data to show during school visits.
-- Everything here looks like a real AP school.
-- ============================================================

-- ============================================================
-- 1. SCHOOL
-- ============================================================

INSERT INTO schools (
  id, name, udise_code, board, school_type, medium,
  district, mandal, state, full_address, pincode,
  principal_name, principal_mobile, principal_email, school_phone,
  establishment_year, recognition_status, shifts,
  working_days, school_start_time, school_end_time,
  exam_pattern, grading_system,
  leave_year_start_month, salary_cycle, salary_pay_day,
  subscription_tier, subscription_start, subscription_end,
  contract_reference, status, onboarding_step, onboarding_complete
) VALUES (
  'SCH-AP-DEMO-0001',
  'Vikas High School',
  '28120100201',
  'SCERT_AP',
  'PRIVATE',
  'BOTH',
  'Guntur',
  'Guntur Urban',
  'AP',
  '12-3-456, Brodipet, Guntur, Andhra Pradesh',
  '522002',
  'Dr. S. Ramana Murthy',
  '+919876543210',
  'principal@vikashigh.edu.in',
  '08632234567',
  2001,
  'RECOGNISED',
  1,
  ARRAY['MON','TUE','WED','THU','FRI','SAT']::day_of_week[],
  '09:00',
  '16:00',
  'FA_SA',
  'MARKS',
  6,
  'MONTHLY',
  1,
  'GROWTH',
  '2025-06-01',
  '2026-05-31',
  'NL-SCH-2025-0001',
  'ACTIVE',
  8,
  TRUE
);

-- School short code for receipts
INSERT INTO receipt_sequence_counters (school_id, academic_year_label, school_short_code, last_sequence)
VALUES ('SCH-AP-DEMO-0001', '2025-26', 'VHS', 891);
-- Starts at 891 so demo receipts look like school has been active

-- School sequence for NeuraID generation
INSERT INTO school_sequences (state_code, enrollment_year, last_sequence)
VALUES ('AP', 2025, 84290);

-- ============================================================
-- 2. ACADEMIC YEAR
-- ============================================================

INSERT INTO academic_years (id, school_id, year_label, start_date, end_date, is_current)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'SCH-AP-DEMO-0001',
  '2025-26',
  '2025-06-01',
  '2026-03-31',
  TRUE
);

-- Holidays
INSERT INTO school_holidays (school_id, academic_year_id, holiday_date, holiday_name, holiday_type) VALUES
('SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-08-15', 'Independence Day', 'GOVERNMENT'),
('SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-10-02', 'Gandhi Jayanti / Dussehra', 'GOVERNMENT'),
('SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-11-01', 'AP Formation Day', 'GOVERNMENT'),
('SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-12-15', 'Annual Day', 'SCHOOL'),
('SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2026-01-26', 'Republic Day', 'GOVERNMENT');

-- ============================================================
-- 3. TEACHERS (6 teachers — realistic AP names)
-- ============================================================

INSERT INTO teachers (id, full_name, mobile, email, date_of_birth, gender, status) VALUES
('11000000-0000-0000-0000-000000000001', 'K. Suresh Kumar',    '+919876543211', 'suresh.kumar@vikashigh.edu.in',   '1985-04-12', 'Male',   'ACTIVE'),
('11000000-0000-0000-0000-000000000002', 'P. Venkat Rao',       '+919876543212', 'venkat.rao@vikashigh.edu.in',     '1982-07-22', 'Male',   'ACTIVE'),
('11000000-0000-0000-0000-000000000003', 'S. Lakshmi Devi',     '+919876543213', 'lakshmi.devi@vikashigh.edu.in',   '1988-11-05', 'Female', 'ACTIVE'),
('11000000-0000-0000-0000-000000000004', 'M. Rama Krishna',     '+919876543214', 'rama.krishna@vikashigh.edu.in',   '1979-03-18', 'Male',   'ACTIVE'),
('11000000-0000-0000-0000-000000000005', 'T. Anand Babu',       '+919876543215', 'anand.babu@vikashigh.edu.in',     '1990-09-30', 'Male',   'ACTIVE'),
('11000000-0000-0000-0000-000000000006', 'R. Priya Kumari',     '+919876543216', 'priya.kumari@vikashigh.edu.in',   '1992-01-14', 'Female', 'ACTIVE');

-- Teacher school assignments
INSERT INTO teacher_school_assignments (
  id, teacher_id, school_id, academic_year_id,
  employee_id, designation, employment_type, joining_date, status
) VALUES
('aa000001-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'EMP-001', 'PGT', 'REGULAR', '2015-06-01', 'ACTIVE'),
('aa000001-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'EMP-002', 'PGT', 'REGULAR', '2012-06-01', 'ACTIVE'),
('aa000001-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'EMP-003', 'PGT', 'REGULAR', '2018-06-01', 'ACTIVE'),
('aa000001-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'EMP-004', 'TGT', 'REGULAR', '2010-06-01', 'ACTIVE'),
('aa000001-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'EMP-005', 'TGT', 'REGULAR', '2020-06-01', 'ACTIVE'),
('aa000001-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'EMP-006', 'TGT', 'REGULAR', '2021-06-01', 'ACTIVE');

-- Subject assignments (Suresh = Maths Class Teacher 10-A, Lakshmi = English Class Teacher 10-B, Priya = Bio Class Teacher 9-A)
INSERT INTO teacher_subject_assignments (assignment_id, school_id, academic_year_id, class_year, section, subject, is_class_teacher) VALUES
-- Suresh Kumar: Maths 9-A, 9-B, 10-A, 10-B + Class Teacher 10-A
('aa000001-0000-0000-0000-000000000001', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,  'A', 'MATHEMATICS', FALSE),
('aa000001-0000-0000-0000-000000000001', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,  'B', 'MATHEMATICS', FALSE),
('aa000001-0000-0000-0000-000000000001', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 10, 'A', 'MATHEMATICS', TRUE),
('aa000001-0000-0000-0000-000000000001', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 10, 'B', 'MATHEMATICS', FALSE),
-- Venkat Rao: Physical Science
('aa000001-0000-0000-0000-000000000002', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,  'A', 'PHYSICAL_SCIENCE', FALSE),
('aa000001-0000-0000-0000-000000000002', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 10, 'A', 'PHYSICAL_SCIENCE', FALSE),
('aa000001-0000-0000-0000-000000000002', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 10, 'B', 'PHYSICAL_SCIENCE', FALSE),
-- Lakshmi Devi: English + Class Teacher 10-B
('aa000001-0000-0000-0000-000000000003', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,  'A', 'ENGLISH', FALSE),
('aa000001-0000-0000-0000-000000000003', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 10, 'A', 'ENGLISH', FALSE),
('aa000001-0000-0000-0000-000000000003', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 10, 'B', 'ENGLISH', TRUE),
-- Rama Krishna: Telugu
('aa000001-0000-0000-0000-000000000004', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,  'A', 'TELUGU', FALSE),
('aa000001-0000-0000-0000-000000000004', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 10, 'A', 'TELUGU', FALSE),
('aa000001-0000-0000-0000-000000000004', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 10, 'B', 'TELUGU', FALSE),
-- Anand Babu: Social Studies
('aa000001-0000-0000-0000-000000000005', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 10, 'A', 'SOCIAL_STUDIES', FALSE),
('aa000001-0000-0000-0000-000000000005', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 10, 'B', 'SOCIAL_STUDIES', FALSE),
-- Priya Kumari: Bio Science + Class Teacher 9-A
('aa000001-0000-0000-0000-000000000006', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,  'A', 'BIOLOGICAL_SCIENCE', TRUE),
('aa000001-0000-0000-0000-000000000006', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 10, 'A', 'BIOLOGICAL_SCIENCE', FALSE),
('aa000001-0000-0000-0000-000000000006', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 10, 'B', 'BIOLOGICAL_SCIENCE', FALSE);

-- Salary structures
INSERT INTO salary_structures (teacher_id, school_id, effective_from, basic, hra_type, hra_value, da_type, da_value, transport_allowance, special_allowance, gross_monthly, pf_applicable, esi_applicable, pt_applicable, bank_account_number, ifsc_code, bank_name, account_holder_name, is_active) VALUES
('11000000-0000-0000-0000-000000000001', 'SCH-AP-DEMO-0001', '2025-06-01', 22000, 'PERCENT', 25, 'PERCENT', 10, 1500, 1600, 32800, TRUE,  FALSE, TRUE, 'XXXX001234', 'HDFC0001234', 'HDFC Bank', 'K. Suresh Kumar',  TRUE),
('11000000-0000-0000-0000-000000000002', 'SCH-AP-DEMO-0001', '2025-06-01', 24000, 'PERCENT', 25, 'PERCENT', 10, 1500, 1800, 35700, TRUE,  FALSE, TRUE, 'XXXX002345', 'SBIN0002345', 'SBI',       'P. Venkat Rao',    TRUE),
('11000000-0000-0000-0000-000000000003', 'SCH-AP-DEMO-0001', '2025-06-01', 20000, 'PERCENT', 25, 'PERCENT', 10, 1500, 1500, 30000, FALSE, FALSE, TRUE, 'XXXX003456', 'HDFC0003456', 'HDFC Bank', 'S. Lakshmi Devi',  TRUE),
('11000000-0000-0000-0000-000000000004', 'SCH-AP-DEMO-0001', '2025-06-01', 18000, 'PERCENT', 20, 'PERCENT', 10, 1200, 1200, 25800, FALSE, TRUE,  TRUE, 'XXXX004567', 'CNRB0004567', 'Canara',    'M. Rama Krishna',  TRUE),
('11000000-0000-0000-0000-000000000005', 'SCH-AP-DEMO-0001', '2025-06-01', 17000, 'PERCENT', 20, 'PERCENT', 10, 1200, 1000, 24100, FALSE, TRUE,  TRUE, 'XXXX005678', 'PUNB0005678', 'PNB',       'T. Anand Babu',    TRUE),
('11000000-0000-0000-0000-000000000006', 'SCH-AP-DEMO-0001', '2025-06-01', 18000, 'PERCENT', 20, 'PERCENT', 10, 1200, 1200, 25800, FALSE, TRUE,  TRUE, 'XXXX006789', 'ICIC0006789', 'ICICI',     'R. Priya Kumari',  TRUE);

-- Leave balances for current year
INSERT INTO leave_balances (teacher_id, school_id, leave_year_label, cl_entitled, cl_used, sl_entitled, sl_used, el_entitled, el_used) VALUES
('11000000-0000-0000-0000-000000000001', 'SCH-AP-DEMO-0001', '2025-26', 12, 3, 10, 1, 8, 0),
('11000000-0000-0000-0000-000000000002', 'SCH-AP-DEMO-0001', '2025-26', 12, 1, 10, 0, 8, 0),
('11000000-0000-0000-0000-000000000003', 'SCH-AP-DEMO-0001', '2025-26', 12, 6, 10, 2, 8, 0),
('11000000-0000-0000-0000-000000000004', 'SCH-AP-DEMO-0001', '2025-26', 12, 2, 10, 3, 8, 1),
('11000000-0000-0000-0000-000000000005', 'SCH-AP-DEMO-0001', '2025-26', 12, 0, 10, 0, 8, 0),
('11000000-0000-0000-0000-000000000006', 'SCH-AP-DEMO-0001', '2025-26', 12, 1, 10, 1, 8, 0);

-- ============================================================
-- 4. STUDENTS
-- 30 students: 10 in Class 10-A, 10 in Class 10-B, 10 in Class 9-A
-- 4 specific AT_RISK students for demo impact
-- ============================================================

-- NeuraIDs: NID-2025-AP-08XXXX
INSERT INTO students (neura_id, full_name, date_of_birth, gender, blood_group, caste_category, status, band, data_consent_given, consent_version) VALUES
-- Class 10-A (10 students)
('NID-2025-AP-084291', 'Arjun Reddy',         '2009-04-12', 'Male',   'B+',  'GENERAL', 'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084292', 'Priya Sharma',         '2009-07-22', 'Female', 'O+',  'GENERAL', 'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084293', 'Ravi Kumar',            '2009-03-15', 'Male',   'A+',  'OBC',     'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084294', 'Sneha Rao',             '2009-11-08', 'Female', 'AB+', 'GENERAL', 'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084295', 'Kiran Babu',            '2009-06-20', 'Male',   'O-',  'SC_ST',   'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084296', 'Anitha Devi',           '2009-09-14', 'Female', 'B-',  'GENERAL', 'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084297', 'Suresh Varma',          '2009-02-28', 'Male',   'A-',  'OBC',     'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084298', 'Mounika Lakshmi',       '2009-05-18', 'Female', 'O+',  'GENERAL', 'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084299', 'Prasad Naidu',          '2009-08-30', 'Male',   'B+',  'GENERAL', 'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084300', 'Divya Sri',             '2009-12-05', 'Female', 'A+',  'OBC',     'ACTIVE', 'SECONDARY', TRUE, '1.0'),
-- Class 10-B (10 students)
('NID-2025-AP-084301', 'Venkatesh Reddy',       '2009-01-17', 'Male',   'O+',  'GENERAL', 'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084302', 'Kavitha Rani',          '2009-10-25', 'Female', 'B+',  'SC_ST',   'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084303', 'Arun Sharma',           '2009-04-08', 'Male',   'AB-', 'GENERAL', 'ACTIVE', 'SECONDARY', TRUE, '1.0'),  -- AT_RISK (no improvement 3 weeks)
('NID-2025-AP-084304', 'Sravani Devi',          '2009-07-14', 'Female', 'A+',  'OBC',     'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084305', 'Naveen Kumar',          '2009-03-22', 'Male',   'O-',  'GENERAL', 'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084306', 'Padma Priya',           '2009-11-11', 'Female', 'B+',  'GENERAL', 'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084307', 'Gowtham Rao',           '2009-06-04', 'Male',   'A-',  'OBC',     'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084308', 'Meena Kumari',          '2009-09-19', 'Female', 'O+',  'SC_ST',   'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084309', 'Sai Teja',              '2009-02-14', 'Male',   'B-',  'GENERAL', 'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084310', 'Ananya Reddy',          '2009-08-07', 'Female', 'AB+', 'GENERAL', 'ACTIVE', 'SECONDARY', TRUE, '1.0'),
-- Class 9-A (10 students)
('NID-2025-AP-084311', 'Srinivas Rao',          '2010-05-16', 'Male',   'O+',  'GENERAL', 'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084312', 'Haritha Lakshmi',       '2010-10-02', 'Female', 'A+',  'OBC',     'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084313', 'Mahesh Babu',           '2010-03-28', 'Male',   'B+',  'GENERAL', 'ACTIVE', 'SECONDARY', TRUE, '1.0'),  -- AT_RISK (3 subjects declining)
('NID-2025-AP-084314', 'Sowmya Devi',           '2010-07-19', 'Female', 'O-',  'SC_ST',   'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084315', 'Rajesh Kumar',          '2010-12-08', 'Male',   'A-',  'GENERAL', 'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084316', 'Keerthi Varma',         '2010-04-25', 'Female', 'B+',  'OBC',     'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084317', 'Pavan Kalyan',          '2010-08-13', 'Male',   'AB+', 'GENERAL', 'ACTIVE', 'SECONDARY', TRUE, '1.0'),  -- AT_RISK (SmartPad offline 9 days)
('NID-2025-AP-084318', 'Bhavana Sri',           '2010-01-30', 'Female', 'O+',  'GENERAL', 'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084319', 'Naresh Reddy',          '2010-06-22', 'Male',   'B-',  'OBC',     'ACTIVE', 'SECONDARY', TRUE, '1.0'),
('NID-2025-AP-084320', 'Triveni Devi',          '2010-11-17', 'Female', 'A+',  'SC_ST',   'ACTIVE', 'SECONDARY', TRUE, '1.0');  -- AT_RISK (attendance + mastery)

-- School enrollments
INSERT INTO school_enrollments (neura_id, school_id, admission_number, enrolled_at, status) VALUES
('NID-2025-AP-084291', 'SCH-AP-DEMO-0001', 'ADM-2025-0291', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084292', 'SCH-AP-DEMO-0001', 'ADM-2025-0292', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084293', 'SCH-AP-DEMO-0001', 'ADM-2025-0293', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084294', 'SCH-AP-DEMO-0001', 'ADM-2025-0294', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084295', 'SCH-AP-DEMO-0001', 'ADM-2025-0295', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084296', 'SCH-AP-DEMO-0001', 'ADM-2025-0296', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084297', 'SCH-AP-DEMO-0001', 'ADM-2025-0297', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084298', 'SCH-AP-DEMO-0001', 'ADM-2025-0298', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084299', 'SCH-AP-DEMO-0001', 'ADM-2025-0299', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084300', 'SCH-AP-DEMO-0001', 'ADM-2025-0300', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084301', 'SCH-AP-DEMO-0001', 'ADM-2025-0301', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084302', 'SCH-AP-DEMO-0001', 'ADM-2025-0302', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084303', 'SCH-AP-DEMO-0001', 'ADM-2025-0303', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084304', 'SCH-AP-DEMO-0001', 'ADM-2025-0304', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084305', 'SCH-AP-DEMO-0001', 'ADM-2025-0305', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084306', 'SCH-AP-DEMO-0001', 'ADM-2025-0306', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084307', 'SCH-AP-DEMO-0001', 'ADM-2025-0307', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084308', 'SCH-AP-DEMO-0001', 'ADM-2025-0308', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084309', 'SCH-AP-DEMO-0001', 'ADM-2025-0309', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084310', 'SCH-AP-DEMO-0001', 'ADM-2025-0310', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084311', 'SCH-AP-DEMO-0001', 'ADM-2025-0311', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084312', 'SCH-AP-DEMO-0001', 'ADM-2025-0312', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084313', 'SCH-AP-DEMO-0001', 'ADM-2025-0313', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084314', 'SCH-AP-DEMO-0001', 'ADM-2025-0314', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084315', 'SCH-AP-DEMO-0001', 'ADM-2025-0315', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084316', 'SCH-AP-DEMO-0001', 'ADM-2025-0316', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084317', 'SCH-AP-DEMO-0001', 'ADM-2025-0317', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084318', 'SCH-AP-DEMO-0001', 'ADM-2025-0318', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084319', 'SCH-AP-DEMO-0001', 'ADM-2025-0319', '2025-06-02', 'ACTIVE'),
('NID-2025-AP-084320', 'SCH-AP-DEMO-0001', 'ADM-2025-0320', '2025-06-02', 'ACTIVE');

-- Yearly progress (class, section, medium per student per year)
INSERT INTO student_yearly_progress (neura_id, school_id, academic_year_id, academic_year_label, class_year, section, medium, board, smartpad_id) VALUES
-- 10-A
('NID-2025-AP-084291', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 10, 'A', 'ENGLISH', 'SCERT_AP', 'PAD-0001'),
('NID-2025-AP-084292', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 10, 'A', 'ENGLISH', 'SCERT_AP', 'PAD-0002'),
('NID-2025-AP-084293', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 10, 'A', 'TELUGU',  'SCERT_AP', 'PAD-0003'),
('NID-2025-AP-084294', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 10, 'A', 'ENGLISH', 'SCERT_AP', 'PAD-0004'),
('NID-2025-AP-084295', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 10, 'A', 'TELUGU',  'SCERT_AP', 'PAD-0005'),
('NID-2025-AP-084296', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 10, 'A', 'ENGLISH', 'SCERT_AP', 'PAD-0006'),
('NID-2025-AP-084297', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 10, 'A', 'ENGLISH', 'SCERT_AP', 'PAD-0007'),
('NID-2025-AP-084298', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 10, 'A', 'ENGLISH', 'SCERT_AP', 'PAD-0008'),
('NID-2025-AP-084299', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 10, 'A', 'ENGLISH', 'SCERT_AP', 'PAD-0009'),
('NID-2025-AP-084300', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 10, 'A', 'ENGLISH', 'SCERT_AP', 'PAD-0010'),
-- 10-B
('NID-2025-AP-084301', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 10, 'B', 'ENGLISH', 'SCERT_AP', 'PAD-0011'),
('NID-2025-AP-084302', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 10, 'B', 'TELUGU',  'SCERT_AP', 'PAD-0012'),
('NID-2025-AP-084303', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 10, 'B', 'ENGLISH', 'SCERT_AP', 'PAD-0013'),
('NID-2025-AP-084304', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 10, 'B', 'ENGLISH', 'SCERT_AP', 'PAD-0014'),
('NID-2025-AP-084305', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 10, 'B', 'ENGLISH', 'SCERT_AP', 'PAD-0015'),
('NID-2025-AP-084306', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 10, 'B', 'ENGLISH', 'SCERT_AP', 'PAD-0016'),
('NID-2025-AP-084307', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 10, 'B', 'TELUGU',  'SCERT_AP', 'PAD-0017'),
('NID-2025-AP-084308', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 10, 'B', 'ENGLISH', 'SCERT_AP', 'PAD-0018'),
('NID-2025-AP-084309', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 10, 'B', 'ENGLISH', 'SCERT_AP', 'PAD-0019'),
('NID-2025-AP-084310', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 10, 'B', 'ENGLISH', 'SCERT_AP', 'PAD-0020'),
-- 9-A
('NID-2025-AP-084311', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 9, 'A', 'ENGLISH', 'SCERT_AP', 'PAD-0021'),
('NID-2025-AP-084312', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 9, 'A', 'ENGLISH', 'SCERT_AP', 'PAD-0022'),
('NID-2025-AP-084313', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 9, 'A', 'ENGLISH', 'SCERT_AP', 'PAD-0023'),
('NID-2025-AP-084314', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 9, 'A', 'TELUGU',  'SCERT_AP', 'PAD-0024'),
('NID-2025-AP-084315', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 9, 'A', 'ENGLISH', 'SCERT_AP', 'PAD-0025'),
('NID-2025-AP-084316', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 9, 'A', 'ENGLISH', 'SCERT_AP', 'PAD-0026'),
('NID-2025-AP-084317', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 9, 'A', 'ENGLISH', 'SCERT_AP', NULL),       -- PAD-0027 offline 9 days
('NID-2025-AP-084318', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 9, 'A', 'ENGLISH', 'SCERT_AP', 'PAD-0028'),
('NID-2025-AP-084319', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 9, 'A', 'ENGLISH', 'SCERT_AP', 'PAD-0029'),
('NID-2025-AP-084320', 'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-26', 9, 'A', 'ENGLISH', 'SCERT_AP', 'PAD-0030');

-- Parent contacts (one father mobile per student — key 4 AT_RISK students get real-looking numbers)
INSERT INTO parent_contacts (neura_id, school_id, parent_name, relationship, mobile, is_primary, can_login) VALUES
('NID-2025-AP-084291', 'SCH-AP-DEMO-0001', 'K. Reddy',         'FATHER', '+919901110001', TRUE, TRUE),
('NID-2025-AP-084292', 'SCH-AP-DEMO-0001', 'R. Sharma',        'FATHER', '+919901110002', TRUE, TRUE),
('NID-2025-AP-084293', 'SCH-AP-DEMO-0001', 'P. Kumar',         'FATHER', '+919901110003', TRUE, TRUE),
('NID-2025-AP-084294', 'SCH-AP-DEMO-0001', 'S. Rao',           'MOTHER', '+919901110004', TRUE, TRUE),
('NID-2025-AP-084295', 'SCH-AP-DEMO-0001', 'B. Babu',          'FATHER', '+919901110005', TRUE, TRUE),
('NID-2025-AP-084296', 'SCH-AP-DEMO-0001', 'V. Devi',          'MOTHER', '+919901110006', TRUE, TRUE),
('NID-2025-AP-084297', 'SCH-AP-DEMO-0001', 'S. Varma',         'FATHER', '+919901110007', TRUE, TRUE),
('NID-2025-AP-084298', 'SCH-AP-DEMO-0001', 'M. Rao',           'FATHER', '+919901110008', TRUE, TRUE),
('NID-2025-AP-084299', 'SCH-AP-DEMO-0001', 'P. Naidu',         'FATHER', '+919901110009', TRUE, TRUE),
('NID-2025-AP-084300', 'SCH-AP-DEMO-0001', 'T. Reddy',         'FATHER', '+919901110010', TRUE, TRUE),
('NID-2025-AP-084301', 'SCH-AP-DEMO-0001', 'V. Reddy',         'FATHER', '+919901110011', TRUE, TRUE),
('NID-2025-AP-084302', 'SCH-AP-DEMO-0001', 'K. Rani',          'MOTHER', '+919901110012', TRUE, TRUE),
('NID-2025-AP-084303', 'SCH-AP-DEMO-0001', 'G. Sharma',        'FATHER', '+919901110013', TRUE, TRUE), -- Arun Sharma (AT_RISK)
('NID-2025-AP-084304', 'SCH-AP-DEMO-0001', 'S. Devi',          'MOTHER', '+919901110014', TRUE, TRUE),
('NID-2025-AP-084305', 'SCH-AP-DEMO-0001', 'R. Kumar',         'FATHER', '+919901110015', TRUE, TRUE),
('NID-2025-AP-084306', 'SCH-AP-DEMO-0001', 'P. Priya',         'MOTHER', '+919901110016', TRUE, TRUE),
('NID-2025-AP-084307', 'SCH-AP-DEMO-0001', 'A. Rao',           'FATHER', '+919901110017', TRUE, TRUE),
('NID-2025-AP-084308', 'SCH-AP-DEMO-0001', 'M. Kumari',        'MOTHER', '+919901110018', TRUE, TRUE),
('NID-2025-AP-084309', 'SCH-AP-DEMO-0001', 'T. Teja',          'FATHER', '+919901110019', TRUE, TRUE),
('NID-2025-AP-084310', 'SCH-AP-DEMO-0001', 'R. Reddy',         'FATHER', '+919901110020', TRUE, TRUE),
('NID-2025-AP-084311', 'SCH-AP-DEMO-0001', 'S. Rao',           'FATHER', '+919901110021', TRUE, TRUE),
('NID-2025-AP-084312', 'SCH-AP-DEMO-0001', 'H. Devi',          'MOTHER', '+919901110022', TRUE, TRUE),
('NID-2025-AP-084313', 'SCH-AP-DEMO-0001', 'V. Babu',          'FATHER', '+919901110023', TRUE, TRUE), -- Mahesh Babu (AT_RISK)
('NID-2025-AP-084314', 'SCH-AP-DEMO-0001', 'S. Devi',          'MOTHER', '+919901110024', TRUE, TRUE),
('NID-2025-AP-084315', 'SCH-AP-DEMO-0001', 'R. Kumar',         'FATHER', '+919901110025', TRUE, TRUE),
('NID-2025-AP-084316', 'SCH-AP-DEMO-0001', 'K. Varma',         'FATHER', '+919901110026', TRUE, TRUE),
('NID-2025-AP-084317', 'SCH-AP-DEMO-0001', 'P. Kalyan',        'FATHER', '+919901110027', TRUE, TRUE), -- Pavan Kalyan (offline 9 days)
('NID-2025-AP-084318', 'SCH-AP-DEMO-0001', 'B. Devi',          'MOTHER', '+919901110028', TRUE, TRUE),
('NID-2025-AP-084319', 'SCH-AP-DEMO-0001', 'N. Reddy',         'FATHER', '+919901110029', TRUE, TRUE),
('NID-2025-AP-084320', 'SCH-AP-DEMO-0001', 'T. Devi',          'MOTHER', '+919901110030', TRUE, TRUE); -- Triveni (AT_RISK, attendance)

-- Parent auth links (mobile → neura_id mapping for login)
INSERT INTO parent_auth_links (mobile, neura_id, school_id)
SELECT pc.mobile, pc.neura_id, pc.school_id
FROM parent_contacts pc;

-- ============================================================
-- 5. SMARTPADS (3 devices for demo)
-- ============================================================

INSERT INTO smartpad_devices (
  id, school_id, serial_number, assigned_neura_id,
  assigned_at, academic_year_id,
  os_version, kiosk_app_version,
  model_versions, battery_pct, storage_used_mb,
  gps_lat, gps_lng, last_gps_at,
  last_sync_at, last_seen_at, status
) VALUES
-- PAD-0001: Arjun Reddy — synced today (looks healthy)
(
  'PAD-0001', 'SCH-AP-DEMO-0001', 'NLP25090001', 'NID-2025-AP-084291',
  '2025-06-03', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Android 11', '1.2.4',
  '{"HWR-1-S": "1.4.2", "GAP-1": "1.2.0"}',
  74, 4200,
  16.3007, 80.4366, NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours',
  'ACTIVE'
),
-- PAD-0013: Arun Sharma (AT_RISK) — synced 3 days ago
(
  'PAD-0013', 'SCH-AP-DEMO-0001', 'NLP25090013', 'NID-2025-AP-084303',
  '2025-06-03', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Android 11', '1.2.4',
  '{"HWR-1-S": "1.4.2", "GAP-1": "1.2.0"}',
  31, 5800,
  16.3007, 80.4366, NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days',
  'ACTIVE'
),
-- PAD-0027: Pavan Kalyan — offline 9 days (lost or at home without WiFi)
(
  'PAD-0027', 'SCH-AP-DEMO-0001', 'NLP25090027', 'NID-2025-AP-084317',
  '2025-06-03', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Android 11', '1.2.3',
  '{"HWR-1-S": "1.3.1", "GAP-1": "1.1.4"}',
  18, 3100,
  16.3007, 80.4366, NOW() - INTERVAL '9 days',
  NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days',
  'ACTIVE'
);

-- ============================================================
-- 6. FEE STRUCTURE
-- ============================================================

INSERT INTO fee_structures (
  school_id, academic_year_id, class_year, student_category,
  admission_fee, development_fee, smartpad_fee,
  tuition_fee_monthly, neuralife_sub_monthly,
  exam_fee_per_term, transport_fee_monthly,
  late_fee_amount, late_fee_grace_days, fee_due_day_of_month
) VALUES
-- Class 10 General
('SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 10, 'GENERAL',  5000, 3000, 9999, 2500, 500, 500, 800, 50, 5, 1),
-- Class 10 SC/ST
('SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 10, 'SC_ST',    3000, 2000, 9999, 1500, 500, 300, 800, 50, 5, 1),
-- Class 10 OBC
('SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 10, 'OBC',      4000, 2500, 9999, 2000, 500, 400, 800, 50, 5, 1),
-- Class 9 General
('SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,  'GENERAL',  5000, 3000, 9999, 2300, 500, 500, 800, 50, 5, 1),
-- Class 9 SC/ST
('SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,  'SC_ST',    3000, 2000, 9999, 1400, 500, 300, 800, 50, 5, 1),
-- Class 9 OBC
('SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,  'OBC',      4000, 2500, 9999, 1800, 500, 400, 800, 50, 5, 1);

-- ============================================================
-- 7. MASTERY SNAPSHOTS (key AT_RISK students — 6 weeks of data)
-- These tell a story visible in the dashboard
-- ============================================================

-- Arjun Reddy (NID-084291) — improving student, good story
INSERT INTO mastery_snapshots (neura_id, school_id, snapshot_date, subject, topic, raw_score, error_patterns, session_count) VALUES
('NID-2025-AP-084291', 'SCH-AP-DEMO-0001', CURRENT_DATE - 42, 'MATHEMATICS', 'QUADRATIC_EQUATIONS', 0.510, ARRAY['SIGN_ERROR','FACTORING_ERROR'], 2),
('NID-2025-AP-084291', 'SCH-AP-DEMO-0001', CURRENT_DATE - 35, 'MATHEMATICS', 'QUADRATIC_EQUATIONS', 0.580, ARRAY['SIGN_ERROR'], 3),
('NID-2025-AP-084291', 'SCH-AP-DEMO-0001', CURRENT_DATE - 28, 'MATHEMATICS', 'QUADRATIC_EQUATIONS', 0.640, ARRAY['SIGN_ERROR'], 2),
('NID-2025-AP-084291', 'SCH-AP-DEMO-0001', CURRENT_DATE - 21, 'MATHEMATICS', 'QUADRATIC_EQUATIONS', 0.720, ARRAY[]::text[], 2),
('NID-2025-AP-084291', 'SCH-AP-DEMO-0001', CURRENT_DATE - 14, 'MATHEMATICS', 'QUADRATIC_EQUATIONS', 0.790, ARRAY[]::text[], 3),
('NID-2025-AP-084291', 'SCH-AP-DEMO-0001', CURRENT_DATE - 7,  'MATHEMATICS', 'QUADRATIC_EQUATIONS', 0.850, ARRAY[]::text[], 2),
('NID-2025-AP-084291', 'SCH-AP-DEMO-0001', CURRENT_DATE,      'MATHEMATICS', 'QUADRATIC_EQUATIONS', 0.890, ARRAY[]::text[], 1);

-- Arun Sharma (NID-084303) — AT_RISK, 3 weeks no improvement (demo focus student)
INSERT INTO mastery_snapshots (neura_id, school_id, snapshot_date, subject, topic, raw_score, error_patterns, session_count) VALUES
('NID-2025-AP-084303', 'SCH-AP-DEMO-0001', CURRENT_DATE - 42, 'MATHEMATICS',      'QUADRATIC_EQUATIONS', 0.420, ARRAY['SIGN_ERROR','FACTORING_ERROR','HESITATION_PATTERN'], 2),
('NID-2025-AP-084303', 'SCH-AP-DEMO-0001', CURRENT_DATE - 35, 'MATHEMATICS',      'QUADRATIC_EQUATIONS', 0.390, ARRAY['SIGN_ERROR','FACTORING_ERROR'], 1),
('NID-2025-AP-084303', 'SCH-AP-DEMO-0001', CURRENT_DATE - 28, 'MATHEMATICS',      'QUADRATIC_EQUATIONS', 0.370, ARRAY['SIGN_ERROR','FACTORING_ERROR'], 2),
('NID-2025-AP-084303', 'SCH-AP-DEMO-0001', CURRENT_DATE - 21, 'MATHEMATICS',      'QUADRATIC_EQUATIONS', 0.350, ARRAY['SIGN_ERROR','FACTORING_ERROR','HINT_DEPENDENCY'], 1),
('NID-2025-AP-084303', 'SCH-AP-DEMO-0001', CURRENT_DATE - 14, 'PHYSICAL_SCIENCE', 'FORCE_AND_MOTION',    0.380, ARRAY['FORMULA_CONFUSION','UNIT_ERROR'], 2),
('NID-2025-AP-084303', 'SCH-AP-DEMO-0001', CURRENT_DATE - 7,  'PHYSICAL_SCIENCE', 'FORCE_AND_MOTION',    0.330, ARRAY['FORMULA_CONFUSION','UNIT_ERROR'], 1),
('NID-2025-AP-084303', 'SCH-AP-DEMO-0001', CURRENT_DATE - 3,  'TELUGU',           'GRAMMAR',             0.290, ARRAY['PHONETIC_SPELLING','VOCABULARY_SUBSTITUTION'], 1);

-- Mahesh Babu (NID-084313) — AT_RISK in 3 subjects, declining
INSERT INTO mastery_snapshots (neura_id, school_id, snapshot_date, subject, topic, raw_score, error_patterns, session_count) VALUES
('NID-2025-AP-084313', 'SCH-AP-DEMO-0001', CURRENT_DATE - 35, 'MATHEMATICS',       'POLYNOMIALS',      0.450, ARRAY['SIGN_ERROR'], 2),
('NID-2025-AP-084313', 'SCH-AP-DEMO-0001', CURRENT_DATE - 28, 'MATHEMATICS',       'POLYNOMIALS',      0.420, ARRAY['SIGN_ERROR','HESITATION_PATTERN'], 1),
('NID-2025-AP-084313', 'SCH-AP-DEMO-0001', CURRENT_DATE - 21, 'MATHEMATICS',       'POLYNOMIALS',      0.380, ARRAY['SIGN_ERROR','HESITATION_PATTERN'], 1),
('NID-2025-AP-084313', 'SCH-AP-DEMO-0001', CURRENT_DATE - 21, 'PHYSICAL_SCIENCE',  'GRAVITATION',      0.340, ARRAY['FORMULA_CONFUSION'], 2),
('NID-2025-AP-084313', 'SCH-AP-DEMO-0001', CURRENT_DATE - 14, 'PHYSICAL_SCIENCE',  'GRAVITATION',      0.300, ARRAY['FORMULA_CONFUSION','UNIT_ERROR'], 1),
('NID-2025-AP-084313', 'SCH-AP-DEMO-0001', CURRENT_DATE - 7,  'BIOLOGICAL_SCIENCE','CELL_DIVISION',    0.290, ARRAY['CAUSE_EFFECT_REVERSAL'], 1);

-- Triveni Devi (NID-084320) — AT_RISK, also attendance issue
INSERT INTO mastery_snapshots (neura_id, school_id, snapshot_date, subject, topic, raw_score, error_patterns, session_count) VALUES
('NID-2025-AP-084320', 'SCH-AP-DEMO-0001', CURRENT_DATE - 35, 'MATHEMATICS',      'POLYNOMIALS',      0.380, ARRAY['CARRY_ERROR','PLACE_VALUE_ERROR'], 2),
('NID-2025-AP-084320', 'SCH-AP-DEMO-0001', CURRENT_DATE - 21, 'MATHEMATICS',      'POLYNOMIALS',      0.310, ARRAY['CARRY_ERROR','HESITATION_PATTERN'], 1),
('NID-2025-AP-084320', 'SCH-AP-DEMO-0001', CURRENT_DATE - 7,  'TELUGU',           'GRAMMAR',          0.270, ARRAY['PHONETIC_SPELLING'], 1);

-- ============================================================
-- 8. CALIBRATED MASTERY SCORES (what the dashboard shows)
-- ============================================================

INSERT INTO calibrated_mastery_scores (neura_id, school_id, computed_date, subject, topic, raw_score, calibrated_percentile, classification, vs_class_avg, vs_school_avg, population_sample_size) VALUES
-- Arjun (strong, improving)
('NID-2025-AP-084291', 'SCH-AP-DEMO-0001', CURRENT_DATE, 'MATHEMATICS', 'QUADRATIC_EQUATIONS', 0.890, 89, 'MASTERED',   0.18, 0.22, 1240),
-- Arun Sharma (AT_RISK, declining)
('NID-2025-AP-084303', 'SCH-AP-DEMO-0001', CURRENT_DATE, 'MATHEMATICS',      'QUADRATIC_EQUATIONS', 0.350, 21, 'AT_RISK', -0.21, -0.19, 1240),
('NID-2025-AP-084303', 'SCH-AP-DEMO-0001', CURRENT_DATE, 'PHYSICAL_SCIENCE', 'FORCE_AND_MOTION',    0.330, 18, 'AT_RISK', -0.19, -0.22, 980),
('NID-2025-AP-084303', 'SCH-AP-DEMO-0001', CURRENT_DATE, 'TELUGU',           'GRAMMAR',             0.290, 14, 'AT_RISK', -0.24, -0.26, 1100),
-- Mahesh (AT_RISK 3 subjects)
('NID-2025-AP-084313', 'SCH-AP-DEMO-0001', CURRENT_DATE, 'MATHEMATICS',       'POLYNOMIALS',     0.380, 22, 'AT_RISK',   -0.18, -0.20, 1240),
('NID-2025-AP-084313', 'SCH-AP-DEMO-0001', CURRENT_DATE, 'PHYSICAL_SCIENCE',  'GRAVITATION',     0.300, 16, 'AT_RISK',   -0.21, -0.24, 980),
('NID-2025-AP-084313', 'SCH-AP-DEMO-0001', CURRENT_DATE, 'BIOLOGICAL_SCIENCE','CELL_DIVISION',   0.290, 15, 'AT_RISK',   -0.19, -0.21, 760),
-- Triveni (AT_RISK)
('NID-2025-AP-084320', 'SCH-AP-DEMO-0001', CURRENT_DATE, 'MATHEMATICS', 'POLYNOMIALS', 0.310, 17, 'AT_RISK', -0.25, -0.27, 1240);

-- ============================================================
-- 9. STUDENT INSIGHTS (what parent sees at 8 PM)
-- ============================================================

INSERT INTO student_insights (
  neura_id, school_id, generated_date, insight_type, language, subject,
  summary_text, conversation_starter, severity, notification_pending
) VALUES
(
  'NID-2025-AP-084291', 'SCH-AP-DEMO-0001', CURRENT_DATE, 'DAILY', 'ENGLISH', 'MATHEMATICS',
  'Arjun had a strong 47-minute Mathematics session today. His mastery in Quadratic Equations has grown from 51% to 89% over the last 6 weeks — this is excellent progress. He is now consistently in the top 15% of Class 10 students on this topic. Physical Science needs a bit more focus.',
  'Tonight, ask Arjun: "Can you explain how to factorise a quadratic equation — show me one example."',
  'INFO', FALSE
),
(
  'NID-2025-AP-084303', 'SCH-AP-DEMO-0001', CURRENT_DATE, 'AT_RISK', 'ENGLISH', NULL,
  'Arun needs attention in Mathematics, Physical Science, and Telugu. His mastery has been declining for 3 weeks in Mathematics — he is getting sign errors consistently and relying heavily on hints. His SmartPad was inactive for 3 days. We recommend scheduling a parent meeting with his class teacher.',
  'Tonight, ask Arun: "What happens to the sign when you move a term from one side of an equation to the other?"',
  'CRITICAL', TRUE
),
(
  'NID-2025-AP-084313', 'SCH-AP-DEMO-0001', CURRENT_DATE, 'AT_RISK', 'ENGLISH', NULL,
  'Mahesh is below the expected level in 3 subjects — Mathematics, Physical Science, and Biological Science. The gaps started appearing 3 weeks ago. His study time is irregular — he often starts sessions late at night which may affect quality. A conversation with the class teacher is recommended.',
  'Tonight, ask Mahesh: "At what time are you usually studying? Can we find a fixed time every evening?"',
  'CRITICAL', TRUE
);

-- ============================================================
-- 10. INTERVENTIONS (shows teachers are acting on alerts)
-- ============================================================

INSERT INTO interventions (neura_id, school_id, logged_by, intervention_type, subject, notes, logged_at) VALUES
(
  'NID-2025-AP-084291', 'SCH-AP-DEMO-0001',
  '11000000-0000-0000-0000-000000000001',
  'SUBJECT_HELP', 'MATHEMATICS',
  'Extra practice given for sign errors in Algebra. Showed student 3 different factoring methods. Student responded well.',
  NOW() - INTERVAL '7 days'
),
(
  'NID-2025-AP-084303', 'SCH-AP-DEMO-0001',
  '11000000-0000-0000-0000-000000000003',
  'PARENT_MEETING', NULL,
  'Parent meeting scheduled for Arun Sharma. Father informed about declining mastery in 3 subjects. Will review progress in 2 weeks.',
  NOW() - INTERVAL '3 days'
);

-- ============================================================
-- 11. HOMEWORK (one active assignment to demo the flow)
-- ============================================================

INSERT INTO homework (
  school_id, academic_year_id, teacher_id,
  class_year, section, subject,
  title, instructions, homework_type, due_date
) VALUES (
  'SCH-AP-DEMO-0001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '11000000-0000-0000-0000-000000000001',
  10, 'A', 'MATHEMATICS',
  'Chapter 4 — Quadratic Equations Practice',
  'Solve all problems in Exercise 4.2 (Problems 1 to 10). Show complete working. Especially focus on problems 7 and 8 which involve the discriminant.',
  'PROBLEM_SET',
  CURRENT_DATE + 2
);

-- ============================================================
-- 12. CONSENT RECORDS
-- ============================================================

INSERT INTO consent_records (neura_id, consent_type, consented_by_role, consented_by_id, school_id, consent_text_version, consented_at) VALUES
('NID-2025-AP-084291', 'ENROLLMENT_PRINCIPAL', 'PRINCIPAL', '11000000-0000-0000-0000-000000000001', 'SCH-AP-DEMO-0001', '1.0', NOW() - INTERVAL '100 days'),
('NID-2025-AP-084303', 'ENROLLMENT_PRINCIPAL', 'PRINCIPAL', '11000000-0000-0000-0000-000000000001', 'SCH-AP-DEMO-0001', '1.0', NOW() - INTERVAL '100 days'),
('NID-2025-AP-084313', 'ENROLLMENT_PRINCIPAL', 'PRINCIPAL', '11000000-0000-0000-0000-000000000001', 'SCH-AP-DEMO-0001', '1.0', NOW() - INTERVAL '100 days'),
('NID-2025-AP-084320', 'ENROLLMENT_PRINCIPAL', 'PRINCIPAL', '11000000-0000-0000-0000-000000000001', 'SCH-AP-DEMO-0001', '1.0', NOW() - INTERVAL '100 days');

-- ============================================================
-- DEMO COMPLETE
--
-- What you now have:
-- ✅ Vikas High School — Guntur, AP
-- ✅ 6 teachers with salaries and leave balances
-- ✅ 30 students across 10-A, 10-B, 9-A
-- ✅ 3 SmartPads (1 active, 1 stale 3 days, 1 offline 9 days)
-- ✅ 4 AT_RISK students with 6 weeks of declining mastery data
-- ✅ 1 improving student (Arjun) with mastery growth story
-- ✅ AI insights ready for parent app demo
-- ✅ 2 teacher interventions logged
-- ✅ 1 active homework assignment
-- ✅ Fee structure for Class 9 and 10 (all categories)
-- ✅ Receipt counter starting at 891 (looks like active school)
-- ============================================================