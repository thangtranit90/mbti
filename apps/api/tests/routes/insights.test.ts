import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import app from '../../src/index';
import * as db from '../../src/lib/db';
import type { CuratedInsightRow, MBTIType, TestResultRow } from '@mbti/shared';

type InsightBody = {
  data: {
    personaName: string;
    insight: string;
    villains: Array<{ type: MBTIType; reason: string }>;
  } | null;
  error: { code: string; message: string } | null;
};

const RESULT_ID = '6794006b-677e-49c4-8810-712ad23ef459';

function makeTestResultRow(overrides: Partial<TestResultRow> = {}): TestResultRow {
  return {
    id: RESULT_ID,
    user_id: 'user-id',
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

function makeCuratedInsightRow(
  overrides: Partial<CuratedInsightRow> = {},
): CuratedInsightRow {
  return {
    id: 'placeholder-insight-INFP-v1',
    mbti_type: 'INFP',
    variant: 'v1',
    content: 'Test curated insight content for INFP.',
    is_active: 1,
    created_at: '2026-05-05T00:00:00.000Z',
    updated_at: '2026-05-05T00:00:00.000Z',
    ...overrides,
  };
}

const makeKv = () => ({
  put: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue(null),
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

const getInsight = (
  resultId: string,
  mockKv: ReturnType<typeof makeKv>,
  mockDb: ReturnType<typeof makeDb>,
  headers: Record<string, string> = {},
) =>
  app.request(
    `/api/results/${resultId}/insight`,
    {
      method: 'GET',
      headers,
    },
    { KV: mockKv, DB: mockDb } as any,
  );

describe('GET /api/results/:resultId/insight', () => {
  let mockKv: ReturnType<typeof makeKv>;
  let mockDb: ReturnType<typeof makeDb>;

  beforeEach(() => {
    mockKv = makeKv();
    mockDb = makeDb();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('(a) valid resultId → 200 with { personaName, insight, villains }', async () => {
    vi.spyOn(db, 'getTestResult').mockResolvedValue(makeTestResultRow());
    vi.spyOn(db, 'getCuratedInsight').mockResolvedValue(makeCuratedInsightRow());

    const res = await getInsight(RESULT_ID, mockKv, mockDb);
    const body = (await res.json()) as InsightBody;

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).not.toBeNull();
    expect(body.data?.personaName).toBe('The Hidden Compass');
    expect(body.data?.insight).toBe('Test curated insight content for INFP.');
    expect(body.data?.villains).toHaveLength(3);
    expect(body.data?.villains[0]?.reason.length).toBeGreaterThan(0);
  });

  it('(b) unknown resultId → 404 NOT_FOUND envelope', async () => {
    vi.spyOn(db, 'getTestResult').mockResolvedValue(null);

    const res = await getInsight('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', mockKv, mockDb);
    const body = (await res.json()) as InsightBody;

    expect(res.status).toBe(404);
    expect(body.data).toBeNull();
    expect(body.error?.code).toBe('NOT_FOUND');
  });

  it('(c) no session token header → still 200 (public route)', async () => {
    vi.spyOn(db, 'getTestResult').mockResolvedValue(makeTestResultRow());
    vi.spyOn(db, 'getCuratedInsight').mockResolvedValue(makeCuratedInsightRow());

    const res = await getInsight(RESULT_ID, mockKv, mockDb, {
      // no X-Session-Token header
    });

    expect(res.status).toBe(200);
  });

  it('(d) curated insight missing → uses fallback string, not 500', async () => {
    vi.spyOn(db, 'getTestResult').mockResolvedValue(makeTestResultRow());
    vi.spyOn(db, 'getCuratedInsight').mockResolvedValue(null);

    const res = await getInsight(RESULT_ID, mockKv, mockDb);
    const body = (await res.json()) as InsightBody;

    expect(res.status).toBe(200);
    expect(body.data?.insight).toBeTruthy();
    expect(body.data?.insight.length).toBeGreaterThan(0);
  });

  it('(e) villains array length === 3 for all valid responses', async () => {
    vi.spyOn(db, 'getTestResult').mockResolvedValue(makeTestResultRow({ calculated_type: 'INTJ' }));
    vi.spyOn(db, 'getCuratedInsight').mockResolvedValue(
      makeCuratedInsightRow({ mbti_type: 'INTJ' }),
    );

    const res = await getInsight(RESULT_ID, mockKv, mockDb);
    const body = (await res.json()) as InsightBody;

    expect(res.status).toBe(200);
    expect(body.data?.villains).toHaveLength(3);
    body.data?.villains.forEach((v) => {
      expect(v.type).toBeTruthy();
      expect(v.reason.length).toBeGreaterThan(0);
    });
  });
});
