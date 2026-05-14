-- Migration 010: Fee Extensions
-- Adds custom fee heads, concession rules, and extends enums

-- 1. Extend fee_head enum with common custom types
ALTER TYPE fee_head ADD VALUE IF NOT EXISTS 'BUS_FEE';
ALTER TYPE fee_head ADD VALUE IF NOT EXISTS 'SPORTS_FEE';
ALTER TYPE fee_head ADD VALUE IF NOT EXISTS 'LAB_FEE';
ALTER TYPE fee_head ADD VALUE IF NOT EXISTS 'LIBRARY_FEE';
ALTER TYPE fee_head ADD VALUE IF NOT EXISTS 'HOSTEL_FEE';
ALTER TYPE fee_head ADD VALUE IF NOT EXISTS 'ACTIVITY_FEE';
ALTER TYPE fee_head ADD VALUE IF NOT EXISTS 'UNIFORM_FEE';
ALTER TYPE fee_head ADD VALUE IF NOT EXISTS 'COMPUTER_LAB';
ALTER TYPE fee_head ADD VALUE IF NOT EXISTS 'MEAL_FEE';
ALTER TYPE fee_head ADD VALUE IF NOT EXISTS 'MEDICAL_FEE';
ALTER TYPE fee_head ADD VALUE IF NOT EXISTS 'CUSTOM';

-- 2. Extend concession_type enum
ALTER TYPE concession_type ADD VALUE IF NOT EXISTS 'ALUMNI_CHILD';
ALTER TYPE concession_type ADD VALUE IF NOT EXISTS 'OBC_CONCESSION';
ALTER TYPE concession_type ADD VALUE IF NOT EXISTS 'EWS_CONCESSION';
ALTER TYPE concession_type ADD VALUE IF NOT EXISTS 'INCOME_BPL';
ALTER TYPE concession_type ADD VALUE IF NOT EXISTS 'DISABILITY';
ALTER TYPE concession_type ADD VALUE IF NOT EXISTS 'SINGLE_PARENT';
ALTER TYPE concession_type ADD VALUE IF NOT EXISTS 'SIBLING_SECOND';
ALTER TYPE concession_type ADD VALUE IF NOT EXISTS 'SIBLING_THIRD_PLUS';

-- 3. Custom fee heads table (school-defined fees not in standard enum)
CREATE TABLE IF NOT EXISTS custom_fee_heads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         TEXT NOT NULL REFERENCES schools(id),
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id),
  head_code         TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  description       TEXT,
  collection_type   TEXT NOT NULL CHECK (collection_type IN ('MONTHLY','TERMLY','ANNUAL','ONE_TIME')),
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, academic_year_id, head_code)
);

-- Per-class/category amounts for custom fee heads
CREATE TABLE IF NOT EXISTS custom_fee_head_amounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_fee_head_id  UUID NOT NULL REFERENCES custom_fee_heads(id) ON DELETE CASCADE,
  class_year          INTEGER,  -- NULL = all classes
  student_category    fee_category,  -- NULL = all categories
  amount              NUMERIC(10,2) NOT NULL DEFAULT 0,
  UNIQUE(custom_fee_head_id, class_year, student_category)
);

-- 4. School-level concession rules (auto-apply during enrollment)
CREATE TABLE IF NOT EXISTS fee_concession_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         TEXT NOT NULL REFERENCES schools(id),
  academic_year_id  UUID REFERENCES academic_years(id),  -- NULL = all years
  rule_name         TEXT NOT NULL,
  concession_type   concession_type NOT NULL,
  eligibility_note  TEXT,
  applies_to_heads  TEXT[],  -- NULL/empty = all heads; otherwise list of fee_head values
  amount_type       TEXT NOT NULL CHECK (amount_type IN ('PERCENT','FIXED')),
  concession_value  NUMERIC(10,2) NOT NULL,
  max_cap           NUMERIC(10,2),  -- max deduction in rupees (for PERCENT rules)
  auto_apply        BOOLEAN DEFAULT TRUE,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Extend fee_ledger with custom head support
ALTER TABLE fee_ledger ADD COLUMN IF NOT EXISTS custom_head_label TEXT;
ALTER TABLE fee_ledger ADD COLUMN IF NOT EXISTS custom_fee_head_id UUID REFERENCES custom_fee_heads(id);
