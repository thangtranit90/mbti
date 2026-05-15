import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @anthropic-ai/sdk before importing app — use vi.hoisted so mockCreate
// is defined when the vi.mock factory runs (factories are hoisted above imports).
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: mockCreate };
    constructor(_opts?: unknown) {}
  }
  return { default: MockAnthropic };
});

import { app } from '../../src/index';
import * as db from '../../src/lib/db';
import type { CuratedInsightRow, TestResultRow } from '@mbti/shared';

type GenerateBody = {
  data: { content: string; source: 'ai' | 'curated' } | null;
  error: { code: string; message: string } | null;
};

const RESULT_ID = '11111111-2222-4333-8444-555555555555';
const TOKEN = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const USER_ID = 'ffffffff-1111-4222-8333-444444444444';

function makeTestResultRow(overrides: Partial<TestResultRow> = {}): TestResultRow {
  return {
    id: RESULT_ID,
    user_id: USER_ID,
    calculated_type: 'INFP',
    declared_type: null,
    answers: JSON.stringify([{ questionId: 'q1', value: 3 }]),
    persona_name: 'The Hidden Compass',
    created_at: '2026-05-05T00:00:00.000Z',
    updated_at: '2026-05-05T00:00:00.000Z',
    deleted_at: null,
    retention_flag: null,
    invite_source_token: null,
    ...overrides,
  };
}

function makeCuratedInsightRow(
  overrides: Partial<CuratedInsightRow> = {},
): CuratedInsightRow {
  return {
    id: 'placeholder-insight-INFP-v1',
    mbti_type: 'INFP',
    variant: 'v1',
    content: 'Curated INFP content.',
    is_active: 1,
    source: 'curated',
    status: 'approved',
    created_at: '2026-05-05T00:00:00.000Z',
    updated_at: '2026-05-05T00:00:00.000Z',
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
    '/api/insights/generate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    },
    { KV: mockKv, DB: mockDb, ANTHROPIC_API_KEY: 'test-key' } as any,
  );

describe('POST /api/insights/generate', () => {
  let mockKv: ReturnType<typeof makeKv>;
  let mockDb: ReturnType<typeof makeDb>;

  beforeEach(() => {
    mockKv = makeKv({ userId: USER_ID, createdAt: '2026-05-05T10:00:00.000Z' });
    mockDb = makeDb();
    mockCreate.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('(a) missing session token → 401 UNAUTHORIZED', async () => {
    const res = await postGenerate({ resultId: RESULT_ID }, mockKv, mockDb);
    const body = (await res.json()) as GenerateBody;

    expect(res.status).toBe(401);
    expect(body.data).toBeNull();
    expect(body.error?.code).toBe('UNAUTHORIZED');
  });

  it('(b) valid session + valid resultId + AI success → 200 with source "ai"', async () => {
    vi.spyOn(db, 'getTestResult').mockResolvedValue(makeTestResultRow());
    vi.spyOn(db, 'getActiveCuratedInsights').mockResolvedValue([makeCuratedInsightRow()]);
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Bạn nhìn thế giới sâu hơn bạn nói ra.' }],
    });

    const res = await postGenerate({ resultId: RESULT_ID }, mockKv, mockDb, {
      'X-Session-Token': TOKEN,
    });
    const body = (await res.json()) as GenerateBody;

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data?.source).toBe('ai');
    expect(body.data?.content).toBe('Bạn nhìn thế giới sâu hơn bạn nói ra.');
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it('(c) unknown resultId → 404 NOT_FOUND', async () => {
    vi.spyOn(db, 'getTestResult').mockResolvedValue(null);

    const res = await postGenerate({ resultId: RESULT_ID }, mockKv, mockDb, {
      'X-Session-Token': TOKEN,
    });
    const body = (await res.json()) as GenerateBody;

    expect(res.status).toBe(404);
    expect(body.data).toBeNull();
    expect(body.error?.code).toBe('NOT_FOUND');
  });

  it('(d) Anthropic error → 200 with source "curated" (not 500)', async () => {
    vi.spyOn(db, 'getTestResult').mockResolvedValue(makeTestResultRow());
    vi.spyOn(db, 'getActiveCuratedInsights').mockResolvedValue([makeCuratedInsightRow()]);
    vi.spyOn(db, 'getCuratedInsight').mockResolvedValue(makeCuratedInsightRow());
    mockCreate.mockRejectedValue(new Error('Anthropic down'));

    const res = await postGenerate({ resultId: RESULT_ID }, mockKv, mockDb, {
      'X-Session-Token': TOKEN,
    });
    const body = (await res.json()) as GenerateBody;

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data?.source).toBe('curated');
    expect(body.data?.content).toBe('Curated INFP content.');
  });

  it('(e) malformed resultId → 400 VALIDATION_ERROR', async () => {
    const res = await postGenerate({ resultId: 'not-a-uuid' }, mockKv, mockDb, {
      'X-Session-Token': TOKEN,
    });
    const body = (await res.json()) as GenerateBody;

    expect(res.status).toBe(400);
    expect(body.error?.code).toBe('VALIDATION_ERROR');
  });
});
