/**
 * Server-side cron notification jobs — Layer 2 of the two-layer push system.
 *
 * Layer 1 (device): @notifee scheduled triggers at period start/end (requires app to be opened).
 * Layer 2 (here):   node-cron fires every 5 min, Mon-Sat 7AM-4PM IST, regardless of app state.
 *
 * Jobs check DB functions for periods that started/ended in last 5 min with no action taken,
 * then push FCM to that teacher's registered devices.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

// Type-only definition — avoids importing @types/node-cron before pnpm install
interface CronTask { stop: () => void }
interface CronModule {
  schedule: (
    expression: string,
    fn: () => void | Promise<void>,
    options?: { timezone?: string }
  ) => CronTask
}

let _cron: CronModule | null = null

async function getCron(): Promise<CronModule> {
  if (_cron) return _cron
  // Dynamic import so the server starts even before `pnpm install` adds node-cron.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — node-cron types installed by @types/node-cron after pnpm install
  _cron = (await import('node-cron')) as unknown as CronModule
  return _cron
}

type FCMSender = (
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>,
) => Promise<void>

// ─── IST helpers ──────────────────────────────────────────────────────────────

function getISTTimeString(): string {
  const now = new Date()
  const istMs = now.getTime() + (5.5 * 60 + now.getTimezoneOffset()) * 60000
  return new Date(istMs).toTimeString().slice(0, 5) // 'HH:MM'
}

function getISTDayOfWeek(): string {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const now = new Date()
  const istMs = now.getTime() + (5.5 * 60 + now.getTimezoneOffset()) * 60000
  return days[new Date(istMs).getDay()] ?? 'MON'
}

function getISTDate(): string {
  const now = new Date()
  const istMs = now.getTime() + (5.5 * 60 + now.getTimezoneOffset()) * 60000
  return new Date(istMs).toISOString().slice(0, 10)
}

function subtractMinutes(timeStr: string, mins: number): string {
  const [hh, mm] = timeStr.split(':').map(Number)
  const totalMins = (hh ?? 0) * 60 + (mm ?? 0) - mins
  const h = Math.max(0, Math.floor(totalMins / 60))
  const m = Math.max(0, totalMins % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function addMinutes(timeStr: string, mins: number): string {
  const [hh, mm] = timeStr.split(':').map(Number)
  const totalMins = (hh ?? 0) * 60 + (mm ?? 0) + mins
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ─── Job 1: Attendance reminders ──────────────────────────────────────────────

/**
 * Runs every 5 min during school hours (7AM-4PM IST, Mon-Sat).
 * Finds periods that started in the last 5 min with no attendance yet.
 * Sends push to the responsible teacher.
 */
export async function startAttendanceReminderJob(
  supabase: SupabaseClient,
  sendFCM: FCMSender,
): Promise<CronTask> {
  const cron = await getCron()
  return cron.schedule('*/5 7-16 * * 1-6', async () => {
    try {
      const timeNow = getISTTimeString()
      const fromTime = subtractMinutes(timeNow, 5)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: duePeriods, error } = await (supabase as any)
        .rpc('get_attendance_due_periods', {
          p_day_of_week: getISTDayOfWeek(),
          p_time_from:   fromTime,
          p_time_to:     timeNow,
          p_date:        getISTDate(),
        })

      if (error) {
        console.error('[AttendanceJob] DB error:', error.message)
        return
      }
      if (!duePeriods?.length) return

      for (const period of duePeriods as Array<{
        slot_id: string; teacher_id: string; school_id: string;
        class_year: number; section: string; subject: string; start_time: string;
      }>) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: tokenRows } = await (supabase as any)
          .from('fcm_tokens')
          .select('token')
          .eq('user_id', period.teacher_id)
          .eq('user_type', 'TEACHER')
          .eq('is_active', true)

        const tokens = (tokenRows as Array<{token: string}> ?? []).map(r => r.token)
        if (!tokens.length) continue

        await sendFCM(
          tokens,
          '📚 Mark Attendance',
          `${period.subject} · Class ${period.class_year}-${period.section} — attendance due`,
          {
            type: 'ATTENDANCE',
            screen: 'AttendanceMark',
            slotId: period.slot_id,
            classYear: String(period.class_year),
            section: period.section,
            subject: period.subject,
          },
        )
        console.log(`[AttendanceJob] Notified teacher ${period.teacher_id.slice(0, 8)} for ${period.class_year}-${period.section} ${period.subject}`)
      }
    } catch (err) {
      console.error('[AttendanceJob] Unexpected error:', err)
    }
  }, { timezone: 'Asia/Kolkata' })
}

// ─── Job 2: Coverage reminders ────────────────────────────────────────────────

/**
 * Runs every 5 min during school hours.
 * Finds periods ending in the next 5 min with no coverage logged.
 * Sends push to remind teacher to log what they taught.
 */
export async function startCoverageReminderJob(
  supabase: SupabaseClient,
  sendFCM: FCMSender,
): Promise<CronTask> {
  const cron = await getCron()
  return cron.schedule('*/5 7-16 * * 1-6', async () => {
    try {
      const timeNow = getISTTimeString()
      const futureTime = addMinutes(timeNow, 5)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: duePeriods, error } = await (supabase as any)
        .rpc('get_coverage_due_periods', {
          p_day_of_week: getISTDayOfWeek(),
          p_end_from:    timeNow,
          p_end_to:      futureTime,
          p_date:        getISTDate(),
        })

      if (error || !duePeriods?.length) return

      for (const period of duePeriods as Array<{
        slot_id: string; teacher_id: string; school_id: string;
        class_year: number; section: string; subject: string; end_time: string;
      }>) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: tokenRows } = await (supabase as any)
          .from('fcm_tokens')
          .select('token')
          .eq('user_id', period.teacher_id)
          .eq('user_type', 'TEACHER')
          .eq('is_active', true)

        const tokens = (tokenRows as Array<{token: string}> ?? []).map(r => r.token)
        if (!tokens.length) continue

        await sendFCM(
          tokens,
          '📋 Log Coverage',
          `${period.subject} ends in 5 min · Class ${period.class_year}-${period.section}. What did you cover?`,
          {
            type: 'COVERAGE',
            screen: 'MarkCoverage',
            slotId: period.slot_id,
            classYear: String(period.class_year),
            section: period.section,
            subject: period.subject,
          },
        )
      }
    } catch (err) {
      console.error('[CoverageJob] Unexpected error:', err)
    }
  }, { timezone: 'Asia/Kolkata' })
}
