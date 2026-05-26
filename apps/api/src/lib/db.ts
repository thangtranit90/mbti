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
import {
  MBTI_TYPES,
  RESULT_UNLOCK_FRIEND_THRESHOLD,
  type MBTIType,
  type ProductType,
} from '@mbti/shared';
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
      `SELECT id, mbti_type, variant, content, is_active, source, status, created_at, updated_at
       FROM curated_insights
       WHERE mbti_type = ? AND is_active = 1 AND status = 'approved'`,
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
      `SELECT id, mbti_type, variant, content, is_active, source, status, created_at, updated_at
       FROM curated_insights
       WHERE mbti_type = ? AND is_active = 1 AND status = 'approved'
       ORDER BY created_at ASC, id ASC
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
    productType: ProductType;
    gateway: 'sepay' | 'stripe';
    providerRef: string;
    amount: number;
    currency: string;
    email?: string | null;
  },
): Promise<void> {
  const result = await db
    .prepare(
      `INSERT INTO payments (id, user_id, result_id, product_type, gateway, provider_ref, amount, currency, status, email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
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
      payload.email ? payload.email.trim().toLowerCase() : null,
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
      `SELECT id, user_id, result_id, product_type, gateway, provider_ref, amount, currency, status, created_at, updated_at, completed_at, deleted_at, email, email_sent_at
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
      `SELECT id, user_id, result_id, product_type, gateway, provider_ref, amount, currency, status, created_at, updated_at, completed_at, deleted_at, email, email_sent_at
       FROM payments WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    )
    .bind(paymentId.toLowerCase())
    .all<PaymentRow>();
  if (!result.success) {
    throw new Error(`getPaymentById: D1 query failed: ${result.error ?? 'unknown error'}`);
  }
  return result.results[0] ?? null;
}

// Migration 0013 — flip email_sent_at to "now" iff still null; guards against
// duplicate sends when SePay re-delivers an IPN we already processed.
export async function markEmailSent(
  db: D1Database,
  paymentId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `UPDATE payments SET email_sent_at = ?, updated_at = ?
       WHERE id = ? AND email_sent_at IS NULL`,
    )
    .bind(now, now, paymentId.toLowerCase())
    .run();
  if (!result.success) {
    throw new Error(
      `markEmailSent: D1 update failed: ${result.error ?? 'unknown error'}`,
    );
  }
}

export async function getCompletedPayment(
  db: D1Database,
  userId: string,
  productType: ProductType,
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

export type ResultAccess = {
  unlocked: boolean;
  paid: boolean;
  friendCount: number;
  threshold: number;
};

/**
 * Story 7.x — durable, resultId-bound access check for the basic result.
 *
 * The result is unlocked when EITHER:
 *  - a COMPLETED `result_unlock` payment is bound to this resultId, OR
 *  - >= RESULT_UNLOCK_FRIEND_THRESHOLD DISTINCT friends COMPLETED the full
 *    12-question test via an invite link generated from this result.
 *
 * Bound to the resultId (not the viewer's session) so the unlock survives
 * session loss, device change and shared links — this also fixes the bug
 * where the inviter's page showed nothing after friends engaged.
 * Returns null if the result does not exist (caller maps to 404).
 */
export async function getResultAccess(
  db: D1Database,
  resultId: string,
): Promise<ResultAccess | null> {
  const id = resultId.toLowerCase();
  const result = await getTestResult(db, id);
  if (!result) return null;

  const paidRes = await db
    .prepare(
      `SELECT 1 AS hit FROM payments
       WHERE result_id = ? AND product_type = 'result_unlock'
         AND status = 'completed' AND deleted_at IS NULL
       LIMIT 1`,
    )
    .bind(id)
    .all<{ hit: number }>();
  if (!paidRes.success) {
    throw new Error(
      `getResultAccess: D1 paid query failed: ${paidRes.error ?? 'unknown error'}`,
    );
  }
  const paid = (paidRes.results?.length ?? 0) > 0;

  const friendRes = await db
    .prepare(
      `SELECT COUNT(DISTINCT tr.user_id) AS n
       FROM test_results tr
       INNER JOIN invite_links il ON il.token = tr.invite_source_token
       WHERE il.inviter_result_id = ?
         AND il.deleted_at IS NULL
         AND tr.deleted_at IS NULL
         AND tr.user_id <> ?`,
    )
    .bind(id, result.user_id.toLowerCase())
    .all<{ n: number }>();
  if (!friendRes.success) {
    throw new Error(
      `getResultAccess: D1 friend query failed: ${friendRes.error ?? 'unknown error'}`,
    );
  }
  const friendCount = friendRes.results?.[0]?.n ?? 0;

  return {
    paid,
    friendCount,
    threshold: RESULT_UNLOCK_FRIEND_THRESHOLD,
    unlocked: paid || friendCount >= RESULT_UNLOCK_FRIEND_THRESHOLD,
  };
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

// ===================================================================
// Epic 7 — Admin, Analytics & Compliance
// ===================================================================

async function scalar(
  db: D1Database,
  label: string,
  sql: string,
  ...binds: unknown[]
): Promise<number> {
  const res = await db
    .prepare(sql)
    .bind(...binds)
    .all<{ n: number }>();
  if (!res.success) {
    throw new Error(`${label}: D1 query failed: ${res.error ?? 'unknown error'}`);
  }
  return res.results[0]?.n ?? 0;
}

export type AdminMetrics = {
  totalCompletedTests: number;
  activeInviteLinks: number;
  shareRate7d: number;
  completionRate: number;
  articleCountPerType: Record<string, number>;
};

/**
 * Story 7.1 / 7.2 — dashboard metrics. All counts are live rows only
 * (deleted_at IS NULL). `shareRate7d` and `completionRate` are documented D1
 * proxies until Story 7.4 wires PostHog query data:
 *  - shareRate7d  ≈ invite_links created in last 7d / completed tests last 7d
 *  - completionRate ≈ tests with a non-empty answers payload / all tests
 */
export async function getAdminMetrics(db: D1Database): Promise<AdminMetrics> {
  const totalCompletedTests = await scalar(
    db,
    'getAdminMetrics.total',
    `SELECT COUNT(1) AS n FROM test_results WHERE deleted_at IS NULL`,
  );
  const activeInviteLinks = await scalar(
    db,
    'getAdminMetrics.invites',
    `SELECT COUNT(1) AS n FROM invite_links
     WHERE deleted_at IS NULL AND expired_at > datetime('now')`,
  );
  const tests7d = await scalar(
    db,
    'getAdminMetrics.tests7d',
    `SELECT COUNT(1) AS n FROM test_results
     WHERE deleted_at IS NULL AND created_at > datetime('now','-7 days')`,
  );
  const invites7d = await scalar(
    db,
    'getAdminMetrics.invites7d',
    `SELECT COUNT(1) AS n FROM invite_links
     WHERE deleted_at IS NULL AND created_at > datetime('now','-7 days')`,
  );
  const withAnswers = await scalar(
    db,
    'getAdminMetrics.withAnswers',
    `SELECT COUNT(1) AS n FROM test_results
     WHERE deleted_at IS NULL AND answers IS NOT NULL AND answers != '' AND answers != '[]'`,
  );
  const shareRate7d = tests7d > 0 ? round2(invites7d / tests7d) : 0;
  const completionRate =
    totalCompletedTests > 0 ? round2(withAnswers / totalCompletedTests) : 0;
  const articleCountPerType = await getArticleCountPerType(db);
  return {
    totalCompletedTests,
    activeInviteLinks,
    shareRate7d,
    completionRate,
    articleCountPerType,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- Story 7.2: Article CRUD + threshold ---------------------------

export async function getArticleCountPerType(
  db: D1Database,
): Promise<Record<string, number>> {
  const res = await db
    .prepare(
      `SELECT mbti_type, COUNT(1) AS n FROM articles GROUP BY mbti_type`,
    )
    .all<{ mbti_type: string; n: number }>();
  if (!res.success) {
    throw new Error(
      `getArticleCountPerType: D1 query failed: ${res.error ?? 'unknown error'}`,
    );
  }
  const counts: Record<string, number> = {};
  for (const t of MBTI_TYPES) counts[t] = 0;
  for (const row of res.results ?? []) counts[row.mbti_type] = row.n;
  return counts;
}

export async function getAllArticles(db: D1Database): Promise<ArticleRow[]> {
  const res = await db
    .prepare(
      `SELECT id, mbti_type, slug, title, content, author, published_at, is_published, created_at, updated_at
       FROM articles ORDER BY mbti_type ASC, updated_at DESC`,
    )
    .all<ArticleRow>();
  if (!res.success) {
    throw new Error(`getAllArticles: D1 query failed: ${res.error ?? 'unknown error'}`);
  }
  return res.results ?? [];
}

export async function createArticle(
  db: D1Database,
  payload: {
    id: string;
    title: string;
    body: string;
    mbtiType: MBTIType;
    slug: string;
    status: 'draft' | 'published';
  },
): Promise<void> {
  const now = new Date().toISOString();
  const isPublished = payload.status === 'published' ? 1 : 0;
  const publishedAt = isPublished ? now : null;
  const res = await db
    .prepare(
      `INSERT INTO articles (id, mbti_type, slug, title, content, author, published_at, is_published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      payload.id.toLowerCase(),
      payload.mbtiType,
      payload.slug,
      payload.title,
      payload.body,
      'Admin',
      publishedAt,
      isPublished,
      now,
      now,
    )
    .run();
  if (!res.success) {
    throw new Error(`createArticle: D1 insert failed: ${res.error ?? 'unknown error'}`);
  }
}

export async function getArticleById(
  db: D1Database,
  id: string,
): Promise<ArticleRow | null> {
  const res = await db
    .prepare(
      `SELECT id, mbti_type, slug, title, content, author, published_at, is_published, created_at, updated_at
       FROM articles WHERE id = ? LIMIT 1`,
    )
    .bind(id.toLowerCase())
    .all<ArticleRow>();
  if (!res.success) {
    throw new Error(`getArticleById: D1 query failed: ${res.error ?? 'unknown error'}`);
  }
  return res.results[0] ?? null;
}

export async function updateArticle(
  db: D1Database,
  id: string,
  patch: {
    title?: string;
    body?: string;
    mbtiType?: MBTIType;
    slug?: string;
    status?: 'draft' | 'published';
  },
): Promise<boolean> {
  const existing = await getArticleById(db, id);
  if (!existing) return false;
  const now = new Date().toISOString();
  const title = patch.title ?? existing.title;
  const content = patch.body ?? existing.content;
  const mbtiType = patch.mbtiType ?? existing.mbti_type;
  const slug = patch.slug ?? existing.slug;
  let isPublished = existing.is_published;
  let publishedAt = existing.published_at;
  if (patch.status === 'published') {
    isPublished = 1;
    publishedAt = existing.published_at ?? now;
  } else if (patch.status === 'draft') {
    isPublished = 0;
  }
  const res = await db
    .prepare(
      `UPDATE articles
       SET title = ?, content = ?, mbti_type = ?, slug = ?, is_published = ?, published_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      title,
      content,
      mbtiType,
      slug,
      isPublished,
      publishedAt,
      now,
      id.toLowerCase(),
    )
    .run();
  if (!res.success) {
    throw new Error(`updateArticle: D1 update failed: ${res.error ?? 'unknown error'}`);
  }
  return true;
}

export async function deleteArticle(db: D1Database, id: string): Promise<boolean> {
  const res = await db
    .prepare(`DELETE FROM articles WHERE id = ?`)
    .bind(id.toLowerCase())
    .run();
  if (!res.success) {
    throw new Error(`deleteArticle: D1 delete failed: ${res.error ?? 'unknown error'}`);
  }
  return (res.meta?.changes ?? 0) > 0;
}

// --- Story 7.3: Insight review ------------------------------------

export async function getAllInsights(
  db: D1Database,
): Promise<CuratedInsightRow[]> {
  const res = await db
    .prepare(
      `SELECT id, mbti_type, variant, content, is_active, source, status, created_at, updated_at
       FROM curated_insights ORDER BY mbti_type ASC, created_at ASC, id ASC`,
    )
    .all<CuratedInsightRow>();
  if (!res.success) {
    throw new Error(`getAllInsights: D1 query failed: ${res.error ?? 'unknown error'}`);
  }
  return res.results ?? [];
}

export async function updateInsightStatus(
  db: D1Database,
  id: string,
  status: 'pending' | 'approved' | 'rejected',
): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE curated_insights SET status = ?, updated_at = ? WHERE id = ?`,
    )
    .bind(status, new Date().toISOString(), id.toLowerCase())
    .run();
  if (!res.success) {
    throw new Error(
      `updateInsightStatus: D1 update failed: ${res.error ?? 'unknown error'}`,
    );
  }
  return (res.meta?.changes ?? 0) > 0;
}

export async function updateInsightContent(
  db: D1Database,
  id: string,
  content: string,
): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE curated_insights SET content = ?, updated_at = ? WHERE id = ?`,
    )
    .bind(content, new Date().toISOString(), id.toLowerCase())
    .run();
  if (!res.success) {
    throw new Error(
      `updateInsightContent: D1 update failed: ${res.error ?? 'unknown error'}`,
    );
  }
  return (res.meta?.changes ?? 0) > 0;
}

export async function createCuratedInsight(
  db: D1Database,
  payload: {
    id: string;
    mbtiType: MBTIType;
    content: string;
    variant: string | null;
    source: 'ai' | 'curated';
    status: 'pending' | 'approved' | 'rejected';
  },
): Promise<void> {
  const now = new Date().toISOString();
  const res = await db
    .prepare(
      `INSERT INTO curated_insights (id, mbti_type, variant, content, is_active, source, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`,
    )
    .bind(
      payload.id.toLowerCase(),
      payload.mbtiType,
      payload.variant,
      payload.content,
      payload.source,
      payload.status,
      now,
      now,
    )
    .run();
  if (!res.success) {
    throw new Error(
      `createCuratedInsight: D1 insert failed: ${res.error ?? 'unknown error'}`,
    );
  }
}

// --- Story 7.4: PDPA pipeline + analytics -------------------------

/**
 * Soft-delete all data owned by a user (PDPA / NFR11). Sets deleted_at on
 * test_results, invite_links, perception_votes. Returns affected row count.
 */
export async function softDeleteUserData(
  db: D1Database,
  userId: string,
): Promise<number> {
  const uid = userId.toLowerCase();
  const now = new Date().toISOString();
  const stmts = [
    db
      .prepare(
        `UPDATE test_results SET deleted_at = ? WHERE user_id = ? AND deleted_at IS NULL`,
      )
      .bind(now, uid),
    db
      .prepare(
        `UPDATE invite_links SET deleted_at = ? WHERE inviter_user_id = ? AND deleted_at IS NULL`,
      )
      .bind(now, uid),
    db
      .prepare(
        `UPDATE perception_votes SET deleted_at = ? WHERE inviter_user_id = ? AND deleted_at IS NULL`,
      )
      .bind(now, uid),
    // `reports` holds R2 keys to compatibility reports with the user's PII;
    // the user may be either party. PDPA erasure (NFR11) must cover it even
    // though the Story 7.4 AC enumerated only the first three tables.
    db
      .prepare(
        `UPDATE reports SET deleted_at = ?
         WHERE (inviter_user_id = ? OR invitee_user_id = ?) AND deleted_at IS NULL`,
      )
      .bind(now, uid, uid),
  ];
  const results = await db.batch(stmts);
  let changed = 0;
  for (const r of results) {
    if (!r.success) {
      throw new Error(
        `softDeleteUserData: D1 batch failed: ${r.error ?? 'unknown error'}`,
      );
    }
    changed += r.meta?.changes ?? 0;
  }
  return changed;
}

/**
 * Hard-delete rows soft-deleted more than 30 days ago (PDPA inactivity purge,
 * FR39). PII lives in answers/behavioral_answers JSON — soft delete is
 * insufficient (deferred-work.md:78), so this physically removes the rows.
 */
export async function purgeInactiveUsers(
  db: D1Database,
): Promise<{
  testResults: number;
  inviteLinks: number;
  perceptionVotes: number;
  reports: number;
}> {
  // Trusted module-local constant — SQLite date functions cannot be passed as
  // bound parameters. NEVER interpolate external input here.
  const cutoff = `datetime('now','-30 days')`;
  const stmts = [
    db.prepare(
      `DELETE FROM test_results WHERE deleted_at IS NOT NULL AND deleted_at < ${cutoff}`,
    ),
    db.prepare(
      `DELETE FROM invite_links WHERE deleted_at IS NOT NULL AND deleted_at < ${cutoff}`,
    ),
    db.prepare(
      `DELETE FROM perception_votes WHERE deleted_at IS NOT NULL AND deleted_at < ${cutoff}`,
    ),
    db.prepare(
      `DELETE FROM reports WHERE deleted_at IS NOT NULL AND deleted_at < ${cutoff}`,
    ),
  ];
  const results = await db.batch(stmts);
  for (const r of results) {
    if (!r.success) {
      throw new Error(
        `purgeInactiveUsers: D1 batch failed: ${r.error ?? 'unknown error'}`,
      );
    }
  }
  return {
    testResults: results[0]?.meta?.changes ?? 0,
    inviteLinks: results[1]?.meta?.changes ?? 0,
    perceptionVotes: results[2]?.meta?.changes ?? 0,
    reports: results[3]?.meta?.changes ?? 0,
  };
}

export type AnalyticsSummary = {
  testsByType: Record<string, number>;
  insightSourceMix: { ai: number; curated: number };
  totalTests: number;
  totalShares7d: number;
};

/**
 * Story 7.4 — variant/source comparison (FR44). D1-derived proxy: PostHog
 * query API needs a personal key out of scope for the Worker, so this
 * aggregates from D1 and the result page labels it as a proxy.
 */
export async function getAnalyticsSummary(
  db: D1Database,
): Promise<AnalyticsSummary> {
  const byTypeRes = await db
    .prepare(
      `SELECT calculated_type AS t, COUNT(1) AS n FROM test_results
       WHERE deleted_at IS NULL GROUP BY calculated_type`,
    )
    .all<{ t: string; n: number }>();
  if (!byTypeRes.success) {
    throw new Error(
      `getAnalyticsSummary.byType: D1 query failed: ${byTypeRes.error ?? 'unknown error'}`,
    );
  }
  const testsByType: Record<string, number> = {};
  for (const t of MBTI_TYPES) testsByType[t] = 0;
  let totalTests = 0;
  for (const r of byTypeRes.results ?? []) {
    testsByType[r.t] = r.n;
    totalTests += r.n;
  }
  const srcRes = await db
    .prepare(
      `SELECT source, COUNT(1) AS n FROM curated_insights GROUP BY source`,
    )
    .all<{ source: string; n: number }>();
  if (!srcRes.success) {
    throw new Error(
      `getAnalyticsSummary.src: D1 query failed: ${srcRes.error ?? 'unknown error'}`,
    );
  }
  const insightSourceMix = { ai: 0, curated: 0 };
  for (const r of srcRes.results ?? []) {
    if (r.source === 'ai') insightSourceMix.ai = r.n;
    else if (r.source === 'curated') insightSourceMix.curated = r.n;
  }
  const totalShares7d = await scalar(
    db,
    'getAnalyticsSummary.shares7d',
    `SELECT COUNT(1) AS n FROM invite_links
     WHERE deleted_at IS NULL AND created_at > datetime('now','-7 days')`,
  );
  return { testsByType, insightSourceMix, totalTests, totalShares7d };
}
