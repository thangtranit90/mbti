import { Hono } from 'hono';
import type { Bindings, Variables } from '../types/bindings';
import { requireSession } from '../middleware/auth';
import { withDb, getAllActiveQuestions, createTestResult, getTestResult } from '../lib/db';
import { selectNextQuestion, calculateMBTIType } from '../lib/cat';
import { captureServer } from '../lib/analytics';
import { NextQuestionRequestSchema, TestSubmitSchema, PERSONA_NAMES } from '@mbti/shared';

const tests = new Hono<{ Bindings: Bindings; Variables: Variables }>();

tests.post('/next-question', requireSession, async (c) => {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } },
      400,
    );
  }
  // ZodError bubbles to global app.onError → 400 VALIDATION_ERROR envelope
  const { answers } = NextQuestionRequestSchema.parse(payload);

  const db = withDb(c);
  const allQuestions = await getAllActiveQuestions(db);
  const next = selectNextQuestion(allQuestions, answers);

  if (!next) {
    return c.json({ data: null, error: null });
  }

  const options = JSON.parse(next.answer_options) as Array<{ label: string; value: number }>;
  const questionIndex = answers.length;

  return c.json({
    data: {
      question: {
        id: next.id,
        text: next.text,
        dimension: next.dimension,
        options,
      },
      questionIndex,
      total: 12,
    },
    error: null,
  });
});

tests.post('/submit', requireSession, async (c) => {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } },
      400,
    );
  }
  // ZodError bubbles to global app.onError → 400 VALIDATION_ERROR envelope
  const { answers, declaredType, inviteSource } = TestSubmitSchema.parse(payload);

  const db = withDb(c);
  const userId = c.get('userId');
  const allQuestions = await getAllActiveQuestions(db);
  const mbtiType = calculateMBTIType(allQuestions, answers);
  const personaName = PERSONA_NAMES[mbtiType];
  const id = crypto.randomUUID();

  await createTestResult(db, {
    id,
    userId,
    mbtiType,
    declaredType: declaredType ?? null,
    answers,
    personaName,
    inviteSourceToken: inviteSource ?? null,
  });

  // Story 7.4 — server-side analytics. Non-blocking; no-op without creds.
  // `executionCtx` is absent in unit tests (app.request without a Worker ctx);
  // fall back to fire-and-forget so the request still succeeds.
  const capture = captureServer(c.env, 'test_completed', userId, {
    resultType: mbtiType,
    questionCount: 12,
    declaredType: declaredType ?? null,
  });
  try {
    c.executionCtx.waitUntil(capture);
  } catch {
    void capture;
  }

  return c.json({ data: { resultId: id, mbtiType }, error: null }, 201);
});

tests.get('/:resultId', async (c) => {
  const db = withDb(c);
  const row = await getTestResult(db, c.req.param('resultId'));
  if (!row) {
    return c.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Result not found' } },
      404,
    );
  }
  return c.json({
    data: {
      id: row.id,
      mbtiType: row.calculated_type,
      declaredType: row.declared_type,
      personaName: row.persona_name,
      createdAt: row.created_at,
    },
    error: null,
  });
});

export default tests;
