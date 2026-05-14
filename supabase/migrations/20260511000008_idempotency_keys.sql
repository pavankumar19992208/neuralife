-- Migration 008: Idempotency keys table + receipt number generator function
-- Used by the Fees module to ensure payment mutations are safe to retry.

CREATE TABLE idempotency_keys (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT NOT NULL UNIQUE,
  response_body JSONB NOT NULL,
  status_code   INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);

ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "idempotency_system_only" ON idempotency_keys
  FOR ALL USING ((auth.jwt() ->> 'role') IN ('SYSTEM', 'SUPER_ADMIN'));

-- Atomic receipt number generator.
-- Increments last_sequence for the given school+year atomically and returns
-- a formatted receipt string like "VHS-2526-000892".
CREATE OR REPLACE FUNCTION generate_receipt_number(
  p_school_id        text,
  p_year_label       text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seq        int;
  v_short_code text;
  v_year_code  text;
BEGIN
  UPDATE receipt_sequence_counters
  SET    last_sequence = last_sequence + 1
  WHERE  school_id = p_school_id
    AND  academic_year_label = p_year_label
  RETURNING last_sequence, school_short_code
  INTO v_seq, v_short_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Receipt counter not configured for school % year %',
      p_school_id, p_year_label;
  END IF;

  -- '2025-26' → remove hyphen → '202526' → take last 4 chars → '2526'
  v_year_code := RIGHT(REPLACE(p_year_label, '-', ''), 4);

  RETURN v_short_code || '-' || v_year_code || '-' || LPAD(v_seq::text, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION generate_receipt_number(text, text) TO service_role;
