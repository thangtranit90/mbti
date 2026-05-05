import type { Context } from 'hono';
import type { CuratedInsightRow, QuestionRow, TestResultRow } from '@mbti/shared';
import { MBTI_TYPES, type MBTIType } from '@mbti/shared';
import type { Bindings, Variables } from '../types/bindings';

/**
 * D1 access boundary.
 *
 * Rules (architecture.md#Enforcement Guidelines, Story 1.5 AC-9 / AC-10):
 *  - Route handlers MUST NOT call `c.env.DB` directly. Always go through a
 *    typed helper exported from this module.
 *  - All queries use prepared statements with `.bind(...)`. NEVER use string
 *    interpolation in SQL.
 *  - Snake_case row shapes from `@mbti/shared` row interfaces are returned
 *    as-is. The Hono response builder layer (route handlers) is responsible
 *    for the snake→camel transform.
 *  - Convention for future helpers: any helper that takes a UUID-shaped
 *    argument MUST lower-case it at the boundary on both insert AND lookup
 *    (deferred-work item from Story 1.4 — SQLite TEXT comparisons are
 *    case-sensitive). This story does not introduce any UUID-keyed helper.
 *  - This file scaffolds the minimum surface needed by the AI fallback
 *    (Story 3.2) and content feed (Story 6.1). Feature stories add
 *    domain-specific helpers as they land — do not pre-add helpers here.
 */

export type DbContext = { db: D1Database };

export function withDb(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
): D1Database {
  if (!c.env.DB) {
    throw new Error('D1 binding "DB" is not configured on this Worker');
  }
  return c.env.DB;
}

export async function getActiveCuratedInsights(
  db: D1Database,
  mbtiType: MBTIType,
): Promise<CuratedInsightRow[]> {
  if (!MBTI_TYPES.includes(mbtiType)) {
    throw new Error(
      `getActiveCuratedInsights: invalid mbtiType "${String(mbtiType)}"`,
    );
  }
  const result = await db
    .prepare(
      `SELECT id, mbti_type, variant, content, is_active, created_at, updated_at
       FROM curated_insights
       WHERE mbti_type = ? AND is_active = 1`,
    )
    .bind(mbtiType)
    .all<CuratedInsightRow>();
  if (!result.success) {
    throw new Error(
      `getActiveCuratedInsights: D1 query failed: ${result.error ?? 'unknown error'}`,
    );
  }
  return result.results ?? [];
}

export async function getAllActiveQuestions(db: D1Database): Promise<QuestionRow[]> {
  const result = await db
    .prepare(
      `SELECT id, text, dimension, answer_options, discrimination, difficulty, is_active, created_at
       FROM questions WHERE is_active = 1`,
    )
    .all<QuestionRow>();
  if (!result.success) {
    throw new Error(`getAllActiveQuestions: D1 query failed: ${result.error ?? 'unknown error'}`);
  }
  return result.results ?? [];
}

export async function createTestResult(
  db: D1Database,
  payload: {
    id: string;
    userId: string;
    mbtiType: MBTIType;
    declaredType: MBTIType | null;
    answers: Array<{ questionId: string; value: number }>;
    personaName: string;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `INSERT INTO test_results (id, user_id, calculated_type, declared_type, answers, persona_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      payload.id.toLowerCase(),
      payload.userId.toLowerCase(),
      payload.mbtiType,
      payload.declaredType,
      JSON.stringify(payload.answers),
      payload.personaName,
      now,
      now,
    )
    .run();
  if (!result.success) {
    throw new Error(`createTestResult: D1 insert failed: ${result.error ?? 'unknown error'}`);
  }
}

export async function getTestResult(
  db: D1Database,
  resultId: string,
): Promise<TestResultRow | null> {
  const result = await db
    .prepare(
      `SELECT id, user_id, declared_type, calculated_type, answers, persona_name, created_at, updated_at
       FROM test_results WHERE id = ? AND deleted_at IS NULL`,
    )
    .bind(resultId.toLowerCase())
    .all<TestResultRow>();
  if (!result.success) {
    throw new Error(`getTestResult: D1 query failed: ${result.error ?? 'unknown error'}`);
  }
  return result.results[0] ?? null;
}
