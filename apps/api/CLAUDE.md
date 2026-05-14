# NeuraLife API — apps/api Context

> Adds API-specific rules ON TOP of root CLAUDE.md. Both are always in effect.

---

## This Package

**Purpose:** API Gateway — all HTTP requests from web, mobile, SmartPad, and ML service.
**Port:** 3001 | **Framework:** Fastify 4.x | **Language:** TypeScript strict

---

## Package Structure

```
apps/api/src/
├── server.ts              ← Fastify app, plugin registration, graceful shutdown
├── routes/                ← HTTP handlers only (no business logic)
│   ├── auth.ts            OTP, JWT, PIN, refresh, logout
│   ├── identity.ts        NeuraID generate/fetch/transfer
│   ├── schools.ts         School CRUD + onboarding wizard
│   ├── students.ts        Enrollment, admission, yearly progress
│   ├── teachers.ts        Assignments, salary, leave
│   ├── attendance.ts      Mark, correct, query
│   ├── homework.ts        Assign, submit, track
│   ├── exams.ts           Schedule, results, marks
│   ├── fees.ts            Ledger, payments, receipts
│   ├── salary.ts          Payroll, payslips
│   ├── sync.ts            SmartPad session sync (SYSTEM role)
│   ├── ota.ts             Model update check + push
│   ├── analytics.ts       Dashboard, insights, reports
│   ├── sphere.ts          NeuraSphere posts, moderation
│   ├── notifications.ts   FCM + SMS dispatch
│   └── fleet.ts           SmartPad device management
├── repositories/          ← ALL database queries live here
│   ├── student.repository.ts
│   ├── teacher.repository.ts
│   ├── attendance.repository.ts
│   ├── fee.repository.ts
│   ├── mastery.repository.ts
│   └── notification.repository.ts
├── services/              ← Business logic, orchestrates repositories
│   ├── auth.service.ts
│   ├── identity.service.ts
│   ├── student.service.ts
│   ├── teacher.service.ts
│   ├── attendance.service.ts
│   ├── fee.service.ts
│   ├── notification.service.ts
│   └── insight.service.ts
├── middleware/
│   ├── jwt.ts             RS256 verify, attach payload to request
│   ├── rateLimiter.ts     Per-route limits
│   ├── roleGuard.ts       RBAC enforcement
│   ├── schoolGuard.ts     Verify school_id in JWT matches context
│   ├── correlationId.ts   Attach x-correlation-id to every request
│   └── audit.ts           Writes to audit_log on sensitive operations
├── lib/
│   ├── supabase.ts        supabaseAnon + supabaseAdmin
│   ├── config.ts          Zod-validated env vars (fails fast on missing vars)
│   ├── logger.ts          Pino structured logger
│   ├── msg91.ts           OTP SMS
│   ├── fcm.ts             Firebase Admin push
│   ├── resend.ts          Email
│   ├── claude.ts          AWS Bedrock client
│   └── jwt.ts             RS256 sign + verify
├── utils/
│   ├── errors.ts          Typed error classes
│   ├── retry.ts           Exponential backoff + circuit breaker
│   ├── hash.ts            SHA-256 for OTP + Aadhaar
│   ├── receiptNumber.ts   Generator: VHS-2526-000142
│   └── neuraId.ts         Generator: NID-2025-AP-084291
└── types/
    └── api.ts             Request/response Zod schemas
```

---

## The 3-Layer Rule — Strict

```
Route Handler  →  only: validate request, call service, return response
Service        →  only: business logic, call repositories, call external APIs
Repository     →  only: database queries via Supabase client

NEVER:
- Route handler queries the database directly
- Service creates Supabase clients
- Repository contains business logic
```

---

## Repository Pattern — Every DB Query

```typescript
// src/repositories/student.repository.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tables, Database } from "@neuralife/shared";
import { DatabaseError, NotFoundError } from "../utils/errors";
import type { Logger } from "pino";

type Student = Tables<"students">;

export class StudentRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: Logger,
  ) {}

  async findByNeuraId(
    neuraId: string,
    correlationId: string,
  ): Promise<Student> {
    this.logger.debug(
      { correlationId, neuraId },
      "StudentRepository.findByNeuraId",
    );

    const { data, error } = await this.supabase
      .from("students")
      .select(
        "neura_id, full_name, band, status, date_of_birth, gender, data_consent_given",
      )
      .eq("neura_id", neuraId)
      .is("deleted_at", null)
      .single();

    if (error)
      throw new DatabaseError(error.message, { neuraId, correlationId });
    if (!data)
      throw new NotFoundError("Student not found", { neura_id: neuraId });

    return data;
  }

  async findBySchool(
    schoolId: string,
    filters: { classYear?: number; section?: string; status?: string },
    correlationId: string,
  ): Promise<Student[]> {
    this.logger.debug(
      { correlationId, schoolId, filters },
      "StudentRepository.findBySchool",
    );

    let query = this.supabase
      .from("students")
      .select(
        `
        neura_id, full_name, band, status,
        student_yearly_progress!inner(class_year, section, academic_year_id)
      `,
      )
      .eq("student_yearly_progress.academic_year_id", filters.classYear ?? "")
      .is("deleted_at", null);

    if (filters.classYear) {
      query = query.eq("student_yearly_progress.class_year", filters.classYear);
    }
    if (filters.section) {
      query = query.eq("student_yearly_progress.section", filters.section);
    }

    const { data, error } = await query;
    if (error)
      throw new DatabaseError(error.message, { schoolId, correlationId });
    return data ?? [];
  }
}
```

---

## Structured Logging — Pino (mandatory)

```typescript
// src/lib/logger.ts
import pino from "pino";
import { config } from "./config";

export const logger = pino({
  level: config.LOG_LEVEL,
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: ["*.password", "*.pin", "*.otp", "*.aadhaar_hash", "*.private_key"],
});

// In every function — always pass correlationId
logger.info(
  { correlationId, userId, action: "student.enrolled" },
  "Student enrolled",
);
logger.error({ correlationId, error, neuraId }, "Failed to fetch mastery data");
logger.warn({ correlationId, attempts: 2 }, "OTP verify attempt");

// NEVER use console.log, console.error, console.warn in application code
```

---

## Retry Logic — All External APIs

```typescript
// src/utils/retry.ts
export interface RetryOptions {
  maxAttempts: number;
  backoffMs: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
  correlationId: string,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === options.maxAttempts) break;

      const delay = options.backoffMs * Math.pow(2, attempt - 1);
      logger.warn({ correlationId, attempt, delay }, "Retrying after failure");

      options.onRetry?.(attempt, lastError);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Usage:
const response = await withRetry(
  () => bedrockClient.invokeModel(command),
  { maxAttempts: 3, backoffMs: 1000 },
  correlationId,
);
```

---

## Typed Error Classes (use always)

```typescript
// src/utils/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "NOT_FOUND", 404, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", details?: Record<string, unknown>) {
    super(message, "UNAUTHORIZED", 401, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", details?: Record<string, unknown>) {
    super(message, "FORBIDDEN", 403, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 422, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "DATABASE_ERROR", 500, details);
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(`${service}: ${message}`, "EXTERNAL_SERVICE_ERROR", 502, details);
  }
}

export class IdempotencyError extends AppError {
  constructor(key: string) {
    super("Request already processed", "IDEMPOTENCY_CONFLICT", 409, { key });
  }
}
```

---

## Route Handler Pattern — Follow Exactly

```typescript
// src/routes/students.ts
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { StudentService } from "../services/student.service";
import { requireRole } from "../middleware/roleGuard";

const AdmitStudentSchema = z.object({
  full_name: z.string().min(2).max(100).trim(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  parent_mobile: z.string().regex(/^\+91[6-9]\d{9}$/, "Invalid Indian mobile"),
  parent_name: z.string().min(2).max(100).trim(),
});

const routes: FastifyPluginAsync = async (fastify) => {
  const studentService = new StudentService(fastify.supabaseAnon, fastify.log);

  fastify.post(
    "/",
    {
      preHandler: [
        fastify.authenticate,
        requireRole(["PRINCIPAL", "SCHOOL_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const correlationId = request.correlationId;
      const body = AdmitStudentSchema.parse(request.body);
      const { school_id } = request.jwtPayload; // ALWAYS from JWT

      const student = await studentService.admitStudent(
        body,
        school_id,
        correlationId,
      );

      fastify.log.info(
        { correlationId, neuraId: student.neura_id },
        "Student admitted",
      );
      return reply.code(201).send({ data: student });
    },
  );
};

export default routes;
```

---

## Idempotency Pattern (fee payments, enrollment)

```typescript
// Apply to any operation that must not run twice
async function processWithIdempotency<T>(
  key: string,
  fn: () => Promise<T>,
  correlationId: string,
): Promise<T> {
  // Check if already processed
  const existing = await idempotencyRepo.find(key);
  if (existing) {
    logger.info(
      { correlationId, key },
      "Idempotency hit — returning cached response",
    );
    return existing.response as T;
  }

  const result = await fn();

  // Store result for 24 hours
  await idempotencyRepo.store(key, result, 24 * 60 * 60);
  return result;
}

// Usage in fee payment route:
const idempotencyKey = request.headers["x-idempotency-key"] as string;
if (!idempotencyKey)
  throw new ValidationError("x-idempotency-key header required");

const payment = await processWithIdempotency(
  `fee-payment:${idempotencyKey}`,
  () => feeService.processPayment(body, school_id, correlationId),
  correlationId,
);
```

---

## API Conventions

```
Base:           /api/v1/
Auth:           Bearer {jwt} in Authorization header
Correlation:    x-correlation-id header (auto-generated if missing)
Idempotency:    x-idempotency-key header (required for mutations)
Content-Type:   application/json
Success:        { data: T } or { data: T[], meta: { total, page, limit } }
Error:          { error: string, code: string, correlationId: string, details?: object }
Pagination:     ?page=1&limit=20 (max limit: 100)
```

---

## Health Check (always implement first)

```typescript
fastify.get("/health", async (request, reply) => {
  const checks = await Promise.allSettled([
    supabaseAnon.from("schools").select("id").limit(1),
  ]);

  const healthy = checks.every((c) => c.status === "fulfilled");

  return reply.code(healthy ? 200 : 503).send({
    status: healthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    checks: {
      database: checks[0].status === "fulfilled" ? "ok" : "error",
    },
  });
});
```

---

## OTP Security Rules

```
Generate:  6-digit random
Store:     SHA-256(otp) — NOT raw, NOT bcrypt (lookup use case)
TTL:       10 minutes
Attempts:  5 max → 30-minute lockout
Rate:      3 OTP requests per mobile per 10 minutes
Delivery:  MSG91 DLT-registered template
```

---

## Testing Pattern

```typescript
// tests/routes/students.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildTestApp } from "../helpers/testApp";
import { makePrincipalJWT, makeWrongSchoolJWT } from "../helpers/jwt";

describe("POST /api/v1/students", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    app = await buildTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it("admits student for principal", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/students",
      headers: { authorization: `Bearer ${makePrincipalJWT()}` },
      payload: {
        full_name: "Test Student",
        date_of_birth: "2009-01-15",
        parent_mobile: "+919876543210",
        parent_name: "Test Parent",
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.neura_id).toMatch(/^NID-\d{4}-AP-\d{6}$/);
  });

  it("rejects without idempotency key for financial ops", async () => {
    // ...
  });

  it("returns 403 for wrong school JWT", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/students",
      headers: { authorization: `Bearer ${makeWrongSchoolJWT()}` },
      payload: {
        /* valid payload */
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 422 for invalid mobile format", async () => {
    // ...
  });
});
```
