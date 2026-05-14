import { config } from './config.js'
import logger from './logger.js'
import { withRetry } from '../utils/retry.js'
import { ExternalServiceError } from '../utils/errors.js'

export interface SendOtpResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendOtp(
  mobile: string,
  otp: string,
  correlationId: string,
): Promise<SendOtpResult> {
  if (config.ENABLE_SMS_OTP !== 'true') {
    logger.info({ correlationId, mobile: mobile.slice(-4), otp }, '📱 DEV OTP (SMS disabled)')
    return { success: true }
  }

  try {
    const result = await withRetry(
      async () => {
        const res = await fetch('https://api.msg91.com/api/v5/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            authkey: config.MSG91_AUTH_KEY,
            mobile: mobile.replace('+', ''),
            otp,
            sender: config.MSG91_SENDER_ID,
          }),
        })
        if (!res.ok) {
          const body = await res.text()
          throw new ExternalServiceError('MSG91', `HTTP ${res.status}: ${body}`)
        }
        return res.json() as Promise<{ type: string; message: string }>
      },
      correlationId,
      { maxAttempts: 2, backoffMs: 1000 },
    )

    logger.info({ correlationId, mobile: mobile.slice(-4) }, 'OTP SMS delivered')
    return { success: true, messageId: (result as Record<string, string>).message }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    logger.error({ correlationId, error }, 'MSG91 OTP delivery failed')
    return { success: false, error }
  }
}
