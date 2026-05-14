# NeuraLife — Web Admin Console

*The command centre for school principals to manage students, staff, academics, finances, device fleet, and learning health — providing complete operational control of the NeuraLife ecosystem within their school.*

---

## Purpose & Scope

The Web Admin Console is a **browser-based dashboard** used exclusively by the School Principal (or a designated Super Admin). It is not a teaching tool, not a content creation platform, and not a student-facing interface.

Its job is to give the principal total operational visibility and control across six domains: **people, academics, learning health, communications, finances, and device fleet.**

> **Design principle:** A principal is busy, non-technical, and managing 500–2000 students. Every screen must be scannable in under 3 seconds. The most important information is visible immediately on login. Complexity hides behind progressive disclosure.
> 

---

## Version Roadmap

| Feature Area | v1 Demo | v2 Post-Deal | v3 Scale |
| --- | --- | --- | --- |
| School onboarding wizard | ✅ | ✅ | ✅ |
| Student & teacher management | ✅ | ✅ | ✅ |
| Class, section & timetable setup | ✅ | ✅ | ✅ |
| Real-time mastery dashboard | ✅ | ✅ | ✅ |
| Student writing & skill analytics | ✅ | ✅ | ✅ |
| SmartPad fleet management | ✅ | ✅ | ✅ |
| SmartPad lock + location tracking | ✅ | ✅ | ✅ |
| Attendance tracking | ✅ | ✅ | ✅ |
| Alert escalation system | ✅ | ✅ | ✅ |
| Announcements & broadcasts | ✅ | ✅ | ✅ |
| Fee management + parent SMS alerts | ❌ | ✅ | ✅ |
| Staff payroll management | ❌ | ✅ | ✅ |
| Revenue & cost analytics | ❌ | ✅ | ✅ |
| Bulk student CSV import | ❌ | ✅ | ✅ |
| Inter-school benchmarking | ❌ | ❌ | ✅ |
| Government / district reporting | ❌ | ❌ | ✅ |
| NeuraID school-transfer management | ❌ | ✅ | ✅ |

---

## Module 1 — School Onboarding Wizard

*A mandatory guided setup flow that takes a school from zero to fully live in under 60 minutes, without requiring any technical support.*

The single biggest failure point for EdTech adoption is the blank-screen problem: a principal logs in on day one and has no idea where to start. NeuraLife eliminates this with a 7-step wizard that cannot be skipped.

### Wizard Steps

**Step 1 — School Profile**

- School name, address, district, mandal, pin code
- Affiliated board: AP State / Telangana State / CBSE / ICSE
- Medium of instruction: English / Telugu / Both
- School type: Government / Private / Aided
- Principal name, official mobile, official email

**Step 2 — Academic Year Setup**

- Academic year start and end dates
- Term structure: Semester / Trimester / Annual
- Holiday calendar upload (optional, used for attendance tracking)
- Exam schedule (Mid-term, Final) — used to auto-trigger exam lock mode on SmartPads

**Step 3 — Class & Section Setup**

- Add classes 1 through 12 (select which are applicable)
- Define sections per class (A, B, C...)
- Set max students per section
- Assign medium per section (English or Telugu)

**Step 4 — Add Teachers**

- Name, mobile number, subject(s), class-section assignment
- Designation: Subject Teacher / Class Teacher / HOD / Vice Principal
- System auto-generates login credentials and sends SMS to teacher's mobile
- Teachers are marked "pending activation" until first login

**Step 5 — Enroll Students**

- Manual entry: Name, date of birth, parent mobile, class, section, medium, Aadhaar (optional, for NeuraID binding)
- Bulk import via CSV template (v2)
- System auto-generates NeuraID on enrollment
- Parent receives SMS with app download link and child's NeuraID on enrollment

**Step 6 — Assign SmartPads**

- Scan or manually enter PAD-ID from device serial label
- Link PAD-ID to student NeuraID
- Pad downloads student profile and content on first WiFi sync
- Unassigned pads shown in a queue

**Step 7 — Go Live Check**

- System runs a pre-flight check: all classes have a teacher, all students have a pad assigned, timetable is set for at least the current week
- Shows a completion percentage
- Principal receives a "School is live" confirmation with a shareable setup summary

### Wizard Rules

- Each step validates before unlocking the next
- Principal can return and edit any completed step at any time
- Progress is shown as a persistent banner on the dashboard until all 7 steps are complete
- Estimated time: 45–60 minutes for a school of 500 students

---

## Module 2 — Dashboard (Home Screen)

*Real-time overview of school health — the first screen the principal sees every morning.*

### KPI Cards (Top Row)

| Metric | Description | Alert Threshold |
| --- | --- | --- |
| Total Students | Enrolled and active | — |
| Today's Attendance | School-wide attendance percentage for today | < 75% triggers warning |
| Active SmartPads | Devices synced in last 24 hours | < 80% triggers warning |
| School Mastery Average | Mean mastery across all subjects and classes | < 50% triggers alert |
| At-Risk Students | Below 40% mastery for 7+ days | Any > 0 shown as red |
| Fee Defaulters | Students with overdue fees | Any > 0 shown as amber |

### Class Mastery Table

Sortable table showing every class-section:

- Class name and section
- Assigned class teacher
- Student count and today's attendance count
- Mastery percentage with visual bar
- Status badge: Healthy (>70%) / Good (50–70%) / Watch (35–50%) / At Risk (<35%)

Clicking any row drills into that class's full detail view.

### Alert Feed

Persistent prioritised alert list. See Module 7 for full alert types and escalation rules.

---

## Module 3 — People Management

### 3.1 Students

**List View**

- Searchable, filterable table of all enrolled students
- Filters: Class, Section, Mastery Level, Attendance Rate, SmartPad Status, Fee Status, Medium
- Columns: NeuraID, Name, Class-Section, Mastery %, Attendance %, Pad Status, Fee Status

**Student Profile (Principal View)**

The principal's view is designed for one specific use case: talking to a parent in a meeting and showing them concrete, evidence-based data about their child's learning.

- **Identity:** Name, DOB, class, section, medium, NeuraID, parent mobile
- **Attendance Summary:** Monthly attendance rate, days present vs absent, streak of consecutive absences
- **Learning Health Score:** Overall mastery percentage across all subjects, trend over last 30 days (improving / stable / declining)
- **Subject-wise Mastery Table:** Each subject with mastery %, last active date, and a trend arrow
- **Writing Skills Report:** See Module 6 for detail — this pulls the on-device activity analysis
- **Key Insights for Parent Meeting:** Auto-generated 3–5 bullet points: "Ravi's Mathematics mastery improved from 52% to 71% this month. His biggest gap is subtraction with borrowing. His writing speed has increased by 15% in the last 4 weeks." These are generated by the AI engine and shown to the principal in plain language.
- **SmartPad:** PAD-ID, last sync, battery, activity days this week
- **Fee Status:** Amount paid, amount due, last payment date

**Actions available:**

- Edit profile
- Transfer to another class or another NeuraLife school (triggers NeuraID transfer flow)
- Deactivate / re-activate
- Reassign SmartPad
- Send alert to parent (SMS)

### 3.2 Teachers

**List View**

- All teachers with name, subject(s), assigned classes, last app login, status
- Status: Active / Inactive (no login in 7+ days — flagged)

**Teacher Profile:**

- Personal details, assigned subjects and sections
- Login credentials management (reset available)
- App activity: last login, assignments graded this week, attendance marked this week
- Leave record (v2)

**Actions:** Add, edit assignments, reset credentials, deactivate

### 3.3 Staff (Non-Teaching)

*(v2 — for payroll integration)*

- Admin staff, support staff
- Role, department, salary, payment status

---

## Module 4 — Academic Operations

### 4.1 Classes & Sections

- Visual grid of all classes and sections
- Click any section: see enrolled students, class teacher, current mastery average, today's attendance
- Add / remove / merge sections with student reassignment flow

### 4.2 Timetable

- Weekly timetable editor per class-section
- Assign subject + teacher per period
- **Real-time push to SmartPads and mobile app via WebSocket on save**
- SmartPad shows: today's schedule, current ongoing class (highlighted), next class, time remaining
- Conflict detection: flags double-booked teachers before saving
- Special period types: Exam / Free Period / Assembly / Sports

### 4.3 Curriculum & Content

- View which e-textbook chapters are currently loaded on student pads per class
- Push new content packages to all pads in a class or specific sections
- Set chapter unlock schedule (e.g., Chapter 5 unlocks on Oct 10)
- Content is served in the student's assigned medium (English or Telugu)

### 4.4 Attendance

- Daily attendance view: class-wise, student-wise
- Teachers mark attendance on the mobile app; principal sees it in real-time
- Monthly attendance calendar per student (visual heatmap)
- Auto-alert triggers: student absent 3+ consecutive days → SMS to parent, alert on dashboard
- Export monthly attendance report as PDF per class

---

## Module 5 — Learning Health & Writing Analytics

*This is the segment that gives the principal evidence to have meaningful conversations with parents — not opinions, but data.*

### 5.1 School-wide Mastery Dashboard

- Subject-wise mastery heatmap across all classes
- Identifies which subject is weakest school-wide (actionable: principal can call a teacher meeting)
- Month-on-month trend per subject

### 5.2 Student Writing Skills Analytics

Since NeuraOS captures every stylus stroke on the SmartPad, the Edge AI analyses four dimensions of writing quality continuously. This data is shown to the principal (and in detail to parents via the mobile app):

| Skill Dimension | What is Measured | How Shown |
| --- | --- | --- |
| Handwriting Clarity | Legibility score based on stroke consistency and letter form | Score out of 100, trend graph |
| Writing Speed | Average words per minute across writing sessions | WPM trend over weeks |
| Spelling Accuracy | Percentage of correctly spelled words (OCR + dictionary check) | % accuracy per subject |
| Sentence Formation | Grammar and structure quality for essays and answers | Level: Developing / Proficient / Advanced |

**Display in Principal Console:**

- Class-level writing skills summary table (all students, all four dimensions)
- Drill down to individual student (for parent meeting use)
- Trend over last 30, 60, 90 days
- Flag students whose handwriting clarity is below threshold (may indicate learning difficulty)

**Display in Parent Mobile App (Student Login):**

- Subject-wise writing skill breakdown
- Week-by-week progress charts
- Specific feedback: "Your child's spelling accuracy in English improved from 68% to 81% this month"

---

## Module 6 — SmartPad Fleet Management

*Because NeuraLife owns the OS, we have device-level visibility no competitor can match. This module is a key demo differentiator.*

### Fleet Overview

- Total pads registered / active (synced last 24h) / stale (1–3 days) / offline (3+ days)
- Battery health distribution: how many pads are below 20%
- OS version distribution: flag pads running outdated NeuraOS needing OTA update
- Edge AI model version distribution

### Per-Device Detail

| Field | Description |
| --- | --- |
| PAD-ID | Physical device identifier |
| NeuraID | Linked student |
| School | Assigned school |
| Battery | Current level + charging status |
| Last Sync | Timestamp + data transferred |
| NeuraOS Version | Current OS build |
| Edge AI Model Version | On-device model version |
| Storage | Used / Total (GB) |
| Status | Active / Stale / Offline / Locked / Lost |
| Location | Last known GPS coordinates (always active — see below) |

### SmartPad Location Tracking

- GPS location is logged every 30 minutes and transmitted on next sync
- Location is always active even when the device appears powered off (low-power location beacon mode built into NeuraOS)
- Principal sees last known location on a map view in the fleet panel
- **Theft / Loss Flow:**
    1. Principal registers a "Loss Report" on the console
    2. System immediately activates continuous real-time GPS tracking (1-minute intervals)
    3. SmartPad is remotely locked — screen shows "This device is registered as lost. Contact Vikas High School."
    4. All academic data on the device is encrypted and inaccessible
    5. Location history is shown to principal on a map timeline
    6. Once retrieved, principal unlocks the pad remotely — device resumes normal operation

### Exam Lock Mode

- Principal sets exam date and time window in the Academic Calendar
- At exam start time, all pads in the school automatically switch to Exam Mode:
    - E-textbooks and notes are hidden
    - Edge AI tutor is disabled
    - Only blank writing pages are accessible (for rough work)
    - No WiFi sync during exam window
- Exam mode ends automatically at the scheduled end time
- Principal can also trigger manual lock / unlock for any individual pad at any time

### Fleet Actions

- **OTA Update:** Push NeuraOS update to all pads or selected pads (scheduled overnight)
- **Remote Lock / Unlock:** For theft, discipline, or exam management
- **Remote Wipe:** Nuclear option — wipes all local data (used only on confirmed stolen devices)
- **Push Content:** Send a content package to selected devices or all devices in a class
- **Dropout Risk View:** Dedicated sub-tab showing all pads inactive 3+ days, sorted by days inactive, with one-click parent SMS alert

---

## Module 7 — Alert & Escalation System

*Alerts exist because principals are busy and cannot monitor every student manually. The system monitors automatically and escalates if ignored.*

### Alert Types

| Alert | Trigger | Severity | Auto-Escalation Path |
| --- | --- | --- | --- |
| Pad Inactive — Dropout Risk | Pad offline 3+ days | HIGH | Day 1: Dashboard alert. Day 2 (if dismissed): Auto-SMS to class teacher. Day 3: NeuraLife internal flag |
| Student Absent Streak | Absent 3+ consecutive days | HIGH | Day 1: SMS to parent. Day 3 (if no response): Dashboard alert |
| Class Mastery Drop | Class mastery drops below 40% | HIGH | Dashboard alert. If unresolved 7 days: suggest teacher review meeting |
| At-Risk Student | Individual student below 40% mastery for 7 days | MEDIUM | Dashboard alert + teacher notification |
| Fee Overdue | Fee unpaid past due date | MEDIUM | SMS to parent + dashboard alert |
| Teacher Inactive | Teacher not logged into app 3+ days | MEDIUM | Dashboard alert |
| Pad Battery Critical | Battery below 15% for 2+ days | LOW | Dashboard alert |
| New Student — Pad Unassigned | Student enrolled but no pad linked | LOW | Dashboard reminder |

### Escalation Logic

When a principal dismisses an alert without taking action, the system escalates automatically — no manual follow-up required from the principal.

**Confirmed escalation rules (locked decisions):**

- **HIGH alerts (e.g., Pad Inactive — Dropout Risk):**
    - T+0: Alert appears on principal dashboard
    - T+24h (if dismissed without action): Auto-notification sent simultaneously to two parties:
        1. **Class teacher** — in-app push notification on Teacher Mobile App: "Alert: Arun Reddy (8-C) SmartPad has been inactive for 4 days. Please check with the student."
        2. **Parent mobile** — SMS to the registered parent number on the student's NeuraLife account: "Dear Parent, we noticed [Student Name]'s NeuraLife SmartPad has not been used for 4 days. Please contact [School Name] if there is an issue."
    - T+48h (if still unresolved): NeuraLife internal support flag raised for manual follow-up
- **MEDIUM alerts (e.g., At-Risk Student mastery drop):**
    - T+0: Dashboard alert
    - T+48h (if dismissed): Auto-notify class teacher via in-app notification
    - No parent SMS at this stage — teacher investigates first
- **LOW alerts (e.g., Battery Critical, Pad Unassigned):**
    - Dashboard only. Expire after 7 days if no action taken. No external notifications.

**Key design principle:** The parent SMS is intentionally worded as a soft, concerned message — not an accusation. It gives the parent a chance to explain (travel, illness, device issue) before the school escalates further. This protects the relationship between school and family.

---

## Module 8 — Financial Management *(v2)*

### 8.1 Fee Management

- **Fee Structure Setup:** Define fee heads per class (Tuition, Transport, Lab, Sports, etc.) and amounts per term
- **Student Fee Ledger:** Per student — amount due, amount paid, balance, payment history
- **Collection Dashboard:** Total collected this month, total outstanding, class-wise collection rate
- **Overdue Alerts:** Auto-SMS to parent when fee crosses due date. SMS content: "Dear Parent, ₹3,500 fee for [Student Name], Class 8-A is overdue. Please pay at school or contact [Principal Name] on [mobile]."
- **Payment Recording:** Mark payments received (cash / UPI / cheque) manually in v2; auto-reconciliation via payment gateway in v3
- **Export:** Monthly fee collection report as Excel / PDF

### 8.2 Staff Payroll

- Staff roster with salary, designation, joining date
- Monthly payroll: calculated automatically based on attendance (if leave is tracked)
- Payment status per staff member: Paid / Pending / Partial
- Payroll summary: total payroll liability for the month, amount disbursed, amount remaining
- Payslip generation per staff member (PDF, shareable via WhatsApp)
- Alert: Flag if payroll has not been processed by the 7th of the month

### 8.3 Revenue & Cost Analytics

- **Revenue:** Total fee collected this academic year, month-by-month trend, outstanding receivables
- **Costs:** Payroll, operational costs (manually entered in v2), NeuraLife subscription fee
- **Net Position:** Revenue vs costs per month
- **NeuraLife Subscription Status:** Current plan, renewal date, number of licensed students

---

## Module 9 — Announcements & Communications

- Compose rich-text announcements
- Target audience: All school / Specific class(es) / Teachers only / Parents only / Individual student's parent
- Delivery channels: In-app notification + SMS fallback for parents without the app
- Schedule announcements for future delivery
- View delivery status: Sent count / Delivered count / Read count
- Templates: Common announcements pre-built (School holiday, Exam reminder, Fee due, Parent-teacher meeting)

---

## Data Privacy & NeuraID Ownership Policy

### Data Ownership

- **The student (via their parent/guardian) owns their learning data.** NeuraLife is a data processor, not a data owner.
- On enrollment, the parent receives and must accept a Data Consent Form that states:
    - What data is collected (writing activity, mastery scores, attendance, device usage)
    - How it is used (personalisation, teacher insights, principal reports)
    - That data will never be sold or shared with third parties without explicit consent
    - That the student's NeuraID and learning history can be retained on the NeuraLife platform even if the school exits, subject to parental consent

### School Exit Scenario

If a school cancels its NeuraLife subscription:

1. The school's admin access is deactivated
2. Each parent receives an SMS: "Your school has exited the NeuraLife platform. Your child's learning data linked to NeuraID [NID-xxx] will be retained securely for 2 years. You may request data export or deletion at any time at neuralife.in/data."
3. Parents who consent to retention: their child's NeuraID remains active and their data transfers seamlessly when they join another NeuraLife school
4. Parents who request deletion: all data is purged within 30 days and a deletion confirmation is sent
5. NeuraLife retains only anonymised, non-identifiable aggregate data for AI model improvement

### Data Security

- All student data encrypted at rest (AES-256) and in transit (TLS 1.3)
- SmartPad local data encrypted on-device
- No third-party advertising access to any student data
- Data stored in India-based servers (compliant with DPDP Act 2023)

---

## Activity Logger App — Demo Strategy for v1

### What is the Activity Logger?

For the v1 demo, we do not have physical SmartPads. Instead, we build a lightweight Android app — the **NeuraLife Activity Logger** — that runs on any standard Android tablet (e.g., a ₹8,000 Samsung or Realme tablet). This app simulates what NeuraOS does on the SmartPad.

### What it does

- Opens a blank writing canvas using the tablet's built-in stylus or touch input
- Records every stroke with timestamp, pressure (if supported), pause duration, and erasing events
- Identifies the current subject from the timetable (fetched in real-time from the server)
- Runs a lightweight on-device model that classifies writing activity: active writing / hesitation / repeated correction
- Bundles this activity data and syncs to the cloud every 15 minutes when on WiFi
- Displays current timetable: today's classes, ongoing class (highlighted), next class, time remaining

### What it produces for the demo

- A student's real writing session generates real activity data
- The principal's dashboard shows that PAD-0042 (Ravi Kumar) was active for 47 minutes in Mathematics class today, made 3 corrections on the same problem, and is showing a hesitation pattern on multiplication
- This is 100% real data from a tablet — not simulated — which makes the demo credible and compelling

### What it proves

When you walk into a school with a cheap Android tablet running this app and show a principal the dashboard lighting up with real student activity in real time, you have proven:

1. The data pipeline works end-to-end
2. The dashboard is genuinely useful
3. The concept is real, not a slide deck

### Hardware upgrade path

When the actual SmartPad hardware is ready, the Activity Logger app is replaced by NeuraOS — the same data pipeline, the same API, the same dashboard. Zero changes required on the backend.

---

## Tech Stack

```yaml
Frontend:
  Framework: React 18 + TypeScript
  UI Library: Tailwind CSS + shadcn/ui
  State Management: Zustand
  Data Fetching: TanStack Query (React Query)
  Real-time: Socket.io (timetable push, pad status updates, alert feed)
  Charts: Recharts
  Maps (fleet tracking): Leaflet.js + OpenStreetMap (free, no Google Maps cost)
  Auth: JWT + refresh token rotation

Backend:
  Runtime: Node.js + Express (or Next.js API routes for v1)
  Database: PostgreSQL via Supabase (managed, instant REST API, row-level security)
  Cache: Redis — session, dashboard KPI cache, real-time pad status
  File Storage: Supabase Storage (CSV imports, PDF reports, content packages)
  SMS: Twilio or MSG91 (Indian SMS gateway, better deliverability in AP/TS)
  Push Notifications: Firebase Cloud Messaging
  Real-time: Supabase Realtime (built-in WebSocket — no extra infra for v1)

SmartPad / Activity Logger Sync:
  Protocol: HTTPS REST for bulk sync, WebSocket for real-time timetable
  Sync interval: Every 15 minutes (background), real-time for timetable changes
  Offline queue: Local SQLite on device, auto-flush on connectivity restore

Deployment (v1 demo):
  Hosting: Railway or Render (zero-ops for solo developer)
  Database: Supabase free tier → upgrade to Pro post first deal
  Domain: admin.neuralife.in
```

---

## User Roles & Permissions

| Role | Access | Notes |
| --- | --- | --- |
| NeuraLife Super Admin | Full system — all schools | Platform operator only |
| Principal | Full access — their school only | Cannot access other schools' data |
| Vice Principal *(v2)* | Read-only + limited edits | No billing, no device wipe |
| School IT Admin *(v2)* | Fleet management only | No academic or financial data |

---

## Data Models

### School

```json
{
  "school_id": "SCH-AP-00142",
  "name": "Vikas High School",
  "district": "Guntur",
  "state": "AP",
  "board": "AP_STATE",
  "medium": ["ENGLISH", "TELUGU"],
  "type": "PRIVATE",
  "principal_id": "USR-00891",
  "subscription_tier": "v1_demo",
  "subscription_expires": "2026-03-31",
  "neura_community_registered": true,
  "onboarding_step_completed": 4,
  "created_at": "2025-08-01T09:00:00Z"
}
```

### Student

```json
{
  "neura_id": "NID-2025-AP-084291",
  "student_id": "STU-00421",
  "school_id": "SCH-AP-00142",
  "name": "Ravi Kumar",
  "dob": "2012-04-14",
  "class": "10",
  "section": "A",
  "medium": "ENGLISH",
  "parent_mobile": "+91-9876543210",
  "smartpad_id": "PAD-0042",
  "status": "ACTIVE",
  "data_consent_given": true,
  "data_retain_on_school_exit": true,
  "enrolled_at": "2025-06-10T10:00:00Z",
  "transfer_history": []
}
```

### SmartPad / Device

```json
{
  "pad_id": "PAD-0042",
  "serial": "NLP24080042",
  "assigned_neura_id": "NID-2025-AP-084291",
  "school_id": "SCH-AP-00142",
  "os_version": "NeuraOS-1.2.4",
  "edge_ai_model_version": "neura-edge-v0.8",
  "battery_level": 88,
  "is_charging": false,
  "last_sync_at": "2025-09-01T08:14:00Z",
  "last_known_location": { "lat": 16.3067, "lng": 80.4365, "timestamp": "2025-09-01T08:00:00Z" },
  "storage_used_mb": 4200,
  "storage_total_mb": 32768,
  "status": "ACTIVE",
  "locked": false,
  "loss_reported": false,
  "exam_lock_active": false
}
```

### Writing Skills Record

```json
{
  "record_id": "WR-00291",
  "neura_id": "NID-2025-AP-084291",
  "date": "2025-09-01",
  "subject": "MATHEMATICS",
  "session_duration_mins": 47,
  "handwriting_clarity_score": 74,
  "writing_speed_wpm": 18,
  "spelling_accuracy_pct": 81,
  "sentence_formation_level": "PROFICIENT",
  "corrections_made": 3,
  "hesitation_events": 7,
  "active_writing_pct": 68
}
```

### Alert

```json
{
  "alert_id": "ALT-00931",
  "school_id": "SCH-AP-00142",
  "type": "PAD_INACTIVE_DROPOUT_RISK",
  "severity": "HIGH",
  "target_entity_type": "SMARTPAD",
  "target_entity_id": "PAD-0233",
  "message": "PAD-0233 (Arun Reddy, 8-C) has been inactive for 4 days.",
  "created_at": "2025-09-01T09:14:00Z",
  "dismissed_at": null,
  "escalation_stage": 0,
  "escalated_to": null,
  "resolved": false
}
```

---

## Demo Walkthrough (School Visit Script)

Use this sequence when presenting to a school principal. Target time: 8–10 minutes.

| Step | What to Show | What it Proves |
| --- | --- | --- |
| 1 | Open dashboard — KPI cards with live data | System is live and real |
| 2 | Point to At-Risk Students card (e.g., 38 students) | AI is identifying real problems |
| 3 | Click a class row → show mastery breakdown per student | Granular, actionable data |
| 4 | Open one student profile → show writing skills report | "Here's what you'd show a parent in a meeting" |
| 5 | Open Fleet panel → show pad inactive 4 days (Arun Reddy) | "You knew he was at risk before his teacher did" |
| 6 | Show Exam Lock button → explain theft lock + GPS | Safety + control story |
| 7 | Show Onboarding Wizard → explain it takes 1 hour to go live | Removes adoption fear |
| 8 | Show Attendance → today's class-wise attendance live | Replaces register entirely |

---

## Open Questions

- **Q1:** For the writing skills analysis, should the principal see raw session data (every session per day) or only weekly/monthly aggregated scores? Aggregated is cleaner for the parent meeting use case; raw is more useful for research. Recommend: aggregated by default, raw available on drill-down.
- **Q2:** Should fee management be built as part of NeuraLife, or should we integrate with an existing school ERP (like Fedena or Schoology) for v2? Building it in-house creates stickiness; integration is faster.
- **Q3:** For the Activity Logger demo app, which Android tablet model should we standardise on? Recommendation: Samsung Galaxy Tab A7 Lite (₹8,499) — widely available, has stylus support, and is close in form factor to the target SmartPad.
- **Q4:** Should the principal dashboard support Telugu language UI for v1, or English only with Telugu content on pads? Telugu UI on the dashboard significantly broadens adoption in Tier-2/3 schools but adds development time.
- **Q5:** What is the data retention period for raw writing activity data (stroke logs)? Recommendation: 90 days raw, then aggregated scores retained permanently. Raw data deletion reduces storage cost and privacy exposure.

# NeuraLife — Web Admin Console

*The command centre for school principals to manage students, staff, academics, finances, device fleet, and learning health — replacing both school ERP and learning platform in one integrated, insight-driven interface.*

---

## Purpose & Scope

The Web Admin Console is a **browser-based dashboard** used by the School Principal and designated School Admin. It is not a teaching tool, not a content creation platform, and not a student-facing interface.

Its job is to give the principal complete operational visibility and control across seven domains: **people, academics, learning health, finances, communications, device fleet, and analytics.**

> **Design principle:** A principal is busy, non-technical, and managing 500–2,000 students. Every screen must be scannable in under 3 seconds. The most important information is visible immediately on login. Complexity hides behind progressive disclosure. Every data point must answer: "So what do I do with this?"
> 

---

## Version Roadmap

| Feature Area | v1 | v2 | v3 |
| --- | --- | --- | --- |
| School onboarding wizard | ✅ | ✅ | ✅ |
| Student admission (manual + CSV bulk) | ✅ | ✅ | ✅ |
| Teacher management (full profile + salary structure) | ✅ | ✅ | ✅ |
| Class, section & timetable setup | ✅ | ✅ | ✅ |
| School Health Score dashboard | ✅ | ✅ | ✅ |
| Real-time mastery dashboard | ✅ | ✅ | ✅ |
| Writing & skill analytics | ✅ | ✅ | ✅ |
| Teacher performance intelligence | ✅ | ✅ | ✅ |
| SmartPad fleet management | ✅ | ✅ | ✅ |
| SmartPad lock + location tracking | ✅ | ✅ | ✅ |
| Attendance tracking | ✅ | ✅ | ✅ |
| Alert escalation system | ✅ | ✅ | ✅ |
| Announcements & broadcasts | ✅ | ✅ | ✅ |
| **Fee management + automated SMS reminders** | **✅** | ✅ | ✅ |
| **Fee insights dashboard** | **✅** | ✅ | ✅ |
| **Salary structure + payslip generation** | **✅** | ✅ | ✅ |
| **Leave management** | **✅** | ✅ | ✅ |
| Full payroll processing (NEFT export, PF/ESI) | ❌ | ✅ | ✅ |
| In-app UPI fee payment (Razorpay) | ❌ | ✅ | ✅ |
| Document upload (encrypted) | ❌ | ✅ | ✅ |
| Revenue & cost P&L analytics | ❌ | ✅ | ✅ |
| NeuraID school-transfer management | ✅ | ✅ | ✅ |
| Inter-school benchmarking | ❌ | ❌ | ✅ |
| Government / district reporting | ❌ | ❌ | ✅ |

---

## Module 1 — School Onboarding Wizard

*A guided setup flow that takes a school from zero to fully live in under 60 minutes, run by a NeuraLife team member during the first school visit.*

The single biggest failure point for EdTech adoption is the blank-screen problem: a principal logs in on day one and has no idea where to start. NeuraLife eliminates this with an 8-step wizard run jointly by the NeuraLife team member and the school's principal during the onboarding visit.

### Wizard Steps

**Step 1 — School Identity**

```
School Full Name *              [                              ]
UDISE Code *                    [          ]  [Verify ↗]
  → On verify: auto-fills name + district from UDISE+ portal
  → Confirms school legitimacy before proceeding

Board Affiliation *             [SCERT AP ▼ | SCERT TS ▼ | CBSE ▼ | ICSE ▼]
Affiliation Number              [          ]
School Type *                   [Private ▼ | Government ▼ | Aided ▼]
Recognition Status              [Recognised ▼ | Pending ▼]
Establishment Year              [    ]
Medium of Instruction *         [English ▼] [Telugu ▼] [Both ▼]
Shifts                          [Single ▼ | Double ▼]
District *                      [         ▼]
Mandal *                        [         ▼]
Full Address *                  [                              ]
Pincode *                       [      ]
GPS Coordinates                 [Auto-detect] or [Enter manually]
Principal Name *                [                              ]
Principal Mobile *              [+91                          ]
Principal Email *               [                              ]
School Phone                    [                              ]
```

Smart defaults on board selection:

- SCERT AP/TS → Working days: Mon–Sat, Exam pattern: FA1+FA2+SA1+SA2
- CBSE → Working days: Mon–Sat, Exam pattern: Term 1+Term 2

**Step 2 — Academic Year Setup**

```
Academic Year *                 [2025-26 ▼]
Academic Year Start *           [June ▼]    End * [March ▼]
Working Days *                  [☑Mon ☑Tue ☑Wed ☑Thu ☑Fri ☑Sat ☐Sun]
School Start Time *             [09:00]     End Time * [16:00]
Exam Pattern *                  [FA + SA — SCERT ▼]
  → Auto-creates: FA1 (Aug), FA2 (Oct), SA1 (Dec), SA2 (Mar)
Grading System *                [Marks (0–100) ▼]
Holiday Calendar                [Load AP/TS public holidays] [+ Add custom holiday]
```

**Step 3 — Classes & Sections Setup**

```
Classes offered * (select all that apply):
  [☑1 ☑2 ☑3 ☑4 ☑5 ☑6 ☑7 ☑8 ☑9 ☑10 ☐11 ☐12]

For each selected class:
  Class 10:  Sections [A] [B] [C] [D]  [+ Add]   Avg strength: [42]
  Class  9:  Sections [A] [B] [C]       [+ Add]   Avg strength: [45]
  ...

Assign medium per section (if school offers both):
  Class 10-A: [English ▼]   10-B: [Telugu ▼]   10-C: [English ▼]
```

**Step 4 — Add First Admin + Teachers**

```
Office Admin (first, so they can continue setup):
  Name *         [                    ]
  Mobile *       [+91                 ]  ← OTP login
  Role *         [School Admin ▼]
  [Add Admin] → SMS credentials sent immediately

Add Teachers:
  Name *         [                    ]
  Mobile *       [+91                 ]
  Employee ID    [          ]  [Auto-generate]
  Designation *  [PGT ▼ | TGT ▼ | PRT ▼ | HM ▼]
  Subjects *     [☑ Mathematics ☐ Physics ☐ Telugu ...]
  Employment     [Regular ▼]
  [Add Teacher] [+ Add Another]

Teachers marked "Pending Activation" until first app login.
SMS sent to each teacher: "Welcome to [School]. Download NeuraLife
Teacher App: [link]. Your login: OTP to this number."
```

**Step 5 — Fee Structure Configuration**

```
Configure fees per class and per student category.
This is used for all admissions and fee collection.

  Class 10 fees:
                          General   SC/ST/OBC   EWS/Free
  Admission Fee (once)    ₹[    ]   ₹[    ]     ₹[    ]
  Development Fee (ann.)  ₹[    ]   ₹[    ]     ₹[    ]
  Tuition Fee (monthly)   ₹[    ]   ₹[    ]     ₹[    ]
  Exam Fee (per term)     ₹[    ]   ₹[    ]     ₹[    ]
  Transport Fee (monthly) ₹[    ]   ₹[    ]     ₹[    ]
  NeuraLife Sub. (monthly)₹  500    ₹  500      ₹  500  ← fixed
  SmartPad (one-time)     ₹[    ]   ₹[    ]     ₹[    ]

  Fee due day of month:   [1st ▼]
  Late fee after:         [10th ▼]   Amount: ₹[50]

[Copy to other classes with adjustments]
[Save Fee Structure]
```

**Step 6 — Enroll Students**

Two paths available. Principal chooses:

*Path A — CSV Bulk Import (for 50+ students, academic year start):*

```
[Download Excel Template]
  → Template has all required columns, dropdown options,
    sample rows, colour-coded required vs optional fields

[Upload Completed Excel]
  → Validation runs row by row
  → Preview: GREEN (ready) / AMBER (warning) / RED (error)
  → Import all GREEN + AMBER rows
  → Download error report for RED rows
  → Import summary: "487 imported. 13 had errors."
  → NeuraIDs generated for all, parent SMS sent
```

*Path B — Individual Fast-Form (for mid-year admissions):*

```
Tab 1: Personal Details (name, DOB, gender, Aadhaar → hashed, caste, blood group)
Tab 2: Academic Details (admission number, class, section, medium, transfer details)
Tab 3: Family Details (father, mother, parent mobile, address, emergency contact)
Tab 4: Transport (bus required, route, pickup point)
Tab 5: Documents Checklist (physical docs received — mark received/pending)
Tab 6: Fee & SmartPad (calculate fees, collect admission payment, assign SmartPad)

Consent: ☐ I confirm parental consent to enroll this student and process their data.
          [Enroll Student] — disabled until consent checked
```

On enrollment:

- NeuraID auto-generated: NID-{YEAR}-{STATE}-{SEQ}
- Aadhaar hashed client-side before transmission
- Duplicate check: if aadhaar_hash exists → show existing NeuraID + transfer option
- Parent SMS: "Your child {name} is enrolled. NeuraID: {id}. Download NeuraLife app: {link}"
- Consent record stored with timestamp

**Step 7 — Assign SmartPads**

```
For each enrolled student, assign a SmartPad:

[Assign SmartPads]
  Search student:   [Name or NeuraID]
  Assign PAD-ID:    [PAD-0043 ▼]  (from available fleet)
                    or [Enter PAD-ID manually]

  Or: bulk assign from last import
  → Match SmartPads to students by section (auto-suggest)
  → Manual confirmation required

Unassigned students: shown as list with [Assign] button each
SmartPad on first WiFi sync: downloads student profile + current grade content
```

**Step 8 — Go Live Check**

```
System pre-flight check:

  ✅ School profile complete
  ✅ Academic structure configured (10 classes, 28 sections)
  ✅ Holiday calendar set (218 working days)
  ✅ Fee structure configured (all classes)
  ⚠️  Teachers: 3 of 34 not yet activated (pending first login)
  ✅ Students enrolled: 487
  ⚠️  SmartPads: 12 students without assigned pad
  ✅ Timetable: configured for Classes 9 and 10
  ⚠️  Timetable: not yet set for Classes 1–8

Completion: 76%

[Go to Dashboard — 3 pending items will appear as setup alerts]
```

### Wizard Rules

- Each step validates before unlocking next
- Principal can return and edit any completed step at any time
- Progress shown as persistent banner until all 8 steps complete
- Estimated time: 45–60 minutes for a school of 500 students
- NeuraLife team member present during the visit to assist

---

## Module 2 — Dashboard (Principal Home Screen)

*The first screen the principal sees every morning. Scannable in under 3 seconds. Acts on real data.*

### School Health Score (Top of Dashboard)

```
┌───────────────────────────────────────────────────┐
│   Sri Vidya High School           September 2025  │
│                                                    │
│          School Health Score                      │
│                                                    │
│             ██████████████░░░░  78 / 100          │
│                                                    │
│   ▲ +4 points from last month                    │
│                                                    │
│   ✅ Attendance holding above 88%                 │
│   ✅ Secondary grade mastery improving            │
│   ⚠️  Middle grade engagement declining           │
│   ⚠️  Fee collection at 71% — below 80% target   │
│   ❌ 3 teachers: attendance not logged (2 weeks)  │
└───────────────────────────────────────────────────┘
```

Bands: Excellent (85–100) / Good (70–84) / Needs Attention (55–69) / Critical (<55)
Computed nightly by ML pipeline. Drives principal's morning priority list.

### KPI Strip

| Metric | Alert threshold |
| --- | --- |
| Total Students | — |
| Today's Attendance % | < 75% → warning |
| Active SmartPads (synced 24hr) | < 80% → warning |
| Calibrated Mastery Average | < 55% → alert |
| AT_RISK Students | Any → shown in red |
| Fee Collection Rate (this month) | < 70% → amber |

### Daily Priority Panel

```
Today's Priorities — Wednesday, 10 September 2025
───────────────────────────────────────────────────
🔴 REQUIRES ACTION (3)
   • Ravi Kumar (9-C) — AT_RISK 3 subjects, 11 days no intervention
   • Class 8-B attendance not marked — P. Rao (3rd time this month)
   • PAD-0031 offline 9 days — K. Anitha (8-A)

🟡 WATCH (4)
   • Class 7 mastery declining — Social Studies (3rd consecutive week)
   • Fee pending: 31 students, ₹93,000 outstanding > 30 days
   • S. Lakshmi — 6 absent days this month. Substitute needed?
   • OTA update: 12 devices not updated (87% fleet current)

✅ POSITIVE (2)
   • Class 10-A: Best attendance week of the year (98%)
   • K. Suresh students: +18 percentile avg in Mathematics this term
```

Every item tappable → opens relevant screen.

### Class Mastery Table

Sortable table: class-section, class teacher, student count, today's attendance, mastery %, status badge (Healthy >70% / Good 50–70% / Watch 35–50% / At Risk <35%). Click any row → class detail view.

---

## Module 3 — People Management

### 3.1 Student Management

**Student List View**

Searchable, filterable table:

- Filters: Class, Section, Mastery Level, Attendance Rate, SmartPad Status, Fee Status, Medium, Age Band, Category
- Columns: NeuraID, Name, Class-Section, Band, Mastery %, Attendance %, Pad Status, Fee Status

**Student Admission** — two paths as described in Wizard Step 6 (same form, accessible from People → Students → [+ Admit Student]).

**Student Profile (Principal View)**

Designed for one use case: the principal is sitting across from a parent and needs evidence-based data.

```
┌────────────────────────────────────────────────────────┐
│  Ravi Kumar          NID-2025-AP-084291                │
│  Class 10-A  |  English  |  PAD-0043  |  General cat. │
├────────────────────────────────────────────────────────┤
│  OVERVIEW  ATTENDANCE  MASTERY  WRITING  FEE  DOCS    │
├────────────────────────────────────────────────────────┤

Overview tab:
  Mastery:    72% overall  ↑ +8% this month
  Attendance: 91% this year
  SmartPad:   Synced today 8:23 AM  |  Battery: 74%
  Fee:        ✅ Paid up to September

  AI Insight (plain language, for parent meeting):
  "Ravi's Mathematics mastery improved from 52% to 71% this month.
   His biggest gap is sign errors in Algebra — 14 occurrences.
   Writing speed has increased 15% in the last 4 weeks.
   Physical Science needs attention — mastery declined to 58%."

Mastery tab:
  Subject-wise table: mastery %, trend, percentile, vs class avg

Attendance tab:
  Monthly calendar heatmap. Absence streak alert if active.

Writing tab:
  WSS-1 dimensions: clarity, speed, spelling, formation. Trend charts.

Fee tab:
  Full ledger: what is due, what is paid, when, by what mode.
  Receipt history. Outstanding balance.

Documents tab:
  Physical document checklist — received / pending.
  Aadhaar, TC, birth cert, caste cert, etc.
```

**Actions available from student profile:**

- Edit profile
- Transfer to another class / another NeuraLife school (NeuraID transfer flow)
- Deactivate / re-activate
- Reassign SmartPad
- Send SMS to parent
- Reset SmartPad PIN
- Request data deletion (DPDP)

### 3.2 Teacher Management

**Teacher List View**
All teachers: name, designation, subjects, assigned classes, last app login, status (Active / Inactive — no login 7+ days → flagged).

**Add New Teacher** — full form:

```
Tab 1: Personal Details
  Name *, DOB *, Gender *, Aadhaar * (hashed), PAN *, Mobile *, Email, Address

Tab 2: Qualifications
  Highest qualification *, Specialisation *, Institution, Year
  Teaching qualification: B.Ed / D.Ed / None

Tab 3: Employment
  Employee ID *, Designation *, Employment Type *, Joining Date *
  Subjects to teach *, Classes assigned *, Class Teacher of (section)
  Probation period, Reporting to

Tab 4: Salary Structure
  Basic Salary *, HRA (% or fixed), DA (% or fixed)
  Transport Allowance, Special Allowance
  Gross (auto-calculated)
  PF applicable? [ ] Yes [ ] No
  ESI applicable? [ ] Yes [ ] No  (auto: Yes if gross ≤ ₹21,000)
  Professional Tax: ₹200/month (AP/TS statutory, auto)
  TDS: auto-calculated
  Net Salary (auto-calculated)
  Bank Account *, IFSC *, Account Holder Name *

Tab 5: Documents Checklist
  [ ] Aadhaar Card     [ ] PAN Card       [ ] Educational Certificates
  [ ] B.Ed Certificate [ ] Experience Certs [ ] Bank Passbook
  [ ] Passport Photos  [ ] Relieving Letter [ ] Police Verification
```

**Teacher Profile View**

```
K. Suresh Kumar — PGT Mathematics — EMP-0042
────────────────────────────────────────────────
Personal | Employment | Salary | Performance | Leave | Docs

Performance tab:
  Classes: 9-A, 9-B, 10-B, 10-C
  Student mastery in Mathematics (his classes): 68% avg
  vs school average: 62% (+6%) ✅
  Mastery velocity: +3.2 percentile/month
  AT_RISK students: 7  |  Interventions logged: 5 (71%)
  Engagement: 4.2 sessions/student/week (school avg: 3.1) ✅

  AI Pattern Insight:
  "Students show above-average gains in Algebra and Geometry but
   consistently below-average in Trigonometry across all 4 classes.
   This is likely a curriculum sequencing issue, not a teaching gap.
   Recommend reviewing Chapter 8 pacing."

  Context flags: [None applicable]

Leave tab:
  CL: 12 entitled / 3 used / 9 remaining
  SL: 10 entitled / 1 used / 9 remaining
  EL: 8 entitled / 0 used / 8 remaining
  LOP: 0 days this year
  Pending applications: 0

Salary tab:
  Current structure | Last payslip | Salary history
```

**Actions:** Edit assignments, reset app credentials, log leave, generate payslip, deactivate.

### 3.3 Staff (Non-Teaching)

- Admin staff, support staff, IT staff
- Same salary structure and leave management as teachers
- No Teacher App access (Web Admin Console login only if needed)

---

## Module 4 — Academic Operations

### 4.1 Classes & Sections

Visual grid of all classes and sections. Click any section:

- Enrolled students list, class teacher, mastery average, today's attendance
- Add / remove / merge sections with student reassignment flow

### 4.2 Timetable Builder

```
Class 10-B — Weekly Timetable (visual grid editor)
         Mon      Tue      Wed      Thu      Fri      Sat
P1 9-10  [Math]   [Eng]    [Tel]    [Bio]    [Phys]   [SS]
P2 10-11 [Phys]   [Math]   [Eng]    [Math]   [Tel]    [Math]
...

Click any cell → subject picker + teacher picker
[Auto-fill from teacher schedule]
[Check for conflicts] → highlights double-booked teachers
[Save] → pushed to Teacher App and SmartPad in real-time
```

Special period types: Exam / Free Period / Assembly / Sports / Lab.
Conflict detection before saving (teacher double-booked → error).

### 4.3 Content Management

- View which content chapters are loaded on student SmartPads per class
- Push new content packages to all pads in a class or specific sections
- Chapter unlock schedule (e.g., Chapter 5 unlocks Oct 10)
- Content language per section (English or Telugu)

### 4.4 Attendance Overview

- Daily attendance: class-wise, student-wise (marked by teachers on mobile app)
- Principal sees in real-time via Supabase Realtime
- Monthly heatmap per student
- Auto-alert: 3+ consecutive absences → SMS to parent + dashboard alert
- "Attendance not marked" warning at 10 AM if teacher has not marked for the day
- Export: monthly attendance PDF per class

### 4.4.1 Attendance Analytics Page (`/attendance/analytics`)

Separate analytics page accessible from a "View Analytics" button on the Attendance page header.
Accessible to: PRINCIPAL, SCHOOL_ADMIN.

**API:** `GET /api/v1/attendance/analytics?range=day|week|month|quarter&date=YYYY-MM-DD`

**Features:**
- **Range selector:** Day / Week / Month / Quarter — changes data granularity
- **Date picker:** select reference date (defaults to today IST)
- **KPI strip (4 cards):** Present Rate %, Total Students, Present count, Absent count
- **Chart toggle:** Bar + Line chart (ComposedChart) OR Heatmap calendar view — user-switchable
  - Bar + Line: class-wise bars (day) or daily trend bars + present% line (week/month/quarter)
  - Heatmap: CSS grid calendar, cells colour-coded by present_pct (green ≥90%, amber 75–89%, red <75%)
- **Class breakdown table:** class-year, section, total, present, absent, late, present %, teacher who marked, time marked
  - In day view: present and absent counts are clickable — clicking filters the student list below
  - Multi-day view: aggregate totals; no per-teacher column
- **Student lists (day view only):** Absent / Present tabs with search
  - Grouped by class-section, sorted alphabetically within each group
  - Absent students show reason if provided
  - Clicking a class card's count pre-filters the list; filter dismissible
  - Multi-day ranges show a note to switch to Day view for individual lists

**Backend:**
- `AttendanceRepository.getSchoolAttendanceAnalytics()` — single method handling all ranges
- Day range: returns `absent_students[]` and `present_students[]` arrays
- Multi-day ranges: returns `trend[]` (daily `{date, total, present, absent, late, present_pct}`) + aggregate `classes[]`
- Late students count toward "present" for rate calculation (LATE ⊂ PRESENT)

### 4.5 Exam Management

- Enter exam schedule (FA1, FA2, SA1, SA2 dates)
- On exam day: SmartPad auto-enters Exam Mode at scheduled start time
    - Textbooks hidden, AI tutor disabled, only blank writing pages
- Mark entry: teachers enter marks per subject per student
- Instant comparison: marks vs predicted mastery range (from Cloud AI)
- Export: class-wise results PDF

---

## Module 5 — Learning Health & Analytics

### 5.1 School Health Score

Nightly-computed composite score (see Dashboard section above). Drill-down into each component for detail.

### 5.2 School-Wide Mastery Dashboard

- Subject-wise mastery heatmap across all classes
- Month-on-month trend per subject
- Weakest subject school-wide → principal calls teacher review meeting
- AT_RISK rate by class and by subject
- Cross-subject correlation alerts (e.g., "Students struggling in Maths also show Physics gaps")

### 5.3 Student Writing Skills Analytics

Edge AI WSS-1 output — shown to principal for parent meeting evidence:

| Dimension | What measured | Display |
| --- | --- | --- |
| Handwriting clarity | Legibility from stroke consistency | Score / 100, trend |
| Writing speed | Words per minute | WPM trend |
| Spelling accuracy | % correctly spelled words | % per subject, trend |
| Sentence formation | Grammar and structure quality | Developing / Proficient / Advanced |

Class-level summary table: all students, all four dimensions. Drill down to individual student. Trend over last 30/60/90 days. Flag students below threshold (possible learning difficulty).

### 5.4 Teacher Performance Intelligence

Principal view — each teacher's impact on student outcomes:

```
Teacher Intelligence Matrix — Mathematics Department
Teacher          Mastery Δ  Engagement  AT_RISK  Interventions  Velocity
─────────────────────────────────────────────────────────────────────────
K. Suresh Kumar    +11%     High          7       71% ✅         +3.2/mo
P. Venkat           +4%     Medium       12       42% ⚠️         +1.1/mo
R. Anand            -2%     Low ⚠️       18 ❌    23% ❌         -0.8/mo
S. Meena            +8%     High          5       80%           +2.9/mo
```

Context flags auto-applied: [REMEDIAL_CLASS] [NEW_TEACHER] [HIGH_ABSENTEEISM] [SUBSTITUTE_PERIOD] — prevent misreading data without context.

Curriculum Pattern Detector (weekly): distinguishes teaching gap vs curriculum gap. Surfaces as principal-level recommendation, not teacher accusation.

---

## Module 6 — Fee Management (v1 Full Build)

*Replaces Tally and school ERPs. More insightful, more automated, India-first.*

### 6.1 Fee Structure Configuration

Set once per academic year. See Wizard Step 5 for setup flow. Editable after wizard.

Fee heads per class per category: Admission, Development, Tuition, Exam, Transport, NeuraLife Subscription, SmartPad. Late fee amount and grace period configurable.

### 6.2 Fee Collection (Admin Counter Workflow)

```
[Collect Fee] button → opens collection screen

Search student: [NeuraID or Name or Admission No.]
  → Student found: Ravi Kumar, Class 10-B

Outstanding dues:
  Tuition Fee — July 2025            ₹2,500  OVERDUE 15 days
  NeuraLife Subscription — July      ₹  500  OVERDUE 15 days
  Late Fee                           ₹   50
  Tuition Fee — August 2025          ₹2,500  DUE Aug 1
  ─────────────────────────────────────────
  Total Outstanding                  ₹5,550

Amount collected: [         ]
Payment mode:     ( ) Cash  ( ) UPI  ( ) Cheque  ( ) NEFT
Reference:        [         ]   (UPI transaction ID / Cheque no.)
Date:             [Today ▼]

Concession?       ( ) Yes  Amount: [    ]  Reason: [              ]

[Generate Receipt]  → auto-numbered, printable PDF, sent to parent via app
```

### 6.3 Fee Receipt (PDF)

Auto-generated on each payment. School-branded with seal section, student details, fee heads itemised, payment mode, balance outstanding. Receipt number: RCP-{YEAR}-{SEQ}. Printable. Sent as in-app notification to parent.

### 6.4 Fee Intelligence Dashboard

```
Fee Collection Overview — August 2025

Total Billed:          ₹5,87,500
Collected:             ₹4,23,100  (72%)
Outstanding:           ₹1,64,400  (28%)

[████████████████████░░░░░░░░]  72% collected

Collection Trend (6 months):
  Mar  Apr  May  Jun  Jul  Aug
  91%  88%  93%  79%  74%  72%  ← declining ⚠️

Top Outstanding Classes:
  10-B: ₹42,000 (14 students)
  9-A:  ₹38,500 (11 students)

Students with 3+ months outstanding: 7  [View & Send Reminders]
NeuraLife subscriptions collected:   ₹94,000 this month

[Send Bulk Reminders]  [Export Excel]  [Print Report]
```

### 6.5 Automated Fee SMS Reminders

Triggered automatically — no manual action required:

```
3 days before due date:
"Dear Parent, {child_name}'s fee of ₹{amount} for {month}
 is due on {date}. Pay at school. Ref: {student_id}"

Day of due date:
"Reminder: {child_name}'s fee of ₹{amount} is due today."

5 days after due date:
"Dear Parent, {child_name}'s fee is overdue. Late fee of
 ₹50 applicable from {date}. Please contact school office."
```

All templates DLT-registered (TRAI compliance).

### 6.6 SmartPad Fee Tracking

At admission, SmartPad fee is collected or an EMI plan is set up:

- One-time upfront: recorded as single fee payment
- EMI plan (12 months): ₹{amount}/month added to monthly fee ledger, tracked per installment
- SmartPad assignment blocked until SmartPad fee confirmed paid or EMI plan activated

---

## Module 7 — Salary & HR Management (v1: Structure + Payslip)

### 7.1 Staff Salary Overview

```
Staff Salary Overview — August 2025

Total Staff: 34
Total Monthly Gross:  ₹9,24,500
Total Monthly Net:    ₹8,41,320
(after PF, ESI, PT, TDS)

Payroll status: August not run  →  [View Salary Records]
```

### 7.2 Individual Salary Record

Per-teacher view: earnings breakdown (basic, HRA, DA, transport, special), deductions (PF, ESI, PT, TDS), gross, net, bank details.

### 7.3 Payslip Generation (v1)

```
[Generate Payslip] per teacher → PDF generated

Payslip includes:
  School header with logo
  Month, teacher name, designation, employee ID, PAN (masked)
  Earnings table: all components
  Deductions table: PF, ESI, PT, TDS
  Gross → Total Deductions → Net Salary
  Amount in words
  Bank account (masked): XXXX5678
  "Computer generated payslip" footer

[Download PDF]  [Send via Email]  [WhatsApp]
```

### 7.4 Leave Management

**Leave balance tracking per teacher:**

| Leave Type | Entitled | Used | Balance |
| --- | --- | --- | --- |
| Casual Leave (CL) | 12 | 3 | 9 |
| Sick Leave (SL) | 10 | 1 | 9 |
| Earned Leave (EL) | 8 | 0 | 8 |
| Loss of Pay (LOP) | — | 0 | — |

**Leave application workflow:**

- Teacher submits from Teacher App (type, dates, reason)
- Principal approves/rejects in Web Admin Console
- Approved → balance deducted automatically
- LOP auto-triggered when all leaves of a type exhausted
- LOP days flagged for salary deduction in payroll

### 7.5 v2 Full Payroll Processing (Documented for Build)

Monthly payroll run (7 steps):

1. Pre-payroll validation (missing attendance, pending leave, mid-month joinings, salary revisions)
2. Payroll calculation engine (earned days, all deductions)
3. Payroll preview table (all 34 staff, approve or edit)
4. Principal approval (locks payroll — no changes after)
5. Payslips auto-generated for all staff
6. NEFT bulk payment file export (CSV for bank upload)
7. Statutory exports: PF ECR, ESI challan, PT challan, TDS data for quarterly 24Q filing

Annual: Form 16 generated for all staff after March payroll.

---

## Module 8 — SmartPad Fleet Management

*Device-level visibility no competitor can match — because NeuraLife owns the software layer.*

### Fleet Overview

- Total pads: registered / active (synced 24hr) / stale (1–3 days) / offline (3+ days)
- Battery health: count below 20%
- OTA update rollout: % fleet on latest AI model version
- Storage alerts: count below 500 MB

### Per-Device Detail

| Field | Description |
| --- | --- |
| PAD-ID | Physical device identifier |
| Assigned student | NeuraID + name + class |
| Battery | Current % + charging status |
| Last sync | Timestamp + MB transferred |
| Model versions | HWR-1, GAP-1, WSS-1, SHE-1 current versions |
| Storage | Used / Total |
| Status | Active / Stale / Offline / Locked / Lost |
| Last known location | GPS coordinates on map |

### SmartPad Location Tracking

- GPS logged every 30 minutes, transmitted on next sync
- Location active in low-power mode even when screen off
- Principal sees last known location on Leaflet.js + OpenStreetMap view
- Loss flow: register loss report → continuous 1-minute GPS tracking activated → SmartPad remotely locked → screen shows "This device is registered as lost. Contact [School Name]." → all academic data encrypted, inaccessible → once retrieved, principal unlocks remotely

### Exam Lock Mode

- Principal sets exam date and time window in Academic Calendar
- At exam start: all pads auto-switch to Exam Mode (textbooks hidden, AI tutor off, blank writing pages only, WiFi sync off)
- Auto-ends at scheduled time. Manual override available per device.

### Fleet Actions

| Action | Description |
| --- | --- |
| OTA Update | Push AI model update to all or selected pads (schedule overnight) |
| Remote Lock / Unlock | Theft, discipline, exam |
| Remote Wipe | Confirmed stolen devices only — wipes all local data |
| Push Content | Send content package to class or individual devices |
| Dropout Risk View | All pads inactive 3+ days, sorted by days inactive, one-click parent SMS |

---

## Module 9 — Alert & Escalation System

### Alert Types

| Alert | Trigger | Severity | Escalation |
| --- | --- | --- | --- |
| AT_RISK Student — No Intervention | AT_RISK + no intervention logged 48hr | S1 | FCM → Principal + SMS parent |
| SmartPad Inactive — Dropout Risk | Pad offline 3+ days | S2 | Dashboard → T+24h: teacher notified |
| Consecutive Absences (3 days) | Student absent 3 school days in a row | S1 | SMS to parent immediately |
| Attendance Not Marked (10 AM) | Teacher hasn't marked by 10 AM | S2 | FCM to teacher |
| Class Mastery Drop | Class drops below 40% calibrated | S2 | Dashboard → 7 days: suggest review meeting |
| Fee Overdue | Fee unpaid past due date | S3 | SMS to parent (automated) |
| Teacher Inactive | Teacher no app login 3+ days | S2 | Dashboard alert |
| Sync Queue Failure | 10+ failed syncs on a device | S1 | FCM + email to principal |
| OTA Update Failed | Checksum fail on device install | S2 | In-app + email |
| Storage Critical | Device < 500 MB free | S2 | In-app |

**Principal inaction escalation (AT_RISK):**
If AT_RISK alert is unacknowledged after 48 hours → principal receives: "Ravi Kumar has been AT_RISK in Mathematics for 48 hours with no intervention logged. Please follow up with K. Suresh Kumar."

---

## Module 10 — Announcements & Communications

- Compose rich-text announcements
- Target: All school / Specific classes / Teachers only / Parents only / Individual parent
- Delivery: In-app notification + SMS fallback for parents without app
- Schedule for future delivery
- Delivery status: Sent / Delivered / Read counts
- Read receipts on open
- Templates: School holiday, Exam reminder, Fee due, Parent-teacher meeting, Results day

---

## Module 11 — Reports & Exports

| Report | Format | When available |
| --- | --- | --- |
| Monthly attendance (class-wise) | PDF | Any time |
| Term academic results | PDF | After marks entry complete |
| Fee collection summary | Excel + PDF | Any time |
| Salary summary | PDF | Monthly |
| School Health Score history | PDF | Any time |
| Student 360° profile (for parent meeting) | PDF | Any time per student |
| Annual outcome report | PDF | End of academic year |

All reports are school-branded with principal signature block.

---

## Data Privacy & NeuraID Ownership

**Data ownership:** The student (via parent/guardian) owns learning data. NeuraLife is the data processor.

**At enrollment:** Parent consent form (digital checkbox in wizard). Records: who consented, when, which version, IP hash.

**School exit scenario:**

1. School admin access deactivated
2. Parent SMS: "Your school has exited NeuraLife. Your child's data (NeuraID: {id}) will be retained securely for 2 years. Request export or deletion at neuralife.in/data."
3. Parents who consent to retention: NeuraID active, data transfers to next NeuraLife school seamlessly
4. Parents who request deletion: full cascade deletion within 30 days, confirmation sent
5. NeuraLife retains only anonymised aggregate data (population statistics — no individual link)

**Security:**

- All data encrypted at rest (AES-256) and in transit (TLS 1.3)
- Supabase hosted in Mumbai region (ap-south-1) — DPDP Act data localisation
- Aadhaar hashed client-side — raw number never reaches NeuraLife servers
- RLS enforced at database layer — school data never accessible by other schools

---

## SmartPad Demo Strategy (v1)

For the v1 demo, the SmartPad hardware is a **stock Android tablet running the NeuraLife Kiosk App** — not a full AOSP build. This delivers 80% of the demo impact at 10% of the build effort.

**What the kiosk app does:**

- Runs in kiosk mode (Android pinning) — student cannot exit to other apps
- Student logs in with NeuraID + PIN
- Opens content chapters (SVG + animated, from downloaded .nlc bundles)
- Captures stylus strokes — runs HWR-1 (ML Kit base) + basic GAP-1
- Packages session delta, uploads to cloud on WiFi
- Cloud AI generates insight → parent sees it in app → principal sees it in dashboard

**What it proves in the demo:**

1. The data pipeline works end-to-end (real strokes → real insight → real dashboard)
2. The dashboard shows live, real student data — not simulated
3. The concept is proven on hardware you can hand the principal to hold

**Recommended demo hardware:** Any 10-inch Android tablet (Lenovo Tab M10, Samsung Tab A8, Realme Pad) — ₹8,000–12,000. Stylus support preferred.

**Hardware upgrade path:** When India OEM SmartPad (v2) is ready, the kiosk app is replaced by NeuraOS — same API, same dashboard, zero backend changes.

---

## Tech Stack

```yaml
Frontend:
  Framework:        React 18 + TypeScript + Vite
  UI Library:       Tailwind CSS + shadcn/ui
  State Management: Zustand
  Data Fetching:    TanStack Query (React Query)
  Real-time:        Supabase Realtime (WebSocket — no Socket.io needed)
  Charts:           Recharts
  Maps (fleet):     Leaflet.js + OpenStreetMap (free, no Google Maps cost)
  PDF Generation:   react-pdf / jsPDF (receipts, payslips, reports)
  Auth:             JWT RS256 + refresh token rotation

Backend:
  Runtime:          Node.js 20 + TypeScript + Fastify
  Database:         PostgreSQL 15 via Supabase
  Auth:             Supabase Auth (GoTrue) — OTP via MSG91
  Cache:            v1: none (Supabase handles caching)
                    v2: Redis via Upstash (session, rate limiting, queue)
  File Storage:     Supabase Storage (CSV imports, PDF reports, content)
  SMS:              MSG91 (DLT-registered, India gateway)
  Email:            Resend.com
  Push:             Firebase Cloud Messaging
  Real-time:        Supabase Realtime (replaces Socket.io entirely)
  Job Scheduler:    node-cron (v1) → BullMQ + Redis (v2)

SmartPad Kiosk App:
  Protocol:         HTTPS REST (sync), Supabase Realtime (timetable push)
  Sync:             Every WiFi connect — auto-flush SQLite queue
  OTA:              GET /ota/check on WiFi connect → download + atomic replace

Deployment:
  Web Console:      Vercel (zero-ops, global CDN)
  API Gateway:      Railway (auto-deploy on push)
  ML Microservice:  Railway (Python + FastAPI)
  Database:         Supabase Pro (ap-south-1 Mumbai region)
  Domain:           admin.neuralife.in
```

---

## User Roles & Permissions

| Role | Access | Notes |
| --- | --- | --- |
| NeuraLife Super Admin | Full system — all schools | Platform operator. Used during school onboarding visits. |
| Principal | Full — their school only | Cannot access other schools' data (RLS enforced) |
| School Admin | People + Fee + Attendance | Designated admin staff — no financial analytics |
| Vice Principal (v2) | Read-only + limited edits | No billing, no device wipe |
| School IT Admin (v2) | Fleet management only | No academic or financial data |

---

## Data Models

### School

```json
{
  "school_id": "SCH-AP-00142",
  "name": "Vikas High School",
  "udise_code": "28120100201",
  "district": "Guntur",
  "mandal": "Guntur Urban",
  "state": "AP",
  "board": "AP_STATE",
  "medium": ["ENGLISH", "TELUGU"],
  "type": "PRIVATE",
  "recognition_status": "RECOGNISED",
  "establishment_year": 2005,
  "principal_id": "USR-00891",
  "subscription_tier": "GROWTH",
  "subscription_start": "2025-06-01",
  "subscription_expires": "2026-05-31",
  "neura_community_registered": true,
  "onboarding_step_completed": 8,
  "created_at": "2025-06-01T09:00:00Z"
}
```

### Student (Admin View)

```json
{
  "neura_id": "NID-2025-AP-084291",
  "admission_number": "ADM-2025-0487",
  "school_id": "SCH-AP-00142",
  "name": "Ravi Kumar",
  "dob": "2012-04-14",
  "class_year": 10,
  "section": "A",
  "band": "SECONDARY",
  "medium": "ENGLISH",
  "category": "GENERAL",
  "father_name": "Venkat Kumar",
  "parent_mobile": "+91-9876543210",
  "smartpad_id": "PAD-0042",
  "status": "ACTIVE",
  "data_consent_given": true,
  "consent_version": "1.0",
  "data_retain_on_school_exit": true,
  "enrolled_at": "2025-06-10T10:00:00Z",
  "transfer_history": []
}
```

### SmartPad Device

```json
{
  "pad_id": "PAD-0042",
  "serial_number": "NLP24080042",
  "school_id": "SCH-AP-00142",
  "assigned_neura_id": "NID-2025-AP-084291",
  "os_version": "NeuraKiosk-1.2.4",
  "model_versions": {
    "HWR-1": "1.3.1",
    "GAP-1": "1.1.4",
    "WSS-1": "1.0.2",
    "SHE-1": "1.0.1"
  },
  "battery_level": 88,
  "is_charging": false,
  "last_sync_at": "2025-09-01T08:14:00Z",
  "last_known_location": {
    "lat": 16.3067,
    "lng": 80.4365,
    "timestamp": "2025-09-01T08:00:00Z"
  },
  "storage_used_mb": 4200,
  "storage_total_mb": 32768,
  "status": "ACTIVE",
  "locked": false,
  "loss_reported": false,
  "exam_lock_active": false
}
```

---

## Demo Walkthrough (School Visit Script)

Use this sequence during the 90-minute school demo. Dashboard section: 30 minutes.

| Step | What to show | What it proves |
| --- | --- | --- |
| 1 | Open dashboard — School Health Score + Priority Panel | "You walk in every morning knowing exactly what needs your attention" |
| 2 | AT_RISK students card → click → student profile | "This student was flagged 3 days after their mastery dropped. Not at exam time." |
| 3 | Student profile → AI insight paragraph | "This is what you read to the parent in a meeting. Evidence, not opinion." |
| 4 | Class mastery table → drill into 10-B → error patterns | "52% of your class has the same gap. This is a teaching opportunity, not 52 individual problems." |
| 5 | Teacher performance matrix | "Your best teacher's students improved 11% more than the school average this term." |
| 6 | Fleet panel → PAD-0031 offline 9 days | "You knew before his teacher did. You knew before he failed the exam." |
| 7 | Fee dashboard → collection trend declining | "Your collection rate dropped 6% over 4 months. Here's which classes." |
| 8 | Admit a student → full form → receipt generated | "Your admin does this instead of paper forms and Tally entries." |
| 9 | Onboarding wizard → show it's 8 steps | "This is how your school goes live. One visit. 60 minutes." |

---

## Confirmed Decisions

| Decision | Rationale |
| --- | --- |
| Fee management in v1 full build | Replaces ERP. Makes NeuraLife stickier. Principal sees direct ROI. Fee + learning in one platform is the pitch. |
| Salary structure + payslip in v1 | Demo-ready feature that impresses school management. Full payroll (NEFT, PF/ESI) in v2. |
| Bulk CSV import in v1 | June enrollment surge needs it. Manual form for mid-year. Both available. |
| No Socket.io — Supabase Realtime only | Eliminates additional WebSocket infrastructure in v1. Supabase Realtime handles all real-time needs. |
| Fastify not Express | Locked. Fastify is 2× faster than Express. TypeScript-first. |
| Redis in v2 not v1 | Adds operational complexity. Supabase handles caching adequately for v1 scale. |
| Leaflet.js + OpenStreetMap for maps | Zero cost. No Google Maps billing. Sufficient for fleet tracking use case. |
| UDISE code verification at registration | Validates school legitimacy before onboarding. One API call, non-negotiable. |
| Principal sees teacher performance with context flags | Without context (remedial class, new teacher, leave period), metrics mislead. Context flags prevent misuse. |
| Telugu UI for Web Admin Console: v2 | English dashboard for v1 — principal can manage. Telugu UI broadens adoption but adds development time. Prioritise Telugu in Parent App and Teacher App first. |

## Open Questions Resolved

| Question | Resolution |
| --- | --- |
| Writing skills: aggregated or raw? | Aggregated by default. Raw session data available on drill-down. Confirmed. |
| Fee management: in-house or integrate with ERP? | In-house, full v1 build. Integration creates dependency. In-house creates stickiness and differentiation. |
| Demo tablet model? | Any 10-inch Android tablet, ₹8,000–12,000. Lenovo Tab M10 or Samsung Tab A8 recommended. Stylus support preferred. |
| Telugu UI for principal dashboard in v1? | English only for v1 Web Admin Console. Telugu in v2. Teacher App and Parent App Telugu in v1. |
| Raw writing data retention? | 90 days raw stroke logs. Aggregated scores (WSS-1 output) retained permanently (no individual stroke link). |

---

*Next update: **Edge AI Engine — three HWR-1 variants***