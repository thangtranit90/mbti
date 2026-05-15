import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import { app } from '../../src/index';
import * as db from '../../src/lib/db';
import { hashAdminPassword } from '../../src/lib/adminAuth';

const PW = 'admin-test-pw';
let PW_HASH = '';

beforeAll(async () => {
  PW_HASH = await hashAdminPassword(PW, 50_000);
});

const makeKv = () => ({
  put: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue(null),
  delete: vi.fn().mockResolvedValue(undefined),
  list: vi.fn(),
  getWithMetadata: vi.fn(),
});

const seedAdmin = (kv: ReturnType<typeof makeKv>, token: string) => {
  const data = { username: 'admin', createdAt: '2026-05-16T00:00:00.000Z' };
  kv.get.mockImplementation(async (k: string, type?: string) =>
    k === `admin:${token}` ? (type === 'json' ? data : JSON.stringify(data)) : null,
  );
};

const env = (kv: unknown) =>
  ({ KV: kv, DB: {}, ADMIN_PASSWORD_HASH: PW_HASH }) as never;

afterEach(() => vi.restoreAllMocks());

describe('POST /api/admin/login (Story 7.1)', () => {
  let kv: ReturnType<typeof makeKv>;
  beforeEach(() => {
    kv = makeKv();
  });

  it('returns adminToken on correct password', async () => {
    const res = await app.request(
      '/api/admin/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: PW }),
      },
      env(kv),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { adminToken: string } | null };
    expect(body.data?.adminToken).toMatch(/^[0-9a-f-]{36}$/);
    expect(kv.put).toHaveBeenCalledOnce();
  });

  it('returns 403 FORBIDDEN on wrong password', async () => {
    const res = await app.request(
      '/api/admin/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'nope' }),
      },
      env(kv),
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } | null };
    expect(body.error?.code).toBe('FORBIDDEN');
  });
});

describe('requireAdmin middleware (Story 7.1)', () => {
  it('rejects missing X-Admin-Token with 403', async () => {
    const res = await app.request('/api/admin/metrics', {}, env(makeKv()));
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } | null };
    expect(body.error?.code).toBe('FORBIDDEN');
  });

  it('rejects invalid token with 403', async () => {
    const res = await app.request(
      '/api/admin/metrics',
      { headers: { 'X-Admin-Token': 'bogus' } },
      env(makeKv()),
    );
    expect(res.status).toBe(403);
  });
});

describe('GET /api/admin/metrics (Story 7.1/7.2)', () => {
  it('returns metrics with a valid admin token', async () => {
    const kv = makeKv();
    seedAdmin(kv, 'tok-1');
    vi.spyOn(db, 'getAdminMetrics').mockResolvedValue({
      totalCompletedTests: 5,
      activeInviteLinks: 2,
      shareRate7d: 0.4,
      completionRate: 0.8,
      articleCountPerType: { INTJ: 1 },
    });
    const res = await app.request(
      '/api/admin/metrics',
      { headers: { 'X-Admin-Token': 'tok-1' } },
      env(kv),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { totalCompletedTests: number } };
    expect(body.data.totalCompletedTests).toBe(5);
  });
});

describe('Article CRUD (Story 7.2)', () => {
  it('creates an article', async () => {
    const kv = makeKv();
    seedAdmin(kv, 'tok-2');
    const spy = vi.spyOn(db, 'createArticle').mockResolvedValue(undefined);
    const res = await app.request(
      '/api/admin/articles',
      {
        method: 'POST',
        headers: { 'X-Admin-Token': 'tok-2', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Hello',
          body: 'World body',
          mbtiType: 'INTJ',
          slug: 'hello-world',
          status: 'published',
        }),
      },
      env(kv),
    );
    expect(res.status).toBe(201);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('rejects invalid slug via schema (400)', async () => {
    const kv = makeKv();
    seedAdmin(kv, 'tok-3');
    const res = await app.request(
      '/api/admin/articles',
      {
        method: 'POST',
        headers: { 'X-Admin-Token': 'tok-3', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'X',
          body: 'Y',
          mbtiType: 'INTJ',
          slug: 'Bad Slug!',
        }),
      },
      env(kv),
    );
    expect(res.status).toBe(400);
  });
});

describe('Insight review (Story 7.3)', () => {
  it('approves an insight', async () => {
    const kv = makeKv();
    seedAdmin(kv, 'tok-4');
    const spy = vi.spyOn(db, 'updateInsightStatus').mockResolvedValue(true);
    const res = await app.request(
      '/api/admin/insights/abc',
      {
        method: 'PATCH',
        headers: { 'X-Admin-Token': 'tok-4', 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      },
      env(kv),
    );
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(expect.anything(), 'abc', 'approved');
  });
});
