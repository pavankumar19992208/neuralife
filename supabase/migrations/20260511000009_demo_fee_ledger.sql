-- Migration 009: Demo fee ledger entries for the demo school.
-- Inserts TUITION + NEURALIFE_SUBSCRIPTION entries for the current month
-- for all 30 demo students (classes 9 and 10) at Vikas High School.
-- Run only once — Supabase tracks applied migrations by filename.

-- Tuition ledger: 17 PAID, 2 PARTIAL (₹1000 of ₹2500), 1 OVERDUE
-- (We have 30 students in class 9+10; allocate statuses across first 20)
WITH ranked AS (
  SELECT
    neura_id,
    ROW_NUMBER() OVER (ORDER BY neura_id) AS rn
  FROM student_yearly_progress
  WHERE school_id        = 'SCH-AP-DEMO-0001'
    AND class_year       IN (9, 10)
    AND academic_year_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
)
INSERT INTO fee_ledger (
  neura_id, school_id, academic_year_id,
  fee_head, period_label,
  amount_due, amount_paid,
  due_date, status
)
SELECT
  r.neura_id,
  'SCH-AP-DEMO-0001',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'TUITION'::fee_head,
  TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
  2500,
  CASE
    WHEN r.rn <= 17 THEN 2500   -- PAID
    WHEN r.rn <= 19 THEN 1000   -- PARTIAL
    ELSE 0                       -- OVERDUE
  END,
  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '4 days',
  CASE
    WHEN r.rn <= 17 THEN 'PAID'::fee_status
    WHEN r.rn <= 19 THEN 'PARTIAL'::fee_status
    ELSE 'OVERDUE'::fee_status
  END
FROM ranked r;

-- NeuraLife subscription: all 30 students PAID ₹500
INSERT INTO fee_ledger (
  neura_id, school_id, academic_year_id,
  fee_head, period_label,
  amount_due, amount_paid,
  due_date, status
)
SELECT
  syp.neura_id,
  'SCH-AP-DEMO-0001',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'NEURALIFE_SUBSCRIPTION'::fee_head,
  TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
  500,
  500,
  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '4 days',
  'PAID'::fee_status
FROM student_yearly_progress syp
WHERE syp.school_id        = 'SCH-AP-DEMO-0001'
  AND syp.academic_year_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
