import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app } from '../../src/index';
import * as db from '../../src/lib/db';

const makeKv = () => ({
  put: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue(null),
  delete: vi.fn().mockResolvedValue(undefined),
  list: vi.fn(),
  getWithMetadata: vi.fn(),
});

const seed = (
  kv: ReturnType<typeof makeKv>,
  prefix: string,
  token: string,
  data: object,
) => {
  kv.get.mockImplementation(async (k: string, type?: string) =>
    k === `${prefix}:${token}` ? (type === 'json' ? data : JSON.stringify(data)) : null,
  );
};

afterEach(() => vi.restoreAllMocks());

describe('DELETE /api/privacy/delete-me (Story 7.4)', () => {
  let kv: ReturnType<typeof makeKv>;
  beforeEach(() => {
    kv = makeKv();
  });

  it('soft-deletes user data and clears the session', async () => {
    seed(kv, 'session', 'sess-1', {
      userId: 'user-1',
      createdAt: '2026-05-16T00:00:00.000Z',
    });
    const softDel = vi.spyOn(db, 'softDeleteUserData').mockResolvedValue(3);
    const res = await app.request(
      '/api/privacy/delete-me',
      { method: 'DELETE', headers: { 'X-Session-Token': 'sess-1' } },
      { KV: kv, DB: {} } as never,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { deleted: boolean } | null };
    expect(body.data?.deleted).toBe(true);
    expect(softDel).toHaveBeenCalledWith(expect.anything(), 'user-1');
    expect(kv.delete).toHaveBeenCalledWith('session:sess-1');
  });

  it('requires a session token (401)', async () => {
    const res = await app.request(
      '/api/privacy/delete-me',
      { method: 'DELETE' },
      { KV: kv, DB: {} } as never,
    );
    expect(res.status).toBe(401);
  });
});

describe('POST /api/privacy/purge (Story 7.4)', () => {
  it('requires an admin token (403 without)', async () => {
    const res = await app.request(
      '/api/privacy/purge',
      { method: 'POST' },
      { KV: makeKv(), DB: {} } as never,
    );
    expect(res.status).toBe(403);
  });

  it('runs purge with a valid admin token', async () => {
    const kv = makeKv();
    seed(kv, 'admin', 'atok', {
      username: 'admin',
      createdAt: '2026-05-16T00:00:00.000Z',
    });
    const purge = vi.spyOn(db, 'purgeInactiveUsers').mockResolvedValue({
      testResults: 1,
      inviteLinks: 0,
      perceptionVotes: 2,
      reports: 0,
    });
    const res = await app.request(
      '/api/privacy/purge',
      { method: 'POST', headers: { 'X-Admin-Token': 'atok' } },
      { KV: kv, DB: {} } as never,
    );
    expect(res.status).toBe(200);
    expect(purge).toHaveBeenCalledOnce();
  });
});
