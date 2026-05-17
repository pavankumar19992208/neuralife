-- Migration 020: Salary & Payroll Module
-- Tables: payroll_runs, payslips, payroll_adjustments

-- Drop if partially created (idempotent re-run)
DROP TABLE IF EXISTS payroll_adjustments CASCADE;
DROP TABLE IF EXISTS payslips CASCADE;
DROP TABLE IF EXISTS payroll_runs CASCADE;

-- ─── payroll_runs ────────────────────────────────────────────────────────────
CREATE TABLE payroll_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id),
  month             INT  NOT NULL CHECK (month BETWEEN 1 AND 12),
  year              INT  NOT NULL,
  status            TEXT NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT', 'GENERATED', 'APPROVED', 'PAID')),
  total_gross       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deductions  NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_net         NUMERIC(12,2) NOT NULL DEFAULT 0,
  teacher_count     INT  NOT NULL DEFAULT 0,
  generated_at      TIMESTAMPTZ,
  approved_at       TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  generated_by      UUID REFERENCES auth.users(id),
  approved_by       UUID REFERENCES auth.users(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, month, year)
);

-- ─── payslips ────────────────────────────────────────────────────────────────
CREATE TABLE payslips (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id       UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  school_id            TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id           UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  month                INT  NOT NULL,
  year                 INT  NOT NULL,
  basic                NUMERIC(10,2) NOT NULL DEFAULT 0,
  hra                  NUMERIC(10,2) NOT NULL DEFAULT 0,
  da                   NUMERIC(10,2) NOT NULL DEFAULT 0,
  transport_allowance  NUMERIC(10,2) NOT NULL DEFAULT 0,
  special_allowance    NUMERIC(10,2) NOT NULL DEFAULT 0,
  gross_salary         NUMERIC(10,2) NOT NULL DEFAULT 0,
  working_days         INT NOT NULL DEFAULT 0,
  present_days         INT NOT NULL DEFAULT 0,
  lop_days             NUMERIC(5,2) NOT NULL DEFAULT 0,
  pf_employee          NUMERIC(10,2) NOT NULL DEFAULT 0,
  esi_employee         NUMERIC(10,2) NOT NULL DEFAULT 0,
  professional_tax     NUMERIC(10,2) NOT NULL DEFAULT 0,
  lop_deduction        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_deductions     NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_salary           NUMERIC(10,2) NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'GENERATED'
                       CHECK (status IN ('GENERATED', 'ON_HOLD', 'PAID')),
  payment_date         DATE,
  payment_reference    TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payslips_payroll_run ON payslips(payroll_run_id);
CREATE INDEX idx_payslips_teacher ON payslips(teacher_id);
CREATE INDEX idx_payslips_school_month ON payslips(school_id, year, month);

-- ─── payroll_adjustments ─────────────────────────────────────────────────────
CREATE TABLE payroll_adjustments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id      UUID NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
  school_id       TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL
                  CHECK (adjustment_type IN ('BONUS', 'ADVANCE_RECOVERY', 'FINE', 'ARREAR', 'OTHER')),
  label           TEXT NOT NULL,
  amount          NUMERIC(10,2) NOT NULL,
  is_deduction    BOOLEAN NOT NULL DEFAULT FALSE,
  added_by        UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payroll_adj_payslip ON payroll_adjustments(payslip_id);

-- ─── updated_at triggers ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payroll_runs_updated_at
  BEFORE UPDATE ON payroll_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_payslips_updated_at
  BEFORE UPDATE ON payslips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_adjustments ENABLE ROW LEVEL SECURITY;

-- Service-role bypass (used by admin client in routes)
CREATE POLICY "payroll_runs_service_role" ON payroll_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "payslips_service_role" ON payslips
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "payroll_adj_service_role" ON payroll_adjustments
  FOR ALL TO service_role USING (true) WITH CHECK (true);
