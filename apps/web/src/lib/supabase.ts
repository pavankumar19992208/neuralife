import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Used only for Realtime subscriptions (attendance change notifications).
// API data fetching goes through the /api/v1 proxy in api.ts — no VITE_ vars needed for that.
// When VITE_SUPABASE_URL is not set, Realtime won't work but data fetching still does.
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null
