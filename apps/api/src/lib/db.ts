import type { Context } from 'hono';
import type {
  ArticleRow,
  CuratedInsightRow,
  InviteLinkRow,
  PaymentRow,
  PerceptionVoteRow,
  QuestionRow,
  ReportRow,
  TestResultRow,
} from '@mbti/shared';
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

export async function getCuratedInsight(
  db: D1Database,
  mbtiType: MBTIType,
): Promise<CuratedInsightRow | null> {
  const result = await db
    .prepare(
      `SELECT id, mbti_type, variant, content, is_active, created_at, updated_at
       FROM curated_insights
       WHERE mbti_type = ? AND is_active = 1
       ORDER BY created_at ASC
       LIMIT 1`,
    )
    .bind(mbtiType)
    .all<CuratedInsightRow>();
  if (!result.success) {
    throw new Error(
      `getCuratedInsight: D1 query failed: ${result.error ?? 'unknown error'}`,
    );
  }
  return result.results?.[0] ?? null;
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
    inviteSourceToken?: string | null;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `INSERT INTO test_results (id, user_id, calculated_type, declared_type, answers, persona_name, created_at, updated_at, invite_source_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      payload.inviteSourceToken ? payload.inviteSourceToken.toLowerCase() : null,
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

export async function generateInviteLink(
  db: D1Database,
  payload: {
    id: string;
    token: string;
    inviterUserId: string;
    inviterResultId: string;
    expiredAt: string;
  },
): Promise<void> {
  const result = await db
    .prepare(
      `INSERT INTO invite_links (id, token, inviter_user_id, inviter_result_id, expired_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(
      payload.id.toLowerCase(),
      payload.token.toLowerCase(),
      payload.inviterUserId.toLowerCase(),
      payload.inviterResultId.toLowerCase(),
      payload.expiredAt,
    )
    .run();
  if (!result.success) {
    throw new Error(
      `generateInviteLink: D1 insert failed: ${result.error ?? 'unknown error'}`,
    );
  }
}

export async function getInviteLink(
  db: D1Database,
  token: string,
): Promise<InviteLinkRow | null> {
  const result = await db
    .prepare(
      `SELECT id, token, inviter_user_id, inviter_result_id, expired_at, created_at, deleted_at
       FROM invite_links WHERE token = ? AND deleted_at IS NULL`,
    )
    .bind(token.toLowerCase())
    .all<InviteLinkRow>();
  if (!result.success) {
    throw new Error(`getInviteLink: D1 query failed: ${result.error ?? 'unknown error'}`);
  }
  return result.results[0] ?? null;
}

export async function createPerceptionVote(
  db: D1Database,
  payload: {
    id: string;
    inviteToken: string;
    inviterUserId: string;
    voterSessionId: string | null;
    behavioralAnswers: Array<{ questionId: string; value: number }>;
  },
): Promise<void> {
  const result = await db
    .prepare(
      `INSERT INTO perception_votes (id, invite_token, inviter_user_id, voter_session_id, behavioral_answers)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(
      payload.id.toLowerCase(),
      payload.inviteToken.toLowerCase(),
      payload.inviterUserId.toLowerCase(),
      payload.voterSessionId ? payload.voterSessionId.toLowerCase() : null,
      JSON.stringify(payload.behavioralAnswers),
    )
    .run();
  if (!result.success) {
    throw new Error(
      `createPerceptionVote: D1 insert failed: ${result.error ?? 'unknown error'}`,
    );
  }
}

export async function getLatestTestResultForUser(
  db: D1Database,
  userId: string,
): Promise<TestResultRow | null> {
  const result = await db
    .prepare(
      `SELECT id, user_id, declared_type, calculated_type, answers, persona_name, created_at, updated_at, deleted_at, retention_flag, invite_source_token
       FROM test_results WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(userId.toLowerCase())
    .all<TestResultRow>();
  if (!result.success) {
    throw new Error(
      `getLatestTestResultForUser: D1 query failed: ${result.error ?? 'unknown error'}`,
    );
  }
  return result.results[0] ?? null;
}

export async function getLatestVoterName(
  db: D1Database,
  inviterUserId: string,
): Promise<string | null> {
  const result = await db
    .prepare(
      `SELECT tr.persona_name as persona_name
       FROM perception_votes pv
       INNER JOIN invite_links il ON il.token = pv.invite_token
       LEFT JOIN test_results tr ON tr.invite_source_token = pv.invite_token
         AND tr.deleted_at IS NULL
       WHERE il.inviter_user_id = ? AND pv.deleted_at IS NULL AND il.deleted_at IS NULL
       ORDER BY pv.created_at DESC LIMIT 1`,
    )
    .bind(inviterUserId.toLowerCase())
    .all<{ persona_name: string | null }>();
  if (!result.success) {
    throw new Error(
      `getLatestVoterName: D1 query failed: ${result.error ?? 'unknown error'}`,
    );
  }
  return result.results[0]?.persona_name ?? null;
}

export async function getSocialStatusForInviter(
  db: D1Database,
  inviterUserId: string,
): Promise<{ voterCount: number; latestVotes: PerceptionVoteRow[] }> {
  const countRes = await db
    .prepare(
      `SELECT COUNT(1) as n FROM perception_votes pv
       INNER JOIN invite_links il ON il.token = pv.invite_token
       WHERE il.inviter_user_id = ? AND pv.deleted_at IS NULL AND il.deleted_at IS NULL`,
    )
    .bind(inviterUserId.toLowerCase())
    .all<{ n: number }>();
  if (!countRes.success) {
    throw new Error(
      `getSocialStatusForInviter: D1 count failed: ${countRes.error ?? 'unknown error'}`,
    );
  }
  const voterCount = countRes.results[0]?.n ?? 0;

  const latestRes = await db
    .prepare(
      `SELECT pv.id, pv.invite_token, pv.inviter_user_id, pv.voter_session_id, pv.behavioral_answers, pv.created_at, pv.deleted_at
       FROM perception_votes pv
       INNER JOIN invite_links il ON il.token = pv.invite_token
       WHERE il.inviter_user_id = ? AND pv.deleted_at IS NULL AND il.deleted_at IS NULL
       ORDER BY pv.created_at DESC LIMIT 3`,
    )
    .bind(inviterUserId.toLowerCase())
    .all<PerceptionVoteRow>();
  if (!latestRes.success) {
    throw new Error(
      `getSocialStatusForInviter: D1 latest votes failed: ${latestRes.error ?? 'unknown error'}`,
    );
  }

  return { voterCount, latestVotes: latestRes.results ?? [] };
}

export async function createPayment(
  db: D1Database,
  payload: {
    id: string;
    userId: string;
    resultId: string | null;
    productType: 'couple_pack' | 'gap_report';
    gateway: 'sepay' | 'stripe';
    providerRef: string;
    amount: number;
    currency: string;
  },
): Promise<void> {
  const result = await db
    .prepare(
      `INSERT INTO payments (id, user_id, result_id, product_type, gateway, provider_ref, amount, currency, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    )
    .bind(
      payload.id.toLowerCase(),
      payload.userId.toLowerCase(),
      payload.resultId ? payload.resultId.toLowerCase() : null,
      payload.productType,
      payload.gateway,
      payload.providerRef,
      payload.amount,
      payload.currency,
    )
    .run();
  if (!result.success) {
    throw new Error(`createPayment: D1 insert failed: ${result.error ?? 'unknown error'}`);
  }
}

export async function getPaymentByProviderRef(
  db: D1Database,
  providerRef: string,
): Promise<PaymentRow | null> {
  const result = await db
    .prepare(
      `SELECT id, user_id, result_id, product_type, gateway, provider_ref, amount, currency, status, created_at, updated_at, completed_at, deleted_at
       FROM payments WHERE provider_ref = ? AND deleted_at IS NULL LIMIT 1`,
    )
    .bind(providerRef)
    .all<PaymentRow>();
  if (!result.success) {
    throw new Error(
      `getPaymentByProviderRef: D1 query failed: ${result.error ?? 'unknown error'}`,
    );
  }
  return result.results[0] ?? null;
}

export async function markPaymentCompleted(
  db: D1Database,
  providerRef: string,
): Promise<void> {
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `UPDATE payments SET status = 'completed', completed_at = ?, updated_at = ?
       WHERE provider_ref = ? AND status != 'completed'`,
    )
    .bind(now, now, providerRef)
    .run();
  if (!result.success) {
    throw new Error(
      `markPaymentCompleted: D1 update failed: ${result.error ?? 'unknown error'}`,
    );
  }
}

export async function createReport(
  db: D1Database,
  payload: {
    id: string;
    inviterUserId: string;
    inviteeUserId: string;
    inviterResultId: string;
    inviteeResultId: string;
    r2Key: string;
  },
): Promise<void> {
  const result = await db
    .prepare(
      `INSERT INTO reports (id, inviter_user_id, invitee_user_id, inviter_result_id, invitee_result_id, r2_key)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      payload.id.toLowerCase(),
      payload.inviterUserId.toLowerCase(),
      payload.inviteeUserId.toLowerCase(),
      payload.inviterResultId.toLowerCase(),
      payload.inviteeResultId.toLowerCase(),
      payload.r2Key,
    )
    .run();
  if (!result.success) {
    throw new Error(`createReport: D1 insert failed: ${result.error ?? 'unknown error'}`);
  }
}

export async function getReportRow(
  db: D1Database,
  reportId: string,
): Promise<ReportRow | null> {
  const result = await db
    .prepare(
      `SELECT id, inviter_user_id, invitee_user_id, inviter_result_id, invitee_result_id, r2_key, created_at, deleted_at
       FROM reports WHERE id = ? AND deleted_at IS NULL`,
    )
    .bind(reportId.toLowerCase())
    .all<ReportRow>();
  if (!result.success) {
    throw new Error(`getReportRow: D1 query failed: ${result.error ?? 'unknown error'}`);
  }
  return result.results[0] ?? null;
}

export async function getPaymentById(
  db: D1Database,
  paymentId: string,
): Promise<PaymentRow | null> {
  const result = await db
    .prepare(
      `SELECT id, user_id, result_id, product_type, gateway, provider_ref, amount, currency, status, created_at, updated_at, completed_at, deleted_at
       FROM payments WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    )
    .bind(paymentId.toLowerCase())
    .all<PaymentRow>();
  if (!result.success) {
    throw new Error(`getPaymentById: D1 query failed: ${result.error ?? 'unknown error'}`);
  }
  return result.results[0] ?? null;
}

export async function getCompletedPayment(
  db: D1Database,
  userId: string,
  productType: 'couple_pack' | 'gap_report',
): Promise<PaymentRow | null> {
  const result = await db
    .prepare(
      `SELECT id, user_id, result_id, product_type, gateway, provider_ref, amount, currency, status, created_at, updated_at, completed_at, deleted_at
       FROM payments
       WHERE user_id = ? AND product_type = ? AND status = 'completed' AND deleted_at IS NULL
       ORDER BY completed_at DESC LIMIT 1`,
    )
    .bind(userId.toLowerCase(), productType)
    .all<PaymentRow>();
  if (!result.success) {
    throw new Error(
      `getCompletedPayment: D1 query failed: ${result.error ?? 'unknown error'}`,
    );
  }
  return result.results[0] ?? null;
}

export async function getArticlesByType(
  db: D1Database,
  mbtiType: MBTIType,
): Promise<ArticleRow[]> {
  if (!MBTI_TYPES.includes(mbtiType)) {
    throw new Error(`getArticlesByType: invalid mbtiType "${String(mbtiType)}"`);
  }
  const result = await db
    .prepare(
      `SELECT id, mbti_type, slug, title, content, author, published_at, is_published, created_at, updated_at
       FROM articles WHERE mbti_type = ? AND is_published = 1
       ORDER BY published_at DESC`,
    )
    .bind(mbtiType)
    .all<ArticleRow>();
  if (!result.success) {
    throw new Error(`getArticlesByType: D1 query failed: ${result.error ?? 'unknown error'}`);
  }
  return result.results ?? [];
}

export async function getArticleBySlug(
  db: D1Database,
  slug: string,
): Promise<ArticleRow | null> {
  const result = await db
    .prepare(
      `SELECT id, mbti_type, slug, title, content, author, published_at, is_published, created_at, updated_at
       FROM articles WHERE slug = ? AND is_published = 1
       LIMIT 1`,
    )
    .bind(slug)
    .all<ArticleRow>();
  if (!result.success) {
    throw new Error(`getArticleBySlug: D1 query failed: ${result.error ?? 'unknown error'}`);
  }
  return result.results[0] ?? null;
}

export async function getPerceptionVote(
  db: D1Database,
  inviteToken: string,
  voterSessionId: string,
): Promise<PerceptionVoteRow | null> {
  const result = await db
    .prepare(
      `SELECT id, invite_token, inviter_user_id, voter_session_id, behavioral_answers, created_at, deleted_at
       FROM perception_votes
       WHERE invite_token = ? AND voter_session_id = ? AND deleted_at IS NULL
       LIMIT 1`,
    )
    .bind(inviteToken.toLowerCase(), voterSessionId.toLowerCase())
    .all<PerceptionVoteRow>();
  if (!result.success) {
    throw new Error(
      `getPerceptionVote: D1 query failed: ${result.error ?? 'unknown error'}`,
    );
  }
  return result.results[0] ?? null;
}
