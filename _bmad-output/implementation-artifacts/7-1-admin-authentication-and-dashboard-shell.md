# Story 7.1: Admin Authentication & Dashboard Shell

Status: done

## Story
As an administrator, I want to log in with a username/password (separate from user session tokens) and access a protected dashboard, so that I can monitor platform health without any overlap with the public user flow.

## ACs
1. React route `/admin` is guarded: if no valid `adminToken` in `localStorage`, redirect to `/admin/login`. Anonymous user session tokens grant zero admin access (NFR10).
2. `POST /api/admin/login` with `{ username, password }`: verifies `password` against `c.env.ADMIN_PASSWORD_HASH`; on success mints a UUID admin token, stores it in KV under `admin:<token>` with 24h TTL, returns `{ data: { adminToken }, error: null }`. Invalid creds → `{ data: null, error: { code: 'FORBIDDEN' } }` 403.
3. `GET /api/admin/metrics` (admin token required) returns: `completionRate` (total), `shareRate7d`, `totalCompletedTests`, `activeInviteLinks`. Dashboard renders these as metric tiles.
4. New `requireAdmin` middleware validates `X-Admin-Token` header via KV lookup; missing/invalid → `{ data: null, error: { code: 'FORBIDDEN' } }` 403 for ALL `/api/admin/*` routes.

## Tasks
- KV helpers in `apps/api/src/lib/kv.ts`: `setAdminSession`, `getAdminSession`, `deleteAdminSession` (key prefix `admin:`, 24h TTL).
- Password verify helper using **Web Crypto PBKDF2-SHA256** (NOT bcryptjs — see Dev Notes). Hash format: `pbkdf2$<iterations>$<saltB64>$<hashB64>`.
- `apps/api/src/middleware/auth.ts`: add `requireAdmin` middleware (reads `X-Admin-Token`).
- DB helper `getAdminMetrics(db)` in `lib/db.ts`: aggregate counts via prepared statements (live rows only — `deleted_at IS NULL`).
- `apps/api/src/routes/admin.ts` mounted at `/api/admin`; `POST /login`, `GET /metrics`.
- Web: `apps/web/src/features/admin/` — `AdminLogin.tsx`, `AdminDashboard.tsx`, `AdminGuard.tsx`, `lib/adminApi.ts` (separate `X-Admin-Token` client, NOT the user `apiCall`).
- Add `/admin`, `/admin/login` to router (lazy).
- Tests: middleware rejects bad token; login success/failure; metrics shape.

## Dev Notes
- **Password hashing decision**: `deferred-work.md:130` flags `bcryptjs` cost-12 likely exceeds Cloudflare Workers CPU budget and explicitly assigns Story 7.1 to "verify runtime feasibility (may need to drop cost factor or use a different KDF)". Use native Web Crypto `crypto.subtle` PBKDF2-SHA256 (≥100k iterations) — fast, no dependency, Workers-native. The `ADMIN_PASSWORD_HASH` secret stores the `pbkdf2$iter$salt$hash` string; a generation script must be documented (see Story docs task in 7.x). Update `apps/api/.dev.vars.example` comment to reflect PBKDF2 (replace the bcryptjs hint).
- Response envelope is ALWAYS `{ data, error }` (see `apps/api/src/index.ts`, `routes/tests.ts`). Errors bubble via `app.onError`. Follow existing route style in `routes/content.ts`.
- KV pattern: mirror `getSession`/`setSession`/`deleteSession` in `lib/kv.ts` (JSON value, `expirationTtl`). Admin session value: `{ username, createdAt }`.
- `requireAdmin` mirrors `requireSession` shape but reads `X-Admin-Token` and returns `FORBIDDEN` 403 (not `UNAUTHORIZED` 401) per AC.
- D1 access ONLY through typed helpers in `lib/db.ts`, prepared statements with `.bind()`, never string interpolation (`lib/db.ts` header rules). UUID-shaped args lower-cased at boundary.
- Metrics: `totalCompletedTests` = `COUNT(*) test_results WHERE deleted_at IS NULL`; `activeInviteLinks` = `COUNT(*) invite_links WHERE deleted_at IS NULL AND expired_at > datetime('now')`; `shareRate7d` is a placeholder until 7.4 wires PostHog — derive as invite_links created in last 7d / completed tests in last 7d (document the proxy); `completionRate` = completed tests / sessions — sessions count not in D1, so use a documented proxy (e.g., 1.0 placeholder or tests with answers). Keep it simple; 7.4 refines analytics.
- Frontend: admin area must be a separate feature folder and a separate API client storing `adminToken` in `localStorage` under a distinct key (`mbti_admin_token`) — never reuse `getSessionToken()`. Use `react-router` `<Navigate>` for the guard. Match existing Tailwind/dark surface styling used across `features/`.

### References
- `_bmad-output/planning-artifacts/epics.md:912-933` (Story 7.1 ACs)
- `apps/api/src/lib/kv.ts`, `apps/api/src/middleware/auth.ts`, `apps/api/src/lib/db.ts:1-44`
- `apps/api/src/types/bindings.ts:18` (`ADMIN_PASSWORD_HASH`)
- `_bmad-output/implementation-artifacts/deferred-work.md:125,130` (secret typing + bcrypt CPU)
- `apps/web/src/router.tsx`, `apps/web/src/lib/api.ts`

## Dev Agent Record
### Agent Model Used
claude-opus-4-7[1m]

### Completion Notes
- PBKDF2-SHA256 via Web Crypto (`lib/adminAuth.ts`) replaces bcryptjs — Workers-native, no dep, 150k iterations. Hash gen script `apps/api/scripts/hash-admin-password.mjs`. `.dev.vars(.example)` updated (PBKDF2, value unquoted).
- Admin KV keyspace `admin:` 24h TTL, fully separate from user `session:`. `requireAdmin` middleware returns 403 FORBIDDEN; sets `adminUsername` context var.
- `getAdminMetrics` aggregates live rows; `shareRate7d`/`completionRate` documented D1 proxies (refined conceptually by 7.4).
- Web: separate `adminApi` client (`mbti_admin_token` localStorage key, `X-Admin-Token` header, auto-clear on 403), `AdminGuard` (react-router `<Navigate>`), `AdminLogin`, `AdminDashboard`. Routes `/admin/login` + nested `/admin/*`.
- Tests: `tests/lib/adminAuth.test.ts`, `tests/routes/admin.test.ts` (login ok/fail, middleware 403, metrics).

### Deploy Learning (post-deploy)
- **Cloudflare Workers `crypto.subtle` hard-caps PBKDF2 at 100000 iterations** — `deriveBits` throws `NotSupportedError` above that. Initial hash used 150000 → every production login returned FORBIDDEN (verify caught the throw → false) while local Node tests passed (Node has no cap). Fixed: `hashAdminPassword` default + script pinned to 100000, secret regenerated, regression test added (`tests/lib/adminAuth.test.ts` asserts default ≤ 100000). This concretely resolves the `deferred-work.md:130` KDF-feasibility question for Story 7.1.

### File List
**Created:** `apps/api/src/lib/adminAuth.ts`, `apps/api/scripts/hash-admin-password.mjs`, `apps/api/src/routes/admin.ts`, `apps/web/src/features/admin/lib/adminApi.ts`, `apps/web/src/features/admin/components/{AdminGuard,AdminLogin,AdminDashboard}.tsx`, `packages/shared/src/schemas/admin.ts`, `apps/api/tests/lib/adminAuth.test.ts`, `apps/api/tests/routes/admin.test.ts`
**Modified:** `apps/api/src/lib/kv.ts`, `apps/api/src/middleware/auth.ts`, `apps/api/src/lib/db.ts`, `apps/api/src/types/bindings.ts`, `apps/api/src/index.ts`, `apps/web/src/router.tsx`, `packages/shared/src/index.ts`, `apps/api/.dev.vars(.example)`
