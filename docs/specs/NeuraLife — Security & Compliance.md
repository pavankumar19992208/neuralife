# NeuraLife — Security & Compliance

*The complete specification for data protection, privacy compliance, authentication security, encryption, audit controls, and regulatory obligations — built for a platform handling children's data at scale in India.*

---

## 1. Why This Is Non-Negotiable

NeuraLife handles:

- **Children's personal data** — name, date of birth, school, grade, learning behaviour
- **Aadhaar-linked identity** — even as a hash, this carries regulatory weight
- **Parental contact information** — mobile numbers, communication records
- **Learning behaviour data** — session patterns, mastery scores, error patterns
- **Biometric-adjacent data** — handwriting patterns (not biometric by legal definition, but sensitive)

A school principal will ask two questions before signing any contract:

1. "Is my students' data safe?"
2. "Are you compliant with Indian law?"

If either answer is uncertain, the deal does not close. Security and compliance are not backend concerns — they are sales requirements.

---

## 2. Regulatory Framework

### Digital Personal Data Protection Act 2023 (DPDP Act)

India's primary data protection law. Passed August 2023. Enforcement rules being finalised (expected 2025–26). NeuraLife must be compliant before approaching any school.

**Key obligations relevant to NeuraLife:**

| Obligation | What it means | NeuraLife implementation |
| --- | --- | --- |
| **Consent** | Explicit, informed consent from parent/guardian before processing child's data | Consent checkbox at student enrollment. Consent record stored with timestamp and IP. |
| **Purpose limitation** | Data collected for learning analysis cannot be used for any other purpose | No advertising. No third-party data sharing. No profiling for non-educational purposes. |
| **Data minimisation** | Only collect what is necessary | Raw strokes never leave device. Only classified signals sync. No unnecessary PII fields. |
| **Right to erasure** | Parent can request deletion of all data | DELETE /identity/:neuraId API. Cascade delete across all tables. 30-day execution window. |
| **Data localisation** | Significant Data Fiduciaries must store data in India | Supabase hosted in `ap-south-1` (Mumbai). All data stays in India. |
| **Children's data** | Parental consent required for under-18. Enhanced protection. | All students are under 18. All consent obtained from parent at enrollment. |
| **Grievance mechanism** | Data principal (parent) must be able to raise concerns | Grievance email listed in Privacy Policy and in-app. You are the Grievance Officer at v1 scale. |
| **Data Protection Officer** | Required only for Significant Data Fiduciaries | Not required at current scale. Revisit if government notifies NeuraLife as SDF. |

### UIDAI Guidelines (Aadhaar)

NeuraLife uses Aadhaar for deduplication. UIDAI rules apply:

| Rule | NeuraLife implementation |
| --- | --- |
| Do not store raw Aadhaar number | SHA-256 hash generated client-side. Raw number never transmitted or stored. |
| Do not use Aadhaar for authentication | NeuraID is the authentication token. Aadhaar hash is used only for deduplication check at enrollment. |
| Do not share Aadhaar data | aadhaar_hash stays in NeuraLife database only. Never shared with any third party. |

### IT Act 2000 + Amendment 2008

Applies to all digital platforms operating in India.

| Requirement | NeuraLife implementation |
| --- | --- |
| Reasonable security practices | Encryption in transit (TLS 1.3), encrypted database at rest, JWT authentication |
| Sensitive personal data protection | Student data classified as sensitive. Access controls enforced via Supabase RLS. |
| Privacy Policy | Published on website. Linked from enrollment flow. |

### TRAI Regulations (SMS)

All transactional SMS sent via MSG91 must comply with TRAI DLT (Distributed Ledger Technology) regulations.

| Requirement | NeuraLife implementation |
| --- | --- |
| Entity registration | Register NeuraLife as a sender entity on TRAI DLT platform |
| Template pre-registration | All SMS templates registered before use |
| Header (Sender ID) | Register short code (e.g., NRLIFE) as sender ID |
| Scrubbing | MSG91 handles NDNC scrubbing automatically |

---

## 3. Data Classification

Every data type in NeuraLife classified by sensitivity:

| Classification | Data types | Access | Retention |
| --- | --- | --- | --- |
| **CRITICAL** | aadhaar_hash, parent_mobile, student full name + DOB combined | API Gateway only via NeuraID routes. Never in any log. Never in any export. | As long as student is active. Deletion on parent request. |
| **SENSITIVE** | Mastery scores, calibrated percentiles, AT_RISK status, error patterns, study habit signals | Role-scoped via RLS. Teacher sees own class. Parent sees own child. | 5 years post-graduation or on deletion request. |
| **INTERNAL** | School configuration, timetable, teacher records, attendance | School-scoped via RLS. No cross-school access. | Duration of school contract + 1 year. |
| **OPERATIONAL** | Sync logs, OTA update logs, notification delivery logs | IT Admin only. | 90 days rolling. Auto-purged. |
| **PUBLIC** | NeuraSphere approved posts (within platform, not externally public), badges | All NeuraLife users (within platform only). | Until student deletes or account deactivated. |

---

## 4. Authentication Security

### OTP Authentication (Teachers, Parents, Principals)

```
Flow:
  POST /auth/otp/request { mobile: '+91-9876543210' }
  → Generate 6-digit OTP (cryptographically random, Math.random() NOT used)
  → Store: SHA-256(OTP) in Redis with 10-minute TTL (plaintext OTP never stored)
  → Send via MSG91

  POST /auth/otp/verify { mobile, otp }
  → Hash submitted OTP → compare with stored hash
  → Rate limit: 5 attempts per mobile per 10 minutes
  → On 5th failure: lock mobile for 30 minutes
  → On success: issue JWT (24hr) + refresh token (30 days, httpOnly cookie)
  → Delete OTP from Redis immediately after successful verify
```

### PIN Authentication (Students on SmartPad)

```
Student sets PIN at first enrollment:
  POST /auth/pin/set { neura_id, pin }
  → Validate: 4–6 digits only
  → Store: bcrypt(pin, salt_rounds=12) in smartpad_devices.pin_hash
  → Raw PIN never stored or logged

Student logs in on SmartPad:
  POST /auth/pin/verify { neura_id, pin, device_id }
  → Verify: bcrypt.compare(submitted_pin, stored_hash)
  → Rate limit: 5 attempts → 15-minute lockout → 10 attempts → IT admin alert
  → On success: issue device-scoped JWT (8hr — school day duration)
  → JWT bound to device_id: requests from different device rejected

PIN reset:
  Only via Principal in Web Admin Console
  → POST /auth/pin/reset { neura_id } (Principal auth required)
  → Student sets new PIN on next SmartPad login
```

### JWT Security

```tsx
// JWT payload — no sensitive data in token
interface JWTPayload {
  sub: string;          // user UUID (not NeuraID — internal UUID only)
  role: UserRole;       // PRINCIPAL | TEACHER | PARENT | STUDENT | SYSTEM
  school_id: string;    // for school-scoped RLS
  jti: string;          // unique token ID (for revocation)
  iat: number;
  exp: number;
}

// What is NOT in the JWT:
// - Student name (fetch from API when needed)
// - aadhaar_hash (never in any token or log)
// - parent_mobile (never in any token or log)
// - Mastery scores (fetch from API)
```

**JWT security controls:**

| Control | Implementation |
| --- | --- |
| Secret rotation | JWT signing secret rotated every 90 days. Existing tokens valid until expiry. |
| Token revocation | `jti` stored in Redis on logout. Middleware checks revocation list on every request. |
| Refresh token | httpOnly cookie, 30-day expiry. Rotating refresh tokens (new token issued on each use). |
| Algorithm | RS256 (asymmetric). Private key on server only. Public key for verification. |
| Token binding | Device-scoped tokens (SmartPad) include `device_id` claim. Requests validated against claim. |

---

## 5. Data Encryption

### In Transit

| Connection | Protocol | Notes |
| --- | --- | --- |
| Client apps → API Gateway | TLS 1.3 | Enforced by Railway. HTTP rejected. |
| API Gateway → Supabase | TLS 1.3 | Supabase enforces. |
| API Gateway → ML Microservice | TLS 1.3 (internal) | Internal Railway network, still encrypted. |
| SmartPad → API Gateway | TLS 1.3 + HMAC body signature | Additional layer: request body signed with device-specific HMAC key. |
| API Gateway → MSG91/FCM/Resend | TLS 1.3 | All third-party API calls over HTTPS. |
| Content delivery (Supabase Storage) | TLS 1.3 | All .nlc bundle downloads encrypted in transit. |

### At Rest

| Data store | Encryption | Implementation |
| --- | --- | --- |
| Supabase PostgreSQL | AES-256 at rest | Supabase handles. Enabled by default on all plans. |
| Supabase Storage | AES-256 at rest | Supabase handles. All .nlc files and model binaries encrypted. |
| SmartPad SQLite (v1) | None | Kiosk OS + PIN lock is v1 physical security. Acceptable for demo. |
| SmartPad SQLite (v2) | SQLite Cipher (AES-256) | Added in v2 when production student data is live. |
| Redis (v2) | Encryption at rest | Upstash Redis encrypts at rest by default. |

### Aadhaar Hash — Special Handling

```jsx
// CLIENT-SIDE ONLY — runs in browser/React Native before any API call
// Raw Aadhaar number NEVER sent over the network

async function hashAadhaar(rawAadhaar: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawAadhaar.replace(/\s/g, ''));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Usage in enrollment form:
const aadhaarHash = await hashAadhaar(formValues.aadhaar);
// Only aadhaarHash is sent in POST /identity/generate
// formValues.aadhaar is cleared from memory immediately after
```

**Why SHA-256 and not bcrypt for Aadhaar hash?**

Aadhaar is a 12-digit number — low entropy, fixed format. bcrypt is designed for passwords. For deduplication use (not authentication), SHA-256 is appropriate because:

- The purpose is matching: does this hash already exist in our database?
- We do not need to verify the hash against user input at login
- bcrypt is deliberately slow — unnecessary cost for a lookup operation
- SHA-256 is one-way and deterministic — same Aadhaar always produces same hash

---

## 6. API Security

### Request Validation

Every API request passes through validation middleware before reaching route handlers:

```tsx
// Middleware stack (in order):
1. TLS termination (Railway level)
2. Rate limiting (by IP + by user ID)
3. JWT verification (signature + expiry + revocation check)
4. Role guard (route-level: PRINCIPAL only, TEACHER only, etc.)
5. School isolation (school_id from JWT matches route parameter)
6. Request body validation (Zod schema validation)
7. Input sanitisation (strip unexpected fields, escape strings)
8. Route handler executes
```

### Rate Limiting

| Endpoint group | Limit | Window |
| --- | --- | --- |
| POST /auth/otp/request | 3 requests per mobile | 10 minutes |
| POST /auth/otp/verify | 5 attempts per mobile | 10 minutes |
| POST /auth/pin/verify | 5 attempts per device | 15 minutes |
| GET /students/* (mastery data) | 100 requests | 1 minute |
| POST /sync/batch | 10 requests per device | 1 hour |
| POST /sphere/posts | 5 posts per student | 1 hour |
| All other authenticated routes | 300 requests per user | 1 minute |

### SmartPad Request Signature

SmartPad sync requests include an HMAC-SHA256 body signature to prevent:

- Device impersonation (another device faking sync for a different NeuraID)
- Replay attacks (resending a captured sync request)

```tsx
// SmartPad generates signature before each sync request
const deviceSecret = getStoredDeviceSecret(); // set at device provisioning
const timestamp = Date.now().toString();
const body = JSON.stringify(payload);
const message = `${timestamp}:${body}`;
const signature = HMAC_SHA256(message, deviceSecret);

// Request headers:
// X-Device-ID: PAD-0042
// X-Timestamp: 1720000000000
// X-Signature: {hmac_hex}

// API Gateway validates:
// 1. X-Timestamp within 5 minutes of server time (replay prevention)
// 2. HMAC(X-Timestamp + body, device_secret) matches X-Signature
// 3. device_id matches the NeuraID in payload (no cross-device spoofing)
```

### SQL Injection Prevention

All database queries use Supabase's PostgREST API or parameterized queries via the Supabase JS SDK. Raw SQL is only written in:

- Migration files (reviewed before execution)
- ML Microservice analytics queries (parameterized via SQLAlchemy)

No string concatenation into SQL queries anywhere in the codebase.

---

## 7. Row-Level Security (RLS) — Complete Policy Map

Supabase RLS enforces school isolation at the database layer. No application-level isolation needed.

```sql
-- ════════════════════════════════════════
-- SCHOOL ISOLATION (applied to all school-scoped tables)
-- ════════════════════════════════════════

-- Pattern: users can only read/write rows matching their school_id

CREATE POLICY "school_read" ON students
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM school_enrollments se
      WHERE se.neura_id = students.neura_id
      AND se.school_id = (auth.jwt() ->> 'school_id')
    )
  );

-- ════════════════════════════════════════
-- STUDENT SELF-READ (own data only)
-- ════════════════════════════════════════

CREATE POLICY "student_self_read" ON mastery_snapshots
  FOR SELECT
  USING (
    neura_id = (auth.jwt() ->> 'neura_id')
    OR (auth.jwt() ->> 'role') IN ('TEACHER', 'PRINCIPAL', 'SYSTEM')
  );

-- ════════════════════════════════════════
-- TEACHER — OWN CLASS ONLY
-- ════════════════════════════════════════

CREATE POLICY "teacher_class_read" ON mastery_snapshots
  FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'TEACHER'
    AND EXISTS (
      SELECT 1 FROM class_teacher_assignments cta
      JOIN school_enrollments se ON se.neura_id = mastery_snapshots.neura_id
      WHERE cta.teacher_id = (auth.jwt() ->> 'teacher_id')::UUID
      AND cta.class_year = se.class_year
      AND cta.section = se.section
      AND cta.school_id = (auth.jwt() ->> 'school_id')
    )
  );

-- ════════════════════════════════════════
-- SYSTEM ROLE — FULL WRITE ACCESS
-- (ML Microservice only — no school_id bound)
-- ════════════════════════════════════════

CREATE POLICY "system_write" ON calibrated_mastery_scores
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') = 'SYSTEM');

-- ════════════════════════════════════════
-- PARENT — OWN CHILD ONLY
-- ════════════════════════════════════════

CREATE POLICY "parent_child_read" ON student_insights
  FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'PARENT'
    AND neura_id = (auth.jwt() ->> 'linked_neura_id')
    -- linked_neura_id set in JWT at login: parent's registered child
  );

-- ════════════════════════════════════════
-- NEURASPHERE — MODERATED ONLY VISIBLE
-- ════════════════════════════════════════

CREATE POLICY "sphere_approved_only" ON neurasphere_posts
  FOR SELECT
  USING (
    moderation_status = 'APPROVED'
    OR neura_id = (auth.jwt() ->> 'neura_id')  -- student sees own pending posts
    OR (auth.jwt() ->> 'role') IN ('PRINCIPAL', 'SYSTEM')  -- admins see all
  );
```

---

## 8. Privacy-by-Design Decisions

These are architectural decisions — not policy statements — that protect privacy at the system level.

| Decision | Privacy benefit |
| --- | --- |
| Raw handwriting strokes never leave SmartPad | Student's actual written content is private by architecture, not policy |
| Aadhaar hashed client-side before transmission | Raw Aadhaar number physically cannot be intercepted in transit |
| NeuraID is the only cross-service student identifier | No email address, no phone number used as identifier — reduces PII exposure in logs |
| ML Microservice uses neura_id only, never name or contact | AI pipelines have zero access to student PII. Insight generation receives only structured signals. |
| No analytics tracking on student or parent actions | NeuraLife does not track page views, click patterns, or session time for advertising or product analytics |
| Claude API receives no PII | Insight generation prompt contains only structured data (mastery scores, error patterns, subject, grade). No names, no contact details passed to Anthropic. |
| NeuraSphere posts moderated before publishing | No harmful content reaches students — ever |
| Logs stripped of PII | Application logs redact aadhaar_hash, parent_mobile, student full name. Only NeuraIDs appear in logs. |

---

## 9. Consent Flow

### At Student Enrollment (Principal enrolls student)

```
Principal fills enrollment form:
  → Student name, DOB, gender (optional), parent mobile, Aadhaar

Before submitting, principal sees:
  ┌─────────────────────────────────────────────────────┐
  │  Data Collection Notice                              │
  │                                                      │
  │  NeuraLife will collect and process the following   │
  │  data for {student_name}:                           │
  │                                                      │
  │  • Personal details (name, date of birth)           │
  │  • Learning behaviour data from SmartPad sessions   │
  │  • Attendance records                               │
  │  • Academic performance data                        │
  │                                                      │
  │  This data is used exclusively to:                  │
  │  • Track and improve student learning outcomes      │
  │  • Generate insights for teachers and parents       │
  │  • Provide personalised content recommendations     │
  │                                                      │
  │  Your data is stored securely in India and is      │
  │  never sold or shared with third parties.           │
  │                                                      │
  │  Parents may request data deletion at any time      │
  │  via the NeuraLife app or by emailing               │
  │  privacy@neuralife.in                               │
  │                                                      │
  │  [Read full Privacy Policy]                         │
  │                                                      │
  │  ☐ I confirm that I have parental consent to       │
  │    enroll this student and collect their data       │
  │    as described above.                              │
  │                                                      │
  │  [Enroll Student]  (disabled until checkbox ticked) │
  └─────────────────────────────────────────────────────┘

On submission:
  → INSERT into consent_records:
      { neura_id, consented_by_role: 'PRINCIPAL',
        consented_by_id: principal_id, school_id,
        consent_text_version: '1.0',
        consented_at: NOW(), ip_address: hashed_ip }
```

### Parent First Login Consent

When parent logs into the app for the first time:

```
Parent sees a simplified consent screen:
  → "NeuraLife will send you daily updates about your
     child's learning progress. Your data is stored
     securely in India and used only for this purpose."
  → [I Agree] button
  → Consent recorded in consent_records with parent's ID
```

### Consent Records Table

```sql
CREATE TABLE consent_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id          TEXT REFERENCES students(neura_id),
  consent_type      TEXT NOT NULL,        -- ENROLLMENT | PARENT_FIRST_LOGIN
  consented_by_role TEXT NOT NULL,        -- PRINCIPAL | PARENT
  consented_by_id   UUID NOT NULL,
  school_id         TEXT NOT NULL,
  consent_text_version TEXT NOT NULL,     -- version of the consent text shown
  consented_at      TIMESTAMPTZ NOT NULL,
  ip_address_hash   TEXT,                 -- SHA-256 of IP (not raw IP)
  withdrawn_at      TIMESTAMPTZ,          -- set if parent withdraws consent
  withdrawal_reason TEXT
);
```

---

## 10. Data Deletion (Right to Erasure)

When a parent requests deletion of their child's data:

```
Parent contacts: privacy@neuralife.in OR uses in-app deletion request (v2)
  → NeuraLife verifies identity (OTP to registered mobile)
  → Creates deletion request ticket

Deletion execution (within 30 days as required by DPDP Act):

Step 1 — Cascade delete in PostgreSQL:
  DELETE FROM school_enrollments WHERE neura_id = X
  DELETE FROM mastery_snapshots WHERE neura_id = X
  DELETE FROM calibrated_mastery_scores WHERE neura_id = X
  DELETE FROM student_insights WHERE neura_id = X
  DELETE FROM student_sessions WHERE neura_id = X
  DELETE FROM writing_skill_snapshots WHERE neura_id = X
  DELETE FROM study_habit_records WHERE neura_id = X
  DELETE FROM content_recommendations WHERE neura_id = X
  DELETE FROM neurasphere_posts WHERE neura_id = X
  DELETE FROM badges WHERE neura_id = X
  DELETE FROM attendance WHERE neura_id = X
  DELETE FROM consent_records WHERE neura_id = X
  DELETE FROM students WHERE neura_id = X

Step 2 — Device wipe command:
  POST /api/v1/devices/{device_id}/wipe-student-data
  → Sync Agent executes: DELETE all local SQLite records for this neura_id
  → DELETE all cached content (if no other student on device)

Step 3 — Supabase Storage:
  → Delete any student-specific files (if any were stored)

Step 4 — Backup purge:
  → Flag deletion in backup metadata
  → Automated backup rotation (7-day cycle) removes data within next cycle

Step 5 — Confirmation:
  → Email sent to parent: "All data for {student_name} has been deleted."
  → Deletion logged in audit_log (we keep only the fact of deletion, not the data)

Data that is NOT deleted:
  → Anonymised aggregate statistics that cannot be re-linked to the student
  → The fact that a deletion request was made (legal record)
  → Calibration baseline statistics (no individual link — population data only)
```

---

## 11. Audit Logging

A complete audit trail of all sensitive operations:

```sql
CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      TEXT NOT NULL,
  -- ENROLLMENT | DATA_ACCESS | DATA_DELETION | AUTH_SUCCESS | AUTH_FAILURE
  -- PERMISSION_CHANGE | EXPORT | OTA_PUSH | ADMIN_ACTION
  actor_id        UUID,                    -- who performed the action
  actor_role      TEXT,
  school_id       TEXT,
  target_neura_id TEXT,                    -- student affected (if applicable)
  action_detail   JSONB,                   -- what changed (no PII in values)
  ip_address_hash TEXT,                    -- SHA-256 of IP
  user_agent      TEXT,
  result          TEXT NOT NULL,           -- SUCCESS | FAILURE | BLOCKED
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_actor    ON audit_log(actor_id, created_at);
CREATE INDEX idx_audit_student  ON audit_log(target_neura_id, created_at);
CREATE INDEX idx_audit_school   ON audit_log(school_id, created_at);
CREATE INDEX idx_audit_type     ON audit_log(event_type, created_at);
```

**What is always logged:**

- Every student enrollment and data deletion
- Every failed authentication attempt
- Every PIN reset
- Every data export
- Every OTA push to devices
- Every admin role change
- Every NeuraSphere moderation action
- Every time SYSTEM role accesses student data

**What is never in the audit log:**

- Raw Aadhaar numbers
- Parent mobile numbers in plain text
- Mastery scores or learning data (these have their own history tables)
- JWT tokens or OTP values

**Audit log retention:** 2 years minimum. Read-only — no update or delete operations permitted on audit_log table (RLS enforced).

---

## 12. Third-Party Service Security

| Service | Data shared | Security control |
| --- | --- | --- |
| **Anthropic Claude API** | Mastery scores, error patterns, subject, grade, band — NO names, NO contact details, NO aadhaar_hash | API key in server environment only. Never in client bundle. |
| **Google ML Kit** | Handwriting strokes (on-device only — never sent to Google) | ML Kit processes locally. No network call. |
| **Google Cloud Vision** | Low-confidence stroke images (for OCR flywheel) | Images anonymised — no neura_id or student name in Vision API calls. Covered by Google Cloud DPA. |
| **MSG91** | Parent mobile number + SMS content | Sent over HTTPS. MSG91 is a DLT-registered Indian provider. No third-party sub-processors per their DPA. |
| **Firebase FCM** | FCM token (device identifier) + notification payload (no PII in body) | FCM tokens are not linked to student identity in Firebase. Only linked in NeuraLife's fcm_tokens table. |
| **Resend.com** | Principal/admin email address + email content | Sent over HTTPS. Resend's DPA covers EU/India data processing. |
| **Supabase** | All platform data | Supabase hosted in AWS ap-south-1 (Mumbai). SOC 2 Type II certified. DPA signed. |
| **YouTube** | No student data sent to YouTube. Video links are curated URLs. | Student watch behaviour on YouTube (if they tap a link) is subject to Google's own privacy policy — outside NeuraLife's control. Disclosed in privacy policy. |

---

## 13. v1 Security Checklist — Before First School Demo

Every item below must be complete before the first school demo or pilot:

```
Authentication:
  □ OTP flow with rate limiting (5 attempts / 10 min lockout)
  □ bcrypt PIN hashing (salt rounds = 12)
  □ JWT RS256 signing (not HS256)
  □ JWT revocation on logout
  □ Quiet hours for non-critical notifications

Data Protection:
  □ Aadhaar hash client-side only (confirm no server-side raw Aadhaar path exists)
  □ Supabase region set to ap-south-1 (Mumbai)
  □ RLS enabled and tested on all tables
  □ PII stripped from all application logs
  □ Claude API prompt audited — confirm no PII in any prompt

Legal:
  □ Privacy Policy published (even a simple one-pager)
  □ Privacy Policy linked from enrollment form
  □ Consent checkbox functional at enrollment
  □ Consent records table populated on enrollment
  □ Grievance contact email (privacy@neuralife.in) active
  □ MSG91 DLT entity registration initiated

API:
  □ HTTPS enforced (no HTTP fallback)
  □ Rate limiting on all auth endpoints
  □ HMAC signature validation on SmartPad sync routes
  □ Zod validation on all request bodies
  □ SQL injection prevention confirmed (no raw string concatenation)
  □ CORS configured — only allow NeuraLife app origins

Operational:
  □ API keys (Claude, MSG91, FCM) in environment variables only
  □ No secrets in codebase or git history
  □ Audit log table created and logging enrollment events
```

---

## 14. Version Milestones

### v1 — Demo Ready

| Component | Implementation |
| --- | --- |
| OTP auth with rate limiting | Build |
| bcrypt PIN hashing | Build |
| JWT RS256 + revocation | Build |
| Aadhaar client-side hashing | Build |
| Supabase RLS — all tables | Build |
| Consent flow at enrollment | Build |
| Consent records table | Build |
| Privacy Policy page | Build (simple, self-written) |
| Grievance email active | Setup |
| PII stripped from logs | Build |
| HMAC SmartPad request signature | Build |
| Audit log — core events | Build |
| DLT registration initiated | Action item |

### v2 — Post First School Deal

| Addition | Notes |
| --- | --- |
| SQLite Cipher on SmartPad | AES-256 at-rest encryption for local database |
| In-app data deletion request | Parent can request deletion from the app |
| Lawyer-drafted Privacy Policy | ₹15,000–30,000 one-time. Replace self-written version. |
| Formal Data Processing Agreements | With Supabase, MSG91, Resend, Anthropic |
| Security penetration test | Third-party pen test before any multi-school rollout |
| Two-factor auth for principals | Optional TOTP on top of OTP for high-privilege accounts |
| Admin session timeout | Auto-logout after 30 minutes of inactivity (Web Admin Console) |
| Backup encryption verification | Monthly automated test: decrypt a backup, verify integrity |

### v3 — Scale

| Addition | Notes |
| --- | --- |
| Formal DPO assessment | If government notifies NeuraLife as Significant Data Fiduciary |
| ISO 27001 certification | Required for government school contracts at scale |
| VAPT (Vulnerability Assessment + Pen Test) | Annual third-party assessment |
| Bug bounty program | Invite security researchers to find vulnerabilities |
| SIEM integration | Centralised security event monitoring (Datadog or similar) |

---

## 15. Confirmed Decisions

| Decision | Rationale |
| --- | --- |
| DPDP Act 2023 compliance from v1 | Legal obligation. Also a sales requirement — principals ask about it. |
| Aadhaar hashed client-side using SHA-256 | UIDAI compliance. Raw number physically cannot reach NeuraLife servers. |
| Supabase Mumbai region (ap-south-1) | Data localisation. All student data stays in India. |
| No PII in Claude API prompts | Anthropic processes the prompt — student names and contact details must not leave NeuraLife's control. |
| No PII in application logs | Logs are often less secured than databases. PII in logs creates a secondary exposure vector. |
| Consent recorded with version number | When the consent text changes, we know which version each parent agreed to. Legally important. |
| Audit log is append-only | Audit logs that can be deleted are worthless as legal records. RLS prevents any UPDATE/DELETE. |
| Raw handwriting strokes never leave SmartPad | Privacy by architecture. Cannot be subpoenaed, cannot be breached, cannot be misused. |
| SMS via MSG91 with DLT registration | Legal requirement in India. Non-compliant SMS is filtered by telecom operators — platform stops working. |
| SQLite Cipher deferred to v2 | v1 physical security: kiosk OS + PIN lock. Acceptable for demo. Production requires encryption. |

## 16. Open Questions

| Question | Impact | Recommended action |
| --- | --- | --- |
| Which lawyer for Privacy Policy v2 drafting? | Legal compliance at production scale | Engage a Hyderabad-based tech/data privacy lawyer. Budget ₹15,000–30,000. Before first school deal closes. |
| DPDP Act enforcement rules — finalised by government? | May add new obligations | Monitor MeitY announcements. Subscribe to NASSCOM data protection updates. |
| Parent withdrawal of consent mid-year — what happens to student SmartPad access? | Edge case: parent withdraws, but student is still enrolled | Policy decision: data stops being processed, but SmartPad access continues for the remainder of the academic year (school has a duty of education). Deletion executes at year end. Confirm with legal. |
| Google Cloud Vision — DPA sufficient for child data? | Compliance for OCR fallback pipeline | Review Google Cloud DPA child data clauses. If insufficient, restrict Cloud Vision to strokes only (no contextual metadata). |

---

*Next document: **Segment 14 — Onboarding Flow***