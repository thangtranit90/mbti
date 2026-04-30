# Story 1.3: Hono v4.12 API Workers with KV Session Auth and Response Envelope

Status: done

## Story

As a developer,
I want `apps/api` scaffolded as a Hono v4.12 app on Cloudflare Workers with KV-backed anonymous session authentication middleware and the standard `{ data, error }` response envelope,
so that all API routes are consistently formatted, user sessions are anonymous-by-default, and the API is ready for feature route implementation.

## Acceptance Criteria

1. **AC-1: Health endpoint with envelope** — `wrangler dev --local` running for `apps/api`; `GET /api/health` returns `{"data":{"status":"ok"},"error":null}` with HTTP 200.

2. **AC-2: Hono Bindings type** — `apps/api/src/types/bindings.ts` exports `Bindings` (with `DB: D1Database`, `KV: KVNamespace`, `ASSETS_BUCKET: R2Bucket`, `RATE_LIMITER: RateLimit`) and `Variables` (with `userId: string`); the Hono app is instantiated as `new Hono<{ Bindings: Bindings; Variables: Variables }>()`.

3. **AC-3: Valid session passes** — A request with a valid KV session token in `X-Session-Token: {token}` header, when processed by the auth middleware (`apps/api/src/middleware/auth.ts`), resolves the session via `getSession()` from `lib/kv.ts`, sets `c.set('userId', session.userId)`, and proceeds to the route handler.

4. **AC-4: Unauthorized envelope** — A request to a protected route with no `X-Session-Token` header, or with an invalid/expired token, returns `{"data":null,"error":{"code":"UNAUTHORIZED","message":"..."}}` with HTTP 401.

5. **AC-5: Validation envelope** — A `ZodError` thrown from any route handler is caught by global `app.onError` and returned as `{"data":null,"error":{"code":"VALIDATION_ERROR","message":"..."}}` with HTTP 400.

6. **AC-6: Internal error envelope** — Any other uncaught error in a route handler is returned by `app.onError` as `{"data":null,"error":{"code":"INTERNAL_ERROR","message":"Unexpected error"}}` with HTTP 500.

7. **AC-7: 404 envelope** — `app.notFound` returns `{"data":null,"error":{"code":"NOT_FOUND","message":"..."}}` with HTTP 404 for unmatched routes.

8. **AC-8: CORS middleware** — `apps/api/src/middleware/cors.ts` whitelists the web app origin (default `http://localhost:5173` for dev), is applied globally, and responds to preflight OPTIONS with the correct headers (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers` including `X-Session-Token`).

9. **AC-9: wrangler.toml bindings declared** — `apps/api/wrangler.toml` declares: `[[d1_databases]] binding="DB" database_name="mbti"`, `[[kv_namespaces]] binding="KV"`, `[[r2_buckets]] binding="ASSETS_BUCKET" bucket_name="mbti-assets"`, and `[[unsafe.bindings]] name="RATE_LIMITER" type="ratelimit"` with `simple = { limit = 100, period = 60 }`. Placeholder IDs are documented with TODO comments referencing Story 1.5 (D1) and 1.6 (KV/R2).

10. **AC-10: Helper-only access** — Route handlers never call `c.env.DB` or `c.env.KV` directly. All D1 access goes through `apps/api/src/lib/db.ts`; all KV access through `apps/api/src/lib/kv.ts` (which exports typed `getSession`, `setSession`, `deleteSession`).

11. **AC-11: Lint + typecheck pass** — `pnpm lint && pnpm typecheck` from monorepo root pass with zero errors.

## Tasks / Subtasks

- [x] Task 1: Install zod dependency (AC: 5)
  - [x] 1.1 In `apps/api`, run `pnpm add zod` (latest stable)
  - [x] 1.2 Verify `pnpm install` resolves at monorepo root with no errors

- [x] Task 2: Define Hono Bindings + Variables types (AC: 2)
  - [x] 2.1 Create `apps/api/src/types/bindings.ts` exporting `Bindings` and `Variables` types
  - [x] 2.2 `Bindings`: `DB: D1Database`, `KV: KVNamespace`, `ASSETS_BUCKET: R2Bucket`, `RATE_LIMITER: RateLimit` (use Cloudflare types from `@cloudflare/workers-types` — already installed)
  - [x] 2.3 `Variables`: `userId: string`

- [x] Task 3: Update wrangler.toml with all bindings (AC: 9)
  - [x] 3.1 Add `[[d1_databases]]` block: `binding = "DB"`, `database_name = "mbti"`, `database_id = "00000000-0000-0000-0000-000000000000"` with TODO comment referencing Story 1.5
  - [x] 3.2 Add `[[kv_namespaces]]` block: `binding = "KV"`, `id = "00000000000000000000000000000000"` with TODO comment referencing Story 1.6
  - [x] 3.3 Add `[[r2_buckets]]` block: `binding = "ASSETS_BUCKET"`, `bucket_name = "mbti-assets"` with TODO comment referencing Story 1.6
  - [x] 3.4 Add `[[unsafe.bindings]]` block: `name = "RATE_LIMITER"`, `type = "ratelimit"`, `namespace_id = "1001"` (arbitrary numeric ID — not a real KV namespace), `simple = { limit = 100, period = 60 }`
  - [x] 3.5 Verify `wrangler dev --local` starts without errors using local simulators (placeholder IDs accepted in `--local` mode)

- [x] Task 4: Implement `lib/kv.ts` session helpers (AC: 3, 10)
  - [x] 4.1 Create `apps/api/src/lib/kv.ts`
  - [x] 4.2 Define and export `SessionData = { userId: string; createdAt: string }` type (ISO 8601 for `createdAt`)
  - [x] 4.3 Implement `getSession(kv: KVNamespace, token: string): Promise<SessionData | null>` — uses `kv.get<SessionData>(token, 'json')`
  - [x] 4.4 Implement `setSession(kv: KVNamespace, token: string, data: SessionData): Promise<void>` — uses `kv.put(token, JSON.stringify(data), { expirationTtl: 60 * 60 * 24 * 30 })`
  - [x] 4.5 Implement `deleteSession(kv: KVNamespace, token: string): Promise<void>` — uses `kv.delete(token)`
  - [x] 4.6 Helpers MUST take `KVNamespace` parameter explicitly (not access `c.env.KV` internally) so they remain testable in isolation

- [x] Task 5: Create `lib/db.ts` stub (AC: 10)
  - [x] 5.1 Create `apps/api/src/lib/db.ts`
  - [x] 5.2 Add file-level JSDoc: `// All D1 prepared statements live here. Route handlers MUST NOT call c.env.DB directly. Real query helpers will be added in Story 1.5+.`
  - [x] 5.3 Export a placeholder type to keep the module non-empty: `export type DbContext = { db: D1Database }` — will be consumed by Story 1.5 helpers

- [x] Task 6: Implement KV session auth middleware (AC: 3, 4)
  - [x] 6.1 Create `apps/api/src/middleware/auth.ts`
  - [x] 6.2 Export `requireSession` Hono middleware: read `X-Session-Token` from `c.req.header()`; if missing → return 401 envelope; call `getSession(c.env.KV, token)`; if null → return 401 envelope; else `c.set('userId', session.userId)` and `await next()`
  - [x] 6.3 Type the middleware as `MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }>`
  - [x] 6.4 401 messages: missing token → `"Missing session token"`; invalid/expired → `"Invalid or expired session"`

- [x] Task 7: Implement CORS middleware (AC: 8)
  - [x] 7.1 Create `apps/api/src/middleware/cors.ts`
  - [x] 7.2 Use Hono's built-in `cors` from `hono/cors`
  - [x] 7.3 Whitelist origin: `['http://localhost:5173']` for dev (TODO comment: Story 1.7 will read from env per environment)
  - [x] 7.4 Allow methods: `GET, POST, PUT, DELETE, OPTIONS`; allow headers: `Content-Type, X-Session-Token`
  - [x] 7.5 Export as `corsMiddleware` so `index.ts` can mount it globally

- [x] Task 8: Refactor `apps/api/src/index.ts` (AC: 1, 5, 6, 7)
  - [x] 8.1 Import `Bindings`, `Variables` from `./types/bindings`; `corsMiddleware` from `./middleware/cors`; `ZodError` from `zod`
  - [x] 8.2 Instantiate `const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()`
  - [x] 8.3 `app.use('*', corsMiddleware)` BEFORE any routes
  - [x] 8.4 `app.get('/api/health', (c) => c.json({ data: { status: 'ok' }, error: null }))` — drop `typesCount` to match AC-1 strictly
  - [x] 8.5 `app.notFound((c) => c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404))`
  - [x] 8.6 `app.onError((err, c) => ...)` — branch on `err instanceof ZodError → 400 VALIDATION_ERROR`; fallback `→ 500 INTERNAL_ERROR` with message `'Unexpected error'`
  - [x] 8.7 Remove the import of `MBTI_TYPES` from `@mbti/shared` (no longer used after dropping `typesCount`)

- [x] Task 9: Verify all ACs (AC: 1–11)
  - [x] 9.1 `pnpm install` from monorepo root → no errors
  - [x] 9.2 `pnpm dev` → both `apps/web` and `apps/api` start in parallel; api on `:8787` without errors
  - [x] 9.3 `curl http://localhost:8787/api/health` → `{"data":{"status":"ok"},"error":null}` HTTP 200 (AC-1)
  - [x] 9.4 `curl http://localhost:8787/api/nonexistent` → 404 envelope `{"data":null,"error":{"code":"NOT_FOUND",...}}` (AC-7)
  - [x] 9.5 Auth verification with temporary scaffolding — pre-seeded KV with `test-token`; curls returned 401 (no header), 401 (bogus header), 200 (valid header). Temp routes removed from `src/index.ts`. (AC-3, AC-4)
  - [x] 9.6 Validation verification with temporary scaffolding — POST with invalid `{"x":123}` returned 400 `VALIDATION_ERROR` envelope. Also verified `INTERNAL_ERROR` fallback path with a `throw new Error('boom')` route returning 500 envelope (AC-6). Temp routes removed. (AC-5, AC-6)
  - [x] 9.7 CORS preflight returned `HTTP 204` with `Access-Control-Allow-Origin: http://localhost:5173`, `Access-Control-Allow-Headers: Content-Type,X-Session-Token`, `Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS`. (AC-8)
  - [x] 9.8 `pnpm lint && pnpm typecheck` from monorepo root → zero errors across all 3 packages. (AC-11)

### Review Findings

- [x] [Review][Patch] Validate session shape before `c.set('userId', ...)` — corrupted/legacy KV entry without `userId` would set `undefined` typed as `string`, causing silent auth bypass [apps/api/src/middleware/auth.ts:23] **High**
- [x] [Review][Patch] Wrap `kv.get(token, 'json')` in try/catch — malformed JSON in KV currently throws → caught by `app.onError` → 500 INTERNAL_ERROR instead of 401 UNAUTHORIZED, masking data corruption and exposing a probing vector [apps/api/src/lib/kv.ts:9; apps/api/src/middleware/auth.ts:16] **High**
- [x] [Review][Patch] Namespace KV session keys with `session:` prefix — raw token used as KV key risks collision with future feature KV usage and lets a KV dump expose valid bearer tokens [apps/api/src/lib/kv.ts:9,17,21] **High**
- [x] [Review][Patch] Trim `X-Session-Token` header before missing-token check — a header of only whitespace currently passes `if (!token)` and is forwarded to KV, producing misleading "Invalid or expired session" 401 instead of "Missing session token" [apps/api/src/middleware/auth.ts:9-15] **Med**
- [x] [Review][Patch] Log uncaught errors in `app.onError` before returning 500 — `console.error(err)` ensures `wrangler tail` captures failures pre-Story 1.7 Sentry [apps/api/src/index.ts:26-29] **Med**
- [x] [Review][Patch] Handle Hono `HTTPException` in `app.onError` — once routes start throwing `new HTTPException(403, ...)`, they collapse to generic 500; add an `instanceof HTTPException` branch that emits the envelope with `err.status` [apps/api/src/index.ts:19-30] **Med**
- [x] [Review][Patch] Log 404s in `app.notFound` — `console.warn(method, path)` surfaces typo'd registrations during dev with zero cost [apps/api/src/index.ts:12-17] **Low**
- [x] [Review][Defer] CORS allowlist hardcoded to `http://localhost:5173` [apps/api/src/middleware/cors.ts:4] — deferred, Story 1.7 owns env-driven origin config + production whitelist
- [x] [Review][Defer] `Variables.userId: string` is non-optional but only set inside `requireSession`; routes that forget the middleware get `undefined` typed as `string` [apps/api/src/types/bindings.ts:9] — deferred, design tension between strict typing and ergonomic c.get usage; revisit when first feature route lands
- [x] [Review][Defer] `ZodError.message` returned verbatim in 400 envelope leaks schema dump and received values [apps/api/src/index.ts:22] — deferred, architecture sample explicitly uses `err.message`; flag for architecture review (consider `err.issues[0]?.message` or structured details)
- [x] [Review][Defer] `wrangler.toml` placeholder UUIDs (`00000000-...`) are syntactically valid; an engineer who forgets the TODO and runs `wrangler deploy` may silently bind to the wrong namespace [apps/api/wrangler.toml:12,17] — deferred, Story 1.5/1.6 will replace with real IDs and Story 1.7 should add a predeploy guard
- [x] [Review][Defer] Custom `X-Session-Token` header bypasses cookie protections (HttpOnly, Secure, SameSite); XSS on the SPA can read the token — deferred, architectural decision per `architecture.md#Authentication & Security`; revisit if XSS surface grows
- [x] [Review][Defer] Rate Limiter binding declared in `wrangler.toml` but never invoked — false sense of protection on `/api/health` [apps/api/wrangler.toml:24-28; apps/api/src/index.ts] — deferred, story scope explicitly excludes rate-limit middleware until first feature route needs it
- [x] [Review][Defer] `build` script uses `--dry-run` and never produces a deployable artifact [apps/api/package.json:9] — deferred, pre-existing from Story 1.1; Story 1.7 (CI/CD) will rationalize build vs deploy
- [x] [Review][Defer] Rate Limiter `namespace_id = "1001"` is a round number with collision risk on the same Cloudflare account [apps/api/wrangler.toml:24] — deferred, replace with a project-unique value when rate-limit middleware ships
- [x] [Review][Defer] Session TTL is set on write only — active users are logged out exactly 30 days after sign-in regardless of activity, no sliding refresh [apps/api/src/lib/kv.ts:17] — deferred, product decision needed (sliding vs absolute) — architecture is silent
- [x] [Review][Defer] `SessionData.createdAt` has no ISO 8601 contract — once expiry/audit logic compares timestamps, format mismatches will cause silent bugs [apps/api/src/lib/kv.ts:1] — deferred, formalize with Zod when expiry features land
- [x] [Review][Defer] `compatibility_date = "2025-04-01"` is a year stale; new code misses Workers runtime fixes/perf updates [apps/api/wrangler.toml:3] — deferred, set in Story 1.1; bump in Story 1.7 alongside CI hygiene
- [x] [Review][Defer] No `secureHeaders`, request id, or global request logger — generic 500s have no correlation id for prod debugging [apps/api/src/index.ts:8] — deferred, Story 1.7 owns observability stack
- [x] [Review][Defer] 401 responses lack `WWW-Authenticate` header — non-standard for RFC 7235; some clients won't retry [apps/api/src/middleware/auth.ts:11-22] — deferred, low priority, architecture does not require it
- [x] [Review][Defer] CORS preflight to a typo'd path returns 404 envelope without preflight 204 — Chromium aborts the actual request silently [apps/api/src/index.ts:8,12] — deferred, edge case with low real-world impact

## Dev Notes

### Architecture Compliance

- **Hono v4.12** — already installed (Story 1.1). Use `Hono<{ Bindings; Variables }>` generic so `c.env` and `c.var` are typed.
- **Response envelope (mandatory)** — every JSON response wraps in `{ data, error }`. `data` and `error` are NEVER both non-null at the same time. No exceptions, including the health endpoint.
- **Throw-don't-return for errors** — route handlers should `throw` errors; only `app.onError` formats error responses. Exception: middleware that owns a specific error case (e.g., `requireSession` returning 401) MAY return the envelope directly because it is the formatter for that case. This matches the architecture's stated pattern for KV session validation.
- **D1/KV access discipline** — route handlers MUST NOT call `c.env.DB` or `c.env.KV` directly. All D1 goes through `lib/db.ts`; all KV through `lib/kv.ts`. Architecture lists this as an explicit enforcement rule (`architecture.md#Enforcement Guidelines`) with violations requiring review.
- **Anonymous session model** — UUID session token, 30-day TTL, stored in KV. Token is the only credential — no passwords, no JWT. Client persists token in `localStorage` (web app concern, not this story).
- **Date format** — session timestamps use ISO 8601 strings (`new Date().toISOString()`). D1 stores dates as TEXT.
- **Typed helpers signature** — `getSession`/`setSession`/`deleteSession` take `KVNamespace` as parameter (not `c.env.KV` internally) to keep them pure and testable.
- **CORS** — `hono/cors` is built-in; no extra dependency. Whitelist `http://localhost:5173` (Vite default) for dev. Production origin comes in Story 1.7.
- **Rate Limiter binding** — `[[unsafe.bindings]]` with `simple` form does NOT require a real Cloudflare resource. The `namespace_id` is an arbitrary numeric label chosen by the developer. The binding is declared now so the type is available; actual rate limiting middleware (`middleware/rateLimit.ts`) will be added in a feature story.

### Critical Version Notes (April 2026)

| Technology | Version | Notes |
|---|---|---|
| Hono | ^4.12.0 | Already installed. Use `hono/cors` for CORS — built-in, no extra dep. |
| Zod | ^4.x.x (latest stable) | NEW dep in `apps/api`. Story 1.4 will install in `packages/shared` for schemas. |
| @cloudflare/workers-types | ^4.20250421.0 | Already installed. Provides `D1Database`, `KVNamespace`, `R2Bucket`, `RateLimit` types. |
| Wrangler | ^4.0.0 | Already installed. `wrangler dev --local` simulates D1/KV/R2 locally in `.wrangler/state/`. |
| TypeScript | ~6.0.2 | Already installed. `verbatimModuleSyntax: true` is on — use `import type` for type-only imports. |

### Scope Boundaries — DO NOT Do These

- Do NOT create real Cloudflare D1 database, KV namespace, or R2 bucket — those belong to Stories 1.5 and 1.6. Use placeholder IDs in `wrangler.toml` with TODO comments.
- Do NOT populate `lib/db.ts` with real queries — Story 1.5 (schema migrations) and feature stories own that.
- Do NOT write any feature route (tests, insights, invites, payments, og, content, ssr, admin) — those are Epic 2+.
- Do NOT define Zod schemas in `packages/shared` — Story 1.4 owns `packages/shared/src/schemas/`.
- Do NOT add Vitest, Playwright, or any test runner — Story 1.7 owns testing setup.
- Do NOT add admin auth or admin routes — Story 7.1 owns admin scaffolding.
- Do NOT add PostHog analytics, Sentry, Anthropic SDK, or payment SDKs — feature stories own those.
- Do NOT implement `POST /api/session` (session creation) — that's a feature concern (Story 2.1 likely). This story only provides the validation middleware; another story will create sessions.
- Do NOT implement rate limiting middleware — only declare the binding. The middleware comes when first feature route needs it.

### Previous Story Intelligence

**From Story 1.1 deferred review findings (this story owns them):**
- Missing CORS middleware [apps/api/src/index.ts] → Task 7
- No global error handler `app.onError` [apps/api/src/index.ts] → Task 8.6
- No 404 handler `app.notFound` [apps/api/src/index.ts] → Task 8.5
- No Hono Bindings type for env [apps/api/src/index.ts] → Task 2

**From Story 1.1 dev notes:**
- `apps/api/eslint.config.js` already uses `globals.serviceworker` (correct for Workers — flags accidental browser API usage).
- `apps/api/tsconfig.json` extends `tsconfig.base.json` (post-review fix). Already includes `"types": ["@cloudflare/workers-types"]` — `D1Database`, `KVNamespace`, `R2Bucket`, `RateLimit` are available.
- Wrangler 4.86.0 installed. `wrangler dev --local` handles D1/KV/R2 local simulation; placeholder IDs are accepted in `--local` mode.
- `apps/api/src/index.ts` currently exports a minimal Hono app with `GET /api/health` returning `{ data: { status: 'ok', typesCount: 16 }, error: null }`. **Story 1.3 must drop `typesCount`** to match AC-1 strictly: `{"data":{"status":"ok"},"error":null}`.

**From Story 1.2:**
- Vite dev server runs at `http://localhost:5173` (default). CORS whitelist must include this origin for dev.
- Web app will read `VITE_API_URL` to point at API. Production CORS whitelist (deployed Pages domain) is a Story 1.7 concern.

### Files Being Modified (UPDATE)

| File | Current State | What Changes | What Must Be Preserved |
|---|---|---|---|
| `apps/api/package.json` | hono ^4.12, @mbti/shared, workers-types ^4.20250421, wrangler ^4.0, eslint ^10.2, typescript ~6.0 | Add `zod` dependency | All existing deps; `type: "module"`; existing scripts (`dev`, `build`, `lint`, `typecheck`) |
| `apps/api/wrangler.toml` | Only `name = "mbti-api"`, `main = "src/index.ts"`, `compatibility_date = "2025-04-01"`, `[dev] port = 8787` | Add `[[d1_databases]]`, `[[kv_namespaces]]`, `[[r2_buckets]]`, `[[unsafe.bindings]]` (Rate Limiter) blocks | All existing top-level fields; `[dev] port` MUST remain `8787` (Story 1.1 contract) |
| `apps/api/src/index.ts` | Minimal Hono app: imports `MBTI_TYPES` from `@mbti/shared`, single `GET /api/health` returning `{ status, typesCount }` | Replace with typed Hono app (Bindings + Variables generic), mount CORS, mount `app.notFound`, mount `app.onError`, keep `GET /api/health` (drop `typesCount`). Remove `MBTI_TYPES` import. | The route `/api/health` MUST keep responding HTTP 200 with envelope; the export `default app` pattern MUST remain (Wrangler entry contract) |

| File | Action |
|---|---|
| `apps/api/src/types/bindings.ts` | NEW — `Bindings` + `Variables` types |
| `apps/api/src/middleware/auth.ts` | NEW — KV session auth (`requireSession`) |
| `apps/api/src/middleware/cors.ts` | NEW — CORS origin whitelist (uses `hono/cors`) |
| `apps/api/src/lib/kv.ts` | NEW — `getSession`, `setSession`, `deleteSession` typed helpers |
| `apps/api/src/lib/db.ts` | NEW — D1 helpers stub (placeholder type only until Story 1.5) |

### What Must Be Preserved (System-Level Invariants)

- `GET /api/health` MUST continue to respond HTTP 200 with envelope (Story 1.1 AC-3 contract; will be monitored by future CI/CD smoke checks).
- `wrangler dev --local` MUST start without errors after wrangler.toml changes — verify before completing.
- `pnpm dev` from monorepo root MUST continue to start `apps/api` in parallel with `apps/web` (Story 1.1 AC-1).
- `pnpm lint` and `pnpm typecheck` MUST continue to pass with zero errors across the workspace (Story 1.1 AC-3).
- `apps/api/package.json` script `"dev": "wrangler dev --local"` MUST remain unchanged (Story 1.1 contract).
- The `default export` of `src/index.ts` (the Hono `app`) is the Wrangler entry — MUST not change shape.

### Project Structure After This Story

```
apps/api/
├── package.json                  # + zod dependency
├── wrangler.toml                 # + D1, KV, R2, Rate Limiter binding declarations
├── tsconfig.json                 # Unchanged
├── eslint.config.js              # Unchanged
└── src/
    ├── index.ts                  # MODIFIED: typed Hono app, CORS, onError, notFound, /api/health
    ├── types/
    │   └── bindings.ts           # NEW — Bindings + Variables
    ├── middleware/
    │   ├── auth.ts               # NEW — requireSession (KV session auth)
    │   └── cors.ts               # NEW — CORS whitelist via hono/cors
    └── lib/
        ├── db.ts                 # NEW — D1 stub (real helpers in Story 1.5)
        └── kv.ts                 # NEW — getSession, setSession, deleteSession
```

### Reference Implementation Sketches

These sketches are aligned with `architecture.md#Process Patterns` and the enforcement rules. Adapt as needed but do not deviate from envelope shape, status codes, or helper boundaries.

**`src/types/bindings.ts`:**

```typescript
export type Bindings = {
  DB: D1Database
  KV: KVNamespace
  ASSETS_BUCKET: R2Bucket
  RATE_LIMITER: RateLimit
}

export type Variables = {
  userId: string
}
```

**`src/lib/kv.ts`:**

```typescript
export type SessionData = { userId: string; createdAt: string }

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days — NFR

export async function getSession(kv: KVNamespace, token: string): Promise<SessionData | null> {
  return kv.get<SessionData>(token, 'json')
}

export async function setSession(
  kv: KVNamespace,
  token: string,
  data: SessionData,
): Promise<void> {
  await kv.put(token, JSON.stringify(data), { expirationTtl: SESSION_TTL_SECONDS })
}

export async function deleteSession(kv: KVNamespace, token: string): Promise<void> {
  await kv.delete(token)
}
```

**`src/lib/db.ts`:**

```typescript
// All D1 prepared statements live here. Route handlers MUST NOT call c.env.DB
// directly. Real query helpers will be added in Story 1.5+.
export type DbContext = { db: D1Database }
```

**`src/middleware/auth.ts`:**

```typescript
import type { MiddlewareHandler } from 'hono'
import type { Bindings, Variables } from '../types/bindings'
import { getSession } from '../lib/kv'

export const requireSession: MiddlewareHandler<{
  Bindings: Bindings
  Variables: Variables
}> = async (c, next) => {
  const token = c.req.header('X-Session-Token')
  if (!token) {
    return c.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Missing session token' } },
      401,
    )
  }
  const session = await getSession(c.env.KV, token)
  if (!session) {
    return c.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session' } },
      401,
    )
  }
  c.set('userId', session.userId)
  await next()
}
```

**`src/middleware/cors.ts`:**

```typescript
import { cors } from 'hono/cors'

// TODO Story 1.7: read allowed origins from env per environment (dev, staging, prod)
const ALLOWED_ORIGINS = ['http://localhost:5173']

export const corsMiddleware = cors({
  origin: ALLOWED_ORIGINS,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-Session-Token'],
})
```

**`src/index.ts`:**

```typescript
import { Hono } from 'hono'
import { ZodError } from 'zod'
import type { Bindings, Variables } from './types/bindings'
import { corsMiddleware } from './middleware/cors'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use('*', corsMiddleware)

app.get('/api/health', (c) => c.json({ data: { status: 'ok' }, error: null }))

app.notFound((c) =>
  c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404),
)

app.onError((err, c) => {
  if (err instanceof ZodError) {
    return c.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: err.message } },
      400,
    )
  }
  return c.json(
    { data: null, error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } },
    500,
  )
})

export default app
```

**`wrangler.toml` (additions to existing config):**

```toml
name = "mbti-api"
main = "src/index.ts"
compatibility_date = "2025-04-01"

[dev]
port = 8787

[[d1_databases]]
binding = "DB"
database_name = "mbti"
database_id = "00000000-0000-0000-0000-000000000000"  # TODO Story 1.5: replace with `wrangler d1 create mbti` output

[[kv_namespaces]]
binding = "KV"
id = "00000000000000000000000000000000"  # TODO Story 1.6: replace with `wrangler kv namespace create KV` output

[[r2_buckets]]
binding = "ASSETS_BUCKET"
bucket_name = "mbti-assets"  # TODO Story 1.6: create via `wrangler r2 bucket create mbti-assets`

[[unsafe.bindings]]
name = "RATE_LIMITER"
type = "ratelimit"
namespace_id = "1001"
simple = { limit = 100, period = 60 }
```

### Manual Verification Recipe

No automated test framework is installed yet (Story 1.7 owns Vitest + Playwright). Verify manually:

1. `pnpm install` → resolves with no errors.
2. `pnpm dev` → both apps start; api on `:8787` without errors.
3. `curl http://localhost:8787/api/health` → `{"data":{"status":"ok"},"error":null}` HTTP 200 (AC-1).
4. `curl http://localhost:8787/api/nonexistent` → 404 envelope `{"data":null,"error":{"code":"NOT_FOUND","message":"Route not found"}}` (AC-7).
5. **Auth verification (temporary scaffolding allowed, must be removed before final commit):**
   - Mount temp `app.get('/api/_test/protected', requireSession, (c) => c.json({ data: { userId: c.get('userId') }, error: null }))`.
   - Pre-seed KV: `wrangler kv key put --binding=KV "test-token" '{"userId":"u1","createdAt":"2026-04-30T00:00:00.000Z"}' --local`.
   - `curl http://localhost:8787/api/_test/protected` (no header) → 401 envelope (AC-4).
   - `curl -H "X-Session-Token: test-token" http://localhost:8787/api/_test/protected` → 200 envelope with `userId: "u1"` (AC-3).
   - `curl -H "X-Session-Token: bogus" http://localhost:8787/api/_test/protected` → 401 envelope (AC-4).
   - **Remove the temp route from final commit** and document in Completion Notes.
6. **Validation error verification (temporary scaffolding allowed, must be removed before final commit):**
   - Mount temp `app.post('/api/_test/validate', async (c) => { const body = await c.req.json(); z.object({ x: z.string() }).parse(body); return c.json({ data: body, error: null }) })`.
   - `curl -X POST -H "Content-Type: application/json" -d '{"x":123}' http://localhost:8787/api/_test/validate` → 400 envelope `VALIDATION_ERROR` (AC-5).
   - **Remove the temp route from final commit.**
7. CORS preflight: `curl -X OPTIONS -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: X-Session-Token" http://localhost:8787/api/health -i` → 204/200 with `access-control-allow-origin: http://localhost:5173` and `X-Session-Token` in `access-control-allow-headers` (AC-8).
8. `pnpm lint && pnpm typecheck` → zero errors (AC-11).

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security — KV session model, 30-day TTL, X-Session-Token header pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns — Hono v4.12, error envelope, REST style]
- [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns — `{ data, error }` envelope, status codes, ISO 8601 dates, JSON field naming]
- [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns — `app.onError` ZodError pattern, KV/D1 helper enforcement]
- [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines — D1 only via `lib/db.ts`, KV only via `lib/kv.ts`, throw-don't-return for errors]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries — `apps/api/src/` layout: routes/, middleware/, lib/, types/]
- [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure & Deployment — wrangler.toml bindings: D1, KV, R2, Rate Limiter `[[unsafe.bindings]]`]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3 — acceptance criteria]
- [Source: _bmad-output/implementation-artifacts/1-1-monorepo-scaffold-with-turborepo-and-pnpm-workspaces.md — deferred review findings: CORS, app.onError, app.notFound, Hono Bindings; current `apps/api` scaffold state]
- [Source: _bmad-output/implementation-artifacts/1-2-react-spa-with-vite-and-cloudflare-pages-adapter.md — Vite dev server URL `http://localhost:5173` for CORS whitelist]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (claude-opus-4-7)

### Debug Log References

- Zod resolved to `^4.4.1` (latest stable for April 2026). Imported `ZodError` and `z` from `zod` directly in `apps/api`. Story 1.4 will install zod in `packages/shared` for shared schemas — same major version (`^4`) keeps both packages aligned.
- `wrangler dev --local` accepts placeholder IDs for D1 (`00000000-0000-0000-0000-000000000000`) and KV (`00000000000000000000000000000000`); local simulators are created in `.wrangler/state/`. The `[[unsafe.bindings]]` block emits a warning ("'unsafe' fields are experimental and may change or break at any time") on every command — expected, not a failure.
- KV seeding for AC-3 verification used `pnpm dlx wrangler kv key put --binding=KV "test-token" '...' --local`. Wrangler 4.x uses space-separated subcommands (`kv key put`), not the legacy colon syntax (`kv:key put`).
- `MBTI_TYPES` import removed from `apps/api/src/index.ts` since `typesCount` was dropped. `@mbti/shared` is still listed as a workspace dep — kept for future routes.

### Completion Notes List

- All 11 acceptance criteria verified end-to-end via `wrangler dev --local` + curl.
- Temporary verification scaffolding (3 routes: `/api/_test/protected`, `/api/_test/validate`, `/api/_test/throw`) was added to `src/index.ts` to exercise AC-3, AC-4, AC-5, AC-6, then **fully removed**. Final `src/index.ts` contains only `/api/health` plus global CORS, `notFound`, and `onError` handlers. Re-curl confirmed temp routes return 404 after removal.
- Hono Bindings + Variables generic propagates types into all middleware: `c.env.KV` is `KVNamespace`, `c.get('userId')` is `string`, etc. — verified by `pnpm typecheck` passing.
- `requireSession` middleware deliberately RETURNS the 401 envelope rather than throwing, matching the architecture's session-validation pattern (`architecture.md#Process Patterns`). This is the documented exception to the throw-don't-return rule because the middleware itself owns the formatting for that error case.
- `lib/db.ts` ships as a stub (only `DbContext` type) per scope. Real D1 query helpers land in Story 1.5.
- Rate Limiter binding declared but no middleware exists yet — first feature route requiring rate limiting will add `apps/api/src/middleware/rateLimit.ts`.
- All previously-deferred review findings from Story 1.1 are now closed: CORS middleware, `app.onError`, `app.notFound`, Hono Bindings type.
- `pnpm dev` from the monorepo root continues to start both apps in parallel (Story 1.1 contract preserved). `pnpm lint` and `pnpm typecheck` remain at zero errors across all 3 packages.

### File List

- apps/api/package.json (MODIFIED — added `zod ^4.4.1` dependency)
- apps/api/wrangler.toml (MODIFIED — added `[[d1_databases]]`, `[[kv_namespaces]]`, `[[r2_buckets]]`, `[[unsafe.bindings]]` Rate Limiter blocks with placeholder IDs and TODO comments referencing Stories 1.5/1.6)
- apps/api/src/index.ts (MODIFIED — replaced minimal app with typed Hono `<{ Bindings; Variables }>`, mounted `corsMiddleware`, simplified `/api/health` to `{status:'ok'}`, added `app.notFound` 404 envelope, added `app.onError` ZodError→400 + fallback→500. Removed `MBTI_TYPES` import.)
- apps/api/src/types/bindings.ts (NEW — `Bindings` + `Variables` types for D1, KV, R2, RateLimit, userId)
- apps/api/src/lib/kv.ts (NEW — `SessionData` type, `getSession`, `setSession`, `deleteSession` helpers with 30-day TTL)
- apps/api/src/lib/db.ts (NEW — stub with `DbContext` type and JSDoc note for Story 1.5+)
- apps/api/src/middleware/auth.ts (NEW — `requireSession` middleware reading `X-Session-Token`, 401 envelope on miss/invalid, attaches `userId` to context)
- apps/api/src/middleware/cors.ts (NEW — `corsMiddleware` from `hono/cors`, whitelist `http://localhost:5173`, allows `X-Session-Token` header)
- pnpm-lock.yaml (MODIFIED — `pnpm add zod` updated lockfile)

## Change Log

- 2026-04-30: Story 1.3 implemented — Hono Workers API with typed Bindings, KV session auth middleware, CORS, response envelope error handlers (`onError`/`notFound`), and `wrangler.toml` bindings (D1, KV, R2, Rate Limiter). All 11 ACs verified via `wrangler dev --local` + curl. Closes deferred Story 1.1 review findings.
- 2026-04-30: Code review applied — 7 patches resolved (3 High / 3 Med / 1 Low). Hardened auth middleware (session shape validation, header trim), KV helpers (try/catch for malformed JSON, `session:` key prefix), and global error handlers (`HTTPException` branch, error logging, 404 warn logging). 14 findings deferred to Stories 1.5–1.7 / architecture review (see `### Review Findings` and `deferred-work.md`).
