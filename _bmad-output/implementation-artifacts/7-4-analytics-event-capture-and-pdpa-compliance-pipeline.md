# Story 7.4: Analytics Event Capture & PDPA Compliance Pipeline

Status: done

> Code review (adversarial subagent pass): no auth bypass / SQL injection / migration regression. One real PDPA gap found & fixed — `reports` table (R2 keys to compatibility reports w/ both users' PII) was excluded from soft-delete & purge; now covered in `softDeleteUserData` (inviter OR invitee) and `purgeInactiveUsers`. Added maintainer guardrail comment on the admin route guard list.

## Story
As an administrator and as a user who wants to delete my data, I want the platform to capture required analytics events and process data deletion within 30 days, so that product decisions are data-driven and user privacy rights are respected (NFR11, NFR20).

## ACs
1. On `POST /api/tests/submit`, PostHog captures `test_completed` server-side with `{ resultType, questionCount: 12, declaredType }`. Event name `snake_case`, props `camelCase`.
2. On share, client captures `result_shared` with `{ shareChannel: 'instagram'|'zalo'|'copy_link'|'download', resultId }`.
3. `GET /api/admin/analytics` (admin token) returns variant/source comparison data (share rate by result-card variant and insight source `ai` vs `curated`); `/admin/analytics` page renders it (FR44).
4. `DELETE /api/privacy/delete-me` (with `X-Session-Token`) → `softDeleteUserData(db, userId)` sets `deleted_at = datetime('now')` on `test_results`, `invite_links`, `perception_votes` for that user (prepared stmt); `deleteSession(kv, token)` clears KV session; returns `{ data: { deleted: true }, error: null }` within the request (≪ 30-day NFR11).
5. `POST /api/privacy/purge` (admin token, invoked by Cloudflare Cron Trigger) → `purgeInactiveUsers(db)` hard-deletes rows where `deleted_at IS NOT NULL AND deleted_at < datetime('now','-30 days')` (FR39).

## Tasks
- Server PostHog: `apps/api/src/lib/analytics.ts` — fetch-based ingest to `${POSTHOG_HOST}/capture/` (no `posthog-node` dep; Workers-safe). No-op if `POSTHOG_API_KEY` unset (mirror client `safeCapture` resilience). Use `c.executionCtx.waitUntil()` so analytics never blocks the response.
- Bindings: add optional `POSTHOG_API_KEY?`, `POSTHOG_HOST?` to `apps/api/src/types/bindings.ts`; document in `.dev.vars.example`.
- Wire `test_completed` into `routes/tests.ts` submit handler (after `createTestResult`).
- Client: ensure `result_shared` `safeCapture` fires in the share path (`apps/web/src/lib/share.ts` / result share button) with correct props.
- DB helpers in `lib/db.ts`: `softDeleteUserData(db, userId)`, `purgeInactiveUsers(db)`, `getAnalyticsSummary(db)` (variant/source aggregates from D1 — derive from `test_results`/`curated_insights` joins as a D1-side proxy when PostHog query API not wired).
- `apps/api/src/routes/privacy.ts`: `DELETE /delete-me` (`requireSession`), `POST /purge` (`requireAdmin`). Mount at `/api/privacy`.
- `GET /api/admin/analytics` in `routes/admin.ts` (`requireAdmin`).
- Cron Trigger: add `[triggers] crons = ["0 3 * * *"]` to `apps/api/wrangler.toml`; add `scheduled(event, env, ctx)` export in `apps/api/src/index.ts` calling `purgeInactiveUsers`.
- Web `features/admin/AnalyticsPanel.tsx`; add `/admin/analytics` route. Add a user-facing "Delete my data" affordance (minimal — can live on result page or a `/privacy` route) calling `DELETE /api/privacy/delete-me`.
- Tests: soft delete sets `deleted_at` on all 3 tables + clears session; purge only removes >30d soft-deleted; analytics handler shape; PostHog helper no-ops without key.

## Dev Notes
- **PostHog server-side**: `deferred-work.md:40` notes server-side capture needs `posthog-node` or fetch-based ingest. Use plain `fetch` POST to PostHog `/capture/` endpoint with `{ api_key, event, properties, distinct_id, timestamp }`. Must be wrapped so a failure NEVER throws into the request path — use `try/catch` + `ctx.waitUntil`. Without credentials it must be a silent no-op (do not block deploy on PostHog creds).
- **Hono `scheduled` handler**: a Hono app default export does not by itself handle Cron. Export an object `{ fetch: app.fetch, scheduled }` from `apps/api/src/index.ts` (or use `app` + a separate `scheduled`). Verify Worker still serves HTTP after the change (regression risk — current export is `export default app`).
- Soft delete: partial indexes `idx_*_alive WHERE deleted_at IS NULL` already exist (`migrations/0004`). `softDeleteUserData` updates 3 tables; `test_results.user_id`, `invite_links.inviter_user_id`, `perception_votes.inviter_user_id` are the user keys (lower-case the userId arg). Use a batched `db.batch([...])` of prepared statements.
- `purgeInactiveUsers` hard-deletes (PII in `answers`/`behavioral_answers` JSON — `deferred-work.md:78`). Filter `deleted_at IS NOT NULL AND deleted_at < datetime('now','-30 days')`.
- `deleteSession` already exists in `lib/kv.ts` — reuse.
- Analytics admin endpoint: PostHog query API requires a personal API key not in scope; provide a **D1-derived proxy** (e.g., counts of `test_results` by `calculated_type`, insight `source` distribution) and label it as such, so the page is functional without external dependency. FR44 satisfied at MVP level.
- Follow `{ data, error }` envelope + `lib/db.ts` rules. Reuse `requireSession`/`requireAdmin`.

### References
- `_bmad-output/planning-artifacts/epics.md:983-1006` (Story 7.4 ACs)
- `apps/api/src/routes/tests.ts:65-95` (submit), `apps/api/src/lib/kv.ts` (`deleteSession`), `apps/api/src/lib/db.ts:1-44`
- `apps/web/src/lib/posthog.ts` (`safeCapture`), `apps/web/src/lib/share.ts`
- `migrations/0004_pdpa_soft_delete.sql` (deleted_at + alive indexes)
- `_bmad-output/implementation-artifacts/deferred-work.md:40,78,86,88,94,103` (PostHog + PDPA notes)
- Story 7.1 (admin auth) — dependency

## Dev Agent Record
### Agent Model Used
claude-opus-4-7[1m]

### Completion Notes
- `lib/analytics.ts` `captureServer` — fetch-based PostHog ingest, silent no-op without `POSTHOG_API_KEY`, never throws. `test_completed` wired into submit handler; guarded `executionCtx.waitUntil` with fire-and-forget fallback (unit tests have no Worker ctx — regression found & fixed).
- Client `result_shared` capture added in `PersonaReveal` share handler (channel = resolved delivery: share_sheet/download/copy_link + resultId).
- `softDeleteUserData` (batched UPDATE on 3 tables) + `purgeInactiveUsers` (hard-delete >30d). `routes/privacy.ts`: `DELETE /delete-me` (requireSession + KV session clear), `POST /purge` (requireAdmin).
- Cron: `[triggers] crons=["0 3 * * *"]` in wrangler.toml + `scheduled()` export. **Default export changed** `app` → `{ fetch, scheduled }`; `app` now a named export, 11 test imports updated (regression contained, all green).
- `getAnalyticsSummary` D1-derived proxy (labeled) for `GET /api/admin/analytics`; web `AnalyticsPanel` at `/admin/analytics`. User `/privacy` page for self-service erasure.
- Bonus: fixed pre-existing `PaymentRow.gateway` type (`payos`→`sepay`, Story 5.4 drift) unblocking monorepo typecheck.

### File List
**Created:** `apps/api/src/lib/analytics.ts`, `apps/api/src/routes/privacy.ts`, `apps/web/src/features/admin/components/AnalyticsPanel.tsx`, `apps/web/src/features/privacy/PrivacyDelete.tsx`, `apps/api/tests/routes/privacy.test.ts`
**Modified:** `apps/api/src/routes/tests.ts`, `apps/api/src/index.ts`, `apps/api/src/lib/db.ts`, `apps/api/src/types/bindings.ts`, `apps/api/wrangler.toml`, `apps/web/src/features/result/components/PersonaReveal.tsx`, `apps/web/src/router.tsx`, `packages/shared/src/db/rows.ts`, 11 `apps/api/tests/**` import lines
