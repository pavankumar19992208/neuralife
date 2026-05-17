# NeuraLife — Timetable Builder
### Product Specification v1.0

*The first auto-generating, conflict-detecting, printable timetable system
designed specifically for AP/TS school patterns.
No competitor handles Indian school timetabling with this level of intelligence.*

---

## 1. The Problem With Timetables in Indian Schools

Every year, in June, a school vice-principal sits down with a blank sheet of paper.

They have 40 class-sections. 20 teachers. 6 subjects per class. A PT teacher who covers every section. A Computer lab that needs double periods. An assembly that must happen Monday morning. And the constraint that no teacher can be in two places at once.

The manual process takes 2–3 days. It is error-prone. Teachers discover conflicts on the first day of school. The principal spends the first week of the academic year firefighting schedule problems instead of running the school.

NeuraLife's Timetable Builder eliminates this entirely.

The principal configures once. The system generates a complete, conflict-free timetable in under 60 seconds. The principal reviews, adjusts if needed, confirms — and the timetable is live on every SmartPad and Teacher App immediately.

---

## 2. How Indian Schools Actually Manage Timetables

Understanding this before building is non-negotiable.

### 2.1 The Working Week

```
Most AP/TS private schools: Monday–Saturday (6 working days)
Some modern schools: Monday–Friday (5 days)
Saturday: Often a half-day (school ends 1:00 PM instead of 4:00 PM)
Sunday: No school
```

### 2.2 The Daily Structure

```
A typical Class 9–10 day in an AP/TS private school:

08:45 – 09:00 → Prayer / Morning Assembly (not a formal period)
09:00 – 09:45 → Period 1
09:45 – 10:30 → Period 2
10:30 – 10:40 → Short break (10 min)
10:40 – 11:25 → Period 3
11:25 – 12:10 → Period 4
12:10 – 12:40 → Lunch break (30 min)
12:40 – 13:25 → Period 5
13:25 – 14:10 → Period 6
14:10 – 14:55 → Period 7
14:55 – 15:40 → Period 8

Saturday (half-day):
09:00 – 09:45 → Period 1
09:45 – 10:30 → Period 2
10:30 – 10:40 → Short break
10:40 – 11:25 → Period 3
11:25 – 12:10 → Period 4
12:10 – 13:00 → Period 5 (then school ends)
```

### 2.3 Subject Weekly Period Allocation (SCERT AP Defaults)

| Subject | Class 6–7 | Class 8–9 | Class 10 |
|---|---|---|---|
| Mathematics | 6 | 6 | 6 |
| Physical Science | 4 | 5 | 5 |
| Biological Science | 4 | 4 | 4 |
| Social Studies | 5 | 5 | 5 |
| English | 5 | 5 | 5 |
| Telugu (First Language) | 5 | 5 | 5 |
| Hindi / Second Language | 4 | 4 | 4 |
| **Total academic** | **33** | **34** | **34** |

Schools configure this and can adjust per their own curriculum pace.

### 2.4 Extra-Curricular Activities (ECA)

These appear in the timetable alongside academic subjects:

| Activity | Periods/Week | Position | Notes |
|---|---|---|---|
| PT / Sports | 3–5 | First OR Last period ONLY | Never sandwiched in academics |
| Library | 1 | Any | Quiet reading period |
| Computer Lab | 2 | Any | Always double period (90 min session) |
| Drawing / Art | 2 | Any | |
| Music | 1–2 | Any | Schools with music teacher only |
| Yoga / Meditation | 1 | First period preferred | |
| Moral Education | 1 | Any | Often taken by class teacher |
| Custom | — | Configurable | School-specific |

### 2.5 The Assembly Rule

Most AP/TS schools have Monday morning assembly for all classes simultaneously.

```
Option A: Before Period 1 (a 20-minute slot before the normal timetable starts)
Option B: Period 1 is replaced by Assembly on Monday for all classes

Schools configure which option they use.
```

### 2.6 Lab Periods (Double Periods)

Physics lab, Chemistry lab, Computer lab — all require 2 consecutive period slots.

```
A lab session = 2 consecutive 45-min periods = 90 minutes
On the timetable: displayed as one merged cell spanning 2 rows
Auto-generator treats them as a unit (place both or neither)
```

### 2.7 The Multi-Section Teacher Problem

K. Suresh Kumar teaches Mathematics to: Class 9-A, 9-B, 9-C, 10-A, 10-B.
That is 5 sections × 6 periods/week = 30 periods/week.

The system must ensure he is never assigned to two sections at the same time.

```
Monday P3:  9-A gets Maths with Suresh → 9-B, 9-C, 10-A, 10-B CANNOT have Maths P3
Monday P4:  10-B gets Maths with Suresh → 9-A, 9-B, 9-C, 10-A cannot have Maths P4
```

This is the core constraint satisfaction problem.

---

## 3. The Three-Step Setup Flow

### Entry Conditions

```
New school (no existing timetable):
  → Wizard starts at Step 1

Returning (timetable already confirmed):
  → Load and display existing timetable directly
  → "Regenerate" button → skips to Step 2 (requirements pre-loaded)
  → "Modify" → open edit mode on existing timetable

New academic year:
  → Existing timetable still visible (from last year)
  → Banner: "New academic year. Reconfigure or carry forward last year's timetable?"
  → [Regenerate for new year] | [Copy last year's timetable]
```

---

## 4. Step 1 — Subjects & Activities Configuration

**Purpose:** Define everything that must appear in the timetable — academic subjects and ECA activities.

### 4.1 Academic Subjects

Pre-filled from SCERT AP/TS defaults based on the school's board setting.
Principal confirms and adjusts.

| Field | Type | Notes |
|---|---|---|
| Subject name | Text (locked for standard subjects) | Colour-coded per subject |
| Periods per week | Stepper (1–10) | Board defaults pre-filled |
| Needs double period (lab) | Toggle | If ON: "Sessions per week" stepper appears |
| Double period sessions/week | Stepper (0–3) | e.g., 1 = one 90-min lab per week |
| Teacher(s) assigned | Display only | From teacher_subject_assignments |
| Warning if no teacher | Amber warning | "⚠️ No teacher assigned — assign in Teachers →" |

**If no teacher is assigned for a subject:** the auto-generator will mark all slots for that subject as UNASSIGNED conflicts. The principal is warned before generation.

### 4.2 ECA Activities

Added by the principal from a preset list or as custom.

**Preset options:**

| Key | Display Label | Default Periods | Preferred Position | Double Period |
|---|---|---|---|---|
| `PT` | PT / Sports | 3 | First OR Last only | No |
| `LIBRARY` | Library Period | 1 | Any | No |
| `COMPUTER_LAB` | Computer Lab | 2 | Any | Yes (1 double session) |
| `DRAWING` | Drawing / Art | 2 | Any | No |
| `MUSIC` | Music | 1 | Any | No |
| `YOGA` | Yoga / Meditation | 1 | First preferred | No |
| `MORAL_EDUCATION` | Moral Education | 1 | Any | No |
| `CUSTOM` | (principal names it) | 1 | Any | Optional |

**ECA Teacher assignment:**
For PT, one PT teacher typically covers all sections. The system assigns the same teacher across sections (but never two sections simultaneously).

If no ECA teacher assigned: the activity is placed in the timetable but the teacher cell is empty — principal fills it manually in edit mode.

### 4.3 Assembly Configuration

```
Toggle: Include assembly in timetable (default: ON)

If ON:
  Day: Day of week dropdown (default: Monday)
  Duration: 15–30 minutes stepper (default: 20 min)
  Position:
    ○ Before first period
      → Assembly slot appears above P1 in the grid (not a numbered period)
      → School start time shifts back by assembly duration
    ● Replace first period on [Day]
      → P1 on that day = Assembly for ALL classes
      → That day effectively has 1 fewer teaching period
```

### 4.4 Summary Box

Sticky at the bottom of Step 1 — updates live as principal adjusts:

```
Weekly period requirements:
  Academic:  34 periods
  ECA:        6 periods (PT:3, Library:1, Drawing:2)
  Assembly:   1 period (Monday)
  ─────────────────────
  TOTAL:     41 periods per class-section per week

This will be compared against available slots in Step 2.
```

---

## 5. Step 2 — School Hours Configuration

**Purpose:** Configure the daily schedule so the system knows how many period slots are available.

### 5.1 Working Days

Checkboxes: Mon | Tue | Wed | Thu | Fri | Sat | Sun
Default: Mon–Sat checked.

### 5.2 Per-Day Configuration

For each checked day, a configuration card appears.
Saturday can have a different (shorter) schedule.

**Fields per day:**

| Field | Type | Notes |
|---|---|---|
| School start time | Time picker | e.g., 09:00 |
| School end time | Time picker | e.g., 15:40 |
| Period duration | Stepper (30–60 min) | Default 45 min |
| Short break after period | Number + duration | e.g., after P2, 10 min |
| Add another short break | [+] button | Some schools have 2 short breaks |
| Lunch after period | Number + duration | e.g., after P4, 30 min |

**Live period preview** (appears below each day card):

```
Monday schedule preview:
  P1  09:00 – 09:45
  P2  09:45 – 10:30
  ── Short Break · 10 min ──
  P3  10:40 – 11:25
  P4  11:25 – 12:10
  ── Lunch · 30 min ──
  P5  12:40 – 13:25
  P6  13:25 – 14:10
  P7  14:10 – 14:55
  P8  14:55 – 15:40

  8 teaching periods available on Monday
```

### 5.3 Slot vs Requirements Checker

Live comparison at the bottom of Step 2:

```
✅ GREEN — Sufficient slots
"This schedule gives 42 period slots per week.
 You need 41 periods. 1 slot will be a Free Period."

⚠️ AMBER — Slight deficit
"This schedule gives 38 period slots per week.
 You need 41 periods. 3 periods cannot be scheduled.
 Reduce subject requirements in Step 1 or extend school hours."

❌ RED — Critical deficit
"Only 30 slots available, 41 required.
 Timetable generation is not possible with current configuration."
```

**[Generate Timetable] button is disabled when RED.**

---

## 6. Auto-Generation Algorithm

### 6.1 Algorithm Overview

The auto-generator runs server-side (POST /api/v1/timetable/generate).
It is a Constraint Satisfaction Problem (CSP) solver designed for Indian school patterns.

### 6.2 Inputs

```
school_period_config     → slot timing per day
school_assembly_config   → assembly position and day
timetable_requirements   → what to place (subjects + ECAs + periods/week)
teacher_subject_assignments → which teacher can teach what, in which class
student_yearly_progress  → which class-sections actually exist this year
```

### 6.3 Hard Constraints (Cannot Violate — Must Resolve)

```
HC1: Teacher cannot be in two class-sections at the same day and period
HC2: Lab/double periods must always be 2 consecutive non-break slots
HC3: No subject appears twice on the same day in the same class-section
HC4: PT/Sports only placed in the FIRST or LAST period of the day
HC5: Assembly placed on the configured day and position
HC6: Break and Lunch slots are structural — no subject can be assigned there
```

### 6.4 Soft Constraints (Preferred — Can Override)

```
SC1: Heavy subjects (Mathematics, Science) preferably in morning periods
     → Place before lunch when student concentration is higher
SC2: Same subject should be spread across the week
     → Avoid all 6 Maths periods in Mon-Wed (spread to Mon/Tue/Wed/Thu/Fri/Sat)
SC3: No teacher teaching more than 5 consecutive periods without a free slot
SC4: Teacher workload ≤ 25 periods/week (AP/TS recommended maximum)
     → Warn if exceeded, but do not block generation
```

### 6.5 Algorithm Steps

```
Step 1 — Build slot matrix:
  For each class-section × each working day × each period number:
    Compute start_time and end_time
    Mark structural slots: BREAK, LUNCH, ASSEMBLY

Step 2 — Sort requirements by constraint hardness:
  Priority 1: Subjects with only 1 teacher available (most constrained)
  Priority 2: Lab/double period subjects (hardest to place consecutively)
  Priority 3: Subjects with most periods/week (most placement attempts needed)
  Priority 4: ECA with position constraints (PT: first/last only)
  Priority 5: Everything else

Step 3 — Teacher availability tracking:
  teacher_busy = Map<teacher_id, Map<day, Set<period_number>>>
  Initially empty. Updated as each slot is assigned.

Step 4 — Assignment loop (for each class-section):
  For each requirement in constraint-sorted order:

    If needs_double_period:
      Find valid consecutive pairs:
        Both slots are REGULAR (not structural)
        teacher_busy[teacher][day] does not contain either period
        Subject not yet on this day in this class
        Preferred position satisfied
      Randomly shuffle valid pairs (seed-based for reproducibility)
      Pick first valid pair → assign → mark teacher busy → update day tracking
      Repeat until double_period_count satisfied
      If no valid pair found → mark as UNASSIGNED CONFLICT (ERROR)

    Else (single period):
      Find valid single slots:
        Slot is REGULAR
        teacher_busy[teacher][day] does not contain this period
        Subject not yet on this day in this class
        Preferred position satisfied (PT: first or last only)
      Apply soft constraint scoring:
        Heavy subject + morning slot → higher score
        Subject already 3+ days this week → penalise (prefer other days)
      Sort valid slots by score → pick highest
      Assign → mark teacher busy → update day tracking
      If no valid slot found → mark as UNASSIGNED CONFLICT (ERROR)

Step 5 — Conflict detection pass:
  Verify no HC1 violations (safety check on teacher_busy)
  Check SC4: flag teachers with >25 periods/week as TEACHER_OVERLOADED (WARNING)
  Check SC2: flag subjects appearing 3+ times on same day as SUBJECT_DISTRIBUTION (WARNING)

Step 6 — Return GeneratedTimetable:
  entries: all TimetableEntry objects (including structural slots)
  conflicts: array of TimetableConflict (ERRORs and WARNINGs)
  teacher_workload: array of {teacher_id, teacher_name, periods_per_week, is_overloaded}
  slot_utilization: {total_slots, filled_slots, free_slots, conflict_slots}
```

### 6.6 The "Try Different Combination" Feature

The generation endpoint accepts an optional `seed` parameter.

```
First generation:  seed = timestamp (random)
"Try Again" click: seed = timestamp + 1

Same algorithm, different random ordering of valid slots at each step.
Produces a meaningfully different timetable.
```

### 6.7 Generation Performance

```
For a school with 10 classes × 4 sections = 40 class-sections:
  Estimated algorithm runtime: 1–3 seconds server-side
  Response size: ~1,500 TimetableEntry objects (JSON)
  Client render time: < 500ms (tab-based display)

This is entirely acceptable. Show a loading animation during generation.
```

---

## 7. The Preview Screen

### 7.1 Result Header Strip

```
0 conflicts:   ✅ Green  — "Generated successfully — 42/42 slots filled"
1–5 conflicts: ⚠️ Amber — "{n} conflicts need your attention before confirming"
>5 conflicts:  ❌ Red   — "{n} conflicts — adjust requirements or add teachers"
```

### 7.2 Conflict Panel

Each conflict shown as a card:

**ERROR (red border) — must fix before confirming:**

```
TEACHER_DOUBLE_BOOKED:
  "K. Suresh Kumar assigned to Class 10-A AND Class 9-B at Monday Period 3
   → Both cells highlighted red on the grid
   Fix: Click either cell and assign a different teacher, or reschedule"

UNASSIGNED:
  "No teacher available for Physical Science in Class 9-B
   → 2 Physical Science periods could not be scheduled
   Fix: Assign a Physical Science teacher to Class 9 in Teachers → Subjects"
```

**WARNING (amber border) — can confirm with warnings:**

```
TEACHER_OVERLOADED:
  "K. Suresh Kumar: 28 periods/week (AP/TS recommended max: 25)
   → 3 excess periods this week
   Note: This is permitted. Inform teacher or redistribute load."
```

### 7.3 Teacher Workload Summary

Table shown below the conflict panel:

| Teacher | Subject(s) | Periods/Week | Status |
|---|---|---|---|
| K. Suresh Kumar | Mathematics | 28 | ⚠️ Overloaded |
| P. Venkat Rao | Physical Science | 22 | ✅ Normal |
| S. Lakshmi Devi | English | 18 | ✅ Normal |
| T. Anand Babu | Social Studies | 20 | ✅ Normal |

### 7.4 Preview Grid

Same visual grid as the confirmed timetable view (see Section 8).

In preview mode:
- Cells are clickable for inline editing
- Changes update the preview in real-time
- Conflict panel updates on every change
- "Try Different Combination" regenerates from scratch

### 7.5 Confirm Button Rules

```
[Confirm & Publish Timetable] is:
  ENABLED when: conflict_count for ERRORs = 0
  DISABLED when: any ERROR conflicts remain unresolved
  Warnings (amber) do NOT block confirmation

On confirm:
  → POST /api/v1/timetable/confirm saves all entries to timetable_entries
  → Previous year's confirmed timetable marked as SUPERSEDED
  → FCM push to all teachers: "New timetable published for {school} — {academic_year}"
  → SmartPads receive timetable on next sync
```

---

## 8. The Timetable Grid

The core visual component. Used in both preview and confirmed view.

### 8.1 Grid Structure

```
          Monday      Tuesday     Wednesday   Thursday    Friday      Saturday
P1 9:00   [cell]      [cell]      [cell]      [cell]      [cell]      [cell]
P2 9:45   [cell]      [cell]      ...
─── Short Break (10 min) ────────────────────────────────────────────────────
P3 10:40  [cell]      ...
P4 11:25  [cell]      ...
─── Lunch (30 min) ──────────────────────────────────────────────────────────
P5 12:40  [cell]      ...
P6 13:25  [cell]      ...
P7 14:10  [cell]      ...
P8 14:55  [cell]      ...
```

Structural rows (Break, Lunch) are visually distinct:
- Gray diagonal-stripe pattern
- Label centered: "Short Break · 10 min" or "Lunch Break · 30 min"
- Not clickable — not assignable

Assembly row (if before-first-period):
- Appears as row 0, above P1
- Primary color gradient
- Label: "Assembly · 20 min · All Classes"
- Spans all columns (it's simultaneous for all classes)

### 8.2 Cell Colours

| Subject | Background | Text | Border |
|---|---|---|---|
| Mathematics | bg-blue-50 | text-blue-700 | border-blue-200 |
| Physical Science | bg-green-50 | text-green-700 | border-green-200 |
| Biological Science | bg-emerald-50 | text-emerald-700 | border-emerald-200 |
| Social Studies | bg-amber-50 | text-amber-700 | border-amber-200 |
| English | bg-purple-50 | text-purple-700 | border-purple-200 |
| Telugu | bg-orange-50 | text-orange-700 | border-orange-200 |
| Hindi | bg-rose-50 | text-rose-700 | border-rose-200 |
| PT / Sports | bg-teal-50 | text-teal-700 | border-teal-200 |
| Library | bg-violet-50 | text-violet-700 | border-violet-200 |
| Computer Lab | bg-sky-50 | text-sky-700 | border-sky-200 |
| Drawing / Art | bg-orange-50 | text-orange-600 | border-orange-200 |
| Assembly | bg-primary/10 | text-primary | border-primary/30 |
| Free Period | bg-slate-50 | text-slate-400 | dashed border-slate-200 |

**Conflict states:**

| State | Appearance |
|---|---|
| TEACHER_DOUBLE_BOOKED (ERROR) | bg-danger/15, border-2 border-danger, ⚠️ icon top-right |
| Tooltip on hover | "K. Suresh Kumar also teaching Class 9-B at this time" |
| SUBJECT_TWICE_SAME_DAY (WARNING) | amber left border |

### 8.3 Cell Content

**Filled cell:**
```
[Subject Name]         ← font-semibold, text-sm
[Teacher Surname]      ← text-xs, text-slate-600
[Room Number]          ← text-xs, text-slate-400 (if configured)
[icon]                 ← top-right corner:
                          🔬 lab/double period
                          📚 library
                          🏃 PT/sports
```

**Double Period cell:**
```
Spans 2 grid rows visually (merged cell)
Content:
  [Subject Name + "🔬 Lab"]   ← font-semibold
  [Teacher Surname]
  [Time: 10:40 – 12:10]       ← shows combined duration
  [Double Period badge]        ← small pill top-right
```

**Empty / Free cell:**
```
Light slate background, dashed border
"Free" label in slate-400, centered
Click to assign
```

### 8.4 Cell Click — EditPeriodPanel

Opens as a slide-in panel from the right (not a modal). The grid remains visible.

```
Panel header: "Monday · Period 3 · 10:40–11:25"
Class-Section: "Class 10-A" (locked — determined by active grid view)

Subject (required):
  Dropdown — all academic subjects + ECAs
  Grouped: [Academic Subjects] [ECA Activities]

Teacher (required for academic subjects, optional for some ECA):
  Dropdown — filtered to teachers assigned to this subject for this class
  Teachers busy at this day+period across other sections:
    → Shown with "(teaching 9-B)" label
    → Shown in red text if selected despite conflict
    → Not disabled — principal can choose but conflict is flagged
  If no teacher assigned to subject: "⚠️ Assign teacher first in Teachers section"

Period Type:
  ○ Regular (single period)
  ○ Lab / Double Period
    → Automatically merges this and the next period
    → Checks: is next period available?
      If not: "Next period (P4) is occupied by {subject}. Cannot extend."
    → Teacher checked for availability across both periods

Room Number: text input (optional)

[Save Changes]  [Delete / Clear]  [Cancel]
```

**Save behaviour:**
- Immediately calls PUT /api/v1/timetable/entry
- Conflict detected server-side before saving
- On conflict: returns 409 with conflict details → cell turns red, panel shows conflict info
- On success: grid updates without page reload

---

## 9. Teacher View

Toggleable from the main Class View.

```
Teacher selector: Dropdown of all active teachers

Grid layout (same structure):
  Rows: periods
  Columns: working days
  Each cell: "{class_year}-{section}" (e.g., "10-A") instead of subject
  Cell colour: subject colour (so teacher sees what they're teaching at a glance)
  Empty cells: "Free" in slate-400

Use cases:
  → Teacher reviews their own weekly schedule
  → Principal checks teacher workload distribution
  → Principal spots a teacher who has no break between periods
```

---

## 10. Printable PDF Output

### 10.1 Print Modal

```
[Print PDF] button → modal opens

"Download timetable PDF for:"
  ○ All classes (generates one PDF per class-section, zipped)
  ● Selected classes:
    [✓] Class 10-A  [✓] Class 10-B  [ ] Class 9-A  [ ] Class 9-B  ...

[Download PDF(s)]
```

### 10.2 PDF Page Design (A4 Landscape)

```
┌─────────────────────────────────────────────────────────────────┐
│ VIKAS HIGH SCHOOL                     Class Timetable — 10-A    │
│ Guntur, Andhra Pradesh                Academic Year 2025–26      │
├──────────────┬──────────┬──────────┬──────────┬──────────┬──────┤
│              │ MONDAY   │ TUESDAY  │WEDNESDAY │THURSDAY  │FRIDAY│
├──────────────┼──────────┼──────────┼──────────┼──────────┼──────┤
│P1 9:00-9:45  │[MATHS]   │[ENGLISH] │[TELUGU]  │[PHY SCI] │[MATHS│
│              │K.Suresh  │S.Lakshmi │P.Venkat  │T.Anand   │K.Sures│
├──────────────┼──────────┼──────────┼──────────┼──────────┼──────┤
│P2 9:45-10:30 │[ENGLISH] │[MATHS]   │[SOC STD] │[MATHS]   │[BIO ]│
│              │S.Lakshmi │K.Suresh  │T.Anand   │K.Suresh  │R.Priya│
├─ Break 10 min ──────────────────────────────────────────────────┤
│P3 10:40-11:25│[TELUGU]  │[PHY SCI] │[MATHS]   │[ENGLISH] │[TELUG│
...
├─────────────────────────────────────────────────────────────────┤
│ Effective from: 01 June 2026     Powered by NeuraLife             │
└─────────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Page: A4 Landscape (297mm × 210mm)
- Cell backgrounds: light pastel fills (print-safe versions of screen colours)
- Break/Lunch rows: gray diagonal stripe pattern
- Double-period cells: merged rows with border
- Font: embedded, no external dependency
- Filename: `Timetable-Class{year}-{section}-{school_code}.pdf`
- Multiple classes: individual PDFs zipped as `Timetable-{school}-{year}.zip`

---

## 11. Data Model

### 11.1 New Tables (Migration 017)

```sql
-- Per-day school hours configuration
school_period_config (
  school_id, academic_year_id, day_of_week,
  is_working_day, school_start_time, school_end_time,
  period_duration_minutes,
  short_break_after_periods INTEGER[],  -- e.g., [2] = break after P2
  short_break_duration_min,
  lunch_after_period, lunch_duration_minutes
)
UNIQUE (school_id, academic_year_id, day_of_week)

-- Assembly configuration
school_assembly_config (
  school_id, academic_year_id,
  include_in_schedule, day_of_week, duration_minutes,
  position  -- 'BEFORE_FIRST' | 'FIRST_PERIOD'
)
UNIQUE (school_id, academic_year_id)

-- Subject/ECA weekly requirements per class
timetable_requirements (
  school_id, academic_year_id, class_year,
  subject, subject_type,        -- 'ACADEMIC' | 'ECA'
  eca_category,
  periods_per_week,
  needs_double_period,
  double_period_count,
  preferred_position,           -- 'FIRST' | 'LAST' | 'ANY'
  teacher_id,                   -- for ECA with dedicated teacher
  display_name, color_hex
)
UNIQUE (school_id, academic_year_id, class_year, subject)

-- Timetable generation run history
timetable_generations (
  school_id, academic_year_id,
  generated_at, generated_by,
  status,                       -- 'DRAFT' | 'CONFIRMED' | 'SUPERSEDED'
  conflict_count, total_entries,
  generation_seed
)
UNIQUE (school_id, academic_year_id, status)
```

### 11.2 Existing Tables Used

```
timetable_entries         -- period slots (already in schema from 001)
timetable_exceptions      -- substitutions, cancellations (already in schema)
teacher_subject_assignments -- who teaches what to which class (already in schema)
student_yearly_progress   -- which class-sections exist (already in schema)
```

---

## 12. API Routes

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/timetable/config` | Get period config + requirements | PRINCIPAL, TEACHER |
| PUT | `/api/v1/timetable/config/period` | Save per-day hours config | PRINCIPAL |
| PUT | `/api/v1/timetable/config/assembly` | Save assembly config | PRINCIPAL |
| PUT | `/api/v1/timetable/config/requirements` | Save subject requirements | PRINCIPAL |
| GET | `/api/v1/timetable/status` | Has confirmed timetable? | PRINCIPAL |
| GET | `/api/v1/timetable` | Get confirmed timetable for class | ALL roles |
| GET | `/api/v1/timetable/teacher/:id` | Teacher's full week | PRINCIPAL, self |
| POST | `/api/v1/timetable/generate` | Run auto-generation | PRINCIPAL |
| POST | `/api/v1/timetable/confirm` | Save + publish timetable | PRINCIPAL |
| PUT | `/api/v1/timetable/entry` | Edit one cell | PRINCIPAL |
| DELETE | `/api/v1/timetable/entry/:id` | Clear one cell | PRINCIPAL |
| POST | `/api/v1/timetable/exception` | Add day exception | PRINCIPAL, TEACHER |

---

## 13. Conflict Types Reference

| Conflict ID | Severity | Description | Resolution |
|---|---|---|---|
| `TEACHER_DOUBLE_BOOKED` | ERROR | Same teacher in two classes at same day+period | Reassign one class to another teacher |
| `UNASSIGNED` | ERROR | No teacher available for a subject in a class | Assign teacher in Teachers module |
| `LAB_NO_CONSECUTIVE_SLOT` | ERROR | Lab subject cannot be placed as double period | Free up two consecutive slots or reduce lab count |
| `TEACHER_OVERLOADED` | WARNING | Teacher exceeds 25 periods/week | Redistribute or inform teacher |
| `SUBJECT_DISTRIBUTION` | WARNING | Subject appears 3+ times in same week cluster | Accepted, can confirm |

---

## 14. Integration Points

### 14.1 → Teacher App (React Native)
Confirmed timetable is visible in the Teacher App as the daily schedule.
On timetable confirmation: FCM push sent to all teachers.
On timetable exception: affected teacher receives FCM push.

### 14.2 → SmartPad (NeuraOS)
SmartPad reads the timetable to determine:
- Current period subject (shown on home screen)
- Auto-switching subject canvas
- Subject lock mode during class time
Sync happens on next SmartPad-to-cloud sync.

### 14.3 → Analytics
Timetable data feeds:
- Teacher performance analytics (actual vs scheduled teaching)
- Syllabus coverage tracking (which periods' content was covered)
- Attendance context (is the student absent on their PT day?)

### 14.4 → Notifications
On timetable exception (substitute teacher assigned):
- FCM push to substitute teacher: "You are covering {subject} for Class {x} Period {n} on {date}"
- FCM push to original teacher: "Your {subject} class has been covered by {substitute}"

---

## 15. Confirmed Design Decisions

| Decision | Rationale |
|---|---|
| Auto-generation server-side | Algorithm involves complex cross-class teacher tracking — server has all data; client-side is unreliable |
| Seed-based "Try Again" | Same algorithm with different random ordering = meaningfully different timetable without reconfiguring |
| No teacher blackout slots in v1 | All teachers assumed available all days. Teacher unavailability (part-time, medical) added in v2 based on school feedback |
| PT only in first or last period | Indian school standard — PT sandwiched between academics disrupts focus. Hard constraint, not soft |
| No subject twice per day | AP/TS standard and universal Indian school practice. Soft — principal can override in edit mode |
| Double periods as merged cells | Visual representation matches how teachers think about lab sessions. Prevents confusion |
| Print to A4 landscape | Every Indian school classroom has a physical timetable card on the wall. This is a high-usage feature |
| Assembly as structural slot | Assembly is not an academic period — separating it prevents confusion in period numbering |
| Teacher workload warning at 25 | AP/TS RMSA guidelines recommend max 25-30 periods/week for secondary school teachers |
| Confirm replaces entire timetable | Partial updates create version conflicts. Each confirmation is a complete new timetable for the year |

---

## 16. What This Beats in the Market

| Feature | Fedena | Campus365 | AASOKA | **NeuraLife** |
|---|---|---|---|---|
| Auto-generation with teacher conflict detection | ❌ Manual | ❌ Manual | ❌ No timetable module | ✅ Full CSP algorithm |
| Lab double-period handling | ❌ | ❌ | ❌ | ✅ Auto-consecutive |
| PT position enforcement (first/last only) | ❌ | ❌ | ❌ | ✅ Hard constraint |
| Assembly configuration | ❌ | ❌ | ❌ | ✅ Before/replace P1 |
| Live conflict highlighting | ❌ | ❌ | ❌ | ✅ Real-time red cells |
| Teacher workload summary | ❌ | ❌ | ❌ | ✅ Per teacher per week |
| "Try different combination" | ❌ | ❌ | ❌ | ✅ Seed-based regeneration |
| Push to SmartPad + Teacher App on confirm | ❌ | ❌ | ❌ | ✅ FCM push |
| Printable A4 PDF per class | Basic | Basic | ❌ | ✅ Colour-coded, designed |
| Saturday half-day different config | ❌ | ❌ | ❌ | ✅ Per-day configuration |

Every ERP in the market requires the principal to build the timetable manually.
NeuraLife builds it for them and asks only for a final review.

---

## 17. Open Questions (v2 Scope)

| Question | v2 Resolution |
|---|---|
| Teacher unavailability / blackout slots | Add `teacher_availability` table. Principals mark part-time schedules. Generator treats blackout slots as teacher_busy |
| Syllabus coverage tracking per period | Link timetable_entries to syllabus_chapters. Teacher marks which chapter they covered each period |
| Room / resource booking | Add `room` table with capacity. Prevent two classes using the same lab room simultaneously |
| Timetable diff view | When regenerating, show what changed from the previous confirmed timetable |
| AI-powered schedule optimisation | Use Bedrock to suggest optimal period ordering based on student performance data (heavy subjects when mastery is highest) |
| Student individual timetable | Show each student their specific class timetable in the Student App |

---

*Specification version: 1.0*
*Created: May 2026*
*Next: Migration 017 (timetable_builder) + API implementation + Web build prompt*
