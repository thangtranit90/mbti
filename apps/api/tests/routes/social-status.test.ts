import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app } from '../../src/index';
import * as db from '../../src/lib/db';
import type { PerceptionVoteRow, TestResultRow } from '@mbti/shared';

const TOKEN = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const USER_ID = 'ffffffff-1111-4222-8333-444444444444';

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
});

function makeTestResultRow(): TestResultRow {
  return {
    id: 'result-id',
    user_id: USER_ID,
    calculated_type: 'INFP',
    declared_type: null,
    answers: JSON.stringify([
      { questionId: 'q-ei-1', value: 5 },
      { questionId: 'q-tf-1', value: 5 },
      { questionId: 'q-jp-1', value: 1 },
    ]),
    persona_name: 'The Hidden Compass',
    created_at: '2026-05-05T00:00:00.000Z',
    updated_at: '2026-05-05T00:00:00.000Z',
    deleted_at: null,
    retention_flag: null,
    invite_source_token: null,
  };
}

function makeVote(answers: Array<{ questionId: string; value: number }>): PerceptionVoteRow {
  return {
    id: crypto.randomUUID(),
    invite_token: 'invite-tok',
    inviter_user_id: USER_ID,
    voter_session_id: null,
    behavioral_answers: JSON.stringify(answers),
    created_at: '2026-05-05T00:00:00.000Z',
    deleted_at: null,
  };
}

const getStatus = (
  mockKv: ReturnType<typeof makeKv>,
  mockDb: ReturnType<typeof makeDb>,
  headers: Record<string, string> = {},
) =>
  app.request(
    '/api/social/status',
    { method: 'GET', headers },
    { KV: mockKv, DB: mockDb } as any,
  );

describe('GET /api/social/status', () => {
  let mockKv: ReturnType<typeof makeKv>;
  let mockDb: ReturnType<typeof makeDb>;

  beforeEach(() => {
    mockKv = makeKv({ userId: USER_ID, createdAt: '2026-05-05T00:00:00.000Z' });
    mockDb = makeDb();
  });
  afterEach(() => vi.restoreAllMocks());

  it('(a) happy path — votes + self result → counts + tags', async () => {
    vi.spyOn(db, 'getSocialStatusForInviter').mockResolvedValue({
      voterCount: 2,
      latestVotes: [
        makeVote([
          { questionId: 'p1-decision', value: 5 },
          { questionId: 'p2-social', value: 5 },
          { questionId: 'p3-conflict', value: 5 },
        ]),
      ],
    });
    vi.spyOn(db, 'getLatestTestResultForUser').mockResolvedValue(makeTestResultRow());

    const res = await getStatus(mockKv, mockDb, { 'X-Session-Token': TOKEN });
    const body = (await res.json()) as {
      data: {
        voterCount: number;
        hasUnlockedGapReport: boolean;
        selfTags: string[];
        friendTags: string[];
      };
    };

    expect(res.status).toBe(200);
    expect(body.data.voterCount).toBe(2);
    // New rule: >=2 friends engaged via shared invite link → free unlock.
    expect(body.data.hasUnlockedGapReport).toBe(true);
    expect(body.data.selfTags.length).toBe(3);
    expect(body.data.friendTags).toEqual(['Quyết đoán', 'Hướng ngoại', 'Thẳng thắn']);
  });

  it('(a2) 1 voter, no payment → still locked (below free-unlock threshold)', async () => {
    vi.spyOn(db, 'getSocialStatusForInviter').mockResolvedValue({
      voterCount: 1,
      latestVotes: [
        makeVote([
          { questionId: 'p1-decision', value: 5 },
          { questionId: 'p2-social', value: 2 },
          { questionId: 'p3-conflict', value: 5 },
        ]),
      ],
    });
    vi.spyOn(db, 'getLatestTestResultForUser').mockResolvedValue(makeTestResultRow());
    vi.spyOn(db, 'getCompletedPayment').mockResolvedValue(null);

    const res = await getStatus(mockKv, mockDb, { 'X-Session-Token': TOKEN });
    const body = (await res.json()) as { data: { hasUnlockedGapReport: boolean } };
    expect(body.data.hasUnlockedGapReport).toBe(false);
  });

  it('(a3) 0 voters but paid gap_report → unlocked', async () => {
    vi.spyOn(db, 'getSocialStatusForInviter').mockResolvedValue({
      voterCount: 0,
      latestVotes: [],
    });
    vi.spyOn(db, 'getLatestTestResultForUser').mockResolvedValue(makeTestResultRow());
    vi.spyOn(db, 'getCompletedPayment').mockResolvedValue({
      id: 'pay-1',
      user_id: USER_ID,
      result_id: 'result-id',
      product_type: 'gap_report',
      gateway: 'sepay',
      provider_ref: 'QMTEST',
      amount: 25000,
      currency: 'VND',
      status: 'completed',
      created_at: '2026-05-16T00:00:00.000Z',
      updated_at: '2026-05-16T00:00:00.000Z',
      completed_at: '2026-05-16T00:00:00.000Z',
      deleted_at: null,
      email: null,
      email_sent_at: null,
    });

    const res = await getStatus(mockKv, mockDb, { 'X-Session-Token': TOKEN });
    const body = (await res.json()) as { data: { hasUnlockedGapReport: boolean } };
    expect(body.data.hasUnlockedGapReport).toBe(true);
  });

  it('(b) 0 votes → empty friend tags, self still populated', async () => {
    vi.spyOn(db, 'getSocialStatusForInviter').mockResolvedValue({
      voterCount: 0,
      latestVotes: [],
    });
    vi.spyOn(db, 'getLatestTestResultForUser').mockResolvedValue(makeTestResultRow());

    const res = await getStatus(mockKv, mockDb, { 'X-Session-Token': TOKEN });
    const body = (await res.json()) as {
      data: { voterCount: number; friendTags: string[]; selfTags: string[] };
    };
    expect(body.data.voterCount).toBe(0);
    expect(body.data.friendTags).toEqual([]);
    expect(body.data.selfTags.length).toBe(3);
  });

  it('(c) no session → 401 UNAUTHORIZED', async () => {
    const res = await getStatus(mockKv, mockDb);
    const body = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });
});
