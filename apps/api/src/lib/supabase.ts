import { createClient } from '@supabase/supabase-js'
import type { Database } from '@neuralife/shared'
import WebSocket from 'ws'
import { config } from './config.js'

// ws package WebSocket type doesn't satisfy browser WebSocket signature — intentional cast
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wsOptions = { realtime: { transport: WebSocket as any } }

export const supabaseAnon = createClient<Database>(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY,
  wsOptions,
)

/**
 * Bypasses RLS.
 * ⚠️ ONLY use in: cron jobs, ML service callbacks, SUPER_ADMIN operations.
 * NEVER use in user-facing route handlers.
 */
export const supabaseAdmin = createClient<Database>(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  wsOptions,
)
