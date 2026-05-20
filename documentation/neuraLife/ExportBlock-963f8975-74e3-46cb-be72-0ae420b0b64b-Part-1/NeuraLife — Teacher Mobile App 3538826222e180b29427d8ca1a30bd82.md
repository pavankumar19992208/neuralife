# NeuraLife — Teacher Mobile App

[SCREENS](SCREENS%203538826222e1809c9cbaf4f3625963c2.md)

![image.png](image%201.png)

[NeuraLife___Teacher_Mobile_App_v2.md](NeuraLife___Teacher_Mobile_App_v2.md)

*Daily operational interface for teachers — covering attendance, scheduling, homework, performance tracking, student monitoring, and parent meeting support. Offline-first, role-aware, integrated with Web Admin, Parent & Student App, and SmartPad.*

> **Design principle:** The app does the analysis. The teacher acts on it.
> 

**Separate APK** from the Parent & Student App. Installed on teacher's personal Android phone.

---

## Tech Stack

```yaml
Framework:     React Native 0.74 (Android-first, iOS in v2)
Offline:       WatermelonDB + TanStack Query with offline persistence
Real-time:     Supabase Realtime WebSocket
Push:          Firebase Cloud Messaging
Auth:          OTP (first login) → Biometric + PIN fallback
               JWT: 24hr + 30-day rotating refresh
               Every attendance submission signed with teacher credential hash
```

---

## Role Architecture

One app, two roles. Web Admin assigns roles. UI adapts on login.

| Capability | Subject Teacher | Class Teacher |
| --- | --- | --- |
| View own schedule | ✅ | ✅ |
| Mark attendance | ✅ | ✅ |
| Assign homework (own subject) | ✅ | ✅ |
| Track syllabus coverage | ✅ | ✅ |
| Enter test marks | ✅ | ✅ |
| Record oral participation | ✅ | ✅ |
| View student mastery (own subject) | ✅ | ✅ |
| Resolve SmartPad doubts | ✅ | ✅ |
| Push resources to SmartPads | ✅ | ✅ |
| View own performance analytics | ✅ | ✅ |
| View all-subject mastery per student | ❌ | ✅ |
| Full 360° student profile | ❌ | ✅ |
| Behaviour & discipline log | ❌ | ✅ |
| PTM mode | ❌ | ✅ |
| Leave application approval | ❌ | ✅ |
| Student promotion readiness | ❌ | ✅ |
| Class-wide alert management | ❌ | ✅ |

**Bottom nav — Subject Teacher:** Home · Schedule · Classes · Doubts · Profile

**Bottom nav — Class Teacher (both roles):** Home · Schedule · Classes · My Class · Doubts

A teacher holding both roles sees all five tabs. When viewing students from their Class Teacher section: full 360° view. When viewing students from other classes: own subject data only.

---

## Data Flow

| Teacher Action | Web Admin | Parent & Student App | SmartPad | Cloud AI |
| --- | --- | --- | --- | --- |
| Submit attendance | ✅ Real-time | ✅ Push to parent | ✅ Status syncs | ❌ |
| Assign homework | ✅ Logged | ✅ Push + task | ✅ Pending card | ❌ |
| Enter exam marks | ✅ Reports | ✅ Visible to parent | ❌ | ✅ Mastery model |
| Record oral participation | ✅ Logged | ❌ | ❌ | ✅ Engagement model |
| Resolve doubt | ❌ | ❌ | ✅ Answer pushed | ❌ |
| Push resource | ✅ Logged | ✅ Notification | ✅ Downloaded | ❌ |
| Log behaviour incident | ✅ Principal | ❌ | ❌ | ❌ |
| Approve leave | ✅ Attendance | ✅ Confirmation | ❌ | ❌ |
| Mark syllabus covered | ✅ Coverage % | ❌ | ❌ | ✅ Content engine |
| Override AI mastery | ✅ Logged | ❌ | ❌ | ✅ GAP-1 training |

---

## Module 1 — Home Screen

**Header:** Teacher name · school · role badge(s) · date · sync status

**KPI Strip — Subject Teacher:**

| Metric | Alert threshold |
| --- | --- |
| Periods today | — |
| Homework due today | Amber if completion < 60% |
| Doubts pending | Red if > 5 |
| AT_RISK in my subjects | Red if > 0 |

**Additional KPIs — Class Teacher:**

| Metric | Alert threshold |
| --- | --- |
| Present today (my class) | Red if < 75% |
| Absent today | Amber if > 3 |
| Leave requests pending | Amber if > 0 |
| Class alerts | Red if any S1 severity |

**Today's Schedule:** Chronological timeline of all periods. Each card shows time, subject, class-section, room, student count, status (Upcoming / Now / Covered / Substitute). Tap any card → class action view.

**Alert Feed** (role-filtered):

- AT_RISK no intervention logged (48hr)
- Mastery drop > 10% in one week
- Homework completion < 60% on due date
- Absence streak — 3+ days (class teacher only)
- Doubt queue overflow > 10
- Curriculum pattern detected in subject (v2)

---

## Module 2 — Attendance

**Who marks:** Any teacher assigned to that class or period. Substitute can also mark.

**Flow:**

1. Tap period card → student list loads from local cache (offline)
2. Default: all Present (optimistic — reduces taps)
3. Tap avatar to toggle: Present → Absent → Late
4. Optional reason on Absent/Late: No reason / Medical / Family / Other
5. Running count: "38 Present · 3 Absent · 1 Late · 0 Unmarked"
6. Submit → digitally signed → queued if offline → synced on connect

**On sync:** Web Admin updates real-time · Parent notified via push · SmartPad shows status

**Late Arrival Correction:** Any teacher opens student's daily attendance → mark Late Arrival with actual time. Creates a correction record — original preserved. Both shown in audit log.

**Signature schema (every submission):**

```json
{
  "teacher_id": "TCH-00142",
  "submitted_at": "2025-09-01T08:07:43Z",
  "device_id": "DEVICE-Android-RM2023-884",
  "signature_hash": "sha256(teacher_id + class_id + date + period + timestamp)",
  "submission_type": "ORIGINAL"
}
```

---

## Module 3 — Schedule & Syllabus Tracker

**Schedule view:** Full week timetable across all assigned classes. Each period card shows syllabus topic due today (from principal's annual plan), prior coverage status, quick actions.

**After each class, teacher marks:**

- ✅ Covered
- ⏩ Partially covered (specify %)
- ⏭️ Postponed (requires reason)

**Coverage feeds to:** Web Admin (principal alert if > 2 weeks behind) · Cloud AI (recommends only from covered topics) · Parent & Student App (chapter progress shown to parent)

---

## Module 4 — Homework Assignment

**Fields:** Class-section · Subject · Title · Instructions (text or voice) · Type (Written / Problem Set / Reading / Drawing / Project) · Due date · Reference material · Differentiated variant toggle

**Differentiated Homework:**

- **v1:** Teacher writes both versions manually. System delivers correct variant per student's mastery.
- **v2:** AI generates simplified version for AT_RISK students. Teacher reviews both before publishing.
- Parent & Student App shows same title/due date for all variants — no stigma.

**Tracking (post due date):** Submitted on time · Submitted late · Not submitted (one-tap parent reminder) · SmartPad shows overdue badge

---

## Module 5 — Class Performance & Marks

**Performance score composition:**

| Source | Measures | Weight |
| --- | --- | --- |
| SmartPad mastery (Edge AI) | Topic understanding | 30% |
| Oral participation | Classroom engagement | 20% |
| Unit / class tests | Informal assessment | 25% |
| Main exams | Formal assessment | 25% |

**Class performance table:**

| Student | SmartPad | Homework | Tests | Exams | Overall | Trend |
| --- | --- | --- | --- | --- | --- | --- |
| Ravi Kumar | 82% | 95% | 78% | 81% | 84% | ↑ |
| Arun Reddy | 31% | 40% | 35% | 28% | 33% | ↓ AT_RISK |

Sortable by any column. Tap student → subject-specific detail view.

**Topic Gap Analysis:** Weakest topics across the class from GAP-1 error patterns — shows exactly what to re-teach.

**AI Mastery Override:** Teacher taps Override on any student's score → selects reason → adjusted mastery applied → logged as GAP-1 training signal → visible to principal.

**Oral Participation:** 1–5 star rating per student per period. Optional note. Rates 42 students in 2 minutes. Monthly aggregate identifies engaged vs passive. Visible to class teacher in 360° profile.

**Student Doubt Queue:** SmartPad-flagged doubts queue per subject per teacher. If 5+ students flag same topic → "Common doubt" shown at top, auto-added to teacher's period card as pre-class alert.

Actions per doubt: Answer in-app (pushed to SmartPad) · Mark for class discussion · Resolve

---

## Module 6 — Resource Sharing

Teacher selects class(es) → uploads PDF / image / notes → tags subject + chapter → publishes.
File queued for SmartPad download on next sync. Parent & Student App notified.

Resource library: searchable, re-pushable to any class. Principal sees all shared resources.

---

## Module 7 — My Class (Class Teacher Only)

### My Class Home

- Today's attendance summary
- All-subject mastery average
- Students needing attention (AT_RISK, absence, pending leave) — sorted by severity
- Behaviour incidents this week
- Upcoming exams, PTM, events

### Student 360° Profile

**Identity:** Name · DOB · Class-section · NeuraID · Parent mobile · SmartPad ID + last sync

**Attendance:** Monthly rate · calendar heatmap · absence streak · approved leave days

**All-Subject Mastery:**

| Subject | Teacher | Mastery | Percentile | Trend |
| --- | --- | --- | --- | --- |
| Mathematics | K. Ramesh | 82% | 78th | ↑ |
| Telugu | M. Devi | 38% | 22nd | ↓ |

**Writing Skills (v2 — WSS-1):**

| Dimension | Score | Trend |
| --- | --- | --- |
| Handwriting clarity | 74/100 | ↑ |
| Writing speed | 18 wpm | → |
| Spelling accuracy | 81% | ↑ |
| Sentence formation | Proficient | → |

**Study Habits (v2 — SHE-1):**

| Signal | Value |
| --- | --- |
| Focus score | 0.74 (Good) |
| Study start time | 7:00 PM (consistent ✅) |
| Active days this week | 5/5 |
| Distraction flags | 2 (Mon, Wed) |

**Homework completion:** Overall rate + per-subject breakdown

**Behaviour log:** Chronological incidents from any teacher — positive recognitions included

**AI Summary (Claude-generated):** Plain-language overview of student's full profile — used in PTM

### PTM Mode

Tap "PTM Mode" on any student → full-screen, presentation layout, enlarged fonts. Swipe through: Attendance → Mastery → Writing → Habits → Homework → Behaviour → AI Recommendations.

**Generate PTM Report PDF:** School letterhead · all metrics in plain language · AI recommendations · teacher + parent signature fields · shared via WhatsApp or printed from Web Admin.

### Behaviour & Discipline Log

**Categories:** Disruption / Bullying / Property Damage / Positive Recognition / Attendance Issue / Other

**Actions:** Verbal warning / Written warning / Parent informed / Principal informed / No action

### Leave Application Management

Parent submits via Parent & Student App. Class teacher reviews here.

Actions: Approve / Reject / Request more info. On approval: attendance updated to "Approved Leave" (not counted in absence %). Parent notified.

### Student Promotion Readiness

End-of-year (activated by principal). Auto-calculates per student:

- Attendance ≥ 75%
- Overall mastery ≥ 50% across subjects
- Main exam scores meet minimum pass criteria

Recommendation: Promote / Hold Back / Review. Class teacher can override with note.

---

## Module 8 — Notifications

| Notification | Role | Trigger | Action |
| --- | --- | --- | --- |
| AT_RISK — 48hr no intervention | Both | AT_RISK + no intervention | "View student" |
| Principal escalation | Both | Alert escalated | "View student" |
| Homework not submitted | Subject | < 60% on due date | "Remind parents" |
| Doubt queue overflow | Subject | > 10 unresolved | "View doubts" |
| Common doubt | Subject | 5+ students same topic | "View common doubt" |
| Absent streak | Class | 3+ consecutive days | "Message parent" |
| Leave request | Class | Parent submitted | "Review request" |
| Timetable changed | Both | Principal updates | "View schedule" |
| Mastery drop | Both | > 10% in one week | "View student" |
| Syllabus behind | Both | > 2 weeks behind plan | "Update coverage" |
| Exam marks pending | Subject | Exam passed, no entry | "Enter marks" |
| PTM scheduled | Class | Principal schedules | "View PTM" |
| Curriculum pattern (v2) | Subject | ML weekly scan | "View pattern" |

---

## Module 9 — My Performance

Accessible from Profile → "My Teaching Impact." Same data the principal sees — shown to teacher first with full context.

**This month:**

- My students' average mastery vs school average (same subject)
- Mastery velocity: percentile points/month
- AT_RISK count + intervention rate

**Common error patterns in my subject:** Top 3 error types from GAP-1 · suggested reteaching approach

**AI Pattern Insight:** Claude identifies if pattern is a curriculum gap (multiple teachers, multiple schools) or a teaching pattern (specific to this teacher's classes). Context flags applied: [REMEDIAL_CLASS] [NEW_TEACHER] [HIGH_ABSENTEEISM].

**What teacher does NOT see:** Rank against named colleagues · school-wide ranking (principal only)

---

## Offline-First

| Feature | Offline behaviour | Cache TTL |
| --- | --- | --- |
| Home + schedule | Loads from cache instantly | 1 hour |
| Attendance marking | Stored locally, signed, synced on connect | 7 days |
| Homework creation | Saved locally, published on sync | — |
| Marks entry | Saved locally, synced on connect | — |
| Student profiles | Cached on last sync | 24 hours |
| Doubt queue | Cached | 6 hours |

Sync on app open + background every 15 min + flush pending writes on reconnect.

---

## Data Models

**Teacher:**

```json
{
  "teacher_id": "TCH-00198",
  "school_id": "SCH-AP-00142",
  "name": "S. Lakshmi",
  "roles": ["SUBJECT_TEACHER", "CLASS_TEACHER"],
  "subjects": ["ENGLISH"],
  "assigned_classes": [
    { "class": "10", "section": "A", "subject": "ENGLISH" }
  ],
  "class_teacher_of": { "class": "10", "section": "A" }
}
```

**Message Thread:**

```json
{
  "thread_id": "MSG-00421",
  "teacher_id": "TCH-00198",
  "neura_id": "NID-2025-AP-084291",
  "initiated_by": "TEACHER",
  "class_teacher_visible": true,
  "principal_visible": true,
  "sms_fallback_sent": false
}
```

---

## Confirmed Decisions

| Decision | Detail |
| --- | --- |
| Separate APK | Teacher App is its own install. Never shared with parents/students. |
| JWT: 24hr + 30-day refresh | Biometric re-auth within the 30-day window. |
| Oral participation | Monthly average (1–5) shown to parents. Per-session notes: internal only. |
| Messaging: bidirectional | Teacher and parent can both initiate. No personal number exchange. |
| Message visibility | Class teacher: read-only on all threads in their class. Principal: school-wide. |
| Differentiated homework | Parent sees same title/due date regardless of variant. No stigma. |
| School branding | School name + logo primary on all screens, reports, SMS. "Powered by NeuraLife" in footer. |
| Substitute access | Day-only, read-only syllabus plan. Cannot access past marks or student profiles. |
| Bulk marks: v2 (camera OCR) | v1: manual entry. v2: OCR from paper mark sheet. |
| WSS-1 writing data: v2 | Writing block in 360° profile populates when WSS-1 model is deployed. |
| SHE-1 habit data: v2 | Study habit block populates when SHE-1 model is deployed. |
| Performance framed as support | Teacher sees own data first, with context. Not ranked against named colleagues. |
| AI override = training signal | Teacher disagreements fed to GAP-1 quarterly retraining. |
| Messaging limits | v1: text only (500 chars). v2: photo (5 MB). v3: voice notes. |