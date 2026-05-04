-- Story 1.5 / Migration 0002_curated_insights_seed
-- Purpose: Seed curated_insights with one PLACEHOLDER row per MBTI type so
--   AI fallback (Story 3.2) and analytics (Story 3.1) have data to read.
-- Satisfies: AC-2, AC-12 of Story 1.5
-- Aligns with: packages/shared/src/db/rows.ts CuratedInsightRow
-- TODO Story 3.1: replace PLACEHOLDER content with curated copy.
-- Applied by: TODO

INSERT OR IGNORE INTO curated_insights
  (id, mbti_type, variant, content, is_active, created_at, updated_at)
VALUES
  ('placeholder-insight-INTJ-v1','INTJ','v1','PLACEHOLDER curated insight for INTJ — TODO Story 3.1.',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-insight-INTP-v1','INTP','v1','PLACEHOLDER curated insight for INTP — TODO Story 3.1.',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-insight-ENTJ-v1','ENTJ','v1','PLACEHOLDER curated insight for ENTJ — TODO Story 3.1.',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-insight-ENTP-v1','ENTP','v1','PLACEHOLDER curated insight for ENTP — TODO Story 3.1.',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-insight-INFJ-v1','INFJ','v1','PLACEHOLDER curated insight for INFJ — TODO Story 3.1.',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-insight-INFP-v1','INFP','v1','PLACEHOLDER curated insight for INFP — TODO Story 3.1.',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-insight-ENFJ-v1','ENFJ','v1','PLACEHOLDER curated insight for ENFJ — TODO Story 3.1.',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-insight-ENFP-v1','ENFP','v1','PLACEHOLDER curated insight for ENFP — TODO Story 3.1.',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-insight-ISTJ-v1','ISTJ','v1','PLACEHOLDER curated insight for ISTJ — TODO Story 3.1.',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-insight-ISFJ-v1','ISFJ','v1','PLACEHOLDER curated insight for ISFJ — TODO Story 3.1.',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-insight-ESTJ-v1','ESTJ','v1','PLACEHOLDER curated insight for ESTJ — TODO Story 3.1.',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-insight-ESFJ-v1','ESFJ','v1','PLACEHOLDER curated insight for ESFJ — TODO Story 3.1.',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-insight-ISTP-v1','ISTP','v1','PLACEHOLDER curated insight for ISTP — TODO Story 3.1.',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-insight-ISFP-v1','ISFP','v1','PLACEHOLDER curated insight for ISFP — TODO Story 3.1.',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-insight-ESTP-v1','ESTP','v1','PLACEHOLDER curated insight for ESTP — TODO Story 3.1.',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-insight-ESFP-v1','ESFP','v1','PLACEHOLDER curated insight for ESFP — TODO Story 3.1.',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z');
