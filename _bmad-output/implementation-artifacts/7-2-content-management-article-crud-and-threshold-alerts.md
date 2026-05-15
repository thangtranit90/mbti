# Story 7.2: Content Management — Article CRUD & Threshold Alerts

Status: done

## Story
As an administrator, I want to create, edit, publish, and manage articles assigned to specific MBTI types, with alerts when any type falls below the minimum threshold, so that the content feed always has adequate content for all 16 types.

## ACs
1. `GET /api/admin/articles` (admin token) returns all articles (published + unpublished). `ArticleEditor` list shows title, type tag, publish status, edit/delete actions; types with `< 3` articles get an amber warning badge (FR35).
2. `POST /api/admin/articles` (admin token) with `{ title, body, mbtiType, slug, status }` → `createArticle(db, ...)` in `lib/db.ts`; published article is returned by `GET /api/content/feed/:mbtiType` on next request (no redeploy).
3. `PATCH /api/admin/articles/:id` (admin token) → `updateArticle(db, id, { title, body, mbtiType, slug, status })`; updated content appears in public feed next fetch.
4. `DELETE /api/admin/articles/:id` (admin token) → soft path acceptable: hard delete row (articles hold no PII) via `deleteArticle(db, id)`.
5. `GET /api/admin/metrics` response includes `articleCountPerType`: object mapping all 16 type codes → current article count, powering `ThresholdAlerts.tsx`.

## Tasks
- DB helpers in `lib/db.ts`: `getAllArticles(db)`, `createArticle(db, payload)`, `updateArticle(db, id, patch)`, `deleteArticle(db, id)`, `getArticleCountPerType(db)`. Prepared statements only; UUID id lower-cased.
- Extend `getAdminMetrics` (from 7.1) or compose `articleCountPerType` into the `/api/admin/metrics` response.
- Routes in `apps/api/src/routes/admin.ts`: `GET/POST /articles`, `PATCH/DELETE /articles/:id` — all behind `requireAdmin`.
- Zod schema for article create/update in `packages/shared/src/schemas/` (reuse `MBTITypeSchema`).
- Web `apps/web/src/features/admin/`: `ArticleEditor.tsx` (list + form), `ThresholdAlerts.tsx`. Add `/admin/content` route.
- Tests: CRUD happy path, threshold count correctness, admin guard enforced.

## Dev Notes
- **Column mapping**: epic says `body` but the `articles` D1 column is `content` (see `migrations/0001_initial_schema.sql` articles table + `ArticleRow` in `packages/shared/src/db/rows.ts`). Map `body` → `content` in the DB helper. `slug` is `UNIQUE` — handle insert conflict gracefully (return `CONFLICT` error envelope).
- Publish semantics: `articles.is_published` is `0|1`; CHECK constraint `is_published = 0 OR published_at IS NOT NULL`. When `status: 'published'`, set `is_published = 1` AND `published_at = datetime('now')`. When unpublishing, set `is_published = 0` (published_at may stay).
- Public feed (`getArticlesByType`, `routes/content.ts`) already filters `is_published = 1` — no change needed there; verify new published articles appear.
- Threshold = 3 (FR35 / epic AC). Amber badge styling consistent with existing Tailwind tokens.
- Follow `lib/db.ts` header rules (typed helpers, prepared statements, no interpolation). Mirror `createTestResult`/`getArticlesByType` patterns.
- Reuse the admin API client + `requireAdmin` middleware from Story 7.1. Do not duplicate auth.

### References
- `_bmad-output/planning-artifacts/epics.md:935-957` (Story 7.2 ACs)
- `migrations/0001_initial_schema.sql` (articles table), `packages/shared/src/db/rows.ts` (`ArticleRow`)
- `apps/api/src/lib/db.ts:475-512` (`getArticlesByType`, `getArticleBySlug`), `apps/api/src/routes/content.ts`
- Story 7.1 (admin auth/middleware/metrics) — dependency

## Dev Agent Record
### Agent Model Used
claude-opus-4-7[1m]

### Completion Notes
- `body`→`content` column mapping in `createArticle`/`updateArticle`. `status:'published'` sets `is_published=1` + `published_at` (satisfies CHECK). Slug UNIQUE conflict → 409 CONFLICT envelope.
- `getAllArticles`, `getArticleCountPerType` (all 16 types zero-filled). `articleCountPerType` folded into `getAdminMetrics` response.
- `deleteArticle` hard-deletes (articles hold no PII).
- Web `ArticleEditor` (list + create/edit form + delete, amber badge for types `<3`), `ThresholdAlerts` surfaced on dashboard. Route `/admin/content`.
- Public feed unchanged (`getArticlesByType` still filters `is_published=1`) — verified by existing content tests still green.

### File List
**Modified:** `apps/api/src/lib/db.ts` (+getAllArticles/createArticle/updateArticle/deleteArticle/getArticleById/getArticleCountPerType), `apps/api/src/routes/admin.ts`, `packages/shared/src/schemas/admin.ts`, `apps/web/src/router.tsx`, `apps/web/src/features/admin/components/AdminDashboard.tsx`
**Created:** `apps/web/src/features/admin/components/ArticleEditor.tsx`; tests in `apps/api/tests/routes/admin.test.ts`
