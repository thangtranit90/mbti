# Story 7.3: AI Insight Review & Approval

Status: done

## Story
As an administrator, I want to review AI-generated insight variants and curated insights before they are served to users, so that no low-quality or inaccurate insight reaches the "uncomfortably accurate" delight moment.

## ACs
1. `GET /api/admin/insights` (admin token) returns all `curated_insights` rows grouped by `mbti_type`, each with `content`, `source` (`ai` | `curated`), `status` (`pending` | `approved` | `rejected`).
2. `PATCH /api/admin/insights/:id` with `{ status: 'approved' }` → `updateInsightStatus(db, id, 'approved')`; insight becomes eligible for `getCuratedInsight` (which now filters `status = 'approved'`).
3. `PATCH /api/admin/insights/:id` with `{ status: 'rejected' }` → marked rejected, excluded from serving pool; next approved insight for that type serves instead.
4. `PATCH /api/admin/insights/:id` with `{ content: '...' }` → `updateInsightContent(db, id, content)` (prepared statement, no interpolation). Admin may also create new curated insights via `POST /api/admin/insights`.

## Tasks
- Migration `migrations/0011_curated_insights_review.sql`: add `source TEXT NOT NULL DEFAULT 'curated' CHECK (source IN ('ai','curated'))` and `status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected'))` to `curated_insights`. **Existing seed rows default to `approved`** so current serving behavior is preserved (no regression to Epic 3 result page).
- Update `CuratedInsightRow` in `packages/shared/src/db/rows.ts`: add `source`, `status`.
- `lib/db.ts`: `getAllInsightsGrouped(db)`, `updateInsightStatus(db,id,status)`, `updateInsightContent(db,id,content)`, `createCuratedInsight(db,payload)`. Update `getCuratedInsight` + `getActiveCuratedInsights` SELECTs to add `AND status = 'approved'` and include new columns.
- Routes in `routes/admin.ts`: `GET /insights`, `POST /insights`, `PATCH /insights/:id` — `requireAdmin`.
- Zod schema for the PATCH body (`status` enum OR `content` string — at least one).
- Web `features/admin/InsightReview.tsx`; add `/admin/insights` route. Group by type, approve/reject buttons, inline content edit.
- Tests: status filter on serving path; approve makes servable; reject excludes; content edit persists.

## Dev Notes
- **Schema gap**: `curated_insights` today has only `variant, content, is_active` (`migrations/0001` + `0002`/`0006` seeds). `source`/`status` do not exist — migration 0011 adds them. **Critical regression guard**: Epic 3 result page serves via `getCuratedInsight`/`getActiveCuratedInsights` filtering `is_active = 1`. After adding `status`, these MUST also filter `status = 'approved'`; the migration MUST backfill all existing rows to `status='approved'` (via column DEFAULT) so the Epic 3 reveal experience does not break. Verify `apps/api/src/routes/insights.ts` still returns content for all 16 types post-migration.
- The AI fallback path (`lib/ai.ts` / `generateInsight`) reads `getActiveCuratedInsights` for variants — keep that working. AI-generated insights persisted for review should be inserted with `source='ai', status='pending'` (if/where the AI path writes back; if it does not currently persist, only the admin-create path sets `source='ai'`).
- `getCuratedInsight` ordering note (`deferred-work.md:96`): seed rows share timestamps → add `id ASC` tiebreaker when adding the status filter for determinism.
- D1 helper rules from `lib/db.ts` header: typed helpers, prepared statements, `.bind()`, no string interpolation, UUID args lower-cased.
- Reuse admin auth/client from 7.1.

### References
- `_bmad-output/planning-artifacts/epics.md:959-981` (Story 7.3 ACs)
- `apps/api/src/lib/db.ts:46-91` (`getActiveCuratedInsights`, `getCuratedInsight`), `apps/api/src/routes/insights.ts`
- `migrations/0001_initial_schema.sql` (curated_insights), `migrations/0002`/`0006` seeds, `packages/shared/src/db/rows.ts` (`CuratedInsightRow`)
- `_bmad-output/implementation-artifacts/deferred-work.md:96` (ordering tiebreaker)
- Story 7.1 (admin auth) — dependency

## Dev Agent Record
### Agent Model Used
claude-opus-4-7[1m]

### Completion Notes
- Migration `0011_curated_insights_review.sql`: `source` (DEFAULT 'curated') + `status` (DEFAULT 'approved') + serving index. **Regression guard verified**: existing Epic 3 insight tests (`insights.test.ts`, `insights-generate.test.ts`, `ai.test.ts`) updated with `source/status` fixtures and still green — result page keeps serving.
- `getCuratedInsight`/`getActiveCuratedInsights` now filter `status='approved'` with `created_at, id` tiebreaker (deferred-work.md:96).
- `getAllInsights` (grouped by type in route), `updateInsightStatus`, `updateInsightContent`, `createCuratedInsight`. PATCH accepts `status` and/or `content` (Zod refine).
- `CuratedInsightRow` extended in shared. Web `InsightReview` (`/admin/insights`): grouped, approve/reject, inline content edit.

### File List
**Created:** `migrations/0011_curated_insights_review.sql`, `apps/web/src/features/admin/components/InsightReview.tsx`
**Modified:** `packages/shared/src/db/rows.ts`, `apps/api/src/lib/db.ts`, `apps/api/src/routes/admin.ts`, `packages/shared/src/schemas/admin.ts`, `apps/web/src/router.tsx`, insight test fixtures (`tests/routes/insights*.test.ts`, `src/tests/lib/ai.test.ts`)
