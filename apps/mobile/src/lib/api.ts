import {API_URL} from '@env';
import {useAuthStore} from '@store/authStore';
import 'react-native-get-random-values';
import {v4 as uuidv4} from 'uuid';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: object;
  headers?: Record<string, string>;
}

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  code?: string;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

// 1 retry in dev keeps failure fast so you notice the bad URL quickly.
// Increase to 3 in production where transient drops are more likely.
const MAX_NETWORK_RETRIES = 1;

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

async function request<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const token = useAuthStore.getState().token;
  const correlationId = uuidv4();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-correlation-id': correlationId,
    // Bypass ngrok free-tier browser-warning interstitial so JSON is returned.
    'ngrok-skip-browser-warning': 'true',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Transient network failures (e.g. a momentarily-dropped USB reverse or flaky
  // mobile data) surface as a TypeError from fetch. Retry those with backoff;
  // HTTP error responses (ApiError) are returned to the caller without retry.
  let response: Response | undefined;
  let lastNetworkError: unknown;
  for (let attempt = 0; attempt <= MAX_NETWORK_RETRIES; attempt++) {
    try {
      response = await fetch(`${API_URL}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      break;
    } catch (err) {
      lastNetworkError = err;
      console.warn(`[api] network attempt ${attempt + 1}/${MAX_NETWORK_RETRIES + 1} failed for ${path}:`, err);
      if (attempt === MAX_NETWORK_RETRIES) break;
      await delay(500 * (attempt + 1));
    }
  }

  if (!response) {
    const detail = lastNetworkError instanceof Error ? lastNetworkError.message : 'network error';
    // Common causes: ngrok URL expired, API not running, adb reverse not set up.
    // API_URL is read from .env.development — update it if the ngrok tunnel changed.
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      `Can't reach the server. Is the API running?\n(${detail})`,
    );
  }

  if (response.status === 401) {
    useAuthStore.getState().logout();
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired');
  }

  const json: ApiResponse<T> = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, json.code ?? 'API_ERROR', json.error ?? 'Request failed');
  }

  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: object) => request<T>(path, {method: 'POST', body}),
  put: <T>(path: string, body: object) => request<T>(path, {method: 'PUT', body}),
  patch: <T>(path: string, body: object) => request<T>(path, {method: 'PATCH', body}),
  delete: <T>(path: string) => request<T>(path, {method: 'DELETE'}),
};
