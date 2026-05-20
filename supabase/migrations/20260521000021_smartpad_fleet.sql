-- Migration 021: SmartPad Fleet Management
-- Extends existing smartpad tables + adds health/alert/OTA tables

-- ─── 1. Extend smartpad_devices ──────────────────────────────────────────────
ALTER TABLE smartpad_devices
  ADD COLUMN IF NOT EXISTS model                  TEXT DEFAULT 'NeuraLife Gen 1',
  ADD COLUMN IF NOT EXISTS pending_firmware_version TEXT,
  ADD COLUMN IF NOT EXISTS lost_reported_by       UUID REFERENCES teachers(id),
  ADD COLUMN IF NOT EXISTS breakage_deposit_paid  NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_repair_cost      NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sessions         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_usage_hours      INTEGER DEFAULT 0;

-- ─── 2. Extend smartpad_assignment_history ────────────────────────────────────
-- Make academic_year_id nullable for fleet operations that don't have context
ALTER TABLE smartpad_assignment_history
  ALTER COLUMN academic_year_id DROP NOT NULL;

ALTER TABLE smartpad_assignment_history
  ADD COLUMN IF NOT EXISTS condition_at_return    TEXT,
  ADD COLUMN IF NOT EXISTS damage_description     TEXT,
  ADD COLUMN IF NOT EXISTS damage_photo_url       TEXT,
  ADD COLUMN IF NOT EXISTS repair_required        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS repair_cost_estimate   NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS repair_status          TEXT DEFAULT 'NOT_REQUIRED',
  ADD COLUMN IF NOT EXISTS repair_completed_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes                  TEXT,
  ADD COLUMN IF NOT EXISTS recorded_by            UUID REFERENCES teachers(id);

-- ─── 3. smartpad_health_snapshots ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS smartpad_health_snapshots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id        TEXT NOT NULL,
  school_id        TEXT NOT NULL REFERENCES schools(id),
  snapshot_at      TIMESTAMPTZ NOT NULL,
  battery_level    INTEGER,
  storage_used_mb  INTEGER,
  firmware_version TEXT,
  location_lat     DECIMAL(10,8),
  location_lng     DECIMAL(11,8),
  sessions_count   INTEGER DEFAULT 0,
  usage_minutes    INTEGER DEFAULT 0,
  sync_type        TEXT DEFAULT 'AUTO'
);
CREATE INDEX IF NOT EXISTS idx_shs_device ON smartpad_health_snapshots(device_id, snapshot_at DESC);

-- ─── 4. smartpad_alerts ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS smartpad_alerts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id             TEXT NOT NULL,
  school_id             TEXT NOT NULL REFERENCES schools(id),
  neura_id              TEXT REFERENCES students(neura_id),
  alert_type            TEXT NOT NULL,
  severity              TEXT NOT NULL,
  triggered_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at       TIMESTAMPTZ,
  acknowledged_by       UUID REFERENCES teachers(id),
  resolved_at           TIMESTAMPTZ,
  notification_sent_at  TIMESTAMPTZ,
  notification_channel  TEXT,
  message               TEXT NOT NULL,
  is_active             BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_sa_device ON smartpad_alerts(device_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sa_school ON smartpad_alerts(school_id, severity, is_active);

-- ─── 5. smartpad_ota_campaigns ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS smartpad_ota_campaigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         TEXT NOT NULL REFERENCES schools(id),
  target_firmware   TEXT NOT NULL,
  launched_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  launched_by       UUID REFERENCES teachers(id),
  target_device_ids TEXT[] NOT NULL,
  updated_count     INTEGER DEFAULT 0,
  failed_count      INTEGER DEFAULT 0,
  status            TEXT DEFAULT 'IN_PROGRESS',
  completed_at      TIMESTAMPTZ
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE smartpad_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartpad_alerts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartpad_ota_campaigns    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_all_shs"  ON smartpad_health_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_sa"   ON smartpad_alerts           FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_soc"  ON smartpad_ota_campaigns    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 6. DEMO SEED ────────────────────────────────────────────────────────────
-- Update existing devices + add new ones with varied realistic states

-- Update existing devices with new fleet columns
UPDATE smartpad_devices SET
  model = 'NeuraLife Gen 1',
  os_version = '1.4.2',
  total_sessions = 187,
  total_usage_hours = 312
WHERE id = 'PAD-0001';

UPDATE smartpad_devices SET
  model = 'NeuraLife Gen 1',
  os_version = '1.3.0',
  battery_pct = 34,
  storage_used_mb = 18200,
  total_sessions = 134,
  total_usage_hours = 198,
  last_sync_at = NOW() - INTERVAL '3 days',
  last_seen_at = NOW() - INTERVAL '3 days',
  gps_lat = 16.3012,
  gps_lng = 80.4412
WHERE id = 'PAD-0013';

UPDATE smartpad_devices SET
  model = 'NeuraLife Gen 1',
  os_version = '1.2.1',
  battery_pct = 12,
  storage_used_mb = 21600,
  total_sessions = 89,
  total_usage_hours = 142,
  last_sync_at = NOW() - INTERVAL '11 days',
  last_seen_at = NOW() - INTERVAL '11 days',
  gps_lat = 16.3089,
  gps_lng = 80.4498
WHERE id = 'PAD-0027';

-- Insert new demo devices (non-conflicting neura_id assignments)
-- First clear any existing assignments for students we're about to use
UPDATE smartpad_devices SET assigned_neura_id = NULL
  WHERE assigned_neura_id IN (
    'NID-2025-AP-084292','NID-2025-AP-084293','NID-2025-AP-084294',
    'NID-2025-AP-084295','NID-2025-AP-084296','NID-2025-AP-084297'
  )
  AND id NOT IN ('PAD-0001','PAD-0013','PAD-0027');

INSERT INTO smartpad_devices (
  id, serial_number, model, school_id,
  assigned_neura_id, status, os_version, last_sync_at, last_seen_at,
  battery_pct, storage_used_mb, gps_lat, gps_lng, last_gps_at,
  total_sessions, total_usage_hours
) VALUES
  ('PAD-0042','NL-SP1-2024-0042','NeuraLife Gen 1','SCH-AP-DEMO-0001',
   NULL, 'LOST', '1.4.0',
   NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days',
   8, 16400, 16.2945, 80.4523, NOW() - INTERVAL '9 days',
   203, 387),
  ('PAD-0015','NL-SP1-2024-0015','NeuraLife Gen 1','SCH-AP-DEMO-0001',
   'NID-2025-AP-084295','ACTIVE','1.4.0',
   NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours',
   38, 15200, 16.3078, 80.4401, NOW() - INTERVAL '6 hours',
   156, 267),
  ('PAD-0007','NL-SP1-2024-0007','NeuraLife Gen 1','SCH-AP-DEMO-0001',
   'NID-2025-AP-084292','ACTIVE','1.4.0',
   NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours',
   71, 26500, 16.3034, 80.4389, NOW() - INTERVAL '4 hours',
   221, 402),
  ('PAD-0031','NL-SP1-2024-0031','NeuraLife Gen 1','SCH-AP-DEMO-0001',
   'NID-2025-AP-084296','ACTIVE','1.3.0',
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days',
   22, 17800, 16.3056, 80.4445, NOW() - INTERVAL '6 days',
   112, 178),
  ('PAD-0019','NL-SP1-2024-0019','NeuraLife Gen 1','SCH-AP-DEMO-0001',
   'NID-2025-AP-084294','ACTIVE','1.4.0',
   NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour',
   82, 12400, 16.3091, 80.4367, NOW() - INTERVAL '1 hour',
   198, 341),
  ('PAD-0034','NL-SP1-2024-0034','NeuraLife Gen 1','SCH-AP-DEMO-0001',
   'NID-2025-AP-084297','ACTIVE','1.4.0',
   NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours',
   67, 14100, 16.3023, 80.4378, NOW() - INTERVAL '5 hours',
   76, 98),
  ('PAD-0058','NL-SP1-2024-0058','NeuraLife Gen 1','SCH-AP-DEMO-0001',
   NULL,'ACTIVE','1.4.0',
   NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days',
   100, 8192, 16.3067, 80.4365, NOW() - INTERVAL '12 days',
   0, 0)
ON CONFLICT (id) DO UPDATE SET
  model = EXCLUDED.model,
  status = EXCLUDED.status,
  os_version = EXCLUDED.os_version,
  last_sync_at = EXCLUDED.last_sync_at,
  battery_pct = EXCLUDED.battery_pct,
  storage_used_mb = EXCLUDED.storage_used_mb,
  gps_lat = EXCLUDED.gps_lat,
  gps_lng = EXCLUDED.gps_lng,
  total_sessions = EXCLUDED.total_sessions,
  total_usage_hours = EXCLUDED.total_usage_hours;

-- Mark PAD-0042 as lost
UPDATE smartpad_devices SET
  loss_reported = TRUE,
  loss_reported_at = NOW() - INTERVAL '8 days',
  status = 'LOST'
WHERE id = 'PAD-0042';

-- Health snapshots: 14-day battery trend for PAD-0027 (declining)
INSERT INTO smartpad_health_snapshots
  (device_id, school_id, snapshot_at, battery_level, storage_used_mb, firmware_version)
SELECT
  'PAD-0027', 'SCH-AP-DEMO-0001',
  NOW() - (n || ' days')::INTERVAL,
  GREATEST(8, 85 - (n * 7)),
  20000 + (n * 100),
  '1.2.1'
FROM generate_series(1, 14) AS n
ON CONFLICT DO NOTHING;

-- Health snapshots: PAD-0015 battery never charges above 40%
INSERT INTO smartpad_health_snapshots
  (device_id, school_id, snapshot_at, battery_level, storage_used_mb, firmware_version)
SELECT
  'PAD-0015', 'SCH-AP-DEMO-0001',
  NOW() - (n || ' days')::INTERVAL,
  25 + (n % 15),
  14800 + (n * 200),
  '1.4.0'
FROM generate_series(1, 14) AS n
ON CONFLICT DO NOTHING;

-- Assignment history for PAD-0027 (3-student chain of custody)
INSERT INTO smartpad_assignment_history
  (smartpad_id, school_id, neura_id, academic_year_id, assigned_at,
   returned_at, condition_at_return, notes)
VALUES
  ('PAD-0027','SCH-AP-DEMO-0001','NID-2025-AP-084317',
   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   CURRENT_DATE - 180, NULL, NULL,
   'Currently assigned — offline 11 days'),
  ('PAD-0027','SCH-AP-DEMO-0001','NID-2025-AP-084291',
   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   CURRENT_DATE - 540, CURRENT_DATE - 181,
   'GOOD', 'Returned in good condition at year end'),
  ('PAD-0027','SCH-AP-DEMO-0001','NID-2025-AP-084292',
   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   CURRENT_DATE - 900, CURRENT_DATE - 541,
   'MINOR_DAMAGE',
   'Small crack on back cover. Repair cost ₹850.')
ON CONFLICT DO NOTHING;

-- Assignment history for PAD-0042 (LOST)
INSERT INTO smartpad_assignment_history
  (smartpad_id, school_id, neura_id, academic_year_id, assigned_at,
   returned_at, notes)
VALUES
  ('PAD-0042','SCH-AP-DEMO-0001','NID-2025-AP-084293',
   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   CURRENT_DATE - 200, NULL,
   'Device reported LOST — May 2026')
ON CONFLICT DO NOTHING;

-- Active alerts
INSERT INTO smartpad_alerts
  (device_id, school_id, neura_id, alert_type, severity, message, triggered_at, is_active)
VALUES
  ('PAD-0027','SCH-AP-DEMO-0001','NID-2025-AP-084317',
   'OFFLINE_CRITICAL','CRITICAL',
   'PAD-0027 has been offline for 11 days. Student (AT_RISK) has had no learning data since May 6.',
   NOW() - INTERVAL '2 days', TRUE),
  ('PAD-0042','SCH-AP-DEMO-0001', NULL,
   'LOST','CRITICAL',
   'PAD-0042 has been marked as LOST. Last known location: Brodipet, Guntur.',
   NOW() - INTERVAL '8 days', TRUE),
  ('PAD-0015','SCH-AP-DEMO-0001','NID-2025-AP-084295',
   'LOW_BATTERY','WARNING',
   'PAD-0015 battery has not exceeded 40% in 14 days. Possible charging issue.',
   NOW() - INTERVAL '1 day', TRUE),
  ('PAD-0007','SCH-AP-DEMO-0001','NID-2025-AP-084292',
   'STORAGE_FULL','WARNING',
   'PAD-0007 storage is at 94%. Session recording may stop soon.',
   NOW() - INTERVAL '12 hours', TRUE),
  ('PAD-0031','SCH-AP-DEMO-0001','NID-2025-AP-084296',
   'OFFLINE_WARNING','WARNING',
   'PAD-0031 has been offline for 6 days.',
   NOW() - INTERVAL '1 day', TRUE)
ON CONFLICT DO NOTHING;

-- OTA campaign
INSERT INTO smartpad_ota_campaigns
  (school_id, target_firmware, target_device_ids, updated_count, status)
VALUES
  ('SCH-AP-DEMO-0001', '1.4.0',
   ARRAY['PAD-0013','PAD-0027','PAD-0031'],
   0, 'IN_PROGRESS')
ON CONFLICT DO NOTHING;
