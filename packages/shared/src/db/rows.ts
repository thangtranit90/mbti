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
