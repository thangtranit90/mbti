import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import app from '../../src/index';
import * as db from '../../src/lib/db';
import type { TestResultRow } from '@mbti/shared';

type GenerateBody = {
  data: { inviteUrl: string; token: string; expiredAt: string } | null;
  error: { code: string; message: string } | null;
};

const RESULT_ID = '11111111-2222-4333-8444-555555555555';
const TOKEN = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const USER_ID = 'ffffffff-1111-4222-8333-444444444444';
const OTHER_USER_ID = '99999999-1111-4222-8333-444444444444';

function makeTestResultRow(overrides: Partial<TestResultRow> = {}): TestResultRow {
  return {
    id: RESULT_ID,
    user_id: USER_ID,
    calculated_type: 'INFP',
    declared_type: null,
    answers: '[]',
    persona_name: 'The Hidden Compass',
    created_at: '2026-05-05T00:00:00.000Z',
    updated_at: '2026-05-05T00:00:00.000Z',
    deleted_at: null,
    retention_flag: null,
    invite_source_token: null,
    ...overrides,
  };
}

const makeKv = (sessionData: { userId: string; createdAt: string } | null = null) => ({
  put: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockImplementation(async (key: string, type?: string) => {
    if (key !== `session:${TOKEN}` || !sessionData) return null;
    return type === 'json' ? sessionData : JSON.stringify(sessionData);
  }),
  delete: vi.fn().mockResolvedValue(undefined),
  list: vi.fn(),
  getWithMetadata: vi.fn(),
});

const makeDb = () => ({
  prepare: vi.fn().mockReturnValue({
    bind: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue({ success: true, results: [] }),
    run: vi.fn().mockResolvedValue({ success: true }),
    first: vi.fn().mockResolvedValue(null),
  }),
  exec: vi.fn(),
  batch: vi.fn(),
  dump: vi.fn(),
});

const postGenerate = (
  body: unknown,
  mockKv: ReturnType<typeof makeKv>,
  mockDb: ReturnType<typeof makeDb>,
  headers: Record<string, string> = {},
) =>
  app.request(
    '/api/invites/generate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://example.com', ...headers },
      body: JSON.stringify(body),
    },
    { KV: mockKv, DB: mockDb } as any,
  );

describe('POST /api/invites/generate', () => {
  let mockKv: ReturnType<typeof makeKv>;
  let mockDb: ReturnType<typeof makeDb>;

  beforeEach(() => {
    mockKv = makeKv({ userId: USER_ID, createdAt: '2026-05-05T00:00:00.000Z' });
    mockDb = makeDb();
  });

  afterEach(() => vi.restoreAllMocks());

  it('(a) happy path → returns inviteUrl with token UUID, inserts row', async () => {
    vi.spyOn(db, 'getTestResult').mockResolvedValue(makeTestResultRow());
    const generateSpy = vi.spyOn(db, 'generateInviteLink').mockResolvedValue();

    const res = await postGenerate(
      { resultId: RESULT_ID },
      mockKv,
      mockDb,
      { 'X-Session-Token': TOKEN },
    );
    const body = (await res.json()) as GenerateBody;

    expect(res.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data?.inviteUrl).toMatch(/^https:\/\/example\.com\/invite\/[0-9a-f-]{36}$/);
    expect(body.data?.token).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.data?.expiredAt).toBeTypeOf('string');
    expect(generateSpy).toHaveBeenCalledOnce();
    const args = generateSpy.mock.calls[0]?.[1];
    expect(args?.inviterUserId).toBe(USER_ID);
    expect(args?.inviterResultId).toBe(RESULT_ID);
    // expiredAt is roughly 30 days out
    const ms = new Date(args!.expiredAt).getTime() - Date.now();
    expect(ms).toBeGreaterThan(29 * 24 * 60 * 60 * 1000);
    expect(ms).toBeLessThan(31 * 24 * 60 * 60 * 1000);
  });

  it('(b) result owned by another user → 403 FORBIDDEN', async () => {
    vi.spyOn(db, 'getTestResult').mockResolvedValue(
      makeTestResultRow({ user_id: OTHER_USER_ID }),
    );
    const generateSpy = vi.spyOn(db, 'generateInviteLink').mockResolvedValue();

    const res = await postGenerate(
      { resultId: RESULT_ID },
      mockKv,
      mockDb,
      { 'X-Session-Token': TOKEN },
    );
    const body = (await res.json()) as GenerateBody;

    expect(res.status).toBe(403);
    expect(body.error?.code).toBe('FORBIDDEN');
    expect(generateSpy).not.toHaveBeenCalled();
  });

  it('(c) result not found → 404 NOT_FOUND', async () => {
    vi.spyOn(db, 'getTestResult').mockResolvedValue(null);

    const res = await postGenerate(
      { resultId: RESULT_ID },
      mockKv,
      mockDb,
      { 'X-Session-Token': TOKEN },
    );
    const body = (await res.json()) as GenerateBody;

    expect(res.status).toBe(404);
    expect(body.error?.code).toBe('NOT_FOUND');
  });

  it('(d) missing session token → 401 UNAUTHORIZED', async () => {
    const res = await postGenerate({ resultId: RESULT_ID }, mockKv, mockDb);
    const body = (await res.json()) as GenerateBody;

    expect(res.status).toBe(401);
    expect(body.error?.code).toBe('UNAUTHORIZED');
  });

  it('(e) invalid resultId (not uuid) → 400 VALIDATION_ERROR', async () => {
    const res = await postGenerate(
      { resultId: 'not-a-uuid' },
      mockKv,
      mockDb,
      { 'X-Session-Token': TOKEN },
    );
    const body = (await res.json()) as GenerateBody;

    expect(res.status).toBe(400);
    expect(body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('(f) two consecutive calls produce distinct tokens', async () => {
    vi.spyOn(db, 'getTestResult').mockResolvedValue(makeTestResultRow());
    vi.spyOn(db, 'generateInviteLink').mockResolvedValue();

    const r1 = await postGenerate(
      { resultId: RESULT_ID },
      mockKv,
      mockDb,
      { 'X-Session-Token': TOKEN },
    );
    const r2 = await postGenerate(
      { resultId: RESULT_ID },
      mockKv,
      mockDb,
      { 'X-Session-Token': TOKEN },
    );
    const b1 = (await r1.json()) as GenerateBody;
    const b2 = (await r2.json()) as GenerateBody;

    expect(b1.data?.token).not.toBe(b2.data?.token);
  });
});
