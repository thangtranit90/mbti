import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import app from '../../src/index';
import * as db from '../../src/lib/db';
import type { InviteLinkRow, TestResultRow } from '@mbti/shared';

const TOKEN = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const RESULT_ID = '11111111-2222-4333-8444-555555555555';
const USER_ID = 'ffffffff-1111-4222-8333-444444444444';

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

function makeResult(overrides: Partial<TestResultRow> = {}): TestResultRow {
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

const getInviteReq = (token: string, mockDb: ReturnType<typeof makeDb>) =>
  app.request(`/api/invites/${token}`, { method: 'GET' }, { DB: mockDb } as any);

describe('GET /api/invites/:token', () => {
  let mockDb: ReturnType<typeof makeDb>;
  beforeEach(() => {
    mockDb = makeDb();
  });
  afterEach(() => vi.restoreAllMocks());

  it('(a) alive invite → 200 with inviter info', async () => {
    vi.spyOn(db, 'getInviteLink').mockResolvedValue(makeInvite());
    vi.spyOn(db, 'getTestResult').mockResolvedValue(makeResult());

    const res = await getInviteReq(TOKEN, mockDb);
    const body = (await res.json()) as {
      data: {
        inviteToken: string;
        inviterPersonaName: string;
        inviterMbtiType: string;
      } | null;
      error: { code: string } | null;
    };

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data?.inviterPersonaName).toBe('The Hidden Compass');
    expect(body.data?.inviterMbtiType).toBe('INFP');
    expect(body.data?.inviteToken).toBe(TOKEN);
  });

  it('(b) expired invite → 410 INVITE_EXPIRED', async () => {
    vi.spyOn(db, 'getInviteLink').mockResolvedValue(
      makeInvite({ expired_at: '2020-01-01T00:00:00.000Z' }),
    );

    const res = await getInviteReq(TOKEN, mockDb);
    const body = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(410);
    expect(body.error.code).toBe('INVITE_EXPIRED');
  });

  it('(c) missing invite → 404 NOT_FOUND', async () => {
    vi.spyOn(db, 'getInviteLink').mockResolvedValue(null);

    const res = await getInviteReq(TOKEN, mockDb);
    const body = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('(d) malformed token → 404 NOT_FOUND', async () => {
    const res = await getInviteReq('not-a-uuid', mockDb);
    const body = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
