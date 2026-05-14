import { useAuthStore } from '@/store/authStore'
import type { APIResponse, APIError as APIErrorType } from '@/types/common'

export class APIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly correlationId: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'APIError'
  }
}

interface RefreshResponse {
  accessToken: string
  refreshToken: string
}

class APIClient {
  private readonly baseUrl = '/api/v1'
  private refreshPromise: Promise<boolean> | null = null

  private getHeaders(options?: { idempotencyKey?: string }): Record<string, string> {
    const { accessToken } = useAuthStore.getState()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-correlation-id': crypto.randomUUID(),
    }
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }
    if (options?.idempotencyKey) {
      headers['x-idempotency-key'] = options.idempotencyKey
    }
    return headers
  }

  private buildUrl(path: string, params?: Record<string, unknown>): string {
    const url = new URL(`${this.baseUrl}${path}`, window.location.origin)
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          url.searchParams.set(k, String(v))
        }
      })
    }
    return url.pathname + url.search
  }

  private async attemptRefresh(): Promise<boolean> {
    // Deduplicate: if a refresh is already in flight, wait for it
    if (this.refreshPromise) return this.refreshPromise

    this.refreshPromise = (async () => {
      const { refreshToken } = useAuthStore.getState()
      if (!refreshToken) return false

      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-correlation-id': crypto.randomUUID(),
          },
          body: JSON.stringify({ refreshToken }),
        })

        if (!response.ok) return false

        const json = (await response.json()) as APIResponse<RefreshResponse>
        const store = useAuthStore.getState()
        // Preserve existing payload fields, only rotate tokens
        store.setAuth(
          {
            sub: store.school_id ?? '',
            role: store.role!,
            school_id: store.school_id ?? '',
            teacher_id: store.teacher_id,
            neura_id: store.neura_id,
            jti: '',
            iat: 0,
            exp: 0,
          },
          { accessToken: json.data.accessToken, refreshToken: json.data.refreshToken },
        )
        return true
      } catch {
        return false
      }
    })()

    try {
      return await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }

  private async handleResponse<T>(response: Response, retry: () => Promise<Response>): Promise<T> {
    if (response.ok) {
      const json = (await response.json()) as APIResponse<T>
      return json.data
    }

    if (response.status === 401) {
      const refreshed = await this.attemptRefresh()
      if (refreshed) {
        // Retry original request once with the new token
        const retried = await retry()
        if (retried.ok) {
          const json = (await retried.json()) as APIResponse<T>
          return json.data
        }
      }
      // Refresh failed or retry still 401 — force logout
      useAuthStore.getState().clearAuth()
    }

    let body: APIErrorType = {
      error: 'Request failed',
      code: 'UNKNOWN_ERROR',
      correlationId: '',
    }
    try {
      body = (await response.json()) as APIErrorType
    } catch {
      // ignore parse failure
    }

    throw new APIError(body.error, body.code, body.correlationId, response.status, body.details)
  }

  async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    const url = this.buildUrl(path, params)
    const response = await fetch(url, { method: 'GET', headers: this.getHeaders() })
    return this.handleResponse<T>(response, () =>
      fetch(url, { method: 'GET', headers: this.getHeaders() }),
    )
  }

  async post<T>(path: string, body?: unknown, options?: { idempotencyKey?: string }): Promise<T> {
    const url = this.buildUrl(path)
    const serialized = body !== undefined ? JSON.stringify(body) : undefined
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(options),
      body: serialized,
    })
    return this.handleResponse<T>(response, () =>
      fetch(url, { method: 'POST', headers: this.getHeaders(options), body: serialized }),
    )
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path)
    const serialized = body !== undefined ? JSON.stringify(body) : undefined
    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: serialized,
    })
    return this.handleResponse<T>(response, () =>
      fetch(url, { method: 'PUT', headers: this.getHeaders(), body: serialized }),
    )
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path)
    const serialized = body !== undefined ? JSON.stringify(body) : undefined
    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: serialized,
    })
    return this.handleResponse<T>(response, () =>
      fetch(url, { method: 'PATCH', headers: this.getHeaders(), body: serialized }),
    )
  }

  async del<T>(path: string): Promise<T> {
    const url = this.buildUrl(path)
    const response = await fetch(url, { method: 'DELETE', headers: this.getHeaders() })
    return this.handleResponse<T>(response, () =>
      fetch(url, { method: 'DELETE', headers: this.getHeaders() }),
    )
  }

  async delete<T>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path)
    const serialized = body !== undefined ? JSON.stringify(body) : undefined
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
      body: serialized,
    })
    return this.handleResponse<T>(response, () =>
      fetch(url, { method: 'DELETE', headers: this.getHeaders(), body: serialized }),
    )
  }

  async list<T>(
    path: string,
    params?: Record<string, unknown>,
  ): Promise<{ data: T[]; meta: { total: number; page: number; limit: number } }> {
    const url = this.buildUrl(path, params)
    const doFetch = () => fetch(url, { method: 'GET', headers: this.getHeaders() })
    let response = await doFetch()

    if (response.status === 401) {
      const refreshed = await this.attemptRefresh()
      if (refreshed) {
        const retried = await doFetch()
        if (retried.ok) {
          return retried.json() as Promise<{ data: T[]; meta: { total: number; page: number; limit: number } }>
        }
      }
      useAuthStore.getState().clearAuth()
    }

    if (response.ok) {
      return response.json() as Promise<{ data: T[]; meta: { total: number; page: number; limit: number } }>
    }

    let body: APIErrorType = { error: 'Request failed', code: 'UNKNOWN_ERROR', correlationId: '' }
    try {
      body = (await response.json()) as APIErrorType
    } catch {
      // ignore parse failure
    }
    throw new APIError(body.error, body.code, body.correlationId, response.status, body.details)
  }
}

export const api = new APIClient()
