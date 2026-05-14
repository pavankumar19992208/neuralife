# NeuraLife — Analytics & Reporting

*The intelligence layer that transforms raw platform data into decisions — for principals who manage schools, teachers who teach classes, and school chains that need outcomes to justify investment.*

---

## 1. The Analytics Philosophy

Most school software shows data. NeuraLife shows meaning.

The difference:

| What other ERPs show | What NeuraLife shows |
| --- | --- |
| "Class 10-B attendance: 87%" | "Class 10-B attendance has declined 6% over 4 weeks — correlates with exam anxiety spike in SHE-1 data" |
| "Suresh Kumar teaches Mathematics" | "Suresh Kumar's students improved 14 percentile points in Algebra — highest in the school this term" |
| "23 students have fee pending" | "Fee default rate is rising in Classes 7–8 — historically predicts dropout risk in this income bracket" |
| "SA1 results: Class average 61%" | "Class 9-A scored 19 points below predicted mastery — gap appeared 6 weeks before SA1 and was detectable" |

**The design principle for every analytics screen:**

```
Data → Pattern → Meaning → Recommended Action
```

Every chart, every number, every table in NeuraLife must answer:
**"So what do I do with this?"**

If it cannot answer that — it does not belong in the dashboard.

---

## 2. Analytics Surfaces — Who Sees What

| Surface | Audience | Update frequency | Access |
| --- | --- | --- | --- |
| **School Health Dashboard** | Principal | Hourly (key metrics), nightly (AI analysis) | Web Admin Console |
| **Class Intelligence Report** | Class Teacher | Daily | Teacher Mobile App + Web |
| **Subject Mastery Report** | Subject Teacher | Daily | Teacher Mobile App |
| **Teacher Performance Intelligence** | Principal + Teacher (own data) | Weekly | Web Admin Console |
| **Student 360° Analytics** | Class Teacher, Subject Teacher, Parent | Daily | App + Web |
| **Academic Year Report** | Principal | End of term / year | Web Admin Console |
| **School Outcome Report** | Principal, Management Trustee | Monthly | Web Admin Console |
| **Chain Analytics** | School Chain Owner / Trustee | Weekly | Chain Admin Console (v2) |
| **District / State Dashboard** | Education Officer | Weekly | Government Portal (v3) |

---

## 3. School Health Dashboard (Principal)

The principal's command centre. Opens every morning. Answers: **"What needs my attention today?"**

### 3.1 — The School Health Score

A single composite score that summarises school performance. Calculated nightly by the ML pipeline.

```
┌─────────────────────────────────────────────────────────┐
│   Sri Vidya High School              September 2025     │
│                                                          │
│         School Health Score                             │
│                                                          │
│              ██████████░░  78 / 100                    │
│                                                          │
│  ▲ +4 points from last month                           │
│                                                          │
│  What's driving this:                                   │
│  ✅ Attendance holding above 88% — strong              │
│  ✅ Secondary grade mastery improving (Class 9, 10)    │
│  ⚠️  Middle grade engagement declining (Class 7, 8)    │
│  ⚠️  Fee collection at 71% — below 80% target         │
│  ❌ 3 teachers have unlogged attendance (2 weeks)      │
└─────────────────────────────────────────────────────────┘
```

**Health Score Components:**

| Component | Weight | What it measures |
| --- | --- | --- |
| Academic Mastery | 35% | % of students MASTERED or GOOD across all calibrated subjects |
| Attendance | 20% | Average daily attendance across all classes |
| Learning Engagement | 20% | Average SmartPad active session days per student per week |
| At-Risk Resolution | 15% | % of AT_RISK students who have had a logged intervention within 7 days |
| Operational Health | 10% | Fee collection rate + teacher attendance logging + SmartPad sync rate |

**Score bands:**

| Score | Band | Principal's reaction |
| --- | --- | --- |
| 85–100 | Excellent | Maintain. Share with management. |
| 70–84 | Good | Monitor flagged areas. |
| 55–69 | Needs Attention | Principal takes active steps. |
| Below 55 | Critical | NeuraLife team follows up. |

---

### 3.2 — Daily Priority Panel

The first thing the principal sees. Built for scanning in 60 seconds.

```
Today's Priorities — Wednesday, 10 September 2025
─────────────────────────────────────────────────

🔴 REQUIRES ACTION (3)
   • Ravi Kumar (9-C) — AT_RISK in 3 subjects. No intervention logged. 11 days.
   • Class 8-B attendance not marked — P. Rao (3rd time this month)
   • PAD-0031 offline 9 days. Last student: K. Anitha (8-A)

🟡 WATCH (4)
   • Class 7 mastery declining — Social Studies. 3rd consecutive week.
   • Fee pending: 31 students. ₹93,000 outstanding > 30 days.
   • S. Lakshmi (Telugu) — 6 absent days this month. Substitute needed?
   • SmartPad OTA update: 12 devices not updated. 87% fleet current.

✅ POSITIVE (2)
   • Class 10-A: Best attendance week of the year (98%)
   • M. Suresh students: +18 percentile avg in Mathematics this term
```

Every item is tappable — opens the relevant screen.

---

### 3.3 — Mastery Overview (School-Wide)

```
Academic Mastery — All Classes — September 2025

         MASTERED  GOOD  DEVELOPING  AT_RISK
Class 10    31%    44%      18%        7%   ████████████░░░░░░░░░░
Class  9    27%    41%      22%       10%   ██████████░░░░░░░░░░░░
Class  8    24%    38%      26%       12%   █████████░░░░░░░░░░░░░
Class  7    22%    36%      28%       14%   ████████░░░░░░░░░░░░░░
Class  6    28%    43%      21%        8%   ██████████░░░░░░░░░░░░
Class  5    33%    45%      17%        5%   █████████████░░░░░░░░░
Class  1-4  38%    42%      15%        5%   ████████████████░░░░░░

Subject-wise across school:
  Mathematics     62% ≥ GOOD  ↑ +3% vs last month
  Physical Sci    58% ≥ GOOD  → stable
  Biological Sci  71% ≥ GOOD  ↑ +5% vs last month
  Social Studies  54% ≥ GOOD  ↓ -4% vs last month  ← declining ⚠️
  Telugu          67% ≥ GOOD  → stable
  English         61% ≥ GOOD  ↑ +2% vs last month

[Drill into any class]  [Drill into any subject]  [Export]
```

---

### 3.4 — Attendance Dashboard

```
Attendance — September 2025 (1–10 Sep)

School average:          88.3%  (target: 90%)
Days with > 90%:         6 of 10
Chronic absentees:       14 students (absent > 25% of days)  [View]

Class-wise today (10 Sep):
  10-A: 97%  10-B: 94%  10-C: 89%  10-D: 91%
   9-A: 93%   9-B: 88%   9-C: 84%  ← low
   8-A: 91%   8-B: NOT MARKED  ← action needed
   ...

Trend (6 months):
  Apr  May  Jun  Jul  Aug  Sep
  91%  90%  87%  85%  86%  88%  ← recovering

Absentee pattern alert:
  Mondays avg: 83%  (vs 90% rest of week) — investigate
```

---

### 3.5 — Fleet & Operations

```
SmartPad Fleet — 187 devices

Synced today:          162 (87%)
Not synced 2+ days:      9 devices  [View]
Not synced 7+ days:      3 devices  [Alert sent]
OTA model update:       87% current (163/187)  [Push to remaining]
Storage alerts:          2 devices < 500MB  [View]
Battery average:         73%
Last seen offline > 30d: 1 device  [Investigate]

Top sync issues:
  PAD-0031: Offline 9 days (K. Anitha, 8-A) — home WiFi issue?
  PAD-0088: Sync failed 12 times — HMAC error
  PAD-0112: Storage 312MB — content cache needs clearing
```

---

## 4. Teacher Performance Intelligence

This is NeuraLife's most sensitive and most powerful analytics module. Built correctly, it becomes the reason teachers want to be on this platform. Built incorrectly, it becomes a surveillance tool that kills teacher trust and destroys adoption.

### The Framing Principle

**Wrong framing:** "Which teachers are performing worst?"
**Right framing:** "Where do students need more support — and what is the teaching context driving that?"

The data is the same. The framing determines whether a teacher uses this to grow or resents the platform.

**Three rules for teacher analytics:**

1. Teachers see their own analytics fully. No surprises — they know what the principal sees.
2. Numbers are always contextualised. A teacher with low mastery in a remedial class is not failing.
3. The output is always a support recommendation, not a performance judgment.

---

### 4.1 — Teacher Intelligence Card (Principal View)

Each teacher gets a card in the principal's Teacher Analytics view:

```
K. Suresh Kumar — PGT Mathematics
Classes: 9-A, 9-B, 10-B, 10-C  |  4 years at school

STUDENT MASTERY TREND (his classes vs school average):
               His classes    School avg    vs Avg
Algebra            72%           61%         +11%  ↑
Quadratic Eq.      68%           63%          +5%  ↑
Trigonometry       54%           58%          -4%  ↓  ← gap
Geometry           71%           65%          +6%  ↑
Statistics         63%           61%          +2%  →

MASTERY VELOCITY (improvement per month, his students):
  Sep: +3.2 percentile points  (school avg: +1.8)  — above average ✅

STUDENT SESSIONS (engagement in his subject):
  Avg sessions/student/week in Mathematics: 4.2  (school avg: 3.1) ↑
  Students with 0 sessions this week: 3  [View]

AT_RISK IN HIS SUBJECT: 7 students
  Interventions logged by him: 5  (71%)  ✅
  Pending: 2 students  [Flag]

INSIGHT (AI-generated, principal-visible):
  "Suresh Kumar's students show above-average mastery gains in Algebra and
   Geometry but are consistently below average in Trigonometry. This pattern
   appears across all 4 classes he teaches — suggesting this may be a
   curriculum pacing or concept sequencing issue rather than a student
   factor. Recommend: review Trigonometry teaching approach and check if
   prerequisite concepts (coordinate geometry) are adequately covered."

→ This is a curriculum insight, not a performance criticism.
```

---

### 4.2 — School-Wide Teacher Performance Matrix

```
Teacher Intelligence Matrix — Mathematics Department

Teacher          Classes  Mastery↑  Engagement  AT_RISK  Interventions  Velocity
──────────────────────────────────────────────────────────────────────────────────
K. Suresh Kumar  4 cls    +11%      High        7         71%           +3.2/mo ↑
P. Venkat        3 cls     +4%      Medium      12        42% ⚠️        +1.1/mo →
R. Anand         2 cls     -2%      Low ⚠️      18 ❌     23% ❌        -0.8/mo ↓
S. Meena         3 cls     +8%      High        5         80%           +2.9/mo ↑

NOTE: R. Anand teaches Classes 6-7 (Foundation-Elementary band).
      Lower mastery baselines are expected for transitional grades.
      Engagement and intervention rates are the actionable signals here.
```

**Context flags the system automatically applies:**

| Context | How it adjusts the display |
| --- | --- |
| Teacher handles remedial/weaker sections | Score shown with "Remedial context" label |
| Teacher is new (< 6 months) | "New teacher — baseline period" label |
| Class had high absenteeism this month | Mastery decline flagged as "attendance-linked" |
| Subject had curriculum syllabus change | "Syllabus transition month" context |
| Teacher had extended leave | "Substitute period — 18 days" note |

---

### 4.3 — Teaching vs Curriculum Pattern Detection

The Curriculum Pattern Detector (Cloud AI Pipeline 4) runs weekly and identifies a critical distinction:

**Is a gap a teaching gap or a curriculum gap?**

```
Pattern Detected — Week of 8 Sep 2025

CURRICULUM GAP (affects multiple teachers, same topic):
  Topic: Cell Division (Biological Science, Class 9)
  Affected classes: 9-A (T. Rani), 9-B (T. Rani), 9-C (A. Priya)
  Gap rate: 71% of Class 9 students
  Pattern: Same error type across all teachers → CURRICULUM ISSUE
  Recommendation: The SCERT textbook explanation of meiosis may be
  insufficient. Consider supplementing with the animated content
  module (BIO-9-CH4-ANIMATION-2) before next class.

TEACHING PATTERN (affects one teacher, multiple topics):
  Teacher: P. Venkat (Physical Science)
  Pattern: Students consistently struggle with numerical problems
           but understand conceptual questions
  Spread: Observed across Motion, Force, Energy chapters
  Pattern: Formula application errors, not conceptual gaps → possible
           teaching gap in problem-solving methodology
  Recommendation: Suggest Venkat review how numerical problem-solving
  is scaffolded in his sessions. Share K. Suresh's approach to
  Mathematics problem steps — similar pattern, strong results.
```

This distinction is critical:

- A **curriculum gap** is not the teacher's fault — the platform flags it as a content improvement opportunity
- A **teaching pattern** is framed as a coaching opportunity, not a failure

---

### 4.4 — Teacher's Own Analytics (Teacher App View)

Teachers see their own data fully. Transparency builds trust.

```
My Class Intelligence — K. Suresh Kumar

This Month: September 2025

My students' mastery: 68% ≥ GOOD
School average:       62% ≥ GOOD
My rank (Mathematics dept): 1 of 4 teachers  ← framed positively

Where my students are strong:
  ✅ Algebra: 72% mastery  (+11% vs school avg)
  ✅ Geometry: 71% mastery (+6% vs school avg)

Where my students need more support:
  ⚠️  Trigonometry: 54% mastery (-4% vs school avg)
      Top error pattern: RATIO_CONFUSION (sin/cos/tan mixing)
      Suggestion: The animated ratio visualiser in content
      (MATH-10-CH8-ANIM-1) has helped similar gaps in other schools.

My AT_RISK students: 7
  Interventions logged: 5  ✅
  Pending action: P. Suresh, K. Anitha — [Log Intervention]

My classes' engagement:
  Avg SmartPad sessions in Math/week: 4.2  (school avg: 3.1)  ✅
  Students with zero sessions this week: 3  [View]
```

---

## 5. Student Analytics — 360° Profile

### 5.1 — Individual Student View (Teacher + Principal)

```
Arjun Reddy — NID-2025-AP-084291
Class 10-B  |  English Medium  |  SmartPad: PAD-0043

━━━ MASTERY OVERVIEW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subject          Mastery  Trend     Percentile  vs Class
Mathematics        72%     ↑+8%       64th        +6%
Physical Science   58%     ↓-4%       41st        -5%  ⚠️
Biological Science 81%     ↑+3%       78th        +9%  ✅
Social Studies     67%     →+1%       55th        +2%
Telugu             71%     ↑+5%       62nd        +4%

━━━ LEARNING BEHAVIOUR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Study Habit Score:    74/100  (Good)
Avg sessions/week:    4.8  (class avg: 3.6)  ↑ above average
Avg session duration: 32 minutes
Study start time:     Typically 7:15 PM  (consistent ✅)
Most active day:      Thursday
Least active day:     Sunday  (common)
Hint dependency:      28%  (DEVELOPING — relies on hints more than average)
Focus score (SHE-1):  0.71  (Good)

━━━ WRITING SKILLS (WSS-1) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Handwriting clarity:  0.74  (Good)
Writing speed:        18 wpm  (age-appropriate)
Spelling accuracy:    91%  (Strong ✅)
Sentence formation:   Developing

━━━ ERROR PATTERNS (GAP-1) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Active gaps:
  SIGN_ERROR (Maths/Algebra) — 14 occurrences this month  ↑
  FORMULA_CONFUSION (Phys Sci/Motion) — 8 occurrences
  UNIT_ERROR (Phys Sci) — 6 occurrences

Resolved gaps (this term):
  CARRY_ERROR (Maths) — resolved ✅ (3 weeks ago)
  PHONETIC_SPELLING (Telugu) — resolved ✅

━━━ ATTENDANCE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This month:  91%  (20/22 days present)
This year:   89%  (on track)
Absent days: 2 (both Mondays — pattern worth noting)

━━━ INTERVENTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Last intervention: 3 Sep — K. Suresh Kumar logged:
  "Extra practice given for sign errors in Algebra. Parent informed."
Parent meeting: None scheduled
Counsellor note: None

━━━ PREDICTIONS (ML Calibration) ━━━━━━━━━━━━━━━━━━━━━━━━━

SA1 readiness (current trajectory):
  Mathematics:      B+ (73–80) — on track
  Physical Science: C+ (55–62) — needs intervention ⚠️
  Biological Sci:   A  (81–90) — strong
```

---

### 5.2 — Cohort Analytics (Class-Level)

```
Class 10-B — Academic Intelligence
Class Teacher: K. Suresh Kumar  |  42 students

MASTERY DISTRIBUTION:
  MASTERED    ████████░░░░░░░░░░░░  8 students (19%)
  GOOD        ████████████████░░░░  18 students (43%)
  DEVELOPING  ████████░░░░░░░░░░░░  10 students (24%)
  AT_RISK     ████░░░░░░░░░░░░░░░░  6 students (14%)  ⚠️

TOP 5 COMMON ERROR PATTERNS IN CLASS 10-B:
  1. SIGN_ERROR (Algebra)              22 students (52%)  ← teaching focus needed
  2. FORMULA_CONFUSION (Physics)       18 students (43%)
  3. MISSING_UNITS (Physics/Chemistry) 14 students (33%)
  4. DIAGRAM_MISLABELLING (Biology)     8 students (19%)
  5. ESSAY_STRUCTURE (English)          7 students (17%)

INSIGHT:
  "52% of Class 10-B has SIGN_ERROR in Algebra — this is a class-wide
   pattern, not individual. Recommend: one focused 20-minute revision
   session on sign rules in equation solving before moving to Quadratic
   Equations. Use MATH-10-CH3-ANIM-3 (sign rule animation)."

CROSS-SUBJECT CORRELATION:
  Students struggling in Mathematics also show lower Physical Science
  mastery in 83% of cases — these share formula manipulation skills.
  Addressing Maths gaps may cascade to Physics improvement.

STUDENTS NEEDING PRIORITY ATTENTION:
  AT_RISK (6 students):
    P. Suresh    — 3 subjects AT_RISK, no improvement 3 weeks
    K. Anitha    — Physical Science critical, SmartPad offline
    R. Praveen   — Attendance + mastery both declining
    [+ 3 more]   [View all]
```

---

## 6. Academic Year Reports

### 6.1 — Term Report (End of FA/SA)

Generated automatically when exam marks are entered:

```
FA2 Performance Report — Class 10  — August 2025

                 School Avg   Last Term   Change
Mathematics         61%          57%       +4%  ↑
Physical Science    58%          61%        -3% ↓ ⚠️
Biological Science  69%          65%       +4%  ↑
Social Studies      55%          58%        -3% ↓ ⚠️
Telugu              67%          64%       +3%  ↑

PREDICTION ACCURACY CHECK:
  NeuraLife predicted range vs actual score (sample):
  Arjun Reddy:  Predicted 73–80 Maths  →  Actual 76  ✅ accurate
  P. Suresh:    Predicted 40–48 Phys   →  Actual 38  ✅ accurate
  K. Anitha:    Predicted 55–62 Phys   →  Actual 71  ⚠️ under-predicted
    Note: K. Anitha's SmartPad was offline 9 days — insufficient data

STUDENTS WHO OUTPERFORMED MASTERY PREDICTION (top 5):
  These students may have received external tutoring or
  additional home support not captured on platform.
  [K. Anitha, P. Meghana, T. Srinivas, R. Kavya, S. Arjun]

STUDENTS WHO UNDERPERFORMED PREDICTION (concern):
  Mastery suggested better performance — review if exam anxiety,
  health issues, or one-time circumstances affected result.
  [M. Ravi, K. Priya, P. Charan]  [Trigger counsellor review]

CLASS COMPARISON (all 10th sections — same school):
  10-A: 67% avg  10-B: 61% avg  10-C: 63% avg  10-D: 58% avg ⚠️
  10-D consistently underperforms — teaching and student factors combined.
  [View 10-D analysis]
```

---

### 6.2 — Annual School Outcome Report

The document a principal shares with school management and trustees. Generated on March 31.

```
Annual Outcome Report — Sri Vidya High School — 2024-25

HEADLINE NUMBERS:
  Total students:     624  |  New admissions: 89  |  Transfers out: 12
  Overall mastery:    64% ≥ GOOD  (↑ from 58% in 2023-24)
  Board exam results: [entered manually — SSC results typically in May]
  Attendance avg:     88.4%
  SmartPad adoption:  94% active (587/624 students using regularly)

MASTERY IMPROVEMENT:
  Students who improved by ≥ 10 percentile this year: 284 (46%)
  Students who declined by ≥ 10 percentile:            43  (7%)
  AT_RISK students who moved to GOOD/MASTERED:          67 of 112 (60%)

MOST IMPROVED SUBJECTS:
  1. Mathematics:      +6.4% avg mastery YoY
  2. Biological Sci:   +5.1% avg mastery YoY
  3. English:          +3.8% avg mastery YoY

SUBJECTS NEEDING ATTENTION NEXT YEAR:
  Social Studies:      -1.2% YoY — curriculum review recommended
  Physical Science:    +0.4% YoY — marginal improvement only

TEACHER HIGHLIGHTS:
  Most mastery improvement generated: K. Suresh Kumar (Mathematics)
  Highest student engagement: S. Meena (Telugu)
  Most interventions logged: R. Priya (Class Teacher 10-A)

NeuraLife PLATFORM IMPACT:
  Sessions captured:         38,492  (avg 61/student)
  Error patterns resolved:   1,284 unique gaps closed
  AT_RISK alerts triggered:  312  |  Resolved within 7 days: 71%
  Content pieces delivered:  4,891 chapter completions
  Parent app engagement:     78% of parents opened insights weekly

[Download PDF]  [Share with Management]  [Compare to District Avg — v3]
```

---

## 7. School Outcome Report (Sales Tool)

This report is designed for one specific purpose: **helping a principal sell NeuraLife to their management board**, and helping NeuraLife sell to the next school.

```
NeuraLife Impact Summary — Sri Vidya High School — Year 1

BEFORE NEURALIFE (baseline, from enrollment data):
  AT_RISK students identified per term: ~8 (by teacher intuition)
  Average time to identify a struggling student: 4–6 weeks
  Parent awareness of child's learning: Exam results only (2× per year)
  Teacher insight on class gaps: None — subjective

AFTER NEURALIFE (year 1):
  AT_RISK students identified per term: 112 (AI-detected, early)
  Average time to identify: 3.2 days from gap emergence
  Parent receives learning update: Daily (78% engagement)
  Teacher sees class-wide gap patterns: Weekly, subject-specific

OUTCOME METRICS:
  Students who improved ≥ 1 grade band: 284 (46%)
  Teacher time saved (admin + attendance): ~45 min/teacher/day
  Parent satisfaction surveys: 4.2/5.0 (from Parent App feedback)
  Fee collection rate improvement: +11% (automated reminders)
  SmartPad usage: 94% active students

ROI FOR SCHOOL:
  Old ERP cost (Tally + management software): ₹60,000/year
  Old learning platform (if any): ₹0–80,000/year
  NeuraLife total cost: ₹[subscription]
  Net saving + learning improvement: [calculated in Business Model]

WHAT OTHER SCHOOLS IN OUR NETWORK ACHIEVED:
  (aggregated, anonymised — visible as benchmarks)
  Average mastery improvement Year 1: +8.2%
  AT_RISK identification rate: 3× faster than without platform
  Teacher adoption: 91% weekly active (national EdTech avg: 34%)
```

---

## 8. District / Government Analytics (v3)

### District Education Officer Dashboard

```
Kurnool District — Learning Outcomes Dashboard — Q2 2025-26

Schools on NeuraLife:         47 of 312  (15%)
Total students tracked:       18,432
Total sessions captured:      8,84,291 this quarter

DISTRICT MASTERY MAP:
  Mandal-wise average mastery (Class 10):
    Kurnool Urban:   68%  ██████████████
    Nandyal:         61%  ████████████░
    Adoni:           57%  ███████████░░  ← below district avg
    Yemmiganur:      54%  ██████████░░░  ← needs attention
    Alur:            71%  ██████████████ ↑

AT-RISK RATES BY MANDAL:
  Adoni:       18% AT_RISK  (district avg: 11%)
  Yemmiganur:  21% AT_RISK  ← recommend intervention support

SUBJECT WEAKNESS (district-wide pattern):
  Social Studies: 71% of schools show below-average mastery  ← curriculum issue?
  Physical Science: 63% of schools show gap in numerical problems

TEACHER DEPLOYMENT GAP:
  Schools with no dedicated Mathematics teacher (Class 9-10): 8 schools
  → Recommendation: District deputation of 3 mathematics specialists

GOVERNMENT SCHOOL VS PRIVATE SCHOOL:
  Government schools avg mastery: 54%
  Private schools avg mastery:    67%
  Gap: 13 percentile points  (unchanged from last year)
  → NeuraLife schools (govt): 58%  — 4 points above non-NeuraLife govt schools
```

**Reporting exports for government:**

- Monthly attendance aggregate (DSE reporting format)
- Term-wise mastery by mandal (district review meetings)
- AT_RISK intervention rates (welfare scheme targeting)
- Infrastructure gap report (schools needing SmartPad expansion)

---

## 9. Reporting Exports

Every analytics screen includes exports. Format options:

| Format | Use case |
| --- | --- |
| PDF | Principal shares with management. Print-ready with school branding. |
| Excel | Admin team for further analysis. Pivot table friendly. |
| CSV | Integration with other systems (rare in v1, relevant in v3). |
| Shareable link | Principal shares a read-only view with trustee (v2). |

**Report scheduler (v2):**

```
Auto-generate and email to principal:
  → Monthly fee collection report (1st of month, 8 AM)
  → Monthly mastery summary (1st of month, 8 AM)
  → Term academic report (after FA/SA marks entry complete)
  → Annual outcome report (April 1)
```

---

## 10. Analytics Database Schema

```sql
-- ════════════════════════════════════════
-- SCHOOL HEALTH SCORE
-- ════════════════════════════════════════

CREATE TABLE school_health_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           TEXT REFERENCES schools(id),
  computed_date       DATE NOT NULL,
  overall_score       NUMERIC NOT NULL,       -- 0 to 100
  mastery_score       NUMERIC,                -- component scores
  attendance_score    NUMERIC,
  engagement_score    NUMERIC,
  at_risk_resolution  NUMERIC,
  operational_score   NUMERIC,
  score_delta_30d     NUMERIC,                -- change from 30 days ago
  band                TEXT NOT NULL,          -- EXCELLENT | GOOD | NEEDS_ATTENTION | CRITICAL
  driver_positives    TEXT[],                 -- what is working
  driver_negatives    TEXT[],                 -- what needs attention
  UNIQUE(school_id, computed_date)
);

-- ════════════════════════════════════════
-- TEACHER PERFORMANCE SNAPSHOTS
-- ════════════════════════════════════════

CREATE TABLE teacher_performance_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id          UUID REFERENCES teachers(id),
  school_id           TEXT NOT NULL,
  snapshot_month      TEXT NOT NULL,          -- '2025-09'
  subject             TEXT NOT NULL,
  classes_taught      TEXT[],
  student_count       INTEGER,
  avg_mastery_score   NUMERIC,
  vs_school_avg       NUMERIC,                -- delta from school mean
  mastery_velocity    NUMERIC,                -- percentile points/month
  engagement_rate     NUMERIC,                -- avg sessions/student/week
  at_risk_count       INTEGER,
  intervention_rate   NUMERIC,                -- % AT_RISK with logged intervention
  context_flags       TEXT[],                 -- REMEDIAL_CLASS | NEW_TEACHER | HIGH_ABSENTEEISM
  ai_insight          TEXT,                   -- Claude-generated pattern insight
  computed_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, snapshot_month, subject)
);

-- ════════════════════════════════════════
-- CURRICULUM PATTERN DETECTIONS
-- ════════════════════════════════════════

CREATE TABLE curriculum_patterns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           TEXT NOT NULL,
  detected_at         TIMESTAMPTZ DEFAULT NOW(),
  pattern_type        TEXT NOT NULL,          -- CURRICULUM_GAP | TEACHING_PATTERN | PREREQUISITE_CASCADE
  subject             TEXT NOT NULL,
  topic               TEXT NOT NULL,
  class_year          INTEGER,
  affected_class_count INTEGER,
  affected_student_pct NUMERIC,
  teachers_involved   UUID[],
  error_patterns      TEXT[],
  ai_recommendation   TEXT,
  status              TEXT DEFAULT 'OPEN',    -- OPEN | ACKNOWLEDGED | RESOLVED
  acknowledged_by     UUID,
  acknowledged_at     TIMESTAMPTZ,
  resolution_note     TEXT
);

-- ════════════════════════════════════════
-- SCHOOL OUTCOME SNAPSHOTS (for sales reports)
-- ════════════════════════════════════════

CREATE TABLE school_outcome_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           TEXT REFERENCES schools(id),
  snapshot_type       TEXT NOT NULL,          -- MONTHLY | TERM | ANNUAL
  period              TEXT NOT NULL,          -- '2025-09' | '2025-FA2' | '2024-25'
  total_students      INTEGER,
  active_smartpad_pct NUMERIC,
  avg_mastery_score   NUMERIC,
  mastery_delta_yoy   NUMERIC,
  at_risk_pct         NUMERIC,
  at_risk_resolved_pct NUMERIC,
  attendance_avg      NUMERIC,
  parent_engagement_pct NUMERIC,
  sessions_total      INTEGER,
  errors_resolved     INTEGER,
  teacher_active_pct  NUMERIC,
  fee_collection_rate NUMERIC,
  computed_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, snapshot_type, period)
);

-- ════════════════════════════════════════
-- PREDICTION ACCURACY LOG
-- (tracks how well ML predictions match exam results)
-- ════════════════════════════════════════

CREATE TABLE prediction_accuracy_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id            TEXT REFERENCES students(neura_id),
  school_id           TEXT NOT NULL,
  subject             TEXT NOT NULL,
  exam_name           TEXT NOT NULL,
  predicted_low       NUMERIC,
  predicted_high      NUMERIC,
  actual_score        NUMERIC,
  within_range        BOOLEAN,
  delta               NUMERIC,
  notes               TEXT,                   -- OFFLINE_PERIOD | EXTERNAL_TUTORING
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 11. Analytics API Routes

```
-- School Health
GET    /analytics/school/:schoolId/health-score
GET    /analytics/school/:schoolId/health-score/history

-- Mastery Analytics
GET    /analytics/school/:schoolId/mastery/overview
GET    /analytics/school/:schoolId/mastery/by-class
GET    /analytics/school/:schoolId/mastery/by-subject
GET    /analytics/school/:schoolId/mastery/trends

-- Teacher Analytics
GET    /analytics/school/:schoolId/teachers/performance
GET    /analytics/teachers/:teacherId/performance
GET    /analytics/school/:schoolId/curriculum-patterns

-- Student Analytics
GET    /analytics/students/:neuraId/360
GET    /analytics/classes/:classId/cohort

-- Attendance Analytics
GET    /analytics/school/:schoolId/attendance/overview
GET    /analytics/school/:schoolId/attendance/chronic-absentees

-- Fee Analytics
GET    /analytics/school/:schoolId/fees/overview
GET    /analytics/school/:schoolId/fees/defaulters

-- Fleet Analytics
GET    /analytics/school/:schoolId/fleet/health

-- Outcome Reports
GET    /analytics/school/:schoolId/reports/term/:period
GET    /analytics/school/:schoolId/reports/annual/:year
GET    /analytics/school/:schoolId/reports/outcome
POST   /analytics/school/:schoolId/reports/schedule

-- District (v3 — government API key required)
GET    /analytics/district/:districtId/overview
GET    /analytics/district/:districtId/mandal-map
GET    /analytics/district/:districtId/export/:format
```

---

## 12. Version Milestones

### v1 — Demo Ready (Full Build)

| Component | Build |
| --- | --- |
| School Health Score | Nightly computation, 5-component score, driver analysis |
| Daily Priority Panel | Principal home screen — actions, watch items, positives |
| Mastery Overview — school-wide | By class, by subject, trend lines |
| Attendance Dashboard | Class-wise, chronic absentees, trend |
| Student 360° Profile | Full view — mastery, behaviour, writing, errors, attendance |
| Cohort Analytics | Class-level mastery distribution, top error patterns, AI insight |
| Teacher Performance Card | Principal view of each teacher — mastery delta, engagement, intervention rate |
| Teacher Self-Analytics | Teacher sees own data in Teacher App |
| Context flags | Remedial class, new teacher, high absenteeism — all auto-applied |
| Fleet Health | Sync status, OTA rollout, storage alerts |
| FA/SA Term Report | Auto-generated on marks entry |
| School Outcome Report (v1) | Key metrics for sales conversations |
| PDF export | All major reports |
| School Health Score history | 6-month trend |

### v2 — Post First School Deal

| Addition | Notes |
| --- | --- |
| Curriculum Pattern Detector (weekly) | Teaching gap vs curriculum gap identification |
| Teacher Performance Matrix | Department-level comparison with context flags |
| Prediction Accuracy Log | Track ML prediction vs actual exam results |
| Report scheduler (auto-email) | Monthly + term + annual auto-delivery |
| Shareable read-only report links | Principal shares with trustees |
| Chain analytics | Multi-branch consolidated view for school chains |
| Parent satisfaction surveys | In-app feedback, NPS score |
| Excel export — all reports | Admin-level data download |

### v3 — Scale

| Addition | Notes |
| --- | --- |
| District / Government Dashboard | Mandal-wise, district-wide, government reporting format |
| State Analytics Portal | AP/TS education department view |
| School benchmarking (opt-in) | School-to-school comparison within district |
| Predictive analytics | "This school is trending toward 15% AT_RISK in January" |
| Board exam correlation | SSC results vs NeuraLife mastery prediction accuracy |
| National curriculum gap analysis | Pattern detection across all states/boards |

---

## 13. Confirmed Decisions

| Decision | Rationale |
| --- | --- |
| School Health Score as single composite metric | Principals cannot process 20 numbers every morning. One score with driver breakdown is actionable. |
| Teacher analytics: framed as student support, not teacher evaluation | Framing determines adoption. Teachers who feel surveilled stop using the platform. Teachers who feel supported improve. |
| Context flags auto-applied to teacher metrics | Remedial class, new teacher, high absence — without context, metrics mislead. With context, they guide. |
| Teachers see their own data fully — no surprises | Transparency builds trust. Teachers should never learn something about their class from the principal first. |
| Teaching gap vs curriculum gap distinction | Blaming a teacher for a textbook problem destroys trust. The ML pipeline distinguishes these — principals act correctly as a result. |
| Prediction accuracy tracked against actual exam results | Closes the ML feedback loop. If predictions are systematically off, calibration needs retraining. |
| Outcome report designed for school management boards | The principal's reporting audience is their management trustee, not NeuraLife. Report must serve that conversation. |
| District analytics as v3 only | Requires 10+ schools in a district. Government partnership needed for data sharing consent. Not a demo priority. |
| AT_RISK resolution rate as health score component | Identifies schools where teachers receive alerts but don't act. Drives accountability without naming names. |

## 14. Open Questions

| Question | Impact | Recommended action |
| --- | --- | --- |
| Teacher performance data — do teachers consent at onboarding? | Legal and trust requirement. Teachers should know what is measured. | Add teacher consent note at onboarding: "Your teaching data, including student mastery outcomes, is shared with your principal to support your professional development." Consent recorded. |
| Health Score weightings — are these correct for Indian schools? | Score must feel fair and representative to principals | Validate with 3–5 principals during first school visits. Adjust weights based on feedback. Revisit after 3 months of data. |
| Can a parent see their child's position in the class rank? | Parents may push for ranking. But ranking can harm mental health in younger students. | v1: No ranking visible to parents. Percentile shown as "in the top 25% of students nationally" — not "rank 11 in class." Review in v2. |
| Should teachers be able to annotate their own performance data? | Teacher adds context: "This month I had leave for 5 days" | v2: Teacher can add a note to any snapshot. Note visible alongside data to principal. Prevents data being misread. |
| Government data sharing consent — which entity signs? | v3 district analytics requires data sharing agreement | School principal signs data sharing addendum in contract. Covers aggregated, anonymised data only for government. No individual student data. |

---

*Next document: **Segment 16 — Business Model***