# Deferred Work

## Deferred from: code review of 2-5-test-submission-mbti-type-calculation-and-shareable-result-url (2026-05-05)

- `answer_options` JSON.parse unchecked in `/next-question` handler (`apps/api/src/routes/tests.ts`) — SyntaxError would propagate as unhandled 500; pre-existing from Story 2.4 scope.
- `total: 12` hardcoded magic number in `/next-question` response — returns 12 unconditionally regardless of active question count; pre-existing from Story 2.4.
- `calculateMBTIType` silently defaults dimensions with 0 matching answers to first pole (`apps/api/src/lib/cat.ts`) — happens when a submitted `questionId` has no match in live `allQuestions`; pre-existing design gap in cat.ts.
- `TestSubmitSchema` min(1) allows 1–11 answers — server-side enforcement of exactly 12 is defense-in-depth; CAT client flow prevents this in normal usage; out of scope for this story.
- Local `ResultApiResponse` type in `ResultPage.tsx` — no shared envelope schema for the GET result endpoint exists in `@mbti/shared`; create `TestResultApiResponse` envelope type when shared schema coverage is standardized.
- `PersonaReveal` dynamic Tailwind class fails silently for a corrupted `mbtiType` DB value — data flows through TypeScript-typed API boundary; robustness hardening (Zod parse of API response in `ResultPage`) belongs to a future API-response validation pass.
- Zustand persist hydration race on `TestSubmit` mount — `useEffect([])` fires before rehydration if an async storage adapter is used; current `localStorage` adapter is synchronous so this is theoretical; revisit if storage adapter changes.

## Deferred from: code review of 2-3-reverse-mechanic-declare-expected-mbti-type (2026-05-05)

- Tailwind comment safelist in `apps/web/src/features/test/components/TypeSelector.tsx` is the only mechanism preventing JIT scanner from dropping 64 `text/bg/border/ring-type-{TYPE}` utilities at build time — fragile to silent deletion; static class-map object is the safe alternative but was deliberately rejected in story spec (Task 5.1).
- `/declare` route reachable directly without session or consent guard — consent-gate enforcement is Story 2.2's domain; route-level guard deferred until Story 2.4+ when an authenticated flow guard can be applied consistently across `/declare`, `/test`, and result pages.
- `useTestStore.answers` (Story 2.4) and `currentIndex` (Story 2.4) persist to `localStorage['mbti-test-progress']` but have no mutation actions in this story — by design; Story 2.4 adds `addAnswer` / `setCurrentIndex`; `reset()` clears both.
- Stale `answers` / `currentIndex` from a previous incomplete test session can be rehydrated on return — Story 2.4 owns test-session resume/reset logic; Story 2.5 calls `reset()` after successful submit.
- 4-dot progress indicator: AC-3 describes per-type-card placement (top-right of each card), Task 5.1 / implementation places it in the Phase-2 page header bar — spec ambiguity; page-header is the sensible interpretation (per-card would show 16 identical indicators); requires UX design sign-off.
- Icon/glyph slot specified in AC-1 for group cards but no icon data or asset exists in the story spec (`TypeGroup` type has no `icon` field, `typeGroups.ts` has no icon values) — deferred until design assets are provided.
- Phase 1 re-entry animation direction hardcoded to `x: '-100%'` regardless of navigation direction — AC-2 says "inverse transition" (back should enter from right), but Task 6.1 shows fixed direction; true directional animation needs `direction: 'forward' | 'back'` state refactor — defer to UX polish pass.

## Deferred from: code review of 2-2-consent-gate-privacy-policy-age-gate-and-ai-disclaimer (2026-05-05)

- SSR script tag `<script type="module" src="/src/main.tsx">` in `apps/api/src/routes/ssr.ts` is a Vite-dev path — production needs hashed bundle URL resolved from a build manifest. Pre-existing from Story 2.1; owned by the deploy-pipeline story when production asset URL resolution is configured.
- No CSP / security headers (`Content-Security-Policy`, `Referrer-Policy`, `X-Content-Type-Options`, `Strict-Transport-Security`) on hand-rolled SSR HTML in `routes/ssr.ts`. Pre-existing 2.1 surface; address with the observability/security hardening pass.
- Privacy page Last-Updated date is hardcoded `Cập nhật: 2026-05-05` in `apps/api/src/routes/ssr.ts:79` — drift risk when copy changes without timestamp bump. Consider build-time substitution or file-mtime injection.
- Privacy copy mentions "Cloudflare (offshore)" — infra disclosure in user-facing legal text (`apps/api/src/routes/ssr.ts:96`). Content/legal review concern; revisit when product team owns the privacy CMS.
- `apiCall` mutation in `ConsentGate.tsx` has no `AbortController` — stale state writes after unmount produce StrictMode dev warnings. Benign in prod for this single-mutation flow; address when a request-cancellation pattern is needed elsewhere.
- Row-error `<p role="alert">` in `ConsentGate.tsx` announces via `aria-live="polite"` but does not move focus to the offending checkbox — AT users with focus elsewhere may not navigate to the error. A11y enhancement for a future polish pass.
- `submitError` in `ConsentGate.tsx` lacks `scrollIntoView` — on small mobile viewports with keyboard open, the error message below the CTA can be off-screen. Minor UX.
- `/declare` route is an unstyled placeholder shipped to production at `apps/web/src/router.tsx:16-22` — owned by Story 2.3. Acceptable for sprint sequencing; flag if 2.2 ships before 2.3.
- `SESSION_GONE` 401 envelope from `apps/api/src/routes/sessions.ts:67-76` does not signal the client to clear the stale `mbti-session-token` from `localStorage` — page refresh recovers via re-init, but a `error.shouldClearToken` hint would be cleaner. Address with the token-rotation / 401-handling unification story.
- `c.req.header('X-Session-Token')!.trim()` in `apps/api/src/routes/sessions.ts:65` uses a non-null assertion that couples to `requireSession` middleware order. Safe today; brittle to refactor. Replace with a typed `getOrThrow` helper when additional authenticated routes land.
- `as any` cast on the `env` argument in `apps/api/tests/routes/sessions.test.ts` (existing pattern extended into PATCH cases) — discards type checking on `Bindings`. Tightening requires importing the `Bindings` type into tests. Pre-existing from Story 2.1 test pattern; out-of-scope hygiene.
- Anchor `role="button"` CTA in SSR landing (`apps/api/src/routes/ssr.ts:43`) — keyboard Space won't activate (anchors only respond to Enter). Pre-existing from Story 2.1; owned by an SSR-accessibility pass.

## Deferred from: code review of 2-1-landing-page-and-anonymous-user-session (2026-05-05)

- PostHog server-side `session_initiated` event missing in `POST /api/sessions/init`. Same scope-boundary pattern as posthog-js (client-side). Server-side counterpart needs `posthog-node` or fetch-based ingest. Belongs to the PostHog wiring story.
- Clash Display font binary missing at `apps/web/public/fonts/ClashDisplay-Variable.woff2` — `@font-face` references it but file is absent. Half of the app uses fontshare CDN, half references the local file. Manual download from https://www.fontshare.com/fonts/clash-display required during environment setup. Acknowledged in story completion notes.
- Session token in `localStorage` + custom `X-Session-Token` header is XSS-readable. Architecture-level decision per `architecture.md#Authentication & Security`; HttpOnly cookies are the standard mitigation. Revisit if XSS surface grows or compliance requires it.
- No rate limiting on `POST /api/sessions/init` — attacker can flood KV with sessions, exhausting quota / cost. RATE_LIMITER binding cleanup is owned by the first feature story that wires rate limiting (per Story 1.6 deferred-work).
- Client-side token validation against KV expiry not implemented — if KV session expires before localStorage token is cleared, user appears authenticated but every request returns 401. Needs `/api/sessions/validate` endpoint or 401 → re-init flow. Belongs to Story 2.4+ (first authenticated user-flow story).
- `/consent` route stub in `router.tsx` lacks `errorElement` — Story 2.2 owns the real consent page and its error boundary.
- `apiCall` `Headers` instance spread (`...init?.headers`) silently drops entries when the caller passes a `Headers` instance instead of a plain object. No current caller uses that form. Revisit when a feature story passes a `Headers` instance (e.g., propagating a streaming response).
- Test asserts TTL via the out-of-diff `setSession` helper — `apps/api/tests/routes/sessions.test.ts:36-41` asserts `expirationTtl: 60*60*24*30` based on `lib/kv.ts` hardcoding. The route never sets a TTL itself. Test is technically valid (the helper does set the right TTL) but couples to an out-of-diff implementation detail. Not actionable now.

## Deferred from: code review of 1-1-monorepo-scaffold (2026-04-30)

- Missing CORS middleware in apps/api — needed for cross-origin requests from Cloudflare Pages to Workers. Belongs to Story 1.3.
- No global error handler `app.onError` — unhandled exceptions return raw 500 instead of `{ data, error }` envelope. Belongs to Story 1.3.
- No 404 handler `app.notFound` — unknown routes return plain text instead of envelope format. Belongs to Story 1.3.
- No Hono Bindings type for env (`Hono<{ Bindings: Env }>`) — adding env variables later requires refactoring app init. Belongs to Story 1.3.

## Deferred from: code review of 1-2-react-spa-with-vite-and-cloudflare-pages-adapter (2026-04-30)

- PWA manifest has empty `icons` array — installability will fail. Add icons when design assets are ready.
- No React Error Boundary or `errorElement` on routes — belongs to Story 2.1 when real pages are built.
- Hardcoded hex colors bypass theme system + theme_color mismatch between manifest (#050507) and app bg (#0D0F1A). Address when design tokens are implemented.
- PWA manifest missing `description`, `scope`, `lang`, `id` fields — PWA polish, not blocking.
- No service worker registration for PWA — PWA not required to be installable at MVP.
- No `<meta name="description">` in index.html — SEO belongs to Story 2.1 landing page.
- shadcn v4 uses Base UI (`@base-ui/react`) instead of Radix UI — architecture doc references Radix but shadcn migrated. Architecture doc should be updated.

## Deferred from: code review of 1-4-shared-package (2026-04-30)

- `.uuid()` accepts both upper- and lowercase hex (schemas/invite.ts:4,10; schemas/test.ts:21) — sqlite is case-sensitive on TEXT comparisons; storage normalization (`.toLowerCase()` on insert/lookup) belongs to Story 1.5+ db helpers.
- `queryKeys` factory accepts empty/whitespace strings (queryKeys.ts:4-6) — possible cache cross-contamination on shared devices. Brand types out of scope for Story 1.4; caller responsibility / TanStack Query `enabled` flag handles loading state. Revisit when feature stories install react-query.
- `PerceptionVoteSchema.inviteToken: z.string().uuid()` vs `InviteLinkRow.token: string` (free-form) — schema/DB drift if Story 4.1 generates tokens as nanoid. Token-generation strategy is Story 4.1's decision; align both at that point.
- `PLACEHOLDER_REASON` (constants.ts:32) for `VILLAINS_MAP` ships to prod without guard if Story 3.1 slips. Story 3.1 acceptance gate is the enforcement point — ensure no `PLACEHOLDER_REASON` references remain when 3.1 is marked done.
- `TestResultSchema.createdAt` (schemas/test.ts:25) — `.datetime({offset:false})` accepts `Z` (matches `new Date().toISOString()`) but rejects `+00:00` and naked `YYYY-MM-DD HH:MM:SS` (sqlite `DEFAULT CURRENT_TIMESTAMP` format). Architecture mandates `new Date().toISOString()` everywhere. Datetime ingestion contract belongs to Story 1.5+ db helpers; ensure all D1 inserts pass `new Date().toISOString()`.
- `queryKeys.feed` accepts only `MBTIType`, no null for loading state (queryKeys.ts:6) — design choice per standard TanStack Query pattern (`enabled: !!mbtiType`). No action needed unless a feature story finds friction.

## Deferred from: code review of 1-5-cloudflare-d1-database-setup (2026-04-30)

- No predeploy guard rejects placeholder `database_id="00000000-..."` in `apps/api/wrangler.toml` — Story 1.7 owns CI guards.
- PDPA soft-delete is insufficient for PII (`test_results.answers`, `perception_votes.behavioral_answers` JSON columns); hard-delete + at-rest encryption belongs to Story 7.4 PDPA purge job.
- Repeated 16-tuple MBTI CHECK list across 4 columns is a drift bomb if `MBTI_TYPES` in `@mbti/shared` ever changes; Story 1.7 should add a schema test that diffs the literal tuples against the constant.
- TEXT timestamps are non-monotonic vs INTEGER epoch — architectural choice per `architecture.md#Format Patterns`; Phase 2 reconsideration if D1 → Supabase migration happens.
- `inviter_result_id` is a soft reference (no FK to `test_results.id`) — same KV-anonymous-session pattern as `user_id`/`inviter_user_id`; documented design choice.
- `updated_at` columns have DEFAULT but no `AFTER UPDATE` trigger; feature-story UPDATE helpers must explicitly set `updated_at = strftime(...)`.
- `expired_at > created_at` CHECK does lexicographic ISO string comparison; safe only if all writers emit identical ISO format; format pinning is Story 1.4 deferred-work, addressed at insert-helper level.
- `getActiveCuratedInsights` `Error` message leaks function name and raw input — future structured-logging / Sentry pass (Story 1.7 / 7.x).
- No UNIQUE on `(mbti_type, variant)` in `curated_insights` — Story 3.1 / FR10 / FR44 own variant management semantics.
- Partial indexes `WHERE deleted_at IS NULL` only help queries that include the same predicate; Story 7.4 (PDPA purge) and feature-story query helpers will refine to composite indexes as real query shapes emerge.
- No down-migrations / rollback scripts — D1 wrangler migration system is forward-only; recovery via point-in-time restore.
- `idx_test_results_user_id` doesn't include `deleted_at` predicate; refine when Story 7.4 implements live-only queries.
- "Applied by: TODO" header in each migration — user fills when running Task 1.1/1.2/1.4 (real engineer name + apply timestamp).
- `migrations_dir = "../../migrations"` requires running wrangler from `apps/api/`; optional QoL improvement to add `db:apply:local` / `db:apply:remote` npm scripts in `apps/api/package.json` — out of Story 1.5 scope.
- Mixed-case TEXT primary keys / tokens — convention documented in `lib/db.ts` JSDoc; brand types (`Uuid` newtype) out of scope for Story 1.5; future stories enforce.
- FK semantics ignore parent `deleted_at` — application-layer enforcement; Story 7.4 / Story 4.x own.
- `declared_type` rejects empty string at INSERT — route-handler responsibility to normalize `''` → `NULL`; future feature stories handle.
- `deleted_at TEXT` has no ISO 8601 format guard at DB layer — centralized helper writes (Story 7.4 PDPA purge) will enforce.
- `strftime('%Y-%m-%dT%H:%M:%fZ','now')` vs `new Date().toISOString()` byte equality + risk of `'localtime'` modifier — documented in dev notes; future helpers ban `'localtime'`.
- All 16 seed rows share identical timestamp → `ORDER BY created_at` is non-deterministic; Story 7.x admin dashboard ordering will resolve via tie-breaker.
- Hardcoded seed date `'2026-04-30T00:00:00.000Z'` may be excluded by recency filters — Story 3.2 / 6.1 design decisions.
- `getActiveCuratedInsights` SELECT field list does not auto-track `CuratedInsightRow` additions — review process catches drift; consider `SELECT *` if/when row interface stabilizes.
- `articles.slug` and `invite_links.token` use BINARY collation (case-sensitive) — `articles.slug` normalization is Story 6.1 input handling; `invite_links.token` lower-case enforcement is Story 4.1 token-generation strategy.
- No UNIQUE on `(mbti_type)` filtered by `is_published=1` for `articles` — product invariant decision (one published per type vs many) belongs to Story 6.1 / Story 7.2.
- No length caps / non-empty CHECKs on `answers`, `behavioral_answers`, `persona_name`, `title`, `content`, `voter_session_id` — Zod schemas at API layer enforce; DB-layer CHECKs are scope creep.
- `migrations_dir` doesn't filter `*.sql` — `.DS_Store` risk handled by root `.gitignore`; future addition: `migrations/.gitignore` excluding non-SQL files.
- `retention_flag` 3-valued logic (NULL distinct from 0/1) requires careful PDPA purge filters — Story 7.4 defines semantics.

## Deferred from: code review of 1-3-hono-v4-12-api-workers (2026-04-30)

- CORS allowlist hardcoded to `http://localhost:5173` — Story 1.7 owns env-driven origin config + production whitelist.
- `Variables.userId: string` is non-optional but only set inside `requireSession`; routes that forget the middleware get `undefined` typed as `string`. Design tension; revisit when first feature route lands.
- `ZodError.message` returned verbatim in 400 envelope leaks schema dump and received values. Architecture sample uses `err.message`; flag for architecture review (consider `err.issues[0]?.message` or structured details).
- `wrangler.toml` placeholder UUIDs (`00000000-...`) accepted by `wrangler deploy` — engineer who forgets the TODO may silently bind to wrong namespace. Story 1.5/1.6 will replace with real IDs and Story 1.7 should add a predeploy guard.
- Custom `X-Session-Token` header bypasses cookie protections (HttpOnly, Secure, SameSite); XSS on SPA can exfiltrate token. Architectural decision per `architecture.md#Authentication & Security`; revisit if XSS surface grows.
- Rate Limiter binding declared but never invoked — false sense of protection. Story scope deliberately excludes rate-limit middleware until first feature route needs it.
- `build` script uses `--dry-run` and never produces a deployable artifact. Pre-existing from Story 1.1; Story 1.7 (CI/CD) will rationalize build vs deploy.
- Rate Limiter `namespace_id = "1001"` is a round number with collision risk on the same Cloudflare account. Replace with a project-unique value when rate-limit middleware ships.
- Session TTL is set on write only — no sliding refresh. Active users logged out exactly 30 days after sign-in regardless of activity. Product decision needed; architecture is silent.
- `SessionData.createdAt` has no ISO 8601 contract — once expiry/audit logic compares timestamps, format mismatches will cause silent bugs. Formalize with Zod when expiry features land.
- `compatibility_date = "2025-04-01"` is a year stale; new code misses Workers runtime fixes/perf updates. Set in Story 1.1; bump in Story 1.7 alongside CI hygiene.
- No `secureHeaders`, request id, or global request logger — generic 500s have no correlation id for prod debugging. Story 1.7 owns observability stack.
- 401 responses lack `WWW-Authenticate` header — non-standard for RFC 7235; some clients won't retry. Low priority; architecture does not require it.
- CORS preflight to a typo'd path returns 404 envelope without preflight 204 — Chromium aborts the actual request silently. Edge case with low real-world impact.

## Deferred from: code review of 1-6-cloudflare-r2-kv-namespaces-and-environment-secrets-configuration (2026-04-30)

- D1 `database_id` change in `apps/api/wrangler.toml:11` is Story 1.5 scope-bleed — D1 hunk rode along during wrangler-auth unblock pass; both stories' File Lists out of date but end-state correct. Fix in next sprint hygiene pass (re-attribute hunk to Story 1.5 commit OR amend Story 1.6 File List).
- Worker secrets in `apps/api/src/types/bindings.ts:10-14` typed as `string` instead of `string | undefined` — Workers runtime delivers `undefined` for unset secrets but TS type-system claims `string`; no boot-time fail-fast. Spec authoritative surface prescribed `string`; runtime fail-fast (`assertSecrets(env)`) is hardening work — revisit when Story 7.1 (admin auth) wires the first secret consumer.
- `apps/api/wrangler.toml` real CF resource IDs (D1 + KV) committed without env separation — same D1+KV IDs serve dev/staging/prod; `wrangler --remote` against this toml will mutate prod. Single-env wrangler.toml is acceptable for MVP solo-dev workflow; `[env.production]` stanzas + CI substitution belong to Story 1.7 (CI/CD pipeline) when staging is added.
- No key-prefix/key validation in `putAsset`/`getAsset` (`apps/api/src/lib/r2.ts`) — JSDoc explicitly delegates to route handler; feature stories (3.4 OG/share-card, 5.2 reports) own domain-specific helpers with prefix-aware validation. The "MUST go through helper" rule is currently norm-only, not enforced.
- `withR2` falsy-check only catches "binding missing entirely" (`apps/api/src/lib/r2.ts:29`) — does not catch "binding present but wrong CF account / bucket unreachable". Same pattern as `withDb`. Opaque-misdiagnosis improvement is not blocking; revisit if R2 misconfigurations become recurring incident type.
- `Bindings.ASSETS_BUCKET` declared non-optional but `withR2` defensive-guards for falsy (`apps/api/src/types/bindings.ts:5`) — type/runtime asymmetry. Touching existing 4 bindings is out of Story 1.6 scope; revisit when an `assertBindings(env)` boot helper lands.
- `bcryptjs` cost-12 may exceed Cloudflare Workers CPU envelope (referenced in `apps/api/.dev.vars.example:21` hint) — pure-JS bcrypt at cost 12 takes ~hundreds of ms; Workers free tier has 10ms CPU caps and even paid Workers have limits. Story 7.1 admin auth implementation owns the runtime-feasibility verification (may need to drop cost factor or use a different KDF).
- `putAsset` ReadableStream lifetime contract not documented (`apps/api/src/lib/r2.ts:37-54`) — caller passing locked/consumed stream gets raw R2 error, not a friendly wrapper. Route handlers manage stream lifetime per Workers convention; revisit if a feature story repeatedly hits this trap.
- `getAsset` body double-consumption unguarded (`apps/api/src/lib/r2.ts:56-61`) — `R2ObjectBody.body`/`.text()`/`.json()` are single-use; second call throws `Body has already been used`. Standard Streams convention; document only if a feature story trips on it.
- `getAsset` returns `null` undocumented + no key validation (`apps/api/src/lib/r2.ts:56-61`) — overlaps key-prefix-validation defer; bug in caller-side key derivation manifests as a 404-style "not found" rather than a visible error. Feature stories own validation.
- `RATE_LIMITER` `namespace_id = "1001"` placeholder remains in `wrangler.toml` while D1/KV got real IDs (`apps/api/wrangler.toml:25`) — Story 1.7 owns rate-limiter cleanup per Story 1.6 "Files Being Modified" table. Inconsistency, not a bug.

## Deferred from: code review of 1-7-ci-cd-pipeline-with-github-actions (2026-05-01)

- Double CI run when PR branch pushed — `pull_request` and `push` events both fire simultaneously (`ci.yml`). By-spec per AC-1 but wastes CI minutes. Consider using `workflow_run` or merging triggers in a future hygiene pass.
- `packages/shared/tsconfig.json` `rootDir: "."` will emit test files into `dist/` if a build script is ever added. Currently safe (noEmit, no build script). Widen only if `@mbti/shared` grows a compile step — then split into `tsconfig.src.json` + `tsconfig.test.json`.
- `apps/api` vitest uses Node environment — Cloudflare Workers runtime globals absent for feature tests. Add `@cloudflare/vitest-pool-workers` when the first real API unit test is written.
- `vitest` not declared in per-package `devDependencies` — relies on implicit pnpm workspace hoisting. Add explicit `vitest` devDep to each workspace if `--isolated-node-linker` mode is ever enforced.
- `.gitignore` missing `coverage/` entry — vitest coverage output will be committed if coverage is enabled without adding the entry first. Add `coverage/` to root `.gitignore` before enabling `--coverage` flag.
- Fork PRs receive no fallback sticky comment explaining preview unavailability (`ci.yml`). Optional UX improvement — add a second `deploy-preview` job step conditioned on `fork == true` posting a canned "preview unavailable for forks" comment.
- `pnpm build` dry-run + wrangler-action re-bundle: API artifact type-checked by project wrangler (`^4.0.0`), deployed by wrangler-action@v3's internal wrangler version. May diverge on breaking wrangler releases. Reconcile by pinning `wranglerVersion` input on `wrangler-action@v3` to match `apps/api/package.json`.
- `--passWithNoTests` on all test scripts silently masks misconfigured `include` globs. Remove when each package has at least one real test file; gate will then be self-enforcing.
- Production deploy queue has no timeout — a hung deploy (`d1 migrations apply` hanging on a large migration) blocks all subsequent deploys indefinitely. Add a `timeout-minutes:` on the deploy job when the migration set grows.
- Action SHA pinning not applied — floating mutable tags (`@v4`, `@v3`, `@v2`) are used. Pin to full commit SHAs using a tool like `renovate` or `actions/pin-to-sha` when supply-chain hardening is prioritized.
- `database_id` placeholder regex `/^[0-]+$/` covers spec's dual-pattern (`^0+$` and `^00000000-0000-0000-0000-000000000000$`) by coincidence (both `0` and `-` are in the character class). Replace with explicit alternation regex for clarity in a future script cleanup pass.
