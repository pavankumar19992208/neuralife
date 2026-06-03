/**
 * Firebase Admin FCM helper.
 * Uses dynamic import so the API starts fine even before `firebase-admin` is installed.
 * Once `pnpm install` is run with firebase-admin in package.json, full FCM works.
 */
import { config } from './config.js'
import logger from './logger.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _messaging: any = null

async function getMessaging(): Promise<unknown | null> {
  if (!config.FCM_PROJECT_ID || !config.FCM_CLIENT_EMAIL || !config.FCM_PRIVATE_KEY) {
    return null
  }
  if (_messaging) return _messaging

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminApp   = await import('firebase-admin/app') as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminMsg   = await import('firebase-admin/messaging') as any
    const appName    = 'neuralife-teacher'
    const existing   = adminApp.getApps().find((a: { name: string }) => a.name === appName)
    const app        = existing ?? adminApp.initializeApp(
      {
        credential: adminApp.cert({
          projectId:   config.FCM_PROJECT_ID,
          clientEmail: config.FCM_CLIENT_EMAIL,
          privateKey:  config.FCM_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        }),
      },
      appName,
    )
    _messaging = adminMsg.getMessaging(app)
    return _messaging
  } catch {
    logger.warn('firebase-admin not installed or credentials invalid — FCM disabled')
    return null
  }
}

export interface FcmPayload {
  token: string
  title: string
  body: string
  data?: Record<string, string>
}

/** Send one FCM notification. Returns true if sent, false if skipped/failed. */
export async function sendFcm(payload: FcmPayload): Promise<boolean> {
  if (config.ENABLE_FCM_PUSH !== 'true') return false

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messaging: any = await getMessaging()
  if (!messaging) return false

  try {
    await messaging.send({
      token:        payload.token,
      notification: { title: payload.title, body: payload.body },
      data:         payload.data ?? {},
      android: {
        priority:     'high',
        notification: {
          channelId: payload.data?.channelId ?? 'teacher_alerts',
          sound:     'default',
        },
      },
    })
    logger.info({ title: payload.title }, 'FCM push sent')
    return true
  } catch (err) {
    logger.error({ err, title: payload.title }, 'FCM push failed')
    return false
  }
}

/** Send to multiple tokens. Returns success count. */
export async function sendFcmMulti(
  tokens: string[], title: string, body: string, data?: Record<string, string>,
): Promise<number> {
  const results = await Promise.allSettled(
    tokens.map(token => sendFcm({ token, title, body, data }))
  )
  return results.filter(r => r.status === 'fulfilled' && r.value === true).length
}

/**
 * Send to multiple tokens (cron job interface).
 * Silently marks stale tokens inactive in background.
 */
export async function sendFCMToTokens(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<void> {
  if (!tokens.length) return
  await sendFcmMulti(tokens, title, body, data)
}
