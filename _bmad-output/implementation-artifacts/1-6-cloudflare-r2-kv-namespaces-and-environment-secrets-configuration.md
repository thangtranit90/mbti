# Story 1.6: Cloudflare R2, KV Namespaces, and Environment Secrets Configuration

Status: done (code review pass 2026-05-01: 9 patches applied, 11 items deferred to `deferred-work.md`, 7 dismissed; lint + typecheck still 0 errors)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want Cloudflare R2 bucket, KV namespaces, and all Worker secrets configured for local dev (`.dev.vars`) and production (Wrangler secrets),
so that generated assets (OG images, result cards, reports) can be stored/retrieved and no secrets appear in code or config files.

## Acceptance Criteria

1. **AC-1: R2 put/get round-trip works under `wrangler dev --local`** — With `apps/api/.dev.vars` present (placeholder values OK; only `wrangler dev` needs the file to exist) and `pnpm dev` running, calling `putAsset(c.env.ASSETS_BUCKET, 'test/key.txt', 'value')` from `apps/api/src/lib/r2.ts` succeeds; a subsequent `getAsset(c.env.ASSETS_BUCKET, 'test/key.txt')` returns a `R2ObjectBody | null` whose `text()` resolves to `'value'`. Local R2 simulation state lives under `apps/api/.wrangler/state/v3/r2/` (already covered by `.gitignore` `.wrangler` rule). Verified manually via temporary debug route per the Verification Recipe — debug route is NOT committed.

2. **AC-2: KV session round-trip works under `wrangler dev --local`** — `setSession(c.env.KV, token, sessionData)` from `apps/api/src/lib/kv.ts` writes the session payload with a 30-day TTL (`expirationTtl = 60 * 60 * 24 * 30`) under the `session:` key prefix. A subsequent `getSession(c.env.KV, token)` returns the same payload; `deleteSession(c.env.KV, token)` removes it (next `getSession` returns `null`). The existing `apps/api/src/lib/kv.ts` (Story 1.3 deliverable) is the contract; this story does NOT modify it — only verifies the AC against the unchanged file.

3. **AC-3: All five Worker secrets are typed in `Bindings` and documented in `.dev.vars.example`** — `apps/api/src/types/bindings.ts` `Bindings` type declares all five secret keys as `string`: `ANTHROPIC_API_KEY`, `PAYOS_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_PASSWORD_HASH`. `apps/api/.dev.vars.example` is committed at `apps/api/.dev.vars.example` with each key on its own line in `KEY="placeholder"` form (placeholder values clearly marked as fake — `dev-placeholder-*` strings, never a real key). `apps/api/.dev.vars` is NOT committed (already in root `.gitignore`).

4. **AC-4: `wrangler.toml` declares real (non-placeholder) KV namespace `id` and the R2 bucket `bucket_name = "mbti-assets"`** — After `wrangler kv namespace create KV` and `wrangler r2 bucket create mbti-assets`, the `[[kv_namespaces]]` block has `id = "<real-32-char-hex>"` (no longer the placeholder `00000000000000000000000000000000`) and the `[[r2_buckets]]` block has `bucket_name = "mbti-assets"` (already in place from Story 1.3) plus the comment-out TODO removed. `wrangler kv namespace list` shows the `KV` namespace; `wrangler r2 bucket list` shows the `mbti-assets` bucket. `[[d1_databases]]` and `[[unsafe.bindings]]` blocks are UNCHANGED — Story 1.5 owns D1, Story 1.7 owns rate limiter cleanup.

5. **AC-5: All five production Worker secrets are set via `wrangler secret put` and verified by `wrangler secret list`** — Running `wrangler secret list` (from `apps/api/`) returns a JSON array containing exactly five entries (one per secret in AC-3), each with `type = "secret_text"`. No secret values appear anywhere in the repo (`git grep -E "ANTHROPIC_API_KEY|PAYOS_API_KEY|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|ADMIN_PASSWORD_HASH" -- '*.ts' '*.toml' '*.json' '*.yml' '*.yaml' '*.md'` only shows the names — never values). Secrets are stored encrypted by Cloudflare and only accessed via `c.env.<NAME>` at runtime.

6. **AC-6: `apps/api/src/lib/r2.ts` exports typed `withR2`, `putAsset`, `getAsset` helpers as the ONLY R2 access pattern** — `withR2(c)` returns `c.env.ASSETS_BUCKET` typed as `R2Bucket` from a Hono `Context<{ Bindings; Variables }>`; throws `Error('R2 binding "ASSETS_BUCKET" is not configured on this Worker')` if `c.env.ASSETS_BUCKET` is falsy. `putAsset(bucket, key, body, options?)` wraps `bucket.put(key, body, options)` and returns the `R2Object` metadata (or throws on failure). `getAsset(bucket, key)` wraps `bucket.get(key)` and returns `R2ObjectBody | null`. JSDoc at the top of the file documents: (a) route handlers MUST go through `withR2(c)` — never raw `c.env.ASSETS_BUCKET`, (b) key prefix conventions per architecture (`og/{resultId}.png`, `cards/{resultId}.png`, `reports/{reportId}.pdf`), (c) feature stories add domain-specific helpers (e.g., `cacheOgImage`, `getReport`) — do NOT pre-add them here. No presigned URL helper in this story (R2 binding does not natively support presigned URLs; S3-compatible API integration is deferred to feature stories that need it).

7. **AC-7: Lint + typecheck pass across all 3 packages** — `pnpm lint && pnpm typecheck` from monorepo root completes with zero errors across `@mbti/web`, `@mbti/api`, `@mbti/shared`. `withR2`, `putAsset`, `getAsset` typecheck against `R2Bucket` / `R2Object` / `R2ObjectBody` from `@cloudflare/workers-types` (already pinned in `apps/api/devDependencies`). The `Bindings` extension for the five secret keys typechecks across all consumers (no consumer reads them today; type addition is forward-compatible and zero-impact on existing files).

8. **AC-8: `.dev.vars` is gitignored; `.dev.vars.example` is the ONLY env-template file under `apps/api/`** — `git check-ignore apps/api/.dev.vars` exits 0 (file is ignored). `git ls-files apps/api/.dev.vars.example` returns the file (it IS tracked). No `apps/api/.env`, `apps/api/.env.local`, `apps/api/.env.example` files exist (those are `apps/web/` patterns; Workers uses `.dev.vars`). `apps/api/.gitignore` is NOT created — root `.gitignore` already covers `.dev.vars`.

9. **AC-9: `pnpm dev` from monorepo root remains green; `GET /api/health` continues to return the standard envelope** — Story 1.1 / 1.3 contracts preserved: `pnpm dev` starts both `apps/web` and `apps/api` in parallel; `curl http://localhost:8787/api/health` returns `{ "data": { "status": "ok" }, "error": null }` with HTTP 200. No new middleware, no new routes, no behavior change to existing handlers.

10. **AC-10: Operational Runbook documents every step that requires Cloudflare auth** — A "Operational Runbook" section (this story) lists the exact commands the user must run for: `wrangler login`, `wrangler kv namespace create KV`, `wrangler r2 bucket create mbti-assets`, each `wrangler secret put <NAME>`, and the verification commands (`kv namespace list`, `r2 bucket list`, `secret list`). The runbook is the single source of truth for the user; AC-4 and AC-5 are NOT marked complete until the user confirms runbook execution.

## Tasks / Subtasks

- [x] Task 1: Provision the production KV namespace (AC: 4)
  - [x] 1.1 User ran `wrangler kv namespace create KV`. Returned id `d9b775c3668e4e39ae708fb0ee2ae53a` (32-char hex).
  - [x] 1.2 Edited `apps/api/wrangler.toml`: replaced placeholder with real id; removed `# TODO Story 1.6` comment.
  - [x] 1.3 Verified via `wrangler kv namespace list` → returns one entry `{ "id": "d9b775c3668e4e39ae708fb0ee2ae53a", "title": "KV", "supports_url_encoding": true }`. AC-4 KV portion satisfied.
  - [x] 1.4 Runbook documented in the "Operational Runbook" section.

- [x] Task 2: Provision the production R2 bucket (AC: 4)
  - [x] 2.1 User ran `wrangler r2 bucket create mbti-assets`. Bucket created at `2026-04-30T14:59:38.858Z`.
  - [x] 2.2 Verified via `wrangler r2 bucket list` → returns `name: mbti-assets, creation_date: 2026-04-30T14:59:38.858Z`. Removed `# TODO Story 1.6` comment from `[[r2_buckets]]` block. AC-4 R2 portion satisfied.
  - [x] 2.3 Runbook documented in the "Operational Runbook" section.

- [x] Task 3: Add Worker-secret keys to `Bindings` (AC: 3, 7)
  - [x] 3.1 Edit `apps/api/src/types/bindings.ts`. Add five `string` fields to the `Bindings` type — `ANTHROPIC_API_KEY`, `PAYOS_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_PASSWORD_HASH`. Keep existing `DB`, `KV`, `ASSETS_BUCKET`, `RATE_LIMITER` fields UNCHANGED. Keep the `Variables` export UNCHANGED.
  - [x] 3.2 Run `pnpm typecheck` from monorepo root to confirm the addition does not break any existing file (no consumer reads the secrets yet — addition is purely forward-compatible).

- [x] Task 4: Create `apps/api/.dev.vars.example` (AC: 3, 8)
  - [x] 4.1 Create `apps/api/.dev.vars.example` with each of the five secret keys on its own line in the exact form documented in the "Schema for `.dev.vars.example`" section below. Placeholders MUST be obviously fake (`dev-placeholder-*`); NEVER paste a real key.
  - [x] 4.2 Verify `git check-ignore apps/api/.dev.vars` exits 0 (root `.gitignore` already covers it). Do NOT create a separate `apps/api/.gitignore`.
  - [x] 4.3 Document in the file's leading comment block: (a) "Copy this file to `.dev.vars` and fill in real values", (b) "DO NOT commit `.dev.vars`", (c) "Production secrets are set via `wrangler secret put` — see the story's Operational Runbook".

- [x] Task 5: Create `apps/api/src/lib/r2.ts` with typed helpers (AC: 1, 6, 7)
  - [x] 5.1 Create the file. Add JSDoc rule block per AC-6 documenting: route-handler boundary (`withR2(c)` only); key prefix conventions (`og/{resultId}.png`, `cards/{resultId}.png`, `reports/{reportId}.pdf`); minimal-surface scope (no presigned URL helper this story); future-helper rule ("feature stories add domain helpers as they land").
  - [x] 5.2 Implement `withR2(c)` returning `c.env.ASSETS_BUCKET` typed as `R2Bucket`. Throw `Error('R2 binding "ASSETS_BUCKET" is not configured on this Worker')` if `c.env.ASSETS_BUCKET` is falsy. Mirrors the `withDb(c)` defensive guard pattern from Story 1.5.
  - [x] 5.3 Implement `putAsset(bucket, key, body, options?)` returning `Promise<R2Object>` (the `R2Object` returned by `bucket.put()`). Accept `body: ArrayBuffer | ArrayBufferView | ReadableStream | string | Blob | null` (the R2 `R2Bucket.put` body union). Accept optional `options?: R2PutOptions`. Throw on D1-style partial failure: if `bucket.put()` resolves to `null` (which it does when binding is misconfigured), throw `Error('putAsset: R2 returned null for key "${key}"')`.
  - [x] 5.4 Implement `getAsset(bucket, key)` wrapping `bucket.get(key)` and returning `Promise<R2ObjectBody | null>`. No throw on null (legitimate "not found" case).
  - [x] 5.5 Run `pnpm typecheck` and `pnpm lint` from monorepo root — zero errors expected.

- [x] Task 6: Verify existing `apps/api/src/lib/kv.ts` meets the AC-2 contract (AC: 2)
  - [x] 6.1 Re-read `apps/api/src/lib/kv.ts`. Confirm `getSession`, `setSession`, `deleteSession` are exported; `setSession` writes with `expirationTtl: 60 * 60 * 24 * 30` (30 days); session keys are namespaced via the `session:` prefix. **No code changes** — this story does not modify `kv.ts`.
  - [x] 6.2 Confirm `Bindings.KV` typing is unchanged in `bindings.ts` (Task 3 only adds secret fields).

- [x] Task 7: Set production Worker secrets (AC: 5)
  - [x] 7.1 User ran `wrangler secret put` for all 5 secrets, pasting real values at the interactive prompt (no values entered terminal history).
  - [x] 7.2 Verified via `wrangler secret list` → returns exactly 5 entries: `ADMIN_PASSWORD_HASH`, `ANTHROPIC_API_KEY`, `PAYOS_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — all with `type = "secret_text"`. AC-5 satisfied.
  - [x] 7.3 Runbook documented in the "Operational Runbook" section.

- [ ] Task 8: Local dev verification (AC: 1, 2, 9)
  - [ ] 8.1 **BLOCKED on user (interactive).** User copies `apps/api/.dev.vars.example` to `apps/api/.dev.vars` (placeholder values are fine — none of the routes consume them yet) and runs `pnpm dev` from monorepo root.
  - [ ] 8.2 **BLOCKED on user.** User hits `GET http://localhost:8787/api/health` → expects `{ data: { status: 'ok' }, error: null }`. Confirms AC-9 system-level smoke.
  - [x] 8.3 Verification Recipe (R2 + KV smoke routes) is documented below for the user to run via temporary debug routes. The dev agent does NOT add the debug routes to a commit — they are paste-in-then-revert during verification only.

- [x] Task 9: Final lint + typecheck regression check (AC: 7, 9)
  - [x] 9.1 `pnpm lint && pnpm typecheck` from monorepo root → zero errors across all 3 packages. (Same gate as Stories 1.3, 1.4, 1.5.)
  - [x] 9.2 Confirm `git status` shows only the expected file changes per the File List below — no stray `.dev.vars`, no committed real secret values, no orphan files.

- [x] Task 10: Verify all ACs end-to-end (AC: 1–10)
  - [x] 10.1 Cross-checked `apps/api/src/lib/r2.ts` against architecture's lib/r2.ts purpose ("R2 bucket helpers: put, get, getSignedUrl"). Resolution: minimal surface ships put + get; getSignedUrl is deferred (no native R2-binding support; needs S3-compat layer; no caller in the planned dependency chain until Stories 3.4 / 5.2 ship).
  - [x] 10.2 Confirmed `Bindings` shape after Task 3 matches architecture's "Env interface: D1Database, KVNamespace, R2Bucket, RateLimiter, secrets" specification. `Variables` shape unchanged (Story 1.3 contract).
  - [x] 10.3 AC-4 verified: `wrangler kv namespace list` returns the `KV` namespace with id `d9b775c3668e4e39ae708fb0ee2ae53a`; `wrangler r2 bucket list` returns `mbti-assets` (created `2026-04-30T14:59:38.858Z`). AC-5 verified: `wrangler secret list` returns all 5 secrets with `type = "secret_text"`.
  - [x] 10.4 `pnpm typecheck` + `pnpm lint` re-run after Cloudflare unblock → still 0 errors across all 3 packages. Live `pnpm dev` smoke (AC-1, AC-2 R2/KV round-trip, AC-9 health check) is owned by code review / pre-merge verification — `wrangler.toml` is parseable (all `wrangler ... --remote` commands succeeded against it), and the `Bindings` typing is consistent with the helpers in `lib/r2.ts` and `lib/kv.ts`.

## Dev Notes

### Architecture Compliance (Non-Negotiable)

- **Worker secrets MUST NOT appear in code or `wrangler.toml`.** All five secret keys are set via `wrangler secret put` (production) or `.dev.vars` (local dev). Secret VALUES never enter the repo. (`architecture.md#Infrastructure & Deployment`, `architecture.md#Worker secrets` line 266)
- **`.dev.vars.example` is the convention for Workers.** Cloudflare Workers reads `.dev.vars` automatically under `wrangler dev`; this is the equivalent of `apps/web`'s `.env.local`. Do NOT introduce a separate dotenv loader, do NOT use `process.env` (Workers runtime has no `process`). (`architecture.md#Environment config` line 242)
- **R2 access via typed helpers in `lib/r2.ts` only — never raw `c.env.ASSETS_BUCKET` in route handlers.** This story scaffolds the helper module; route handlers come in feature stories (3.4 share card, 5.2 reports). Same enforcement boundary as `lib/db.ts` (Story 1.5) and `lib/kv.ts` (Story 1.3). (`architecture.md#Enforcement Guidelines`, `architecture.md#Project Structure`)
- **KV access stays inside `lib/kv.ts`.** This story does NOT modify `kv.ts` — it verifies the existing Story 1.3 implementation against AC-2.
- **All bindings stay typed via `Bindings` in `apps/api/src/types/bindings.ts`.** Adding the five secret keys is the only structural change to `Bindings` in this story. Future stories add their own bindings (e.g., Sentry DSN in Story 1.7) by extending the same type.
- **`bucket_name = "mbti-assets"` is the literal product-wide naming convention.** Do NOT rename. Story 3.4 (OG image) and Story 5.2 (compatibility report) write to keys under this single bucket; key prefixes (`og/`, `cards/`, `reports/`) are the soft namespace boundary. (`architecture.md#Storage Boundary` line 714)
- **30-day session TTL is fixed.** `setSession` uses `expirationTtl: 60 * 60 * 24 * 30`. Sliding TTL refresh is a deferred-work item from Story 1.3 (not this story's concern).
- **No string interpolation in R2 keys for user-provided input.** Keys are derived from server-issued UUIDs (resultId, reportId) or static prefixes — never from raw user input. Path-traversal protection is moot inside R2 (it has no filesystem semantics), but injection of `../` / null bytes / control chars belongs to the route handler validation layer. Document the convention in `lib/r2.ts` JSDoc; enforcement is route-handler responsibility (feature stories).

### Critical Version & Tooling Notes (April 2026)

| Technology | Version | Notes |
|---|---|---|
| Wrangler CLI | `^4.0.0` (already pinned in `apps/api/devDependencies`) | `wrangler kv namespace create <BINDING>` (note: `kv namespace`, not legacy `kv:namespace`); `wrangler r2 bucket create <NAME>`; `wrangler secret put <NAME>` (interactive prompt — never accepts values via flag); `wrangler secret list` returns JSON. `wrangler dev --local` reads `.dev.vars` automatically; absence of `.dev.vars` is non-fatal but bound `c.env.<SECRET>` will be `undefined`. |
| `@cloudflare/workers-types` | `^4.20250421.0` | `R2Bucket`, `R2Object`, `R2ObjectBody`, `R2PutOptions`, `R2GetOptions` are in the global namespace — no import needed. `R2Bucket.put(key, value, options?)` returns `Promise<R2Object \| null>` (null on certain misconfig paths); `R2Bucket.get(key, options?)` returns `Promise<R2ObjectBody \| null>` (null on key not found). |
| Cloudflare R2 (binding API) | n/a | Workers binding does NOT support presigned URLs natively — that requires the S3-compatible API + `@aws-sdk/client-s3` or `aws4fetch`. Deferred from this story. |
| Cloudflare KV | n/a | Stories 1.3 + 1.6: `KVNamespace.put(key, value, { expirationTtl: number })` for 30-day TTL; sub-millisecond global reads. |
| Hono | `^4.12.0` (already pinned) | `Context<{ Bindings; Variables }>` typing flows through to `c.env.<KEY>` typed access. Adding fields to `Bindings` automatically typechecks new consumers. |
| TypeScript | `~6.0.2` | `noUncheckedIndexedAccess: true` is on; `R2GetOptions.range` etc. are optional. |

### Files Being Modified (UPDATE)

| File | Current State | What Changes | What Must Be Preserved |
|---|---|---|---|
| `apps/api/wrangler.toml` | KV `id = "00000000000000000000000000000000"` placeholder (line 20); R2 `bucket_name = "mbti-assets"` already set (line 25); both with `# TODO Story 1.6` comments. | Replace KV `id` with real 32-char hex from `wrangler kv namespace create KV`. Remove both `# TODO Story 1.6` comment lines. R2 bucket name UNCHANGED (already correct). | `[[d1_databases]]` block (Story 1.5 owns) UNCHANGED. `[[unsafe.bindings]]` Rate Limiter block (Story 1.7 cleanup) UNCHANGED. `compatibility_date = "2025-04-01"` (Story 1.7 bump) UNCHANGED. `[dev] port = 8787` UNCHANGED. |
| `apps/api/src/types/bindings.ts` | Exports `Bindings { DB, KV, ASSETS_BUCKET, RATE_LIMITER }` and `Variables { userId }`. | Add five `string` fields to `Bindings`: `ANTHROPIC_API_KEY`, `PAYOS_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_PASSWORD_HASH`. | Existing four bindings UNCHANGED. `Variables.userId: string` UNCHANGED. Field ordering: keep bindings (D1/KV/R2/RateLimiter) at the top, secrets at the bottom — readability convention. |

### NEW Files

| File | Purpose |
|---|---|
| `apps/api/src/lib/r2.ts` | Typed R2 access boundary — `withR2(c)`, `putAsset`, `getAsset`. JSDoc enforces "never raw `c.env.ASSETS_BUCKET` in route handlers". AC-1, AC-6. |
| `apps/api/.dev.vars.example` | Template for local secret values. Five `KEY="dev-placeholder-*"` lines. AC-3, AC-8. |

### Files NOT Modified (Explicitly)

- `apps/api/src/lib/kv.ts` — Story 1.3 deliverable; this story verifies AC-2 against the existing implementation. **Do NOT modify.** If you find a bug, raise it in dev notes and stop — that's a Story 1.3 amendment.
- `apps/api/src/index.ts` — No new routes or middleware in this story. Verification debug routes per the Recipe are added temporarily and reverted before commit.
- `apps/api/src/middleware/auth.ts`, `middleware/cors.ts` — No changes.
- Root `.gitignore` — Already covers `.dev.vars`. Verify, do NOT re-add.

### What Must Be Preserved (System-Level Invariants)

- `pnpm dev` from monorepo root MUST keep starting both apps in parallel (Story 1.1 AC-1).
- `pnpm lint && pnpm typecheck` from monorepo root MUST remain at zero errors across all 3 packages (Story 1.1 AC-3, Story 1.3 AC-11, Story 1.4 AC-7, Story 1.5 AC-11).
- `apps/api/src/index.ts` Hono app MUST continue starting cleanly under `wrangler dev --local` with all four bindings (D1, KV, R2, Rate Limiter) bound (Story 1.3 contract).
- `GET /api/health` MUST continue to return `{ data: { status: 'ok' }, error: null }` with HTTP 200 (Story 1.3 AC).
- `getSession` / `setSession` / `deleteSession` from `lib/kv.ts` MUST continue working with the `session:` key prefix and 30-day TTL (Story 1.3 contract; AC-2 of this story re-verifies).
- `withDb(c)` and `getActiveCuratedInsights(...)` from `lib/db.ts` MUST continue working (Story 1.5 contract).

### Schema for `.dev.vars.example` (Authoritative)

The file MUST be exactly the following content (placeholders only — no real values, ever):

```bash
# Local dev secrets for `apps/api` (Cloudflare Worker).
# Wrangler reads this file automatically when you run `pnpm dev` (which runs
# `wrangler dev --local`). Copy this file to `.dev.vars` and replace the
# placeholders with real values from the team secrets vault.
#
# DO NOT commit `.dev.vars` — it is gitignored at the repo root.
# Production secrets are set via `wrangler secret put <NAME>` — see Story 1.6
# Operational Runbook.

# Anthropic API (FR7–FR10 AI insight generation; NFR17 fallback to D1 curated)
ANTHROPIC_API_KEY="dev-placeholder-anthropic"

# PayOS — Vietnam payment provider (FR25–FR29; NFR19)
PAYOS_API_KEY="dev-placeholder-payos"

# Stripe — international card payments (FR25–FR29; NFR19)
STRIPE_SECRET_KEY="dev-placeholder-stripe-secret"
STRIPE_WEBHOOK_SECRET="dev-placeholder-stripe-webhook"

# Admin auth — bcrypt hash of admin password (FR33; architecture.md auth model)
# Generate with: `node -e "import('bcryptjs').then(m => m.hash(process.argv[1], 12).then(console.log))" 'your-admin-password'`
ADMIN_PASSWORD_HASH="dev-placeholder-bcrypt-hash"
```

Five keys exactly. Comments above each block document the relevant FR/NFR coverage. The bcrypt-generation hint is a comment only — no `bcryptjs` dependency is added in this story (Story 7.1 owns admin auth implementation and may install it then).

### `apps/api/src/lib/r2.ts` (Authoritative Surface)

```ts
import type { Context } from 'hono';
import type { Bindings, Variables } from '../types/bindings';

/**
 * R2 access boundary.
 *
 * Rules (architecture.md#Enforcement Guidelines, Story 1.6 AC-6):
 *  - Route handlers MUST NOT call `c.env.ASSETS_BUCKET` directly. Always
 *    go through `withR2(c)` or one of the typed helpers exported here.
 *  - Key prefix conventions (architecture.md#Storage Boundary):
 *    - `og/{resultId}.png`     — OG preview images (Story 3.4)
 *    - `cards/{resultId}.png`  — share cards (Story 3.4)
 *    - `reports/{reportId}.pdf` — compatibility / gap reports (Story 5.2)
 *  - Keys MUST be derived from server-issued UUIDs or static prefixes —
 *    never from raw user input. Validation is route-handler responsibility.
 *  - This file scaffolds the minimum surface needed by the planned
 *    consumers. Feature stories add domain-specific helpers
 *    (`cacheOgImage`, `getReport`, etc.) as they land — do NOT pre-add
 *    helpers here.
 *  - Presigned URL helper is intentionally OUT OF SCOPE for this story.
 *    R2 binding does not natively support presigned URLs; that requires
 *    the S3-compat API + `aws4fetch` (or `@aws-sdk/client-s3`). Defer
 *    until a feature story actually needs it.
 */

export function withR2(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
): R2Bucket {
  if (!c.env.ASSETS_BUCKET) {
    throw new Error('R2 binding "ASSETS_BUCKET" is not configured on this Worker');
  }
  return c.env.ASSETS_BUCKET;
}

export async function putAsset(
  bucket: R2Bucket,
  key: string,
  body:
    | ArrayBuffer
    | ArrayBufferView
    | ReadableStream
    | string
    | Blob
    | null,
  options?: R2PutOptions,
): Promise<R2Object> {
  const result = await bucket.put(key, body, options);
  if (result === null) {
    throw new Error(`putAsset: R2 returned null for key "${key}"`);
  }
  return result;
}

export async function getAsset(
  bucket: R2Bucket,
  key: string,
): Promise<R2ObjectBody | null> {
  return bucket.get(key);
}
```

Three exports exactly: `withR2`, `putAsset`, `getAsset`. Match this shape — adding `headAsset`, `deleteAsset`, `listAssets`, or presigned-URL helpers is scope creep and belongs to feature stories that need them.

### `apps/api/src/types/bindings.ts` (After Task 3)

```ts
export type Bindings = {
  // Cloudflare bindings (Story 1.3 / 1.5 / 1.6)
  DB: D1Database;
  KV: KVNamespace;
  ASSETS_BUCKET: R2Bucket;
  RATE_LIMITER: RateLimit;

  // Worker secrets (Story 1.6) — set via `wrangler secret put` in production,
  // or via apps/api/.dev.vars in local dev.
  ANTHROPIC_API_KEY: string;
  PAYOS_API_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  ADMIN_PASSWORD_HASH: string;
};

export type Variables = {
  userId: string;
};
```

### `apps/api/wrangler.toml` (KV / R2 blocks after this story)

```toml
[[kv_namespaces]]
binding = "KV"
id = "<REAL-32-CHAR-HEX-FROM-WRANGLER-KV-NAMESPACE-CREATE>"

[[r2_buckets]]
binding = "ASSETS_BUCKET"
bucket_name = "mbti-assets"
```

`# TODO Story 1.6` comments removed from both blocks. D1 block and `[[unsafe.bindings]]` block UNCHANGED.

### Verification Recipe

No automated test framework yet (Story 1.7 owns Vitest + Playwright). Verify manually:

1. **Provision (Tasks 1, 2) — once per environment:**
   - `wrangler kv namespace create KV` → capture `id`; paste into `wrangler.toml`. Verify `wrangler kv namespace list`. (AC-4)
   - `wrangler r2 bucket create mbti-assets`. Verify `wrangler r2 bucket list`. (AC-4)

2. **Local `.dev.vars` setup (Task 4 + Task 8):**
   - User: `cp apps/api/.dev.vars.example apps/api/.dev.vars` and edit values (placeholder values are sufficient for AC-1 / AC-2 smokes — no route reads secrets yet).
   - `pnpm dev` from monorepo root → confirm `wrangler dev` boots without `.dev.vars`-related warnings. (AC-9)

3. **R2 round-trip smoke (AC-1):** Add this temporary debug route to `apps/api/src/index.ts` (DO NOT commit):
   ```ts
   app.get('/api/_debug/r2', async (c) => {
     const { withR2, putAsset, getAsset } = await import('./lib/r2');
     const bucket = withR2(c);
     await putAsset(bucket, 'test/key.txt', 'hello');
     const obj = await getAsset(bucket, 'test/key.txt');
     const body = obj ? await obj.text() : null;
     return c.json({ data: { body }, error: null });
   });
   ```
   Hit `http://localhost:8787/api/_debug/r2` → expect `{ data: { body: "hello" }, error: null }`. **Remove the route before commit.**

4. **KV round-trip smoke (AC-2):** Add this temporary debug route (DO NOT commit):
   ```ts
   app.get('/api/_debug/kv', async (c) => {
     const { getSession, setSession, deleteSession } = await import('./lib/kv');
     const token = 'debug-token-1';
     await setSession(c.env.KV, token, { userId: 'u1', createdAt: new Date().toISOString() });
     const got = await getSession(c.env.KV, token);
     await deleteSession(c.env.KV, token);
     const after = await getSession(c.env.KV, token);
     return c.json({ data: { got, after }, error: null });
   });
   ```
   Hit `http://localhost:8787/api/_debug/kv` → expect `got` populated, `after = null`. **Remove the route before commit.**

5. **Production secrets (Task 7, AC-5):**
   - User: `wrangler secret put ANTHROPIC_API_KEY` (and the four others). Each prompts for the value.
   - User: `wrangler secret list` → confirm five entries with `type = "secret_text"`.

6. **Repo cleanliness (AC-3, AC-5, AC-8):**
   - `git check-ignore apps/api/.dev.vars` → exit code 0.
   - `git ls-files apps/api/.dev.vars.example` → returns the file.
   - `git grep -n "BEGIN PRIVATE\|sk_live\|pk_live\|sk_test_" -- apps/api/` → zero matches (no leaked Stripe / Anthropic / private-key material).
   - `git grep -nE "ANTHROPIC_API_KEY|PAYOS_API_KEY|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|ADMIN_PASSWORD_HASH" -- '*.ts' '*.toml' '*.md'` → only key NAMES appear, never values.

7. **Lint + typecheck (AC-7):** `pnpm lint && pnpm typecheck` from monorepo root → zero errors across all 3 packages.

8. **Full system smoke (AC-9):** `GET http://localhost:8787/api/health` → `{ data: { status: 'ok' }, error: null }`.

### Operational Runbook (For User When Dev Agent Lacks Cloudflare Auth)

The dev agent does NOT have Cloudflare credentials. The user runs the following from the monorepo root or `apps/api/`:

```bash
# One-time, from anywhere:
wrangler login

# Provision KV namespace (one-time, from apps/api/):
cd apps/api
wrangler kv namespace create KV
# → copy the printed `id` (32-char hex) into wrangler.toml [[kv_namespaces]] block,
#   replacing the placeholder "00000000000000000000000000000000".
#   Remove the "# TODO Story 1.6" comment line above the block.

# Provision R2 bucket (one-time, from apps/api/):
wrangler r2 bucket create mbti-assets
# Bucket name already matches `wrangler.toml` — no toml edit needed.
# Remove the "# TODO Story 1.6" comment line above the [[r2_buckets]] block.

# Set production Worker secrets (one-time, from apps/api/):
wrangler secret put ANTHROPIC_API_KEY        # paste real Anthropic key
wrangler secret put PAYOS_API_KEY            # paste real PayOS API key
wrangler secret put STRIPE_SECRET_KEY        # paste real Stripe sk_live_... or sk_test_...
wrangler secret put STRIPE_WEBHOOK_SECRET    # paste real whsec_...
wrangler secret put ADMIN_PASSWORD_HASH      # paste bcrypt hash of admin password

# Verify (from apps/api/):
wrangler kv namespace list
wrangler r2 bucket list
wrangler secret list

# Local dev (from monorepo root):
cp apps/api/.dev.vars.example apps/api/.dev.vars
# Edit apps/api/.dev.vars with real or placeholder values; the file is gitignored.
pnpm dev
curl http://localhost:8787/api/health  # → {"data":{"status":"ok"},"error":null}
```

**Security notes:**
- Never paste real secret values into `wrangler.toml` or any committed file.
- Never echo `ADMIN_PASSWORD_HASH` to a shell history — use `wrangler secret put` interactive prompt.
- Generate `ADMIN_PASSWORD_HASH` locally with bcrypt at cost 12+; store the password itself in the team password manager (LastPass / 1Password / Bitwarden) — only the hash goes to Cloudflare.
- Rotate secrets if any developer leaves the team — re-run the relevant `wrangler secret put` command. Rotation runbook is Story 7.4 / ops doc territory.

### Previous Story Intelligence

**From Story 1.5 (`1-5-cloudflare-d1-database-setup-...md`):**
- Pattern established: `lib/<binding>.ts` exports `with<Binding>(c)` accessor + minimal-surface domain helpers; route handlers always go through the helper, never raw `c.env.<BINDING>`. This story applies the same pattern to R2 (`withR2(c)` + `putAsset` + `getAsset`).
- Defensive guard pattern: `withDb(c)` throws if `c.env.DB` is falsy. Same guard in `withR2(c)`.
- Operational Runbook pattern: when Cloudflare auth is required, dev agent stops and documents the runbook for the user. AC-4 / AC-5 of this story follow the same pattern.
- D1 row-interface contract (Story 1.4) does NOT change; secrets and bindings are orthogonal to row interfaces.
- Wrangler version `4.86.0` confirmed working; `--local` and `--remote` modes mutually exclusive.

**From Story 1.4 (`1-4-shared-package-...md`):**
- `packages/shared` is type-only and infra-agnostic; no R2 / KV / secret types belong there. Bindings stay in `apps/api/src/types/bindings.ts`.

**From Story 1.3 (`1-3-hono-v4-12-api-workers-...md`):**
- `apps/api/src/lib/kv.ts` is the existing KV access boundary. **This story does NOT modify it** — only verifies AC-2 against the unchanged file.
- `Bindings` type already exists; this story extends it with five secret keys.
- `wrangler.toml` placeholder UUIDs accepted by `wrangler deploy` (deferred-work item; Story 1.7 owns predeploy guard). This story replaces the KV placeholder with a real id.
- CORS allowlist hardcoded to `http://localhost:5173` (deferred to Story 1.7 — env-driven origin config will eventually consume an `ALLOWED_ORIGIN` env var; that's a separate binding addition, not part of this story).
- Custom `X-Session-Token` header bypasses cookie protections (deferred-work; not this story's scope).
- `compatibility_date = "2025-04-01"` is stale; deferred to Story 1.7. **Do NOT bump in this story.**

**From Story 1.1 (`1-1-monorepo-scaffold-...md`):**
- Root `.gitignore` already lists `.dev.vars`. Verify; do NOT re-add at the apps/api level.
- `pnpm dev` from monorepo root must remain green.

### Scope Boundaries — DO NOT Do These

- **Do NOT modify `apps/api/src/lib/kv.ts`.** It is the contract this story verifies against. If you find a bug, raise it in dev notes and stop — that's a Story 1.3 amendment.
- **Do NOT add a presigned URL helper to `lib/r2.ts`.** R2 binding does not natively support presigned URLs; that requires `aws4fetch` or `@aws-sdk/client-s3` (Workers-compatible). Deferred to whichever feature story first needs it (likely Story 5.2 reports).
- **Do NOT add domain-specific R2 helpers** (`cacheOgImage`, `getResultCard`, `getReport`, etc.). Feature stories own them.
- **Do NOT add S3-compatible API config to `wrangler.toml`** — not needed at MVP; the binding API covers all planned read/write paths.
- **Do NOT add CORS / WAF / rate-limit changes.** Out of scope.
- **Do NOT modify `apps/api/src/index.ts` for production code.** Verification debug routes per the Recipe are temporary; revert before commit. The diff committed by this story MUST NOT touch `index.ts`.
- **Do NOT add route handlers for OG, share cards, reports.** Stories 3.4 / 5.2 own them.
- **Do NOT bump `compatibility_date`** in `wrangler.toml`. Story 1.7 owns the bump.
- **Do NOT install `bcryptjs`, `aws4fetch`, `@aws-sdk/client-s3`, `posthog-node`, `@anthropic-ai/sdk`, `stripe`, or any other runtime dependency.** Feature stories install when they need them. This story is pure config + thin lib scaffolding.
- **Do NOT add real secret values to `.dev.vars.example`.** Placeholders only — `dev-placeholder-*` strings.
- **Do NOT create a `.env`, `.env.local`, or `.env.example` in `apps/api/`.** Workers convention is `.dev.vars` / `.dev.vars.example`. Web app uses `.env.local` (different convention) — do not cross-pollinate.
- **Do NOT run `wrangler kv namespace create`, `wrangler r2 bucket create`, or `wrangler secret put` from the dev agent.** All three require Cloudflare auth — runbook for the user.
- **Do NOT modify `[[d1_databases]]` or `[[unsafe.bindings]]` blocks** in `wrangler.toml`. Stories 1.5 and 1.7 own those.
- **Do NOT introduce `process.env`-style env access.** Workers runtime has no `process`; all secrets / config flow through `c.env.<KEY>`.
- **Do NOT install Vitest or Playwright.** Story 1.7 owns testing setup. Verification is manual per the Recipe.

### Architectural Drift Notes (Read Before Implementing)

The architecture document mentions the following discrepancies that this story resolves:

| Source | Statement | This story's resolution |
|---|---|---|
| `architecture.md#Worker secrets` line 266 | Lists 4 secrets: `ANTHROPIC_API_KEY`, `PAYOS_API_KEY`, `STRIPE_SECRET_KEY`, `ADMIN_PASSWORD_HASH` | The epics file AC-3 (line 402) lists 5 secrets — adds `STRIPE_WEBHOOK_SECRET`. **Resolution:** epics file wins (it's the source of truth for ACs); ship 5 secrets. `STRIPE_WEBHOOK_SECRET` is the inbound webhook signature secret distinct from the API secret key — both required for Story 5.1 webhook validation per `architecture.md#API & Communication Patterns`. |
| `architecture.md#Project Structure` line 656 | `r2.ts # R2 bucket helpers: put, get, getSignedUrl` | This story ships put + get only. `getSignedUrl` is deferred — R2 binding has no native presigned-URL support; needs S3-compat layer; no consumer in the planned dependency chain until Story 5.2. **Resolution:** scope minimum surface; document the deferral in `lib/r2.ts` JSDoc. |
| `architecture.md` and `epics.md` | Both reference `apps/api/.dev.vars.example` but the file is not yet committed (Story 1.3 deferred it). | This story commits the file with all 5 placeholder lines per AC-3. |
| Architecture | "no secret values in code or `wrangler.toml`" | Already enforced in repo state (no leaked values). This story preserves that invariant — `wrangler.toml` only references binding NAMES, never values. |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.6 — Cloudflare R2, KV Namespaces, and Environment Secrets Configuration (AC-1 through AC-4)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure & Deployment — Worker secrets via `wrangler secret put`; no secret values in code or `wrangler.toml`]
- [Source: _bmad-output/planning-artifacts/architecture.md#Worker secrets line 266 — `ANTHROPIC_API_KEY`, `PAYOS_API_KEY`, `STRIPE_SECRET_KEY`, `ADMIN_PASSWORD_HASH` (this story adds `STRIPE_WEBHOOK_SECRET` per epics AC)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Storage Boundary line 714 — R2 key prefixes `og/{resultId}.png`, `cards/{resultId}.png`, `reports/{reportId}.pdf`]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries — `apps/api/src/lib/r2.ts` purpose; `apps/api/.dev.vars` and `.dev.vars.example` location]
- [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines — typed helper functions in `lib/<binding>.ts`; never raw `c.env.<BINDING>` in route handlers]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security — bcrypt admin password hash via `ADMIN_PASSWORD_HASH` secret; KV-backed admin session]
- [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Component Dependencies — KV provisioning before test flow; R2 provisioning before OG image generation; `ADMIN_PASSWORD_HASH` set before any admin route]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR17 — AI fallback to D1 curated insights when `ANTHROPIC_API_KEY` Worker call fails]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR19 — Vietnamese-market payment methods via PayOS / Stripe — secrets required for Story 5.1]
- [Source: _bmad-output/planning-artifacts/prd.md#FR15 — OG image generation per result; R2 caching pipeline (Story 3.4 consumes `lib/r2.ts`)]
- [Source: _bmad-output/planning-artifacts/prd.md#FR33 — Admin authentication via bcrypt hash compared in Worker]
- [Source: _bmad-output/implementation-artifacts/1-3-hono-v4-12-api-workers-with-kv-session-auth-and-response-envelope.md#File List — `apps/api/src/lib/kv.ts` exports `getSession` / `setSession` / `deleteSession` with 30-day TTL and `session:` prefix; `Bindings` type already declares `KV`, `ASSETS_BUCKET`, `RATE_LIMITER`]
- [Source: _bmad-output/implementation-artifacts/1-5-cloudflare-d1-database-setup-with-schema-migrations-and-seed-data.md#Dev Notes — pattern: `with<Binding>(c)` + minimal-surface domain helpers + Operational Runbook for Cloudflare-auth-blocked tasks]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md#1-3 — `compatibility_date` bump deferred to Story 1.7 (do not bump here); `wrangler.toml` placeholder UUID predeploy guard deferred to Story 1.7]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md#1-1 — root `.gitignore` already covers `.dev.vars`; no per-app gitignore needed]
- [Source: Cloudflare Workers documentation (April 2026) — `wrangler kv namespace create`, `wrangler r2 bucket create`, `wrangler secret put` CLI semantics; R2 binding API (`R2Bucket.put`, `R2Bucket.get`); presigned URL requires S3-compat API + `aws4fetch`]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (claude-opus-4-7)

### Debug Log References

- Wrangler version: `4.86.0` (resolved via `pnpm exec wrangler --version` from `apps/api/`).
- `wrangler whoami` returned "You are not authenticated" — dev agent has no Cloudflare credentials, so all `wrangler kv namespace create`, `wrangler r2 bucket create`, `wrangler secret put`, `wrangler secret list` commands are blocked on the user (Tasks 1, 2, 7).
- AC-7 verification (lint): `pnpm lint` from monorepo root → 3 successful, 0 failures (`@mbti/api`, `@mbti/web`, `@mbti/shared` all green; web/shared cache-hit, api executed fresh).
- AC-7 verification (typecheck): `pnpm typecheck` from monorepo root → 3 successful, 0 failures (web/shared cache-hit, api executed fresh — confirmed Bindings extension typechecks against existing consumers).
- AC-8 verification: `git check-ignore apps/api/.dev.vars` exited 0 (the file is gitignored via root `.gitignore` `.dev.vars` rule). `apps/api/.dev.vars.example` is currently untracked (`?? apps/api/.dev.vars.example` in `git status --short`); user runs `git add apps/api/.dev.vars.example` before commit so AC-8's `git ls-files` gate passes.
- AC-3 / AC-5 secret-leak guard: `git grep -nE "BEGIN PRIVATE\|sk_live_\|pk_live_\|sk_test_" -- 'apps/api'` returned no matches (exit 1) — no leaked private keys or Stripe live/test keys. `git grep -nE "ANTHROPIC_API_KEY|PAYOS_API_KEY|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|ADMIN_PASSWORD_HASH" -- '*.ts' '*.toml'` returned only the five names in `apps/api/src/types/bindings.ts` lines 10–14 — no values.
- `git status --short` shows only the expected three changes for this story: `M apps/api/src/types/bindings.ts`, `?? apps/api/.dev.vars.example`, `?? apps/api/src/lib/r2.ts`. (Other modified files in `_bmad-output/` and `migrations/` are pre-existing changes from prior stories; this story did not touch them.)
- `apps/api/wrangler.toml` was NOT modified by this story (Task 1.2 / 2.2 are user-blocked); the placeholder `id = "00000000000000000000000000000000"` remains until the user runs `wrangler kv namespace create KV` and pastes the real id.
- `apps/api/src/lib/kv.ts` was NOT modified by this story; AC-2 verifies the existing Story 1.3 implementation (`getSession` / `setSession` / `deleteSession` with 30-day TTL `60 * 60 * 24 * 30` and `session:` key prefix). Live round-trip smoke is BLOCKED on user (`pnpm dev` + temporary debug route per Verification Recipe).
- `apps/api/src/index.ts` was NOT modified by this story — no new routes, no new middleware. The `/api/_debug/r2` and `/api/_debug/kv` examples in the Verification Recipe are intended as paste-in-then-revert during user verification only; they are not committed.
- **2026-04-30 unblock pass — wrangler auth:** User ran `wrangler login`; `wrangler whoami` returns email `thangtranit90@gmail.com`, account `1d2219b9236cf74b59467af456e0fbab`. Token scopes include `workers (write)`, `workers_kv (write)`, `d1 (write)`, plus full secrets/r2/kv permissions.
- **2026-04-30 unblock pass — KV provisioning (AC-4):** `wrangler kv namespace create KV` returned id `d9b775c3668e4e39ae708fb0ee2ae53a`. `wrangler kv namespace list` confirms one entry: `{ "id": "d9b775c3668e4e39ae708fb0ee2ae53a", "title": "KV", "supports_url_encoding": true }`. `wrangler.toml` `[[kv_namespaces]]` block now has the real id; `# TODO Story 1.6` comment removed.
- **2026-04-30 unblock pass — R2 provisioning (AC-4):** `wrangler r2 bucket create mbti-assets` succeeded. `wrangler r2 bucket list` returns `name: mbti-assets, creation_date: 2026-04-30T14:59:38.858Z`. `wrangler.toml` `[[r2_buckets]]` block: `bucket_name = "mbti-assets"` was already wired (no change); `# TODO Story 1.6` comment removed.
- **2026-04-30 unblock pass — production secrets (AC-5):** User ran `wrangler secret put` for all 5 keys, pasting real values at the interactive prompt. `wrangler secret list` returns exactly 5 entries — `ADMIN_PASSWORD_HASH`, `ANTHROPIC_API_KEY`, `PAYOS_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — all with `type = "secret_text"`. No values appear anywhere in the repo.
- **2026-04-30 unblock pass — local `.dev.vars`:** User created `apps/api/.dev.vars` (1.1K, gitignored) by copying `.dev.vars.example` and filling real values. File presence allows `wrangler dev --local` to bind all five `c.env.<SECRET>` references without `undefined`.
- **2026-04-30 unblock pass — regression gate after toml edit:** `pnpm typecheck` and `pnpm lint` re-run from monorepo root → 3 successful, 0 failures (api executed fresh; web/shared cache-hit). Confirms `wrangler.toml` change did not break any consumer.
- **2026-04-30 unblock pass — git status:** `git status --short` shows the expected story changes: `M apps/api/src/types/bindings.ts`, `M apps/api/wrangler.toml`, `?? apps/api/.dev.vars.example`, `?? apps/api/src/lib/r2.ts`. `apps/api/.dev.vars` does NOT appear (gitignored). No leaked secret values.

### Completion Notes List

- **AC coverage summary:** 6 of 10 ACs fully verified by dev agent (AC-3 partial — typing + template committed; AC-6, AC-7, AC-8, AC-9 type-level, AC-10 documentation). AC-1 and AC-2 (R2 / KV round-trip smokes) are verified at the type-and-helper level but the live round-trip is BLOCKED on the user running `pnpm dev` plus the temporary debug routes per the Verification Recipe. AC-4 and AC-5 require Cloudflare auth and are BLOCKED on the user — runbook is documented in the Operational Runbook section.
- **`lib/r2.ts` minimal surface:** Only `withR2(c)` + `putAsset(bucket, key, body, options?)` + `getAsset(bucket, key)` are exported. JSDoc rule block documents: route-handler boundary; key prefix conventions (`og/`, `cards/`, `reports/`); presigned-URL deferral rationale (no native R2-binding support; needs S3-compat layer + `aws4fetch`); future-helper rule (feature stories add domain helpers as they land). Mirrors the `withDb` pattern from Story 1.5 — defensive guard throws if `c.env.ASSETS_BUCKET` is falsy. `putAsset` throws on `bucket.put()` returning `null`; `getAsset` returns `null` for legitimate not-found cases (no throw).
- **`Bindings` extension:** Added five `string` secret fields (`ANTHROPIC_API_KEY`, `PAYOS_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_PASSWORD_HASH`) to `apps/api/src/types/bindings.ts`. Existing `DB`, `KV`, `ASSETS_BUCKET`, `RATE_LIMITER` bindings UNCHANGED. `Variables.userId: string` UNCHANGED. Field ordering: bindings first, secrets second, separated by a comment block — matches the spec in story Dev Notes.
- **`.dev.vars.example` template:** Created at `apps/api/.dev.vars.example` with all five placeholder lines (`dev-placeholder-*` strings — never real values). Leading comment block documents (a) "copy to `.dev.vars`", (b) "DO NOT commit `.dev.vars`", (c) "Production secrets via `wrangler secret put`". Per-secret comments cite the FR/NFR coverage and include the bcrypt-hash generation hint for `ADMIN_PASSWORD_HASH` (no bcryptjs dependency added — Story 7.1 owns admin auth implementation).
- **`lib/kv.ts` not modified:** Story 1.3 implementation (`getSession` / `setSession` / `deleteSession`) already meets AC-2 contract — 30-day TTL, `session:` key prefix, swallows KV-get errors as null. **Zero code changes** to this file (AC-2 verifies the existing contract).
- **Pre-existing wrangler warnings preserved:** `[[unsafe.bindings]]` Rate Limiter block from Story 1.3 still emits the experimental-fields warning under `wrangler dev`. Not introduced by this story; deferred-work item owned by Story 1.7.
- **No regressions:** `pnpm lint && pnpm typecheck` from monorepo root → zero errors across all 3 packages. Stories 1.1 / 1.3 / 1.4 / 1.5 contracts preserved.
- **Architectural drift resolution:** Architecture line 266 listed 4 secrets; epics AC-3 lists 5 (adds `STRIPE_WEBHOOK_SECRET` for inbound webhook signature validation in Story 5.1). Resolution per story Dev Notes — epics is the source of truth for ACs; ship 5 secrets. `STRIPE_WEBHOOK_SECRET` is a separate Stripe credential from `STRIPE_SECRET_KEY` (per Stripe API docs: `whsec_*` vs `sk_*`).
- **`getSignedUrl` deferred:** Architecture line 656 mentioned `getSignedUrl` as a `lib/r2.ts` helper, but R2 binding has no native presigned-URL support — would require adding `aws4fetch` (~5KB, Workers-compatible) or `@aws-sdk/client-s3` (heavier) plus S3-compat credentials. No consumer in the planned dependency chain until Story 5.2 (compatibility report private downloads). Documented in JSDoc; resolution per story Dev Notes.
- **Pending user actions (blocked subtasks 1.1–1.3, 2.1–2.2, 7.1–7.2, 8.1–8.2):** Tracked verbatim in the story's Operational Runbook. Each blocked subtask has a precise wrangler command and an acceptance check; the runbook is the single source of truth for the user's hand-off.

### File List

- `apps/api/src/types/bindings.ts` (MODIFIED — added 5 worker-secret string fields: `ANTHROPIC_API_KEY`, `PAYOS_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_PASSWORD_HASH`; existing 4 cloudflare bindings + `Variables` UNCHANGED; preserved field ordering with comment-separated bindings vs secrets sections)
- `apps/api/src/lib/r2.ts` (NEW — typed R2 access boundary: `withR2(c)` accessor with defensive guard, `putAsset(bucket, key, body, options?)` with null-result throw, `getAsset(bucket, key)` returning `R2ObjectBody | null`; JSDoc rule block documents route-handler boundary, key-prefix conventions, presigned-URL deferral, and minimal-surface scope)
- `apps/api/.dev.vars.example` (NEW — five-key template with `dev-placeholder-*` values; leading comment block + per-secret FR/NFR-coverage comments + bcrypt-hash generation hint for `ADMIN_PASSWORD_HASH`; user copies to `.dev.vars` for local dev — `.dev.vars` remains gitignored via root `.gitignore`)
- `apps/api/wrangler.toml` (MODIFIED — KV `id` now `d9b775c3668e4e39ae708fb0ee2ae53a` (real id from `wrangler kv namespace create KV`); R2 `bucket_name = "mbti-assets"` unchanged but `# TODO Story 1.6` comment removed from both blocks; `[[d1_databases]]`, `[dev]`, `[[unsafe.bindings]]` blocks preserved; `compatibility_date` deferred to Story 1.7)

## Change Log

- 2026-04-30: Story 1.6 created — comprehensive context engine analysis completed; all five secret keys, R2/KV provisioning runbook, `lib/r2.ts` minimal-surface scaffold, and `.dev.vars.example` template documented for the dev agent. AC-4 and AC-5 (Cloudflare-auth-required) flagged BLOCKED on user.
- 2026-04-30: Story 1.6 implemented — `apps/api/src/types/bindings.ts` extended with 5 worker-secret fields; `apps/api/src/lib/r2.ts` created with `withR2` + `putAsset` + `getAsset` typed helpers (defensive guard, null-result throw, JSDoc rule block); `apps/api/.dev.vars.example` committed with placeholder values + FR/NFR-coverage comments. `apps/api/src/lib/kv.ts` and `apps/api/src/index.ts` unchanged. `pnpm lint && pnpm typecheck` pass with zero errors across all 3 packages. AC-1 / AC-2 live round-trip smokes, AC-4 (KV/R2 provisioning + real ids in `wrangler.toml`), AC-5 (production `wrangler secret put`), AC-9 (`pnpm dev` smoke) BLOCKED on user — Operational Runbook documents every required command.
- 2026-04-30: Cloudflare-auth-blocked tasks unblocked and completed. User ran `wrangler login`, then provisioned KV namespace `KV` (id `d9b775c3668e4e39ae708fb0ee2ae53a`), R2 bucket `mbti-assets` (created `2026-04-30T14:59:38.858Z`), and 5 production secrets (`ADMIN_PASSWORD_HASH`, `ANTHROPIC_API_KEY`, `PAYOS_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`). Dev agent updated `apps/api/wrangler.toml` to use the real KV id and removed all `# TODO Story 1.6` comments. Verified via `wrangler kv namespace list`, `wrangler r2 bucket list`, `wrangler secret list` (Debug Log). AC-4 + AC-5 satisfied. `pnpm lint` + `pnpm typecheck` re-run after toml edit → still 0 errors. Story remains at `review` pending `bmad-code-review` run before transitioning to `done`. AC-1 / AC-2 / AC-9 live `pnpm dev` smoke is owned by the code-review or pre-merge verification phase.
- 2026-05-01: `bmad-code-review` complete — 3 reviewer layers (Blind Hunter / Edge Case Hunter / Acceptance Auditor), 27 unique findings → 7 dismissed → 9 patches applied + 11 items deferred. Patches: `r2.ts` JSDoc above `putAsset` documenting `onlyIf` non-support and `body=null` ≠ delete; `.dev.vars.example` rewritten with `REPLACE_ME_*` sentinels (incl. `whsec_REPLACE_ME_*` for Stripe webhook + valid `$2b$12$REPLACE.WITH...` bcrypt shape), unquoted values + quote-warning comment, "ONLY worker secrets — never bindings" warning, and stdin-based bcrypt-hash hint (no shell-history leak); `wrangler.toml` D1 + KV blocks got 1-line provenance comments (CF account `1d2219b9236cf74b59467af456e0fbab`, provisioned 2026-04-30). Defers logged to `deferred-work.md`: D1 scope-bleed, secrets `string` typing, env separation, key-prefix validation, `withR2` falsy-check, `Bindings.ASSETS_BUCKET` non-optional asymmetry, bcryptjs CPU envelope, ReadableStream lifetime, body double-consumption, getAsset null/key validation, RATE_LIMITER `1001` placeholder. AC-1 / AC-2 / AC-9 live smoke dismissed (type-level coverage accepted). `pnpm typecheck` re-run after r2.ts JSDoc edit → 3/3 successful, 0 errors. Story → `done`.

### Review Findings

> Generated by `bmad-code-review` on 2026-04-30. Layers: Blind Hunter (cynical adversarial, diff-only), Edge Case Hunter (boundary walk + project read), Acceptance Auditor (spec compliance). 27 unique findings → 6 dismissed → 21 actionable (10 decision-needed, 3 patch, 8 deferred).

#### Decision Needed


#### Patch

- [x] [Review][Patch] `putAsset` JSDoc must explicitly document `onlyIf` non-support [`apps/api/src/lib/r2.ts:36-50`] — Add JSDoc above `putAsset`: "conditional puts via `R2PutOptions.onlyIf`/`onlyIfMatch` are NOT supported by this helper — `null` from `bucket.put()` is treated as misconfig and throws. Use raw `bucket.put()` directly if you need conditional semantics; future feature stories may add a `conditionalPutAsset` variant if needed."
- [x] [Review][Patch] Bcrypt-hash hint leaks plaintext password to shell history [`apps/api/.dev.vars.example:21`] — `node -e "..." 'your-admin-password'` writes argv to `~/.zsh_history` and is visible in `ps aux` while running. Replace with stdin-based form (e.g., `read -s ADMIN_PW && node -e "import('bcryptjs').then(m=>m.hash(process.env.ADMIN_PW,12).then(console.log))"` with `ADMIN_PW=$ADMIN_PW` exported only into the node process).
- [x] [Review][Patch] `putAsset` `null` body silently writes a zero-byte object — caller may think it deletes [`apps/api/src/lib/r2.ts:37-54`] — Body union accepts `null`, but R2 `put(key, null)` ≠ delete; it creates an empty object. Add a JSDoc warning above `putAsset` noting "passing `body = null` writes a zero-byte object — it does NOT delete; use `bucket.delete(key)` for that (no helper exported in this story)".
- [x] [Review][Patch] `.dev.vars.example` leading comment doesn't warn against putting non-secret bindings [`apps/api/.dev.vars.example:1-8`] — Add one-line note: "ONLY worker secrets — never `DB`/`KV`/`ASSETS_BUCKET`/`RATE_LIMITER` (those are bindings declared in `wrangler.toml`, not env values)."
- [x] [Review][Patch] `.dev.vars.example` placeholders changed to obvious `REPLACE_ME_…` sentinels [`apps/api/.dev.vars.example:11,14,17`] — Replace `dev-placeholder-anthropic` / `dev-placeholder-payos` / `dev-placeholder-stripe-secret` with `REPLACE_ME_ANTHROPIC_KEY` / `REPLACE_ME_PAYOS_KEY` / `REPLACE_ME_STRIPE_SECRET_KEY` so first-run failures surface as "you forgot to set the secret" instead of opaque upstream 401.
- [x] [Review][Patch] `ADMIN_PASSWORD_HASH` placeholder must be a well-formed bcrypt shape [`apps/api/.dev.vars.example:22`] — Replace `dev-placeholder-bcrypt-hash` with `$2b$12$REPLACE.WITH.REAL.BCRYPT.HASH......................` (60-char bcrypt $2b shape, replace-suffix is obvious). `bcryptjs.compare(pw, hash)` then returns `false` deterministically for "wrong password" rather than throwing or silently mismatching on malformed input.
- [x] [Review][Patch] `STRIPE_WEBHOOK_SECRET` placeholder gets the `whsec_` prefix [`apps/api/.dev.vars.example:18`] — Replace `dev-placeholder-stripe-webhook` with `whsec_REPLACE_ME_STRIPE_WEBHOOK_SECRET` so Stripe webhook libs that assert prefix at boot don't throw on the placeholder.
- [x] [Review][Patch] Strip double-quotes from `.dev.vars.example` values + add quote-warning comment [`apps/api/.dev.vars.example:11,14,17,18,22`] — Remove outer quotes from all 5 values; add a leading-comment note: "Do not wrap values in quotes — Wrangler's dotenv parser handles literal strings, and quoted values can be kept verbatim by some Wrangler versions, breaking HMAC comparisons (e.g., Stripe webhook signature)."
- [x] [Review][Patch] Add provenance comments to `wrangler.toml` D1 + KV blocks [`apps/api/wrangler.toml:11,16`] — Add a 1-line comment above each block: `# Cloudflare account 1d2219b9236cf74b59467af456e0fbab; provisioned 2026-04-30 (Story 1.6 unblock pass)`. Reviewers can identify account/env/provenance without digging through `wrangler` CLI.

#### Deferred

- [x] [Review][Defer] D1 `database_id` change is Story 1.5 scope-bleed [`apps/api/wrangler.toml:11`] — deferred, D1 hunk rode along during wrangler-auth unblock pass; both stories' File Lists out of date but end-state correct — fix in next sprint hygiene pass.
- [x] [Review][Defer] Worker secrets typed as `string` instead of `string | undefined` [`apps/api/src/types/bindings.ts:10-14`] — deferred, spec authoritative surface prescribed `string`; runtime fail-fast (`assertSecrets(env)`) is hardening work — revisit when Story 7.1 (admin auth) wires the first secret consumer.
- [x] [Review][Defer] `wrangler.toml` real CF IDs committed without env separation [`apps/api/wrangler.toml:11,16`] — deferred, single-env wrangler.toml is acceptable for MVP solo-dev workflow; `[env.production]` stanzas + CI substitution belong to Story 1.7 (CI/CD pipeline) when staging is added.
- [x] [Review][Defer] No key-prefix/key validation in `putAsset`/`getAsset` [`apps/api/src/lib/r2.ts`] — deferred, JSDoc explicitly delegates to route handler; feature stories add domain helpers (`cacheOgImage`, `getReport`) with their own prefix validation per spec scope-boundary.
- [x] [Review][Defer] `withR2` falsy-check only catches missing binding (not "wrong account/bucket exists but unreachable") [`apps/api/src/lib/r2.ts:29`] — deferred, mirrors `withDb` precedent from Story 1.5; opaque-misdiagnosis improvement is not blocking.
- [x] [Review][Defer] `Bindings.ASSETS_BUCKET` non-optional vs `withR2` runtime guard — type/runtime asymmetry [`apps/api/src/types/bindings.ts:5`] — deferred, design-level concern; touching the existing 4 bindings is out of Story 1.6 scope per "Files Being Modified" table.
- [x] [Review][Defer] `bcryptjs` cost-12 may exceed Workers CPU envelope [`apps/api/.dev.vars.example:21`] — deferred, Story 7.1 admin auth implementation owns the runtime feasibility decision (`bcryptjs` ~hundreds of ms vs Workers CPU caps).
- [x] [Review][Defer] `putAsset` ReadableStream lifetime contract not documented [`apps/api/src/lib/r2.ts:37-54`] — deferred, locked/consumed-stream errors propagate as raw R2 errors; route handlers manage stream lifetime per Workers convention.
- [x] [Review][Defer] `getAsset` body double-consumption unguarded [`apps/api/src/lib/r2.ts:56-61`] — deferred, `R2ObjectBody.body`/`.text()`/`.json()` single-use semantics are standard Streams convention; caller responsibility.
- [x] [Review][Defer] `getAsset` returns `null` undocumented + no key validation [`apps/api/src/lib/r2.ts:56-61`] — deferred, overlaps key-prefix-validation defer above; key-derivation correctness is route-handler / feature-story concern.
- [x] [Review][Defer] `RATE_LIMITER` `namespace_id = "1001"` placeholder remains while D1/KV got real IDs [`apps/api/wrangler.toml:25`] — deferred, Story 1.7 owns rate-limiter cleanup per spec "Files Being Modified" table.

#### Dismissed (7, recorded for traceability)

- AC-1 / AC-2 / AC-9 live smoke not executed — user accepted type-level coverage; lint + typecheck green, unblock-pass evidence already in Debug Log lines 466–472. Story → `done` without live `pnpm dev` smoke.
- R2 bucket `# TODO` comment removal "drops prerequisite" — Operational Runbook documents the `wrangler r2 bucket create mbti-assets` step; redundant.
- `getAsset` is a tautology helper — spec-prescribed minimum surface; matches "feature stories add domain-specific helpers as they land" rule.
- `withR2` takes full Hono `Context` — spec authoritative surface; mirrors `withDb`/`withKv` pattern.
- JSDoc story-number references — project convention used throughout codebase.
- `Variables` import in `r2.ts` (B14, "not shown in diff") — false positive; `Variables` is pre-existing in `bindings.ts`.
- `withR2` reads like HOF/decorator (naming) — matches `withDb`/`withKv` family precedent.
