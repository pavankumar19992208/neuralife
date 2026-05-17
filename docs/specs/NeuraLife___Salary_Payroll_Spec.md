# NeuraLife — Salary & Payroll Management
### Product Specification v1.0

*The payroll system that collapses 3 days of manual work into 15 minutes.
One-click payroll run for the entire school. Auto-LOP. Branded PDF payslips.
NEFT export. SMS notification. Teacher self-service.*

---

## 1. The Problem With School Payroll in India Today

Every month end, in every private school in AP/Telangana, the same ritual happens.

The school accountant opens Excel. They type each teacher's name. They manually enter basic salary, HRA, DA, transport allowance. They count LOP days from the attendance register by hand. They calculate PF deductions with a calculator. They open Word, type a plain-text payslip, and print it. They call the bank to initiate NEFT transfers one by one.

For a 20-teacher school: **2–3 days of work every month.**

This process is:
- Error-prone (manual calculations, formula mistakes)
- Audit-unfriendly (no history, no revision trail)
- Inconvenient for teachers (plain paper payslip, no digital copy)
- Completely disconnected from leave records (LOP calculated separately from the leave register)

NeuraLife's Salary module changes this entirely.

---

## 2. What NeuraLife Salary Does

```
What a school currently spends 3 days doing → 15 minutes in NeuraLife

Step                         | Current (manual)              | NeuraLife
─────────────────────────────────────────────────────────────────────────
Compute each teacher's gross | Excel, manual formula per row  | Auto from salary_structure
Calculate LOP deductions     | Count days from register       | Auto from leave + attendance
Apply PF, ESI, PT            | Manual formula per teacher     | Auto from toggles + state rules
Add festival bonus           | Manual entry per row           | One adjustment → all teachers
Generate payslips            | Type in Word, print            | One click → PDFs for all
Prepare NEFT bank list       | Type in bank portal manually   | Download CSV → upload directly
Notify teachers              | WhatsApp individually          | Auto SMS on payroll confirm
Total time                   | 2–3 days                       | 15 minutes
```

---

## 3. Module Access

| Role | Access | Capability |
|---|---|---|
| PRINCIPAL | Full access | Run payroll, confirm, export, view all payslips |
| SCHOOL_ADMIN | View + export | See payroll, download reports, no confirm |
| TEACHER | Own payslip only | View and download their own payslip via Teacher App + web |

Route: `/salary` (Web Admin Console, PRINCIPAL + SCHOOL_ADMIN)
Teacher self-service: `/profile/payslips` (Teacher App + Web, teacher's own only)

---

## 4. Page Structure

```
/salary
├── Tab 1: Monthly Payroll   ← main operational view
├── Tab 2: Payroll History   ← past months, downloadable
└── Tab 3: Salary Revisions  ← raise history, overdue revision alerts
```

---

## 5. The Payroll Lifecycle

Every month has one payroll run. It progresses through these states:

```
DRAFT      → Payroll exists for this month, adjustments can be added,
             nothing computed yet. Created automatically when the month starts.

GENERATED  → All teacher amounts have been computed and are visible.
             Principal is reviewing. NOT yet saved to database — preview only.
             Can regenerate as many times as needed before confirming.

CONFIRMED  → Principal approved the payroll. All payslip records saved.
             PDFs generated and stored. SMS notifications sent to teachers.
             Payroll is now locked — no edits possible.

PAID       → Principal manually marks as paid after completing NEFT transfer.
             This is a record-keeping step, not a payment trigger.
```

**State transitions:**
```
DRAFT      → [Generate Payroll button]  → GENERATED (preview, not saved)
GENERATED  → [Confirm Payroll button]   → CONFIRMED (saved, PDF, SMS)
CONFIRMED  → [Mark as Paid button]      → PAID
```

**Key rule:** Confirmation is irreversible. The principal reviews the generated preview before confirming. There is no "undo" after confirmation — only a correction entry in the next month's payroll.

**Single-step approval:** The principal is the authority. No second approval step required.

---

## 6. Tab 1 — Monthly Payroll

### 6.1 Month Selector

Navigation arrows to go to previous/next month.
Default: current month.
**Cannot navigate to future months** — payroll is for completed work.

### 6.2 Status Indicator

Large badge shown below the month selector:

| Status | Colour | Label |
|---|---|---|
| DRAFT | Gray | "Not Generated" |
| GENERATED | Amber | "Pending Review" |
| CONFIRMED | Blue | "Confirmed" |
| PAID | Green | "Paid ✓" |

### 6.3 KPI Cards (4 cards)

Shown when status = GENERATED, CONFIRMED, or PAID:

| Card | Value | Notes |
|---|---|---|
| Total Gross | ₹{total_gross} | Sum of all teacher gross earnings |
| Total Deductions | ₹{total_deductions} | PF + ESI + PT + LOP |
| **Total Net Pay** | **₹{total_net}** | **Largest card, primary blue** |
| Working Days | {n} days | School working days in this month |

---

## 7. One-Time Adjustments

Adjustments are added BEFORE running payroll. They appear on the affected teacher's payslip for that month.

### 7.1 Types

| Type | Effect | Examples |
|---|---|---|
| BONUS | Adds to net salary | Diwali bonus, festival allowance, performance bonus |
| DEDUCTION | Reduces net salary | Advance recovery, equipment damage, library fine |

### 7.2 Scope Options

| Scope | Who it applies to |
|---|---|
| All Teachers | Every active teacher in the school |
| Selection | Principal picks specific teachers from a multi-select list |

### 7.3 Display

Adjustments shown as coloured chips/tags above the payroll table:

```
[🎁 Diwali Bonus · All teachers · +₹5,000  ×]
[➖ Advance Recovery · K. Suresh Kumar · -₹3,000  ×]
[🎁 Performance Bonus · T. Anand Babu, S. Lakshmi Devi · +₹2,000  ×]
```

Clicking × removes the adjustment (only possible in DRAFT state).

### 7.4 Common Use Cases

```
School-wide festival bonus:
  Type: BONUS | Amount: ₹5,000 | Applies to: All Teachers
  → Every teacher's payslip shows: "Festival Bonus: +₹5,000"

Advance recovery (individual):
  Type: DEDUCTION | Amount: ₹3,000 | Applies to: K. Suresh Kumar
  → His payslip shows: "Advance Recovery: -₹3,000"

Equipment damage (multiple teachers):
  Type: DEDUCTION | Amount: ₹500 | Applies to: [select 3 teachers]
  → Those 3 payslips show: "Equipment Damage: -₹500"
```

---

## 8. LOP Calculation

Loss of Pay (LOP) is automatically computed from two sources.

### 8.1 Source A — Approved LOP Leave Applications

```sql
SELECT SUM(days_count)
FROM leave_applications
WHERE teacher_id = {teacher_id}
  AND leave_type = 'LOP'
  AND status = 'APPROVED'
  AND from_date >= {first_day_of_month}
  AND to_date <= {last_day_of_month}
```

### 8.2 Source B — Absent Without Leave Application

Days where the teacher was absent and had no approved leave application covering that day.

**Logic:**
```
total_absent_days = working days in month where teacher has no attendance record
approved_leave_days = all CL + SL + EL + LOP approved leaves in the month

if total_absent_days > available_cl_sl_balance:
  lop_from_absence = total_absent_days - available_cl_sl_balance
else:
  lop_from_absence = 0
  # Available CL/SL covers the absence
```

### 8.3 Total LOP

```
total_lop_days = source_a_lop_days + source_b_lop_days

working_days_in_month = count of Mon-Sat days in the month
                        (per school_period_config working_days setting)
                        minus school holidays in that month

lop_per_day   = gross_earnings / working_days_in_month
lop_amount    = round(lop_per_day × total_lop_days, 2)
```

### 8.4 LOP Breakdown Stored

```json
{
  "leave_lop_days": 2,
  "absent_without_leave_days": 1,
  "total_lop_days": 3,
  "lop_per_day": 1000.00,
  "lop_amount": 3000.00
}
```

This breakdown appears on the payslip and in the audit trail.

---

## 9. Professional Tax — State-Based Auto-Calculation

### 9.1 Logic

```
function compute_pt(school_state, gross_monthly, pt_applicable):
  if NOT pt_applicable:
    return 0   # teacher marked as exempt (contract staff, etc.)

  if school_state IN ['AP', 'TS', 'Andhra Pradesh', 'Telangana']:
    return gross_monthly > 15000 ? 200 : 0

  # Other states: use manually configured pt_amount from salary_structure
  # Full state-wise slab support in v2
  return salary_structure.pt_amount_manual ?? 0
```

### 9.2 The `pt_applicable` Toggle

Already exists on `salary_structures` table (set during teacher onboarding).

| Toggle | Meaning |
|---|---|
| TRUE | Apply PT using school state rules |
| FALSE | No PT for this teacher (exempt — visiting staff, contract teachers, etc.) |

### 9.3 AP/TS PT Rules

```
Gross salary > ₹15,000/month → ₹200 Professional Tax
Gross salary ≤ ₹15,000/month → ₹0 Professional Tax

This is the Andhra Pradesh/Telangana state mandate.
Collected by the employer, remitted to the state government.
```

---

## 10. Payslip Computation Formula

```
GROSS EARNINGS:
  basic                                                = {basic}
  + HRA   (if hra_type=PERCENT: basic × hra_value/100
            if hra_type=FIXED:  hra_value)             = {hra}
  + DA    (if da_type=PERCENT:  basic × da_value/100
            if da_type=FIXED:   da_value)              = {da}
  + transport_allowance                                = {transport}
  + special_allowance                                  = {special}
  + sum of BONUS adjustments for this teacher          = {bonus_total}
  ─────────────────────────────────────────────────────────────
  = GROSS EARNINGS                                     = {gross}

DEDUCTIONS:
  PF   (if pf_applicable:   basic × 0.12)             = {pf}
  ESI  (if esi_applicable AND gross ≤ ₹21,000:
         gross × 0.0075)                               = {esi}
  PT   (state-based auto-calculation)                  = {pt}
  LOP  (lop_per_day × lop_days)                        = {lop}
  sum of DEDUCTION adjustments for this teacher         = {deduction_total}
  ─────────────────────────────────────────────────────────────
  = TOTAL DEDUCTIONS                                   = {total_deductions}

NET SALARY:
  net = gross - total_deductions
  net = max(0, net)   ← cannot go negative
  ─────────────────────────────────────────────────────────────
  = NET SALARY                                         = {net}
```

### 10.1 ESI Eligibility Rule

ESI (Employee State Insurance) applies only if the teacher's gross salary is ≤ ₹21,000/month. Above ₹21,000, ESI does not apply regardless of the `esi_applicable` toggle.

### 10.2 PF Employee + Employer

In this module: only employee contribution (12% of basic) is deducted from the payslip.
Employer contribution (12% of basic, paid by school separately) is noted in the payslip footer for reference but NOT deducted from net pay.

Full employer PF remittance tracking is a v2 feature.

---

## 11. The Payroll Table

One row per active teacher. Columns:

| Column | Content | Styling |
|---|---|---|
| Teacher | Name + designation + employee ID | Bold name |
| Gross | ₹{gross_earnings} | Normal |
| LOP | {n} days → -₹{amount} | Amber if lop_days > 0 |
| Deductions | -₹{total} | Hover: breakdown tooltip |
| Adjustment | +₹{n} or -₹{n} | Green for bonus, red for deduction |
| **Net Pay** | **₹{net_salary}** | **Bold, primary blue** |
| Bank | ●●●● {last4} or "⚠️ Missing" | Amber warning if no bank details |
| Status | Badge | GENERATED / PAID / ON_HOLD |
| Actions | [Payslip] | Opens preview modal |

**Table footer (totals row):**
```
TOTAL: ₹{sum_gross} | {sum_lop_days}d | ₹{sum_deductions} | ₹{sum_net}
```

**Missing bank details banner (above table if any):**
```
⚠️ {n} teachers have no bank details.
They will be excluded from the NEFT export.
Add details in Teachers → Profile → Salary tab.
```

---

## 12. Action Buttons (Sticky Bottom Bar)

### Status: DRAFT
```
[Generate Payroll]  ← primary button, full width
```
Loading state: "Computing salary for {n} teachers..."

### Status: GENERATED
```
Left:  [← Regenerate]          ← if principal changes adjustments
Right: [Export NEFT CSV]  [Confirm Payroll]
```
Info text: "Confirming will lock this payroll and send SMS to all teachers."

### Status: CONFIRMED
```
[Export NEFT CSV]  [Download All Payslips]  [Mark as Paid]
```

### Status: PAID
```
[Export NEFT CSV]  [Download All Payslips]
Info: "Marked as paid on {date}"  ← read-only
```

---

## 13. Payslip PDF Design

Every payslip is a clean, professional document. Teachers use these for:
- Income tax filing
- Bank loan applications
- Visa applications
- Rental agreements

The design must reflect the school's professionalism.

### 13.1 Layout (A4 Portrait)

```
┌─────────────────────────────────────────────────────────────┐
│  [School Logo]  VIKAS HIGH SCHOOL              SALARY SLIP  │
│                 Guntur, Andhra Pradesh     May 2026         │
│                 Ph: +91-863-XXXXXX         Pay Date: 31 May │
├─────────────────────────────────────────────────────────────┤
│  Employee Name:  K. Suresh Kumar    Department: Mathematics  │
│  Designation:    PGT               Employee ID: VHS-001     │
│  PAN:            ABCDE1234F         Bank: SBI ●●●● 7890     │
├──────────────────────────┬──────────────────────────────────┤
│  EARNINGS                │  DEDUCTIONS                      │
│  ─────────────           │  ─────────────                   │
│  Basic Salary   ₹18,000  │  Provident Fund (12%)   ₹2,160  │
│  House Rent All  ₹3,600  │  Professional Tax           ₹200 │
│  Dearness All    ₹1,800  │  Loss of Pay (2 days)    ₹1,385 │
│  Transport All     ₹800  │                                  │
│  Special All     ₹1,200  │                                  │
│  Festival Bonus  ₹5,000  │                                  │
│  ─────────────           │  ─────────────                   │
│  GROSS          ₹30,400  │  TOTAL DEDUCTIONS        ₹3,745 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│         NET SALARY:  ₹26,655                               │
│         (Rupees Twenty Six Thousand Six Hundred             │
│          Fifty Five Only)                                   │
│                         Payment Mode: Bank Transfer         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Working Days: 26  |  Present: 24  |  LOP: 2 days          │
│  Employer PF Contribution (not deducted): ₹2,160           │
├─────────────────────────────────────────────────────────────┤
│  This is a computer-generated payslip. No signature needed. │
│                            Powered by NeuraLife             │
└─────────────────────────────────────────────────────────────┘
```

### 13.2 PDF Generation

**Client-side** (for preview and single download): `jsPDF` (already installed)

**Server-side** (for bulk generation on confirm): same jsPDF logic in `apps/api/src/lib/payslipPDF.ts`, PDFs stored in Supabase Storage at:
```
payslips/{school_id}/{year}/{month}/{teacher_id}.pdf
```

### 13.3 Amount in Words

Helper function `amountToWords(amount: number): string`
Converts ₹26,655 → "Rupees Twenty Six Thousand Six Hundred Fifty Five Only"
Indian number system: use lakh/thousand correctly.

---

## 14. NEFT Export CSV

### 14.1 Purpose

Schools pay teachers via NEFT bank transfer. Most bank portals accept a CSV file for bulk uploads. NeuraLife generates this file directly.

### 14.2 Format

```
Filename: NEFT-VHS-2026-05.csv

Sl No,Beneficiary Name,Account Number,IFSC Code,Bank Name,Amount,Remarks
1,K. Suresh Kumar,1234567890,SBIN0004321,State Bank of India,26655.00,Salary May 2026 - VHS
2,P. Venkat Rao,9876543210,HDFC0001234,HDFC Bank,19420.00,Salary May 2026 - VHS
3,S. Lakshmi Devi,5555666677,ICIC0002345,ICICI Bank,22100.00,Salary May 2026 - VHS
...
TOTAL,,,,, 156840.00,
```

### 14.3 Rules

```
Include in NEFT export:
  ✓ Teachers with bank_account_number + ifsc_code populated
  ✓ Teachers with status != 'ON_HOLD'

Exclude from NEFT export:
  ✗ Teachers without bank details (show warning on UI)
  ✗ Teachers on hold

Sort: alphabetically by teacher name
Footer row: TOTAL with sum of all amounts
```

### 14.4 Tracking

When NEFT export is downloaded:
- `payroll_runs.neft_exported_at` = NOW()
- Shown in the UI: "NEFT file downloaded on {date}"

---

## 15. SMS Notification on Confirm

When principal confirms payroll, each teacher receives an SMS:

```
English:
"Your salary for {month} {year} has been processed.
Net amount: ₹{net_salary}.
Login to NeuraLife to view your payslip."

Telugu (for Telugu-medium schools):
"{month} {year} జీతం ప్రాసెస్ చేయబడింది.
నికర మొత్తం: ₹{net_salary}.
NeuraLife app లో మీ pay slip చూడండి."
```

**Delivery:** MSG91 SMS (already configured)
**Fallback:** If SMS fails, logged and retried once after 5 minutes.

---

## 16. Tab 2 — Payroll History

### 16.1 Layout

Year selector (current year default).

Table columns:

| Month | Total Net Paid | Teachers | Status | NEFT Exported | Actions |
|---|---|---|---|---|---|
| May 2026 | ₹1,56,840 | 6 | PAID ✓ | Yes (31 May) | [View] [Download] |
| April 2026 | ₹1,51,200 | 6 | CONFIRMED | Yes (30 Apr) | [View] [Download] |
| March 2026 | ₹1,51,200 | 6 | CONFIRMED | No | [View] [Download] |

### 16.2 Actions Per Row

**[View]** → Opens that month's full payroll detail (read-only, same layout as Tab 1 but no action buttons except export/download)

**[Download]** → Downloads ZIP of all payslip PDFs for that month

### 16.3 Empty State

```
"No payroll history yet.
 Run your first payroll using the Monthly Payroll tab."
```

---

## 17. Tab 3 — Salary Revisions

### 17.1 Overdue Revision Alert Card

Shown at top if any teacher hasn't had a revision in 12+ months:

```
⚠️ 3 teachers haven't had a salary revision in 12+ months

P. Venkat Rao        — Last revised: Apr 2024 (15 months ago)
T. Anand Babu        — Last revised: Mar 2024 (16 months ago)
R. Priya Kumari      — Last revised: Jan 2024 (18 months ago)

[Review These Teachers →]  ← filters the table below
```

### 17.2 Revision Table

All active teachers, sorted by "months since last revision" descending.

| Teacher | Current Gross | Last Revised | Change | Months Since Revision |
|---|---|---|---|---|
| R. Priya Kumari | ₹18,500 | Jan 2024 | ₹16,000 → ₹18,500 (+15.6%) | 18 months 🔴 |
| T. Anand Babu | ₹21,000 | Mar 2024 | ₹19,000 → ₹21,000 (+10.5%) | 16 months 🔴 |
| P. Venkat Rao | ₹24,000 | Apr 2024 | ₹22,000 → ₹24,000 (+9.1%) | 15 months 🟡 |
| K. Suresh Kumar | ₹30,400 | Jun 2025 | ₹27,000 → ₹30,400 (+12.6%) | 3 months ✅ |

**Row colouring:**
- > 18 months: red left border
- 12–18 months: amber left border
- < 12 months: normal

**[Revise Salary] button** per row → opens the same salary structure modal from the Teachers module. On save: payroll uses the new structure from the next month's run.

---

## 18. Teacher Self-Service (Teacher App + Web)

Teachers can view and download their own payslips without going to the principal.

### 18.1 Access Points

**Teacher App:** Profile tab → "My Payslips"
**Web:** `/profile/payslips` (for teachers who log into the web)

### 18.2 What Teachers See

```
My Payslips

[May 2026]  ₹26,655  PAID  [View] [Download PDF]
[Apr 2026]  ₹23,200  PAID  [View] [Download PDF]
[Mar 2026]  ₹23,200  PAID  [View] [Download PDF]
```

Only their own payslips. No other teacher's data visible.
Download generates the PDF on demand if not already cached.

---

## 19. Data Model

### 19.1 New Tables (Migration 018)

```sql
-- Monthly payroll runs (one per school per month)
payroll_runs (
  id, school_id, academic_year_id,
  month_year TEXT,          -- 'YYYY-MM'
  status,                   -- 'DRAFT' | 'GENERATED' | 'CONFIRMED' | 'PAID'
  total_gross, total_deductions, total_net,
  total_lop_amount, total_adjustment,
  teachers_count,
  working_days_month,       -- computed at generation time
  confirmed_at, confirmed_by,
  paid_at,
  neft_exported_at,
  notifications_sent BOOLEAN
  UNIQUE(school_id, month_year)
)

-- Individual payslip records (one per teacher per month)
payslips (
  id, payroll_run_id, teacher_id, school_id, month_year,
  -- Earnings
  basic, hra, da, transport_allowance, special_allowance,
  gross_earnings,
  -- LOP
  working_days_month, lop_days, lop_per_day, lop_amount,
  lop_breakdown JSONB,
  -- Deductions
  pf_amount, esi_amount, pt_amount,
  total_deductions,
  -- Adjustments
  adjustments JSONB,   -- [{ type, description, amount }]
  total_adjustments,
  -- Net
  net_salary,
  -- Bank (copied at time of payroll for immutable audit trail)
  bank_account_number, ifsc_code, bank_name, account_holder_name,
  -- Status + PDF
  status,    -- 'GENERATED' | 'PAID' | 'ON_HOLD'
  pdf_url    -- Supabase Storage URL
  UNIQUE(payroll_run_id, teacher_id)
)

-- One-time adjustments for a payroll run
payroll_adjustments (
  id, school_id, payroll_run_id,
  type,           -- 'BONUS' | 'DEDUCTION'
  description,
  amount,
  applies_to,     -- 'ALL' | 'SELECTION'
  teacher_ids UUID[]
)
```

### 19.2 Existing Tables Used

```
salary_structures         -- basic, HRA, DA, PF/ESI/PT flags, bank details
leave_applications        -- source A for LOP calculation
leave_balances            -- available CL/SL for source B calculation
school_holidays           -- deducted from working days count
school_period_config      -- which days are working days
teachers                  -- active teacher list
```

---

## 20. API Routes

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/salary/payroll/:monthYear` | Get payroll run + payslips | PRINCIPAL, SCHOOL_ADMIN |
| POST | `/api/v1/salary/payroll/:monthYear/generate` | Compute preview (not saved) | PRINCIPAL |
| POST | `/api/v1/salary/payroll/:monthYear/confirm` | Save + lock + notify | PRINCIPAL |
| PUT | `/api/v1/salary/payroll/:monthYear/status` | Mark as PAID | PRINCIPAL |
| POST | `/api/v1/salary/payroll/:monthYear/adjustments` | Add bonus/deduction | PRINCIPAL |
| DELETE | `/api/v1/salary/payroll/:monthYear/adjustments/:id` | Remove adjustment | PRINCIPAL |
| GET | `/api/v1/salary/payroll/:monthYear/neft-export` | Download NEFT CSV | PRINCIPAL |
| GET | `/api/v1/salary/payslip/:payslipId` | Get one payslip | PRINCIPAL, own teacher |
| GET | `/api/v1/salary/payslip/:payslipId/pdf` | Download PDF | PRINCIPAL, own teacher |
| GET | `/api/v1/salary/history` | All payroll runs by year | PRINCIPAL, SCHOOL_ADMIN |
| GET | `/api/v1/salary/revisions` | Salary revision timeline | PRINCIPAL |

---

## 21. Confirmed Design Decisions

| Decision | Rationale |
|---|---|
| Month-end payroll | Matches how Indian schools operate — payroll after the work month is complete |
| Single-step confirmation | Principal IS the authority. Adding approval steps adds friction with no safety gain |
| Generate = preview, Confirm = save | Prevents accidental saves. Principal reviews computed values before committing |
| LOP from both approved leave AND attendance | Real school practice — some teachers are absent without filing leave applications |
| PT state-based auto-calculation | Zero per-school configuration needed for AP/TS. Expansion to other states in v2 |
| ESI auto-cut at ₹21,000 | Statutory requirement — ESI not applicable above ₹21,000 gross |
| Bank details copied to payslip at confirm time | Immutable audit trail — if teacher changes bank later, old payslip still shows the bank that was paid |
| SMS on confirm, not on "Mark as Paid" | Teacher needs to know their salary is processed, not that NEFT is complete (they can see their bank) |
| NEFT CSV with footer total | Standard format accepted by most Indian bank portals for bulk NEFT uploads |
| PDF stored server-side in Supabase Storage | Teachers access their payslip anytime, even years later |
| Salary revision alert at 12+ months | Indian labour law expectation — teachers should receive increments. 12-month alert gives principal a gentle nudge |
| `pt_applicable` toggle per teacher | Some contract staff and visiting faculty are exempt from PT. Toggle allows school to manage exceptions |

---

## 22. What This Beats in the Market

| Feature | Fedena | SchoolPad | Tally (manual) | **NeuraLife** |
|---|---|---|---|---|
| One-click payroll for whole school | ❌ | ❌ | ❌ | ✅ |
| Auto-LOP from leave records | ❌ | ❌ | ❌ | ✅ (both sources) |
| State-based PT auto-calculation | ❌ | ❌ | ❌ | ✅ AP/TS auto |
| School-wide bonus in one step | ❌ | ❌ | ❌ | ✅ |
| Branded PDF payslip | Basic | Basic | Plain text | ✅ Designed |
| NEFT export CSV | ❌ | ❌ | Manual | ✅ |
| Teacher self-service payslip | ❌ | ❌ | ❌ | ✅ App + Web |
| SMS on salary processing | ❌ | ❌ | ❌ | ✅ |
| Salary revision alert (12+ months) | ❌ | ❌ | ❌ | ✅ |
| Audit trail (who confirmed, when) | Basic | ❌ | ❌ | ✅ |
| Integration with leave records | ❌ | ❌ | ❌ | ✅ Auto-LOP |

---

## 23. Open Questions (v2 Scope)

| Question | v2 Resolution |
|---|---|
| Employer PF remittance tracking | Add employer_pf tracking, generate EPF challan for EPFO portal |
| TDS deduction at source | Complex — depends on teacher's tax regime, investments. Full TDS in v2 with Form 16 generation |
| State-wise PT slabs for Karnataka, Maharashtra, etc. | Add `pt_slabs` table. School selects state → correct slab applied |
| In-app NEFT (Razorpay) | Direct bank transfer from NeuraLife without downloading CSV |
| WhatsApp payslip delivery | WhatsApp Business API — send payslip PDF directly to teacher's WhatsApp |
| Salary advance management | Add `salary_advances` table. Track advance given + monthly recovery |
| Annual salary certificate (Form 16) | Generate PDF certificate for teachers — useful for income tax filing |
| Payroll analytics | Monthly payroll trend chart, department-wise salary distribution, YoY payroll growth |

---

*Specification version: 1.0*
*Created: May 2026*
*Next: Migration 018 (payroll tables) + API implementation + Web build*
