// Story 7.1 — admin API client. Fully separate from the user `apiCall`:
// distinct localStorage key, distinct `X-Admin-Token` header. Never reuses
// the anonymous user session token (NFR10).
import { ApiError } from '@/lib/api';

const API_BASE =
  import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:8787');

export const ADMIN_TOKEN_KEY = 'mbti_admin_token';

export const getAdminToken = (): string | null => {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAdminToken = (token: string): void => {
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {
    /* localStorage unavailable — in-memory only */
  }
};

export const clearAdminToken = (): void => {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* noop */
  }
};

export async function adminCall<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAdminToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'X-Admin-Token': token } : {}),
    ...(init?.headers ?? {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(`Non-JSON response (status ${res.status})`, res.status, contentType);
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiError(`Invalid JSON response (status ${res.status})`, res.status);
  }
  if (!res.ok) {
    const message =
      (data as { error?: { message?: string } })?.error?.message ?? `HTTP error ${res.status}`;
    // 403 → token invalid/expired; clear so the guard redirects to login.
    if (res.status === 403) clearAdminToken();
    throw new ApiError(message, res.status);
  }
  return data as T;
}
