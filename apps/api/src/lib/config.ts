import { z } from 'zod'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../../../../')

// Step 1: load secrets (.env — gitignored, never committed)
dotenv.config({ path: path.resolve(root, '.env') })

// Step 2: load environment-specific feature flags (.env.development or .env.production)
// These files contain no secrets and are safe to commit.
// Values here override any matching keys already set from .env.
const nodeEnv = process.env.NODE_ENV ?? 'development'
dotenv.config({ path: path.resolve(root, `.env.${nodeEnv}`), override: true })

const schema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_JWT_SECRET: z.string().min(10),
  JWT_PRIVATE_KEY: z.string().min(50),
  JWT_PUBLIC_KEY: z.string().min(50),
  AWS_ACCESS_KEY_ID: z.string().min(16),
  AWS_SECRET_ACCESS_KEY: z.string().min(30),
  AWS_REGION: z.string().default('ap-south-1'),
  BEDROCK_MODEL_ID: z.string().default('us.anthropic.claude-sonnet-4-5-20250929-v1:0'),
  GEMINI_API_KEY: z.string().optional(),
  // gemini-2.5-flash: fast structured JSON, ideal for content generation (vs pro which is a slow thinking model)
  GEMINI_MODEL_ID: z.string().default('gemini-2.5-flash'),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_SENDER_ID: z.string().default('NRLIFE'),
  MSG91_OTP_TEMPLATE_ID: z.string().optional(),
  FCM_PROJECT_ID: z.string().optional(),
  FCM_CLIENT_EMAIL: z.string().optional(),
  FCM_PRIVATE_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('noreply@neuralife.in'),
  // Feature flags — controlled by .env.development / .env.production
  ENABLE_SMS_OTP: z.string().default('false'),
  ENABLE_FCM_PUSH: z.string().default('false'),
  ENABLE_EMAIL: z.string().default('false'),
  ENABLE_RATE_LIMIT: z.string().default('false'),
  ML_INTERNAL_API_KEY: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
})

const result = schema.safeParse(process.env)

if (!result.success) {
  const missing = result.error.issues
    .map((i) => `  ${i.path.join('.')}: ${i.message}`)
    .join('\n')
  console.error('Missing or invalid environment variables:\n' + missing)
  process.exit(1)
}

export const config = result.data
