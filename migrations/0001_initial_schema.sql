-- Story 1.5 / Migration 0001_initial_schema
-- Purpose: Create the 5 tables that satisfy AC-1 (test_results, invite_links,
--   perception_votes, curated_insights, articles) plus their indexes.
-- Satisfies: AC-1, AC-8, AC-12 of Story 1.5
-- Aligns with: packages/shared/src/db/rows.ts (TestResultRow, InviteLinkRow,
--   PerceptionVoteRow, CuratedInsightRow, ArticleRow as of Story 1.4)
-- Applied by: TODO

PRAGMA foreign_keys = ON;

----------------------------------------------------------------------
-- test_results
----------------------------------------------------------------------
CREATE TABLE test_results (
  id              TEXT PRIMARY KEY NOT NULL,
  user_id         TEXT NOT NULL,
  declared_type   TEXT NULL CHECK (
    declared_type IN (
      'INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP',
      'ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'
    )
    OR declared_type IS NULL
  ),
  calculated_type TEXT NOT NULL CHECK (
    calculated_type IN (
      'INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP',
      'ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'
    )
  ),
  answers         TEXT NOT NULL,
  persona_name    TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX idx_test_results_user_id ON test_results(user_id);

----------------------------------------------------------------------
-- invite_links
----------------------------------------------------------------------
CREATE TABLE invite_links (
  id                 TEXT PRIMARY KEY NOT NULL,
  token              TEXT NOT NULL UNIQUE,
  inviter_user_id    TEXT NOT NULL,
  inviter_result_id  TEXT NOT NULL,
  expired_at         TEXT NOT NULL,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (expired_at > created_at)
);

CREATE INDEX idx_invite_links_inviter_user_id ON invite_links(inviter_user_id);

----------------------------------------------------------------------
-- perception_votes
----------------------------------------------------------------------
CREATE TABLE perception_votes (
  id                  TEXT PRIMARY KEY NOT NULL,
  invite_token        TEXT NOT NULL REFERENCES invite_links(token),
  inviter_user_id     TEXT NOT NULL,
  voter_session_id    TEXT NULL,
  behavioral_answers  TEXT NOT NULL,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX idx_perception_votes_invite_token ON perception_votes(invite_token);

----------------------------------------------------------------------
-- curated_insights
----------------------------------------------------------------------
CREATE TABLE curated_insights (
  id          TEXT PRIMARY KEY NOT NULL,
  mbti_type   TEXT NOT NULL CHECK (
    mbti_type IN (
      'INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP',
      'ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'
    )
  ),
  variant     TEXT NULL,
  content     TEXT NOT NULL,
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX idx_curated_insights_mbti_type_active
  ON curated_insights(mbti_type, is_active);

----------------------------------------------------------------------
-- articles
----------------------------------------------------------------------
CREATE TABLE articles (
  id            TEXT PRIMARY KEY NOT NULL,
  mbti_type     TEXT NOT NULL CHECK (
    mbti_type IN (
      'INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP',
      'ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'
    )
  ),
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  author        TEXT NULL,
  published_at  TEXT NULL,
  is_published  INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0,1)),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX idx_articles_mbti_type_published
  ON articles(mbti_type, is_published);
CREATE UNIQUE INDEX idx_articles_slug ON articles(slug);
