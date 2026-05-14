-- Story 5.2 / Migration 0009_reports
-- Purpose: Track generated compatibility reports stored in R2.

CREATE TABLE reports (
  id                TEXT PRIMARY KEY NOT NULL,
  inviter_user_id   TEXT NOT NULL,
  invitee_user_id   TEXT NOT NULL,
  inviter_result_id TEXT NOT NULL,
  invitee_result_id TEXT NOT NULL,
  r2_key            TEXT NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at        TEXT NULL
);

CREATE INDEX idx_reports_inviter ON reports(inviter_user_id);
CREATE INDEX idx_reports_invitee ON reports(invitee_user_id);
