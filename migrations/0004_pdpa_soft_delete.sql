-- Story 1.5 / Migration 0004_pdpa_soft_delete
-- Purpose: Add deleted_at TEXT to all user-data tables for PDPA soft-delete (FR38);
--   add retention_flag INTEGER to test_results only (matches TestResultRow contract).
--   Add partial indexes on deleted_at IS NULL for the live-only queries used by
--   the Story 7.4 PDPA purge job.
-- Satisfies: AC-3, AC-8, AC-12 of Story 1.5
-- Aligns with: packages/shared/src/db/rows.ts deleted_at fields (Story 1.4) and
--   TestResultRow.retention_flag (Story 1.4)
-- Note: invite_links and perception_votes do NOT receive retention_flag because
--   their row interfaces do not declare it. If product/compliance later requires
--   it on those tables, that's a new migration plus a Story 1.4 row-interface
--   amendment.
-- Applied by: TODO

ALTER TABLE test_results     ADD COLUMN deleted_at      TEXT    DEFAULT NULL;
ALTER TABLE test_results     ADD COLUMN retention_flag  INTEGER DEFAULT 0
  CHECK (retention_flag IN (0,1) OR retention_flag IS NULL);
ALTER TABLE invite_links     ADD COLUMN deleted_at      TEXT    DEFAULT NULL;
ALTER TABLE perception_votes ADD COLUMN deleted_at      TEXT    DEFAULT NULL;

CREATE INDEX idx_test_results_alive
  ON test_results(deleted_at)     WHERE deleted_at IS NULL;
CREATE INDEX idx_invite_links_alive
  ON invite_links(deleted_at)     WHERE deleted_at IS NULL;
CREATE INDEX idx_perception_votes_alive
  ON perception_votes(deleted_at) WHERE deleted_at IS NULL;
