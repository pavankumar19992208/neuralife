import logger from '../lib/logger.js'

export interface RetryOptions {
  maxAttempts?: number
  backoffMs?: number
  onRetry?: (attempt: number, error: Error) => void
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  correlationId: string,
  options?: RetryOptions,
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3
  const backoffMs = options?.backoffMs ?? 1000

  let lastError: Error = new Error('Unknown error')

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err as Error

      if (attempt === maxAttempts) break

      const delayMs = backoffMs * Math.pow(2, attempt - 1)
      logger.warn({ correlationId, attempt, delayMs }, 'Retrying...')
      options?.onRetry?.(attempt, lastError)
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
    }
  }

  throw lastError
}
