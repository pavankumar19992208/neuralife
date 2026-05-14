-- Atomic sequence increment for NeuraID generation.
-- Uses INSERT...ON CONFLICT to avoid race conditions under concurrent enrollment.
CREATE OR REPLACE FUNCTION increment_school_sequence(p_state_code text, p_year int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seq int;
BEGIN
  INSERT INTO school_sequences (state_code, enrollment_year, last_sequence)
  VALUES (p_state_code, p_year, 1)
  ON CONFLICT (state_code, enrollment_year)
  DO UPDATE SET last_sequence = school_sequences.last_sequence + 1
  RETURNING last_sequence INTO v_seq;
  RETURN v_seq;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_school_sequence(text, int) TO service_role;
