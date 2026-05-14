import { Hono } from 'hono';
import type { Bindings, Variables } from '../types/bindings';
import {
  withDb,
  getTestResult,
  getCuratedInsight,
  getActiveCuratedInsights,
} from '../lib/db';
import { generateInsight } from '../lib/ai';
import { FALLBACK_INSIGHT } from '../lib/fallback';
import { requireSession } from '../middleware/auth';
import {
  PERSONA_NAMES,
  VILLAINS_MAP,
  MBTI_TYPES,
  GenerateInsightRequestSchema,
  type MBTIType,
} from '@mbti/shared';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidMbtiType(t: unknown): t is MBTIType {
  return typeof t === 'string' && (MBTI_TYPES as readonly string[]).includes(t);
}

const insights = new Hono<{ Bindings: Bindings; Variables: Variables }>();

insights.get('/:resultId/insight', async (c) => {
  const resultId = c.req.param('resultId');
  if (!UUID_RE.test(resultId)) {
    return c.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid resultId' } },
      400,
    );
  }
  const db = withDb(c);
  const row = await getTestResult(db, resultId);
  if (!row) {
    return c.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Result not found' } },
      404,
    );
  }
  if (!isValidMbtiType(row.calculated_type)) {
    return c.json(
      { data: null, error: { code: 'INVALID_TYPE', message: 'Stored mbti_type invalid' } },
      500,
    );
  }
  const mbtiType = row.calculated_type;
  const insightRow = await getCuratedInsight(db, mbtiType);
  return c.json({
    data: {
      personaName: PERSONA_NAMES[mbtiType],
      insight: insightRow?.content ?? FALLBACK_INSIGHT,
      villains: VILLAINS_MAP[mbtiType],
    },
    error: null,
  });
});

insights.post('/generate', requireSession, async (c) => {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } },
      400,
    );
  }
  const body = GenerateInsightRequestSchema.parse(payload);

  const db = withDb(c);
  const row = await getTestResult(db, body.resultId);
  if (!row) {
    return c.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Result not found' } },
      404,
    );
  }

  // Ownership check — only the user who owns this result may trigger paid AI calls.
  const callerUserId = c.get('userId');
  if (row.user_id !== callerUserId) {
    return c.json(
      { data: null, error: { code: 'FORBIDDEN', message: 'Result does not belong to caller' } },
      403,
    );
  }

  if (!isValidMbtiType(row.calculated_type)) {
    return c.json(
      { data: null, error: { code: 'INVALID_TYPE', message: 'Stored mbti_type invalid' } },
      500,
    );
  }

  // Defensive parse of the answers JSON column.
  let answers: Array<{ questionId: string; value: number }> = [];
  try {
    const parsed = JSON.parse(row.answers);
    if (Array.isArray(parsed)) answers = parsed;
  } catch {
    answers = [];
  }

  const declaredType: MBTIType | null = isValidMbtiType(row.declared_type)
    ? row.declared_type
    : null;

  const variants = await getActiveCuratedInsights(db, row.calculated_type);
  const { content, source } = await generateInsight(
    db,
    c.env,
    row.calculated_type,
    declaredType,
    answers,
    variants,
  );
  // TODO Story 3.2: PostHog server-side capture once POSTHOG_API_KEY is bound in Workers.
  // safeCapture('insight_served', { source, mbtiType: row.calculated_type });
  return c.json({ data: { content, source }, error: null });
});

export default insights;
