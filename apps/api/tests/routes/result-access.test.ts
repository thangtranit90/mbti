import { describe, it, expect, vi } from 'vitest';
import { app } from '../../src/index';
import type { TestResultRow } from '@mbti/shared';

// GET /api/results/:resultId/access — durable, resultId-bound paywall status.
// Exercises the REAL getResultAccess SQL logic via a query-aware D1 mock.

const RESULT_ID = '6794006b-677e-49c4-8810-712ad23ef459';
const OWNER_ID = 'ffffffff-1111-4222-8333-444444444444';

function resultRow(): TestResultRow {
  return {
    id: RESULT_ID,
    user_id: OWNER_ID,
    calculated_type: 'INFP',
    declared_type: null,
    answers: '[]',
    persona_name: 'The Hidden Compass',
    created_at: '2026-05-05T00:00:00.000Z',
    updated_at: '2026-05-05T00:00:00.000Z',
    deleted_at: null,
    retention_flag: null,
    invite_source_token: null,
  };
}

/**
 * Query-aware D1 mock. Routes `.all()` by distinctive SQL substrings so the
 * real getResultAccess (getTestResult + paid + friend-count) is tested end to
 * end without a live DB.
 */
const makeDb = (opts: {
  resultExists: boolean;
  paid: boolean;
  friendCount: number;
}) => ({
  prepare: vi.fn().mockImplementation((sql: string) => ({
    bind: vi.fn().mockReturnThis(),
    all: vi.fn().mockImplementation(async () => {
      if (sql.includes('COUNT(DISTINCT tr.user_id)')) {
        return { success: true, results: [{ n: opts.friendCount }] };
      }
      if (sql.includes('FROM payments')) {
        return {
          success: true,
          results: opts.paid ? [{ hit: 1 }] : [],
        };
      }
      // getTestResult — SELECT ... FROM test_results WHERE id = ?
      return {
        success: true,
        results: opts.resultExists ? [resultRow()] : [],
      };
    }),
    run: vi.fn().mockResolvedValue({ success: true }),
    first: vi.fn().mockResolvedValue(null),
  })),
});

const makeKv = () => ({
  put: vi.fn(),
  get: vi.fn().mockResolvedValue(null),
  delete: vi.fn(),
  list: vi.fn(),
  getWithMetadata: vi.fn(),
});

const getAccess = (resultId: string, db: ReturnType<typeof makeDb>) =>
  app.request(
    `/api/results/${resultId}/access`,
    { method: 'GET' },
    { KV: makeKv(), DB: db } as any,
  );

type AccessBody = {
  data: {
    unlocked: boolean;
    paid: boolean;
    friendCount: number;
    threshold: number;
  } | null;
  error: { code: string; message: string } | null;
};

describe('GET /api/results/:resultId/access', () => {
  it('(a) result exists, unpaid, 0 friends → locked', async () => {
    const db = makeDb({ resultExists: true, paid: false, friendCount: 0 });
    const res = await getAccess(RESULT_ID, db);
    const body = (await res.json()) as AccessBody;

    expect(res.status).toBe(200);
    expect(body.data?.unlocked).toBe(false);
    expect(body.data?.paid).toBe(false);
    expect(body.data?.friendCount).toBe(0);
    expect(body.data?.threshold).toBe(2);
  });

  it('(b) 1 friend completed → still locked (below threshold)', async () => {
    const db = makeDb({ resultExists: true, paid: false, friendCount: 1 });
    const res = await getAccess(RESULT_ID, db);
    const body = (await res.json()) as AccessBody;

    expect(body.data?.unlocked).toBe(false);
    expect(body.data?.friendCount).toBe(1);
  });

  it('(c) 2 friends completed the full test → unlocked (free)', async () => {
    const db = makeDb({ resultExists: true, paid: false, friendCount: 2 });
    const res = await getAccess(RESULT_ID, db);
    const body = (await res.json()) as AccessBody;

    expect(res.status).toBe(200);
    expect(body.data?.unlocked).toBe(true);
    expect(body.data?.paid).toBe(false);
    expect(body.data?.friendCount).toBe(2);
  });

  it('(d) paid result_unlock, 0 friends → unlocked', async () => {
    const db = makeDb({ resultExists: true, paid: true, friendCount: 0 });
    const res = await getAccess(RESULT_ID, db);
    const body = (await res.json()) as AccessBody;

    expect(body.data?.unlocked).toBe(true);
    expect(body.data?.paid).toBe(true);
  });

  it('(e) unknown result → 404 NOT_FOUND', async () => {
    const db = makeDb({ resultExists: false, paid: false, friendCount: 0 });
    const res = await getAccess(RESULT_ID, db);
    const body = (await res.json()) as AccessBody;

    expect(res.status).toBe(404);
    expect(body.data).toBeNull();
    expect(body.error?.code).toBe('NOT_FOUND');
  });

  it('(f) malformed resultId → 400 VALIDATION_ERROR', async () => {
    const db = makeDb({ resultExists: true, paid: false, friendCount: 0 });
    const res = await getAccess('not-a-uuid', db);
    const body = (await res.json()) as AccessBody;

    expect(res.status).toBe(400);
    expect(body.error?.code).toBe('VALIDATION_ERROR');
  });
});
