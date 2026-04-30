-- Story 1.5 / Migration 0003_articles_seed
-- Purpose: Seed articles with one PLACEHOLDER published row per MBTI type so
--   content feed (Story 6.1) and admin dashboard (Story 7.2) have data to read
--   in dev and on first deploy.
-- Satisfies: AC-7, AC-12 of Story 1.5
-- Aligns with: packages/shared/src/db/rows.ts ArticleRow
-- TODO Story 6.1 / Story 7.2: replace PLACEHOLDER articles with real curated content.
-- Applied by: TODO

INSERT INTO articles
  (id, mbti_type, slug, title, content, author, published_at, is_published, created_at, updated_at)
VALUES
  ('placeholder-article-INTJ-v1','INTJ','mbti-intj-overview-v1','Overview: INTJ','PLACEHOLDER article body for INTJ — TODO Story 6.1 / Story 7.2.',NULL,'2026-04-30T00:00:00.000Z',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-article-INTP-v1','INTP','mbti-intp-overview-v1','Overview: INTP','PLACEHOLDER article body for INTP — TODO Story 6.1 / Story 7.2.',NULL,'2026-04-30T00:00:00.000Z',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-article-ENTJ-v1','ENTJ','mbti-entj-overview-v1','Overview: ENTJ','PLACEHOLDER article body for ENTJ — TODO Story 6.1 / Story 7.2.',NULL,'2026-04-30T00:00:00.000Z',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-article-ENTP-v1','ENTP','mbti-entp-overview-v1','Overview: ENTP','PLACEHOLDER article body for ENTP — TODO Story 6.1 / Story 7.2.',NULL,'2026-04-30T00:00:00.000Z',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-article-INFJ-v1','INFJ','mbti-infj-overview-v1','Overview: INFJ','PLACEHOLDER article body for INFJ — TODO Story 6.1 / Story 7.2.',NULL,'2026-04-30T00:00:00.000Z',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-article-INFP-v1','INFP','mbti-infp-overview-v1','Overview: INFP','PLACEHOLDER article body for INFP — TODO Story 6.1 / Story 7.2.',NULL,'2026-04-30T00:00:00.000Z',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-article-ENFJ-v1','ENFJ','mbti-enfj-overview-v1','Overview: ENFJ','PLACEHOLDER article body for ENFJ — TODO Story 6.1 / Story 7.2.',NULL,'2026-04-30T00:00:00.000Z',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-article-ENFP-v1','ENFP','mbti-enfp-overview-v1','Overview: ENFP','PLACEHOLDER article body for ENFP — TODO Story 6.1 / Story 7.2.',NULL,'2026-04-30T00:00:00.000Z',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-article-ISTJ-v1','ISTJ','mbti-istj-overview-v1','Overview: ISTJ','PLACEHOLDER article body for ISTJ — TODO Story 6.1 / Story 7.2.',NULL,'2026-04-30T00:00:00.000Z',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-article-ISFJ-v1','ISFJ','mbti-isfj-overview-v1','Overview: ISFJ','PLACEHOLDER article body for ISFJ — TODO Story 6.1 / Story 7.2.',NULL,'2026-04-30T00:00:00.000Z',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-article-ESTJ-v1','ESTJ','mbti-estj-overview-v1','Overview: ESTJ','PLACEHOLDER article body for ESTJ — TODO Story 6.1 / Story 7.2.',NULL,'2026-04-30T00:00:00.000Z',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-article-ESFJ-v1','ESFJ','mbti-esfj-overview-v1','Overview: ESFJ','PLACEHOLDER article body for ESFJ — TODO Story 6.1 / Story 7.2.',NULL,'2026-04-30T00:00:00.000Z',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-article-ISTP-v1','ISTP','mbti-istp-overview-v1','Overview: ISTP','PLACEHOLDER article body for ISTP — TODO Story 6.1 / Story 7.2.',NULL,'2026-04-30T00:00:00.000Z',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-article-ISFP-v1','ISFP','mbti-isfp-overview-v1','Overview: ISFP','PLACEHOLDER article body for ISFP — TODO Story 6.1 / Story 7.2.',NULL,'2026-04-30T00:00:00.000Z',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-article-ESTP-v1','ESTP','mbti-estp-overview-v1','Overview: ESTP','PLACEHOLDER article body for ESTP — TODO Story 6.1 / Story 7.2.',NULL,'2026-04-30T00:00:00.000Z',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-article-ESFP-v1','ESFP','mbti-esfp-overview-v1','Overview: ESFP','PLACEHOLDER article body for ESFP — TODO Story 6.1 / Story 7.2.',NULL,'2026-04-30T00:00:00.000Z',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z');
