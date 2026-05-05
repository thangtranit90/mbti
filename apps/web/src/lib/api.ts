import { getSessionToken } from './session';

// In dev (no VITE_API_URL), assume Worker on :8787; in prod, default to same-origin.
const API_BASE =
  import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:8787');

export class ApiError extends Error {
  status: number;
  contentType?: string;

  constructor(message: string, status: number, contentType?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.contentType = contentType;
  }
}

export async function apiCall<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getSessionToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'X-Session-Token': token } : {}),
    ...(init?.headers ?? {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  // Infrastructure errors (CDN/gateway HTML, opaque responses) — throw before parsing
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(
      `Non-JSON response (status ${res.status})`,
      res.status,
      contentType,
    );
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiError(`Invalid JSON response (status ${res.status})`, res.status);
  }

  // Application-layer errors — throw so useMutation/useQuery onError fires correctly
  if (!res.ok) {
    const message =
      (data as { error?: { message?: string } })?.error?.message ?? `HTTP error ${res.status}`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}
