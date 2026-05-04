# Story 1.5: Cloudflare D1 Database Setup with Schema Migrations and Seed Data

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want Cloudflare D1 database created, version-controlled SQL migrations applied, and seed data loaded for local development,
so that the data layer is operational and all user tables, curated insights, and article data exist before feature implementation begins.

## Acceptance Criteria

1. **AC-1: Initial schema creates all 5 tables** — After applying `migrations/0001_initial_schema.sql` via `wrangler d1 migrations apply mbti --local` (or the equivalent direct execution `wrangler d1 execute mbti --local --file=./migrations/0001_initial_schema.sql` from the monorepo root, or `--file=../../migrations/0001_initial_schema.sql` from `apps/api/`), the local D1 database contains all five tables: `test_results`, `invite_links`, `perception_votes`, `curated_insights`, `articles`. Every column uses `snake_case`; `created_at` and `updated_at` are `TEXT` (ISO 8601, default `(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`); every boolean column is prefixed with `is_` or `has_` and stored as `INTEGER` (`0|1`).

2. **AC-2: Curated insights are seeded with at least one row per MBTI type** — After `migrations/0002_curated_insights_seed.sql` is applied, `SELECT mbti_type, COUNT(*) AS n FROM curated_insights WHERE is_active = 1 GROUP BY mbti_type` returns 16 rows (one per MBTI type) with `n >= 1`. Specifically, `SELECT COUNT(*) FROM curated_insights WHERE mbti_type = 'INFP' AND is_active = 1` returns `>= 1`. Seed `content` strings are placeholder copy with a documented `TODO Story 3.1` marker; Story 3.1 owns final curated copy.

3. **AC-3: PDPA soft-delete columns added to all user-data tables** — After `migrations/0004_pdpa_soft_delete.sql` is applied, `PRAGMA table_info(<table>)` for each of `test_results`, `invite_links`, `perception_votes` shows a `deleted_at TEXT` column with `dflt_value = NULL`. Additionally, `test_results` shows a `retention_flag INTEGER` column (default `0`) — matches the `TestResultRow.retention_flag: 0 | 1 | null` contract from Story 1.4. `invite_links` and `perception_votes` do NOT receive `retention_flag` (their row interfaces do not declare it; do not over-add).

4. **AC-4: Production migration apply succeeds** — Running `wrangler d1 migrations apply mbti --remote` against the real Cloudflare D1 instance applies all four pending migrations in order without errors. `wrangler d1 migrations list mbti --remote` afterward shows zero pending migrations and the same applied set as `--local`.

5. **AC-5: Real `database_id` documented in `wrangler.toml`** — `apps/api/wrangler.toml` `[[d1_databases]]` block has `database_id` set to the real UUID returned by `wrangler d1 create mbti` (no longer the placeholder `00000000-0000-0000-0000-000000000000`). The block also declares `migrations_dir = "../../migrations"` so Wrangler discovers migrations at the monorepo root.

6. **AC-6: Wrangler discovers the migrations directory at the monorepo root** — Running `wrangler d1 migrations list mbti --local` from `apps/api/` reads files from `<monorepo-root>/migrations/` (not from `apps/api/migrations/`). All four migration filenames begin with the standard zero-padded numeric prefix (`0001_`, `0002_`, `0003_`, `0004_`) so Wrangler applies them in lexicographic order.

7. **AC-7: Articles table has at least one sample seed row per MBTI type for dev** — After `migrations/0003_articles_seed.sql` is applied, `SELECT mbti_type, COUNT(*) AS n FROM articles WHERE is_published = 1 GROUP BY mbti_type` returns 16 rows with `n >= 1`. Each sample article has a non-empty `title`, `slug` (URL-safe lowercase, unique), `content` (placeholder body), and `published_at` set to a fixed ISO 8601 string. Marked `TODO Story 6.1 / Story 7.2` for replacement with real curated content.

8. **AC-8: Schema matches `packages/shared/src/db/rows.ts` row interfaces** — Every column declared in the migrations matches the corresponding TypeScript field in the row interface (name, nullability, type primitive). Specifically: `TestResultRow.calculated_type` is `MBTIType` (NOT NULL with `CHECK` constraint), `TestResultRow.persona_name` is `TEXT NOT NULL`, `TestResultRow.declared_type` is `TEXT` nullable with `CHECK` constraint, `is_active`/`is_published` are `INTEGER NOT NULL DEFAULT 1`, `deleted_at` and `retention_flag` are nullable. A documented one-to-one mapping table appears in the story dev notes for the dev agent to verify.

9. **AC-9: D1 referenced via Workers binding only — typed via `Bindings.DB`** — No code path in `apps/api/src/` opens a SQLite connection, calls `better-sqlite3`, `Cloudflare D1 HTTP API`, or any non-binding access. `Bindings.DB: D1Database` (set up in Story 1.3) remains the only entry point. `apps/api/src/lib/db.ts` is the only module that calls `c.env.DB.prepare(...)` (route handlers must continue to delegate). This story does NOT add any route handler code.

10. **AC-10: `lib/db.ts` exports typed `withDb(c)` accessor + first read helper** — `apps/api/src/lib/db.ts` exports two helpers: (a) `withDb(c)` returning the typed `D1Database` from the Hono context (`c.env.DB`), and (b) `getActiveCuratedInsights(db, mbtiType)` returning `Promise<CuratedInsightRow[]>` using `db.prepare('SELECT ... WHERE mbti_type = ? AND is_active = 1').bind(mbtiType).all<CuratedInsightRow>()`. The function uses prepared statements (no string interpolation) and validates the `mbtiType` argument against `MBTI_TYPES` from `@mbti/shared` before querying (throw on invalid). This is the minimal scaffold the AI fallback (Story 3.2) and content feed (Story 6.1) depend on; do not add other read/write helpers — feature stories own them. The JSDoc at the top of the file documents the convention that future UUID-keyed helpers must lower-case UUID inputs at the boundary (deferred from Story 1.4); this story does not introduce any UUID-keyed helper, so the convention is documented for future stories rather than enforced here.

11. **AC-11: Lint + typecheck pass across all 3 packages** — `pnpm lint && pnpm typecheck` from monorepo root completes with zero errors across `@mbti/web`, `@mbti/api`, `@mbti/shared`. The `getActiveCuratedInsights` helper typechecks against `CuratedInsightRow` from `@mbti/shared`.

12. **AC-12: Documentation block at top of each migration file** — Every `migrations/*.sql` file begins with a comment header listing: (a) migration purpose (one line), (b) the AC IDs from this story it satisfies, (c) the row-interface contract(s) in `packages/shared/src/db/rows.ts` it aligns with, (d) the dev who applied it (placeholder `TODO`). This documents the AC↔migration↔contract chain for future stories.

## Tasks / Subtasks

- [x] Task 1: Provision the Cloudflare D1 database (AC: 4, 5)
  - [x] 1.1 Ran `wrangler d1 create mbti` from `apps/api/`. Cloudflare returned UUID `ea15a996-8fd9-4ef9-8e6b-3ea13eb6c581` in region APAC.
  - [x] 1.2 Edited `apps/api/wrangler.toml`: replaced placeholder `database_id` with the real UUID. Removed the `# TODO Story 1.5 / Task 1.1` comment block.
  - [x] 1.3 Add `migrations_dir = "../../migrations"` inside the `[[d1_databases]]` block (path is relative to `wrangler.toml`).
  - [x] 1.4 Verified `wrangler d1 list` returns the `mbti` DB with the captured UUID (Debug Log).
  - [x] 1.5 Runbook for user is documented in the "Operational Runbook" section below.

- [x] Task 2: Create the `migrations/` directory at monorepo root (AC: 1, 6)
  - [x] 2.1 Created `migrations/` at monorepo root. Directory is tracked because it now contains the four migration files (no `.gitkeep` needed).
  - [x] 2.2 Verified path resolution: `cd apps/api && pnpm exec wrangler d1 migrations list mbti --local` reported all four migrations as discoverable (full output in Debug Log).

- [x] Task 3: Write `migrations/0001_initial_schema.sql` — the five tables (AC: 1, 8, 12)
  - [x] 3.1 Created file with header comment per AC-12.
  - [x] 3.2 Defined `test_results` per Schema Definitions; `declared_type` and `calculated_type` use the 16-tuple `CHECK` constraint.
  - [x] 3.3 Defined `invite_links`; `token` is `UNIQUE`; `CHECK (expired_at > created_at)`.
  - [x] 3.4 Defined `perception_votes`; `invite_token REFERENCES invite_links(token)`.
  - [x] 3.5 Defined `curated_insights`; `mbti_type` has `CHECK` constraint; `is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))`.
  - [x] 3.6 Defined `articles`; `slug TEXT NOT NULL UNIQUE`; `mbti_type CHECK`; `is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0,1))`.
  - [x] 3.7 Added all 6 indexes: `idx_test_results_user_id`, `idx_invite_links_inviter_user_id`, `idx_perception_votes_invite_token`, `idx_curated_insights_mbti_type_active`, `idx_articles_mbti_type_published`, `idx_articles_slug` (UNIQUE).

- [x] Task 4: Write `migrations/0002_curated_insights_seed.sql` — seed 16 rows (AC: 2, 12)
  - [x] 4.1 Created file with header comment per AC-12.
  - [x] 4.2 Inserted exactly 16 rows; deterministic IDs `placeholder-insight-{TYPE}-v1`; `variant = 'v1'`; placeholder content with TODO Story 3.1 marker; `is_active = 1`; timestamps fixed to `'2026-04-30T00:00:00.000Z'`.
  - [x] 4.3 Verified all 16 MBTI types covered: `SELECT COUNT(DISTINCT mbti_type) FROM curated_insights WHERE is_active = 1` → `16` (Debug Log).

- [x] Task 5: Write `migrations/0003_articles_seed.sql` — sample articles per type (AC: 7, 12)
  - [x] 5.1 Created file with header comment per AC-12.
  - [x] 5.2 Inserted 16 rows; deterministic IDs `placeholder-article-{TYPE}-v1`; slugs `mbti-{type-lower}-overview-v1`; titles `Overview: {TYPE}`; placeholder content with TODO Story 6.1 / Story 7.2 marker; `author = NULL`; `published_at = '2026-04-30T00:00:00.000Z'`; `is_published = 1`.

- [x] Task 6: Write `migrations/0004_pdpa_soft_delete.sql` — add deleted_at + retention_flag (AC: 3, 8, 12)
  - [x] 6.1 Created file with header comment per AC-12.
  - [x] 6.2 `ALTER TABLE test_results ADD COLUMN deleted_at TEXT DEFAULT NULL;`
  - [x] 6.3 `ALTER TABLE test_results ADD COLUMN retention_flag INTEGER DEFAULT 0;` (matches `TestResultRow.retention_flag: 0 | 1 | null`).
  - [x] 6.4 `ALTER TABLE invite_links ADD COLUMN deleted_at TEXT DEFAULT NULL;` (no retention_flag, per row interface).
  - [x] 6.5 `ALTER TABLE perception_votes ADD COLUMN deleted_at TEXT DEFAULT NULL;` (no retention_flag, per row interface).
  - [x] 6.6 Added 3 partial indexes (`idx_test_results_alive`, `idx_invite_links_alive`, `idx_perception_votes_alive`) with `WHERE deleted_at IS NULL`.

- [x] Task 7: Apply migrations locally (AC: 1, 2, 3, 6, 7)
  - [x] 7.1 From `apps/api/`, ran `pnpm exec wrangler d1 migrations apply mbti --local`. All four migrations applied — output shows `0001 ✅, 0002 ✅, 0003 ✅, 0004 ✅` (Debug Log).
  - [x] 7.2 Ran the `sqlite_master` query — returned exactly: `articles, curated_insights, invite_links, perception_votes, test_results` (Debug Log).
  - [x] 7.3 Ran `SELECT COUNT(DISTINCT mbti_type) FROM curated_insights WHERE is_active = 1` → `16`. Also verified `SELECT COUNT(*) FROM curated_insights WHERE mbti_type = 'INFP' AND is_active = 1` → `1`.
  - [x] 7.4 Ran `PRAGMA table_info('test_results')` — `deleted_at` (TEXT, default NULL) and `retention_flag` (INTEGER, default 0) both present (Debug Log).
  - [x] 7.5 Ran `PRAGMA table_info('invite_links')` and `PRAGMA table_info('perception_votes')` — both have `deleted_at`; neither has `retention_flag`. Verified.

- [x] Task 8: Apply migrations to remote production D1 (AC: 4)
  - [x] 8.1 Ran `pnpm exec wrangler d1 migrations apply mbti --remote` from `apps/api/`. All 4 migrations applied: `0001_initial_schema.sql ✅`, `0002_curated_insights_seed.sql ✅`, `0003_articles_seed.sql ✅`, `0004_pdpa_soft_delete.sql ✅` (Debug Log).
  - [x] 8.2 Ran `pnpm exec wrangler d1 migrations list mbti --remote` → "✅ No migrations to apply!" (zero pending). Verified remote state matches local: 5 tables (`articles, curated_insights, invite_links, perception_votes, test_results` plus internal `_cf_KV`); 16 active curated_insights; 16 published articles.
  - [x] 8.3 Runbook documented in the "Operational Runbook" section below.

- [x] Task 9: Implement minimal `lib/db.ts` helpers (AC: 9, 10, 11)
  - [x] 9.1 Updated `apps/api/src/lib/db.ts`; preserved `DbContext` export.
  - [x] 9.2 Added `withDb(c)` returning `c.env.DB` typed as `D1Database` from a Hono `Context<{ Bindings; Variables }>`.
  - [x] 9.3 Added `getActiveCuratedInsights(db, mbtiType)` per AC-10. Imports `CuratedInsightRow`, `MBTI_TYPES`, `MBTIType` from `@mbti/shared`. Validates `mbtiType` against `MBTI_TYPES.includes(...)`; throws on invalid. Uses prepared statement with `.bind(mbtiType)`. Returns `result.results ?? []`.
  - [x] 9.4 JSDoc header documents: (a) no string interpolation, (b) snake→camel responsibility lives in route handlers (not this file), (c) AC-9 / AC-10 references, (d) UUID lower-case convention for future helpers, (e) "feature stories add helpers as they land" rule.
  - [x] 9.5 `pnpm lint && pnpm typecheck` from monorepo root → zero errors across all 3 packages (Debug Log).

- [x] Task 10: Verify all ACs end-to-end (AC: 1–12)
  - [x] 10.1 Cross-checked column names + types against `packages/shared/src/db/rows.ts` — all 5 row interfaces match field-by-field. PRAGMA inspections in Debug Log confirm `notnull`, `dflt_value`, and column ordering align with row contracts.
  - [x] 10.2 Confirmed `migrations/` contains exactly the 4 expected files: `0001_initial_schema.sql`, `0002_curated_insights_seed.sql`, `0003_articles_seed.sql`, `0004_pdpa_soft_delete.sql`.
  - [x] 10.3 `wrangler.toml` `[[d1_databases]]` block has `migrations_dir = "../../migrations"` ✓; `database_id = "ea15a996-8fd9-4ef9-8e6b-3ea13eb6c581"` (real UUID from `wrangler d1 create mbti`). All `# TODO Story 1.5` comments removed.
  - [x] 10.4 Remote D1 verified end-to-end: `wrangler d1 migrations list mbti --remote` → 0 pending; `wrangler d1 execute --remote` against `sqlite_master` returns all 5 tables; `curated_insights` and `articles` queries against `--remote` return 16 rows each. `pnpm typecheck` and `pnpm lint` pass after toml edit. Local-vs-remote parity confirmed.

## Dev Notes

### Architecture Compliance (Non-Negotiable)

- **Wrangler is the only schema/migration tool.** No Drizzle, Prisma, Kysely, knex, better-sqlite3, or any ORM may be added. D1 access is raw SQL via Workers binding, version-controlled via `wrangler d1 migrations`. (`architecture.md#Data Architecture`, `architecture.md#Migrations`)
- **All D1 timestamps are TEXT storing ISO 8601 strings.** D1 has no native `timestamptz`. Use `(strftime('%Y-%m-%dT%H:%M:%fZ','now'))` as default for `created_at`/`updated_at`. Application inserts MUST use `new Date().toISOString()` (already documented as a deferred item from Story 1.4 — Story 1.5 is the enforcement point). Expiry comparisons use `WHERE expired_at > datetime('now')`. (`architecture.md#Format Patterns`, `architecture.md#Gap 4 (D1 SQLite date handling)`)
- **Booleans are `INTEGER` storing `0|1`.** Always default to a literal (`DEFAULT 0` or `DEFAULT 1`), never NULL unless the row interface declares the field nullable. Match the `0 | 1` literal type from `rows.ts`. (`architecture.md#Format Patterns`, `packages/shared/src/db/rows.ts`)
- **`snake_case` columns, plural `snake_case` tables.** API responses transform to `camelCase` in the Hono response layer (NOT in this story; route handlers own that mapping). (`architecture.md#Naming Patterns`)
- **`MBTIType` is enforced at every layer:** Zod validates request bodies (Story 1.4); TypeScript narrows row interfaces (Story 1.4); SQLite `CHECK` constraints enforce at the DB layer (this story). Defense-in-depth — corrupted rows cannot reach `c.json(row)`.
- **`packages/shared/src/db/rows.ts` is the contract.** Migrations MUST match field-by-field. If you discover a row interface needs to change to satisfy the schema, STOP — that's a Story 1.4 amendment, raise it in the dev notes; do not silently drift the schema.
- **D1 access via typed helpers in `lib/db.ts` only — never raw `c.env.DB` in route handlers.** This story scaffolds the helper module; route handlers come in feature stories. (`architecture.md#Enforcement Guidelines`, `architecture.md#D1 query pattern`)
- **No string interpolation in SQL.** Always prepared statements with `.bind()`. The Story 3.2 AI fallback grep test (`grep -r "DB.exec(\\\`SELECT" apps/api/src` etc.) must return zero matches.

### Critical Version & Tooling Notes (April 2026)

| Technology | Version | Notes |
|---|---|---|
| Wrangler CLI | `^4.0.0` (already pinned in `apps/api/devDependencies`) | `wrangler d1 migrations <create|apply|list>` is the supported workflow; `--local` and `--remote` are mutually exclusive. `--persist-to=<path>` controls local SQLite file location (default `.wrangler/state/v3/d1`). |
| `@cloudflare/workers-types` | `^4.20250421.0` | `D1Database`, `D1PreparedStatement`, `D1Result<T>` are in the global namespace — no import needed. `.first<T>()`, `.all<T>()`, `.run()` return shapes are typed. |
| Cloudflare D1 | SQLite 3.x flavor | Supports: `CHECK`, `UNIQUE`, partial indexes (`WHERE deleted_at IS NULL`), `strftime`, `datetime('now')`. Does NOT support: `BOOLEAN` (use `INTEGER`), `TIMESTAMP`/`TIMESTAMPTZ` (use `TEXT` ISO 8601), `RETURNING` clause is only available since Wrangler 4.x — assume present. |
| Zod | `^4.4.1` (`@mbti/shared`, `apps/api`) | Already used in `lib/db.ts`'s upstream callers; no new Zod schemas in this story. |
| TypeScript | `~6.0.2` | `noUncheckedIndexedAccess: true` is on — `result.results[0]` is `CuratedInsightRow | undefined`. Use `?? []` or guard. |

### Files Being Modified (UPDATE)

| File | Current State | What Changes | What Must Be Preserved |
|---|---|---|---|
| `apps/api/wrangler.toml` | `database_id = "00000000-0000-0000-0000-000000000000"` placeholder; no `migrations_dir`. | Replace `database_id` with real UUID from `wrangler d1 create mbti`. Add `migrations_dir = "../../migrations"` inside the `[[d1_databases]]` block. Remove the `# TODO Story 1.5` line. | All other bindings (`[[kv_namespaces]]`, `[[r2_buckets]]`, `[[unsafe.bindings]]`) UNCHANGED — Story 1.6 owns those. `[dev] port = 8787` UNCHANGED. `compatibility_date = "2025-04-01"` UNCHANGED (deferred bump in Story 1.7). |
| `apps/api/src/lib/db.ts` | Stub — only exports `DbContext` type with a comment promising "Real query helpers will be added in Story 1.5+." | Add `withDb(c)` and `getActiveCuratedInsights(db, mbtiType)` helpers per AC-10. Keep `DbContext` export. Add JSDoc per AC-10.4. | `DbContext` type export must remain (Story 1.3 contract). No imports of ORMs. No raw `c.env.DB.exec(\`...\`)` calls. |

### NEW Files

| File | Purpose |
|---|---|
| `migrations/0001_initial_schema.sql` | CREATE TABLE for all 5 tables + indexes. AC-1, AC-8. |
| `migrations/0002_curated_insights_seed.sql` | 16 INSERT rows into `curated_insights` (one per MBTI type). AC-2. |
| `migrations/0003_articles_seed.sql` | 16 INSERT rows into `articles` (one per MBTI type). AC-7. |
| `migrations/0004_pdpa_soft_delete.sql` | ALTER TABLE adds `deleted_at` to all 3 user-data tables; `retention_flag` to `test_results` only; partial indexes on `deleted_at IS NULL`. AC-3. |
| `migrations/.gitkeep` | (Optional, only if directory would otherwise be empty before Task 3 commits.) |

### What Must Be Preserved (System-Level Invariants)

- `pnpm dev` from monorepo root MUST keep starting both apps in parallel (Story 1.1 AC-1).
- `pnpm lint && pnpm typecheck` from monorepo root MUST remain at zero errors across all 3 packages (Story 1.1 AC-3, Story 1.3 AC-11, Story 1.4 AC-7).
- `apps/api/src/index.ts` Hono app MUST start under `wrangler dev --local` cleanly with the new D1 binding bound to the local SQLite file (Story 1.3 contract).
- `GET /api/health` MUST continue to return `{ data: { status: 'ok' }, error: null }` with HTTP 200 (Story 1.3 AC).
- `@mbti/shared` row interfaces MUST NOT be modified by this story — they are the contract this story conforms to.

### Schema Definitions (Authoritative)

These are the canonical column lists for each migration. Match the `packages/shared/src/db/rows.ts` contract exactly. SQL fragments below are illustrative; adapt syntax for SQLite/D1 specifically (no `BOOLEAN`, no `TIMESTAMPTZ`).

**MBTI tuple shorthand** — used in `CHECK` constraints below:
```
('INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP')
```

**`test_results` (created in 0001; altered in 0004):**

| Column | Type & Constraints | Maps to `TestResultRow` |
|---|---|---|
| `id` | `TEXT PRIMARY KEY NOT NULL` (UUID v4 string) | `id: string` |
| `user_id` | `TEXT NOT NULL` (anonymous KV session userId) | `user_id: string` |
| `declared_type` | `TEXT NULL CHECK (declared_type IN <MBTI tuple> OR declared_type IS NULL)` | `declared_type: MBTIType \| null` |
| `calculated_type` | `TEXT NOT NULL CHECK (calculated_type IN <MBTI tuple>)` | `calculated_type: MBTIType` |
| `answers` | `TEXT NOT NULL` (JSON-stringified responses) | `answers: string` |
| `persona_name` | `TEXT NOT NULL` | `persona_name: string` |
| `created_at` | `TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))` | `created_at: string` |
| `updated_at` | `TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))` | `updated_at: string` |
| `deleted_at` (added in 0004) | `TEXT NULL DEFAULT NULL` | `deleted_at: string \| null` |
| `retention_flag` (added in 0004) | `INTEGER NULL DEFAULT 0 CHECK (retention_flag IN (0,1) OR retention_flag IS NULL)` | `retention_flag: 0 \| 1 \| null` |

**`invite_links` (created in 0001; altered in 0004):**

| Column | Type & Constraints | Maps to `InviteLinkRow` |
|---|---|---|
| `id` | `TEXT PRIMARY KEY NOT NULL` | `id: string` |
| `token` | `TEXT NOT NULL UNIQUE` (lowercased UUID — see deferred-work note from 1.4) | `token: string` |
| `inviter_user_id` | `TEXT NOT NULL` | `inviter_user_id: string` |
| `inviter_result_id` | `TEXT NOT NULL` | `inviter_result_id: string` |
| `expired_at` | `TEXT NOT NULL CHECK (expired_at > created_at)` | `expired_at: string` |
| `created_at` | `TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))` | `created_at: string` |
| `deleted_at` (added in 0004) | `TEXT NULL DEFAULT NULL` | `deleted_at: string \| null` |

**`perception_votes` (created in 0001; altered in 0004):**

| Column | Type & Constraints | Maps to `PerceptionVoteRow` |
|---|---|---|
| `id` | `TEXT PRIMARY KEY NOT NULL` | `id: string` |
| `invite_token` | `TEXT NOT NULL REFERENCES invite_links(token)` | `invite_token: string` |
| `inviter_user_id` | `TEXT NOT NULL` | `inviter_user_id: string` |
| `voter_session_id` | `TEXT NULL` | `voter_session_id: string \| null` |
| `behavioral_answers` | `TEXT NOT NULL` (JSON-stringified votes) | `behavioral_answers: string` |
| `created_at` | `TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))` | `created_at: string` |
| `deleted_at` (added in 0004) | `TEXT NULL DEFAULT NULL` | `deleted_at: string \| null` |

**`curated_insights` (created in 0001; seeded in 0002):**

| Column | Type & Constraints | Maps to `CuratedInsightRow` |
|---|---|---|
| `id` | `TEXT PRIMARY KEY NOT NULL` | `id: string` |
| `mbti_type` | `TEXT NOT NULL CHECK (mbti_type IN <MBTI tuple>)` | `mbti_type: MBTIType` |
| `variant` | `TEXT NULL` (for FR10 / FR44 A/B variants) | `variant: string \| null` |
| `content` | `TEXT NOT NULL` | `content: string` |
| `is_active` | `INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))` | `is_active: 0 \| 1` |
| `created_at` | `TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))` | `created_at: string` |
| `updated_at` | `TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))` | `updated_at: string` |

**`articles` (created in 0001; seeded in 0003):**

| Column | Type & Constraints | Maps to `ArticleRow` |
|---|---|---|
| `id` | `TEXT PRIMARY KEY NOT NULL` | `id: string` |
| `mbti_type` | `TEXT NOT NULL CHECK (mbti_type IN <MBTI tuple>)` | `mbti_type: MBTIType` |
| `slug` | `TEXT NOT NULL UNIQUE` | `slug: string` |
| `title` | `TEXT NOT NULL` | `title: string` |
| `content` | `TEXT NOT NULL` | `content: string` |
| `author` | `TEXT NULL` | `author: string \| null` |
| `published_at` | `TEXT NULL` (NULL = draft; NOT NULL with `is_published=1` = published) | `published_at: string \| null` |
| `is_published` | `INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0,1))` | `is_published: 0 \| 1` |
| `created_at` | `TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))` | `created_at: string` |
| `updated_at` | `TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))` | `updated_at: string` |

### Reference Implementation Sketches

**`migrations/0001_initial_schema.sql` (skeleton):**

```sql
-- Story 1.5 / Migration 0001_initial_schema
-- Purpose: Create the 5 tables that satisfy AC-1 (test_results, invite_links,
--   perception_votes, curated_insights, articles) plus their indexes.
-- Satisfies: AC-1, AC-8, AC-12 of Story 1.5
-- Aligns with: packages/shared/src/db/rows.ts (TestResultRow, InviteLinkRow,
--   PerceptionVoteRow, CuratedInsightRow, ArticleRow as of Story 1.4)
-- Applied by: TODO

PRAGMA foreign_keys = ON;

CREATE TABLE test_results (
  id              TEXT PRIMARY KEY NOT NULL,
  user_id         TEXT NOT NULL,
  declared_type   TEXT NULL CHECK (declared_type IN (
    'INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP',
    'ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'
  ) OR declared_type IS NULL),
  calculated_type TEXT NOT NULL CHECK (calculated_type IN (
    'INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP',
    'ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'
  )),
  answers         TEXT NOT NULL,
  persona_name    TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX idx_test_results_user_id ON test_results(user_id);

-- ... repeat for invite_links, perception_votes, curated_insights, articles
```

**`migrations/0002_curated_insights_seed.sql` (skeleton):**

```sql
-- Story 1.5 / Migration 0002_curated_insights_seed
-- Purpose: Seed curated_insights with one PLACEHOLDER row per MBTI type so
--   AI fallback (Story 3.2) and analytics (Story 3.1) have data to read.
-- Satisfies: AC-2, AC-12 of Story 1.5
-- Aligns with: packages/shared/src/db/rows.ts CuratedInsightRow
-- TODO Story 3.1: replace PLACEHOLDER content with curated copy.
-- Applied by: TODO

INSERT INTO curated_insights (id, mbti_type, variant, content, is_active, created_at, updated_at) VALUES
  ('placeholder-insight-INTJ-v1','INTJ','v1','PLACEHOLDER curated insight for INTJ — TODO Story 3.1.',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  ('placeholder-insight-INTP-v1','INTP','v1','PLACEHOLDER curated insight for INTP — TODO Story 3.1.',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z'),
  -- ... 14 more rows, one per remaining MBTI type
  ('placeholder-insight-ESFP-v1','ESFP','v1','PLACEHOLDER curated insight for ESFP — TODO Story 3.1.',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z');
```

**`migrations/0004_pdpa_soft_delete.sql` (skeleton):**

```sql
-- Story 1.5 / Migration 0004_pdpa_soft_delete
-- Purpose: Add deleted_at TEXT to all user-data tables for PDPA soft-delete (FR38);
--   add retention_flag INTEGER to test_results only (matches TestResultRow contract).
-- Satisfies: AC-3, AC-8, AC-12 of Story 1.5
-- Aligns with: packages/shared/src/db/rows.ts deleted_at fields (Story 1.4) and
--   TestResultRow.retention_flag (Story 1.4)
-- Applied by: TODO

ALTER TABLE test_results     ADD COLUMN deleted_at      TEXT    DEFAULT NULL;
ALTER TABLE test_results     ADD COLUMN retention_flag  INTEGER DEFAULT 0;
ALTER TABLE invite_links     ADD COLUMN deleted_at      TEXT    DEFAULT NULL;
ALTER TABLE perception_votes ADD COLUMN deleted_at      TEXT    DEFAULT NULL;

-- Partial indexes for live-only queries (Story 7.4 PDPA purge job).
CREATE INDEX idx_test_results_alive     ON test_results(deleted_at)     WHERE deleted_at IS NULL;
CREATE INDEX idx_invite_links_alive     ON invite_links(deleted_at)     WHERE deleted_at IS NULL;
CREATE INDEX idx_perception_votes_alive ON perception_votes(deleted_at) WHERE deleted_at IS NULL;
```

**`apps/api/src/lib/db.ts` (full file after this story):**

```ts
import type { Context } from 'hono';
import type { CuratedInsightRow } from '@mbti/shared';
import { MBTI_TYPES, type MBTIType } from '@mbti/shared';
import type { Bindings, Variables } from '../types/bindings';

/**
 * D1 access boundary.
 *
 * Rules (architecture.md#Enforcement Guidelines, Story 1.5 AC-9/AC-10):
 *  - Route handlers MUST NOT call `c.env.DB` directly. Always go through
 *    a typed helper exported from this module.
 *  - All queries use prepared statements with `.bind(...)`. NEVER string
 *    interpolation in SQL.
 *  - Snake_case row shapes from `@mbti/shared` row interfaces are returned
 *    as-is. The Hono response builder layer (route handlers) is responsible
 *    for the snake→camel transform.
 *  - This file scaffolds the minimum surface needed by the AI fallback
 *    (Story 3.2) and content feed (Story 6.1). Feature stories add
 *    domain-specific helpers as they land — do not pre-add helpers here.
 */

export type DbContext = { db: D1Database };

export function withDb(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
): D1Database {
  return c.env.DB;
}

export async function getActiveCuratedInsights(
  db: D1Database,
  mbtiType: MBTIType,
): Promise<CuratedInsightRow[]> {
  if (!MBTI_TYPES.includes(mbtiType)) {
    throw new Error(`getActiveCuratedInsights: invalid mbtiType "${mbtiType}"`);
  }
  const result = await db
    .prepare(
      'SELECT id, mbti_type, variant, content, is_active, created_at, updated_at ' +
        'FROM curated_insights WHERE mbti_type = ? AND is_active = 1',
    )
    .bind(mbtiType)
    .all<CuratedInsightRow>();
  return result.results ?? [];
}
```

**`apps/api/wrangler.toml` (D1 block after this story):**

```toml
[[d1_databases]]
binding = "DB"
database_name = "mbti"
database_id = "<REAL-UUID-FROM-WRANGLER-D1-CREATE>"
migrations_dir = "../../migrations"
```

### Manual Verification Recipe

No automated test framework yet (Story 1.7 owns Vitest + Playwright). Verify manually:

1. **Provision (Task 1) — once per environment:** `wrangler d1 create mbti` → capture UUID → paste into `wrangler.toml`. Verify `wrangler d1 list` shows the DB.
2. **Local apply (Task 7):** From `apps/api/`, `wrangler d1 migrations apply mbti --local`. All 4 migrations apply without error.
3. **Table existence:** `wrangler d1 execute mbti --local --command="SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'd1_%' AND name NOT LIKE 'sqlite_%' ORDER BY name;"` → 5 rows: `articles, curated_insights, invite_links, perception_votes, test_results`. (AC-1)
4. **Curated seed coverage:** `wrangler d1 execute mbti --local --command="SELECT COUNT(DISTINCT mbti_type) FROM curated_insights WHERE is_active = 1;"` → `16`. (AC-2)
5. **Articles seed coverage:** `wrangler d1 execute mbti --local --command="SELECT COUNT(DISTINCT mbti_type) FROM articles WHERE is_published = 1;"` → `16`. (AC-7)
6. **Soft-delete columns:** `wrangler d1 execute mbti --local --command="PRAGMA table_info('test_results');"` → confirm `deleted_at` and `retention_flag` columns present. Repeat for `invite_links` and `perception_votes` — `deleted_at` only. (AC-3)
7. **CHECK constraint sanity:** `wrangler d1 execute mbti --local --command="INSERT INTO curated_insights (id, mbti_type, variant, content, is_active, created_at, updated_at) VALUES ('test-bad-type','XXXX','v1','x',1,'2026-04-30T00:00:00.000Z','2026-04-30T00:00:00.000Z');"` → expect `CHECK constraint failed` error. Confirms AC-8 enforcement at DB layer.
8. **Remote apply (Task 8):** From `apps/api/`, `wrangler d1 migrations apply mbti --remote`. Then `wrangler d1 migrations list mbti --remote` → 4 applied, 0 pending. (AC-4)
9. **Helper smoke (Task 9):** Temporarily in `apps/api/src/index.ts` add a debug route:
   ```ts
   app.get('/api/_debug/insights/:type', async (c) => {
     const { getActiveCuratedInsights, withDb } = await import('./lib/db');
     const rows = await getActiveCuratedInsights(withDb(c), c.req.param('type') as never);
     return c.json({ data: rows, error: null });
   });
   ```
   Run `pnpm dev`, hit `http://localhost:8787/api/_debug/insights/INFP` → returns the placeholder INFP insight in `data`. **Remove the debug route before commit.** (AC-10)
10. **Lint + typecheck:** `pnpm lint && pnpm typecheck` from monorepo root → zero errors across all 3 packages. (AC-11)
11. **Full system smoke:** `pnpm dev` from monorepo root → both apps start; `GET http://localhost:8787/api/health` returns `{ data: { status: 'ok' }, error: null }`. (Story 1.3 contract preserved.)

### Previous Story Intelligence

**From Story 1.4 (`1-4-shared-package-...md`):**
- D1 row interfaces in `packages/shared/src/db/rows.ts` are the contract this story conforms to. **Do not modify** them in this story — schema must match field-by-field. Notable contract details:
  - `TestResultRow.calculated_type: MBTIType` (NOT NULL) — schema column name is `calculated_type`, but the API response field is `mbtiType` (snake→camel transform is a route-handler responsibility, NOT this story's concern).
  - `TestResultRow.persona_name: string` (NOT NULL) — `0004` migration must NOT make this nullable; insert paths in feature stories MUST always populate it. (Story 1.4 made this an explicit contract in its decision-needed review.)
  - `TestResultRow.retention_flag: 0 | 1 | null` — only `test_results` has this column; `invite_links` and `perception_votes` row interfaces do not declare it, so 0004 must NOT add it to those tables.
  - `is_active`, `is_published` are `0 | 1` literal types — `CHECK (col IN (0,1))` enforces at DB layer.
  - `mbti_type` columns are `MBTIType` union (NOT NULL on `articles` and `curated_insights`) — `CHECK (mbti_type IN <16-tuple>)` enforces at DB layer.
- Deferred from 1.4 → addressed here:
  - **UUID case-sensitivity (`schemas/invite.ts:4,10; schemas/test.ts:21`):** SQLite TEXT comparisons are case-sensitive. `lib/db.ts` helpers must lower-case UUID inputs at the boundary on both insert AND lookup. AC-10 requires this for `getActiveCuratedInsights`'s `mbtiType` arg validation pattern; future feature stories adding token-keyed helpers must follow the same `.toLowerCase()` convention.
  - **`new Date().toISOString()` ingestion contract (`schemas/test.ts:25`):** All inserts in feature stories MUST pass `new Date().toISOString()` for timestamp columns. Schema column defaults `(strftime('%Y-%m-%dT%H:%M:%fZ','now'))` produce a `Z`-suffixed ISO 8601 string compatible with Zod's `.datetime({offset:false})`. Documented in this story's dev notes; enforcement happens in feature stories' insert helpers.
- Deferred from 1.4 → NOT addressed here (still owned by future stories):
  - `PerceptionVoteSchema.inviteToken: z.string().uuid()` vs `InviteLinkRow.token: string` (free-form) — Story 4.1 owns token-generation strategy.
  - `queryKeys` empty-string guards — Story 4.x feature stories.
  - `PLACEHOLDER_REASON` for `VILLAINS_MAP` — Story 3.1 acceptance gate.

**From Story 1.3 (`1-3-hono-v4-12-api-workers-...md`):**
- `apps/api/src/lib/db.ts` is currently a stub exporting only `DbContext`. This story owns the first real helpers.
- `apps/api/src/types/bindings.ts` already exports `Bindings = { DB: D1Database; KV: KVNamespace; ASSETS_BUCKET: R2Bucket; RATE_LIMITER: RateLimit }`. No changes needed — `DB` typing is already in place.
- `wrangler.toml` `[[d1_databases]]` block exists with placeholder `database_id` — this story replaces the placeholder with the real UUID.
- Deferred from 1.3 → NOT addressed here: rate limiter `namespace_id = "1001"` collision risk; CORS allowlist hardcoding; ZodError leak; `compatibility_date` bump — all owned by Stories 1.6 / 1.7.

**From Story 1.1 (`1-1-monorepo-scaffold-...md`):**
- Monorepo root structure permits a top-level `migrations/` directory — no Turbo or pnpm-workspace config change needed (it's not a workspace package).
- `.gitignore` already excludes `.wrangler/` (where local SQLite state lives), `.dev.vars`, `dist`, `node_modules`. New `migrations/` directory is tracked by default.

### Scope Boundaries — DO NOT Do These

- **Do NOT install any ORM** (Drizzle, Prisma, Kysely, knex, etc.) — D1 access is raw SQL via Workers binding only. (`architecture.md#Data Architecture`)
- **Do NOT install `better-sqlite3` or any Node-only SQLite library** — Workers runtime does not support Node-only modules at MVP. Dev SQLite state is managed entirely by `wrangler dev --local`.
- **Do NOT add a `users` table** — anonymous session model uses KV (`apps/api/src/lib/kv.ts`). `user_id` columns store the KV-issued anonymous session UUID; there is no separate users row.
- **Do NOT modify `packages/shared/src/db/rows.ts`** — it is this story's contract. If a contract change is genuinely needed, raise it in dev notes and stop; that's a Story 1.4 amendment.
- **Do NOT add real curated insight or article copy** — Story 3.1 owns curated insight content; Stories 6.1 / 7.2 own article content. Use placeholder strings with `TODO Story X.Y` markers.
- **Do NOT add route handlers** for tests / insights / invites / etc. — feature stories own those. The only `apps/api/src/` change in this story is `lib/db.ts`.
- **Do NOT modify `[[kv_namespaces]]`, `[[r2_buckets]]`, or `[[unsafe.bindings]]` in `wrangler.toml`** — Story 1.6 owns those provisioning steps.
- **Do NOT bump `compatibility_date`** — Story 1.7 owns the bump alongside CI hygiene (deferred-work item from Story 1.3).
- **Do NOT install Vitest / Playwright** — Story 1.7 owns testing setup. Verification is manual per the recipe above.
- **Do NOT add a `users` row interface** to `packages/shared` — anonymous session model has no users table.
- **Do NOT add insert/update helpers for `test_results`, `invite_links`, etc.** to `lib/db.ts` — only the read helper for `curated_insights` is in scope (because Story 3.2 AI fallback is the only consumer that exists in the planned dependency chain). Other read/write helpers come with their owning feature stories.

### Architectural Drift Notes (Read Before Implementing)

The architecture document and the epics file have minor inconsistencies in how migrations are split. This story resolves the conflict in favor of the epics file (the source of truth for ACs):

| Source | Migration split |
|---|---|
| `architecture.md#Project Structure` (line 530) | `0001_initial_schema.sql` → "test_results, invite_links, perception_votes, articles" (4 tables); `0002_curated_insights.sql` → curated_insights table; `0003_content.sql` → articles (duplicate?); `0004_pdpa_soft_delete.sql` |
| `epics.md#Story 1.5 AC-1` | `0001_initial_schema.sql` → all 5 tables exist after applying it (literal reading) |
| **This story's resolution** | `0001_initial_schema.sql` creates ALL 5 tables (matches AC-1 literal); `0002_curated_insights_seed.sql` seeds `curated_insights` only (matches AC-2 literal naming); `0003_articles_seed.sql` seeds `articles` only (satisfies AC-7 dev-data need); `0004_pdpa_soft_delete.sql` ALTERs (matches AC-3) |

Architecture also notes a `seed.sql` file ("Dev seed: MBTI types, curated insights, sample articles"). We do NOT create a separate `seed.sql` — Wrangler does not auto-apply it, and using the migration system for seed data gives us applied-tracking and per-environment idempotency. The 0002/0003 seed migrations satisfy this need.

The architecture's 16-types × multi-variant phrasing for `curated_insights` ("16 types × curated insight variants") is still satisfied by the schema's `variant` column — this story seeds one variant per type (`v1`); Story 3.1 / FR10 / FR44 will add additional variants per type as A/B copy lands.

Architecture mentions `retention_flag` "on all user tables" — but `packages/shared/src/db/rows.ts` (Story 1.4 deliverable) only declares `retention_flag` on `TestResultRow`. **The row interface is authoritative.** This story honors the row interface — only `test_results` gets `retention_flag`. If product or compliance later requires `retention_flag` on `invite_links` and `perception_votes`, that becomes a new migration plus a Story 1.4 row-interface amendment in a future story.

### Operational Runbook (For User When Dev Agent Lacks Cloudflare Auth)

Some Cloudflare commands require interactive `wrangler login`. If the dev agent does not have credentials, the user must perform these steps from the monorepo root or `apps/api/`:

```bash
# One-time, from anywhere:
wrangler login

# Provision the database (one-time, from apps/api/):
cd apps/api
wrangler d1 create mbti
# → copy the printed `database_id` UUID into wrangler.toml [[d1_databases]] block

# Apply migrations to local dev SQLite (any time, from apps/api/):
wrangler d1 migrations apply mbti --local

# Apply migrations to production D1 (one-time per migration set, from apps/api/):
wrangler d1 migrations apply mbti --remote

# Verify (from apps/api/):
wrangler d1 migrations list mbti --local
wrangler d1 migrations list mbti --remote
wrangler d1 execute mbti --local  --command="SELECT COUNT(*) FROM curated_insights;"
wrangler d1 execute mbti --remote --command="SELECT COUNT(*) FROM curated_insights;"
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5 — Cloudflare D1 Database Setup with Schema Migrations and Seed Data (AC-1 through AC-5; this story adds AC-6 through AC-12 as elaborations)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — Cloudflare D1 (SQLite) primary relational store; Wrangler CLI for migrations; raw SQL via Workers binding; no ORM]
- [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns — TEXT timestamps storing ISO 8601 strings; INTEGER 0|1 booleans; snake_case columns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns — Database naming: snake_case tables (plural), snake_case columns, is_/has_ boolean prefix, TEXT timestamp columns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries — `migrations/` at monorepo root; `apps/api/src/lib/db.ts` owns D1 helpers; route handlers never call `c.env.DB` directly]
- [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines — typed helper functions in `lib/db.ts`; prepared statements; never string interpolation; never raw `c.env.DB` in route handlers]
- [Source: _bmad-output/planning-artifacts/architecture.md#Gap 4 (D1 SQLite date handling) — TEXT timestamps; `WHERE expired_at > datetime('now')` pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Component Dependencies — D1 setup (this story) is a prerequisite for any feature story that persists data]
- [Source: _bmad-output/planning-artifacts/prd.md#FR38 — User data deletion → soft-delete pattern via `deleted_at` column (this story's 0004 migration)]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR9 — Invite links 30-day expiry → `expired_at` TEXT column with `WHERE expired_at > datetime('now')` server-side check]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR11 — Data deletion within 30 days → soft-delete via 0004 migration; physical purge job in Story 7.4]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR17 — AI fallback to curated D1 insights → `getActiveCuratedInsights` helper from this story (consumed by Story 3.2 `lib/ai.ts`)]
- [Source: _bmad-output/implementation-artifacts/1-4-shared-package-with-zod-schemas-d1-row-interfaces-and-query-key-factories.md#File List, #Decision-needed reviews — `packages/shared/src/db/rows.ts` is the contract; `MBTIType` narrowed; `persona_name` non-nullable; `retention_flag` only on `TestResultRow`]
- [Source: _bmad-output/implementation-artifacts/1-3-hono-v4-12-api-workers-with-kv-session-auth-and-response-envelope.md#File List — `apps/api/src/lib/db.ts` is a stub with `DbContext`; `Bindings.DB: D1Database` already typed; `wrangler.toml` placeholder UUID]
- [Source: _bmad-output/implementation-artifacts/1-1-monorepo-scaffold-with-turborepo-and-pnpm-workspaces.md — root `.gitignore` excludes `.wrangler/`; `migrations/` is not a workspace package]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md#1-4 — UUID case-sensitivity, ISO 8601 ingestion contract — addressed at the `lib/db.ts` boundary in this story]

### Review Findings

**Decision-needed:**

- [x] [Review][Decision] **Resolved → Patch P8.** FK `perception_votes.invite_token → invite_links(token)` lacks ON DELETE/UPDATE action — `migrations/0001_initial_schema.sql:55`. **Decision: ON DELETE CASCADE** (votes purge automatically when invite_link is deleted; PDPA-friendly; aligns with Story 7.4 purge semantics). FK enforcement is currently a no-op at D1 runtime (Patch P2), but documenting the intent in schema lets Story 7.4 (and any future PRAGMA-on / app-layer cascade helper) honor it.

- [x] [Review][Decision] **Resolved → Dismissed.** `getActiveCuratedInsights` empty-result semantics — `apps/api/src/lib/db.ts:50`. **Decision: keep returning `[]`** — consumer (Story 3.2 AI fallback) decides UX. Current behavior is correct as-is; sets the precedent that "active-flag" helpers are graceful, not strict.

**Patches (unchecked, fixable without further input):**

- [x] [Review][Patch] `retention_flag` column missing `CHECK (retention_flag IN (0,1) OR retention_flag IS NULL)` constraint — AC-8 / Schema Definitions gap [`migrations/0004_pdpa_soft_delete.sql:16`]. ALTER TABLE ADD COLUMN supports column-level CHECK in SQLite; the spec's defense-in-depth rule for `0|1` literals is not enforced for `retention_flag` even though it is for `is_active` and `is_published`.
- [x] [Review][Patch] `PRAGMA foreign_keys = ON` is misleading — D1 runtime ignores it [`migrations/0001_initial_schema.sql:9`]. PRAGMA is per-connection; the migration runner's connection ≠ runtime Worker connection. Drop the PRAGMA and add a comment clarifying that runtime FK enforcement requires app-layer checks (or per-request PRAGMA, if D1 supports it).
- [x] [Review][Patch] SQL string concat in `getActiveCuratedInsights` is brittle — a Prettier reformat that drops the trailing space joins `updated_atFROM`, silently breaking the query [`apps/api/src/lib/db.ts:45-47`]. Replace `'... updated_at ' + 'FROM ...'` with a single template literal.
- [x] [Review][Patch] Seed migrations don't use `INSERT OR IGNORE` — re-applying 0002/0003 in a snapshot-restored or partially-seeded environment hits PRIMARY KEY collisions and aborts [`migrations/0002_curated_insights_seed.sql`, `migrations/0003_articles_seed.sql`]. Wrangler migration tracking usually prevents this, but defense-in-depth aligns with the deterministic-ID seed pattern.
- [x] [Review][Patch] `withDb(c)` returns `c.env.DB` without checking it's defined — misconfigured binding crashes downstream with `Cannot read properties of undefined (reading 'prepare')` and surfaces as opaque 500 [`apps/api/src/lib/db.ts:28-32`]. Add `if (!c.env.DB) throw new Error('D1 binding "DB" not configured');`.
- [x] [Review][Patch] `getActiveCuratedInsights` swallows D1 partial-success errors — `result.results ?? []` returns `[]` for both "no rows" and `{ success: false, error: ... }` [`apps/api/src/lib/db.ts:50`]. Add `if (!result.success) throw new Error(result.error ?? 'D1 query failed')` before the return.
- [x] [Review][Patch] `articles` allows `is_published = 1` with `published_at IS NULL` — Schema Definitions documents the invariant ("NULL = draft; NOT NULL with `is_published=1` = published") but does not enforce it [`migrations/0001_initial_schema.sql` articles table]. Add `CHECK (is_published = 0 OR published_at IS NOT NULL)` to the table.
- [x] [Review][Patch] **From D1.** Add `ON DELETE CASCADE` to `perception_votes.invite_token REFERENCES invite_links(token)` [`migrations/0001_initial_schema.sql:55`]. Documents PDPA cascade intent; Story 7.4 purge job and any runtime FK-on configuration will honor it.

**Deferred (pre-existing or not this story's scope):**

- [x] [Review][Defer] No predeploy guard rejects placeholder `database_id="00000000-..."` — Story 1.7 owns CI guards.
- [x] [Review][Defer] PDPA soft-delete is insufficient for PII (`answers` / `behavioral_answers` JSON columns); hard-delete + encryption belongs to Story 7.4 PDPA purge job.
- [x] [Review][Defer] Repeated 16-type CHECK list across 4 columns is a drift bomb; Story 1.7 should add a schema test that diffs the literal tuples against `MBTI_TYPES` from `@mbti/shared`.
- [x] [Review][Defer] TEXT timestamps are non-monotonic vs INTEGER epoch — architectural choice per `architecture.md#Format Patterns`; Phase 2 reconsideration if D1 → Supabase migration happens.
- [x] [Review][Defer] `inviter_result_id` is a soft reference (no FK) — same KV-anonymous-session pattern as `user_id`/`inviter_user_id`; documented design choice.
- [x] [Review][Defer] `updated_at` has DEFAULT but no `AFTER UPDATE` trigger; feature-story UPDATE helpers must explicitly set `updated_at = strftime(...)` — convention will be encoded in those helpers.
- [x] [Review][Defer] `expired_at > created_at` CHECK does lexicographic ISO string comparison; safe only if all writers emit identical ISO format. Format is pinned by `new Date().toISOString()` invariant (deferred-work from Story 1.4); future helper stories enforce on insert.
- [x] [Review][Defer] `getActiveCuratedInsights` Error message leaks function name + raw input — future error-handling pass when Sentry / structured logging lands (Story 1.7 / 7.x).
- [x] [Review][Defer] No UNIQUE on `(mbti_type, variant)` in `curated_insights` — Story 3.1 / FR10 / FR44 own variant management semantics.
- [x] [Review][Defer] Partial indexes `WHERE deleted_at IS NULL` only help queries that include the same predicate; Story 7.4 (PDPA purge) and feature-story query helpers will refine to composite indexes (e.g., `(user_id) WHERE deleted_at IS NULL`) as real query shapes emerge.
- [x] [Review][Defer] No down-migrations / rollback scripts — D1 wrangler migration system is forward-only; recovery via point-in-time restore.
- [x] [Review][Defer] `idx_test_results_user_id` doesn't include `deleted_at` predicate; Story 7.4 will refine when implementing live-only queries.
- [x] [Review][Defer] "Applied by: TODO" header in each migration — user fills when running Task 1.1/1.2/1.4 (real engineer name + apply timestamp).
- [x] [Review][Defer] `migrations_dir = "../../migrations"` requires running wrangler from `apps/api/`; Operational Runbook documents the required cwd. Optional QoL improvement: add `db:apply:local` / `db:apply:remote` npm scripts in `apps/api/package.json` — out of Story 1.5 scope.
- [x] [Review][Defer] Mixed-case TEXT primary keys / tokens — convention documented in `lib/db.ts` JSDoc; brand types (`Uuid` newtype) are out of scope for Story 1.5.
- [x] [Review][Defer] FK semantics ignore parent `deleted_at` — application-layer enforcement; Story 7.4 / Story 4.x own.
- [x] [Review][Defer] `declared_type` rejects empty string at INSERT — route-handler responsibility to normalize `''` → `NULL` (Zod schema in `@mbti/shared` already documents the contract); future feature stories handle.
- [x] [Review][Defer] `deleted_at TEXT` has no ISO 8601 format guard at DB layer — centralized helper writes (Story 7.4 PDPA purge) will enforce.
- [x] [Review][Defer] `strftime('%Y-%m-%dT%H:%M:%fZ','now')` vs `new Date().toISOString()` byte equality + risk of `'localtime'` modifier — documented in dev notes; future helpers ban `'localtime'`.
- [x] [Review][Defer] All 16 seed rows share identical timestamp → `ORDER BY created_at` is non-deterministic; Story 7.x admin dashboard ordering will resolve via tie-breaker.
- [x] [Review][Defer] Hardcoded seed date `'2026-04-30T00:00:00.000Z'` may be excluded by recency filters (`WHERE created_at > datetime('now','-N days')`) — Story 3.2 / 6.1 design decisions.
- [x] [Review][Defer] `getActiveCuratedInsights` SELECT field list does not auto-track `CuratedInsightRow` additions — review process catches drift; consider `SELECT *` if/when row interface stabilizes.
- [x] [Review][Defer] `articles.slug` and `invite_links.token` use BINARY collation (case-sensitive) — `articles.slug` normalization is Story 6.1 input handling; `invite_links.token` lower-case enforcement is Story 4.1 token-generation strategy.
- [x] [Review][Defer] No UNIQUE on `(mbti_type)` filtered by `is_published=1` for `articles` — product invariant decision (one published per type vs many) belongs to Story 6.1 / Story 7.2.
- [x] [Review][Defer] No length caps / non-empty CHECKs on `answers`, `behavioral_answers`, `persona_name`, `title`, `content`, `voter_session_id` — Zod schemas at API layer enforce; DB-layer CHECKs are scope creep.
- [x] [Review][Defer] `migrations_dir` doesn't filter `*.sql` — `.DS_Store` risk handled by root `.gitignore`; future addition: `migrations/.gitignore` excluding non-SQL files.
- [x] [Review][Defer] `retention_flag` 3-valued logic (NULL distinct from 0/1) requires careful PDPA purge filters — Story 7.4 defines semantics.

**Dismissed as noise (13 — not applicable to this story):**

- No FK on `user_id`/`inviter_user_id` columns / no `users` table — KV anonymous-session model is the explicit design (`architecture.md#Authentication & Security`; story Scope Boundaries forbids `users` table).
- `withDb` "returns raw D1Database" — that's literally the AC-10 spec; `withDb` IS the typed accessor route handlers must use instead of `c.env.DB`.
- `getActiveCuratedInsights` doesn't filter `deleted_at IS NULL` — `curated_insights` does not have a `deleted_at` column (0004 only adds it to user-data tables); not applicable.
- Redundant `OR declared_type IS NULL` in CHECK — matches Schema Definitions (Authoritative) verbatim; defensive belt-and-suspenders is intentional.
- Redundant `UNIQUE` + duplicate `idx_articles_slug` — Task 3.7 explicitly requires the named unique index for query-planner inspectability.
- `expired_at` should be `expires_at` — matches `InviteLinkRow.expired_at` row interface contract (Story 1.4); renaming is breaking.
- `MBTI_TYPES.includes(mbtiType)` is "dead code" given typed parameter — AC-10 explicitly requires the defensive runtime check (callers using `as MBTIType` cast can sneak invalid values past the type system).
- Hardcoded seed timestamps `'2026-04-30T00:00:00.000Z'` — deterministic by design; spec intent.
- PLACEHOLDER content with `is_active=1` / `is_published=1` ships to prod — AC-2 and AC-7 explicitly require these flags so AI fallback (Story 3.2) and content feed (Story 6.1) have data on first deploy.
- SQL formatting / column padding inconsistencies — cosmetic.
- `DbContext` exported but unused inside `lib/db.ts` — Story 1.3 contract requires keeping the export for downstream consumers.
- Docblock references external story numbers / architecture sections — explicit story documentation style.
- Branded type / `Symbol.toPrimitive` coercion in `mbtiType` validation — far-fetched given TypeScript boundary; Zod at API layer would catch.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (claude-opus-4-7)

### Debug Log References

- Wrangler version: `4.86.0` (resolved via `pnpm exec wrangler --version` from `apps/api/`).
- `wrangler whoami` returned "You are not authenticated" — dev agent has no Cloudflare credentials, so all `--remote` operations and `wrangler d1 create` are blocked on the user.
- `pnpm exec wrangler d1 migrations list mbti --local` from `apps/api/` discovered all four migration files via `migrations_dir = "../../migrations"` — confirms AC-6.
- `pnpm exec wrangler d1 migrations apply mbti --local` from `apps/api/` applied all four migrations cleanly:
  - `0001_initial_schema.sql ✅` (table CREATEs)
  - `0002_curated_insights_seed.sql ✅` (16 INSERTs)
  - `0003_articles_seed.sql ✅` (16 INSERTs)
  - `0004_pdpa_soft_delete.sql ✅` (4 ALTERs + 3 partial indexes; 8 commands executed)
  - Local DB file created under `apps/api/.wrangler/state/v3/d1` (gitignored).
- AC-1 verification: `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'd1_%' AND name NOT LIKE 'sqlite_%' ORDER BY name;` returned exactly: `articles, curated_insights, invite_links, perception_votes, test_results`.
- AC-2 verification: `SELECT COUNT(DISTINCT mbti_type) FROM curated_insights WHERE is_active = 1` → `16`. `SELECT COUNT(*) FROM curated_insights WHERE mbti_type = 'INFP' AND is_active = 1` → `1`.
- AC-7 verification: `SELECT COUNT(DISTINCT mbti_type) FROM articles WHERE is_published = 1` → `16`.
- AC-3 verification: `PRAGMA table_info('test_results')` shows `deleted_at` (cid 8, TEXT, notnull=0, dflt_value="NULL") and `retention_flag` (cid 9, INTEGER, notnull=0, dflt_value="0"). `PRAGMA table_info('invite_links')` shows `deleted_at` at cid 6 only — no `retention_flag`. Same for `perception_votes`.
- AC-8 verification: `INSERT INTO curated_insights ... VALUES ('test-bad-type','XXXX',...)` correctly failed with `CHECK constraint failed: mbti_type IN (...)` — `SQLITE_CONSTRAINT_CHECK`. Follow-up `SELECT COUNT(*) FROM curated_insights WHERE id = 'test-bad-type'` → `0` confirms the row was rejected.
- AC-11: `pnpm typecheck` (Turbo) → 3 successful, 0 failures across `@mbti/web`, `@mbti/api`, `@mbti/shared`. `pnpm lint` → 3 successful, 0 failures.
- Wrangler logs throw a non-blocking warning: `"unsafe" fields are experimental and may change or break at any time.` — this refers to the existing `[[unsafe.bindings]]` Rate Limiter block from Story 1.3 and is not introduced by this story.
- Local SQLite state lives under `apps/api/.wrangler/state/v3/d1`; already covered by the root `.gitignore` `.wrangler` rule.

### Completion Notes List

- **AC coverage summary:** 10 of 12 ACs fully verified by dev agent. AC-4 (remote apply) and AC-5 (real `database_id` UUID in `wrangler.toml`) are blocked on Cloudflare auth and require user action — see "Operational Runbook" below; both are intentionally NOT marked complete.
- **Schema vs `packages/shared/src/db/rows.ts` contract:** All 5 row interfaces map field-by-field to the migrations as documented in the Schema Definitions table. Verified via PRAGMA inspections in Debug Log. No row interface modifications were needed.
- **MBTI CHECK enforcement at DB layer (defense-in-depth):** Live test inserted `mbti_type = 'XXXX'` into `curated_insights` and was rejected by SQLite `CHECK constraint`. This confirms the union narrowing on `MBTIType` is enforced at all three layers: Zod (Story 1.4), TypeScript (Story 1.4), and now SQLite CHECK (this story).
- **PDPA partial indexes:** Added `WHERE deleted_at IS NULL` partial indexes on the 3 user-data tables — Story 7.4's purge job (and any future "live rows only" query) gets index-backed reads without storing tombstoned rows in the index.
- **`lib/db.ts` minimal surface:** Only `withDb(c)` and `getActiveCuratedInsights(db, mbtiType)` are exported. No insert/update helpers, no other read helpers — feature stories own them. JSDoc documents the no-string-interpolation rule + UUID lower-case convention for future helpers.
- **Deferred items from Story 1.4 addressed in this story:**
  - `new Date().toISOString()` ingestion contract is documented in dev notes; defaults `(strftime('%Y-%m-%dT%H:%M:%fZ','now'))` produce `Z`-suffixed strings compatible with Zod `.datetime({offset:false})`.
  - UUID lower-case convention is documented in `lib/db.ts` JSDoc for future feature stories that introduce UUID-keyed helpers (this story does not).
- **Pre-existing wrangler warning:** `[[unsafe.bindings]]` Rate Limiter block from Story 1.3 generates a wrangler warning. Not in scope for this story (deferred-work item).
- **No regressions:** `pnpm lint && pnpm typecheck` pass across all 3 packages — Story 1.1 / 1.3 / 1.4 contracts preserved.

### File List

- `apps/api/wrangler.toml` (MODIFIED — added `migrations_dir = "../../migrations"`; updated TODO comment on placeholder `database_id` to reference Task 1.1; placeholder UUID retained pending user provisioning)
- `apps/api/src/lib/db.ts` (MODIFIED — replaced stub with `withDb(c)` + `getActiveCuratedInsights(db, mbtiType)` + JSDoc rule block; preserved `DbContext` type export for backward compatibility)
- `migrations/0001_initial_schema.sql` (NEW — 5 tables: `test_results`, `invite_links`, `perception_votes`, `curated_insights`, `articles`; 16-tuple MBTI `CHECK` constraints; UNIQUE on `invite_links.token` and `articles.slug`; FK `perception_votes.invite_token → invite_links(token)`; 6 indexes)
- `migrations/0002_curated_insights_seed.sql` (NEW — 16 INSERTs into `curated_insights`, one per MBTI type, deterministic IDs, placeholder content with TODO Story 3.1 marker)
- `migrations/0003_articles_seed.sql` (NEW — 16 INSERTs into `articles`, one per MBTI type, slug pattern `mbti-{type-lower}-overview-v1`, placeholder content with TODO Story 6.1 / Story 7.2 marker)
- `migrations/0004_pdpa_soft_delete.sql` (NEW — 4 ALTERs adding `deleted_at TEXT` to all 3 user-data tables and `retention_flag INTEGER` to `test_results` only; 3 partial indexes `WHERE deleted_at IS NULL`)

## Change Log

- 2026-04-30: Story 1.5 implemented — `migrations/` directory created at monorepo root with 4 SQL migrations (initial schema, curated insights seed, articles seed, PDPA soft-delete). `apps/api/wrangler.toml` configured with `migrations_dir = "../../migrations"`. `apps/api/src/lib/db.ts` upgraded from stub to provide `withDb(c)` and `getActiveCuratedInsights(db, mbtiType)` per AC-9/AC-10. All four migrations applied locally and verified: 5 tables present, 16 curated insights (one per MBTI type), 16 published articles (one per MBTI type), `deleted_at` + `retention_flag` columns added per row-interface contract, MBTI `CHECK` constraint rejects invalid types at DB layer. `pnpm lint && pnpm typecheck` pass with zero errors. AC-4 (remote apply) and AC-5 (real `database_id`) blocked on Cloudflare auth — runbook provided in story for user to complete.
- 2026-04-30: Code review applied — 2 decisions resolved (D1 → ON DELETE CASCADE on `perception_votes.invite_token` FK; D2 → keep `getActiveCuratedInsights` returning `[]` for graceful Story 3.2 fallback). 8 patches applied: (P1) `retention_flag` CHECK constraint added in 0004 — closes the AC-8 gap flagged by Acceptance Auditor; (P2) misleading `PRAGMA foreign_keys = ON` removed from 0001 + comment block clarifies D1 runtime FK status; (P3) SQL string concat in `getActiveCuratedInsights` replaced with template literal; (P4) `INSERT OR IGNORE` added to 0002 / 0003 seed migrations for re-run safety; (P5) `withDb(c)` now throws when `c.env.DB` is undefined; (P6) `getActiveCuratedInsights` now throws when `result.success === false` instead of swallowing D1 errors as `[]`; (P7) `articles` CHECK enforces `is_published = 0 OR published_at IS NOT NULL`; (P8) `perception_votes.invite_token REFERENCES invite_links(token) ON DELETE CASCADE`. Local D1 state reset (`rm -rf apps/api/.wrangler/state/v3/d1`) and all 4 migrations re-applied — re-verified: P1 rejects `retention_flag = 2`, P7 rejects `is_published = 1` with `published_at = NULL`, P4 idempotent re-run keeps row count at 16. `pnpm lint && pnpm typecheck` still pass. 27 findings deferred to future stories (see `deferred-work.md` heading "Deferred from: code review of 1-5-cloudflare-d1-database-setup (2026-04-30)"); 13 findings dismissed as noise (false positives or matches-spec). AC-4 and AC-5 still blocked on Cloudflare auth — story remains `in-progress` until user completes the Operational Runbook.
- 2026-04-30: Cloudflare-auth-blocked tasks unblocked and completed. User ran `wrangler login`. Dev agent ran `wrangler d1 create mbti` → DB UUID `ea15a996-8fd9-4ef9-8e6b-3ea13eb6c581` (region APAC); pasted UUID into `apps/api/wrangler.toml` and removed all `# TODO Story 1.5` comments. Ran `wrangler d1 migrations apply mbti --remote` → all 4 migrations applied cleanly (`0001_initial_schema.sql ✅, 0002_curated_insights_seed.sql ✅, 0003_articles_seed.sql ✅, 0004_pdpa_soft_delete.sql ✅`). Verified `wrangler d1 migrations list mbti --remote` → 0 pending; `SELECT name FROM sqlite_master ...` returns all 5 tables (`articles, curated_insights, invite_links, perception_votes, test_results`); `SELECT COUNT(...) FROM curated_insights WHERE is_active = 1` and `articles WHERE is_published = 1` both return 16 rows. AC-4 + AC-5 satisfied. `pnpm typecheck` + `pnpm lint` re-run after toml edit → still 0 errors. Story status: `in-progress` → `review` (ready for code-review-already-applied confirmation; can transition to `done` when user marks it).
