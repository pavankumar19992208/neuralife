# NeuraLife — NeuraID

*The universal, portable, permanent learning identity assigned to every student on enrollment — carrying their complete academic history, mastery profile, writing skills, achievements, and social identity across schools, years, and institutions.*NeuraLife — NeuraID

![image.png](image%204.png)

---

*The universal, portable, permanent learning identity assigned to every student on enrollment — carrying their complete academic history, mastery profile, writing skills, achievements, and social identity across schools, years, and institutions.*

---

## Purpose & Scope

NeuraID is not a feature. It is the architectural spine of the entire NeuraLife platform.

Every other component — the Web Admin Console, Teacher App, Parent App, SmartPad, NeuraSphere, Cloud AI — is a producer or consumer of NeuraID data. The ID itself is the thread that connects them all across time.

**What NeuraID solves:**

In the current Indian school system, when a student changes schools their entire academic history disappears. The new school starts from zero. Teachers have no context. Parents have no proof of prior learning. The student's years of effort are invisible.

NeuraID ends this permanently. A student's learning history is never tied to a school — it is tied to the student. The school is just a context. When the context changes, the history remains.

**NeuraID is also the student's login credential.** When a student opens the Parent & Student App on their parent's phone and logs into Student Login, they authenticate with their NeuraID + PIN. The same identity that represents them academically is the key they use to access their learning profile, NeuraSphere, and recommendations.

> **The NeuraLife community promise:** "Your child's learning history follows them. Forever."
> 

---

## What NeuraID Contains

NeuraID is not just an identifier. It is a living profile — updated continuously by every interaction the student has with the NeuraLife ecosystem.

### Identity Layer (Static)

```json
{
  "neura_id": "NID-2025-AP-084291",
  "generated_at": "2025-06-10T10:00:00Z",
  "full_name": "Ravi Kumar",
  "date_of_birth": "2012-04-14",
  "gender": "MALE",
  "aadhaar_hash": "sha256:a3f8c2d1e9b047...",
  "aadhaar_collected_at": "2025-06-10T10:00:00Z",
  "parent_mobile": "+91-9876543210",
  "band": "SECONDARY",
  "status": "ACTIVE",
  "data_consent_given": true,
  "consent_version": "1.0",
  "consent_given_at": "2025-06-10T10:00:00Z",
  "data_retain_on_school_exit": true
}
```

**Fields explained:**

- `neura_id` — Globally unique, permanently assigned, never reused, never deleted (only deactivated). Format: `NID-{YEAR}-{STATE}-{6-digit-sequence}`.
- `aadhaar_hash` — SHA-256 hash of Aadhaar number, generated client-side before transmission. Raw Aadhaar never stored on NeuraLife servers. Used exclusively for deduplication at enrollment. Never used for authentication or government reporting. UIDAI compliant.
- `band` — Computed from current `class_year`. FOUNDATION (1–3) / ELEMENTARY (4–6) / MIDDLE (7–8) / SECONDARY (9–10). Controls UI design rules, NeuraSphere access, Edge AI model variant, and analytics display. Auto-updates when class year changes.
- `status` — ACTIVE / TRANSFERRING / ALUMNI / DEACTIVATED. Deactivated only on parent data deletion request.
- `data_consent_given` — True only after parent explicitly checks the consent checkbox at enrollment. NeuraID cannot be activated without consent.
- `consent_version` — Version of the consent text the parent agreed to. When consent text changes, existing records retain their original version. Legally important.
- `data_retain_on_school_exit` — Parent preference. Default: true (NeuraID remains active, history preserved). Can be set false at any time from app Settings.

### Deduplication Flow (Aadhaar Hash)

```
Principal enters student Aadhaar number in Web Admin enrollment form
→ Client-side: SHA-256(aadhaar_number.replace(/\s/g, ''))
   Raw Aadhaar cleared from memory immediately after hashing
→ POST /identity/generate { name, dob, parent_mobile, aadhaar_hash, school_id, class, section }
→ Server checks: does this aadhaar_hash exist in the students table?

   NO  → Generate new NeuraID: NID-{YEAR}-{STATE}-{SEQ}
         INSERT into students + school_enrollments
         CREATE consent_records entry
         SEND parent SMS: "Your child {name} enrolled. NeuraID: {id}. Download app: [link]"
         RETURN: { neura_id, generated_at }

   YES → RETURN existing NeuraID with:
         "Student already registered. NeuraID: NID-2025-AP-084291.
          Use Transfer Token flow to link to this school."
         No duplicate created. No data loss. Full continuity preserved.
```

This means even if a parent does not mention they were previously in a NeuraLife school, the system automatically detects it and preserves continuity.

---

### Academic History Layer (Dynamic)

```json
{
  "neura_id": "NID-2025-AP-084291",
  "school_history": [
    {
      "school_id": "SCH-AP-00091",
      "school_name": "Sunrise School",
      "district": "Vijayawada",
      "state": "AP",
      "board": "AP_STATE",
      "medium": "ENGLISH",
      "enrolled_at": "2022-06-10",
      "exited_at": "2024-04-30",
      "exit_reason": "TRANSFER",
      "classes_attended": ["7", "8", "9"],
      "smartpad_id": "PAD-0011"
    },
    {
      "school_id": "SCH-AP-00142",
      "school_name": "Vikas High School",
      "district": "Guntur",
      "state": "AP",
      "board": "AP_STATE",
      "medium": "ENGLISH",
      "enrolled_at": "2024-06-01",
      "exited_at": null,
      "exit_reason": null,
      "classes_attended": ["10"],
      "smartpad_id": "PAD-0042"
    }
  ],
  "current_school_id": "SCH-AP-00142",
  "current_class": "10",
  "current_section": "A",
  "current_medium": "ENGLISH",
  "current_band": "SECONDARY"
}
```

Every school attended is added as a new entry. Previous school gets `exited_at` and `exit_reason`. No data is deleted. Full chronological record preserved permanently.

---

### Mastery Layer (Continuous)

```json
{
  "neura_id": "NID-2025-AP-084291",
  "mastery_snapshots": [
    {
      "snapshot_date": "2025-09-01",
      "school_id": "SCH-AP-00142",
      "class": "10",
      "board": "AP_STATE",
      "band": "SECONDARY",
      "subjects": [
        { "subject": "MATHEMATICS",    "mastery_pct": 82, "percentile": 78, "trend": "IMPROVING" },
        { "subject": "SCIENCE",        "mastery_pct": 74, "percentile": 61, "trend": "STABLE" },
        { "subject": "ENGLISH",        "mastery_pct": 68, "percentile": 54, "trend": "IMPROVING" },
        { "subject": "TELUGU",         "mastery_pct": 38, "percentile": 22, "trend": "DECLINING" },
        { "subject": "SOCIAL_STUDIES", "mastery_pct": 59, "percentile": 47, "trend": "STABLE" }
      ],
      "overall_mastery_pct": 64,
      "overall_percentile": 58,
      "calibration_population": 1240,
      "ai_model_version": "neura-cloud-v1.4"
    }
  ],
  "mastery_history_start": "2022-06-10",
  "total_snapshots": 312
}
```

Daily snapshots stored. This creates a longitudinal learning graph — the student's mastery trajectory across years and schools. When a new school's teacher opens this profile, they see not just today's mastery but the complete history of how the student has grown — including mastery during their time at previous NeuraLife schools.

---

### Writing Skills Layer (Continuous)

```json
{
  "neura_id": "NID-2025-AP-084291",
  "writing_skill_history": [
    {
      "month": "2025-09",
      "school_id": "SCH-AP-00142",
      "class": "10",
      "band": "SECONDARY",
      "handwriting_clarity_avg": 74,
      "writing_speed_wpm_avg": 18,
      "spelling_accuracy_avg_pct": 81,
      "sentence_formation_level": "PROFICIENT",
      "active_writing_days": 18,
      "total_session_minutes": 847,
      "wss_model_version": "WSS-1.3.1"
    }
  ]
}
```

Monthly aggregates stored permanently. Raw session stroke data retained 24 hours on-device then purged. Processed session summaries retained 90 days on cloud then purged. Monthly aggregates: permanent.

---

### Exam & Assessment Layer

```json
{
  "neura_id": "NID-2025-AP-084291",
  "exam_records": [
    {
      "exam_id": "EXM-00421",
      "school_id": "SCH-AP-00142",
      "class": "10",
      "academic_year": "2025-26",
      "exam_name": "FA1",
      "exam_date": "2025-08-15",
      "results": [
        {
          "subject": "MATHEMATICS",
          "marks_obtained": 38,
          "total_marks": 50,
          "class_avg": 34,
          "class_rank": 8,
          "vs_mastery_prediction": "WITHIN_RANGE"
        },
        {
          "subject": "TELUGU",
          "marks_obtained": 19,
          "total_marks": 50,
          "class_avg": 28,
          "class_rank": 35,
          "vs_mastery_prediction": "UNDERPERFORMED"
        }
      ],
      "overall_percentage": 65,
      "overall_class_rank": 12
    }
  ]
}
```

All exam records permanently stored. A new school can see the complete exam history from all previous NeuraLife schools — with class rank, class average, and mastery prediction accuracy tracked.

---

### Achievement Layer

```json
{
  "neura_id": "NID-2025-AP-084291",
  "achievements": [
    {
      "achievement_id": "ACH-00091",
      "type": "MASTERY_MILESTONE",
      "title": "Maths Achiever",
      "description": "Reached 80%+ mastery in Mathematics",
      "earned_at": "2025-09-01T08:14:00Z",
      "school_id": "SCH-AP-00142",
      "class": "10",
      "visible_on_neurasphere": true
    },
    {
      "achievement_id": "ACH-00092",
      "type": "STREAK",
      "title": "7-Day Streak",
      "description": "Active on SmartPad 7 consecutive school days",
      "earned_at": "2025-09-01T00:00:00Z",
      "school_id": "SCH-AP-00142",
      "class": "10",
      "visible_on_neurasphere": true
    }
  ]
}
```

Achievements earned at one school remain permanently. Visible on NeuraSphere with school context shown. Cannot be revoked by a new school or teacher.

---

### NeuraSphere Identity Layer

```json
{
  "neura_id": "NID-2025-AP-084291",
  "neurasphere_profile": {
    "display_name": "Ravi Kumar",
    "verified": true,
    "verification_source": "SCHOOL_ENROLLMENT",
    "access_level": "FULL",
    "current_school_badge": "Vikas High School · Class 10-A",
    "alumni_badges": ["Sunrise School · Class 7–9"],
    "interest_tags": ["MATHEMATICS", "SCIENCE", "PROBLEM_SOLVING"],
    "followers_count": 24,
    "following_count": 31,
    "posts_count": 12,
    "joined_at": "2022-06-10T10:00:00Z",
    "status": "ACTIVE"
  }
}
```

NeuraSphere access controlled by `band`:

| Band | Class | NeuraSphere Access | Posting | Chat |
| --- | --- | --- | --- | --- |
| FOUNDATION | 1–3 | ❌ No access | ❌ | ❌ |
| ELEMENTARY | 4–6 | ❌ No access | ❌ | ❌ |
| MIDDLE | 7–8 | ✅ Limited | ❌ (achievements only, auto-posted) | ❌ |
| SECONDARY | 9–10 | ✅ Full | ✅ | v2 only |

**Why Classes 4–6 have no NeuraSphere:** Social network participation requires digital literacy and emotional maturity that develops at the Middle band (12+). Foundation and Elementary bands benefit from a focused, distraction-free learning environment. All their recognition flows through the parent — stickers, achievements, badges — without an inter-school social layer.

NeuraSphere identity is automatically created at enrollment. Cannot be created manually. Real name enforced from enrollment record. No usernames or aliases permitted.

---

## NeuraID Lifecycle

### Stage 1 — Generation at Enrollment

```
1. Principal fills student admission form in Web Admin Console
2. Principal checks consent checkbox:
   ☐ "I confirm parental consent to enroll this student and process
      their data as described in the Privacy Policy."
   → [Enroll Student] button disabled until checkbox checked

3. Client-side:
   → SHA-256(aadhaar_number) generated
   → Raw Aadhaar cleared from memory immediately

4. POST /identity/generate
   → Duplicate check via aadhaar_hash
   → If NEW:
       NeuraID generated: NID-2025-AP-084291
       INSERT into students table
       INSERT into school_enrollments table
       INSERT into consent_records table:
         { neura_id, consented_by: PRINCIPAL, school_id,
           consent_version: "1.0", consented_at: NOW(), ip_address_hash }
       Empty mastery profile initialised
       NeuraSphere profile created (band-gated)
       SmartPad assigned (if available)
   → If DUPLICATE:
       Return existing NeuraID + transfer option

5. Parent SMS: "Your child Ravi Kumar is enrolled at Vikas High School.
   NeuraID: NID-2025-AP-084291. Download NeuraLife app: [link]"

6. On parent's first app login:
   → Parent sees consent notice
   → Taps [I Agree]
   → Second consent record created (PARENT type)
   → Parent login fully activated
```

### Stage 2 — Active School Period

- All SmartPad activity (mastery, writing, habits, sessions) continuously synced to NeuraID
- Nightly calibration: mastery snapshot generated at midnight
- Monthly: writing skill aggregate stored on 1st of each month
- Exam records: added by teacher within 24 hours of mark entry
- Achievements: auto-generated by rules engine when thresholds crossed
- **Student PIN login:** Student logs into Parent & Student App using NeuraID + PIN. PIN set at first enrollment, changed only by principal. JWT issued: 8-hour expiry (school day duration).

### Stage 3 — School Transfer (to Another NeuraLife School)

This is the most important flow in the entire platform.

**Transfer initiated by current school principal:**

```
Step 1: Principal opens Web Admin → Student profile → [Initiate Transfer]
        → Enters destination school name (must be NeuraLife-registered)
        → Student status set to: TRANSFERRING
        → Current school entry: exit_reason = "TRANSFER"
        → SmartPad unlinked from student (device returned to fleet)

Step 2: System generates Transfer Code (6-digit one-time code)
        → Valid 30 days, single use (not TOTP — does not expire after seconds)
        → Stored as bcrypt hash — raw code only in SMS
        → SMS to parent mobile:
          "Ravi Kumar's NeuraLife transfer code: 849201.
           Share this with the new school principal. Valid 30 days."

Step 3: New school principal opens Web Admin → [Enroll with NeuraID]
        → Enters transfer code
        → System verifies code hash
        → If valid: returns full NeuraID profile preview
          (name, DOB, class history, mastery summary — role-scoped)
        → Principal confirms enrollment, assigns new class and section

Step 4: NeuraID updated:
        → New school entry added to school_history
        → current_school_id = new school
        → current_class, current_section, band updated
        → Transfer code invalidated immediately
        → New SmartPad assigned at new school

Step 5: Notifications sent:
        → Parent app: history archived under "Sunrise School (2022–24)"
          → New school data begins accumulating
          → NeuraSphere badge updated: "Vikas High School · Class 10-A"
        → New school's teachers: can view full academic history immediately

Step 6: New class teacher opens student profile:
        → Mastery history from previous school: visible (role-scoped)
        → Writing skill history: visible
        → Exam records from previous school: visible
        → Teacher knows what subjects need attention before first session
```

**Transfer code expired or lost:**
Current school principal generates a new code. Old code is automatically invalidated when new one is generated for the same NeuraID.

### Stage 4 — Transfer to Non-NeuraLife School (Alumni Mode)

When a student leaves the NeuraLife ecosystem:

1. Current school principal marks: "Exited — Non-NeuraLife transfer"
2. Student status: ALUMNI. SmartPad unlinked.
3. Parent App enters Alumni Mode:
    - Full historical data viewable (read-only)
    - No live updates (no attendance, homework, teacher messages, SmartPad sync)
    - NeuraSphere continues with "Alumni · Vikas High School" badge
    - Feed becomes interest-based only (no class/school feed)
4. Parent SMS: "Ravi Kumar's NeuraLife account is now in Alumni mode. All learning history is preserved."
5. If student later joins another NeuraLife school: Transfer Token flow → Alumni status reverts to ACTIVE

### Stage 5 — Data Deletion (Parent Request — DPDP Act 2023)

Full cascade deletion on parent request. Two windows: cancellation + execution.

```
Step 1: Parent requests deletion
        App: Profile → Data & Privacy → Request Data Deletion
        → Identity verification: OTP to registered parent mobile
        → Confirmation shown: "All data for Ravi Kumar will be permanently deleted
          in 30 days. You have 7 days to cancel this request."

Step 2: Cancellation window (7 days)
        → SMS sent: "Data deletion requested. To cancel, reply CANCEL or
          visit neuralife.in/cancel-deletion. Code: DEL-00421"
        → If parent cancels within 7 days: deletion cancelled, no action
        → If no cancellation after 7 days: deletion proceeds

Step 3: Execution (within 30 days total — DPDP Act requirement)
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
        DELETE FROM exam_results WHERE neura_id = X
        DELETE FROM fee_payments WHERE neura_id = X   (school copy retained)
        DELETE FROM students WHERE neura_id = X
        UPDATE smartpad_devices SET assigned_neura_id = NULL WHERE neura_id = X
        → SmartPad wipe command queued (executes on next WiFi connect)
        UPDATE students SET status = 'DEACTIVATED' (NeuraID record: ID retained,
          all PII nulled — prevents ID reuse)

Step 4: What is retained (anonymised, non-identifiable):
        → Aggregated population statistics (no name, no ID — used for AI model calibration)
        → The fact of deletion: { neura_id_hash, deletion_date } in deletion_audit_log
          (legal record — NeuraLife's compliance evidence)

Step 5: Confirmation
        → Email and SMS to parent:
          "All personal data for NeuraID NID-2025-AP-084291 has been permanently deleted.
           Confirmation reference: DEL-00421. Date: [date]."

NeuraSphere cleanup:
        → Student's posts and comments: deleted
        → Posts by classmates that mention student by name: flagged →
          sent to respective school principal for manual review (edit or delete)
        → Badges on other students' profiles: retained (they earned them — student's
          name is removed from the associated event description)
```

---

## NeuraID Format Specification

```
Format: NID-{YEAR}-{STATE_CODE}-{SEQUENCE}

Examples:
  NID-2025-AP-084291   → Enrolled 2025, Andhra Pradesh, student #84,291
  NID-2025-TS-001042   → Enrolled 2025, Telangana, student #1,042
  NID-2026-AP-100001   → Enrolled 2026, Andhra Pradesh, student #100,001

Rules:
  YEAR:        4-digit enrollment year
  STATE_CODE:  2-letter Indian state code (AP, TS, KA, MH, etc.)
  SEQUENCE:    6-digit zero-padded sequence per state per year
               Resets each calendar year (enrollment year, not academic year)
  Total length: 18 characters
  Globally unique:  no two students ever share a NeuraID
  Permanent:        never changes on school transfer, class change, or name change
  Never recycled:   deactivated IDs are not reassigned to new students
  Deactivation:     status field set to DEACTIVATED. NeuraID record retained
                    with all PII nulled. Prevents ghost ID reuse.
```

---

## NeuraID Visibility Rules

Who can see what data, across all platform surfaces:

| Data Category | Student (self) | Parent | Subject Teacher | Class Teacher | Principal | Other Students |
| --- | --- | --- | --- | --- | --- | --- |
| Name + class | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (NeuraSphere only) |
| NeuraID number | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Date of birth | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Mastery — own subject | ✅ | ✅ | ✅ | ✅ | ✅ (summary) | ❌ |
| Mastery — all subjects | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Writing skills — own subject | ✅ | ✅ | ✅ | ✅ | ✅ (summary) | ❌ |
| Writing skills — all subjects | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Exam results — own subject | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Exam results — all subjects | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| School history | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Behaviour log | ❌ | ✅ (summary) | ❌ | ✅ | ✅ | ❌ |
| Parent mobile | ❌ | ✅ | ✅ (via app only) | ✅ (via app only) | ✅ | ❌ |
| Aadhaar hash | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Consent records | ❌ | ✅ (own) | ❌ | ❌ | ✅ | ❌ |
| Achievements | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (NeuraSphere) |
| NeuraSphere posts | ✅ | ✅ | ❌ (unless public) | ✅ | ✅ | ✅ (same platform, band-gated) |
| Fee records | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |

---

## Cross-School Data Access (On Transfer)

When a student transfers to a new NeuraLife school, the new school's teachers get controlled, role-scoped access to historical data from the previous school:

| Historical Data | New Subject Teacher | New Class Teacher | New Principal |
| --- | --- | --- | --- |
| Previous school name + years attended | ❌ | ✅ | ✅ |
| Mastery history — own subject (last 1 year) | ✅ | ✅ (full) | ✅ (summary) |
| Writing skills — own subject (last 6 months) | ✅ | ✅ (full) | ✅ (summary) |
| Exam records — own subject (last 1 year) | ✅ | ✅ (full) | ✅ (summary) |
| Behaviour log | ❌ | ✅ (read-only) | ✅ |
| Previous teacher names or contacts | ❌ | ❌ | ❌ |
| Fee records from previous school | ❌ | ❌ | ❌ |
| NeuraSphere posts | ❌ | ❌ | ❌ |

**Design principle:** Data portability is about the student's learning, not school-to-school information sharing. Previous teacher names are never shared — they are irrelevant to the new school's function and create unnecessary PII exposure.

---

## NeuraID — The Student Login Credential

NeuraID serves a dual function that is unique to NeuraLife: it is simultaneously a platform-wide academic identifier AND the student's login credential for the Parent & Student App (Student Login mode).

**Student Login flow:**

```
Student opens Parent & Student App on parent's phone
Taps: [Switch to Student]
→ NeuraID entry field: "NID-2025-AP-084291"
  or: QR code scan from NeuraID Card
→ PIN entry: 4–6 digits (set at enrollment, changed only by principal)
→ JWT issued: 8-hour expiry, bound to parent's device token
→ Student home screen loads (band-appropriate UI)

Rate limit: 5 failed PIN attempts → 15-minute lockout
After 10 attempts: IT admin alert to school principal
PIN reset: Principal only, via Web Admin Console
```

**Band-gated Student Login experience:**

| Band | Classes | Student Login available | What they see |
| --- | --- | --- | --- |
| FOUNDATION | 1–3 | ❌ | Shown: "Use SmartPad to learn. Ask your parent to see your progress." |
| ELEMENTARY | 4–6 | ✅ | Subject library, homework list, sticker achievements |
| MIDDLE | 7–8 | ✅ | Mastery %, recommendations, NeuraSphere (limited) |
| SECONDARY | 9–10 | ✅ | Full analytics, NeuraSphere (full), leaderboard |

**SmartPad login:**

On the SmartPad (separate device, student-only), the student also uses NeuraID + PIN:

- Same NeuraID, same PIN — one credential across mobile and SmartPad
- SmartPad JWT: 8-hour expiry, device-bound (includes `device_id` claim)
- Invalid on different device — prevents students swapping SmartPads

---

## NeuraID Card (Shareable Identity)

The NeuraID is visible on the student's NeuraSphere profile as a tappable element. Tapping opens a full-screen NeuraLife Community ID Card.

**Card contents:**

- Student name (real name — no aliases)
- NeuraID number: NID-2025-AP-084291
- Current school name and logo (school branding is primary)
- Class and section
- Enrollment year
- Achievement badge count
- QR code encoding the NeuraID (scanned by new school at transfer)
- "Verified by NeuraLife Community" seal
- "Powered by NeuraLife" footer (NeuraLife branding is secondary)

**Card is shareable as an image.** Student can share with family. School can print for ID cards. Cannot be forged — QR code verified against live database on scan.

---

## NeuraID API Specification

```yaml
Base URL: https://api.neuralife.in/api/v1/identity

GET /identity/{neura_id}
  Description:   Fetch full NeuraID profile (role-scoped)
  Auth:          Bearer JWT RS256
  Response:      Full NeuraID profile, filtered by caller's role

GET /identity/{neura_id}/mastery
  Description:   Fetch mastery history
  Params:        subject (optional), from_date, to_date, school_id (optional)
  Auth:          Bearer JWT RS256

GET /identity/{neura_id}/writing-skills
  Description:   Fetch writing skill history
  Params:        from_date, to_date
  Auth:          Bearer JWT RS256

GET /identity/{neura_id}/exams
  Description:   Fetch exam records
  Params:        academic_year (optional), school_id (optional)
  Auth:          Bearer JWT RS256

GET /identity/{neura_id}/achievements
  Description:   Fetch all achievements
  Auth:          Bearer JWT RS256

GET /identity/{neura_id}/history
  Description:   Full school history + transfer log
  Auth:          Principal or Class Teacher JWT only

POST /identity/generate
  Description:   Generate new NeuraID at enrollment
  Auth:          School Admin JWT only
  Body:          { name, dob, gender, parent_mobile, aadhaar_hash,
                  school_id, class_year, section, medium }
  Notes:         Consent must be confirmed at UI level before calling this.
                 Duplicate check via aadhaar_hash occurs server-side.
  Response:      { neura_id, generated_at, is_duplicate, existing_neura_id? }

GET /identity/check-duplicate
  Description:   Pre-enrollment check (before showing consent form)
  Auth:          School Admin JWT
  Body:          { aadhaar_hash }
  Response:      { exists: bool, existing_neura_id?: string }

POST /identity/{neura_id}/transfer/initiate
  Description:   Initiate school transfer, generate one-time transfer code
  Auth:          School Admin JWT (current school only)
  Response:      { transfer_code_sent: true, sms_to: "+91-XXXXX", expires_at }

POST /identity/{neura_id}/transfer/complete
  Description:   Complete transfer at new school using code
  Auth:          School Admin JWT (new school)
  Body:          { transfer_code, new_school_id, new_class, new_section }
  Response:      { neura_id, transfer_confirmed_at }

PATCH /identity/{neura_id}
  Description:   Update profile fields (name correction, DOB correction)
  Auth:          School Admin JWT (current school) or Super Admin
  Body:          { field: value }
  Notes:         NeuraID itself cannot be changed. Aadhaar hash cannot be changed.

PATCH /identity/{neura_id}/status
  Description:   Update status (ACTIVE → ALUMNI → DEACTIVATED)
  Auth:          School Admin JWT or NeuraLife Super Admin
  Body:          { status, reason }

DELETE /identity/{neura_id}
  Description:   Initiate DPDP data deletion request
  Auth:          Parent account JWT only
  Notes:         7-day cancellation window, 30-day total execution window
  Response:      { deletion_scheduled_at, cancellation_deadline, reference: "DEL-00421" }

POST /identity/{neura_id}/deletion/cancel
  Description:   Cancel a pending deletion request
  Auth:          Parent account JWT
  Body:          { deletion_reference }
  Response:      { cancelled: true }
```

---

## Data Privacy & DPDP Act 2023 Compliance

### Compliance Mapping

| DPDP Requirement | NeuraLife Implementation |
| --- | --- |
| Explicit parental consent before data collection | Consent checkbox at enrollment (Web Admin). Parent consent at first app login. Both recorded in `consent_records` table with timestamp and consent text version. |
| Purpose limitation | Data used only for educational personalisation and school operations. No advertising profiling. No data sold or shared with third parties. |
| Data minimisation | Only educationally relevant data collected. No social media tracking. No device fingerprinting beyond SmartPad device ID. |
| Storage limitation | Raw strokes: purged on-device after 24 hours. Processed session data: 90 days cloud. Monthly aggregates: permanent (with consent). Full deletion on request within 30 days. |
| Right to access | Parent downloads all data: App → Profile → Data & Privacy → Export My Data → JSON. |
| Right to deletion | 7-day cancellation + 30-day execution. Full cascade. Confirmation sent. |
| Data localisation | All data on Supabase `ap-south-1` (Mumbai). No data leaves India. |
| No third-party sharing | Zero data sold or shared with advertisers. Claude API receives only structured mastery signals — no names, no Aadhaar hash, no contact data. |
| Minor data protection | All enrolled students are minors. Parental consent mandatory. No direct marketing. No data used for advertising of any kind. |
| Grievance mechanism | `privacy@neuralife.in` listed in Privacy Policy and in-app. You (the founder) are the designated Grievance Officer at v1 scale. |

### Security Architecture

```yaml
JWT:
  Algorithm:   RS256 (asymmetric — private key on server only)
  Expiry:      Human users: 24hr + 30-day refresh
               Student Login: 8hr (school day duration)
               SmartPad:      8hr, device-bound (device_id in claim)
  Revocation:  jti stored in Redis (v2) or in-memory (v1) on logout

Data at rest:
  Cloud:       AES-256 (Supabase default — enabled on all plans)
  SmartPad v1: No encryption (kiosk lock + PIN is physical security)
  SmartPad v2: SQLite Cipher AES-256 (when real student data is in production)

Data in transit:
  All:         TLS 1.3 (enforced by Supabase, Railway, Vercel)
  SmartPad:    + HMAC-SHA256 body signature on all sync requests

Aadhaar handling:
  Client-side: SHA-256(aadhaar_number.replace(/\s/g, ''))
  Network:     Only hash transmitted — raw number never sent
  Storage:     Only hash stored — raw number never on NeuraLife servers
  Usage:       Deduplication only. Not authentication. Not government reporting.

Database:
  Isolation:   Supabase RLS — each school can only query their own students
  Audit:       All NeuraID reads and writes logged: actor, timestamp, IP hash, action

Transfer token:
  Format:      6-digit numeric one-time code (not TOTP)
  Storage:     bcrypt hash stored — raw code only in parent's SMS
  Validity:    30 days, single use, invalidated immediately on successful use
  Generation:  New code invalidates any previous code for same NeuraID

Penetration testing: Third-party pen test before multi-school rollout (v2)
```

---

## Consent Records Schema

```sql
CREATE TABLE consent_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id          TEXT REFERENCES students(neura_id),
  consent_type      TEXT NOT NULL,
  -- ENROLLMENT_PRINCIPAL: principal checks consent at admission
  -- PARENT_FIRST_LOGIN:   parent agrees on first app login
  consented_by_role TEXT NOT NULL,         -- PRINCIPAL | PARENT
  consented_by_id   UUID NOT NULL,
  school_id         TEXT NOT NULL,
  consent_text_version TEXT NOT NULL,      -- "1.0" — tracks which text was shown
  consented_at      TIMESTAMPTZ NOT NULL,
  ip_address_hash   TEXT,                  -- SHA-256 of IP (not raw IP)
  withdrawn_at      TIMESTAMPTZ,           -- set if parent withdraws
  withdrawal_reason TEXT
);
```

Both consent events must exist (ENROLLMENT_PRINCIPAL + PARENT_FIRST_LOGIN) for a NeuraID to be considered fully consented. Either alone is a partial consent state — tracked and visible to NeuraLife Super Admin.

---

## NeuraID in the Demo

For the v1 demo, NeuraID is fully functional in software. No hardware dependency.

**What you show a principal — 5-step demo sequence:**

```
1. Enroll a student in Web Admin
   → NeuraID generated instantly: NID-2025-AP-084291
   → Principal sees the ID. Consent record shown.
   → Parent SMS shown (demo: logged in console)

2. Show mastery building up
   → 6 weeks of simulated SmartPad data pre-loaded in demo school
   → Principal sees mastery trending up over time in student profile

3. Initiate a transfer to a second demo school
   → Web Admin: Student profile → [Initiate Transfer]
   → 6-digit code generated, shown on screen
   → "This code goes to the parent via SMS"

4. Complete transfer at new school
   → Open second demo school in new browser tab
   → Enter transfer code → Full academic history appears instantly
   → "This is what the new school sees before the student walks in"

5. Open new class teacher's app (Teacher App on phone)
   → Student already visible with full mastery from previous school
   → "The teacher knows what this student needs before the first session"
```

**The moment that closes the pitch:**

> "When a student joins your school next year — transferred from another NeuraLife school — you will know exactly what they are good at, where they struggle, and how they write. Before they sit in their first class. No Indian school has ever had this."
> 

---

## APAAR / Government Integration (v3)

India's Ministry of Education launched APAAR (Academic Bank of Credits) as a national student ID. NeuraID is architecturally compatible with APAAR.

**v3 integration plan:**

- Link NeuraID to APAAR ID on parent consent (opt-in, not mandatory)
- Sync mastery milestones and exam records to APAAR as "academic credits"
- Allow government schools to use NeuraLife as their APAAR data provider
- This creates a government-to-NeuraLife adoption pipeline

**Why this matters for the business:** APAAR compliance is becoming mandatory for all schools. If NeuraLife is the easiest way to comply with APAAR while also getting AI-powered insights, every school has two strong reasons to adopt.

---

## Confirmed Design Decisions

| Decision | Detail |
| --- | --- |
| NeuraID as student login credential | NeuraID + PIN authenticates Student Login on Parent & Student App and on SmartPad. One credential across all student surfaces. |
| JWT RS256 (not HS256) | Asymmetric signing. Private key on server only. More secure than HMAC symmetric keys. Aligned with Security & Compliance spec. |
| Transfer code is one-time, not TOTP | TOTP changes every 30 seconds — unsuitable for a code the principal enters hours or days after generation. One-time code, 30-day validity, single use, bcrypt-stored. |
| Aadhaar hash SHA-256 client-side | Raw Aadhaar cannot be intercepted in transit. Not stored server-side. UIDAI compliant. SHA-256 (not bcrypt) because use case is deterministic lookup, not authentication. |
| Two consent records required | ENROLLMENT_PRINCIPAL + PARENT_FIRST_LOGIN. Both must exist for fully consented NeuraID. Protects against principal enrolling without genuine parental awareness. |
| Deletion: 7-day cancel + 30-day execute | 7-day window gives parents time to reconsider. 30-day total execution meets DPDP Act requirement. Both are tracked separately. |
| SmartPad encryption: v1 = PIN lock, v2 = SQLite Cipher | v1 physical security (kiosk + PIN) is acceptable for demo. v2 adds AES-256 at-rest encryption when production student data is live. |
| Band computed from class_year | Band auto-updates when class year changes (annual progression or transfer). No manual management. Controls UI, NeuraSphere, Edge AI variant, and analytics access. |
| NeuraSphere: Class 7+ only | Classes 1–6: no access. 7–8: achievements + circles only, no posting. 9–10: full access. Matches cognitive and emotional development stages. |
| deactivated IDs retained (PII nulled) | Prevents ghost ID reuse. NeuraID sequence never recycled. PII fields nulled, ID record kept for integrity. |
| Supabase Mumbai region (ap-south-1) | DPDP Act data localisation. All NeuraID data stays in India. |

## Open Questions

| Question | Impact | Recommended action |
| --- | --- | --- |
| Alumni NeuraID — what data persists after Class 10 graduation into college? | NeuraID currently scoped to Classes 1–10. Does it follow students to Class 11, 12, and college? | Expand scope to Classes 1–12 in v2. College integration is v3. Graduation = status ALUMNI, not DEACTIVATED. History fully preserved. |
| If parent withdraws consent mid-year, does the student lose SmartPad access? | Operational conflict: parent withdraws consent but student is still enrolled | Policy: data stops being processed on withdrawal. SmartPad access continues for academic year (school has duty of education). Full deletion executes at year-end. Confirm with legal before v1 launch. |
| Transfer to school in another state (AP → TS) — does NeuraID work cross-state? | Transfers between AP and TS schools both on NeuraLife | Yes — NeuraID is platform-wide, not state-scoped. The STATE_CODE in the ID is the enrollment state, not a limiting factor. Transfer Token flow works identically. |
| APAAR ID collection at enrollment — v2 or v3? | Government is pushing APAAR adoption for all schools | Collect APAAR ID (if available) at enrollment as optional field in v2. Link to NeuraID. Sync begins in v3. |

---

*Next update: **NeuraOS + SmartPad — v1 kiosk clarification***