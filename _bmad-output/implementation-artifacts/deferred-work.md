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
