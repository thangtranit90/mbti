import { describe, it, expect, vi, beforeEach } from 'vitest';
import sessions from '../../src/routes/sessions';
import app from '../../src/index';

type SessionInitBody = {
  data: { sessionToken: string } | null;
  error: { code: string; message: string } | null;
};

type ConsentBody = {
  data: { consentAt: string; ageConfirmedAt: string } | null;
  error: { code: string; message: string } | null;
};

type StoredSession = {
  userId: string;
  createdAt: string;
  consentAt?: string;
  ageConfirmedAt?: string;
};

const makeKv = () => ({
  put: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue(null),
  delete: vi.fn().mockResolvedValue(undefined),
  list: vi.fn(),
  getWithMetadata: vi.fn(),
});

/**
 * Seeds a session token in the mock KV. Mimics the real Workers KV contract:
 * - `kv.get(key)` returns the raw string
 * - `kv.get(key, 'json')` returns the parsed object
 * `lib/kv.ts` always passes `'json'`; if a future caller drops the arg, this
 * mock surfaces the bug instead of silently returning the parsed object.
 */
const seedSession = (
  mockKv: ReturnType<typeof makeKv>,
  token: string,
  data: StoredSession,
) => {
  const key = `session:${token}`;
  const json = JSON.stringify(data);
  mockKv.get.mockImplementation(async (k: string, type?: string) => {
    if (k !== key) return null;
    return type === 'json' ? data : json;
  });
};

describe('POST /init', () => {
  let mockKv: ReturnType<typeof makeKv>;

  beforeEach(() => {
    mockKv = makeKv();
  });

  it('returns 200 with a UUID session token', async () => {
    const res = await sessions.request('/init', { method: 'POST' }, { KV: mockKv } as any);
    const body = (await res.json()) as SessionInitBody;

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).not.toBeNull();
    expect(body.data?.sessionToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('calls KV.put exactly once with the returned token and 30-day TTL', async () => {
    const res = await sessions.request('/init', { method: 'POST' }, { KV: mockKv } as any);
    const body = (await res.json()) as SessionInitBody;

    expect(mockKv.put).toHaveBeenCalledOnce();
    const putCall = mockKv.put.mock.calls[0] as [string, string, { expirationTtl: number }];
    expect(putCall[0]).toContain(body.data!.sessionToken);
    expect(putCall[2]).toEqual({ expirationTtl: 60 * 60 * 24 * 30 });
  });

  it('returns different tokens on consecutive calls', async () => {
    const res1 = await sessions.request('/init', { method: 'POST' }, { KV: mockKv } as any);
    const res2 = await sessions.request('/init', { method: 'POST' }, { KV: mockKv } as any);
    const body1 = (await res1.json()) as SessionInitBody;
    const body2 = (await res2.json()) as SessionInitBody;

    expect(body1.data?.sessionToken).not.toBe(body2.data?.sessionToken);
  });

  it('returns SESSION_CREATE_FAILED error when KV write fails', async () => {
    mockKv.put.mockRejectedValueOnce(new Error('KV unavailable'));

    const res = await sessions.request('/init', { method: 'POST' }, { KV: mockKv } as any);
    const body = (await res.json()) as SessionInitBody;

    expect(res.status).toBe(500);
    expect(body.data).toBeNull();
    expect(body.error?.code).toBe('SESSION_CREATE_FAILED');
  });
});

describe('PATCH /api/sessions/consent', () => {
  const TOKEN = '11111111-2222-4333-8444-555555555555';
  const SEED: StoredSession = {
    userId: '99999999-2222-4333-8444-555555555555',
    createdAt: '2026-05-04T10:00:00.000Z',
  };

  let mockKv: ReturnType<typeof makeKv>;

  beforeEach(() => {
    mockKv = makeKv();
  });

  const patchConsent = (
    body: unknown,
    headers: Record<string, string> = {},
  ) =>
    app.request(
      '/api/sessions/consent',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      },
      { KV: mockKv } as any,
    );

  it('returns 401 when X-Session-Token header is missing', async () => {
    const res = await patchConsent({ consentGiven: true, ageConfirmed: true });
    const body = (await res.json()) as ConsentBody;

    expect(res.status).toBe(401);
    expect(body.data).toBeNull();
    expect(body.error?.code).toBe('UNAUTHORIZED');
    expect(mockKv.put).not.toHaveBeenCalled();
  });

  it('returns 401 when token does not match a KV session', async () => {
    // mockKv.get default returns null → invalid token
    const res = await patchConsent(
      { consentGiven: true, ageConfirmed: true },
      { 'X-Session-Token': TOKEN },
    );
    const body = (await res.json()) as ConsentBody;

    expect(res.status).toBe(401);
    expect(body.data).toBeNull();
    expect(body.error?.code).toBe('UNAUTHORIZED');
    expect(mockKv.put).not.toHaveBeenCalled();
  });

  it('returns 200 with ISO Z timestamps and merges consent into KV', async () => {
    seedSession(mockKv, TOKEN, SEED);

    const res = await patchConsent(
      { consentGiven: true, ageConfirmed: true },
      { 'X-Session-Token': TOKEN },
    );
    const body = (await res.json()) as ConsentBody;

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data?.consentAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(body.data?.ageConfirmedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    // KV write happened with merged session preserving original fields
    expect(mockKv.put).toHaveBeenCalledOnce();
    const [key, value, opts] = mockKv.put.mock.calls[0] as [
      string,
      string,
      { expirationTtl: number },
    ];
    expect(key).toBe(`session:${TOKEN}`);
    const stored = JSON.parse(value) as StoredSession;
    expect(stored.userId).toBe(SEED.userId);
    expect(stored.createdAt).toBe(SEED.createdAt);
    expect(stored.consentAt).toBe(body.data!.consentAt);
    expect(stored.ageConfirmedAt).toBe(body.data!.ageConfirmedAt);
    expect(opts.expirationTtl).toBe(60 * 60 * 24 * 30);
  });

  it('returns 400 VALIDATION_ERROR when a field is missing', async () => {
    seedSession(mockKv, TOKEN, SEED);

    const res = await patchConsent(
      { consentGiven: true },
      { 'X-Session-Token': TOKEN },
    );
    const body = (await res.json()) as ConsentBody;

    expect(res.status).toBe(400);
    expect(body.data).toBeNull();
    expect(body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockKv.put).not.toHaveBeenCalled();
  });

  it('returns 400 VALIDATION_ERROR when consentGiven is false', async () => {
    seedSession(mockKv, TOKEN, SEED);

    const res = await patchConsent(
      { consentGiven: false, ageConfirmed: true },
      { 'X-Session-Token': TOKEN },
    );
    const body = (await res.json()) as ConsentBody;

    expect(res.status).toBe(400);
    expect(body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockKv.put).not.toHaveBeenCalled();
  });

  it('returns 400 INVALID_JSON when body is not valid JSON', async () => {
    seedSession(mockKv, TOKEN, SEED);

    const res = await app.request(
      '/api/sessions/consent',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Session-Token': TOKEN },
        body: 'not-json{',
      },
      { KV: mockKv } as any,
    );
    const body = (await res.json()) as ConsentBody;

    expect(res.status).toBe(400);
    expect(body.data).toBeNull();
    expect(body.error?.code).toBe('INVALID_JSON');
    expect(mockKv.put).not.toHaveBeenCalled();
  });

  it('returns 400 VALIDATION_ERROR when body has unknown extra keys (strict mode)', async () => {
    seedSession(mockKv, TOKEN, SEED);

    const res = await patchConsent(
      { consentGiven: true, ageConfirmed: true, marketingOptIn: true },
      { 'X-Session-Token': TOKEN },
    );
    const body = (await res.json()) as ConsentBody;

    expect(res.status).toBe(400);
    expect(body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockKv.put).not.toHaveBeenCalled();
  });

  it('is idempotent — second PATCH succeeds and preserves createdAt', async () => {
    seedSession(mockKv, TOKEN, SEED);

    const res1 = await patchConsent(
      { consentGiven: true, ageConfirmed: true },
      { 'X-Session-Token': TOKEN },
    );
    expect(res1.status).toBe(200);

    // After first PATCH, refresh the seed so subsequent get returns the merged session.
    const firstStored = JSON.parse(
      (mockKv.put.mock.calls[0] as [string, string, unknown])[1],
    ) as StoredSession;
    seedSession(mockKv, TOKEN, firstStored);

    const res2 = await patchConsent(
      { consentGiven: true, ageConfirmed: true },
      { 'X-Session-Token': TOKEN },
    );
    const body2 = (await res2.json()) as ConsentBody;
    expect(res2.status).toBe(200);

    const secondStored = JSON.parse(
      (mockKv.put.mock.calls[1] as [string, string, unknown])[1],
    ) as StoredSession;
    expect(secondStored.createdAt).toBe(SEED.createdAt);
    expect(secondStored.consentAt).toBe(body2.data!.consentAt);
    expect(secondStored.ageConfirmedAt).toBe(body2.data!.ageConfirmedAt);
  });
});
