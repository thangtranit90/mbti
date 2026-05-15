import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock generateOGPng so tests don't load resvg-wasm / fetch fonts.
const { mockGenerate } = vi.hoisted(() => ({ mockGenerate: vi.fn() }));
vi.mock('../../src/lib/og', () => ({
  generateOGPng: mockGenerate,
}));

import { app } from '../../src/index';
import * as db from '../../src/lib/db';
import type { TestResultRow } from '@mbti/shared';

const RESULT_ID = 'abcabcab-1234-4567-8888-abcdefabcdef';

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

const makeR2 = (cachedBody: ArrayBuffer | null = null) => ({
  get: vi.fn().mockResolvedValue(
    cachedBody
      ? {
          size: cachedBody.byteLength,
          httpMetadata: { contentType: 'image/png' },
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(cachedBody));
              controller.close();
            },
          }),
        }
      : null,
  ),
  put: vi.fn().mockResolvedValue(undefined),
});

const makeDb = () => ({
  prepare: vi.fn().mockReturnValue({
    bind: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue({ success: true, results: [] }),
  }),
});

const getOG = (resultId: string, r2: ReturnType<typeof makeR2>) =>
  app.request(
    `/api/og/${resultId}`,
    { method: 'GET' },
    { ASSETS_BUCKET: r2, DB: makeDb() } as any,
  );

describe('GET /api/og/:resultId', () => {
  let r2: ReturnType<typeof makeR2>;

  beforeEach(() => {
    r2 = makeR2();
    mockGenerate.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('(a) cache hit → serves R2 body without regenerating', async () => {
    r2 = makeR2(new ArrayBuffer(8));
    const res = await getOG(RESULT_ID, r2);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('(b) cache miss + valid resultId → generates PNG and writes to R2', async () => {
    vi.spyOn(db, 'getTestResult').mockResolvedValue(makeTestResultRow());
    mockGenerate.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));

    const res = await getOG(RESULT_ID, r2);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(mockGenerate).toHaveBeenCalledOnce();
    expect(mockGenerate).toHaveBeenCalledWith('The Hidden Compass', 'INFP');
  });

  it('(c) unknown resultId → 404 NOT_FOUND', async () => {
    vi.spyOn(db, 'getTestResult').mockResolvedValue(null);

    const res = await getOG(RESULT_ID, r2);
    const body = (await res.json()) as { error: { code: string } };

    expect(res.status).toBe(404);
    expect(body.error?.code).toBe('NOT_FOUND');
  });

  it('(d) generation error → returns fallback transparent PNG (not 500)', async () => {
    vi.spyOn(db, 'getTestResult').mockResolvedValue(makeTestResultRow());
    mockGenerate.mockRejectedValue(new Error('wasm failed'));

    const res = await getOG(RESULT_ID, r2);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
  });
});
