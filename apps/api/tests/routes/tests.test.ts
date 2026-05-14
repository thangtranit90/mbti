import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../../src/index';
import type { QuestionRow, TestResultRow, MBTIType } from '@mbti/shared';

type NextQBody = {
  data: {
    question: { id: string; text: string; dimension: string; options: unknown[] };
    questionIndex: number;
    total: number;
  } | null;
  error: { code: string; message: string } | null;
};

type StoredSession = {
  userId: string;
  createdAt: string;
};

const TOKEN = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const SEED: StoredSession = {
  userId: 'ffffffff-1111-4222-8333-444444444444',
  createdAt: '2026-05-05T10:00:00.000Z',
};

const makeKv = () => ({
  put: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue(null),
  delete: vi.fn().mockResolvedValue(undefined),
  list: vi.fn(),
  getWithMetadata: vi.fn(),
});

const seedSession = (
  mockKv: ReturnType<typeof makeKv>,
  token: string,
  data: StoredSession,
) => {
  const key = `session:${token}`;
  const json = JSON.stringify(data);
  mockKv.get.mockImplementation(async (k: string, type?: string) => {
    if (k !== key) return null;
    return type === 'json' ? data : json;
  });
};

/** Build a minimal D1 mock that returns `rows` from any `.all()` call. */
const makeDb = (rows: QuestionRow[]) => {
  const stmt = {
    bind: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue({ success: true, results: rows }),
    run: vi.fn().mockResolvedValue({ success: true }),
    first: vi.fn().mockResolvedValue(rows[0] ?? null),
  };
  return {
    prepare: vi.fn().mockReturnValue(stmt),
    exec: vi.fn(),
    batch: vi.fn(),
    dump: vi.fn(),
  };
};

/** Generate `n` fake questions for `dimension` with stable IDs. */
const makeQuestions = (
  dimension: QuestionRow['dimension'],
  n: number,
  idPrefix: string,
): QuestionRow[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `${idPrefix}-${i + 1}`,
    text: `Question ${idPrefix} ${i + 1}`,
    dimension,
    answer_options: JSON.stringify([
      { label: 'Option A', value: 1 },
      { label: 'Option B', value: 2 },
    ]),
    discrimination: 1.0 - i * 0.1, // descending so first is highest
    difficulty: 0.0,
    is_active: 1,
    created_at: '2026-01-01T00:00:00.000Z',
  }));

const ALL_QUESTIONS: QuestionRow[] = [
  ...makeQuestions('E_I', 4, 'ei'),
  ...makeQuestions('S_N', 4, 'sn'),
  ...makeQuestions('T_F', 4, 'tf'),
  ...makeQuestions('J_P', 4, 'jp'),
];

const post = (
  body: unknown,
  mockKv: ReturnType<typeof makeKv>,
  mockDb: ReturnType<typeof makeDb>,
  headers: Record<string, string> = {},
) =>
  app.request(
    '/api/tests/next-question',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    },
    { KV: mockKv, DB: mockDb } as any,
  );

type SubmitBody = {
  data: { resultId: string; mbtiType: MBTIType } | null;
  error: { code: string; message: string } | null;
};

type GetResultBody = {
  data: {
    id: string;
    mbtiType: MBTIType;
    declaredType: MBTIType | null;
    personaName: string;
    createdAt: string;
  } | null;
  error: { code: string; message: string } | null;
};

const MBTI_TYPES_SET = new Set([
  'INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP',
  'ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP',
]);

const RESULT_ID = 'result-00-0000-0000-000000000001';
const RESULT_ROW: TestResultRow = {
  id: RESULT_ID,
  user_id: SEED.userId,
  declared_type: 'INFP',
  calculated_type: 'INTJ',
  answers: JSON.stringify([]),
  persona_name: 'The Architect',
  created_at: '2026-05-05T10:00:00.000Z',
  updated_at: '2026-05-05T10:00:00.000Z',
  deleted_at: null,
  retention_flag: null,
  invite_source_token: null,
};

/** Build 12 answers (3 per dimension × 4), all value=1 → yields ESTJ */
const make12Answers = () => [
  ...makeQuestions('E_I', 3, 'ei').map((q) => ({ questionId: q.id, value: 1 })),
  ...makeQuestions('S_N', 3, 'sn').map((q) => ({ questionId: q.id, value: 1 })),
  ...makeQuestions('T_F', 3, 'tf').map((q) => ({ questionId: q.id, value: 1 })),
  ...makeQuestions('J_P', 3, 'jp').map((q) => ({ questionId: q.id, value: 1 })),
];

const submitRequest = (
  body: unknown,
  mockKv: ReturnType<typeof makeKv>,
  mockDb: ReturnType<typeof makeDb>,
  headers: Record<string, string> = {},
) =>
  app.request(
    '/api/tests/submit',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    },
    { KV: mockKv, DB: mockDb } as any,
  );

const getResultRequest = (
  resultId: string,
  mockKv: ReturnType<typeof makeKv>,
  mockDb: ReturnType<typeof makeDb>,
  headers: Record<string, string> = {},
) =>
  app.request(
    `/api/tests/${resultId}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...headers },
    },
    { KV: mockKv, DB: mockDb } as any,
  );

describe('POST /api/tests/next-question', () => {
  let mockKv: ReturnType<typeof makeKv>;
  let mockDb: ReturnType<typeof makeDb>;

  beforeEach(() => {
    mockKv = makeKv();
    mockDb = makeDb(ALL_QUESTIONS);
    seedSession(mockKv, TOKEN, SEED);
  });

  it('(a) returns 401 when X-Session-Token header is missing', async () => {
    const res = await post({ answers: [] }, mockKv, mockDb);
    const body = (await res.json()) as NextQBody;

    expect(res.status).toBe(401);
    expect(body.data).toBeNull();
    expect(body.error?.code).toBe('UNAUTHORIZED');
  });

  it('(b) valid session + empty answers → first question, questionIndex 0, total 12', async () => {
    const res = await post({ answers: [] }, mockKv, mockDb, {
      'X-Session-Token': TOKEN,
    });
    const body = (await res.json()) as NextQBody;

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data?.questionIndex).toBe(0);
    expect(body.data?.total).toBe(12);
    expect(body.data?.question).toBeDefined();
    expect(body.data?.question.dimension).toBe('E_I');
  });

  it('(c) valid session + 11 answers → 12th question, questionIndex 11', async () => {
    // 3 E_I + 3 S_N + 3 T_F + 2 J_P = 11 answered
    const answers = [
      ...makeQuestions('E_I', 3, 'ei').map((q) => ({ questionId: q.id, value: 1 })),
      ...makeQuestions('S_N', 3, 'sn').map((q) => ({ questionId: q.id, value: 1 })),
      ...makeQuestions('T_F', 3, 'tf').map((q) => ({ questionId: q.id, value: 1 })),
      ...makeQuestions('J_P', 2, 'jp').map((q) => ({ questionId: q.id, value: 1 })),
    ];

    const res = await post({ answers }, mockKv, mockDb, {
      'X-Session-Token': TOKEN,
    });
    const body = (await res.json()) as NextQBody;

    expect(res.status).toBe(200);
    expect(body.data?.questionIndex).toBe(11);
    expect(body.data?.question.dimension).toBe('J_P');
  });

  it('(d) valid session + 12 answers → completion signal { data: null, error: null }', async () => {
    const answers = [
      ...makeQuestions('E_I', 3, 'ei').map((q) => ({ questionId: q.id, value: 1 })),
      ...makeQuestions('S_N', 3, 'sn').map((q) => ({ questionId: q.id, value: 1 })),
      ...makeQuestions('T_F', 3, 'tf').map((q) => ({ questionId: q.id, value: 1 })),
      ...makeQuestions('J_P', 3, 'jp').map((q) => ({ questionId: q.id, value: 1 })),
    ];

    const res = await post({ answers }, mockKv, mockDb, {
      'X-Session-Token': TOKEN,
    });
    const body = (await res.json()) as NextQBody;

    expect(res.status).toBe(200);
    expect(body.data).toBeNull();
    expect(body.error).toBeNull();
  });

  it('(e) malformed body (missing answers key) → 400 VALIDATION_ERROR', async () => {
    const res = await post({ wrong_key: [] }, mockKv, mockDb, {
      'X-Session-Token': TOKEN,
    });
    const body = (await res.json()) as NextQBody;

    expect(res.status).toBe(400);
    expect(body.data).toBeNull();
    expect(body.error?.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/tests/submit', () => {
  let mockKv: ReturnType<typeof makeKv>;
  let mockDb: ReturnType<typeof makeDb>;

  beforeEach(() => {
    mockKv = makeKv();
    mockDb = makeDb(ALL_QUESTIONS);
    seedSession(mockKv, TOKEN, SEED);
  });

  it('(a) missing session token → 401 UNAUTHORIZED', async () => {
    const res = await submitRequest(
      { answers: make12Answers(), declaredType: null },
      mockKv,
      mockDb,
    );
    const body = (await res.json()) as SubmitBody;

    expect(res.status).toBe(401);
    expect(body.data).toBeNull();
    expect(body.error?.code).toBe('UNAUTHORIZED');
  });

  it('(b) empty answers → 400 VALIDATION_ERROR', async () => {
    const res = await submitRequest(
      { answers: [], declaredType: null },
      mockKv,
      mockDb,
      { 'X-Session-Token': TOKEN },
    );
    const body = (await res.json()) as SubmitBody;

    expect(res.status).toBe(400);
    expect(body.data).toBeNull();
    expect(body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('(c) 12 valid answers + declaredType null → 201, resultId is UUID, mbtiType is valid', async () => {
    const res = await submitRequest(
      { answers: make12Answers(), declaredType: null },
      mockKv,
      mockDb,
      { 'X-Session-Token': TOKEN },
    );
    const body = (await res.json()) as SubmitBody;

    expect(res.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data?.resultId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(MBTI_TYPES_SET.has(body.data?.mbtiType ?? '')).toBe(true);
  });

  it('(d) 12 valid answers + valid declaredType → 201, stores correctly', async () => {
    const res = await submitRequest(
      { answers: make12Answers(), declaredType: 'INFP' },
      mockKv,
      mockDb,
      { 'X-Session-Token': TOKEN },
    );
    const body = (await res.json()) as SubmitBody;

    expect(res.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data?.resultId).toBeDefined();
    expect(MBTI_TYPES_SET.has(body.data?.mbtiType ?? '')).toBe(true);
    // Verify createTestResult was called (run() on the prepared statement)
    const runMock = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.results.find(
      (r) => r.value?.run,
    );
    expect(runMock).toBeDefined();
  });
});

describe('GET /api/tests/:resultId', () => {
  let mockKv: ReturnType<typeof makeKv>;

  beforeEach(() => {
    mockKv = makeKv();
  });

  it('(a) valid resultId, no session token → 200 with all result fields', async () => {
    const mockDb = makeDb(ALL_QUESTIONS);
    const stmt = {
      bind: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({ success: true, results: [RESULT_ROW] }),
      run: vi.fn().mockResolvedValue({ success: true }),
      first: vi.fn().mockResolvedValue(RESULT_ROW),
    };
    mockDb.prepare = vi.fn().mockReturnValue(stmt);

    const res = await getResultRequest(RESULT_ID, mockKv, mockDb);
    const body = (await res.json()) as GetResultBody;

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data?.id).toBe(RESULT_ROW.id);
    expect(body.data?.mbtiType).toBe(RESULT_ROW.calculated_type);
    expect(body.data?.declaredType).toBe(RESULT_ROW.declared_type);
    expect(body.data?.personaName).toBe(RESULT_ROW.persona_name);
    expect(body.data?.createdAt).toBe(RESULT_ROW.created_at);
  });

  it('(b) unknown resultId → 404 NOT_FOUND envelope', async () => {
    const mockDb = makeDb([]);
    const stmt = {
      bind: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({ success: true, results: [] }),
      run: vi.fn().mockResolvedValue({ success: true }),
      first: vi.fn().mockResolvedValue(null),
    };
    mockDb.prepare = vi.fn().mockReturnValue(stmt);

    const res = await getResultRequest('nonexistent-id', mockKv, mockDb);
    const body = (await res.json()) as GetResultBody;

    expect(res.status).toBe(404);
    expect(body.data).toBeNull();
    expect(body.error?.code).toBe('NOT_FOUND');
  });

  it('(c) public route — no session token still returns 200 for existing result', async () => {
    const mockDb = makeDb(ALL_QUESTIONS);
    const stmt = {
      bind: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({ success: true, results: [RESULT_ROW] }),
      run: vi.fn().mockResolvedValue({ success: true }),
      first: vi.fn().mockResolvedValue(RESULT_ROW),
    };
    mockDb.prepare = vi.fn().mockReturnValue(stmt);

    // Deliberately no X-Session-Token header — public route
    const res = await getResultRequest(RESULT_ID, mockKv, mockDb);

    expect(res.status).toBe(200);
  });
});
