-- Story 7.3 / Migration 0011_curated_insights_review
-- Purpose: Add admin review pipeline columns to curated_insights.
--   - source: provenance of the insight ('ai' generated vs 'curated' by hand)
--   - status: review gate ('pending' | 'approved' | 'rejected')
-- Regression guard: ALL pre-existing rows (Epic 3 seeds in 0002/0006) MUST keep
--   serving on the result page. The serving helpers (getCuratedInsight /
--   getActiveCuratedInsights) now filter `status = 'approved'`, so the column
--   DEFAULT backfills every existing row to 'approved' / 'curated'. New AI
--   inserts use source='ai', status='pending' until an admin approves them.
-- Aligns with: packages/shared/src/db/rows.ts CuratedInsightRow (Story 7.3)

ALTER TABLE curated_insights
  ADD COLUMN source TEXT NOT NULL DEFAULT 'curated'
  CHECK (source IN ('ai','curated'));

ALTER TABLE curated_insights
  ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'
  CHECK (status IN ('pending','approved','rejected'));

CREATE INDEX idx_curated_insights_serving
  ON curated_insights(mbti_type, is_active, status);
