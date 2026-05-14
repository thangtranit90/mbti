import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CuratedInsightRow, MBTIType } from '@mbti/shared';
import type { Bindings } from '../../types/bindings';

// vi.mock must be hoisted - declare mock implementation inside the factory.
const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

// Mock getCuratedInsight from db module
vi.mock('../../lib/db', () => ({
  getCuratedInsight: vi.fn(),
}));

import { generateInsight } from '../../lib/ai';
import * as db from '../../lib/db';

const makeEnv = (): Bindings =>
  ({
    ANTHROPIC_API_KEY: 'test-key',
    DB: {} as D1Database,
    KV: {} as KVNamespace,
    ASSETS_BUCKET: {} as R2Bucket,
    RATE_LIMITER: {} as RateLimit,
    PAYOS_API_KEY: '',
    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
    ADMIN_PASSWORD_HASH: '',
  }) as Bindings;

const makeCuratedRow = (overrides: Partial<CuratedInsightRow> = {}): CuratedInsightRow => ({
  id: 'placeholder-insight-INFP-v1',
  mbti_type: 'INFP',
  variant: 'v1',
  content: 'Curated fallback content for INFP.',
  is_active: 1,
  created_at: '2026-05-05T00:00:00.000Z',
  updated_at: '2026-05-05T00:00:00.000Z',
  ...overrides,
});

describe('generateInsight', () => {
  const mbtiType: MBTIType = 'INFP';
  const dbMock = {} as D1Database;

  beforeEach(() => {
    mockCreate.mockReset();
    vi.mocked(db.getCuratedInsight).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('(a) happy path: AI returns text within timeout → source: "ai"', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Bạn quan sát thế giới sâu sắc hơn bạn nói ra.' }],
    });

    const result = await generateInsight(dbMock, makeEnv(), mbtiType, null, [], []);

    expect(result.source).toBe('ai');
    expect(result.content).toBe('Bạn quan sát thế giới sâu sắc hơn bạn nói ra.');
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-sonnet-4-6', max_tokens: 150 }),
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('(b) timeout path: AI exceeds 2500ms → source: "curated"', async () => {
    vi.useFakeTimers();
    mockCreate.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () => resolve({ content: [{ type: 'text', text: 'too late' }] }),
            5000,
          );
        }),
    );
    vi.mocked(db.getCuratedInsight).mockResolvedValue(makeCuratedRow());

    const promise = generateInsight(dbMock, makeEnv(), mbtiType, null, [], []);
    await vi.advanceTimersByTimeAsync(2600);
    const result = await promise;

    expect(result.source).toBe('curated');
    expect(result.content).toBe('Curated fallback content for INFP.');
  });

  it('(c) error path: AI throws → source: "curated"', async () => {
    mockCreate.mockRejectedValue(new Error('Network error'));
    vi.mocked(db.getCuratedInsight).mockResolvedValue(makeCuratedRow());

    const result = await generateInsight(dbMock, makeEnv(), mbtiType, null, [], []);

    expect(result.source).toBe('curated');
    expect(result.content).toBe('Curated fallback content for INFP.');
  });

  it('(d) error path + no curated row → falls back to FALLBACK_INSIGHT constant', async () => {
    mockCreate.mockRejectedValue(new Error('API down'));
    vi.mocked(db.getCuratedInsight).mockResolvedValue(null);

    const result = await generateInsight(dbMock, makeEnv(), mbtiType, null, [], []);

    expect(result.source).toBe('curated');
    expect(result.content).toContain('Bạn có cách nhìn độc đáo');
  });

  it('(e) non-text response from Claude → falls back to curated', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use' }],
    });
    vi.mocked(db.getCuratedInsight).mockResolvedValue(makeCuratedRow());

    const result = await generateInsight(dbMock, makeEnv(), mbtiType, null, [], []);

    expect(result.source).toBe('curated');
  });
});
