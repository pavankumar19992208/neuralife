# NeuraLife — Onboarding Flow, Student Admission & School Operations

*The complete specification for how a school joins NeuraLife, how students are admitted, how teachers are onboarded, and how the school's fee collection and salary operations run — designed to replace school ERPs and be more insightful than Tally.*

---

## Document Structure

This document covers three operational pillars:

- **Section A — School Onboarding:** How a NeuraLife team member walks a school from first visit to fully live on the platform
- **Section B — Student Admission & Teacher Management:** How schools manage their people — matching real Indian school workflows
- **Section C — Fee & Salary Management:** The financial operations module — fee collection, salary structure, payslip generation, and full payroll (v2)

---

# SECTION A — SCHOOL ONBOARDING

## A1. The Onboarding Journey

```
NeuraLife team visits school
        ↓
Demo session with principal (30–45 minutes)
        ↓
Principal agrees → Onboarding begins same visit
        ↓
NeuraLife team opens Super Admin panel on laptop
        ↓
School registered on platform (15–20 minutes)
        ↓
Principal receives login credentials immediately
        ↓
School setup wizard runs (principal + NeuraLife team together)
        ↓
Academic structure configured
        ↓
First teachers enrolled (IT admin + principal)
        ↓
SmartPad delivery timeline confirmed
        ↓
School is LIVE — ready for student enrollments
        ↓
NeuraLife team leaves setup guide + support contact
        ↓
First student enrollments begin (school admin team)
        ↓
SmartPads delivered and assigned
        ↓
First student session captured
        ↓
NeuraLife follow-up visit (Day 7 and Day 30)
```

**Total time from visit to first student session:** 3–7 days (depending on SmartPad delivery)

---

## A2. NeuraLife Super Admin — School Registration

The NeuraLife team member uses the Super Admin panel (separate from the school's admin panel) to register new schools.

### Step 1 — School Identity

```
┌─────────────────────────────────────────────────────────────┐
│  Register New School                              Step 1/5  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  School Full Name *         [                             ]  │
│  UDISE Code *               [          ]  [Verify ↗]        │
│  Board Affiliation *        [SCERT AP ▼]                    │
│  Affiliation Number         [                             ]  │
│  School Type *              [Private ▼]                     │
│  Establishment Year         [    ]                          │
│  Recognition Status         [Recognised ▼]                  │
│  Medium of Instruction *    [English ▼] [Telugu ▼] [Both ▼] │
│  Shifts                     [Single ▼]                      │
│                                                              │
│  District *                 [           ▼]                   │
│  Mandal *                   [           ▼]                   │
│  Full Address *             [                             ]  │
│  Pincode *                  [      ]                         │
│                                                              │
│                                          [Next: Contact →]  │
└─────────────────────────────────────────────────────────────┘
```

**UDISE Verify button:** Calls the government's UDISE+ API to auto-fill school name and district — confirms the school is legitimate. If UDISE+ API is unavailable, field is manual with note "Verification pending."

### Step 2 — Principal & Contact Details

```
Principal Name *             [                             ]
Principal Mobile *           [+91                         ]  ← OTP auth
Principal Email *            [                             ]
School Phone                 [                             ]
School Email                 [                             ]
School Website               [                             ] (optional)
GPS Coordinates              [Auto-detect] or [Enter manually]
```

### Step 3 — Academic Structure

This is the most important configuration step. It defines the shape of the school.

```
Academic Year *              [2025-26 ▼]
Classes Offered *            [☑1 ☑2 ☑3 ☑4 ☑5 ☑6 ☑7 ☑8 ☑9 ☑10 ☐11 ☐12]

For each selected class, configure sections:
─────────────────────────────────────────────
Class 9:   Sections [A] [B] [C] [+ Add]   Avg strength per section: [45]
Class 10:  Sections [A] [B] [C] [D]       Avg strength per section: [42]
...

Working Days *               [☑Mon ☑Tue ☑Wed ☑Thu ☑Fri ☑Sat ☐Sun]
School Start Time *          [09:00]   End Time * [04:00 PM]
Academic Year Start *        [June]    End *      [March]

Exam Pattern *               [FA + SA (SCERT Pattern) ▼]
  → FA1, FA2, SA1, SA2 auto-configured for SCERT
  → Custom for CBSE: Term 1, Term 2

Grading System *             [Marks (0-100) ▼]
```

**Smart defaults:** Selecting SCERT AP board auto-sets:

- Working days: Monday–Saturday
- Exam pattern: FA1 + FA2 + SA1 + SA2
- Academic year: June–March
- Grading: Marks 0–100 with grade bands (A+, A, B+, B, C, D, F)

### Step 4 — NeuraLife Contract & SmartPad

```
Contract Start Date *        [          ]
Plan *                       [Growth ▼]  → see Business Model
Total Students (estimated) * [     ]     → for SmartPad procurement
SmartPad Model               [Standard (Android Tablet) ▼]
SmartPad Delivery Mode       [School Fleet (school pays) ▼]
                              or [Student Purchase (per student fee) ▼]
                              or [Both]

Payment Terms *              [Annual ▼]
Authorised Signatory Name *  [                             ]
Contract Reference #         [Auto-generated: NL-SCH-2025-0142]
```

### Step 5 — Review & Activate

```
Review all details →
  [✓] School identity confirmed
  [✓] Academic structure configured
  [✓] Contract details captured

[Activate School]

On activation:
  → school_id generated: SCH-AP-00142
  → Principal account created in Supabase Auth
  → OTP sent to principal's mobile: "Welcome to NeuraLife. Your school SCH-AP-00142
    is now active. Log in at neuralife.in"
  → Welcome email sent: credentials + setup guide PDF + support contact
  → NeuraLife Super Admin sees school in their dashboard
```

---

## A3. School Setup Wizard (Principal's First Login)

When the principal logs in for the first time, a guided setup wizard runs. This is completed together with the NeuraLife team member during the onboarding visit.

### Wizard Step 1 — Holidays Calendar

```
Set your school's holiday calendar for 2025-26:

Public Holidays (auto-loaded from AP/TS government calendar):
  [✓] Independence Day — Aug 15
  [✓] Gandhi Jayanti — Oct 2
  [✓] Dussehra — Oct 2-4
  [✓] Diwali — Oct 20-21
  ... (full list)

Add school-specific holidays:
  [+ Add Holiday]   Name: [Annual Day]   Date: [Dec 15]
  [+ Add Holiday]   Name: [Sports Day]   Date: [Jan 10]

Working day count (auto-calculated): 218 days
```

### Wizard Step 2 — Fee Structure Configuration

*(Full detail in Section C)*

```
Configure your school's fee structure.
This will be used for all student fee calculations.

[Configure Fee Structure →]
```

### Wizard Step 3 — First Teacher (IT Admin / Office Admin)

Before teachers can be added in bulk, one admin user must be set up:

```
Add your school's office admin or IT coordinator:

Name *          [                    ]
Mobile *        [+91                 ]   ← will receive OTP login
Employee ID     [                    ]
Role *          [School Admin ▼]

[Add Admin]
→ OTP sent to admin's mobile
→ Admin can now log into Web Admin Console and continue setup
```

### Wizard Step 4 — Complete

```
✅ School profile configured
✅ Holiday calendar set
✅ Fee structure set
✅ First admin added

Your school is ready. Next steps:
  → Add teachers (Teacher Management)
  → Enroll students (Student Admission)
  → Assign SmartPads (Fleet Management)

[Go to Dashboard]
```

---

## A4. What NeuraLife Provides to School at Onboarding

| Deliverable | Format | When |
| --- | --- | --- |
| School ID (SCH-AP-00142) | On screen + welcome email | Immediately on activation |
| Principal login (OTP-based) | OTP to principal's mobile | During onboarding session |
| Admin panel URL | Welcome email | Immediately |
| Setup guide | PDF — printed + emailed | During visit |
| NeuraLife support contact | WhatsApp + email, printed card | During visit |
| Student bulk enrollment Excel template | Download from admin panel | During setup wizard |
| SmartPad delivery timeline | Verbal + email confirmation | Based on stock |
| Day 7 follow-up call | Scheduled before leaving | — |
| Day 30 review visit | Scheduled before leaving | — |

---

# SECTION B — STUDENT ADMISSION & TEACHER MANAGEMENT

## B1. Student Admission — Two Flows

### Flow 1 — New Academic Year Bulk Enrollment (June)

500 students cannot be entered one by one. The CSV import path handles this:

```
Step 1: Admin downloads Excel template from admin panel
  → Template has all required columns with dropdown options
  → Color-coded required vs optional fields
  → Sample rows included for reference
  → Telugu column headers available (toggle)

Step 2: School fills template offline
  → Data entry by admin staff over 1–2 days
  → Template validates dropdowns (no free-text errors)

Step 3: Admin uploads completed Excel
  → POST /api/v1/schools/{school_id}/students/import
  → System validates every row:
      ✓ Required fields present
      ✓ Date formats correct
      ✓ Mobile numbers 10 digits
      ✓ Class year within school's configured classes
      ✓ Section exists in school's configuration
      ✓ Duplicate Aadhaar hash check
  → Preview screen: shows all rows with validation status
      GREEN: Ready to import
      AMBER: Warning (missing optional field) — can proceed
      RED: Error — must fix before this row imports

Step 4: Admin confirms import
  → All GREEN + AMBER rows imported
  → RED rows: downloadable error report
  → Import summary: "487 students imported successfully. 13 rows had errors."
  → NeuraIDs generated for all imported students
  → Parent SMS sent: "Your child {name} is enrolled at {school}.
    Download NeuraLife app: [link]"
```

**Excel Template Columns:**

| Column | Required | Format | Notes |
| --- | --- | --- | --- |
| student_name | ✅ | Text | As per birth certificate |
| date_of_birth | ✅ | DD/MM/YYYY | — |
| gender | ✅ | Male/Female/Other | Dropdown |
| class_year | ✅ | 1–10 | Dropdown |
| section | ✅ | A/B/C/D | Must match school config |
| admission_number | ✅ | Text | School's own number |
| medium | ✅ | English/Telugu | Dropdown |
| father_name | ✅ | Text | — |
| parent_mobile | ✅ | 10 digits | Primary contact |
| mother_name | Optional | Text | — |
| mother_mobile | Optional | 10 digits | — |
| aadhaar_number | Optional | 12 digits | Hashed before storage |
| caste_category | Optional | General/SC/ST/OBC/EWS | For fee concession |
| blood_group | Optional | A+/A-/B+/B-/O+/O-/AB+/AB- | Medical |
| address | Optional | Text | For transport |
| transport_required | Optional | Yes/No | Bus route assignment |
| previous_school | Optional | Text | Transfer students |
| tc_number | Optional | Text | Transfer Certificate |
| fee_category | Optional | General/Concession/Free | For fee structure |

### Flow 2 — Individual Admission (Mid-Year)

The fast-form for admitting one student at a time:

**Tab 1 — Personal Details**

```
Student Full Name *      [                              ]
Date of Birth *          [  DD / MM / YYYY  ]
Gender *                 ( ) Male  ( ) Female  ( ) Other
Blood Group              [A+ ▼]
Aadhaar Number           [            ] ← hashed on save
Caste Category           [General ▼]
Photo                    [Upload] (optional, v2 scan)
```

**Tab 2 — Academic Details**

```
Admission Number *       [          ]  [Auto-generate]
Class *                  [10 ▼]
Section *                [B ▼]        (available sections shown)
Medium *                 [English ▼]
Academic Year *          [2025-26]     (auto-filled)
Admission Type *         ( ) New Student  ( ) Transfer
  If Transfer:
    Previous School      [                              ]
    TC Number            [          ]
    TC Date              [  DD / MM / YYYY  ]
    Previous Class       [9 ▼]
    Previous Final Marks [    ] / [    ]
```

**Tab 3 — Family Details**

```
Father's Name *          [                              ]
Father's Occupation      [                              ]
Father's Mobile *        [+91                          ]
Mother's Name *          [                              ]
Mother's Mobile          [+91                          ]
Parent Email             [                              ]
Annual Income            [          ] ← for concession eligibility
Address *                [                              ]
Emergency Contact Name   [                              ]
Emergency Mobile         [+91                          ]
```

**Tab 4 — Transport**

```
Bus Required?            ( ) Yes  ( ) No
  If Yes:
    Route                [Route 3 — Dilsukhnagar ▼]
    Pickup Point         [Main Road Bus Stop ▼]
    Bus Fee              ₹800/month (auto-filled from fee structure)
```

**Tab 5 — Documents Checklist**

```
Physical documents collected: (mark as received)

[ ] Birth Certificate
[ ] Aadhaar Card (Student)
[ ] Aadhaar Card (Parent)
[ ] Transfer Certificate         TC Number: [         ]
[ ] Study Certificate
[ ] Caste Certificate
[ ] Address Proof
[ ] Passport Photos (4 nos)
[ ] Previous Class Marks Memo
[ ] Medical Certificate (if any)

Pending documents: [Add note about missing docs]
Document collection deadline: [  DD / MM / YYYY  ]
```

**Tab 6 — Fee & SmartPad**

```
Fee Category *           [General ▼]  (affects applicable fees)

Fees applicable for this student (from fee structure):
  Admission Fee (one-time)          ₹ 5,000
  Tuition Fee (monthly)             ₹ 2,500
  Development Fee (annual)          ₹ 3,000
  NeuraLife Subscription (monthly)  ₹   500
  SmartPad (one-time)               ₹ 8,000  ← if student-purchase model
  Exam Fee (per FA/SA)              ₹   300
  ─────────────────────────────────────────
  Payable at Admission              ₹13,000  (admission + development + SmartPad)
  Monthly from July onwards         ₹ 3,000  (tuition + NeuraLife)

Payment collected today:
  Amount *    [         ]
  Mode *      ( ) Cash  ( ) UPI  ( ) Cheque  ( ) NEFT/IMPS
  Reference   [         ]   (UPI transaction ID or cheque number)
  Receipt     [Generate Receipt]

SmartPad Assignment:
  ( ) Assign from school fleet     [PAD-0043 ▼]  (if school-owned)
  ( ) Student purchased — generate SmartPad order
  ( ) Assign later (SmartPad pending delivery)
```

**Admission Complete Screen:**

```
┌──────────────────────────────────────────────────┐
│  ✅ Student Admitted Successfully                 │
│                                                   │
│  Name:      Arjun Reddy                          │
│  NeuraID:   NID-2025-AP-084291                   │
│  Class:     10-B, English Medium                 │
│  Admission: ADM-2025-0487                        │
│  SmartPad:  PAD-0043 (assigned)                  │
│                                                   │
│  SMS sent to parent: +91-9876543210 ✓            │
│  Receipt: #RCP-2025-0891   [Print] [Download]   │
│                                                   │
│  [Add Another Student]   [View Student Profile]  │
└──────────────────────────────────────────────────┘
```

---

## B2. Teacher Onboarding

### Teacher Profile — Full Form

**Tab 1 — Personal Details**

```
Full Name *              [                              ]
Date of Birth *          [  DD / MM / YYYY  ]
Gender *                 ( ) Male  ( ) Female  ( ) Other
Aadhaar Number *         [            ]  ← required for payroll
PAN Number *             [            ]  ← required for TDS
Mobile *                 [+91                          ]  ← OTP login
Email                    [                              ]
Address *                [                              ]
Emergency Contact        [                              ]
```

**Tab 2 — Qualifications**

```
Highest Qualification *  [M.Sc ▼]
Specialisation *         [Mathematics ▼]
University/Institution * [Osmania University            ]
Year of Passing *        [2018]

Teaching Qualification * [B.Ed ▼]
B.Ed Institution         [DIET Hyderabad                ]
B.Ed Year                [2019]

Additional Certifications [                              ]
```

**Tab 3 — Employment Details**

```
Employee ID *            [          ]  [Auto-generate]
Designation *            [PGT ▼]
  Options: PRT (Primary), TGT (Trained Graduate), PGT (Post Graduate),
           HM (Head Master), VP (Vice Principal), PT (Physical Training)

Employment Type *        [Regular ▼]  / Contract / Part-time
Joining Date *           [  DD / MM / YYYY  ]
Probation Period         [6 months ▼]  / 3 months / None

Subjects to Teach *      [☑ Mathematics  ☐ Physics  ☐ Chemistry  ☐ Biology...]
Classes to Teach *       [☑ Class 9  ☑ Class 10  ☐ Class 8...]

Class Teacher of         [10-B ▼]  (if applicable, else None)
Reporting To             [Principal ▼]
```

**Tab 4 — Salary Structure**

*(Full detail in Section C — Salary Management)*

```
Basic Salary *           ₹ [        ] per month
HRA *                    ₹ [        ]  or [  ]% of basic
DA                       ₹ [        ]  or [  ]% of basic
Transport Allowance      ₹ [        ]
Special Allowance        ₹ [        ]
                         ─────────────
Gross Salary             ₹ [auto-calculated]

PF Applicable?           ( ) Yes  ( ) No
ESI Applicable?          ( ) Yes  ( ) No  (gross < ₹21,000)
Professional Tax         ₹ 200/month (auto — AP/TS statutory)
TDS                      Auto-calculated based on annual income

Net Salary               ₹ [auto-calculated]

Bank Account Number *    [                    ]
IFSC Code *              [          ]  [Verify Bank ↗]
Account Holder Name *    [                              ]
Bank Name                [auto-filled after IFSC verify]
```

**Tab 5 — Documents Checklist**

```
[ ] Aadhaar Card (original seen)
[ ] PAN Card
[ ] Educational Certificates (all)
[ ] B.Ed / D.Ed Certificate
[ ] Experience Certificates (previous schools)
[ ] Bank Passbook / Cancelled Cheque
[ ] Passport Photos (4 nos)
[ ] Relieving Letter (from previous school)
[ ] Police Verification Certificate
[ ] Medical Fitness Certificate

Notes: [                                              ]
```

**Teacher Added — Confirmation:**

```
✅ Teacher Added

Name:        K. Suresh Kumar
Employee ID: EMP-0042
Login:       OTP to +91-9876543210 ✓
Role:        PGT Mathematics, Class Teacher 10-B
Salary:      ₹ 32,800/month (net)

[Add Another Teacher]   [View Teacher Profile]
```

---

## B3. Class & Timetable Management

Once teachers are added, the admin assigns classes and sets the timetable.

### Section — Subject Teacher Assignment

```
For each class-section, assign subject teachers:

Class 10-B, 2025-26
─────────────────────────────────────────────────
Subject             Teacher Assigned
Telugu              [S. Lakshmi ▼]
English             [R. Priya ▼]
Hindi               [M. Sharma ▼]
Mathematics         [K. Suresh Kumar ▼]
Physical Science    [P. Venkat ▼]
Biological Science  [A. Rani ▼]
Social Studies      [T. Ramesh ▼]
─────────────────────────────────────────────────
Class Teacher:      K. Suresh Kumar (Mathematics)
```

### Timetable Builder

Visual period-based timetable builder:

```
Class 10-B — Weekly Timetable
         Mon      Tue      Wed      Thu      Fri      Sat
P1 9-10  [Math]   [Eng]    [Tel]    [Bio]    [Phys]   [SS]
P2 10-11 [Phys]   [Math]   [Eng]    [Math]   [Tel]    [Math]
P3 11-12 [Bio]    [Tel]    [Hindi]  [Phys]   [Eng]    [Bio]
Lunch    ─────────────────────────────────────────────────
P4 1-2   [SS]     [Bio]    [Math]   [Tel]    [Hindi]  [Phys]
P5 2-3   [Eng]    [Phys]   [SS]     [Hindi]  [Math]   [Tel]
P6 3-4   [Hindi]  [SS]     [Phys]   [Eng]    [SS]     [Hindi]

[Click any cell to change subject/teacher]
[Auto-fill from teacher schedule]
[Check for conflicts] → highlights if teacher double-booked
```

---

## B4. Student & Teacher Database (Ongoing Management)

### Student List View (School Admin)

```
Students — Class 10  [All Sections ▼]  [2025-26 ▼]

Search: [                    ]  Filter: [All ▼]  Sort: [Name ▼]

 #   NeuraID           Name              Sec  SmartPad  Fee Status  Actions
─────────────────────────────────────────────────────────────────────────────
 1   NID-2025-AP-0842  Arjun Reddy       B    PAD-0043  ✅ Paid     [View]
 2   NID-2025-AP-0843  Priya Sharma      A    PAD-0021  ⚠ Pending  [View]
 3   NID-2025-AP-0844  Ravi Kumar        C    —         ⚠ Pending  [View]
...

Total: 187 students   |  SmartPad assigned: 142  |  Fee pending: 23
```

### Student Profile (Admin View)

```
┌─────────────────────────────────────────────────────────┐
│  Arjun Reddy           NID-2025-AP-084291               │
│  Class 10-B  |  English Medium  |  SmartPad: PAD-0043   │
├─────────────────────────────────────────────────────────┤
│  PERSONAL    ACADEMIC    FEE LEDGER    DOCUMENTS        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Mastery Overview  (from Cloud AI)                      │
│  Mathematics:  72%  ↑  |  Science: 58%  ↓  AT_RISK    │
│  Social:       81%  →  |  Telugu:  67%  ↑              │
│                                                          │
│  Attendance: 91%  (this month)                          │
│  Last SmartPad sync: Today 8:23 AM                     │
│  Parent app: Active (last login 2 days ago)             │
│                                                          │
│  [Edit Profile]  [Fee Ledger]  [Contact Parent]        │
└─────────────────────────────────────────────────────────┘
```

---

# SECTION C — FEE & SALARY MANAGEMENT

*Designed to replace Tally and school ERPs — more intuitive, more insightful, India-first.*

---

## C1. Fee Structure Configuration

Set once per academic year. Applies to all students based on their class and category.

### Fee Structure Setup (Part of School Setup Wizard)

```
Fee Structure — 2025-26
Configure fees per class and per category

[Class-wise Configuration]

Class 10 — Fee Structure:
                        General     SC/ST/OBC   EWS/Free
Admission Fee          ₹ 5,000     ₹ 3,000     ₹    0
(one-time, new students)

Annual Fees (collected once):
Development Fee        ₹ 3,000     ₹ 2,000     ₹    0
Exam Fee (per term)    ₹   500     ₹   300     ₹    0

Monthly Fees:
Tuition Fee            ₹ 2,500     ₹ 1,500     ₹    0
NeuraLife Subscription ₹   500     ₹   500     ₹  500  ← NeuraLife fee
                                                        (never waived)
Optional Monthly:
Transport Fee          ₹   800     ₹   800     ₹  800
  (only for bus students)

NeuraLife SmartPad (one-time, if student-purchase model):
SmartPad Fee           ₹ 8,000     ₹ 8,000     ₹ 8,000
  (or EMI: ₹700/month × 12)

[Copy to other classes with adjustments]
[Save Fee Structure]
```

**Fee due dates:**

```
Monthly fees due:     1st of every month
Late fee after:       10th of every month
Late fee amount:      ₹ 50 flat or [    ]% of monthly fee
Grace period:         [5] days after late fee trigger
Annual fees due:      June 15 (start of year)
Exam fees due:        15 days before each exam
```

---

## C2. Fee Collection Workflow

### Daily Fee Collection (Admin Counter)

The admin desk collects fees from parents and records in NeuraLife.

```
[Collect Fee]

Search student:  [NID or Name or Admission No.]
                 → Arjun Reddy, Class 10-B  [Select]

Outstanding dues for Arjun Reddy:
  Tuition Fee — July 2025         ₹ 2,500   OVERDUE (15 days)
  NeuraLife Subscription — July   ₹   500   OVERDUE (15 days)
  Late Fee                        ₹    50
  Tuition Fee — August 2025       ₹ 2,500   DUE Aug 1
  ──────────────────────────────────────────
  Total Outstanding                ₹ 5,550

Amount Collected *    [         ]
Payment Mode *        ( ) Cash  ( ) UPI  ( ) Cheque  ( ) NEFT/IMPS
Transaction Reference [         ]   (UPI ID / Cheque No.)
Collection Date *     [Today ▼]

Concession applied?   ( ) Yes  Amount: [      ]  Reason: [      ]
Notes                 [                                         ]

[Generate Receipt]
```

### Fee Receipt (Printable PDF)

```
╔══════════════════════════════════════════════════════════╗
║          Sri Vidya High School, Hyderabad                ║
║               Fee Receipt — 2025-26                     ║
╠══════════════════════════════════════════════════════════╣
║  Receipt No: RCP-2025-0891        Date: 16-07-2025      ║
║  Student:    Arjun Reddy          Class: 10-B           ║
║  Admission:  ADM-2025-0487        NeuraID: NID-...-0842 ║
╠══════════════════════════════════════════════════════════╣
║  Fee Head               Period         Amount           ║
║  Tuition Fee            July 2025      ₹ 2,500          ║
║  NeuraLife Subscription July 2025      ₹   500          ║
║  Late Fee                              ₹    50          ║
║  ─────────────────────────────────────────────────      ║
║  Total Received                        ₹ 3,050          ║
║  Payment Mode:          Cash                            ║
║  Received by:           K. Madhavi (Admin)              ║
╠══════════════════════════════════════════════════════════╣
║  Balance Outstanding:   ₹ 2,500 (Aug 2025 Tuition)     ║
╠══════════════════════════════════════════════════════════╣
║  School Seal & Signature                                ║
╚══════════════════════════════════════════════════════════╝
```

Receipt also sent to parent via in-app notification and (v2) email.

---

## C3. Fee Insights Dashboard (This is where we beat ERPs)

This is not a ledger view. It is a live intelligence dashboard — something no current school ERP in India provides.

```
Fee Collection Overview — August 2025

Total Billed This Month:         ₹ 5,87,500
Collected (as of today):         ₹ 4,23,100  (72%)
Outstanding:                     ₹ 1,64,400  (28%)

[████████████████████░░░░░░░]  72% collected

Collection Trend (last 6 months):
  Mar  Apr  May  Jun  Jul  Aug
  91%  88%  93%  79%  74%  72%  ← declining trend ⚠️

Top Outstanding Classes:
  Class 10-B:  ₹ 42,000  (14 students pending)
  Class 9-A:   ₹ 38,500  (11 students pending)
  Class 8-C:   ₹ 31,000  (9 students pending)

Students with 3+ months outstanding:  7 students  [View]
Students on fee concession:           23 students  [View]

SmartPad fees collected:         ₹ 3,12,000 / ₹ 3,84,000  (81%)
NeuraLife subscription:          ₹ 94,000 collected this month

[Send Bulk Reminders]  [Export to Excel]  [Print Report]
```

### At-Risk Fee Defaulters (Principal Alert)

```
⚠️ 7 students have 3+ months outstanding fees

Student         Class   Outstanding   Last Payment   Contact
─────────────────────────────────────────────────────────────
P. Suresh       8-A     ₹ 9,500       May 10        [SMS] [Call]
K. Anitha       7-C     ₹ 7,500       April 15      [SMS] [Call]
...

Recommended actions:
  → Send SMS reminder to all 7 parents
  → Schedule parent meeting for students above ₹10,000 outstanding
  → Apply late fee waiver for students with genuine difficulty

[Send Reminders to All]   [Schedule Meetings]   [Apply Waiver]
```

**Automated reminders (integrated with Notification system):**

```
SMS — 3 days before due date:
"Dear Parent, {child_name}'s fee of ₹{amount} for {month} is due on {date}.
Pay at school counter or UPI to {school_upi_id}. Ref: {student_id}"

SMS — day of due date:
"Reminder: {child_name}'s fee of ₹{amount} is due today."

SMS — 5 days after due date:
"Dear Parent, {child_name}'s fee of ₹{amount} is overdue.
Late fee of ₹50 applicable from {date}. Please contact office."
```

---

## C4. Salary Management — v1 (Structure + Payslip)

### Salary Structure Overview

```
Staff Salary Overview — August 2025

Total Staff:         34
Total Monthly Gross: ₹ 9,24,500
Total Monthly Net:   ₹ 8,41,320
(after PF, ESI, PT, TDS deductions)

Payroll status:
  [ ] Payroll not run for August  →  [Run August Payroll]
```

### Individual Salary Record

```
K. Suresh Kumar — PGT Mathematics
Employee ID: EMP-0042  |  Joining: 15 June 2022  |  Regular

EARNINGS:
  Basic Salary                    ₹ 22,000
  House Rent Allowance (HRA)      ₹  5,500  (25% of basic)
  Dearness Allowance (DA)         ₹  2,200  (10% of basic)
  Transport Allowance             ₹  1,500
  Special Allowance               ₹  1,600
  ─────────────────────────────────────────
  Gross Salary                    ₹ 32,800

DEDUCTIONS:
  Provident Fund (PF)             ₹  2,640  (12% of basic)
  Professional Tax (PT)           ₹    200  (AP/TS statutory)
  TDS                             ₹    160  (estimated)
  ─────────────────────────────────────────
  Total Deductions                ₹  3,000

  NET SALARY                      ₹ 29,800

Bank: HDFC Bank | IFSC: HDFC0001234 | A/C: XXXX5678
```

### Payslip Generation (v1)

```
╔══════════════════════════════════════════════════════════╗
║       Sri Vidya High School — Salary Slip               ║
║              Month: August 2025                         ║
╠══════════════════════════════════════════════════════════╣
║  Name:      K. Suresh Kumar    Emp ID:  EMP-0042        ║
║  Desig:     PGT Mathematics    Dept:    Secondary        ║
║  Joining:   15-Jun-2022        PAN:     ABCPK1234D      ║
║  Bank A/C:  XXXX5678           Days:    26/26            ║
╠═════════════════════════╦════════════════════════════════╣
║  EARNINGS               ║  DEDUCTIONS                   ║
║  Basic Salary  ₹22,000  ║  Provident Fund    ₹2,640     ║
║  HRA           ₹ 5,500  ║  Professional Tax  ₹  200     ║
║  DA            ₹ 2,200  ║  TDS               ₹  160     ║
║  Transport     ₹ 1,500  ║                               ║
║  Special       ₹ 1,600  ║                               ║
║  ─────────────────────  ║  ─────────────────────────    ║
║  Gross: ₹ 32,800        ║  Total Ded: ₹ 3,000           ║
╠═════════════════════════╩════════════════════════════════╣
║  NET SALARY PAYABLE:  ₹ 29,800                          ║
║  Amount in Words: Twenty Nine Thousand Eight Hundred    ║
╠══════════════════════════════════════════════════════════╣
║  This is a computer generated payslip.                  ║
╚══════════════════════════════════════════════════════════╝
```

---

## C5. Leave Management (Links to Salary)

### Leave Balance Tracking

```
K. Suresh Kumar — Leave Balance — 2025-26

Leave Type          Entitled    Used    Balance
────────────────────────────────────────────────
Casual Leave (CL)     12         3        9
Sick Leave (SL)       10         1        9
Earned Leave (EL)      8         0        8
────────────────────────────────────────────────
Loss of Pay (LOP)      —         0        —
```

### Leave Application Flow

```
Teacher applies for leave (Teacher App):
  → Leave type, from date, to date, reason
  → Days calculated automatically (excludes holidays)
  → Application goes to Principal/HM for approval

Principal approves/rejects (Web Admin Console):
  → Approved → Leave deducted from balance
  → If CL/SL exhausted → auto-marked LOP
  → LOP days affect monthly salary automatically

At payroll time:
  → LOP days = (daily wage × LOP days) deducted from gross
  → Daily wage = Gross ÷ 26 working days
```

---

## C6. Full Payroll Processing — v2 (Fully Documented for Build)

This is the v2 build — fully documented here for implementation.

### Monthly Payroll Run

```
STEP 1 — Pre-Payroll Validation (Admin runs on 25th of each month)
  → Attendance regularisation: any missing attendance entries?
  → Leave approvals: any pending leave applications?
  → New joinings: any teachers joined mid-month? (pro-rata calculation)
  → Resignations: any teacher's last working day this month?
  → Salary revisions: any increments effective this month?
  → LOP count: confirmed for each teacher
  → Validation report: flag all exceptions before payroll run

STEP 2 — Payroll Calculation Engine
  For each teacher:
    Earned days = Working days - LOP days - Holidays
    Daily wage = Gross ÷ 26
    Earned gross = Daily wage × Earned days    (for mid-month joinings)
    HRA = % × Basic (or fixed — as configured)
    DA = % × Basic
    PF = 12% × Basic  (if PF registered)
    ESI = 0.75% × Gross  (if Gross ≤ ₹21,000)
    PT = ₹200 flat  (if applicable — AP/TS state)
    TDS = ((Annual taxable income - exemptions) × slab rate) ÷ 12
    Net = Gross - PF - ESI - PT - TDS

STEP 3 — Payroll Preview
  → Full table: all 34 staff, gross, deductions, net
  → Total payroll outflow for the month
  → Highlight any exceptional changes from last month
  → [Edit any entry] [Approve Payroll]

STEP 4 — Payroll Approval (Principal)
  → Principal reviews and approves
  → Approved payroll is locked — no changes after approval
  → Payslips auto-generated for all staff

STEP 5 — Disbursement
  → Export: NEFT bulk payment file (bank-format CSV/Excel)
  → Admin uploads to school's net banking portal
  → Bank processes transfers
  → Admin marks disbursement complete in NeuraLife
  → Each teacher receives payslip PDF via email (if email on file)

STEP 6 — Statutory Compliance Filing
  PF: Monthly ECR (Electronic Challan cum Return) — exported as text file
      for upload to EPFO portal
  ESI: Monthly challan — exported for ESIC portal upload
  PT:  Monthly challan — exported for state PT portal
  TDS: Quarterly TDS return (Form 24Q) — data export for CA filing
  Form 16: Annual — auto-generated for all staff after March payroll

STEP 7 — Payroll Ledger
  → Monthly payroll entries auto-posted to:
      Salary account (expense)
      PF payable account (liability)
      ESI payable account (liability)
      PT payable account (liability)
      TDS payable account (liability)
      Bank account (asset, reduced)
  → Integrated with fee collection for school P&L view (v3)
```

### Payroll Analytics (What Beats Tally)

```
Staff Cost Insights — August 2025

Total Staff Cost:          ₹ 9,24,500/month
As % of Fee Revenue:       28.4%  ← healthy range: 25–35%

Department breakdown:
  Primary (1–5):    8 staff   ₹ 1,82,000
  Middle (6–8):     9 staff   ₹ 2,34,500
  Secondary (9–10): 11 staff  ₹ 3,21,000
  Admin/Support:    6 staff   ₹ 1,87,000

Increment alerts:
  ⚠️  3 teachers complete probation in September
  ⚠️  K. Suresh Kumar: 3-year anniversary — review increment

Attrition risk: 2 teachers on contract ending December  [Review]
```

---

## C7. Database Schema — Operations Tables

```sql
-- ════════════════════════════════════════
-- FEE STRUCTURE
-- ════════════════════════════════════════

CREATE TABLE fee_structures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       TEXT REFERENCES schools(id),
  academic_year   TEXT NOT NULL,
  class_year      INTEGER NOT NULL,
  fee_category    TEXT NOT NULL,         -- GENERAL | SC_ST | OBC | EWS | FREE
  admission_fee   NUMERIC DEFAULT 0,
  tuition_fee_monthly NUMERIC DEFAULT 0,
  development_fee_annual NUMERIC DEFAULT 0,
  exam_fee_per_term NUMERIC DEFAULT 0,
  transport_fee_monthly NUMERIC DEFAULT 0,
  neuralife_subscription NUMERIC DEFAULT 0,
  smartpad_one_time NUMERIC DEFAULT 0,
  late_fee_amount NUMERIC DEFAULT 50,
  late_fee_grace_days INTEGER DEFAULT 5,
  due_day_of_month INTEGER DEFAULT 1,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, academic_year, class_year, fee_category)
);

-- ════════════════════════════════════════
-- STUDENT FEE LEDGER
-- ════════════════════════════════════════

CREATE TABLE student_fee_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id        TEXT REFERENCES students(neura_id),
  school_id       TEXT REFERENCES schools(id),
  academic_year   TEXT NOT NULL,
  fee_head        TEXT NOT NULL,         -- TUITION | DEVELOPMENT | EXAM | TRANSPORT | NEURALIFE | SMARTPAD
  period          TEXT,                  -- '2025-08' for monthly, '2025-SA1' for exam
  amount_due      NUMERIC NOT NULL,
  amount_paid     NUMERIC DEFAULT 0,
  amount_waived   NUMERIC DEFAULT 0,
  due_date        DATE NOT NULL,
  status          TEXT DEFAULT 'PENDING', -- PENDING | PARTIAL | PAID | OVERDUE | WAIVED
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fee_ledger_neura ON student_fee_ledger(neura_id, academic_year);
CREATE INDEX idx_fee_ledger_status ON student_fee_ledger(school_id, status, due_date);

-- ════════════════════════════════════════
-- FEE PAYMENTS (RECEIPTS)
-- ════════════════════════════════════════

CREATE TABLE fee_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number  TEXT UNIQUE NOT NULL,  -- RCP-2025-0891
  school_id       TEXT REFERENCES schools(id),
  neura_id        TEXT REFERENCES students(neura_id),
  academic_year   TEXT NOT NULL,
  amount          NUMERIC NOT NULL,
  payment_mode    TEXT NOT NULL,         -- CASH | UPI | CHEQUE | NEFT
  transaction_ref TEXT,
  concession_amount NUMERIC DEFAULT 0,
  concession_reason TEXT,
  collected_by    UUID REFERENCES teachers(id),  -- admin who collected
  payment_date    DATE NOT NULL,
  ledger_entries  JSONB,                 -- which ledger items this covers
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════
-- SALARY STRUCTURE
-- ════════════════════════════════════════

CREATE TABLE salary_structures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      UUID REFERENCES teachers(id),
  school_id       TEXT REFERENCES schools(id),
  effective_from  DATE NOT NULL,
  basic           NUMERIC NOT NULL,
  hra_percent     NUMERIC,
  hra_fixed       NUMERIC,
  da_percent      NUMERIC,
  da_fixed        NUMERIC,
  transport_allowance NUMERIC DEFAULT 0,
  special_allowance   NUMERIC DEFAULT 0,
  pf_applicable   BOOLEAN DEFAULT FALSE,
  esi_applicable  BOOLEAN DEFAULT FALSE,
  pt_applicable   BOOLEAN DEFAULT TRUE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════
-- MONTHLY PAYROLL
-- ════════════════════════════════════════

CREATE TABLE payroll_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       TEXT REFERENCES schools(id),
  month           TEXT NOT NULL,         -- '2025-08'
  status          TEXT DEFAULT 'DRAFT',  -- DRAFT | APPROVED | DISBURSED
  total_gross     NUMERIC,
  total_net       NUMERIC,
  total_pf        NUMERIC,
  total_esi       NUMERIC,
  total_pt        NUMERIC,
  total_tds       NUMERIC,
  approved_by     UUID,
  approved_at     TIMESTAMPTZ,
  disbursed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, month)
);

CREATE TABLE payroll_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id  UUID REFERENCES payroll_runs(id),
  teacher_id      UUID REFERENCES teachers(id),
  school_id       TEXT NOT NULL,
  month           TEXT NOT NULL,
  working_days    INTEGER NOT NULL,
  lop_days        INTEGER DEFAULT 0,
  earned_days     INTEGER NOT NULL,
  basic           NUMERIC NOT NULL,
  hra             NUMERIC DEFAULT 0,
  da              NUMERIC DEFAULT 0,
  transport       NUMERIC DEFAULT 0,
  special         NUMERIC DEFAULT 0,
  gross           NUMERIC NOT NULL,
  pf_deduction    NUMERIC DEFAULT 0,
  esi_deduction   NUMERIC DEFAULT 0,
  pt_deduction    NUMERIC DEFAULT 0,
  tds_deduction   NUMERIC DEFAULT 0,
  other_deductions NUMERIC DEFAULT 0,
  net_salary      NUMERIC NOT NULL,
  bank_account    TEXT,
  ifsc            TEXT,
  payslip_url     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════
-- LEAVE MANAGEMENT
-- ════════════════════════════════════════

CREATE TABLE leave_balances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      UUID REFERENCES teachers(id),
  school_id       TEXT NOT NULL,
  academic_year   TEXT NOT NULL,
  cl_entitled     INTEGER DEFAULT 12,
  cl_used         INTEGER DEFAULT 0,
  sl_entitled     INTEGER DEFAULT 10,
  sl_used         INTEGER DEFAULT 0,
  el_entitled     INTEGER DEFAULT 8,
  el_used         INTEGER DEFAULT 0,
  lop_days        INTEGER DEFAULT 0,
  UNIQUE(teacher_id, academic_year)
);

CREATE TABLE leave_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      UUID REFERENCES teachers(id),
  school_id       TEXT NOT NULL,
  leave_type      TEXT NOT NULL,         -- CL | SL | EL | MATERNITY | PATERNITY | LOP
  from_date       DATE NOT NULL,
  to_date         DATE NOT NULL,
  days            INTEGER NOT NULL,
  reason          TEXT NOT NULL,
  status          TEXT DEFAULT 'PENDING', -- PENDING | APPROVED | REJECTED
  approved_by     UUID,
  approved_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════
-- CONSENT RECORDS
-- ════════════════════════════════════════

CREATE TABLE consent_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neura_id        TEXT REFERENCES students(neura_id),
  consent_type    TEXT NOT NULL,
  consented_by_role TEXT NOT NULL,
  consented_by_id UUID NOT NULL,
  school_id       TEXT NOT NULL,
  consent_text_version TEXT NOT NULL,
  consented_at    TIMESTAMPTZ NOT NULL,
  ip_address_hash TEXT,
  withdrawn_at    TIMESTAMPTZ,
  withdrawal_reason TEXT
);

-- ════════════════════════════════════════
-- DOCUMENT CHECKLIST (receipt tracking)
-- ════════════════════════════════════════

CREATE TABLE document_checklist (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       TEXT NOT NULL,         -- neura_id or teacher employee_id
  entity_type     TEXT NOT NULL,         -- STUDENT | TEACHER
  school_id       TEXT NOT NULL,
  document_name   TEXT NOT NULL,
  status          TEXT DEFAULT 'PENDING', -- PENDING | RECEIVED | NOT_APPLICABLE
  received_date   DATE,
  notes           TEXT,
  updated_by      UUID,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## C8. Version Milestones

### v1 — Full Build (Demo + First School)

| Component | Scope |
| --- | --- |
| School registration (Super Admin) | UDISE verify, full school profile, academic structure |
| School setup wizard | Holidays, fee structure, first admin |
| Student admission — individual form | All 6 tabs, document checklist, SmartPad assignment |
| Student admission — CSV bulk import | Excel template, validation, preview, error report |
| Teacher onboarding | Full profile, qualification, salary structure, documents |
| Class & section management | Teacher assignment, timetable builder |
| Fee structure configuration | Per class, per category, due dates, late fees |
| Fee collection | Search student, collect, receipt PDF |
| Fee ledger per student | Full payment history, outstanding, receipts |
| Fee dashboard (principal) | Collection overview, trend, class-wise, defaulters |
| Automated fee reminders | SMS 3 days before, on due date, 5 days after |
| Salary structure per teacher | Earnings, deductions, bank details |
| Payslip generation | PDF, printable, all salary heads |
| Leave balance tracking | CL, SL, EL, LOP tracking |
| Document checklist | Student + teacher, received/pending |

### v2 — Post First School Deal

| Addition | Notes |
| --- | --- |
| Full payroll processing | Monthly run, validation, NEFT export, PF/ESI/PT compliance |
| In-app UPI fee payment | Razorpay integration, parent pays from app |
| Document upload (encrypted) | Optional scan upload, Supabase encrypted storage |
| Salary increment workflow | Annual appraisal, increment letter generation |
| Form 16 generation | Annual tax certificate for all staff |
| ECR/ESI challan export | Statutory compliance exports |
| Staff expense tracking | Petty cash, reimbursements |
| School P&L overview | Fee revenue vs staff costs vs operational expenses |
| Multi-signatory payroll | Principal + trustee approval workflow |

### v3 — Scale

| Addition | Notes |
| --- | --- |
| Automated TDS calculation + 24Q export | Quarterly TDS return filing data |
| Multi-school payroll (chains) | One management company, multiple schools, consolidated payroll |
| Fee collection analytics across chain | Chain-level fee performance dashboard |
| Government fee reporting | State government fee structure compliance reporting |
| Payroll integration with bank APIs | Direct bank transfer from NeuraLife (partnerships with banks) |

---

## C9. Confirmed Decisions

| Decision | Rationale |
| --- | --- |
| Fee & Salary in v1 full build | This makes NeuraLife replace both school ERP and learning platform. Stronger sales pitch. Principal sees ROI immediately. |
| SmartPad: one-time student fee + monthly NeuraLife subscription per student | Revenue per student. SmartPad fee collected at admission. Subscription added to school's monthly fee structure. Never waived for any category (access to platform requires subscription). |
| Document receipt tracking only in v1, encrypted upload in v2 | Reduces v1 build scope without losing the tracking workflow. Schools are used to physical document management. |
| Bulk CSV import + manual fast-form both available | June enrollment surge requires CSV. Mid-year individual admissions are better on fast-form. Schools choose. |
| Parent fee payment: admin records in v1, in-app UPI in v2 | Razorpay/RBI compliance requirements make in-app payment a v2 feature. Admin recording covers v1 completely. |
| Salary: structure + payslip in v1, full payroll processing in v2 | Payslip generation alone impresses schools. Full payroll (NEFT export, PF/ESI/PT compliance) is complex — v2. |
| Automated fee reminders via SMS | Most impactful feature for school admins — removes the manual phone call workflow entirely. |
| Late fee auto-calculation | Currently done manually in Tally. NeuraLife does it automatically — instant differentiation. |
| UDISE code verification at school registration | Confirms school legitimacy. Government API. One-time, non-negotiable. |
| Leave applications in Teacher App, approval in Admin Console | Teacher-initiated, principal-approved workflow matches existing school HR process. |

## C10. Open Questions

| Question | Impact | Recommended action |
| --- | --- | --- |
| PF registration — is the school PF-registered? | Some small private schools are not PF-registered. Salary module must handle both cases. | PF applicable flag per school. Admin configures during setup. |
| Fee concession approval workflow — who approves? | Management trustee or principal? Varies by school. | Make concession approval configurable: Principal-only or Principal + Trustee. |
| SmartPad EMI for parents (₹700×12 instead of ₹8,000 upfront) — track in fee ledger? | Many families cannot pay ₹8,000 upfront | Add EMI plan option to SmartPad fee at admission. 12 monthly instalments tracked in fee ledger. |
| School chain (multiple branches) — single login or separate? | Franchise schools with 5–10 branches need consolidated view | v2: chain admin role with cross-school dashboard. Each branch = separate school_id. |
| Salary revision history — how many increments to track? | Audit trail for salary disputes | Keep full salary structure history. Each revision creates new salary_structures record with effective_from date. |

---

*Next document: **Segment 15 — Analytics & Reporting***