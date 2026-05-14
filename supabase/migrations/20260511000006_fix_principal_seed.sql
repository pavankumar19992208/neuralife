-- ============================================================
-- Migration 006: Fix principal seed + dev test accounts
-- ============================================================
-- Problem: Dr. S. Ramana Murthy's mobile (+919876543210) exists only in
-- schools.principal_mobile. The teachers lookup uses teachers.mobile, so
-- the principal could never log in.
--
-- Fix: insert the principal as a teacher record with designation='PRINCIPAL'.
--
-- Also adds one dedicated dev-only test account per role so the login flow
-- can be exercised without guessing which seeded number maps to which role.
-- These rows are clearly marked; remove before going live with real data.
-- ============================================================

-- 1. Insert principal as a teacher
INSERT INTO teachers (id, full_name, mobile, email, date_of_birth, gender, status)
VALUES (
  '11000000-0000-0000-0000-000000000007',
  'Dr. S. Ramana Murthy',
  '+919876543210',
  'principal@vikashigh.edu.in',
  '1970-08-15',
  'Male',
  'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Assign principal to the demo school with designation PRINCIPAL
INSERT INTO teacher_school_assignments (
  id, teacher_id, school_id, academic_year_id,
  employee_id, designation, employment_type, joining_date, status
)
VALUES (
  'aa000001-0000-0000-0000-000000000007',
  '11000000-0000-0000-0000-000000000007',
  'SCH-AP-DEMO-0001',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'EMP-000',
  'PRINCIPAL',
  'REGULAR',
  '2001-06-01',
  'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;

-- ─── Dev-only test accounts (easy-to-remember numbers) ────────────────────────
-- Remove these rows before deploying to production with real school data.

-- Dev TEACHER account: login with 9000000001
INSERT INTO teachers (id, full_name, mobile, email, date_of_birth, gender, status)
VALUES (
  '11000000-0000-0000-0000-000000000099',
  'Dev Test Teacher',
  '+919000000001',
  'dev.teacher@neuralife.dev',
  '1990-01-01',
  'Male',
  'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO teacher_school_assignments (
  id, teacher_id, school_id, academic_year_id,
  employee_id, designation, employment_type, joining_date, status
)
VALUES (
  'aa000001-0000-0000-0000-000000000099',
  '11000000-0000-0000-0000-000000000099',
  'SCH-AP-DEMO-0001',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'DEV-001',
  'TGT',
  'REGULAR',
  '2024-01-01',
  'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;

-- Dev PRINCIPAL account: login with 9000000002
INSERT INTO teachers (id, full_name, mobile, email, date_of_birth, gender, status)
VALUES (
  '11000000-0000-0000-0000-000000000098',
  'Dev Test Principal',
  '+919000000002',
  'dev.principal@neuralife.dev',
  '1980-01-01',
  'Male',
  'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO teacher_school_assignments (
  id, teacher_id, school_id, academic_year_id,
  employee_id, designation, employment_type, joining_date, status
)
VALUES (
  'aa000001-0000-0000-0000-000000000098',
  '11000000-0000-0000-0000-000000000098',
  'SCH-AP-DEMO-0001',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'DEV-002',
  'PRINCIPAL',
  'REGULAR',
  '2024-01-01',
  'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;

-- Dev PARENT account: login with 9000000003
INSERT INTO parent_contacts (neura_id, school_id, parent_name, relationship, mobile, is_primary, can_login)
VALUES (
  'NID-2025-AP-084291',
  'SCH-AP-DEMO-0001',
  'Dev Test Parent',
  'FATHER',
  '+919000000003',
  FALSE,
  TRUE
)
ON CONFLICT DO NOTHING;

INSERT INTO parent_auth_links (mobile, neura_id, school_id)
VALUES ('+919000000003', 'NID-2025-AP-084291', 'SCH-AP-DEMO-0001')
ON CONFLICT DO NOTHING;
