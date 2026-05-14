# NeuraLife — Teacher Mobile App

*The daily operational interface for teachers across two roles — Subject Teacher and Class Teacher — covering scheduling, attendance, homework, performance tracking, student monitoring, parent meeting support, and teacher performance intelligence; offline-first, role-aware, and deeply integrated with the Web Admin Console, Parent & Student App, and SmartPad.*

---

## Purpose & Scope

The Teacher Mobile App is the highest-frequency interface in NeuraLife. A teacher opens it multiple times every school day. It must be:

- **Instant:** Critical actions reachable in 2 taps from home
- **Offline-first:** Core functions work without internet
- **Role-aware:** UI adapts based on whether the teacher holds a Subject Teacher role, Class Teacher role, or both simultaneously
- **Audit-safe:** Every action is timestamped, device-stamped, and teacher-credential-stamped

**Separate from the Parent & Student App.** The Teacher App is a separate APK installed on the teacher's own personal Android phone. The Parent & Student App (one app, two logins) is installed on the parent's phone. Teachers never share an app with parents or students.

> **Design principle:** The app does the analysis. The teacher acts on it. No raw data interpretation required.

---

## Role Architecture

### Two Roles, One App

A teacher in an Indian school can hold one or both of the following roles. The Web Admin assigns roles per teacher. The app detects the role set at login and renders accordingly.

| Capability | Subject Teacher | Class Teacher |
|---|---|---|
| View own daily schedule | ✅ | ✅ |
| Mark attendance (any assigned class) | ✅ | ✅ |
| Assign homework (own subject classes) | ✅ | ✅ |
| Track syllabus coverage (own subject) | ✅ | ✅ |
| Enter unit test / class test marks | ✅ | ✅ |
| Record oral participation scores | ✅ | ✅ |
| View student mastery — own subject | ✅ | ✅ |
| View writing skills — own subject (v2) | ✅ | ✅ |
| Resolve student doubts from SmartPad | ✅ | ✅ |
| Push resources to class SmartPads | ✅ | ✅ |
| Substitute teacher view | ✅ | ✅ |
| View own performance analytics | ✅ | ✅ |
| View all-subject mastery per student | ❌ | ✅ |
| Full 360° student profile | ❌ | ✅ |
| Behaviour and discipline log | ❌ | ✅ |
| Parent-Teacher Meeting (PTM) mode | ❌ | ✅ |
| Leave application approval | ❌ | ✅ |
| Student promotion readiness review | ❌ | ✅ |
| Cross-subject gap identification | ❌ | ✅ |
| Class-wide alert management | ❌ | ✅ |

### Simultaneous Role Handling

A teacher can hold both roles simultaneously. Example: S. Lakshmi is Class Teacher of 10-A AND Subject Teacher for English in 9-B and 8-C.

- Her home screen shows a unified chronological timeline across all classes
- Her bottom navigation includes the "My Class" tab (Class Teacher features) that subject-only teachers do not see
- When viewing a student from Class 10-A: she sees the full 360° profile
- When viewing a student from 9-B or 8-C: she sees only her subject's data for that student

---

## Platform & Tech Stack

```yaml
Framework:        React Native 0.74 (Android-first v1, iOS in v2)
State Management: Zustand
Offline Storage:  WatermelonDB (high-performance SQLite for React Native)
Data Fetching:    TanStack Query with offline persistence layer
Real-time:        Supabase Realtime WebSocket
  - Timetable changes pushed instantly
  - Attendance sync on submit
  - Homework acknowledgement from SmartPad
  - Alert escalations from principal
  - New NeuraSphere doubt posts (v2)
Push:             Firebase Cloud Messaging
SMS Fallback:     MSG91 (for parent communication when Parent & Student App not installed)

Auth:
  First login:       OTP to teacher's registered mobile number
  Subsequent:        Biometric (fingerprint / face ID) + PIN fallback
  JWT:               24-hour expiry + 30-day refresh token (rotating)
  Attendance:        Every submission additionally signed with teacher credential hash

Charts:     Victory Native
Deployment: APK sideload (v1 demo) → Play Store (v2)
```

---

## Data Flow — Inter-App Connections

Every action in the Teacher App propagates to other interfaces:

| Teacher Action | → Web Admin | → Parent & Student App | → SmartPad | → Cloud AI |
|---|---|---|---|---|
| Submit attendance | ✅ Real-time | ✅ Push notification to parent | ✅ Syncs status | ❌ |
| Assign homework | ✅ Logged | ✅ Push + due task to parent | ✅ Appears as pending task | ❌ |
| Enter exam / test marks | ✅ Updates reports | ✅ Marks visible to parent | ❌ | ✅ Feeds mastery model |
| Record oral participation | ✅ Logged | ❌ | ❌ | ✅ Feeds engagement model |
| Resolve student doubt | ❌ | ❌ | ✅ Answer pushed to SmartPad | ❌ |
| Push resource to class | ✅ Logged | ✅ Notification to parent | ✅ File downloaded on sync | ❌ |
| Log behaviour incident | ✅ Principal sees | ❌ | ❌ | ❌ |
| Approve leave application | ✅ Attendance updated | ✅ Confirmation to parent | ❌ | ❌ |
| Mark syllabus topic covered | ✅ Coverage % updated | ❌ | ❌ | ✅ Informs content engine |
| Override AI mastery assessment | ✅ Logged | ❌ | ❌ | ✅ Training signal for GAP-1 |

---

## Screen Architecture

### Bottom Navigation — Subject Teacher

```
[ Home ] [ Schedule ] [ Classes ] [ Doubts ] [ Profile ]
```

### Bottom Navigation — Class Teacher (both roles)

```
[ Home ] [ Schedule ] [ Classes ] [ My Class ] [ Doubts ]
```

"My Class" tab is only visible when Class Teacher role is active. A teacher with both roles sees all five tabs.

---

## Module 1 — Home Screen

*The daily starting point. Fully actionable in under 10 seconds. Works offline from cache.*

### Header

- Teacher name + school name
- Role badge(s): "Subject Teacher" and/or "Class Teacher · 10-A"
- Date and current time
- Sync status indicator: "Synced 2 min ago" / "3 records pending sync" (amber)

### KPI Strip (role-aware)

**Subject Teacher KPIs:**

| Metric | Source | Alert |
|---|---|---|
| Periods today | Own timetable | — |
| Homework due today | Assignments with today's due date | Amber if completion < 60% |
| Doubts pending | Unresolved SmartPad doubt queue | Red if > 5 |
| AT_RISK in my subjects | Students < AT_RISK threshold in teacher's subject | Red if > 0 |

**Additional KPIs for Class Teacher:**

| Metric | Source | Alert |
|---|---|---|
| Present today (my class) | Attendance for assigned class | Red if < 75% |
| Absent today (my class) | Absence count | Amber if > 3 |
| Leave requests pending | Parent-submitted applications | Amber if > 0 |
| Alerts for my class | Escalated from principal | Red if any S1 severity |

### Today's Schedule Block

- Unified chronological timeline of all periods for the day
- Each period card shows:
  - Time slot, subject, class-section, room number, student count
  - Status: Upcoming / Now (highlighted) / Covered / Substitute
- Current period auto-highlighted with elapsed time bar
- "Substitute" badge shown if covering for an absent colleague
- Tapping any period card opens that class's action view

### Alert Feed

Only alerts relevant to this teacher's students and subjects.

Sources:
- Principal-escalated alerts (48-hour AT_RISK rule triggered with no intervention logged)
- AI-flagged mastery drops in teacher's subjects (> 10% in one week)
- Homework completion below 60% on due date
- Student absence streaks (class teacher only — 3+ consecutive absences)
- Doubt queue overflow (> 10 unresolved)
- Curriculum pattern detected in teacher's subject (Weekly ML pipeline — v2)

Each alert has a one-tap primary action button.

---

## Module 2 — Attendance

*Any teacher can mark attendance for any assigned class. Every submission is digitally signed and immutable.*

### Who Can Mark Attendance

- Any teacher assigned to that class in that period (per timetable)
- Any teacher assigned as substitute for that period
- The system does not restrict which teacher marks — it records and signs whoever does

### Digital Signature on Every Submission

Every attendance submission permanently stamped:

```json
{
  "submitted_by_teacher_id": "TCH-00142",
  "submitted_by_name": "K. Ramesh",
  "submitted_at": "2025-09-01T08:07:43Z",
  "device_id": "DEVICE-Android-RM2023-884",
  "signature_hash": "sha256(teacher_id + class_id + date + period_slot + timestamp)",
  "submission_type": "ORIGINAL"
}
```

Legally defensible audit trail. Principal views signing teacher for every attendance record in Web Admin.

### Attendance Marking Flow

1. Teacher taps the period card on home screen
2. Student list loads from local cache (fully offline)
3. **Default: all students marked Present** (optimistic — reduces tap count in a 42-student class)
4. Teacher taps any student avatar to toggle: Present → Absent → Late
5. For Absent or Late: optional reason prompt ("No reason / Medical / Family / Other")
6. Running count shown: "38 Present · 3 Absent · 1 Late · 0 Unmarked"
7. Submit button activates only when all students accounted for
8. On Submit: digitally signed, queued if offline, synced on connect
9. On sync:
   - Web Admin dashboard: real-time update
   - Parent & Student App: push notification to parent — "Ravi Kumar marked Present at Vikas High School"
   - SmartPad: attendance status shown on student's home screen

### Late Arrival Correction

If student marked Absent in first period but arrives late later:
- Any teacher opens student's attendance for the day → mark "Late Arrival" with note + actual time
- Creates a **correction record** — does NOT overwrite the original
- Both records preserved in audit log
- Web Admin shows: "Marked Absent by K. Ramesh 8:05 AM → Corrected to Late by S. Lakshmi 9:15 AM"
- Parent & Student App notification: "Ravi Kumar's attendance updated to Late Arrival at 9:15 AM"

### Substitute Teacher View

When assigned as substitute in Web Admin:
- "Covering for K. Ramesh" banner on period card
- Read-only view of K. Ramesh's syllabus plan for that period
- Can mark attendance (signed as substitute)
- Can push a resource — cannot modify K. Ramesh's homework assignments

---

## Module 3 — Schedule & Syllabus Tracker

### Schedule View

Full week's timetable for the logged-in teacher across all assigned classes. Default: today. Toggle to see Mon–Sat.

Each period card (expanded) shows:
- Time, subject, class-section, room
- **Syllabus topic due today** (from annual plan set in Web Admin)
- Previous period's coverage status
- Student count + attendance status (if marked)
- Quick actions: Mark attendance / Assign homework / Push resource

### Syllabus Coverage Tracker

Principal sets the annual syllabus plan per subject per class in Web Admin. Teacher sees this plan mapped to each period.

After each class, teacher marks the period as:
- ✅ **Covered** — topic completed as planned
- ⏩ **Partially covered** — specify percentage ("50% — continuing next class")
- ⏭️ **Postponed** — topic moved, requires reason

Syllabus coverage feeds:
- Web Admin: Principal sees coverage % vs plan. If > 2 weeks behind: alert raised
- Cloud AI Content Engine: Only recommends practice from covered topics
- Parent & Student App: "Chapter 4 completed ✅ · Chapter 5 in progress" visible to parent

---

## Module 4 — Homework Assignment

### Creating a Homework Assignment

1. Teacher taps "Assign Homework" from period card or Classes tab
2. Fields:
   - Class-section (pre-filled from context, overridable)
   - Subject (pre-filled from period)
   - Title, instructions (typed or voice-to-text)
   - Type: Written / Problem Set / Reading / Drawing / Project
   - Due date (default: next school day)
   - Reference material: link to content chapter or attach PDF/image
   - **Differentiated variant toggle** (see below)
3. Preview screen before publishing
4. Publish: pushed to all student SmartPads in that class-section and to Parent & Student App

### Differentiated Homework

**v1:** Teacher writes both versions manually (standard + simplified). Toggle shows two text fields side by side. Teacher submits both. System delivers appropriate version to each student based on mastery classification.

**v2:** When teacher enables "Differentiated variant" toggle:
- Cloud AI identifies AT_RISK students (below threshold in that subject)
- AI generates a simplified version (fewer problems, simpler language, broken into steps)
- Teacher reviews both versions side by side, can edit before publishing
- AT_RISK students receive differentiated version automatically — no manual sorting
- Parent & Student App shows assignment with no indication of which variant received (avoids stigma)

### Homework Tracking

After due date, teacher sees per assignment:
- Submitted on time: count and percentage
- Submitted late: count
- Not submitted: list of students — one-tap parent reminder
- SmartPad: persistent card on student home screen until submitted; overdue = red badge

---

## Module 5 — Class Performance & Marks

### Performance Score Composition

| Data source | What it measures | Weight |
|---|---|---|
| SmartPad mastery score | Topic understanding from Edge AI | 30% |
| Oral participation | Teacher-entered engagement rating | 20% |
| Unit tests / class tests | Teacher-entered marks (informal) | 25% |
| Main exams (mid-term, final) | Teacher-entered marks (formal) | 25% |

### Class Performance View

Per assigned class, teacher sees:

**Subject Mastery Bar:** Overall mastery % + 30-day trend

**Student Performance Table:**

| Student | SmartPad | Homework | Test Avg | Exam Avg | Overall | Trend |
|---|---|---|---|---|---|---|
| Ravi Kumar | 82% | 95% | 78% | 81% | 84% | ↑ |
| Arun Reddy | 31% | 40% | 35% | 28% | 33% | ↓ AT_RISK |

Sortable by any column. Tap any student → subject-specific detail view.

**Topic Gap Analysis:** Weakest topics across the class, pulled from SmartPad GAP-1 error patterns. Shows exactly what to re-teach and which error types are most common.

### AI Mastery Override

When a teacher disagrees with an AI-generated mastery assessment:

- Tap "Override" on any student's mastery score
- Select reason: "Student got lucky / External tutoring / One-off illness / Disagree with AI assessment"
- Adjusted mastery used for that student
- Override logged as a training signal for GAP-1 quarterly retraining
- Override visible to principal in Web Admin (teacher accountability)

### Unit Test / Class Test Marks Entry

1. Tap "Enter Test Marks" from class view
2. Fields: test name, date, max marks, subject, class-section
3. Student list with marks input field per student
4. Marks auto-calculate percentage, update performance aggregate
5. Teacher marks "Absent" for students who missed test
6. On save: marks visible to parent in Parent & Student App, feed into Cloud AI mastery model

### Oral Participation Score

- Quick-access on period card: "Record Participation"
- Student list with 1–5 star tap rating per student
- Optional note: "Answered correctly" / "Confused on topic" / "Disruptive"
- Speed: teacher rates 42 students in 2 minutes
- Monthly aggregate: identifies engaged vs passive students
- Visible to class teacher in 360° profile

### Student Doubt Queue

Students on SmartPad flag paragraphs, problems, or pages with "I don't understand." These queue per subject per teacher.

**In the Doubts tab, teacher sees:**
- Sorted by class, then by frequency (5+ students flagging same thing = "Common doubt" at top)
- Each doubt: student name, class, subject, chapter/topic, flagged text snippet

**Teacher actions:**
- **Answer in-app:** Type response → pushed to student's SmartPad as notification
- **Mark for class discussion:** Appears on teacher's period card as "Pre-class alert"
- **Resolve:** Mark resolved (no action needed)

Common doubts (5+ students, same class) auto-appear on teacher's period card as a "Pre-class alert" — teacher prepared before entering the classroom.

**v2 addition:** NeuraSphere doubt posts from the teacher's students also appear in the doubt queue (tagged separately as "NeuraSphere doubt"). Teacher can respond in-app or direct the student to their SmartPad answer.

---

## Module 6 — Resource Sharing

*Teacher pushes study material directly to student SmartPads — replacing WhatsApp study groups.*

### Uploading a Resource

1. Select class(es) to push to
2. Upload: PDF, image (diagram, chart), or typed reference notes
3. Tag: subject + chapter
4. Publish — file queued for download on all student SmartPads in next sync
5. Parent & Student App notification: "Your teacher shared new study material for Mathematics"

### Resource Library

- All previously pushed resources stored in searchable library
- Teacher can re-push any resource to a new class
- Principal sees what resources each teacher has shared (Web Admin)

---

## Module 7 — Class Teacher: My Class Tab

*Exclusive to teachers with the Class Teacher role. Full 360° monitoring of the assigned class.*

### My Class Home

Overview of the class teacher's assigned class (e.g., Class 10-A):
- Today's attendance: present / absent / late / approved leave
- All-subject mastery average for the class
- Students needing attention (sorted by most critical): AT_RISK mastery, long absence, pending leave
- Behaviour incidents this week
- Upcoming: exams, PTM, school events

### Student 360° Profile (Class Teacher View)

The most important screen in the app — designed for the parent-teacher meeting conversation.

**Identity Block:**
- Name, DOB, class, section, NeuraID
- Parent name and mobile (tap to call or message within app)
- SmartPad: assigned PAD-ID, last sync, active days this week, battery level

**Attendance Summary:**
- Monthly attendance rate + calendar heatmap (green/red/amber/blue)
- Consecutive absence streak (if active)
- Total approved leave days this term

**All-Subject Mastery Table:**

| Subject | Teacher | Mastery % | Percentile | Trend | Last Active |
|---|---|---|---|---|---|
| Mathematics | K. Ramesh | 82% | 78th | ↑ | Today |
| Science | P. Venkat | 67% | 61st | → | Yesterday |
| English | S. Lakshmi | 74% | 65th | ↑ | Today |
| Telugu | M. Devi | 38% | 22nd | ↓ | 4 days ago |
| Social Studies | R. Prasad | 59% | 47th | → | 2 days ago |

**Writing Skills Block (v2 — WSS-1 required):**

| Dimension | Score | Trend |
|---|---|---|
| Handwriting clarity | 74 / 100 | ↑ |
| Writing speed | 18 wpm | → |
| Spelling accuracy | 81% | ↑ |
| Sentence formation | Proficient | → |

In v1: writing skills block shows "Writing skills available after 30 days of SmartPad usage" — data populates when WSS-1 (v2 model) is deployed.

**Study Habit Block (v2 — SHE-1 required):**

| Signal | Value | Notes |
|---|---|---|
| Focus score (this week) | 0.74 | Good |
| Typical study time | 7:00 PM | Consistent ✅ |
| Start time consistency | High | < 30 min variation daily |
| Active days this week | 5 of 5 | — |
| Distraction flags | 2 | Long pauses Monday and Wednesday |
| Habit trend | Improving | Up from 0.62 last month |

In v1: study habit block not available.

**Homework Completion Rate:**
- Overall: 87% on-time across all subjects
- Per-subject table: which subjects student consistently skips

**Oral Participation:**
- Average participation score per subject over last 30 days
- Identifies academically performing but classroom-disengaged students

**Behaviour Log:**
- Chronological list of incidents from any teacher
- Category + date + teacher who logged + note
- Positive recognitions also logged here (balances the log, powerful PTM talking point)

**AI Summary Block (Claude-generated):**

> "Ravi Kumar is performing well overall with a 82% mastery average. His strongest subject is Mathematics. His weakest area is Telugu at 38%, declining for 3 weeks — sign errors and phonetic spelling are the primary gap patterns. Homework completion is strong at 87%. Writing clarity and speed are improving. Attendance is excellent at 94%. Study habits are consistent — he typically starts at 7 PM and maintains focus well."

### Parent-Teacher Meeting (PTM) Mode

Activated by tapping "PTM Mode" on any student's 360° profile.

What changes:
- UI goes full-screen, presentation-ready (hides app chrome)
- Fonts enlarge for reading across a table
- One-page summary rendered with all key metrics, trends, and AI summary
- Teacher swipes through: Attendance → Subject Mastery → Writing Skills → Study Habits → Homework → Behaviour → AI Recommendations
- "Generate PTM Report" button creates a PDF

**PTM Report PDF contains:**
- School letterhead (from Web Admin school profile)
- Student name, class, term, date of meeting
- All metrics in clean parent-readable format (no raw data, no percentile numbers — plain language)
- AI recommendations: "Focus areas for next term" in plain language
- Signature field for class teacher (digital) and parent acknowledgement
- "Powered by NeuraLife" footer

PDF shared via WhatsApp or printed from Web Admin Console.

### Behaviour & Discipline Log

Any teacher logs an incident against any student. Class teacher sees the consolidated log.

**Incident fields:**
- Student, date and time
- Category: Disruption / Bullying / Property Damage / Positive Recognition / Attendance Issue / Other
- Description (brief note)
- Action taken: Verbal warning / Written warning / Parent informed / Principal informed / No action
- Logged by (teacher name auto-filled)

### Leave Application Management

Parents submit leave applications through the Parent & Student App (Parent Login). Class teacher receives here.

Each application shows: student name, dates requested, reason, parent name.

Actions: Approve / Reject / Request more information.

On approval: attendance records for those dates update to "Approved Leave" — not counted as absence in rate calculation. Parent receives confirmation notification.

### Student Promotion Readiness

Activated by principal at end of academic year. Per student, system calculates Promotion Readiness Score:
- Attendance ≥ 75% (mandatory in Indian schools)
- Overall mastery ≥ 50% across all subjects
- Main exam scores meet minimum pass criteria

Class teacher reviews auto-calculated recommendation (Promote / Hold Back / Review) and can override with a note. Feeds principal's year-end report.

---

## Module 8 — Notifications (Role-Aware)

All notifications are actionable with a primary action button.

| Notification | Role | Trigger | Primary Action |
|---|---|---|---|
| AT_RISK student — 48hr no intervention | Both | AT_RISK + no intervention logged | "View student" |
| Alert escalated from principal | Both | Principal escalation | "View student" |
| Homework not submitted | Subject | Due date passed, < 60% submitted | "Remind parents" |
| Doubt queue overflow | Subject | > 10 unresolved doubts | "View doubts" |
| Common doubt detected | Subject | 5+ students flag same topic | "View common doubt" |
| Student absent streak | Class | 3+ consecutive absences | "Message parent" |
| Leave request pending | Class | Parent submitted application | "Review request" |
| Timetable change | Both | Principal updates schedule | "View new schedule" |
| Mastery drop | Both | Student drops 10%+ in one week | "View student" |
| Syllabus behind plan | Both | Coverage 2+ weeks behind | "Update coverage" |
| New exam marks pending | Subject | Exam date passed, no marks entered | "Enter marks" |
| PTM scheduled | Class | Principal schedules PTM | "View PTM schedule" |
| Curriculum pattern detected (v2) | Subject | Weekly ML scan flags cross-school gap | "View pattern report" |

---

## Module 9 — My Performance (Teacher Analytics)

*Teacher sees their own impact data — the same information the principal sees, with full context. No surprises.*

**Design principle:** Teacher performance analytics are shown to the teacher first, with full context, before any summary reaches the principal. Teachers are supported, not surveilled.

### My Performance Dashboard

Accessible from Profile tab → "My Teaching Impact."

**This month's summary:**
- Classes I teach: list
- My students' average mastery: % vs school average for same subject
- Mastery velocity: percentile points per month (my students vs school avg)
- AT_RISK students in my subject: count + % who have received interventions

**Subject mastery — my classes vs school average:**

```
Mathematics (my classes):    68%  vs school avg 62%  (+6%) ✅
Telugu (my classes):         38%  vs school avg 45%  (-7%) ⚠️
```

**Engagement rate:**
- Average SmartPad sessions per student per week in my subject
- vs school average

**Common error patterns in my subject (this month):**
- Top 3 error patterns my students make
- Recommendation: "These errors suggest [topic X] may benefit from a different approach"

**AI Pattern Insight:**
```
"Your students show above-average mastery in Algebra and Geometry
 but below-average in Trigonometry across all 4 classes.
 This pattern is consistent across multiple weeks — suggesting
 a teaching approach review for Chapter 8 may help.
 Note: This pattern is also seen in 3 other schools — NeuraLife
 content team is reviewing the textbook explanation for this topic."
```

**Framing:** If the pattern appears in multiple teachers' classes → "curriculum issue" label shown. If unique to this teacher → "teaching pattern worth reviewing" label. Context flags applied automatically: [REMEDIAL_CLASS] [NEW_TEACHER] [HIGH_ABSENTEEISM].

**What is NOT shown to the teacher:**
- Their ranking against other teachers at the school (principal sees this, not the teacher)
- Comparison by name to a specific colleague
- Raw percentile rank (described as "above average" / "average" / "needs attention")

---

## Offline-First Architecture

| Feature | Offline behaviour |
|---|---|
| Home screen + schedule | Loads from local cache instantly |
| Attendance marking | Stored locally, digitally signed, synced on connect |
| Homework creation | Saved locally, published on next sync |
| Doubt resolution | Saved locally, pushed to SmartPad on sync |
| Marks entry | Saved locally, synced on connect |
| Participation scores | Saved locally, synced on connect |
| Student profiles | Cached on last full sync |
| Notifications | Delivered via FCM on connection restore |

**Sync strategy:**
- Full sync on app open (if connected) — pull all updates since last sync
- Background sync every 15 minutes when connected
- On connectivity restore: flush all pending local writes first, then pull server updates
- Pending records shown in header: "4 records pending sync" (amber indicator)

**Cache TTL:**
- Schedule / timetable: 1 hour
- Student mastery data: 24 hours
- Attendance records: 7 days (for correction flows)
- Student profiles: 24 hours
- Doubt queue: 6 hours

---

## Data Models

### Teacher

```json
{
  "teacher_id": "TCH-00142",
  "school_id": "SCH-AP-00142",
  "name": "K. Ramesh",
  "mobile": "+91-9876543211",
  "roles": ["SUBJECT_TEACHER"],
  "subjects": ["MATHEMATICS", "SCIENCE"],
  "assigned_classes": [
    { "class": "10", "section": "A", "subject": "MATHEMATICS" },
    { "class": "9",  "section": "B", "subject": "MATHEMATICS" },
    { "class": "8",  "section": "A", "subject": "SCIENCE" }
  ],
  "class_teacher_of": null,
  "designation": "SUBJECT_TEACHER",
  "last_app_login": "2025-09-01T07:45:00Z",
  "status": "ACTIVE"
}
```

### Teacher (Class Teacher with both roles)

```json
{
  "teacher_id": "TCH-00198",
  "school_id": "SCH-AP-00142",
  "name": "S. Lakshmi",
  "mobile": "+91-9876543299",
  "roles": ["SUBJECT_TEACHER", "CLASS_TEACHER"],
  "subjects": ["ENGLISH"],
  "assigned_classes": [
    { "class": "10", "section": "A", "subject": "ENGLISH" },
    { "class": "9",  "section": "B", "subject": "ENGLISH" },
    { "class": "8",  "section": "C", "subject": "ENGLISH" }
  ],
  "class_teacher_of": { "class": "10", "section": "A" },
  "designation": "CLASS_TEACHER",
  "last_app_login": "2025-09-01T07:50:00Z",
  "status": "ACTIVE"
}
```

### Teacher-Parent Message Thread

```json
{
  "thread_id": "MSG-00421",
  "school_id": "SCH-AP-00142",
  "teacher_id": "TCH-00198",
  "parent_mobile": "+91-9876543210",
  "neura_id": "NID-2025-AP-084291",
  "initiated_by": "TEACHER",
  "messages": [
    {
      "sender": "TEACHER",
      "text": "Ravi's Telugu needs attention. Can we schedule a call?",
      "sent_at": "2025-09-01T15:30:00Z",
      "read_at": "2025-09-01T16:10:00Z"
    },
    {
      "sender": "PARENT",
      "text": "Yes, tomorrow 5 PM works.",
      "sent_at": "2025-09-01T16:12:00Z",
      "read_at": "2025-09-01T16:15:00Z"
    }
  ],
  "class_teacher_visible": true,
  "principal_visible": true,
  "sms_fallback_sent": false
}
```

---

## Teacher Morning Workflow — 6 Steps (Demo Script)

| Step | Action | Time |
|---|---|---|
| 1 | Open app → biometric login → home loads from cache | 5 sec |
| 2 | Check today's schedule → see current period highlighted | 10 sec |
| 3 | Tap first period → mark attendance → submit (digitally signed) | 2 min |
| 4 | Check alert feed → see AT_RISK alert for Arun Reddy | 15 sec |
| 5 | Check doubt queue → 3 students confused on same topic | 30 sec |
| 6 | Open class performance → Telugu at 38% across class → plan reteach | 30 sec |

**Total: under 4 minutes.** This replaces: paper attendance register, paper marks ledger, informal WhatsApp doubt resolution, and gut-feel lesson planning — every single day.

---

## Confirmed Design Decisions

| Decision | Detail |
|---|---|
| Separate APK from Parent & Student App | Teacher App is its own install. Parents and students use the Parent & Student App (one APK, two logins). Teachers never share an app surface with parents. |
| JWT: 24hr + 30-day refresh (rotating) | Aligned with Security & Compliance spec. Previous "7-day refresh" corrected. Biometric re-authentication on subsequent logins within the 30-day window. |
| Oral participation visibility to parents | Monthly engagement score (1–5) shown in Parent & Student App under student's subject profile. Teacher's per-session notes are internal only — never shown to parents. |
| Teacher-to-parent messaging: bidirectional | Teacher can initiate. Parent can initiate. Both directions needed — for homework reminders, PTM scheduling, and AT_RISK parent communication. No personal phone number exchange. |
| Message thread visibility | Class teacher has read-only visibility into all teacher-parent threads for students in their class. Principal has read-only visibility into all threads school-wide. Full audit trail. |
| Differentiated homework: parent visibility | Assignment appears identically in Parent & Student App regardless of variant. Same title, same subject, same due date. Easier variant is a pedagogical tool — invisible to parents to avoid stigma. |
| School branding primary throughout | Every screen, report, PDF, and notification carries school name + logo as primary branding. "Powered by NeuraLife" in footer. Applied to Teacher App, Parent & Student App, PTM reports, attendance PDFs, Web Admin, and all SMS. |
| Substitute teacher: day-only view | Substitute sees current day's syllabus plan (read-only). Past marks, student profiles remain private to original teacher. Substitute can mark attendance and push resources only. |
| Bulk marks import: v2 (camera OCR) | v1: manual marks entry per student. v2: camera + OCR bulk import for paper test mark sheets. Long-term: all tests conducted on SmartPad → marks captured automatically. |
| WSS-1 writing skills: v2 data | Writing Skills block in 360° profile is populated when WSS-1 (v2 model) is deployed. In v1, block shows placeholder until data is available. |
| SHE-1 study habits: v2 data | Study Habit block in 360° profile is populated when SHE-1 (v2 model) is deployed. Focus score, timing consistency, distraction flags available in v2. |
| Teacher performance: framed as support | Teacher sees their own analytics first, with context flags. Not compared by name to colleagues. School-wide ranking visible to principal only. |
| AI mastery override is a training signal | Teacher disagreements with AI mastery assessments are logged and used for quarterly GAP-1 retraining. Teacher expertise improves the model over time. |

## Open Questions Resolved

| Question | Resolution |
|---|---|
| Q7 — Teacher-to-parent messaging limits? | v1: text only (max 500 characters per message). v2: photo attachment (max 5 MB). v3: voice notes. Storage cost consideration confirmed. |
| Q8 — Teacher can initiate messages to parent? | ✅ Both directions allowed. Teacher can initiate. This is required for homework reminders, PTM scheduling, and AT_RISK parent communication. |
| Q9 — Class teacher sees all teacher-parent threads? | ✅ Class teacher has read-only visibility into all teacher-parent message threads for students in their assigned class. Principal has school-wide read-only visibility. All threads logged in audit trail. |

---

*All 8 original spec documents updated. Documentation complete.*

*Updated documents: Parent & Student App · Web Admin Console · Edge AI Engine · Cloud AI Backend · NeuraID · NeuraOS + SmartPad · NeuraSphere + Chat · Teacher Mobile App*
