-- ============================================================
-- Migration 005: Grant PostgREST role privileges
-- ============================================================
-- The initial_schema migration created tables but did not
-- grant table-level privileges to PostgREST roles.
-- PostgREST bypasses RLS for service_role, but still requires
-- explicit GRANT on each table. Without these grants every
-- API call returns "permission denied for table <name>".
-- ============================================================

-- Schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- service_role: full access (bypasses RLS — used by API server for
-- auth operations, background jobs, admin tasks)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO service_role;

-- authenticated: full DML (RLS policies enforce row-level access)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- anon: no direct table access — all pre-auth requests go through the
-- API server using service_role, not the anon key directly
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Ensure future tables created in this schema inherit the same grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
