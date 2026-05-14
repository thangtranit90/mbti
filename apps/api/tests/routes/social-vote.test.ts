import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import app from '../../src/index';
import * as db from '../../src/lib/db';
import type { InviteLinkRow, PerceptionVoteRow } from '@mbti/shared';

const TOKEN = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const SESSION_TOKEN = '22222222-3333-4444-8555-666666666666';
const USER_ID = 'ffffffff-1111-4222-8333-444444444444';
const RESULT_ID = '11111111-2222-4333-8444-555555555555';

function makeInvite(overrides: Partial<InviteLinkRow> = {}): InviteLinkRow {
  return {
    id: 'invite-id',
    token: TOKEN,
    inviter_user_id: USER_ID,
    inviter_result_id: RESULT_ID,
    expired_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    created_at: '2026-05-05T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

const makeKv = (sessionData: { userId: string; createdAt: string } | null = null) => ({
  put: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockImplementation(async (key: string, type?: string) => {
    if (key !== `session:${SESSION_TOKEN}` || !sessionData) return null;
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

const validAnswers = [
  { questionId: 'p1-decision', value: 3 },
  { questionId: 'p2-social', value: 4 },
  { questionId: 'p3-conflict', value: 5 },
];

const postVote = (
  body: unknown,
  mockKv: ReturnType<typeof makeKv>,
  mockDb: ReturnType<typeof makeDb>,
  headers: Record<string, string> = {},
) =>
  app.request(
    '/api/social/vote',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    },
    { KV: mockKv, DB: mockDb } as any,
  );

describe('POST /api/social/vote', () => {
  let mockKv: ReturnType<typeof makeKv>;
  let mockDb: ReturnType<typeof makeDb>;

  beforeEach(() => {
    mockKv = makeKv();
    mockDb = makeDb();
  });
  afterEach(() => vi.restoreAllMocks());

  it('(a) happy path (no session) → inserts and returns 201', async () => {
    vi.spyOn(db, 'getInviteLink').mockResolvedValue(makeInvite());
    const createSpy = vi.spyOn(db, 'createPerceptionVote').mockResolvedValue();

    const res = await postVote({ inviteToken: TOKEN, answers: validAnswers }, mockKv, mockDb);
    const body = (await res.json()) as {
      data: { voteId: string } | null;
      error: { code: string } | null;
    };

    expect(res.status).toBe(201);
    expect(body.data?.voteId).toMatch(/^[0-9a-f-]{36}$/);
    const args = createSpy.mock.calls[0]?.[1];
    expect(args?.voterSessionId).toBeNull();
    expect(args?.inviterUserId).toBe(USER_ID);
  });

  it('(b) expired invite → 410', async () => {
    vi.spyOn(db, 'getInviteLink').mockResolvedValue(
      makeInvite({ expired_at: '2020-01-01T00:00:00.000Z' }),
    );

    const res = await postVote({ inviteToken: TOKEN, answers: validAnswers }, mockKv, mockDb);
    const body = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(410);
    expect(body.error.code).toBe('INVITE_EXPIRED');
  });

  it('(c) missing invite → 404', async () => {
    vi.spyOn(db, 'getInviteLink').mockResolvedValue(null);

    const res = await postVote({ inviteToken: TOKEN, answers: validAnswers }, mockKv, mockDb);
    const body = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('(d) wrong number of answers → 400 VALIDATION_ERROR', async () => {
    const res = await postVote(
      { inviteToken: TOKEN, answers: [validAnswers[0]] },
      mockKv,
      mockDb,
    );
    const body = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('(e) session present + already voted → 409 ALREADY_VOTED', async () => {
    mockKv = makeKv({ userId: USER_ID, createdAt: '2026-05-05T00:00:00.000Z' });
    vi.spyOn(db, 'getInviteLink').mockResolvedValue(makeInvite());
    const existingVote: PerceptionVoteRow = {
      id: 'existing',
      invite_token: TOKEN,
      inviter_user_id: USER_ID,
      voter_session_id: USER_ID,
      behavioral_answers: '[]',
      created_at: '2026-05-05T00:00:00.000Z',
      deleted_at: null,
    };
    vi.spyOn(db, 'getPerceptionVote').mockResolvedValue(existingVote);

    const res = await postVote(
      { inviteToken: TOKEN, answers: validAnswers },
      mockKv,
      mockDb,
      { 'X-Session-Token': SESSION_TOKEN },
    );
    const body = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(409);
    expect(body.error.code).toBe('ALREADY_VOTED');
  });
});
