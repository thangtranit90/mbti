// D1 row shapes — keep aligned with /migrations/*.sql (Story 1.5+).
// Booleans are stored as 0|1 integers; dates are stored as ISO 8601 TEXT.
// MBTI fields are narrowed to the MBTIType union so consumers can rely on a
// single source of truth — corrupted/legacy rows ('intj', 'XXXX') would have
// to be handled before they reach this layer (Story 1.5+ db helpers run a
// row→domain validator at fetch time).

import type { MBTIType } from '../constants';

export interface TestResultRow {
  id: string;
  user_id: string;
  declared_type: MBTIType | null;
  // NOTE Story 1.5: API response field is `mbtiType` (per architecture's
  // snake→camel transform example). The Hono route handler must explicitly
  // map `calculated_type` → `mbtiType` in the response builder; it is NOT a
  // mechanical snake_case→camelCase transform. Document this in `lib/db.ts`.
  calculated_type: MBTIType;
  answers: string;
  // NOTE Story 1.5 migration: column MUST be `NOT NULL`. The response schema
  // (`TestResultSchema.personaName`) is non-nullable and route handlers will
  // populate this at insert time.
  persona_name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  retention_flag: 0 | 1 | null;
  // Story 4.2 — populated when this test_result row was seeded from an invite
  // flow (invitee taking the test after voting on the inviter).
  invite_source_token: string | null;
}

export interface InviteLinkRow {
  id: string;
  token: string;
  inviter_user_id: string;
  inviter_result_id: string;
  expired_at: string;
  created_at: string;
  deleted_at: string | null;
}

export interface PerceptionVoteRow {
  id: string;
  invite_token: string;
  inviter_user_id: string;
  voter_session_id: string | null;
  behavioral_answers: string;
  created_at: string;
  deleted_at: string | null;
}

export interface CuratedInsightRow {
  id: string;
  mbti_type: MBTIType;
  variant: string | null;
  content: string;
  is_active: 0 | 1;
  // Story 7.3 — admin review pipeline (migration 0011). Existing rows backfill
  // to source='curated', status='approved' so Epic 3 serving is unaffected.
  source: 'ai' | 'curated';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface ArticleRow {
  id: string;
  mbti_type: MBTIType;
  slug: string;
  title: string;
  content: string;
  author: string | null;
  published_at: string | null;
  is_published: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface ReportRow {
  id: string;
  inviter_user_id: string;
  invitee_user_id: string;
  inviter_result_id: string;
  invitee_result_id: string;
  r2_key: string;
  created_at: string;
  deleted_at: string | null;
}

export interface PaymentRow {
  id: string;
  user_id: string;
  result_id: string | null;
  product_type: 'couple_pack' | 'gap_report';
  // Story 5.4 — PayOS replaced by SePay (migration 0010 CHECK IN ('sepay','stripe')).
  gateway: 'sepay' | 'stripe';
  provider_ref: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
}

export interface QuestionRow {
  id: string;
  text: string;
  dimension: 'E_I' | 'S_N' | 'T_F' | 'J_P';
  answer_options: string; // JSON string — parse with JSON.parse before use
  discrimination: number;
  difficulty: number;
  is_active: 0 | 1;
  created_at: string;
}
