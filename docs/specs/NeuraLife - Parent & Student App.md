# NeuraLife - Parent & Student App

[SCREENS](SCREENS%203548826222e180748d0ddf65ce8f5810.md)

![image.png](image%202.png)

![image.png](image%203.png)

# NeuraLife — Parent & Student App

*A single family-facing mobile application combining parent monitoring and student learning access under one installed app — the daily touchpoint between school, teacher, parent, and student.*

---

## Purpose & Scope

The Parent & Student App is the most emotionally resonant interface in the NeuraLife platform. It is what parents open every morning to check on their child. It is what a student uses to access content and their learning community when away from the SmartPad. It is the platform's primary retention and trust-building tool — and the only interface parents and students share.

**One app. Two logins. Two completely different experiences.**

- The **Parent Login** monitors, communicates, and manages — daily insights, attendance, homework, fee status, teacher messaging
- The **Student Login** gives the child access to their progress, recommended content, and NeuraSphere (Class 7+) — on the parent's phone, using their NeuraID + PIN

**The SmartPad is separate.** The SmartPad is a dedicated device for students only. Parents do not access the SmartPad. Students do not use the SmartPad for social features. The mobile app and the SmartPad serve different functions in the same ecosystem.

---

## The Two-Login Architecture

This is the most important architectural decision in this document. Read it carefully before building anything.

```
One APK installed on parent's smartphone
│
├── PARENT LOGIN
│     Auth: OTP to registered parent mobile number
│     Session: JWT 24hr + biometric refresh
│     Sees: Child's insights, attendance, mastery,
│           homework, fee status, teacher messaging,
│           NeuraSphere (child's activity only),
│           school announcements
│     FCM: All push notifications go to this login
│     Access: All classes, all ages
│
└── STUDENT LOGIN
      Auth: NeuraID + 4–6 digit PIN (no OTP)
      Session: JWT 8hr (school day duration)
      Sees: Own mastery, recommendations, NeuraSphere
            (Class 7+ only), achievement badges, content review
      FCM: No push notifications (parent's device,
           parent's FCM token)
      In-app alerts: Visible when student is logged in
      Access: Age-gated by class (see below)
      Available from: Class 4 upward

Why no student login below Class 4:
  Classes 1–3 (Foundation band) students are 6–9 years old.
  They do not independently navigate a smartphone app.
  All their data is viewed by the parent in Parent Login.
  Their learning happens entirely on the SmartPad.
```

### Login Flow

```
App opens →
  [Parent Login]         [Switch to Student]
       ↓                        ↓
  OTP to mobile           NeuraID + PIN entry
       ↓                        ↓
  Parent dashboard        Age check:
                            Class 1–3 → "Use SmartPad to learn.
                                         Ask your parent to see
                                         your progress."
                            Class 4+ → Student home screen
```

### SmartPad vs Mobile App — Role Separation

| Function | SmartPad | Mobile App |
| --- | --- | --- |
| Primary writing + learning | ✅ Only here | ❌ |
| Edge AI (HWR-1, GAP-1, WSS-1, SHE-1) | ✅ Runs on device | ❌ |
| Session data capture | ✅ | ❌ |
| Full chapter content (offline) | ✅ Pre-downloaded | Review mode only |
| NeuraSphere (posting + feed) | ❌ v1 kiosk has no social | ✅ Student Login |
| Parent monitoring | ❌ No parent access | ✅ Parent Login |
| Teacher messaging | ❌ | ✅ Parent Login |
| Fee management | ❌ | ✅ Parent Login |
| Attendance | ❌ | ✅ Parent Login (view) |
| AI insights | ❌ | ✅ Both logins |

---

## Architecture Decisions (Locked)

| Decision | Choice | Rationale |
| --- | --- | --- |
| App structure | One APK, two login modes | Most Indian families share one smartphone. Separate apps create installation friction. |
| Student auth method | NeuraID + PIN (not OTP) | Students may not have personal mobile numbers. PIN is manageable for Class 4+ students. |
| Child switcher | Profile icon → switch between siblings | One parent account handles all children. App fully reloads context for selected child. |
| Age-gated UI | Four bands: Foundation / Elementary / Middle / Secondary | Each band has distinct design rules — font size, colour, features, analytics visibility. |
| Parent data access | Full — mastery, writing, AI insights, NeuraSphere child activity | Parents are paying customers. Full transparency builds trust and retention. |
| NeuraSphere visibility | Parent sees child's full social feed and posts in Parent Login | Parental oversight is a safety and trust feature. |
| NeuraSphere posting | Mobile app only (v1). SmartPad AOSP (v2) adds achievement auto-posts. | v1 SmartPad is a kiosk app — no social layer. v2 AOSP SmartPad adds contextual achievement posts. |
| FCM push notifications | All FCM goes to parent's registered device only | Student has no separate FCM token. Student sees in-app alerts when logged into Student Login. |
| Language | Default to child's assigned medium. Parent can override. | Assigned medium ensures consistency with school content. Override supports diverse households. |
| Inter-school NeuraSphere | Platform-wide from day one — not a per-school or v3 feature | NeuraSphere is a community, not a school tool. Value grows as more schools join. |
| In-app fee payment | v1: Admin records offline payments. v2: Razorpay UPI integration. | RBI compliance and payment gateway setup is a v2 task. |
| Offline behaviour | Parent Login: schedule + mastery cached. Learn tab: content downloadable. | Rural connectivity is unreliable. Core parent-facing features must work without internet. |
| Branding | School name + logo primary. "Powered by NeuraLife" in footer. | Every screen carries school branding. NeuraLife is infrastructure, not front-facing brand. |

---

## Platform & Tech Stack

```yaml
Framework:        React Native 0.74 (Android-first v1, iOS in v2)
State Management: Zustand
Offline Storage:  WatermelonDB (local SQLite)
Data Fetching:    TanStack Query with offline persistence
Real-time:        Supabase Realtime WebSocket
Push:             Firebase Cloud Messaging (parent device only)
SMS Fallback:     MSG91 — for parents who have not installed the app

Auth:
  Parent Login:
    - First login: OTP to registered parent mobile
    - Subsequent: biometric + PIN fallback
    - JWT: 24hr expiry + 30-day refresh token
  Student Login:
    - NeuraID + 4–6 digit PIN
    - JWT: 8hr expiry (school day duration)
    - PIN set at enrollment, reset only by principal
    - Rate limit: 5 attempts → 15-minute lockout

i18n:   English + Telugu. Default = child's assigned medium.
Deploy: APK sideload (v1 demo) → Play Store + App Store (v2)
```

---

## Data Flow Into This App

| Data | Source | Trigger |
| --- | --- | --- |
| Attendance status | Teacher App → Cloud | Teacher submits → immediate FCM push to parent |
| Mastery map | SmartPad Edge AI + Cloud AI | Calibrated nightly, shown at 8 PM |
| Writing skills | SmartPad Edge AI → Cloud | Monthly aggregate, WSS-1 |
| Homework assignments | Teacher App → Cloud | Teacher publishes → FCM push to parent |
| Homework submissions | SmartPad → Cloud | Student completes on pad → status updates |
| Exam results | Teacher App → Cloud | Teacher enters marks → visible immediately |
| Timetable | Web Admin → Cloud | Principal updates → push to app |
| School announcements | Web Admin → Cloud | Principal broadcasts → FCM push |
| Teacher messages | Teacher App → Cloud | Bidirectional, real-time |
| Fee status | Web Admin → Cloud | Admin records payment → updates |
| AI insights | Cloud AI (Claude) → Cloud | Generated nightly, pushed to parent at 8 PM |
| NeuraSphere posts | Cloud → App | Real-time feed, AI-moderated only |
| SmartPad status | SmartPad → Cloud → App | Battery, last sync, active hours |
| Content (Learn tab) | Supabase Storage → App | Downloaded on WiFi, reviewed offline |

---

## Navigation Structure

### Bottom Tab Bar

```
Parent Login:
  [ 🏠 Home ] [ 👦 My Child ] [ 💬 Connect ] [ 👤 Profile ]

Student Login (Class 4–6 — Elementary):
  [ 🏠 Home ] [ 📚 Learn ] [ 🏆 Achievements ]

Student Login (Class 7–8 — Middle, limited):
  [ 🏠 Home ] [ 📚 Learn ] [ 🌐 Sphere ] [ 🏆 Achievements ]

Student Login (Class 9–10 — Secondary, full):
  [ 🏠 Home ] [ 📚 Learn ] [ 🌐 NeuraSphere ] [ 🏆 Profile ]
```

---

## PARENT LOGIN — All Modules

### Module P1 — Home Screen

*The first screen the parent sees every morning. Fully scannable in under 5 seconds. Works offline from cache.*

**Header:**

- School name and logo (primary branding)
- Child name, class, section
- Child switcher avatars (initials of each sibling — tap to switch)
- Date and day
- "Powered by NeuraLife" sub-label

**KPI Strip:**

| Metric | Data Source | Alert Behaviour |
| --- | --- | --- |
| Today's attendance | Teacher App | Green "Present" / Red "Absent" / Amber "Late" — FCM push on mark |
| Homework pending | Homework module | Count of unsubmitted assignments |
| Overall mastery | Cloud AI | Percentage + trend arrow |
| SmartPad battery | SmartPad sync | Percentage — amber if < 20% |

**Today's Schedule:**

- Child's full timetable pulled from Web Admin
- Current period highlighted with "Now" badge
- Each period: time, subject, teacher name
- Completed periods greyed out

**Alert Feed:**

| Alert | Trigger | Severity |
| --- | --- | --- |
| Homework overdue | Due date passed, not submitted | High |
| Exam upcoming | Exam in 7 days, weak subject detected | High |
| Fee overdue | Fee due date passed | High |
| Attendance — absent today | Teacher marks absent | High |
| Absence streak (3+ days) | Consecutive absences | High |
| AT_RISK mastery flag | Cloud AI classification | High |
| Leave approved / rejected | Class teacher acts | Medium |
| New homework | Teacher publishes | Medium |
| New teacher message | Teacher sends | Medium |
| School announcement | Principal broadcasts | Low |
| Mastery improvement | AI detects 10%+ improvement | Low (positive) |

---

### Module P2 — My Child

*Full analytics view of the child's learning health.*

**2.1 — Mastery Map**

Overview card:

- Overall mastery % with trend arrow and month-on-month delta
- AI-generated plain-language insight in Telugu or English
- Example: "Ravi is performing well overall. Mathematics improving steadily at 82%. Telugu needs attention — mastery dropped to 38% over 3 weeks. Daily vocabulary practice at home recommended."

Subject-wise mastery table:

| Subject | Teacher | Mastery % | Trend | Last Active |
| --- | --- | --- | --- | --- |
| Mathematics | K. Ramesh | 82% | ↑ | Today |
| Science | P. Venkat | 74% | → | Yesterday |
| English | S. Lakshmi | 68% | ↑ | Today |
| Telugu | M. Devi | 38% | ↓ | 4 days ago |
| Social Studies | R. Prasad | 59% | → | 2 days ago |

Colour-coded: ≥70% green / 50–70% blue / 35–50% amber / <35% red. Tap any subject → chapter-level mastery breakdown and topic gap list.

Homework completion rate: overall on-time rate + per-subject + overdue items.

**2.2 — Attendance**

- Monthly percentage, days present / absent / late / approved leave
- Consecutive absence streak (shown as warning if active)
- Monthly calendar heatmap: Green = present, Red = absent, Amber = late, Blue = approved leave, Grey = holiday
- Tap any date → who marked it, at what time, any correction notes
- Leave application button → navigates to Connect tab

**2.3 — Writing Skills**

Four dimensions (WSS-1 output):

| Dimension | Display |
| --- | --- |
| Handwriting clarity | Score out of 100 + trend |
| Writing speed | WPM + trend |
| Spelling accuracy | Percentage + trend |
| Sentence formation | Developing / Proficient / Advanced |

Month-on-month bar charts per dimension. AI insight in plain language: "Ravi's spelling accuracy in English improved from 58% to 81% over 3 months."

**2.4 — Exam Results**

- Per exam: name, date, per-subject marks / total / percentage / class average
- Class rank: "8th out of 42" per subject
- Upcoming exam alert (7-day banner): weak subjects highlighted with one-tap link to content

**2.5 — Homework Tracker**

- All homework assigned by all subject teachers
- Status: Submitted on time / Submitted late / Pending / Overdue
- Teacher name, subject, due date
- Tap → homework details and reference material

**2.6 — SmartPad Status**

| Field | Description |
| --- | --- |
| PAD-ID | Physical device identifier |
| Battery level | Current %, colour-coded |
| Last sync | Timestamp |
| Active today | Hours of active writing today |
| Active this week | Days active out of school days |
| Storage | Used / total |

If pad inactive 3+ days: warning banner with "Contact class teacher" suggestion.

**2.7 — Fee Status**

- Total fee paid this academic year
- Amount currently due
- Amount overdue (if any) with overdue date
- Payment history: itemised list (fee head, amount, date, mode)
- If overdue: red alert banner with school contact
- v1: "Contact school to record payment." v2: in-app UPI payment (Razorpay)

---

### Module P3 — Connect

**3.1 — Teacher Messaging**

- All teachers assigned to child's class
- Bidirectional chat: parent sends, teacher replies
- Class teacher shown at top
- Text only (v1). Photo attachment (v2). Voice notes (v3).
- "All messages logged and monitored by school" — persistent footer
- All threads visible to class teacher + principal (read-only)
- SMS fallback via MSG91 if parent has not installed app

**3.2 — School Announcements**

- All broadcasts from principal
- School-wide or class-specific
- Sorted by date, unread blue dot
- Read receipts sent on open
- One-way only — cannot be replied to

**3.3 — NeuraSphere (Parent View)**

Parent sees the child's full social activity in read-only mode:

- Child's own posts (pending, approved, rejected)
- Posts from classmates in same school
- Each post: name, class, text, moderation status badge
- Parent can report any post → goes to principal
- Parent sees who the child is connected with
- Parent cannot post or interact — observation only

**3.4 — Leave Application**

- From / To date picker, reason field
- Submits to class teacher for approval
- Previous applications: dates, reason, status, teacher review note
- Approved: attendance auto-updated (not counted as absence)
- Push notification on approval or rejection with teacher's note

---

### Module P4 — Profile

**4.1 — Child Profile (Read-only)**

- Name, DOB, class, section, medium, board
- NeuraID shown prominently
- School name and logo
- SmartPad PAD-ID linked
- "Set by school admin — contact school to update"

**4.2 — Child Switcher**

- All linked children: name, class, school
- Tap to switch — app reloads context
- No re-authentication
- Children can be in different NeuraLife schools

**4.3 — Language Toggle**

- App UI: English / తెలుగు
- Default: child's assigned medium
- Override anytime
- Announcements and teacher messages shown in original language (no auto-translate v1)

**4.4 — Notification Settings**

| Notification | Default | Can disable? |
| --- | --- | --- |
| Attendance marked | On | ✅ |
| Homework assigned | On | ✅ |
| Homework overdue | On | ✅ |
| Exam results | On | ✅ |
| Exam upcoming (7 days) | On | ✅ |
| Fee due alert | On | ❌ if overdue |
| AT_RISK mastery alert | On | ❌ fixed |
| Teacher messages | On | ✅ |
| School announcements | On | ✅ |
| Leave status | On | ✅ |
| NeuraSphere activity | On | ✅ |
| Daily AI insight | On | ✅ |

**4.5 — Data & Privacy**

- View full consent agreement signed at enrollment
- Download child's data (JSON: mastery history, attendance, writing scores)
- Request data deletion: initiates 30-day cascade deletion
- NeuraID retention: "Keep learning history if we change schools" (toggle, default: On)
- "NeuraLife does not sell or share your child's data" — permanently displayed

---

## STUDENT LOGIN — All Modules

*Available from Class 4+. Accessed on parent's phone using NeuraID + PIN.*

### Age Band Rules

| Band | Classes | Student Login | NeuraSphere access | Analytics visible to student |
| --- | --- | --- | --- | --- |
| **Foundation** | 1–3 | ❌ No student login | ❌ | ❌ All in parent view only |
| **Elementary** | 4–6 | ✅ Limited | ❌ | Subject icons only, no % |
| **Middle** | 7–8 | ✅ Full access | ✅ Limited — achievements + circles. No direct chat. | Mastery %, trends |
| **Secondary** | 9–10 | ✅ Full access | ✅ Full — posts + circles + chat (v2) | Full analytics |

---

### Module S1 — Student Home

**Foundation Band (1–3):** Student Login not available. Parent shown: "Your child's learning happens on the SmartPad. View their progress in My Child."

**Elementary Band (4–6) — Simple Home:**

```
Large illustrated subject cards (2×2 grid)
Each subject: colourful icon, subject name, teacher name
  [🔢 Maths]   [📝 Telugu]
  [🔬 Science] [🌍 EVS]

Below:
  Homework today: 1 pending  [See homework]
  Achievement: "You completed 3 chapters this week! 🌟"
  SmartPad: PAD-0043 synced today ✅
```

Design rules:

- Font minimum 18px
- No mastery percentages — too abstract
- Encouragement-first, never failure language
- Subject mascot character in corner of each card
- Auto-plays TTS greeting: "Good morning, Priya! Let's check what's happening today."

**Middle Band (7–8) — Transitional Home:**

```
Header: "Good evening, Arjun 👋"
SmartPad last sync: Today 6:14 PM ✅

My Subjects:
  Mathematics  72%  ↑  [3 topics recommended]
  Science      58%  ↓  [AT_RISK: 2 topics need work]
  Telugu       67%  ↑
  ...

Recommended today:
  📌 "Review: Sign errors in Algebra" — 15 min
  📌 "Practice: Motion problems" — 20 min

NeuraSphere:  2 new posts from your class  [View]
Achievements: 1 new badge earned this week  [View]
```

**Secondary Band (9–10) — Full Home:**

```
Header: "Good evening, Arjun"
Overall mastery: 68%  ↑ +3% this week
SmartPad: Synced today — 2 sessions, 58 min total

Focus today (AI recommended):
  ⚠️  Physical Science — SIGN_ERROR pattern (8 occurrences)
      [Open practice problems]
  📖  Mathematics Chapter 4 — 65% complete
      [Continue]

NeuraSphere:  5 new posts  [View feed]
Leaderboard:  Rank 7 in class this week  [View]
```

---

### Module S2 — Learn (Student)

*Content review and homework access on the mobile app.*

**Important:** The mobile Learn tab is for **reviewing content** and **accessing homework reference material**. Primary learning — writing, problem solving, AI analysis — happens on the SmartPad. The mobile app does not capture handwriting or run Edge AI.

**Elementary (4–6) — Simple Learn:**

- Large subject cards
- Tap subject → chapter list (downloaded chapters only)
- Each chapter: topic list, tap to read
- Videos: YouTube link (WiFi) or thumbnail (offline)
- Homework list: title + due date + done / not done icon
- No practice problems in v1

**Middle + Secondary (7–10) — Full Learn:**

Homework panel (top):

- Pending homework sorted by urgency
- Each: subject, title, due date, teacher, status
- Overdue in red
- Tap → details + reference material (chapter link)

Subject library:

- All subjects with mastery % and chapter count
- Weak subjects (< 40%) shown with red indicator
- Tap → chapter list

Chapter list:

- All chapters with status (Not started / In progress / Completed)
- Completed status synced from SmartPad
- "Continue where you left off" card (synced from SmartPad session)
- Tap → content viewer

Content viewer:

- SVG diagrams + concept text
- YouTube video reference (opens on WiFi)
- Language toggle per chapter
- Navigation: previous / next topic, progress bar
- Read-only — no stylus input, no problem submission on mobile

Practice Mode (v2):

- AI-generated practice questions based on mastery gaps
- Socratic hints approach
- Results feed back into mastery model

---

### Module S3 — NeuraSphere (Student)

*Class 7+ only. The verified student learning community.*

**Class 7–8 (Middle Band — Limited Access):**

- View own achievement badges and milestones
- Browse Learning Circles (join subject-based circles)
- Read posts from classmates
- ❌ No direct posting (can only auto-post achievements)
- ❌ No direct messaging
- Rationale: Social exposure before full posting rights builds healthy habits

**Class 9–10 (Secondary Band — Full Access):**

Student profile card:

- Real name, class, school, NeuraID — no anonymity, no aliases
- Achievement badges: subject milestones, streak badges, rank badges
- Connection count

Feed (inter-school, personalised from day one):

Priority algorithm:

1. Same class, same school — classmates' posts first
2. Same school, different class — school-wide community
3. Different schools, same interest tags — matched from strongest subjects + chapters completed + badges
4. Trending across NeuraLife — high-engagement posts, age-appropriate filtered

Post rules:

- Text + image from mobile (Class 9–10)
- Every post → AI moderation before publishing (Claude API, < 60 seconds)
- Profanity, bullying, personal info sharing — filtered
- Flagged posts → principal. Never published.
- Real identity enforced — no username or alias
- No direct messaging v1. Class-teacher-approved DM in v2.
- Parent sees every post the student makes

Posting (Class 9–10):

- Compose screen: text + optional image
- "Share Achievement" shortcut: auto-generates post from recent badge or mastery milestone
- Student adds a short note before submitting

v1 SmartPad (kiosk): No NeuraSphere posting. Mobile only.
v2 SmartPad (AOSP): Achievement auto-post button appears after milestone (e.g., "I solved Quadratic Equations! 🎉"). Student adds note. Submitted for moderation.

---

### Module S4 — Achievements

**Elementary (4–6):**

- Sticker collection: one sticker per chapter completed, per homework submitted
- Weekly celebration: "You collected 5 stickers this week! 🌟"
- No percentages, no ranks

**Middle + Secondary (7–10):**

Badge types:

| Badge | Trigger |
| --- | --- |
| First Chapter ⭐ | Completes first chapter on SmartPad |
| Subject Streak 🔥 | 7 consecutive active days in a subject |
| Gap Resolved ✅ | Error pattern classified → resolved |
| Top 10% 🏆 | Calibrated percentile in top 10% of grade |
| Homework Hero 📚 | 100% homework on-time for a month |
| Mastery Master 💎 | MASTERED classification in any topic |
| Writing Improver ✍️ | WSS-1 clarity score improved 10+ points |

Leaderboard (Secondary only):

- Class rank this week (mastery velocity — improvement rate, not absolute score)
- School rank this month
- Platform rank (anonymised for other schools — shows "Top 15% nationally")
- Parent sees this in My Child → Achievements

---

## Offline-First Architecture (Mobile App)

| Feature | Offline Behaviour |
| --- | --- |
| Parent Home screen | Loads from cache (last sync) instantly |
| Mastery map | Last calibrated data with "Last updated X hours ago" |
| Attendance calendar | Cached monthly data |
| Writing skills | Last synced scores |
| Learn tab — subject list | Available from cache |
| Learn tab — chapter content | Available if previously downloaded on WiFi |
| Teacher messages | Compose offline, sends on connectivity restore |
| Leave application | Submit offline, syncs on restore |
| FCM notifications | Delivered on connectivity restore |
| Student Login | Works offline if JWT not expired (8hr) |
| NeuraSphere feed | Last loaded feed shown. New posts load on reconnect. |

**Content download strategy:**

- On WiFi: auto-download current + next chapter per subject
- Manually downloadable: any chapter in subject library
- Storage management: parent clears in Settings
- Download indicators: Downloaded ✓ / Download ↓ / Downloading...

---

## UI Band Comparison

| Element | Foundation (1–3) | Elementary (4–6) | Middle (7–8) | Secondary (9–10) |
| --- | --- | --- | --- | --- |
| Student Login | ❌ | ✅ (limited) | ✅ | ✅ |
| Font size | — | 18px min | 14–16px | 12–14px |
| Subject display | — | Illustrated cards, no % | Cards with mastery % | Text list, full analytics |
| Mastery % (student view) | ❌ parent only | ❌ parent only | ✅ | ✅ |
| Writing skill scores | ❌ | ❌ | ✅ | ✅ |
| Exam ranks | ❌ | ❌ | ✅ | ✅ |
| Homework display | — | Icon + done/not done | Title + due date | Full detail |
| Achievements | — | Stickers | Badges | Badges + leaderboard |
| NeuraSphere | ❌ | ❌ | ✅ Limited | ✅ Full |
| AI insights (student view) | ❌ | ❌ | ✅ | ✅ |
| Practice mode | ❌ | ❌ | v2 | v2 |
| Language toggle | — | ✅ | ✅ | ✅ |
| TTS audio | Auto | On tap | On tap | On tap |

---

## Push Notification Flow (Corrected)

All FCM push notifications go to the **parent's registered device** via the **parent's FCM token**. The student has no separate push notification channel on mobile — they see in-app alerts when logged into Student Login.

```
Event occurs (e.g., AT_RISK flagged)
  → API Gateway creates notification record
  → Dispatcher: FCM push to parent's token
  → Parent's phone: push notification received
  → Parent opens app: Parent Login loads alert
  → Student opens Student Login later:
      In-app notification badge visible
      "Your teacher has a recommendation for you in Mathematics"
      (No push — parent device, parent's token)
```

**SMS fallback (MSG91):**

- Triggers when FCM undelivered (no app installed) after 4 hours
- Language: parent's preference (Telugu / English)
- Templates DLT-registered (TRAI compliance)

---

## School Transfer Behaviour

**New school is NOT on NeuraLife:**
App enters Alumni Mode — full historical mastery, writing, exams viewable. No live updates. NeuraSphere continues with "Alumni" badge. NeuraID active.

**New school IS on NeuraLife:**
New school admin links existing NeuraID to new enrollment. App shows both schools: previous school archived under "Sri Vidya High School (2023–25)", new school active. Full mastery continuity — this is the NeuraLife community promise.

---

## Data Models

### Parent Account

```json
{
  "account_id": "FAM-00421",
  "parent_mobile": "+91-9876543210",
  "parent_name": "Venkat Kumar",
  "linked_children": [
    {
      "neura_id": "NID-2025-AP-084291",
      "name": "Ravi Kumar",
      "school_id": "SCH-AP-00142",
      "class_year": 10,
      "section": "A",
      "band": "SECONDARY",
      "student_login_available": true
    },
    {
      "neura_id": "NID-2025-AP-084512",
      "name": "Priya Kumar",
      "school_id": "SCH-AP-00142",
      "class_year": 4,
      "section": "B",
      "band": "ELEMENTARY",
      "student_login_available": true
    }
  ],
  "active_child_neura_id": "NID-2025-AP-084291",
  "language_preference": "ENGLISH",
  "data_consent_given": true,
  "consent_version": "1.0",
  "created_at": "2025-06-10T10:00:00Z"
}
```

### Student Session (Mobile — Content Review Only)

```json
{
  "session_type": "MOBILE_REVIEW",
  "neura_id": "NID-2025-AP-084291",
  "chapter_id": "MATH-10-CH3",
  "started_at": "2025-09-10T19:15:00Z",
  "ended_at": "2025-09-10T19:42:00Z",
  "pages_viewed": 8,
  "video_opened": false,
  "note": "No Edge AI processing — mobile is review only.
           This session does not feed mastery model."
}
```

### NeuraSphere Post

```json
{
  "post_id": "NSP-00341",
  "neura_id": "NID-2025-AP-084291",
  "author_name": "Ravi Kumar",
  "author_class": "10-A",
  "school_id": "SCH-AP-00142",
  "post_type": "STUDENT_POST",
  "source": "MOBILE",
  "content_text": "Finally understood quadratic equations! Took 3 tries.",
  "created_at": "2025-08-30T16:22:00Z",
  "moderation_status": "APPROVED",
  "moderation_checked_at": "2025-08-30T16:22:54Z",
  "claude_moderation_score": 0.97,
  "published_at": "2025-08-30T16:22:54Z",
  "visible_to_parent": true,
  "flagged_by_parent": false
}
```

---

## Confirmed Decisions

| Decision | Detail |
| --- | --- |
| One APK, two logins | Parent Login (OTP) + Student Login (NeuraID + PIN). Not two separate apps. Not two accounts. |
| SmartPad is student-only | No parent access on SmartPad. SmartPad is a dedicated learning device. Mobile app is the family interface. |
| Student Login from Class 4 upward | Classes 1–3 are Foundation band — too young for independent app navigation. All their data visible to parent in Parent Login. |
| NeuraSphere: 7+ only | Classes 1–6: no access. 7–8: achievements + circles only, no posting. 9–10: full access. |
| NeuraSphere posting: mobile only v1 | v1 SmartPad (kiosk app) has no social layer. v2 SmartPad (AOSP) adds achievement auto-post. |
| Inter-school NeuraSphere from day one | Community is platform-wide. Feed prioritises classmates first, then school, then interest-matched students from other schools. |
| All FCM to parent device only | Student has no FCM token. In-app alerts in Student Login when active. |
| Mobile Learn tab = review only | No Edge AI on mobile. Mastery model fed only from SmartPad. Mobile is for content reading and homework reference. |
| In-app UPI payment: v2 | v1 admin records offline payments. v2 Razorpay integration. RBI compliance needed before live payments. |
| Four age bands (not two UI modes) | Foundation / Elementary / Middle / Secondary. Each band has distinct design rules, analytics visibility, and NeuraSphere access. |
| Screen time control | Off by default. Parent enables daily Learn tab limit in Parental Controls. Child sees "Daily limit reached" — no explanation. |
| Dark mode | Supported. Default: system setting. Toggle in Profile → Settings. |

## Open Questions

| Question | Impact | Recommended action |
| --- | --- | --- |
| Class 4–6 Student Login — what specifically can they do? | Feature scope for Elementary band student login | v1: Subject library view + homework list + sticker achievements. No analytics, no NeuraSphere. Build this minimally — primary audience is parent. |
| NeuraSphere chat (Class 9–10, v2) — teacher approval per connection or global? | Moderation design for v2 DM feature | Per-connection approval: student requests to message another student → class teacher approves. Not automatic. Prevents misuse. |
| Alumni Mode — does NeuraID student login still work after school exit? | Student continuity post-graduation | Yes. NeuraID + PIN continues to work. Student can view historical data. Cannot post new content unless enrolled in another NeuraLife school. Confirm during NeuraID spec update. |
| iOS support timeline? | App Store submission process is slow (1–2 weeks review) | Begin iOS build in parallel with v2 Android. Submit to App Store in Month 10. Android is 100% of target market in AP/TS in v1. |

---

*Next update: **Web Admin Console — Fee & Salary module addition***