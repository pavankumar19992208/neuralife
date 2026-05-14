import pino from 'pino'
import { config } from './config.js'

const redact = [
  '*.password',
  '*.pin',
  '*.otp',
  '*.otp_hash',
  '*.aadhaar_hash',
  '*.private_key',
  '*.secret',
  '*.service_role_key',
]

export const logger = pino(
  config.NODE_ENV === 'production'
    ? {
        level: config.LOG_LEVEL,
        formatters: { level: (label) => ({ level: label }) },
        redact,
      }
    : {
        level: config.LOG_LEVEL,
        formatters: { level: (label) => ({ level: label }) },
        redact,
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },
      },
)

export default logger
