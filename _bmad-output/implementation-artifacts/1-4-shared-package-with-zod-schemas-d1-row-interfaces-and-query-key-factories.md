# Story 1.4: Shared Package with Zod Schemas, D1 Row Interfaces, and Query Key Factories

Status: done

## Story

As a developer,
I want `packages/shared` to export all Zod schemas, D1 TypeScript row interfaces, MBTI constants, and TanStack Query key factories,
so that `apps/web` and `apps/api` share a single source of truth for all contracts without any direct cross-app imports.

## Acceptance Criteria

1. **AC-1: Public barrel exports** — `packages/shared` is built as a workspace package; `apps/web` can run `import { TestSubmitSchema, MBTI_TYPES, queryKeys } from '@mbti/shared'` and all three resolve correctly with full TypeScript inference and zero build errors.

2. **AC-2: Constants module** — `packages/shared/src/constants.ts` exports:
   - `MBTI_TYPES` — `readonly` array of all 16 MBTI type codes (`'INTJ' | ... | 'ESFP'`).
   - `PERSONA_NAMES` — `Record<MBTIType, string>` mapping each type to its persona name (placeholder copy acceptable; actual content owned by Story 3.1).
   - `VILLAINS_MAP` — `Record<MBTIType, ReadonlyArray<{ type: MBTIType; reason: string }>>` mapping each type to exactly 3 friction types with placeholder explanation strings (actual content owned by Story 3.1).
   - All maps are typed `Record<MBTIType, ...>` (NOT `Partial<...>`) — TypeScript must error if any of the 16 keys is missing.

3. **AC-3: Query key factory module** — `packages/shared/src/queryKeys.ts` exports a `queryKeys` object whose methods return `as const` tuples:
   - `queryKeys.testResult(id: string)` → `readonly ['testResult', string]`
   - `queryKeys.socialStatus(userId: string)` → `readonly ['socialStatus', string]`
   - `queryKeys.feed(mbtiType: MBTIType)` → `readonly ['feed', MBTIType]`
   - The module has zero runtime dependencies (no `@tanstack/react-query` import — these are plain typed tuples).

4. **AC-4: D1 row interface module** — `packages/shared/src/db/rows.ts` exports TypeScript interfaces `TestResultRow`, `InviteLinkRow`, `PerceptionVoteRow`, `CuratedInsightRow`, `ArticleRow`. All field types are restricted to `string | number | null` (D1 stores booleans as `0|1` integers and dates as ISO 8601 TEXT). No Supabase, Drizzle, Prisma, or any ORM types are imported.

5. **AC-5: Initial Zod schemas** — The following schemas are exported from `@mbti/shared` and validate inputs/outputs per their architectural role:
   - `TestSubmitSchema` (request body for `POST /api/tests/submit`)
   - `TestResultSchema` (response shape for `GET /api/tests/:id`)
   - `InviteGenerateSchema` (request body for `POST /api/invites/generate`)
   - `PerceptionVoteSchema` (request body for `POST /api/social/vote`)
   - `InsightResponseSchema` (response shape for `POST /api/insights/generate`)

   Each schema also exports its inferred type via `z.infer` (e.g. `export type TestSubmit = z.infer<typeof TestSubmitSchema>`).

6. **AC-6: Zod dependency aligned with `apps/api`** — `packages/shared/package.json` declares `zod` at the same major version (`^4.x`) currently used by `apps/api` (`^4.4.1` per Story 1.3). `pnpm install` resolves a single hoisted Zod version with zero peer warnings.

7. **AC-7: Lint + typecheck pass** — `pnpm lint && pnpm typecheck` from monorepo root pass with zero errors across all 3 packages (`@mbti/web`, `@mbti/api`, `@mbti/shared`).

8. **AC-8: Backward compatibility** — Existing consumers of `import { MBTI_TYPES, MBTIType } from '@mbti/shared'` (Story 1.1, 1.3) continue to work after `MBTI_TYPES` is moved from `index.ts` to `constants.ts` (re-exported via barrel). No call site changes required in `apps/web` or `apps/api`.

## Tasks / Subtasks

- [x] Task 1: Add Zod dependency to `packages/shared` (AC: 5, 6)
  - [x] 1.1 In `packages/shared`, run `pnpm add zod@^4.4.1` (must match `apps/api` major version exactly)
  - [x] 1.2 Verify `pnpm install` from monorepo root resolves with zero peer warnings; check `pnpm-lock.yaml` shows a single hoisted `zod` entry

- [x] Task 2: Move MBTI_TYPES + create constants module (AC: 2, 8)
  - [x] 2.1 Create `packages/shared/src/constants.ts`
  - [x] 2.2 Move `MBTI_TYPES` and the `MBTIType` derived type from `src/index.ts` into `constants.ts`; `as const` is mandatory
  - [x] 2.3 Define `PERSONA_NAMES: Record<MBTIType, string>` with one placeholder string per type (e.g. `INTJ: 'The Architect'`). Add a TODO comment: `// TODO Story 3.1: replace placeholder copy with curated persona names`
  - [x] 2.4 Define `VILLAINS_MAP: Record<MBTIType, ReadonlyArray<{ type: MBTIType; reason: string }>>` with exactly 3 entries per key. Placeholder `reason` strings are acceptable. Add a TODO comment: `// TODO Story 3.1: replace placeholder villain reasons with curated copy`
  - [x] 2.5 Type the maps as `Record<MBTIType, ...>` (NOT `Partial<>`) so missing keys are a typecheck error

- [x] Task 3: Create query key factory module (AC: 3)
  - [x] 3.1 Create `packages/shared/src/queryKeys.ts`
  - [x] 3.2 Export `queryKeys = { testResult, socialStatus, feed }` — each method takes its parameter and returns `[<name>, param] as const`
  - [x] 3.3 `feed` parameter typed as `MBTIType` (imported from `./constants`); `testResult` and `socialStatus` typed as `string`
  - [x] 3.4 Do NOT import `@tanstack/react-query` — these are plain typed tuples consumed by feature stories that own the QueryClient setup

- [x] Task 4: Create D1 row interfaces module (AC: 4)
  - [x] 4.1 Create directory `packages/shared/src/db/` and file `rows.ts`
  - [x] 4.2 Export interfaces (see "D1 Row Interface Definitions" below for full column lists):
    - `TestResultRow`
    - `InviteLinkRow`
    - `PerceptionVoteRow`
    - `CuratedInsightRow`
    - `ArticleRow`
  - [x] 4.3 Every field type MUST be `string`, `number`, `string | null`, or `number | null` — nothing else
  - [x] 4.4 Add file-level JSDoc: `// D1 row shapes — keep aligned with /migrations/*.sql (Story 1.5+). Booleans stored as 0|1 integers; dates stored as ISO 8601 TEXT.`

- [x] Task 5: Create Zod schema modules (AC: 5)
  - [x] 5.1 Create directory `packages/shared/src/schemas/`
  - [x] 5.2 Create `schemas/test.ts` exporting `TestSubmitSchema`, `TestResultSchema` (see "Zod Schema Definitions" below)
  - [x] 5.3 Create `schemas/invite.ts` exporting `InviteGenerateSchema`, `PerceptionVoteSchema`
  - [x] 5.4 Create `schemas/insight.ts` exporting `InsightResponseSchema`
  - [x] 5.5 Each file also exports the inferred type: `export type TestSubmit = z.infer<typeof TestSubmitSchema>`, etc.
  - [x] 5.6 Use `z.string().uuid()` for ID fields, `z.string().datetime({ offset: false })` for ISO 8601 timestamps
  - [x] 5.7 Use `z.enum(MBTI_TYPES)` (Zod 4 accepts a tuple of literals as the enum source) for MBTI type fields — gives runtime validation aligned with the `MBTIType` static type

- [x] Task 6: Refactor `src/index.ts` as barrel re-export (AC: 1, 8)
  - [x] 6.1 Remove inline `MBTI_TYPES` definition (now in `constants.ts`)
  - [x] 6.2 Re-export from each module:
    ```ts
    export * from './constants'
    export * from './queryKeys'
    export * from './db/rows'
    export * from './schemas/test'
    export * from './schemas/invite'
    export * from './schemas/insight'
    ```
  - [x] 6.3 Verify `import { MBTI_TYPES, MBTIType, TestSubmitSchema, queryKeys, TestResultRow } from '@mbti/shared'` resolves from both `apps/web` and `apps/api`

- [x] Task 7: Verify all ACs end-to-end (AC: 1, 7)
  - [x] 7.1 `pnpm install` from monorepo root → resolves with no errors, no peer warnings
  - [x] 7.2 In `apps/web/src/App.tsx` (or any existing file), temporarily add `import { TestSubmitSchema, MBTI_TYPES, queryKeys } from '@mbti/shared'` and reference each at runtime/typecheck level. Run `pnpm typecheck` from `apps/web/`. Remove the temp lines after passing.
  - [x] 7.3 In `apps/api/src/lib/db.ts`, add a typed import sample: `import type { TestResultRow } from '@mbti/shared'` and reference it inside the `DbContext` JSDoc / type — verify typecheck passes. Remove the temp reference.
  - [x] 7.4 `pnpm lint && pnpm typecheck` from monorepo root → zero errors across all 3 packages (AC-7)
  - [x] 7.5 Confirm `apps/api/src/index.ts` (which previously imported `MBTI_TYPES`) is unchanged in behavior — Story 1.3 already removed the import, so no regression possible; verify no other call site references break

### Review Findings

**Decision-needed:**

- [x] [Review][Decision] Narrow DB-row MBTI fields from `string` to `MBTIType` union — `db/rows.ts:7-8 (declared_type, calculated_type), :39 (mbti_type), :49 (mbti_type)`. Plain `string` lets corrupt/legacy rows ('intj', 'INTJ ', 'XXXX') pass through `c.json(row)` directly to the client; downstream `PERSONA_NAMES[row.mbti_type]` returns `undefined` and `queryKeys.feed('intj')` fragments cache. Strict reading of AC-4 ("`string | number | null` — nothing else") forbids the narrow union; spirit of architecture's single-source-of-truth allows it. **Decide**: (a) narrow now (`MBTIType | null` for nullable, `MBTIType` for non-null), (b) leave broad `string` and add a row→domain validator in Story 1.5+ db helpers, or (c) defer entirely to Story 1.5.

- [x] [Review][Decision] `TestResultRow.calculated_type` vs `TestResultSchema.mbtiType` field-name drift — `db/rows.ts:5` vs `schemas/test.ts:22`. Architecture's snake_case→camelCase transform implies `mbti_type` ↔ `mbtiType`, but the row uses `calculated_type` (semantically clearer for FR13 "declared vs calculated reveal"). The schema's `mbtiType` doesn't transform mechanically from `calculated_type` — Story 1.5 will inherit silent confusion at the route-handler transform layer. **Decide**: (a) rename row column to `mbti_type` (loses semantic clarity vs `declared_type`), (b) rename schema field to `calculatedType` (aligns with row, deviates from architecture's example which uses `mbtiType`), or (c) keep both and document the explicit `calculated_type → mbtiType` rename in Story 1.5's db helper.

- [x] [Review][Decision] `persona_name` nullability mismatch — `db/rows.ts:8 (persona_name: string | null)` vs `schemas/test.ts:24 (personaName: z.string())`. A row with NULL persona will fail `TestResultSchema.parse()` in the response layer. **Decide**: (a) make schema field `.nullable()` (admits the null state), (b) keep schema strict and document an invariant that `persona_name` is always populated at insert time (Story 1.5 inserts must never pass NULL), or (c) drop the column to NOT NULL in Story 1.5 migration.

- [x] [Review][Decision] `answers[i].value` unbounded — `schemas/test.ts:13`, `schemas/invite.ts:13`. `z.number().int()` accepts MAX_SAFE_INTEGER, -1e9, etc.; an attacker can poison MBTI calculation with out-of-range values. Likert scales typically `1–5` or `1–7`. **Decide**: (a) bound now with `.min(1).max(5)` or similar, (b) defer to Story 2.4 (which owns CAT engine + Likert design), or (c) bound looser as `.min(-3).max(3)` for bipolar scales.

**Patches (unchecked, fixable without further input):**

- [x] [Review][Patch] DB row boolean fields lack `0 | 1` literal type — `db/rows.ts:14 (retention_flag), :42 (is_active), :55 (is_published)`. Currently `number | null` / `number` allows `2`, `-1`, `0.5`; downstream `if (row.is_active)` is silently truthy for `2`. Tighten to `0 | 1 | null` / `0 | 1`.
- [x] [Review][Patch] Request schemas allow oversized payloads — `schemas/test.ts:8 (TestSubmitSchema.answers)`, `schemas/invite.ts:11 (PerceptionVoteSchema.answers)`. `.min(1)` only; no `.max()`. A 10M-element array parses successfully. Add a defensive `.max(50)` (Story 2.4 can tighten further).
- [x] [Review][Patch] `answers[i].questionId` accepts empty string — `schemas/test.ts:11`, `schemas/invite.ts:14`. No `.min(1)`. Empty IDs collide silently in scoring. Add `.min(1)`.
- [x] [Review][Patch] Request schemas use Zod default `.strip()` — `schemas/test.ts:6 (TestSubmitSchema)`, `schemas/invite.ts:3 (InviteGenerateSchema)`, `schemas/invite.ts:9 (PerceptionVoteSchema)`. Extra unknown keys are silently dropped; future code that does `{...parsed, ...rawBody}` trusts attacker-controlled fields. Add `.strict()` to request schemas (response schemas may stay default).
- [x] [Review][Patch] `MBTITypeSchema` not exported, duplicated in `schemas/insight.ts` — `schemas/test.ts:4` is module-private; `schemas/insight.ts:5` re-creates `z.enum(MBTI_TYPES)` inline. Single-source-of-truth violation. Export from `constants.ts` (or `schemas/_shared.ts`) and import everywhere.
- [x] [Review][Patch] `VILLAINS_MAP` lacks runtime invariant assertion for "exactly 3 entries / no self / no duplicates within row" — `constants.ts:36-117`. TypeScript guarantees 16 keys but not array shape. A copy-paste typo in Story 3.1 (`INTJ: [{type:'INTJ',...}]`) compiles cleanly; UI breaks ("your villain is yourself"). Add a module-load runtime check: `for (const t of MBTI_TYPES) { const arr = VILLAINS_MAP[t]; assert(arr.length === 3 && new Set(arr.map(v => v.type)).size === 3 && arr.every(v => v.type !== t)) }`.
- [x] [Review][Patch] `PERSONA_NAMES` and `VILLAINS_MAP` are mutable at runtime — `constants.ts:11, 36`. `Record<MBTIType, string>` allows `PERSONA_NAMES.INTJ = 'X'` from any importer. Wrap with `Readonly<Record<...>>` typing (and `Object.freeze` for runtime immutability if defensive needed).

**Deferred (pre-existing or not this story's scope):**

- [x] [Review][Defer] `.uuid()` accepts both upper- and lowercase hex `[schemas/invite.ts:4,10; schemas/test.ts:21]` — sqlite is case-sensitive on TEXT comparisons; if a token is stored lowercase but a URL is decoded uppercase, `WHERE token = ?` misses. Storage normalization belongs to Story 1.5+ db helpers (`.toLowerCase()` on insert/lookup). Defer.
- [x] [Review][Defer] `queryKeys` factory accepts empty/whitespace strings, possible cache cross-contamination `[queryKeys.ts:4-6]` — brand types (`UUID`, `UserId`) are out of scope for this story; caller responsibility / TanStack Query `enabled` flag pattern handles loading state. Defer.
- [x] [Review][Defer] `PerceptionVoteSchema.inviteToken: z.string().uuid()` vs `InviteLinkRow.token: string` (free-form) — schema/DB drift if Story 4.1 generates tokens as nanoid. Token-generation strategy is Story 4.1's call. Defer.
- [x] [Review][Defer] `PLACEHOLDER_REASON` ships to prod with no guard `[constants.ts:32]` — Story 3.1 (Curated Insight System) acceptance gate is the right enforcement point. Defer.
- [x] [Review][Defer] `TestResultSchema.createdAt` rejects sqlite `DEFAULT CURRENT_TIMESTAMP` format and `+00:00` offsets `[schemas/test.ts:25]` — `.datetime({offset:false})` accepts `Z` (matches `new Date().toISOString()`) but rejects `+00:00` and naked `YYYY-MM-DD HH:MM:SS`. Architecture mandates `new Date().toISOString()` everywhere. Datetime ingestion contract belongs to Story 1.5+ db helpers; flag it then. Defer.
- [x] [Review][Defer] `queryKeys.feed` accepts only `MBTIType`, no null for loading state `[queryKeys.ts:6]` — design choice; standard TanStack Query pattern uses `enabled: !!mbtiType`. Defer.

## Dev Notes

### Architecture Compliance

- **Single source of truth** — `packages/shared` is the ONLY place where Zod schemas, D1 row interfaces, MBTI constants, and TanStack Query key factories may live. `apps/web` and `apps/api` MUST import from `@mbti/shared` — never define duplicates locally. This is an explicit enforcement rule (`architecture.md#Enforcement Guidelines`); violations require review.
- **No cross-app imports** — `apps/web` and `apps/api` never import from each other. Both consume `@mbti/shared` only. (`architecture.md#Architectural Boundaries`)
- **Zod schemas are PascalCase + `Schema` suffix** — `TestSubmitSchema`, `InviteGenerateSchema`, etc. (`architecture.md#Naming Patterns`)
- **TanStack Query keys are camelCase array `as const`** — `['testResult', resultId]` shape (`architecture.md#Naming Patterns`).
- **D1 column types in TS are `string | number | null` only** — D1 stores booleans as `0|1` integers and dates as ISO 8601 TEXT. No `boolean`, no `Date`, no JSON-typed columns. (`architecture.md#Format Patterns`, `architecture.md#Data Architecture`)
- **API responses use camelCase fields**, but D1 columns are snake_case — Zod schemas in this story validate the **API-side camelCase** shape (request bodies and response payloads). The Hono response layer transforms snake_case→camelCase. (`architecture.md#Format Patterns`)
- **Date format:** ISO 8601 strings everywhere (`new Date().toISOString()`). Zod field shape: `z.string().datetime({ offset: false })`. (`architecture.md#Format Patterns`)
- **Package consumed without compile step** — `packages/shared/package.json` exposes `"main": "./src/index.ts"` and `"types": "./src/index.ts"` directly. Both `apps/api` (Wrangler/esbuild) and `apps/web` (Vite) handle TypeScript at build time. **Do NOT add a build step or `tsc -b` for this package.**
- **`verbatimModuleSyntax: true`** is on in both consumers — when `apps/web` or `apps/api` import a *type-only* symbol from `@mbti/shared`, they MUST use `import type`. The shared package itself doesn't enforce this, but the dev should be aware so test code doesn't break consumers.

### Critical Version Notes (April 2026)

| Technology | Version | Notes |
|---|---|---|
| Zod | `^4.4.1` (match `apps/api`) | Use `z.string().uuid()`, `z.string().datetime({ offset: false })`, `z.enum([...] as const)`. Zod 4 accepts a `readonly` tuple of string literals to `z.enum` — pass `MBTI_TYPES` directly. |
| TypeScript | `~6.0.2` (already pinned at root) | `noUncheckedIndexedAccess: true` is on (`tsconfig.base.json`) — accessing `MBTI_TYPES[i]` returns `MBTIType | undefined`. Use the type, not array indexing, for type-level checks. |
| @mbti/shared consumers | apps/api `verbatimModuleSyntax: true`; apps/web `verbatimModuleSyntax: true` | Document for downstream stories that type-only re-exports from this package require `import type` at the call site. |

### Scope Boundaries — DO NOT Do These

- Do NOT define `QuestionSchema`, `InviteLinkSchema`, `InsightSchema`, `InsightVariantSchema`, `CheckoutSchema`, `WebhookEventSchema`, `ReportSchema`, `ArticleSchema`, `FeedItemSchema`, `AdminMetricsSchema`, or `VariantComparisonSchema` — these are owned by feature stories (Epics 2–7). Architecture lists them as future locations, but Story 1.4 only owns the 5 schemas in AC-5.
- Do NOT populate real persona names or villain explanation strings — Story 3.1 (Curated Insight System) owns content. Use placeholder values with a TODO referencing Story 3.1.
- Do NOT add `@tanstack/react-query` as a dependency to `packages/shared` — query keys are plain typed tuples; the QueryClient lives in `apps/web` (a future story will install react-query there).
- Do NOT add a build step (`tsc -b`, `tsup`, `vite build`) for `packages/shared` — `package.json` directly exposes `src/index.ts` (workspace package, consumed by Vite/esbuild at build time).
- Do NOT change `apps/api/src/lib/db.ts` beyond optional verification snippets that you remove before commit. Story 1.5 owns real D1 helpers.
- Do NOT define `users` table row interface — anonymous session model uses KV (no `users` table; `architecture.md#Authentication & Security`). Only the 5 row interfaces listed in AC-4.
- Do NOT add D1 migrations or run `wrangler d1` commands — Story 1.5 owns migrations. Row interfaces in this story are forward declarations that 1.5 must keep aligned.
- Do NOT add Vitest, test runners, or test files — Story 1.7 owns testing setup.

### Previous Story Intelligence

**From Story 1.3 (`1-3-...`):**
- Zod resolved to `^4.4.1` in `apps/api/package.json` (line 16) — `packages/shared` MUST match (`^4.4.1`) to keep the lockfile single-version.
- `apps/api/src/index.ts` no longer imports `MBTI_TYPES` (the import was removed when `typesCount` was dropped from `/api/health`). This means moving `MBTI_TYPES` from `index.ts` to `constants.ts` does not break any current call site — the only consumer was already updated.
- `apps/api/src/lib/db.ts` is a stub exporting only `DbContext` type. Story 1.4 should NOT add real query helpers here. Story 1.5 owns the real helpers.
- The Hono `Bindings.DB: D1Database` type is set up in `apps/api/src/types/bindings.ts:1-6`. Story 1.5+ will use the row interfaces from `@mbti/shared` to type `db.prepare(...).first<TestResultRow>()` calls.
- Deferred from 1.3: `SessionData.createdAt` has no ISO 8601 contract — when expiry/audit features land, formalize it with a Zod schema in `packages/shared`. **Do not address in this story** — flagged for later.

**From Story 1.1 (`1-1-...`):**
- `packages/shared` already configured with `tsconfig.json` extending `tsconfig.base.json`, eslint config, and `package.json` with `"main": "./src/index.ts"` direct-source export. Do not change these structural choices.
- `pnpm-workspace.yaml` declares `packages/*` — `@mbti/shared` is auto-discovered.

**From Story 1.2 (`1-2-...`):**
- `apps/web` has NO `@tanstack/react-query` dep yet (verified `apps/web/package.json` lines 13–28). Query key factories must be runtime-dep-free; react-query installation is owned by a future feature story.

### Files Being Modified (UPDATE)

| File | Current State | What Changes | What Must Be Preserved |
|---|---|---|---|
| `packages/shared/src/index.ts` | Inline `MBTI_TYPES` array + `MBTIType` derived type. 2 exports total. | Becomes a barrel: `export * from './constants'`, `export * from './queryKeys'`, `export * from './db/rows'`, `export * from './schemas/test'`, `export * from './schemas/invite'`, `export * from './schemas/insight'`. | The exported names `MBTI_TYPES` and `MBTIType` MUST remain importable from `@mbti/shared` (Story 1.1 / 1.3 contract). |
| `packages/shared/package.json` | No `dependencies` field; only devDeps for tooling. | Add `"dependencies": { "zod": "^4.4.1" }`. | All existing devDeps; `name`, `version`, `private`, `type: "module"`, `main`, `types`, `exports`, `scripts`. |

### NEW Files

| File | Purpose |
|---|---|
| `packages/shared/src/constants.ts` | `MBTI_TYPES`, `MBTIType`, `PERSONA_NAMES`, `VILLAINS_MAP` |
| `packages/shared/src/queryKeys.ts` | `queryKeys.testResult`, `.socialStatus`, `.feed` factories |
| `packages/shared/src/db/rows.ts` | D1 row interfaces (5 tables) |
| `packages/shared/src/schemas/test.ts` | `TestSubmitSchema`, `TestResultSchema` + inferred types |
| `packages/shared/src/schemas/invite.ts` | `InviteGenerateSchema`, `PerceptionVoteSchema` + inferred types |
| `packages/shared/src/schemas/insight.ts` | `InsightResponseSchema` + inferred type |

### What Must Be Preserved (System-Level Invariants)

- `apps/api/src/index.ts` MUST continue to start `wrangler dev --local` cleanly (Story 1.3 contract).
- `pnpm dev` from monorepo root MUST keep starting both apps in parallel (Story 1.1 AC-1).
- `pnpm lint && pnpm typecheck` MUST remain at zero errors across all 3 packages (Story 1.1 AC-3, Story 1.3 AC-11).
- `@mbti/shared` package consumers (`apps/web`, `apps/api`) MUST keep importing without a build step (`"main": "./src/index.ts"`).
- The `MBTI_TYPES` and `MBTIType` named exports MUST remain stable on the package boundary.

### Project Structure After This Story

```
packages/shared/
├── package.json                  # MODIFIED: + zod ^4.4.1 dependency
├── tsconfig.json                 # Unchanged
├── eslint.config.js              # Unchanged
└── src/
    ├── index.ts                  # MODIFIED: barrel re-exports of all submodules
    ├── constants.ts              # NEW: MBTI_TYPES, MBTIType, PERSONA_NAMES, VILLAINS_MAP
    ├── queryKeys.ts              # NEW: queryKeys factory (testResult, socialStatus, feed)
    ├── db/
    │   └── rows.ts               # NEW: D1 row interfaces (5 tables)
    └── schemas/
        ├── test.ts               # NEW: TestSubmitSchema, TestResultSchema
        ├── invite.ts             # NEW: InviteGenerateSchema, PerceptionVoteSchema
        └── insight.ts            # NEW: InsightResponseSchema
```

### Reference Implementation Sketches

These align with `architecture.md#Naming Patterns`, `#Format Patterns`, `#Data Architecture`. Adapt as needed but do not deviate from naming, type primitives, or the no-ORM-types rule.

**`src/constants.ts`:**

```typescript
export const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
] as const

export type MBTIType = (typeof MBTI_TYPES)[number]

// TODO Story 3.1: replace placeholder copy with curated persona names
export const PERSONA_NAMES: Record<MBTIType, string> = {
  INTJ: 'The Architect',
  INTP: 'The Logician',
  // ... all 16; TS will error if any is missing because of Record<MBTIType, ...>
  ESFP: 'The Entertainer',
  // (fill in the rest)
}

export type VillainEntry = { type: MBTIType; reason: string }

// TODO Story 3.1: replace placeholder villain reasons with curated copy
export const VILLAINS_MAP: Record<MBTIType, ReadonlyArray<VillainEntry>> = {
  INTJ: [
    { type: 'ESFP', reason: 'placeholder — friction reason owned by Story 3.1' },
    { type: 'ENFP', reason: 'placeholder — friction reason owned by Story 3.1' },
    { type: 'ESFJ', reason: 'placeholder — friction reason owned by Story 3.1' },
  ],
  // ... all 16; each value array MUST have exactly 3 entries
} as const
```

**`src/queryKeys.ts`:**

```typescript
import type { MBTIType } from './constants'

export const queryKeys = {
  testResult: (id: string) => ['testResult', id] as const,
  socialStatus: (userId: string) => ['socialStatus', userId] as const,
  feed: (mbtiType: MBTIType) => ['feed', mbtiType] as const,
}
```

**`src/db/rows.ts`:**

```typescript
// D1 row shapes — keep aligned with /migrations/*.sql (Story 1.5+).
// Booleans are stored as 0|1 integers (number); dates are stored as ISO 8601 TEXT (string).

export interface TestResultRow {
  id: string
  user_id: string
  declared_type: string | null
  calculated_type: string
  answers: string                    // JSON-stringified responses
  persona_name: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null          // PDPA soft-delete (Story 1.5 migration 0004)
  retention_flag: number | null      // 0|1
}

export interface InviteLinkRow {
  id: string
  token: string                      // UUID, the credential
  inviter_user_id: string
  inviter_result_id: string
  expired_at: string                 // 30-day expiry (NFR9)
  created_at: string
  deleted_at: string | null
}

export interface PerceptionVoteRow {
  id: string
  invite_token: string
  inviter_user_id: string
  voter_session_id: string | null
  behavioral_answers: string         // JSON-stringified votes
  created_at: string
  deleted_at: string | null
}

export interface CuratedInsightRow {
  id: string
  mbti_type: string
  variant: string | null             // for A/B variant comparison (FR10, FR44)
  content: string
  is_active: number                  // 0|1
  created_at: string
  updated_at: string
}

export interface ArticleRow {
  id: string
  mbti_type: string
  slug: string
  title: string
  content: string
  author: string | null
  published_at: string | null
  is_published: number               // 0|1
  created_at: string
  updated_at: string
}
```

**`src/schemas/test.ts`:**

```typescript
import { z } from 'zod'
import { MBTI_TYPES } from '../constants'

const MBTITypeSchema = z.enum(MBTI_TYPES)

export const TestSubmitSchema = z.object({
  declaredType: MBTITypeSchema.nullable(),
  answers: z.array(z.object({
    questionId: z.string(),
    value: z.number().int(),
  })).min(1),
})
export type TestSubmit = z.infer<typeof TestSubmitSchema>

export const TestResultSchema = z.object({
  id: z.string().uuid(),
  mbtiType: MBTITypeSchema,
  declaredType: MBTITypeSchema.nullable(),
  personaName: z.string(),
  createdAt: z.string().datetime({ offset: false }),
})
export type TestResult = z.infer<typeof TestResultSchema>
```

**`src/schemas/invite.ts`:**

```typescript
import { z } from 'zod'

export const InviteGenerateSchema = z.object({
  resultId: z.string().uuid(),
})
export type InviteGenerate = z.infer<typeof InviteGenerateSchema>

export const PerceptionVoteSchema = z.object({
  inviteToken: z.string().uuid(),
  answers: z.array(z.object({
    questionId: z.string(),
    value: z.number().int(),
  })).min(1),
})
export type PerceptionVote = z.infer<typeof PerceptionVoteSchema>
```

**`src/schemas/insight.ts`:**

```typescript
import { z } from 'zod'
import { MBTI_TYPES } from '../constants'

export const InsightResponseSchema = z.object({
  mbtiType: z.enum(MBTI_TYPES),
  content: z.string().min(1),
  source: z.enum(['ai', 'curated']),  // see architecture.md#AI fallback pattern
})
export type InsightResponse = z.infer<typeof InsightResponseSchema>
```

**`src/index.ts` (barrel — replaces current content):**

```typescript
export * from './constants'
export * from './queryKeys'
export * from './db/rows'
export * from './schemas/test'
export * from './schemas/invite'
export * from './schemas/insight'
```

### Manual Verification Recipe

No automated test framework is installed yet (Story 1.7 owns Vitest + Playwright). Verify manually:

1. `pnpm install` from monorepo root → resolves with no errors, no peer warnings; `pnpm-lock.yaml` shows a single hoisted `zod@^4.4.1` entry. (AC-6)
2. `pnpm typecheck` from monorepo root → zero errors across `@mbti/web`, `@mbti/api`, `@mbti/shared`. (AC-7)
3. `pnpm lint` from monorepo root → zero errors. (AC-7)
4. **Smoke import in `apps/web` (temporary, must remove before commit):**
   - In `apps/web/src/App.tsx`, add at top: `import { TestSubmitSchema, MBTI_TYPES, queryKeys, type MBTIType } from '@mbti/shared'`
   - Reference each: `console.log(MBTI_TYPES.length, queryKeys.testResult('x'), TestSubmitSchema.shape)` (don't worry about runtime — typecheck is what matters here).
   - `pnpm typecheck` in `apps/web` → zero errors. (AC-1)
   - **Remove the temp lines and confirm typecheck still passes.**
5. **Smoke import in `apps/api` (temporary, must remove before commit):**
   - In `apps/api/src/lib/db.ts`, temporarily add: `import type { TestResultRow } from '@mbti/shared'` and reference it in a JSDoc.
   - `pnpm typecheck` in `apps/api` → zero errors.
   - **Remove the temp reference.**
6. Verify `Record<MBTIType, ...>` enforces all 16 keys: temporarily delete one key from `PERSONA_NAMES` → typecheck must error. Restore.
7. Verify `VILLAINS_MAP` array length: TypeScript cannot enforce array length at the type level cheaply; instead, at the bottom of `constants.ts` add a runtime guard inside an immediately-invoked check that runs ONLY in dev (or skip — code reviewers will catch). For this story, document the 3-entry expectation in JSDoc above the constant.
8. Verify backward compatibility: confirm `apps/api/src/index.ts` and any other call site that previously used `MBTI_TYPES` / `MBTIType` still compiles unchanged.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4 — acceptance criteria for Zod schemas, D1 rows, MBTI constants, query keys]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — D1 + raw SQL + TypeScript row interfaces in packages/shared; no ORM types]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns — Hono + Zod schemas in packages/shared as single source of truth]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns — `PascalCase` + `Schema` suffix for Zod schemas; camelCase tuple for TanStack Query keys]
- [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns — `snake_case` D1 columns, `camelCase` API fields, ISO 8601 dates as TEXT]
- [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns — `packages/shared` owns Zod schemas, shared TS types, D1 row interfaces, constants, query key factories]
- [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines — import shared types from `packages/shared`; never redefine locally; use `queryKeys` factory from shared]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries — `packages/shared/src/` directory layout: schemas/, db/, queryKeys.ts, constants.ts, index.ts]
- [Source: _bmad-output/planning-artifacts/prd.md#FR8, FR9 — persona name and "3 Villains" behavioral concept (content owned by Story 3.1, structure owned here)]
- [Source: _bmad-output/planning-artifacts/prd.md#FR10, FR44 — multiple insight variants per type → `CuratedInsightRow.variant` field]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR9 — invite link 30-day expiry → `InviteLinkRow.expired_at`]
- [Source: _bmad-output/implementation-artifacts/1-3-hono-v4-12-api-workers-...md — Zod ^4.4.1 pinned in apps/api; `apps/api/src/index.ts` no longer imports MBTI_TYPES; `lib/db.ts` is a stub awaiting Story 1.5]
- [Source: _bmad-output/implementation-artifacts/1-1-monorepo-scaffold-...md — `packages/shared` package.json exposes `src/index.ts` directly; no build step]
- [Source: _bmad-output/implementation-artifacts/1-2-react-spa-...md — `apps/web` has no `@tanstack/react-query` dependency yet; query keys must be runtime-dep-free]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (claude-opus-4-7)

### Debug Log References

- `pnpm add zod@^4.4.1` in `packages/shared` resolved cleanly. Lockfile shows `apps/api` and `packages/shared` both pin `zod@4.4.1`; transitive `zod@3.25.76` from MSW/shadcn devDeps is unrelated to our import surface (we never import `zod` from those paths).
- `Record<MBTIType, ...>` enforcement was sanity-checked by temporarily commenting out one key in `PERSONA_NAMES` — TS errored with `TS2741: Property 'ESFP' is missing` as expected, then restored.
- `VILLAINS_MAP` runtime shape verified via `node --input-type=module` script: 16 keys × 3 entries each. TypeScript can't enforce array length at the type level cheaply; the JSDoc + runtime check sufficed.
- AC-1 smoke verified end-to-end: temporary multi-import in `apps/web/src/App.tsx` (`MBTI_TYPES, TestSubmitSchema, queryKeys, type MBTIType`) plus `import type { TestResultRow }` reference in `apps/api/src/lib/db.ts` both passed `pnpm typecheck`. Smoke imports were reverted; final file state matches pre-story baseline.
- `verbatimModuleSyntax: true` on apps/api and apps/web means downstream stories must use `import type { MBTIType, TestResultRow, ... }` for type-only imports; runtime-valued exports (`MBTI_TYPES`, `queryKeys`, `TestSubmitSchema`) use plain `import`.

### Completion Notes List

- All 8 acceptance criteria verified via `pnpm lint && pnpm typecheck` (zero errors across `@mbti/web`, `@mbti/api`, `@mbti/shared`) plus targeted smoke imports + a `Record<MBTIType, ...>` enforcement test.
- `MBTI_TYPES` and `MBTIType` were moved from `src/index.ts` to `src/constants.ts` and re-exported via the barrel — backward compat preserved (`apps/web/src/App.tsx` still imports `MBTI_TYPES` unchanged and renders `MBTI_TYPES.length` correctly).
- `PERSONA_NAMES` and `VILLAINS_MAP` were typed as `Record<MBTIType, ...>` (NOT `Partial<>`); confirmed by the comment-out test that missing keys are a typecheck error.
- `VILLAINS_MAP` placeholder rows: each MBTI key has exactly 3 distinct friction types with `PLACEHOLDER_REASON` strings. Story 3.1 (Curated Insight System) owns final content — placeholder reasons + TODO comment make the swap location obvious.
- `queryKeys.ts` has zero runtime deps (no `@tanstack/react-query` import) — pure typed `as const` tuples. Future feature story will install `@tanstack/react-query` in `apps/web` and consume these factories.
- `db/rows.ts` field types are strictly `string | number | null` — no Date, no boolean, no JSON-typed fields. JSDoc note flags Story 1.5 as the migration owner; rows.ts must be kept aligned when schema lands.
- 5 Zod schemas (`TestSubmitSchema`, `TestResultSchema`, `InviteGenerateSchema`, `PerceptionVoteSchema`, `InsightResponseSchema`) each export their inferred type alias. UUID fields use `z.string().uuid()`; ISO 8601 datetimes use `z.string().datetime({ offset: false })`; MBTI type fields use `z.enum(MBTI_TYPES)` so runtime validation aligns with the static `MBTIType` union.
- No scope creep: Question/Article/Payment/Admin/InviteLink/Insight/Variant schemas were NOT created — those belong to feature stories (Epics 2–7) per the architecture's intentional layering.
- All deferred review findings from Stories 1.1–1.3 remain untouched (this story owned none of them).

### File List

- packages/shared/package.json (MODIFIED — added `zod ^4.4.1` dependency)
- packages/shared/src/index.ts (MODIFIED — replaced inline `MBTI_TYPES` with barrel re-exports of `./constants`, `./queryKeys`, `./db/rows`, `./schemas/test`, `./schemas/invite`, `./schemas/insight`)
- packages/shared/src/constants.ts (NEW — `MBTI_TYPES`, `MBTIType`, `PERSONA_NAMES: Record<MBTIType, string>`, `VILLAINS_MAP: Record<MBTIType, ReadonlyArray<VillainEntry>>`, `VillainEntry` type. TODO Story 3.1 markers on persona + villain copy.)
- packages/shared/src/queryKeys.ts (NEW — `queryKeys.testResult/.socialStatus/.feed` factory returning `as const` tuples. Zero runtime deps.)
- packages/shared/src/db/rows.ts (NEW — `TestResultRow`, `InviteLinkRow`, `PerceptionVoteRow`, `CuratedInsightRow`, `ArticleRow`. All fields `string | number | null`. JSDoc flags Story 1.5+ alignment.)
- packages/shared/src/schemas/test.ts (NEW — `TestSubmitSchema`, `TestResultSchema` + inferred types `TestSubmit`, `TestResult`)
- packages/shared/src/schemas/invite.ts (NEW — `InviteGenerateSchema`, `PerceptionVoteSchema` + inferred types)
- packages/shared/src/schemas/insight.ts (NEW — `InsightResponseSchema` + inferred `InsightResponse` type; uses shared `MBTITypeSchema`)
- packages/shared/src/schemas/mbti.ts (NEW — review patch P5 — `MBTITypeSchema` single source of truth)
- pnpm-lock.yaml (MODIFIED — `pnpm add zod@^4.4.1` updated lockfile; `packages/shared` and `apps/api` both resolve to `zod@4.4.1`)

## Change Log

- 2026-04-30: Story 1.4 implemented — `packages/shared` now exports MBTI constants (`MBTI_TYPES`, `PERSONA_NAMES`, `VILLAINS_MAP`), TanStack Query key factories (`queryKeys`), D1 row TypeScript interfaces (5 tables), and the initial 5 Zod schemas (`TestSubmitSchema`, `TestResultSchema`, `InviteGenerateSchema`, `PerceptionVoteSchema`, `InsightResponseSchema`). All 8 ACs verified via `pnpm lint && pnpm typecheck` + smoke imports in both consumer apps. Backward compat for existing `MBTI_TYPES`/`MBTIType` imports preserved.
- 2026-04-30: Code review applied — 11 patches resolved (4 from decision-needed, 7 from triage). DB rows now narrow MBTI fields to `MBTIType` union and booleans to `0|1` literal; `persona_name` made non-nullable with Story 1.5 NOT NULL note; `calculated_type → mbtiType` rename documented for Story 1.5; request schemas (`TestSubmitSchema`, `InviteGenerateSchema`, `PerceptionVoteSchema`) hardened with `.strict()`, `.min(1).max(50)` array bounds, `.min(1)` on `questionId`, and `.min(1).max(5)` Likert bounds on answer values; `MBTITypeSchema` extracted to `schemas/mbti.ts` as single source of truth (consumed by `schemas/test.ts` and `schemas/insight.ts`); `VILLAINS_MAP` invariant assertion added at module load (3 entries / no duplicates / no self-friction); `PERSONA_NAMES` and `VILLAINS_MAP` typed `Readonly<Record<...>>`. 6 findings deferred to Stories 1.5 / 4.1 / 3.1 (see deferred-work.md). All patches verified via `pnpm lint && pnpm typecheck` + tsx runtime smoke test (11/11 cases pass).
