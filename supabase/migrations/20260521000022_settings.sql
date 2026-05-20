-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration 22: Settings, Onboarding & Configuration
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ─── ALTER schools table for settings ──────────────────────────────────────
ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#1E40AF';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS affiliation_number TEXT;

-- ─── ALTER students table for release/graduation functionality ─────────────
ALTER TABLE students ADD COLUMN IF NOT EXISTS exit_date DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS exit_reason TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS exit_type TEXT CHECK (exit_type IN ('TRANSFER', 'COMPLETED', 'DISCONTINUED', 'GRADUATED'));
ALTER TABLE students ADD COLUMN IF NOT EXISTS destination_school TEXT;

-- ─── Fee categories and heads for flexible fee structure ───────────────────
CREATE TABLE IF NOT EXISTS fee_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fee_categories_school_name
  ON fee_categories(school_id, name) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS fee_heads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES fee_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (frequency IN ('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL')),
  class_year INTEGER CHECK (class_year BETWEEN 1 AND 12),
  due_date_rule TEXT DEFAULT 'MONTH_START', -- MONTH_START, MONTH_END, CUSTOM_DATE
  is_mandatory BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_heads_school_class
  ON fee_heads(school_id, class_year, is_active);

-- ─── School admin users table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'SCHOOL_ADMIN' CHECK (role IN ('SCHOOL_ADMIN', 'VICE_PRINCIPAL')),
  is_active BOOLEAN DEFAULT true,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  first_login_at TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_school_admin_mobile
  ON school_admin_users(mobile) WHERE is_active = true;

-- ─── Settings audit log ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settings_audit_school_created
  ON settings_audit_log(school_id, created_at);

-- ─── Onboarding progress tracking ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL CHECK (step_number BETWEEN 1 AND 8),
  step_name TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_progress_school_step
  ON onboarding_progress(school_id, step_number);

-- ─── RLS Policies ──────────────────────────────────────────────────────────
ALTER TABLE fee_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Fee categories policies
DROP POLICY IF EXISTS "fee_categories_school_access" ON fee_categories;
CREATE POLICY "fee_categories_school_access" ON fee_categories
  FOR ALL USING (auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN') AND
                 EXISTS (SELECT 1 FROM schools WHERE id = fee_categories.school_id));

-- Fee heads policies
DROP POLICY IF EXISTS "fee_heads_school_access" ON fee_heads;
CREATE POLICY "fee_heads_school_access" ON fee_heads
  FOR ALL USING (auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN') AND
                 EXISTS (SELECT 1 FROM schools WHERE id = fee_heads.school_id));

-- School admin users policies
DROP POLICY IF EXISTS "school_admin_users_access" ON school_admin_users;
CREATE POLICY "school_admin_users_access" ON school_admin_users
  FOR ALL USING (auth_role() = 'PRINCIPAL' AND
                 EXISTS (SELECT 1 FROM schools WHERE id = school_admin_users.school_id));

-- Settings audit log policies
DROP POLICY IF EXISTS "settings_audit_log_access" ON settings_audit_log;
CREATE POLICY "settings_audit_log_access" ON settings_audit_log
  FOR ALL USING (auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN') AND
                 EXISTS (SELECT 1 FROM schools WHERE id = settings_audit_log.school_id));

-- Onboarding progress policies
DROP POLICY IF EXISTS "onboarding_progress_access" ON onboarding_progress;
CREATE POLICY "onboarding_progress_access" ON onboarding_progress
  FOR ALL USING (auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN') AND
                 EXISTS (SELECT 1 FROM schools WHERE id = onboarding_progress.school_id));

-- ─── Demo data seeding ─────────────────────────────────────────────────────
-- Update demo school as having completed onboarding
UPDATE schools
SET
  onboarding_completed = true,
  onboarding_step = 8,
  logo_url = 'https://placeholder.com/150x150',
  accent_color = '#1E40AF',
  tagline = 'Excellence in Education',
  website = 'https://vikashighschool.edu.in',
  affiliation_number = 'AP/GNT/2005/001'
WHERE
  name = 'Vikas High School';

-- Seed fee categories for demo school
INSERT INTO fee_categories (school_id, name, description)
SELECT
  id,
  unnest(ARRAY['General', 'SC/ST/OBC', 'EWS/Free', 'Management Quota']) as name,
  unnest(ARRAY[
    'Standard fee structure for general category students',
    'Discounted fees for SC/ST/OBC students',
    'Free/subsidized fees for EWS students',
    'Premium fees for management quota admissions'
  ]) as description
FROM schools
WHERE name = 'Vikas High School'
ON CONFLICT DO NOTHING;

-- Seed fee heads for Class 10 (demo)
WITH demo_school AS (
  SELECT id as school_id FROM schools WHERE name = 'Vikas High School' LIMIT 1
),
fee_cats AS (
  SELECT fc.id as category_id, fc.name as category_name, ds.school_id
  FROM fee_categories fc, demo_school ds
  WHERE fc.school_id = ds.school_id
)
INSERT INTO fee_heads (school_id, category_id, name, description, amount, frequency, class_year, due_date_rule)
SELECT
  fc.school_id,
  fc.category_id,
  fee_name,
  fee_description,
  CASE
    WHEN fc.category_name = 'General' THEN fee_amount
    WHEN fc.category_name = 'SC/ST/OBC' THEN fee_amount * 0.75
    WHEN fc.category_name = 'EWS/Free' THEN fee_amount * 0.25
    WHEN fc.category_name = 'Management Quota' THEN fee_amount * 1.5
  END as amount,
  fee_frequency,
  10 as class_year,
  'MONTH_START' as due_date_rule
FROM fee_cats fc
CROSS JOIN (VALUES
  ('Tuition Fee', 'Monthly tuition charges', 2500.00, 'MONTHLY'),
  ('Development Fee', 'Infrastructure development', 5000.00, 'ANNUAL'),
  ('Exam Fee', 'Examination charges', 800.00, 'QUARTERLY'),
  ('NeuraLife Subscription', 'SmartPad platform subscription', 500.00, 'MONTHLY')
) AS fees(fee_name, fee_description, fee_amount, fee_frequency)
ON CONFLICT DO NOTHING;

-- Seed onboarding progress for demo school (completed)
WITH demo_school AS (
  SELECT id as school_id FROM schools WHERE name = 'Vikas High School' LIMIT 1
)
INSERT INTO onboarding_progress (school_id, step_number, step_name, is_completed, completed_at)
SELECT
  ds.school_id,
  step_num,
  step_name,
  true as is_completed,
  now() - (interval '8 days' - step_num * interval '1 day') as completed_at
FROM demo_school ds
CROSS JOIN (VALUES
  (1, 'School Identity'),
  (2, 'Academic Year Setup'),
  (3, 'Classes & Sections'),
  (4, 'Add Admin & Teachers'),
  (5, 'Fee Structure'),
  (6, 'Enroll Students'),
  (7, 'Assign SmartPads'),
  (8, 'Go Live Check')
) AS steps(step_num, step_name)
ON CONFLICT DO NOTHING;

-- ─── Updated at triggers ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_fee_categories_updated_at ON fee_categories;
CREATE TRIGGER update_fee_categories_updated_at
  BEFORE UPDATE ON fee_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fee_heads_updated_at ON fee_heads;
CREATE TRIGGER update_fee_heads_updated_at
  BEFORE UPDATE ON fee_heads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_school_admin_users_updated_at ON school_admin_users;
CREATE TRIGGER update_school_admin_users_updated_at
  BEFORE UPDATE ON school_admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_onboarding_progress_updated_at ON onboarding_progress;
CREATE TRIGGER update_onboarding_progress_updated_at
  BEFORE UPDATE ON onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();