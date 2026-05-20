# NeuraLife — Offline Sync Architecture

*The design of the SmartPad's offline-first data layer — how student learning data is captured, queued, compressed, uploaded, and reconciled without ever blocking a student's session or losing a single data point.*

---

## 1. Why Offline-First is Non-Negotiable

NeuraLife is built for AP and Telangana schools. The infrastructure reality of these schools:

| Infrastructure | Reality in AP/TS |
| --- | --- |
| School WiFi coverage | Present in 60–70% of private schools. Unreliable in 40%. Absent in most government schools. |
| Home internet | Available in ~50% of student homes in Tier 2/3 towns. Much lower in rural areas. |
| Network stability | Even where WiFi exists, dropout during peak school hours (8 AM–4 PM) is common. |
| Power cuts | Frequent in AP/TS interior districts — WiFi router goes down with power. |

**The design rule this imposes:** The SmartPad must function identically whether it has been online for 5 minutes today or offline for 30 days. No feature that a student uses during a learning session can require internet connectivity. The sync layer is a background process — invisible to the student, never blocking.

**What this means in practice:**

- Student writes homework at 9 PM at home with no WiFi → session data captured and queued locally
- SmartPad connects to school WiFi at 8 AM next morning → queue drains automatically
- Student never sees a loading spinner during a learning session
- No data is ever lost due to connectivity failure

---

## 2. Two Databases, One Source of Truth Per Layer

NeuraLife uses two databases that serve completely different purposes and never conflict:

```
┌─────────────────────────────────────┐
│         SmartPad (on-device)         │
│                                      │
│  SQLite via Room ORM (Kotlin)        │
│  ─────────────────────────────────  │
│  • Source of truth for:              │
│    - Raw session data (unsynced)     │
│    - Local mastery map               │
│    - Cached content (chapters, PDFs) │
│    - Sync queue                      │
│    - Downloaded recommendations      │
│  • Owns: everything produced locally │
│  • Size: up to 7GB student data      │
│           + up to 20GB content cache │
└──────────────────┬──────────────────┘
                   │ WiFi sync (upload + download)
                   ▼
┌─────────────────────────────────────┐
│       Cloud (Supabase PostgreSQL)    │
│                                      │
│  Source of truth for:                │
│  • Calibrated mastery scores         │
│  • AI-generated insights             │
│  • Content recommendations           │
│  • School configuration              │
│  • All cross-school analytics        │
│  • OTA model versions                │
└─────────────────────────────────────┘
```

**The golden rule:** Raw session data belongs to the SmartPad until it has been confirmed synced. The cloud never overwrites raw session data. The SmartPad never stores calibrated scores — it only stores what the Edge AI computed locally.

---

## 3. On-Device SQLite Schema

The SmartPad's local database. Managed via Kotlin Room ORM. Exists independently of cloud connectivity.

```sql
-- ════════════════════════════════════════
-- STUDENT IDENTITY (local cache)
-- ════════════════════════════════════════

CREATE TABLE local_identity (
  neura_id          TEXT PRIMARY KEY,
  full_name         TEXT NOT NULL,
  current_grade     INTEGER NOT NULL,
  current_section   TEXT NOT NULL,
  school_id         TEXT NOT NULL,
  board             TEXT NOT NULL,      -- AP_STATE | TS_STATE | NCERT
  medium            TEXT NOT NULL,      -- ENGLISH | TELUGU
  pin_hash          TEXT NOT NULL,      -- bcrypt hash of 4-digit PIN
  last_cloud_sync   INTEGER,            -- Unix timestamp
  profile_version   INTEGER DEFAULT 1   -- bumped on cloud profile update
);

-- ════════════════════════════════════════
-- LOCAL MASTERY MAP
-- (Edge AI output — raw, not calibrated)
-- ════════════════════════════════════════

CREATE TABLE local_mastery (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  neura_id          TEXT NOT NULL,
  subject           TEXT NOT NULL,
  topic             TEXT NOT NULL,
  raw_score         REAL NOT NULL,          -- 0.0 to 1.0, from GAP-1
  error_patterns    TEXT,                   -- JSON array: ["CARRY_ERROR", "PHONETIC_SPELLING"]
  hesitation_count  INTEGER DEFAULT 0,
  hint_dependency   REAL DEFAULT 0.0,
  session_count     INTEGER DEFAULT 0,      -- sessions contributing to this score
  last_updated_at   INTEGER NOT NULL,       -- Unix timestamp
  synced            INTEGER DEFAULT 0,      -- 0 = pending sync, 1 = synced
  UNIQUE(neura_id, subject, topic)
);

-- ════════════════════════════════════════
-- SESSION QUEUE
-- (outbound — waiting to sync to cloud)
-- ════════════════════════════════════════

CREATE TABLE sync_queue (
  id                TEXT PRIMARY KEY,       -- UUID generated on device
  neura_id          TEXT NOT NULL,
  payload_type      TEXT NOT NULL,
  -- SESSION_DELTA: mastery + writing + habit signals from one session
  -- OCR_FALLBACK: low-confidence stroke batch for Cloud Vision recheck
  -- ATTENDANCE_CONFIRMATION: device-side attendance event
  payload           TEXT NOT NULL,          -- JSON blob
  created_at        INTEGER NOT NULL,       -- Unix timestamp
  attempt_count     INTEGER DEFAULT 0,
  last_attempt_at   INTEGER,
  status            TEXT DEFAULT 'PENDING', -- PENDING | SYNCING | SYNCED | FAILED
  error_message     TEXT
);

CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_sync_queue_created ON sync_queue(created_at);

-- ════════════════════════════════════════
-- ACTIVE SESSIONS
-- (in-progress — not yet queued)
-- ════════════════════════════════════════

CREATE TABLE active_sessions (
  id                TEXT PRIMARY KEY,       -- UUID
  neura_id          TEXT NOT NULL,
  subject           TEXT,
  content_ref       TEXT,                   -- chapter/problem being worked on
  started_at        INTEGER NOT NULL,       -- Unix timestamp
  last_active_at    INTEGER NOT NULL,
  word_count        INTEGER DEFAULT 0,
  hint_count        INTEGER DEFAULT 0,
  strokes_captured  INTEGER DEFAULT 0,
  status            TEXT DEFAULT 'ACTIVE'   -- ACTIVE | COMPLETED | ABANDONED
);

-- ════════════════════════════════════════
-- CONTENT CACHE
-- ════════════════════════════════════════

CREATE TABLE cached_content (
  content_id        TEXT PRIMARY KEY,       -- MATH-10-CH3
  subject           TEXT NOT NULL,
  grade             INTEGER NOT NULL,
  chapter_number    INTEGER NOT NULL,
  chapter_title     TEXT NOT NULL,
  file_path         TEXT NOT NULL,          -- local filesystem path to SVG/HTML bundle
  file_size_kb      INTEGER NOT NULL,
  checksum_sha256   TEXT NOT NULL,
  downloaded_at     INTEGER NOT NULL,       -- Unix timestamp
  last_accessed_at  INTEGER,
  access_count      INTEGER DEFAULT 0,
  download_type     TEXT NOT NULL           -- AUTO (current grade) | ON_DEMAND (other grade)
);

CREATE TABLE cached_problem_sets (
  problem_set_id    TEXT PRIMARY KEY,       -- PS-MATH-10-QE-001
  subject           TEXT NOT NULL,
  grade             INTEGER NOT NULL,
  topic             TEXT NOT NULL,
  content           TEXT NOT NULL,          -- JSON blob of problems
  downloaded_at     INTEGER NOT NULL,
  source            TEXT NOT NULL           -- RECOMMENDATION | HOMEWORK | STUDENT_REQUEST
);

-- ════════════════════════════════════════
-- INBOUND RECOMMENDATIONS
-- (downloaded from cloud, waiting for student)
-- ════════════════════════════════════════

CREATE TABLE pending_recommendations (
  id                TEXT PRIMARY KEY,       -- matches cloud content_recommendations.id
  recommended_at    INTEGER NOT NULL,
  subject           TEXT NOT NULL,
  topic             TEXT NOT NULL,
  reason            TEXT NOT NULL,          -- AT_RISK_REMEDIAL | PREREQUISITE_GAP | NEXT_TOPIC
  content_ids       TEXT,                   -- JSON array
  problem_set_ids   TEXT,                   -- JSON array
  shown_to_student  INTEGER DEFAULT 0,      -- 0 = not shown, 1 = shown
  started_at        INTEGER,
  completed_at      INTEGER
);

-- ════════════════════════════════════════
-- OTA STATE
-- ════════════════════════════════════════

CREATE TABLE ota_state (
  model_type        TEXT PRIMARY KEY,       -- HWR-1 | GAP-1 | WSS-1 | SHE-1
  current_version   TEXT NOT NULL,
  pending_version   TEXT,                   -- downloaded, awaiting install
  pending_file_path TEXT,
  pending_checksum  TEXT,
  last_check_at     INTEGER,
  last_install_at   INTEGER,
  install_status    TEXT DEFAULT 'CURRENT'  -- CURRENT | DOWNLOADING | READY | FAILED
);

-- ════════════════════════════════════════
-- SYNC METADATA
-- ════════════════════════════════════════

CREATE TABLE sync_metadata (
  key               TEXT PRIMARY KEY,
  value             TEXT NOT NULL,
  updated_at        INTEGER NOT NULL
);
-- Keys used:
--   last_upload_at       → Unix timestamp of last successful upload
--   last_download_at     → Unix timestamp of last successful download
--   upload_bytes_today   → rolling daily counter
--   queue_depth          → cached count for UI display
--   cloud_profile_hash   → detects if cloud profile has changed since last sync
```

---

## 4. Sync Agent — The Background Service

The Sync Agent is a Kotlin **Foreground Service** on NeuraOS. It runs continuously in the background and is never killed by the OS (foreground services are protected from Android's battery optimization kill).

### Sync Agent State Machine

```
┌──────────────────────────────────────────────────────────────┐
│                    SYNC AGENT STATES                          │
│                                                              │
│   IDLE ──────────────────────────────────────────────────┐  │
│     │                                                      │  │
│     │ WiFi connects                                        │  │
│     ▼                                                      │  │
│   CHECKING ──── API unreachable ──────────────────────────┤  │
│     │                                                      │  │
│     │ API reachable                                        │  │
│     ▼                                                      │  │
│   UPLOADING ──── Upload complete ───────────────────────┐ │  │
│     │              or queue empty                         │ │  │
│     │ Upload error                                        │ │  │
│     ▼                                                     │ │  │
│   RETRY_WAIT ── (exponential backoff: 30s, 2m, 10m) ────┘ │  │
│                                                            │  │
│   UPLOADING complete ──────────────────────────────────┐  │  │
│                                                         │  │  │
│     ▼                                                   │  │  │
│   DOWNLOADING ── Download complete ─────────────────────┘  │  │
│     (recommendations, OTA check, content prefetch)          │  │
│                                                              │  │
│   DOWNLOADING complete ─────────────────────────────────────┘  │
│     ▼                                                           │
│   IDLE (WiFi still connected: poll every 15 minutes)           │
└────────────────────────────────────────────────────────────────┘
```

### Sync Triggers

| Trigger | Action |
| --- | --- |
| WiFi network connects | Immediate sync attempt |
| App opens (student logs in) | Sync if > 30 minutes since last sync |
| Session completes (student closes notebook) | Queue session delta, attempt upload if WiFi available |
| OTA check schedule | Every 24 hours on WiFi connection |
| Manual (IT admin via device settings) | Full sync + OTA check + content refresh |

---

## 5. Upload Flow — Session Delta to Cloud

### What a Session Delta Contains

When a student completes a session (closes the notebook or switches subject), the Edge AI packages a session delta. This is the only data that ever leaves the device:

```json
{
  "queue_id": "550e8400-e29b-41d4-a716-446655440000",
  "payload_type": "SESSION_DELTA",
  "neura_id": "NID-2025-AP-084291",
  "device_id": "PAD-0042",
  "session": {
    "session_id": "SES-20250910-084291-003",
    "started_at": "2025-09-10T18:45:00Z",
    "ended_at": "2025-09-10T19:22:00Z",
    "subject": "MATHEMATICS",
    "content_ref": "MATH-10-CH3",
    "total_words_written": 312,
    "hint_requests": 2
  },
  "mastery_deltas": [
    {
      "topic": "QUADRATIC_EQUATIONS",
      "raw_score_before": 0.42,
      "raw_score_after": 0.51,
      "error_patterns": ["SIGN_ERROR", "FACTORING_ERROR"],
      "hesitation_count": 8,
      "hint_dependency_rate": 0.33
    }
  ],
  "writing_signals": {
    "words_assessed": 312,
    "clarity_score": 0.71,
    "speed_wpm": 16,
    "spelling_accuracy": 0.84
  },
  "habit_signals": {
    "session_start_time": "18:45",
    "focus_score": 0.78,
    "pause_count": 3,
    "longest_pause_seconds": 180
  },
  "ocr_fallbacks": [
    {
      "word_attempt": "rendered as strokes — opaque blob",
      "on_device_confidence": 0.61,
      "context_subject": "MATHEMATICS",
      "stroke_hash": "sha256:abc123..."
    }
  ],
  "edge_model_versions": {
    "HWR-1": "1.3.1",
    "GAP-1": "1.1.4",
    "WSS-1": "1.0.2",
    "SHE-1": "1.0.1"
  },
  "device_signature": "hmac-sha256:xyz789..."
}
```

**What is NOT in this payload:**

- Raw handwriting strokes (never leave device)
- Recognised text of what the student wrote (privacy)
- Student's personal details beyond NeuraID (already on cloud)
- Screen captures or recordings

### Upload Sequence

```
Sync Agent checks queue: SELECT * FROM sync_queue WHERE status = 'PENDING' ORDER BY created_at LIMIT 50

If queue depth > 0:
  → Bundle items into batch payload
  → GZIP compress (session deltas compress 60–70%)
  → POST /api/v1/sync/batch
      Headers:
        Authorization: Bearer {device_jwt}
        X-Device-ID: PAD-0042
        X-Device-Signature: {hmac-sha256 of body}
        Content-Encoding: gzip

  Server response:
    200: {
      "accepted": ["uuid1", "uuid2", ...],
      "rejected": [
        { "id": "uuid3", "reason": "DUPLICATE_SESSION", "action": "DISCARD" },
        { "id": "uuid4", "reason": "NEURA_ID_MISMATCH", "action": "HOLD" }
      ]
    }

  On 200:
    → UPDATE sync_queue SET status = 'SYNCED' WHERE id IN (accepted_ids)
    → For rejected with action = DISCARD: DELETE from queue
    → For rejected with action = HOLD: increment attempt_count, log error

  On 4xx (client error):
    → Log error, do not retry (bad data — flag for manual review)

  On 5xx (server error) or network timeout:
    → Increment attempt_count
    → Mark status = 'PENDING' (will retry)
    → Backoff: 30s → 2min → 10min → 1hr → daily
    → After 10 failed attempts: status = 'FAILED', alert IT admin

  If queue still has items after batch:
    → Continue uploading in next batch (loop until empty)
```

### Compression Strategy

| Payload type | Typical raw size | After GZIP | Saving |
| --- | --- | --- | --- |
| Single session delta | 8–15 KB | 2–4 KB | ~70% |
| Batch of 50 sessions | 400–750 KB | 100–200 KB | ~73% |
| 30-day backlog (heavy student) | 15–25 MB | 4–7 MB | ~72% |

At school WiFi speeds (typically 5–20 Mbps), a 30-day backlog uploads in under 10 seconds. No student ever waits.

---

## 6. Download Flow — Content and Intelligence to Device

After upload completes, the Sync Agent switches to download mode:

```
STEP 1: Fetch pending recommendations
  GET /api/v1/sync/recommendations/{neura_id}
  → Returns: list of content_ids and problem_set_ids recommended since last sync
  → For each: GET /api/v1/sync/content/{content_id}
  → Store in cached_content + cached_problem_sets
  → INSERT into pending_recommendations
  → SmartPad home screen: "Recommended for you" card appears

STEP 2: OTA check
  GET /api/v1/ota/check?device_id=PAD-0042&models=HWR-1:1.3.1,GAP-1:1.1.4,...
  → Response: { updates: [{ model_type: "HWR-1", version: "1.4.0", url, checksum }] }
  → For each update:
      Download binary to temp file
      Verify SHA-256 checksum
      If verified: UPDATE ota_state SET install_status = 'READY'
      If checksum fails: DELETE temp file, log failure, retry next sync

STEP 3: Content prefetch (current grade, background, low priority)
  → Check which chapters of current grade are NOT in cached_content
  → Download missing chapters (largest first, so student gets full chapters not partial)
  → Skip if storage < 2GB free (protect student data space)
  → Update cached_content on completion

STEP 4: Sync school config (if cloud_profile_hash has changed)
  GET /api/v1/schools/{school_id}/config?since={last_sync_ts}
  → Timetable updates, homework assignments, announcements
  → Store in local config cache

STEP 5: Update sync_metadata
  → last_upload_at, last_download_at → current timestamp
  → queue_depth → 0 (or remaining count)
  → cloud_profile_hash → new hash from Step 4
```

### Content Download Priority Order

When storage is limited or bandwidth is slow, content downloads in this order:

| Priority | Content | Reason |
| --- | --- | --- |
| 1 | Recommended problem sets (from ML pipeline) | Directly tied to current learning gaps |
| 2 | Homework assignments from teachers | Due date creates urgency |
| 3 | Current grade missing chapters (by chapter number) | Sequential — student most likely to need next chapter |
| 4 | Other grade chapters (on-demand, initiated by student) | Student explicitly requested |
| 5 | OTA model updates | Background, student unaware — applied after session ends |

---

## 7. Content Pre-Download Strategy

### Current Grade — Fully Pre-Downloaded

On first sync after enrollment:

```
Student enrolled in Grade 10, English medium, AP State board
  → Sync Agent downloads:
      All chapters: MATH-10-CH1 through MATH-10-CH15
      All chapters: SCI-10-CH1 through SCI-10-CH12
      All chapters: ENG-10-CH1 through ENG-10-CH14
      All chapters: TEL-10-CH1 through TEL-10-CH12
      All chapters: SS-10-CH1 through SS-10-CH16
  → Total estimated size: 800MB – 1.5GB (SVG + animations, not video)
  → Download time at 10 Mbps school WiFi: 12–25 minutes
  → Runs silently in background during school hours
  → Student fully offline-capable within first school day
```

**Storage budget:**

- Total device storage: 32GB
- OS + system: 4GB reserved
- AI models: 120MB reserved
- Current grade content (pre-downloaded): 1–2GB
- Student writing data + session queue: 7GB max
- Remaining buffer for other-grade on-demand: ~18GB

### Other Grades — Chapter-Level On-Demand

```
Student opens Grade 8 chapter (prerequisite gap):
  → Check cached_content: MATH-8-CH5 → NOT found
  → Show download prompt: "This chapter (Grade 8, Ch 5) needs to download first.
    Download now? (45 MB, ~30 seconds on WiFi)"
  → Student taps Download
  → Download runs, progress bar shown
  → On complete: chapter opens immediately
  → download_type = 'ON_DEMAND' in cached_content
  → Future sessions: chapter available fully offline
```

**What if no WiFi for on-demand chapter?**

```
→ Show: "This chapter isn't downloaded yet. Connect to WiFi to download it."
→ Show alternative: "Here are practice problems from your downloaded chapters
  that also help with this topic."
→ Student is never left with nothing to do
```

---

## 8. Conflict Resolution

Conflicts occur when the same logical record is updated from two sources before sync. In NeuraLife's architecture, most conflicts are architecturally eliminated:

| Data type | Who can write | Conflict possible? |
| --- | --- | --- |
| Raw mastery scores | SmartPad only | No — cloud never writes raw scores |
| Calibrated mastery scores | Cloud only | No — device never writes calibrated scores |
| Content cache | SmartPad only | No — read-only from cloud |
| School config | Cloud only | No — device treats as read-only |
| Session data | SmartPad only | No — sessions are device-originated |

**The one real conflict scenario:** A student uses two different SmartPads (their device is lost, they borrow another) and both sync mastery data for the same `(neura_id, subject, topic)` on the same date.

**Resolution rule:**

```sql
-- On INSERT conflict in mastery_snapshots:
INSERT INTO mastery_snapshots (neura_id, snapshot_date, subject, topic, raw_score, ...)
VALUES (...)
ON CONFLICT (neura_id, snapshot_date, subject, topic)
DO UPDATE SET
  raw_score = GREATEST(EXCLUDED.raw_score, mastery_snapshots.raw_score),
  -- Take the higher score (student's best performance)
  session_count = mastery_snapshots.session_count + EXCLUDED.session_count,
  synced_at = NOW()
  -- The original record is kept in mastery_audit_log for traceability
```

**Rule: Take the higher raw score.** If a student practiced on two devices, their best demonstrated mastery is the accurate representation. Lower scores from the other device represent the same topic at an earlier state.

All conflict resolutions are written to a `mastery_audit_log` table (cloud-side) for traceability.

---

## 9. Long Offline Periods

### Scenario: Student offline for 30+ days (illness, holidays, device issue)

```
Student returns after 45 days offline
  → SmartPad has 45 days of sessions in sync_queue
  → Estimated queue depth: 45 sessions × 8KB avg = 360KB raw = ~100KB compressed
  → Sync Agent connects to WiFi:

  Step 1: Check server for schema or API changes since last sync
    GET /api/v1/sync/status/{device_id}
    → Response includes: api_version, expected_payload_format, any breaking changes

  Step 2: Upload in batches of 50 items
    → Multiple POST /sync/batch calls until queue empty
    → Typical time: < 30 seconds for 45 days of data

  Step 3: Server processes backlog
    → Mastery Calibration Engine will run on next nightly cron
    → Insights generated at next run
    → No special fast-track — 45-day backlog gets processed at same priority

  Step 4: Download
    → 45 days of recommendations (may be large)
    → OTA updates (up to 4 model updates may have been released)
    → Content updates (new chapters published)
    → School config changes (timetable, new teachers)

  Total reconnection time for 45-day offline student: < 5 minutes
```

### Scenario: Device offline permanently (lost, stolen, broken)

```
Device not synced for > 14 days:
  → Principal sees device flagged in fleet dashboard: "Last seen 14 days ago"
  → IT admin can trigger Remote Lock via Web Admin Console
  → POST /api/v1/devices/{device_id}/lock
  → Lock command stored in pending_commands table
  → If device ever reconnects: lock command applied before any sync proceeds
  → If device uses GPS: last known location shown in fleet dashboard

Student data:
  → All synced sessions: safe on cloud
  → Unsynced sessions (after last sync): LOST permanently
  → Unsynced mastery deltas: LOST permanently
  → This is the only data loss scenario in NeuraLife

Mitigation:
  → Sync on every WiFi connection (school WiFi catches most sessions)
  → Maximum expected loss: one evening's session if device lost overnight after school
```

---

## 10. Sync Monitoring & Observability

### Device-Side Indicators

The SmartPad shows sync status in a non-intrusive status bar element:

| Indicator | Meaning |
| --- | --- |
| Green dot (solid) | Synced within last 24 hours |
| Amber dot (pulsing) | Sync pending — queue has items |
| Grey dot | Offline — no WiFi, queue building |
| Red dot | Sync failed — IT admin attention needed |

Student never sees queue depth or error messages — only the status dot. IT admin sees full detail in Web Admin Console fleet view.

### Cloud-Side Monitoring (Principal / IT Admin)

```
GET /api/v1/schools/{school_id}/fleet/sync-health

Response:
{
  "school_id": "SCH-AP-00142",
  "total_devices": 45,
  "synced_today": 38,
  "not_synced_48h": 4,
  "not_synced_7d": 2,
  "not_synced_30d": 1,
  "devices_with_failed_queue": [
    {
      "device_id": "PAD-0031",
      "last_sync": "2025-08-10T08:22:00Z",
      "failed_items": 3,
      "error": "NEURA_ID_MISMATCH"
    }
  ],
  "ota_rollout": {
    "HWR-1": { "target": "1.4.0", "current": 38, "pending": 7 }
  }
}
```

### Alerts Triggered Automatically

| Condition | Alert recipient | Channel |
| --- | --- | --- |
| Device not synced for 48 hours | Principal | In-app notification |
| Device not synced for 7 days | Principal | FCM push |
| Sync queue failure (10+ attempts) | Principal + IT admin | FCM push + email |
| OTA update failed on device | Principal | In-app notification |
| Storage < 500MB on device | Principal | In-app warning |

---

## 11. Bandwidth & Data Usage Estimates

For a typical 500-student school:

| Data flow | Daily volume | Monthly volume |
| --- | --- | --- |
| Session delta uploads | 500 students × 2 sessions × 4KB avg = 4MB/day | ~120MB |
| OCR fallback uploads | ~200 low-conf words × 1KB = 200KB/day | ~6MB |
| Recommendations download | ~20 students × 50KB = 1MB/day | ~30MB |
| Content download (new students) | ~5 new devices × 1.5GB = 7.5GB/month peak | 7.5GB (front-loaded) |
| OTA updates (model binary) | Monthly event, ~50MB per model × 4 models = 200MB | 200MB/month |
| **Ongoing steady-state (post-onboarding)** | **~6MB/day** | **~160MB/month** |

At school WiFi speeds (5–20 Mbps), daily steady-state sync for the entire school completes within minutes. The only bandwidth-intensive event is the initial content download during onboarding week.

---

## 12. Data Retention on Device

The SmartPad has finite storage. The Sync Agent manages local data lifecycle:

| Data type | Retention on device | After retention period |
| --- | --- | --- |
| Synced session queue items | Delete immediately after confirmed sync | Gone from device, safe on cloud |
| Unsynced session queue items | Keep indefinitely (never delete unsynced data) | — |
| Active sessions (in progress) | Keep until session complete + queued | Converted to sync_queue item |
| Writing data (raw strokes processed by Edge AI) | Delete after Edge AI processes each session | Never stored permanently — processing is real-time |
| Cached content — current grade | Keep permanently (never auto-delete) | Manual IT admin clear only |
| Cached content — on-demand other grades | Delete after 90 days of no access | Freed storage used for new content |
| Cached problem sets | Delete after completed + synced | Keep if not yet completed |
| Pending recommendations | Delete after student completes or 60 days | Cloud record remains |
| Downloaded OTA binary (installed) | Delete after successful install confirmation | Replaced by newer binary |

---

## 13. Version Milestones

### v1 — Demo Ready

| Component | Implementation |
| --- | --- |
| SQLite schema | Full schema as specified above |
| Sync Agent | Basic Kotlin service — upload + download + OTA check |
| Session delta format | Full JSON payload as specified |
| Upload batching | 50 items per batch, GZIP compression |
| Conflict resolution | GREATEST(raw_score) rule on INSERT conflict |
| Content pre-download | Current grade auto on first sync |
| On-demand chapter download | User-initiated, chapter-level |
| Sync status indicator | Status dot in status bar |
| Fleet sync health API | Basic endpoint for Web Admin Console |

### v2 — Post First School Deal

| Addition | Notes |
| --- | --- |
| Differential content updates | Only changed segments of a chapter re-download, not full chapter |
| Background content prefetch scheduling | Prefer off-peak hours (10 PM–6 AM) to avoid school WiFi congestion |
| Per-device sync analytics | Detailed sync history, bandwidth used, queue age |
| Peer sync (device-to-device via local WiFi) | For schools with very slow internet — devices share content locally. Protocol: mDNS service discovery + HTTP transfer over local network. Design decision deferred to v2 build phase. |
| Encrypted local database | SQLite Cipher for at-rest encryption on device (v2 — v1 demo risk acceptable) |

### v3 — Scale

| Addition | Notes |
| --- | --- |
| Delta compression for content updates | Binary diff (bsdiff) for model OTA — reduces update size by 80% |
| Multi-region content CDN | Cloudflare nodes in Mumbai + Hyderabad for fast content delivery |
| Predictive prefetch | ML predicts which chapters student will need next week — pre-downloads before student asks |

---

## 14. Confirmed Decisions

| Decision | Rationale |
| --- | --- |
| SQLite via Room ORM on device | Mature, battle-tested on Android, supports complex queries, no network dependency |
| Foreground Service for Sync Agent | Cannot be killed by Android battery optimization — critical for data reliability |
| GZIP compression on all uploads | 70%+ size reduction, negligible CPU cost on ARM |
| HMAC-SHA256 body signature on sync requests | Prevents device impersonation and replay attacks |
| Batch size: 50 items per upload request | Balances payload size vs request overhead. Adjustable per device capability. |
| Conflict rule: GREATEST raw score wins | Student's best demonstrated mastery is the accurate representation |
| Never auto-delete unsynced data | Data loss is worse than storage pressure. IT admin manually clears if needed. |
| Current grade fully pre-downloaded | Offline-first guarantee for all core learning sessions |
| Other grades: chapter-level on-demand | Balances storage with cross-grade access |
| YouTube links: WiFi-only, never cached | Videos are supplementary — not blocking core learning. Caching 100+ videos per device is impractical. |
| OTA install: atomic file replace only | No partial model updates — either fully updated or not at all |
| Maximum batch retry: 10 attempts then FAILED | Prevents indefinite retry loops for permanently bad data |
| SmartPad: WiFi-only permanently — no SIM, no mobile data sync | SmartPad will not carry a SIM in any hardware version. Sync is WiFi-only by design. No mobile data sync required at any version. School WiFi catches the majority of sessions. Home WiFi catches evenings. Maximum data loss scenario remains one session, which is acceptable. |
| Content chapter bundle format: self-contained HTML bundle (v1) → native renderer (v2) | HTML + SVG + CSS animations + JS interactivity packaged as a single `.nlc` (NeuraLife Content) zip bundle. Rendered in a sandboxed WebView on v1 (stock Android tablet). Enables SVG diagrams, CSS/JS animations, and play-to-learn interactive elements with zero external dependencies. Migrated to a native Kotlin renderer in v2 when building real NeuraOS on E-Ink hardware, where WebView partial refresh behaviour needs tuning. Full format spec defined in Content Layer (Segment 11). |
| Encrypted local database (SQLite Cipher): v2 | v1 demo risk is low. Physical device security handled by NeuraOS kiosk lock. Encryption adds ~5% performance overhead — acceptable trade-off at v2 when real student data is live in production. |
| Peer device sync: v2, protocol mDNS + local HTTP | Not needed for demo. v2 implementation: mDNS service discovery so devices find each other on the same school WiFi network, then HTTP transfer. No external protocol dependency. |

## 15. Open Questions

*All open questions from this document resolved. No remaining open questions.*

*Decisions feeding into upcoming segments:*

| Decision | Resolved in Segment |
| --- | --- |
| Full `.nlc` content bundle format spec — file structure, SVG schema, animation format, play-to-learn interaction spec | Segment 11 — Content Layer |
| Content chapter size estimates per subject per grade (determines storage budget accuracy) | Segment 11 — Content Layer |

---

*Next document: **Segment 11 — Content Layer***