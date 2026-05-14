-- Refresh token store for JWT rotation
CREATE TABLE refresh_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jti             TEXT NOT NULL UNIQUE,
  user_id         TEXT NOT NULL,
  user_role       TEXT NOT NULL,
  school_id       TEXT,
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_jti ON refresh_tokens(jti);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "refresh_tokens_system_only" ON refresh_tokens
  FOR ALL USING (auth.jwt() ->> 'role' = 'SYSTEM' OR auth.jwt() ->> 'role' = 'SUPER_ADMIN');

-- Student PIN store (students table has no pin_hash column)
CREATE TABLE student_pins (
  neura_id        TEXT PRIMARY KEY REFERENCES students(neura_id),
  pin_hash        TEXT NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE student_pins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_pins_system_only" ON student_pins
  FOR ALL USING (auth.jwt() ->> 'role' = 'SYSTEM' OR auth.jwt() ->> 'role' = 'SUPER_ADMIN');
