# Deferred Work

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
