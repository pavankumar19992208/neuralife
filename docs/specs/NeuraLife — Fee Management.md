# NeuraLife — Fee Management

*Complete specification for the fee collection, analytics, structure configuration, and concession management system.*

---

## Overview

The Fee Management module serves school principals and school admins. It covers:

1. **Daily operations** — record payments, view student ledgers
2. **Analytics** — school-wide collection health, unpaid student tracking
3. **Fee structure configuration** — class-wise fee amounts, collection cycle
4. **Concessions** — school-level rules that auto-apply on student enrollment
5. **Custom fee heads** — school-defined fee types beyond the standard set

---

## Fee Collection Modes

Schools in AP and Telangana collect fees in two primary cycles:

| Mode | period_label format | Example |
|------|---------------------|---------|
| Monthly | `YYYY-MM` | `2026-05` |
| Per Term | `YYYY-{TERM}` | `2026-SA1`, `2026-SA2`, `2026-ANNUAL` |

The `period_label` in `fee_ledger` identifies the billing period. NULL means a one-time fee (admission, smartpad). The admin selects which mode applies when configuring each fee head.

---

## Standard Fee Heads

Defined in the `fee_head` PostgreSQL enum:

| Head | Typical collection | Description |
|------|-------------------|-------------|
| ADMISSION | One-time | Charged once on enrollment |
| DEVELOPMENT | Annual | School infrastructure fund |
| TUITION | Monthly | Core tuition fee |
| EXAM | Per term | SA1, SA2, Annual exam fee |
| TRANSPORT | Monthly | School bus |
| NEURALIFE_SUBSCRIPTION | Monthly | NeuraLife platform subscription (fixed ₹500) |
| SMARTPAD | One-time | SmartPad device cost |
| SMARTPAD_EMI | Monthly | SmartPad EMI installment |
| LATE_FEE | One-time | Applied automatically after grace period |
| OTHER | Varies | Catch-all for unlabelled charges |
| BUS_FEE | Monthly | Bus route-specific fee |
| SPORTS_FEE | Annual or per term | Sports & games |
| LAB_FEE | Annual or per term | Science/chemistry lab |
| LIBRARY_FEE | Annual | Library membership |
| HOSTEL_FEE | Monthly | Boarding & lodging |
| ACTIVITY_FEE | Per term | Cultural, arts, extracurricular |
| UNIFORM_FEE | One-time or Annual | School uniform |
| COMPUTER_LAB | Annual or per term | Computer lab usage |
| MEAL_FEE | Monthly | Canteen / mid-day meal |
| MEDICAL_FEE | Annual | Health & medical check-ups |
| CUSTOM | Varies | School-defined custom fee (see Custom Fee Heads) |

---

## Custom Fee Heads

Schools can define fee types not covered by the standard enum. These are stored in the `custom_fee_heads` table.

### Configuration

| Field | Description |
|-------|-------------|
| `head_code` | Machine key, uppercase with underscores (e.g. `SWIMMING_FEE`) |
| `display_name` | Human-readable name shown on receipts and UI |
| `description` | Optional explanation for the admin |
| `collection_type` | MONTHLY / TERMLY / ANNUAL / ONE_TIME |

### Class/Category Amounts

Custom fee amounts can vary by class and/or student category, stored in `custom_fee_head_amounts`. If no specific row exists for a (class_year, student_category) combination, the NULL-keyed fallback row is used.

### Suggested Presets (shown in UI when adding)

| Preset Code | Display Name | Suggested Type |
|-------------|--------------|----------------|
| `SWIMMING_FEE` | Swimming Pool Fee | Monthly |
| `EXCURSION_FEE` | Field Trip / Excursion Fee | ONE_TIME |
| `STATIONERY_FEE` | Stationery Fee | Annual |
| `ID_CARD_FEE` | ID Card Fee | ONE_TIME |
| `PTM_FEE` | Parent-Teacher Meeting Fee | Per Term |
| `YOGA_FEE` | Yoga / Wellness Fee | Monthly |
| `ALUMNI_FEE` | Alumni Association Fee | Annual |
| `SMART_CLASS` | Smart Class / Projector Fee | Monthly |

---

## Fee Structure Configuration

The `fee_structures` table stores the canonical fee amounts per `(school_id, academic_year_id, class_year, student_category)`.

### Student Categories (`fee_category` enum)

| Category | Who qualifies |
|----------|--------------|
| GENERAL | Default category |
| SC_ST | Scheduled Caste / Scheduled Tribe (government waiver eligible) |
| OBC | Other Backward Classes |
| EWS | Economically Weaker Section |
| FREE | Full fee waiver (management decision) |

The fee structure defines the **gross fee before concessions**. When a payment is recorded, the net amount after concession is what appears in the ledger.

### Editing Rules

- Only PRINCIPAL can save changes to fee structure.
- Changes take effect on the next billing cycle (do not retroactively alter existing ledger entries).
- `neuralife_sub_monthly` is fixed at ₹500 and cannot be set to zero by the school admin.
- `fee_due_day_of_month` must be 1–28 (avoids month-length issues).

---

## Concession Rules

The `fee_concession_rules` table defines school-level policies. These are distinct from the per-student `concessions` table.

### Concession Types (`concession_type` enum, expanded)

| Type | Description |
|------|-------------|
| MERIT_SCHOLARSHIP | Academic excellence |
| SC_ST_WAIVER | Government-mandated waiver for SC/ST students |
| OBC_CONCESSION | OBC category discount |
| EWS_CONCESSION | Economically Weaker Section |
| INCOME_BPL | Below Poverty Line (income-based) |
| SIBLING_DISCOUNT | Second child enrolled in same school |
| SIBLING_SECOND | Second sibling |
| SIBLING_THIRD_PLUS | Third+ sibling |
| STAFF_WARD | Ward of school employee |
| ALUMNI_CHILD | Child of school alumnus |
| DISABILITY | Student with special needs |
| SINGLE_PARENT | Single-parent household |
| MANAGEMENT_QUOTA | Management discretion |
| OTHER | Any other reason |

### Rule Fields

| Field | Description |
|-------|-------------|
| `rule_name` | Human label e.g. "SC/ST Full Tuition Waiver" |
| `concession_type` | From the enum above |
| `eligibility_note` | Admin instructions for verifying eligibility |
| `applies_to_heads` | Which fee heads this applies to (null = all heads) |
| `amount_type` | PERCENT or FIXED |
| `concession_value` | The amount (percentage 0–100, or fixed ₹) |
| `max_cap` | Maximum deduction in ₹ for PERCENT rules |
| `auto_apply` | If true, system applies automatically during enrollment when student matches |

### Auto-Apply Logic (on student enrollment)

When a student is enrolled, the system checks:
1. Does the student's `caste_category` match any active `SC_ST_WAIVER`, `OBC_CONCESSION`, `EWS_CONCESSION` rules?
2. Is there a `STAFF_WARD` rule and is this student's parent a teacher at the school?
3. Does the student have a sibling already enrolled? → `SIBLING_DISCOUNT`

For each matched rule, a row is inserted into the per-student `concessions` table with:
- `concession_type` from the rule
- `fee_head` from the rule (or NULL for all heads)
- `deduction_amount` or `deduction_percentage` computed from the rule
- `approved_by` = NULL (system-applied), `reason` = rule_name

Manual concessions can also be added per-student by a PRINCIPAL at any time.

---

## Fee Analytics Dashboard

Route: `GET /api/v1/fees/analytics` → `FeeAnalyticsData`

### Response Fields

| Field | Description |
|-------|-------------|
| `year_label` | Academic year label |
| `total_due_year` | Sum of all `amount_due` for the academic year |
| `total_collected_year` | Sum of all `amount_paid` |
| `total_waived_year` | Sum of all `amount_waived` |
| `collection_rate_year` | `(total_collected / total_due) × 100` |
| `overdue_amount` | Sum of balance where status = OVERDUE |
| `monthly_trend` | Array of `{ month_label, due, collected, rate }` sorted by period_label |
| `by_fee_head` | Per-fee-head breakdown |
| `by_class` | Per class-section breakdown with overdue counts |

### Unpaid Students List

Route: `GET /api/v1/fees/analytics/unpaid?page=1&limit=20` → paginated `UnpaidStudentItem[]`

| Field | Description |
|-------|-------------|
| `periods_overdue` | Count of distinct `period_label` values where status ≠ PAID and ≠ WAIVED |
| `oldest_due_date` | Earliest `due_date` among unpaid ledger items |
| `total_outstanding` | Sum of `(amount_due − amount_paid − amount_waived)` across all unpaid items |
| `current_period_paid_pct` | `(amount_paid / amount_due) × 100` for the current month's ledger item |
| `fee_heads_unpaid` | Distinct fee head names with unpaid balance |

The list is sorted by `total_outstanding DESC` to surface highest-priority follow-ups first.

---

## Payment Recording (Enhanced)

### Selectable Terms/Months

When recording a payment from the student ledger or Analytics page "Pay Now":
1. All unpaid ledger items are presented as a checklist grouped by `period_label`.
2. Each group (period) shows: fee heads with individual amounts, running total.
3. Admin checks one or more periods — the total auto-calculates.
4. Amount field remains editable for partial payments.
5. An info (ℹ) icon on each period expands to show the full fee breakdown.
6. "Select All Unpaid" shortcut selects every outstanding item.

### Partial Payment Logic

When the payment amount < full balance for a checked period:
- The existing auto-allocation logic applies: oldest-first within the period.
- The ledger status of partially-paid items becomes PARTIAL.

### Pre-fill from Analytics

The Analytics page "Pay Now" button navigates to `/fees?pay=NEURA_ID`. The FeesPage reads this query param on mount and opens RecordPaymentModal pre-filled with the student's neura_id. Their unpaid terms load automatically.

---

## API Endpoints Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/fees/structure` | PRINCIPAL, SCHOOL_ADMIN | List fee structure rows |
| PUT | `/api/v1/fees/structure` | PRINCIPAL | Batch upsert fee structure |
| GET | `/api/v1/fees/collection` | PRINCIPAL, SCHOOL_ADMIN | Monthly collection summary |
| GET | `/api/v1/fees/ledger/:neuraId` | PRINCIPAL, SCHOOL_ADMIN, PARENT | Student fee balance + ledger |
| POST | `/api/v1/fees/payment` | PRINCIPAL, SCHOOL_ADMIN | Record payment (idempotent) |
| DELETE | `/api/v1/fees/payment/:id` | PRINCIPAL | Void payment |
| GET | `/api/v1/fees/analytics` | PRINCIPAL, SCHOOL_ADMIN | Year analytics |
| GET | `/api/v1/fees/analytics/unpaid` | PRINCIPAL, SCHOOL_ADMIN | Unpaid students (paginated) |
| GET | `/api/v1/fees/concession-rules` | PRINCIPAL, SCHOOL_ADMIN | List concession rules |
| POST | `/api/v1/fees/concession-rules` | PRINCIPAL | Create rule |
| PUT | `/api/v1/fees/concession-rules/:id` | PRINCIPAL | Update rule |
| DELETE | `/api/v1/fees/concession-rules/:id` | PRINCIPAL | Deactivate rule |
| GET | `/api/v1/fees/custom-heads` | PRINCIPAL, SCHOOL_ADMIN | List custom fee heads |
| POST | `/api/v1/fees/custom-heads` | PRINCIPAL | Create custom head |
| PUT | `/api/v1/fees/custom-heads/:id` | PRINCIPAL | Update custom head |
| DELETE | `/api/v1/fees/custom-heads/:id` | PRINCIPAL | Deactivate custom head |

---

## Web UI Pages & Components

### `/fees` — Main Fees Page

**Left panel:** Monthly collection summary (KPI strip, progress bar, recent payments).  
**Right panel:** Student ledger lookup — enter Neura ID, see balance + ledger table. If unpaid balance > 0, a "Pay ₹X" button appears that opens RecordPaymentModal pre-filled.  
**Header actions:**
- "Analytics" → `/fees/analytics`
- "Record Payment" → opens RecordPaymentModal
- Settings icon → opens FeeSettingsModal

### `/fees/analytics` — Fee Analytics Page

- KPI strip: total due, total collected, collection rate %, outstanding amount
- Recharts ComposedChart: monthly trend (bars = due/collected, line = rate %)
- Fee head breakdown table
- Class-wise breakdown table
- Unpaid students table: name, ID, class, periods overdue, outstanding, current-period %, actions (Pay Now)

### FeeSettingsModal — 3-tab dialog

**Tab 1: Fee Structure**
- Category selector (GENERAL / SC_ST / OBC / EWS / FREE)
- Editable grid: class rows × fee head columns
- Save persists to `fee_structures` via PUT /api/v1/fees/structure

**Tab 2: Concession Rules**
- List view: rule name, type badge, amount (% or ₹), applies-to, auto-apply toggle
- Add/Edit inline form with all fields
- Deactivate (soft-delete) per rule

**Tab 3: Custom Fee Heads**
- List of active custom heads with collection type and amounts
- Preset suggestions: 8 common types pre-named and coded
- Free-form option for fully custom naming
- Per-class amount overrides

### RecordPaymentModal — 3-screen flow

**Screen 1 (Form):**
- Neura ID input with lookup
- If pre-filled: student info card auto-loads
- Unpaid items checklist (when student has balance):
  - Grouped by period_label
  - Checkbox per period; select multiple months/terms
  - Amount auto-populates from checked items
  - ℹ icon expands per-period fee breakdown
  - "Select All Unpaid" shortcut
  - Amount field remains editable for partial payment
- Payment mode + optional reference

**Screen 2 (Confirm):** Summary of all details before recording.

**Screen 3 (Receipt):** Success with receipt number + PDF download.

---

## Confirmed Decisions

1. **Monetary storage**: NUMERIC(10,2) in rupees throughout — never paise, never floats.
2. **Idempotency**: All payment mutations require `x-idempotency-key` header; 24-hour TTL.
3. **Receipt number format**: `{school_short_code}-{year_code}-{6-digit-seq}` e.g. `VHS-2526-000892`, generated atomically via PostgreSQL function.
4. **Concession application**: Rules stored at school level; per-student records in `concessions` table. Auto-apply at enrollment time.
5. **Custom fee heads**: Use `fee_head = 'CUSTOM'` enum value + `custom_head_label` text column in `fee_ledger` for custom items.
6. **Analytics computation**: Done in TypeScript layer from raw ledger rows (no complex SQL aggregation); acceptable for AP/Telangana school sizes (< 3000 students).
7. **Monthly vs term collection**: Distinguished by `period_label` format. UI detects format automatically.
8. **Auto-allocation of payment**: Oldest unpaid ledger items first (greedy by `due_date ASC`). Admin can override with explicit `ledger_allocations` in the payment request.

---

## Open Questions

- [ ] Should overdue fees automatically generate a `LATE_FEE` ledger entry? (Needs scheduled job / cron)
- [ ] Should concession auto-apply validate uploaded documents (income certificate, caste certificate)? (Deferred to v2)
- [ ] Parent notification via SMS when payment is recorded? (Depends on MSG91 integration — Layer 8+)
- [ ] Fee report export to Excel / PDF for government submission? (Deferred to v3)
