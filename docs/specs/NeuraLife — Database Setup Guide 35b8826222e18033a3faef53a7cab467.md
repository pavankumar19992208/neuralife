# NeuraLife — Database Setup Guide

*What Supabase is, what each migration file does, why it exists, and the exact steps to get your database live.*

---

## What Is Supabase? (Plain Language)

Supabase is the service that runs your database and everything around it. Think of it as:

```
Supabase = PostgreSQL (your actual database)
         + Login system (handles OTPs, sessions, tokens)
         + File storage (for SmartPad content, receipts, model files)
         + Real-time engine (live updates to Teacher App)
         + A visual dashboard (see your data like a spreadsheet)
         + Auto-generated API (query database from any app)
```

**How it compares to things you know:**

| AWS equivalent | Supabase equivalent | What it does |
| --- | --- | --- |
| AWS RDS | Supabase Database | Stores all your data |
| AWS Cognito | Supabase Auth | Handles login |
| AWS S3 | Supabase Storage | Stores files |
| AWS API Gateway | Supabase Auto API | Queries database |
| AWS CloudWatch | Supabase Dashboard | Visual monitoring |

The difference: AWS requires you to configure and connect all these pieces yourself. Supabase gives them all pre-connected in one place, in about 5 minutes.

**Where your data lives:** Supabase runs on AWS Mumbai (ap-south-1) behind the scenes. You never touch AWS directly. All your 30 student records, fee receipts, teacher salary data — stored in Mumbai, never leaves India.

---

## The Three Migration Files

A "migration" is a SQL file that changes the structure or content of your database. You run them in order: 001 → 002 → 003.

Think of it like building a house:

- File 001 builds the rooms (creates the tables)
- File 002 puts locks on every door (adds security rules)
- File 003 furnishes the rooms (adds demo data)

---

## File 001 — `001_initial_schema.sql`

**What it does:** Creates all 74 tables in your PostgreSQL database.

**Why we need it:** A database with no tables is like an empty Excel workbook. You need to define what data you're going to store before you can store anything. The schema file defines:

- Every table (like `students`, `teachers`, `mastery_snapshots`)
- Every column in each table (like `full_name`, `date_of_birth`, `raw_score`)
- What data type each column holds (`TEXT`, `INTEGER`, `NUMERIC`, `TIMESTAMPTZ`, `BOOLEAN`)
- Rules between tables (if you delete a school, related records must handle it correctly)
- ENUMs (controlled vocabulary: `attendance_status` can only be `PRESENT`, `ABSENT`, `LATE`, `APPROVED_LEAVE`, or `HOLIDAY` — nothing else)
- Indexes (makes certain queries 100x faster)

**What happens when you run it:**

```
Before: Empty database — no tables at all
After:  74 tables exist, all empty, ready to hold data

Example — students table now exists:
  neura_id (TEXT, primary key)
  full_name (TEXT, required)
  date_of_birth (DATE, required)
  gender (TEXT, optional)
  aadhaar_hash (TEXT, unique — no two students can have same hash)
  band (age_band ENUM — can only be FOUNDATION/ELEMENTARY/MIDDLE/SECONDARY)
  status (student_status ENUM)
  data_consent_given (BOOLEAN)
  ... and more
```

**Key design decisions baked into this file:**

| Decision | How it's implemented |
| --- | --- |
| School isolation | Every table has a `school_id` column |
| Soft delete on sensitive tables | `deleted_at TIMESTAMPTZ` column on students, teachers, schools |
| Daily mastery aggregates | `UNIQUE(neura_id, snapshot_date, subject, topic)` on mastery_snapshots |
| Section change history | Separate `section_history` table with from/to dates |
| One-time SmartPad assignment | `assigned_neura_id TEXT UNIQUE` — database enforces 1:1 |
| Human-readable content IDs | `id TEXT PRIMARY KEY` on content_chapters (e.g., `MATH-10-CH3`) |
| Receipt numbering per school | Separate `receipt_sequence_counters` table |

---

## File 002 — `002_rls_policies.sql`

**What it does:** Adds Row Level Security (RLS) policies to every table.

**Why we need it:** Without this file, any authenticated user can read any row in any table — including other school's data. This file locks that down completely.

### What is RLS? A real example.

Imagine Teacher Ramesh from Vikas High School (SCH-AP-00142) tries to query the students table:

**Without RLS:**

```sql
SELECT * FROM students;
-- Returns: ALL 50,000 students across ALL schools on NeuraLife
-- This is a data breach
```

**With RLS:**

```sql
SELECT * FROM students;
-- Returns: ONLY students enrolled in SCH-AP-00142
-- Because the database reads Ramesh's JWT token, sees school_id = SCH-AP-00142,
-- and automatically adds WHERE school_id = 'SCH-AP-00142' to every query
-- Ramesh cannot see other schools' data even if he tries
```

The important thing: **this enforcement happens inside the database, not in your application code.** Even if you have a bug in your Fastify API, even if a hacker finds a way to bypass your API — the database will still refuse to show data they're not allowed to see.

### How RLS reads your login token

Every user who logs into NeuraLife gets a JWT (JSON Web Token). This token contains:

```json
{
  "role": "TEACHER",
  "school_id": "SCH-AP-00142",
  "teacher_id": "uuid-of-ramesh"
}
```

RLS policies read this token using `auth.jwt()` in PostgreSQL:

```sql
-- This policy says: you can only SELECT rows where school_id matches YOUR school_id
CREATE POLICY "school_isolation" ON mastery_snapshots
  FOR SELECT
  USING (school_id = (auth.jwt() ->> 'school_id'));
```

### What each role can access

| Role | What they see |
| --- | --- |
| `SUPER_ADMIN` | Everything across all schools (NeuraLife team only) |
| `PRINCIPAL` | All data within their school |
| `SCHOOL_ADMIN` | Same as principal, except salary/payroll |
| `TEACHER` | Students in their assigned classes, own subject data |
| `PARENT` | Only their linked children's data |
| `STUDENT` | Only their own data |
| `SYSTEM` | Cross-school read access + write to AI output tables (ML pipeline) |

### Special cases this file handles

**Parents with multiple children:**
A parent who has two children (NID-001 and NID-002) can see both. Their JWT contains:

```json
{
  "role": "PARENT",
  "linked_neura_ids": ["NID-001", "NID-002"]
}
```

The policy checks: `neura_id = ANY(linked_neura_ids)` — so they see both children's data, nothing else.

**Behaviour log visibility:**
Parents can only see behaviour incidents where `parent_visible = TRUE`. Minor classroom incidents (`DISRUPTION`) default to FALSE. Serious incidents (`BULLYING`, `PROPERTY_DAMAGE`) default to TRUE. Teachers log freely without worrying about minor notes reaching parents.

**NeuraSphere posts:**
Only `moderation_status = 'APPROVED'` posts are visible to regular users. Pending, rejected posts: only the author, school staff, and SYSTEM can see them.

**Content library:**
Content chapters and problem sets are readable by all authenticated users — they're the same SCERT content for every school. Only `SYSTEM` and `SUPER_ADMIN` can write to content tables.

**The audit log:**
Insert-only. No UPDATE or DELETE policy exists — this is intentional. Once something is logged, it cannot be altered or erased. This is your legal record.

**What happens when you run this file:**

```
Before: All tables exist, but any authenticated user can read anything
After:  Every table has RLS enabled
        Every table has 2-4 policies controlling who can read/write
        Database enforces school isolation at the data layer
        Running the verification query shows rowsecurity = true on all 74 tables
```

---

## File 003 — `003_demo_seed.sql`

**What it does:** Inserts realistic demo data into your database.

**Why we need it:** An empty database cannot demonstrate anything. When you walk into a school and open the dashboard, the principal needs to see a *living school* — students they can relate to, data that tells a story, alerts that look urgent, numbers that feel real.

The seed is not random test data. It is a carefully crafted story.

### What the demo seed creates

**Vikas High School** — located in Guntur, AP. SCERT AP board, English + Telugu medium. Principal: Dr. S. Ramana Murthy.

**6 teachers** with full profiles, salary structures, and leave balances:

| Teacher | Subject | Role |
| --- | --- | --- |
| K. Suresh Kumar | Mathematics | Class Teacher 10-A |
| P. Venkat Rao | Physical Science | Subject Teacher |
| S. Lakshmi Devi | English | Class Teacher 10-B |
| M. Rama Krishna | Telugu | Subject Teacher |
| T. Anand Babu | Social Studies | Subject Teacher |
| R. Priya Kumari | Biological Science | Class Teacher 9-A |

**30 students** across three classes with realistic Telugu names. Every student has:

- NeuraID, parent contacts, enrollment records
- Class and section assignment
- SmartPad assignment (where applicable)

**3 SmartPads** showing different fleet states:

- PAD-0001 (Arjun Reddy): Synced 2 hours ago — healthy ✅
- PAD-0013 (Arun Sharma): Last synced 3 days ago — needs attention ⚠️
- PAD-0027 (Pavan Kalyan): Offline 9 days — flagged in fleet dashboard 🔴

**The four AT_RISK students — the demo's emotional core:**

| Student | Story | What the dashboard shows |
| --- | --- | --- |
| Arun Sharma (10-B) | Mastery declining in 3 subjects for 3 weeks. No improvement. Relies on hints heavily. | CRITICAL alert — teacher has scheduled parent meeting |
| Mahesh Babu (9-A) | AT_RISK in Maths, Physics, Biology. Studies late at night. Irregular schedule. | CRITICAL alert — no intervention logged yet (principal can act) |
| Pavan Kalyan (9-A) | SmartPad offline 9 days. No data. Mastery gap unknown. | DEVICE alert in fleet dashboard — principal follows up |
| Triveni Devi (9-A) | Poor attendance + declining mastery. Combined risk. | Both attendance and mastery alerts active |

**One success story:**

Arjun Reddy (10-A): Mastery grew from 51% → 89% over 6 weeks. Teacher logged an intervention. His journey shows the system working — teacher detected gap, acted, student improved.

**Why this matters for the demo:**

When you show the principal Arun Sharma's profile and say *"This student has been declining for 3 weeks. Your class teacher scheduled a parent meeting 3 days ago. Here is the specific error pattern causing the problem — sign errors in factoring"* — that is not a feature demonstration. That is proof the product works.

### What the seed does NOT include

The seed gives you 30 students — enough for a powerful demo. A real school has 400–800 students. That data comes from the school's own enrollment using the Web Admin Console. The seed is for demonstration, not production data.

---

## The Exact Setup Steps

### Step 1 — Create a Supabase Account

1. Go to **supabase.com**
2. Click "Start your project"
3. Sign up with GitHub (fastest) or email
4. Click "New Project"
5. Fill in:
    - **Name:** neuralife-demo
    - **Database password:** generate a strong one, save it
    - **Region:** Southeast Asia (Singapore) is closest to India. Mumbai is not in the dropdown — Singapore is the best option.
    - **Plan:** Free tier is fine for now
6. Wait 2–3 minutes for the project to spin up
7. Note your **Project URL** and **API Keys** from Settings → API

### Step 2 — Install Supabase CLI

Open your terminal (VS Code terminal or system terminal):

```bash
# Install the Supabase CLI
npm install -g supabase

# Verify it installed
supabase --version
```

### Step 3 — Set Up Your Project Folder

```bash
# Create your API project folder
mkdir neuralife-api
cd neuralife-api

# Initialise Supabase
supabase init

# This creates a supabase/ folder with migrations/ inside
# Copy all three SQL files into supabase/migrations/
```

Your folder structure should look like:

```
neuralife-api/
  supabase/
    migrations/
      001_initial_schema.sql    ← paste content here
      002_rls_policies.sql      ← paste content here
      003_demo_seed.sql         ← paste content here
    config.toml
```

### Step 4 — Link to Your Supabase Project

```bash
# Login to Supabase CLI
supabase login
# This opens a browser — click "Sign in with browser"

# Link your local folder to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF
# Your project ref is in the URL: https://app.supabase.com/project/YOUR_PROJECT_REF
```

### Step 5 — Push the Schema (File 001)

```bash
supabase db push
```

This runs all files in `migrations/` in order. After it finishes:

- Open your Supabase dashboard
- Click "Table Editor" in the left sidebar
- You should see all 74 tables listed

✅ **Verify:** Open the `students` table — it should be empty with all the correct columns.

### Step 6 — Verify RLS is Enabled (File 002)

In Supabase Dashboard → SQL Editor, run:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Every row should show `rowsecurity = true`. If any show `false`, something went wrong with File 002.

### Step 7 — Verify Demo Data (File 003)

In Supabase Dashboard → SQL Editor:

```sql
-- Should return 1 school
SELECT id, name, district FROM schools;

-- Should return 6 teachers
SELECT full_name FROM teachers;

-- Should return 30 students
SELECT COUNT(*) FROM students;

-- Should return 3 devices
SELECT id, assigned_neura_id, last_sync_at FROM smartpad_devices;

-- Should show AT_RISK students
SELECT neura_id, subject, topic, raw_score, classification
FROM calibrated_mastery_scores
WHERE classification = 'AT_RISK'
ORDER BY raw_score;
```

### Step 8 — Generate TypeScript Types

```bash
supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.ts
```

This creates a TypeScript file where every table is perfectly typed. In your code:

```tsx
import type { Database } from './types/database'
import type { Tables } from './types/database'

// TypeScript now knows exactly what a student looks like
const student: Tables<'students'>
// student.neura_id → string
// student.full_name → string
// student.band → 'FOUNDATION' | 'ELEMENTARY' | 'MIDDLE' | 'SECONDARY'
// student.status → 'ACTIVE' | 'ALUMNI' | 'TRANSFERRING' | 'DEACTIVATED'
// student.xyz → TypeScript error — column doesn't exist
```

You get zero runtime "undefined is not a function" errors because TypeScript tells you at compile time.

---

## Environment Variables You Need

After setup, create a `.env` file in your project root. Get these values from Supabase Dashboard → Settings → API:

```bash
# Supabase
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=eyJ...          # public, safe to use in browser/app
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # private, ONLY in backend — never in frontend

# JWT (for our custom auth — same secret as Supabase uses)
SUPABASE_JWT_SECRET=your-jwt-secret   # from Dashboard → Settings → API → JWT Settings
JWT_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----...
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...

# Third-party services
MSG91_AUTH_KEY=your_msg91_key
MSG91_SENDER_ID=NRLIFE
ANTHROPIC_API_KEY=sk-ant-...
FCM_SERVER_KEY=your_firebase_key
RESEND_API_KEY=re_...
```

⚠️ **Never commit .env to git.** Add `.env` to `.gitignore` immediately.

---

## What's Next After This

With the database live, you have completed Layer 0 of the build. The sequence from here:

```
✅ Layer 0: Schema (this document)
             74 tables, RLS policies, demo data

🔲 Layer 1: API Gateway (neuralife-api)
             Node.js + Fastify + TypeScript
             Auth routes (OTP → JWT), NeuraID routes

🔲 Layer 2: Web Admin Console
             React 18 + Vite + Tailwind + shadcn/ui
             Principal dashboard showing your demo school data

🔲 Layer 3: Teacher Mobile App
             React Native — Schedule, attendance, class mastery

🔲 Layer 4: Cloud AI Pipelines
             Python + FastAPI — calibration + Claude insights

🔲 Layer 5: Parent & Student App
             React Native — daily insight, parent view

🔲 Layer 6: SmartPad Kiosk App
             Kotlin — kiosk mode, HWR-1, session sync
```

At the end of Layer 6, you have a working end-to-end demo: student writes on tablet → syncs → insight generated → parent sees it.

---

## Quick Reference — File Purposes

| File | Analogy | What it creates | When to re-run |
| --- | --- | --- | --- |
| `001_initial_schema.sql` | Blueprint of a building | 74 empty tables, all indexes, all ENUMs | Never (write new migration files for changes) |
| `002_rls_policies.sql` | Locks on every door | Security rules for every table | Never (write new policy files for changes) |
| `003_demo_seed.sql` | Furnishing the rooms | Demo school, 30 students, 6 weeks of data | Only in development — never in production |

**The golden rule about migrations:**
Once a migration file is pushed and working — **never edit it**. If you need to change the schema later, create a new file: `004_add_column_xyz.sql`. This keeps a complete, reproducible history of every database change.