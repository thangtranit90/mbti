-- Story 4.2 / Migration 0007_test_results_invite_source
-- Purpose: Track which invite link (if any) seeded the invitee's test result,
--   so the social graph can later join inviter ↔ invitee for Story 4.3 gap
--   visualization and Story 5.2 compatibility report.
-- Satisfies: AC-5 of Story 4.2

ALTER TABLE test_results
  ADD COLUMN invite_source_token TEXT DEFAULT NULL;

-- Partial index for Story 4.3 social_status look-ups (only invitee-sourced
-- results need the lookup; rows where the column is NULL are unaffected).
CREATE INDEX idx_test_results_invite_source
  ON test_results(invite_source_token) WHERE invite_source_token IS NOT NULL;
