# NeuraLife Web — apps/web Context

> Adds web-specific rules on top of root CLAUDE.md.

---

## This Package

**Purpose:** Web Admin Console — used by principals and school admins.
**Stack:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Framer Motion

---

## Package Structure

```
apps/web/src/
├── main.tsx
├── App.tsx                    ← Router + global providers
├── pages/
│   ├── Login/                 OTP login flow
│   ├── Dashboard/             School Health Score + Priority Panel
│   ├── Students/              List + Admission + 360° profile
│   ├── Teachers/              List + Profile + Salary + Leave
│   ├── Attendance/            Class-wise daily view
│   ├── Exams/                 Schedule + Marks entry
│   ├── Fees/                  Collection + Ledger + Receipts
│   ├── Salary/                Payroll + Payslips
│   ├── Fleet/                 SmartPad device management
│   ├── Analytics/             Mastery + Reports
│   ├── NeuraSphere/           Post moderation
│   └── Settings/              School config + Onboarding wizard
├── components/
│   ├── ui/                    shadcn/ui (never modify these files)
│   ├── layout/                Shell, Sidebar, Header, Breadcrumb, PageHeader
│   ├── charts/                Recharts wrappers with NeuraLife styling
│   ├── forms/                 React Hook Form + Zod form components
│   ├── feedback/              Toast, Alert, ConfirmDialog, EmptyState
│   └── data/                  DataTable, Pagination, FilterBar
├── hooks/
│   ├── useAuth.ts
│   ├── useSchool.ts
│   ├── useStudents.ts
│   ├── useTeachers.ts
│   ├── useAttendance.ts
│   └── useFees.ts
├── lib/
│   ├── api.ts                 Typed fetch wrapper
│   ├── queryClient.ts         TanStack Query config
│   ├── supabase.ts            Realtime subscriptions
│   └── utils.ts               cn(), formatters
├── store/
│   ├── authStore.ts           Zustand: JWT, role, school_id
│   └── uiStore.ts             Sidebar, theme, active nav
└── styles/
    ├── globals.css            Tailwind base + CSS variables
    └── fonts.css              Inter + Noto Sans Telugu
```

---

## NeuraLife Design Tokens

**These are the ONLY colours, spacing, and typography values used across the entire web app.**
Never hardcode hex values in components. Always use CSS variables or Tailwind classes.

```css
/* styles/globals.css */
:root {
  /* Brand */
  --primary: #1e40af; /* Deep blue — trust, intelligence */
  --primary-light: #dbeafe; /* Blue tint — highlights */
  --secondary: #0d9488; /* Teal — growth */
  --secondary-light: #ccfbf1; /* Teal tint */
  --accent: #f59e0b; /* Amber — SmartPad, alerts */

  /* Semantic */
  --success: #10b981; /* Green — mastery, achievement */
  --danger: #ef4444; /* Red — AT_RISK, urgent */
  --warning: #f59e0b; /* Amber — watch, declining */
  --info: #3b82f6; /* Blue — informational */

  /* Surface */
  --background: #f8fafc;
  --surface: #ffffff;
  --surface-raised: #f1f5f9; /* Hover states, striped rows */
  --border: #e2e8f0;
  --border-focus: #1e40af;

  /* Text */
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --text-inverse: #ffffff;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Shadow */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

  /* Animation timing */
  --ease-micro: 150ms ease-out;
  --ease-default: 250ms ease-in-out;
  --ease-enter: 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

---

## Component Rules

```typescript
// ✅ ALWAYS use shadcn/ui for base components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

// ✅ ALWAYS use Tailwind — no inline styles, no custom CSS files
<div className="flex items-center gap-4 rounded-xl bg-surface p-6 shadow-sm" />

// ✅ Telugu text — always mark with correct class and lang
<p className="font-telugu" lang="te">{insight.summary_text}</p>

// ❌ NEVER
<input type="text" />          // use shadcn Input
<div style={{ color: 'red' }}> // use Tailwind
const color = '#EF4444'        // use CSS variable
```

---

## Framer Motion — Animation Standards

**Every animated element uses these pre-defined variants. Never create ad-hoc animations.**

```typescript
// lib/animations.ts — import from here, don't define inline
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const slideUp = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
  exit: { opacity: 0, y: 8, transition: { duration: 0.15 } },
};

export const staggerChildren = {
  animate: { transition: { staggerChildren: 0.04 } },
};

export const listItem = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
};

export const numberChange = {
  // Use with AnimatePresence + key={value} on a span
  initial: { opacity: 0, y: -12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
};
```

**Usage:**

```typescript
import { motion, AnimatePresence } from 'framer-motion'
import { slideUp, staggerChildren, listItem } from '@/lib/animations'

// Page entry
<motion.div variants={slideUp} initial="initial" animate="animate">
  <PageContent />
</motion.div>

// Staggered list
<motion.ul variants={staggerChildren} initial="initial" animate="animate">
  {students.map(s => (
    <motion.li key={s.neura_id} variants={listItem}>
      <StudentRow student={s} />
    </motion.li>
  ))}
</motion.ul>

// Animated number (mastery score, attendance count)
<AnimatePresence mode="wait">
  <motion.span key={count} {...numberChange}>
    {count}
  </motion.span>
</AnimatePresence>
```

---

## Mandatory UI States (every data component)

**Never ship a component without all four states.**

```typescript
// Template: every data-fetching component
export function StudentList({ classYear }: { classYear: number }) {
  const { data, isLoading, isError, refetch } = useStudents(classYear)

  // 1. LOADING — skeleton that matches the loaded layout exactly
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  // 2. ERROR — inline, always has retry button
  if (isError) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-8 w-8 text-danger" />}
        title="Could not load students"
        description="Check your connection and try again."
        action={<Button onClick={() => refetch()}>Try again</Button>}
      />
    )
  }

  // 3. EMPTY — meaningful message with action
  if (!data?.length) {
    return (
      <EmptyState
        icon={<Users className="h-8 w-8 text-muted" />}
        title="No students yet"
        description="Admit the first student to get started."
        action={<Button onClick={onAdmit}>Admit student</Button>}
      />
    )
  }

  // 4. DATA — with optimistic updates on mutations
  return <StudentTable students={data} />
}
```

---

## Data Fetching Pattern

```typescript
// hooks/useStudents.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Student } from "@neuralife/shared";

export function useStudents(classYear?: number, section?: string) {
  return useQuery({
    queryKey: ["students", { classYear, section }],
    queryFn: () =>
      api.get<Student[]>("/students", { class_year: classYear, section }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAdmitStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AdmitStudentInput) =>
      api.post<Student>("/students", data, {
        headers: { "x-idempotency-key": crypto.randomUUID() },
      }),

    // Optimistic update
    onMutate: async (newStudent) => {
      await queryClient.cancelQueries({ queryKey: ["students"] });
      const previous = queryClient.getQueryData(["students"]);
      queryClient.setQueryData(["students"], (old: Student[]) => [
        ...old,
        { ...newStudent, neura_id: "pending", status: "ACTIVE" },
      ]);
      return { previous };
    },

    onError: (err, _, context) => {
      queryClient.setQueryData(["students"], context?.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
```

---

## Page Structure

```typescript
// Every page follows this exact pattern
export default function StudentsPage() {
  return (
    <PageLayout>                              {/* handles title, breadcrumb */}
      <PageHeader
        title="Students"
        description="Manage enrollment and track learning"
        action={<AdmitStudentButton />}
      />
      <motion.div
        variants={slideUp}
        initial="initial"
        animate="animate"
        className="space-y-6"
      >
        <StudentFilters />
        <StudentList />
      </motion.div>
    </PageLayout>
  )
}
```

---

## Sidebar Navigation — NeuraLife Specific

```typescript
// Sidebar items match school principal's mental model exactly
const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/", badge: null },
  {
    label: "Students",
    icon: Users,
    href: "/students",
    badge: atRiskCount > 0 ? atRiskCount : null,
  },
  { label: "Teachers", icon: GraduationCap, href: "/teachers", badge: null },
  {
    label: "Attendance",
    icon: CalendarCheck,
    href: "/attendance",
    badge: null,
  },
  { label: "Exams", icon: FileText, href: "/exams", badge: null },
  {
    label: "Fees",
    icon: IndianRupee,
    href: "/fees",
    badge: overdueCount > 0 ? overdueCount : null,
  },
  {
    label: "Salary",
    icon: Wallet,
    href: "/salary",
    badge: pendingCount > 0 ? pendingCount : null,
  },
  {
    label: "SmartPads",
    icon: Tablet,
    href: "/fleet",
    badge: offlineCount > 0 ? offlineCount : null,
  },
  { label: "Analytics", icon: BarChart3, href: "/analytics", badge: null },
  {
    label: "NeuraSphere",
    icon: Globe2,
    href: "/sphere",
    badge: pendingMod > 0 ? pendingMod : null,
  },
  { label: "Settings", icon: Settings2, href: "/settings", badge: null },
];
// AT_RISK count badge on Students nav is the dashboard in one number.
// Overdue fees badge keeps principal financially aware without opening the page.
```

---

## Real-time Updates (Supabase Realtime)

```typescript
// hooks/useRealtimeAttendance.ts
export function useRealtimeAttendance(schoolId: string, date: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`attendance:${schoolId}:${date}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
          filter: `school_id=eq.${schoolId}`,
        },
        (payload) => {
          // Surgical update — not full refetch
          queryClient.setQueryData(
            ["attendance", schoolId, date],
            (old: AttendanceRecord[]) =>
              updateAttendanceRecord(old, payload.new),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [schoolId, date, queryClient]);
}
```

---

## Accessibility (WCAG 2.1 AA — non-negotiable)

```typescript
// Every interactive element must have:
<Button aria-label="Admit new student">
  <UserPlus className="h-4 w-4" aria-hidden="true" />
  Admit Student
</Button>

// Status indicators — never colour alone
<Badge variant="destructive">
  <AlertCircle className="h-3 w-3 mr-1" aria-hidden="true" />
  AT_RISK          {/* icon + text, not just colour */}
</Badge>

// Focus visible — never remove
// tailwind.config.ts → extend → outline: 2px solid var(--primary)

// Telugu content — correct language attribute
<p lang="te" className="font-telugu">{teluguText}</p>
```
