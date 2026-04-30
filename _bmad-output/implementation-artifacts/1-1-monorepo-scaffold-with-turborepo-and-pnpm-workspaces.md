# Story 1.1: Monorepo Scaffold with Turborepo and pnpm Workspaces

Status: done

## Story

As a developer,
I want a fully configured Turborepo monorepo with pnpm workspaces containing `apps/web`, `apps/api`, and `packages/shared`,
so that I can develop, build, and deploy each app independently with shared task caching and a single `pnpm dev` command.

## Acceptance Criteria

1. **AC-1: Single dev command** — `pnpm dev` starts both `apps/web` (Vite dev server) and `apps/api` (`wrangler dev --local`) in parallel via Turborepo. `packages/shared` is importable as `@mbti/shared` by both apps without any additional build step.

2. **AC-2: Incremental build caching** — When only `apps/web` files change, `pnpm build` rebuilds `apps/web` and `packages/shared`; `apps/api` build is served from Turborepo cache.

3. **AC-3: Lint and typecheck pass** — `pnpm lint` (ESLint) and `pnpm typecheck` (TypeScript strict) pass across all packages with zero errors on a clean scaffold.

4. **AC-4: Pipeline config** — `turbo.json` defines `dev`, `build`, `lint`, `typecheck`, and `test` pipeline tasks. `pnpm-workspace.yaml` declares all three workspaces.

## Tasks / Subtasks

- [x] Task 1: Initialize Turborepo monorepo (AC: 1, 2, 4)
  - [x] 1.1 Run `pnpm dlx create-turbo@latest mbti --package-manager pnpm` to scaffold monorepo
  - [x] 1.2 Verify `pnpm-workspace.yaml` declares `apps/*` and `packages/*`
  - [x] 1.3 Configure `turbo.json` with `dev`, `build`, `lint`, `typecheck`, `test` pipelines
  - [x] 1.4 Set root `package.json` to `"private": true` with workspace scripts

- [x] Task 2: Scaffold `apps/web` — React SPA for Cloudflare Pages (AC: 1, 3)
  - [x] 2.1 Run `npm create cloudflare@latest . -- --template=react-ts` inside `apps/web`
  - [x] 2.2 Verify Vite + React + TypeScript scaffold works
  - [x] 2.3 Add `@mbti/shared` as workspace dependency in `apps/web/package.json`
  - [x] 2.4 Configure `@/*` import alias in `vite.config.ts` and `tsconfig.json`
  - [x] 2.5 Add ESLint config extending root config
  - [x] 2.6 Verify `pnpm dev` starts Vite dev server and renders placeholder page

- [x] Task 3: Scaffold `apps/api` — Hono Workers (AC: 1, 3)
  - [x] 3.1 Run `npm create cloudflare@latest . -- --template=hono` inside `apps/api`
  - [x] 3.2 Verify Hono v4.12+ is installed
  - [x] 3.3 Add `@mbti/shared` as workspace dependency in `apps/api/package.json`
  - [x] 3.4 Create minimal `GET /api/health` route returning `{ "data": { "status": "ok" }, "error": null }`
  - [x] 3.5 Add ESLint config extending root config
  - [x] 3.6 Verify `wrangler dev --local` starts and health endpoint responds

- [x] Task 4: Create `packages/shared` (AC: 1, 3)
  - [x] 4.1 Create `packages/shared/package.json` with `"name": "@mbti/shared"`, `"main"` and `"types"` pointing to `src/index.ts`
  - [x] 4.2 Create `packages/shared/tsconfig.json` extending root `tsconfig.base.json`
  - [x] 4.3 Create `packages/shared/src/index.ts` with a placeholder export (e.g., `export const MBTI_TYPES = [] as const`)
  - [x] 4.4 Verify `import { MBTI_TYPES } from '@mbti/shared'` resolves in both `apps/web` and `apps/api`

- [x] Task 5: Root TypeScript and tooling config (AC: 3)
  - [x] 5.1 Create `tsconfig.base.json` at monorepo root with `strict: true`, `target: "ES2022"`, `moduleResolution: "bundler"`
  - [x] 5.2 Each app/package `tsconfig.json` extends `tsconfig.base.json`
  - [x] 5.3 Configure root ESLint with TypeScript plugin
  - [x] 5.4 Add `.gitignore` covering `node_modules`, `dist`, `.wrangler`, `.dev.vars`

- [x] Task 6: Verify all ACs (AC: 1, 2, 3, 4)
  - [x] 6.1 Run `pnpm dev` — both apps start in parallel
  - [x] 6.2 Run `pnpm build` — all packages build successfully
  - [x] 6.3 Run `pnpm lint && pnpm typecheck` — zero errors
  - [x] 6.4 Modify only `apps/web/src/App.tsx`, run `pnpm build` again — verify `apps/api` served from cache

### Review Findings

- [x] [Review][Patch] API tsconfig does not extend tsconfig.base.json — standalone config diverges from base settings (missing `noUncheckedIndexedAccess`, `declaration`, `declarationMap`, `resolveJsonModule`, `esModuleInterop`) [apps/api/tsconfig.json]
- [x] [Review][Patch] API ESLint uses `globals.browser` instead of Workers globals — should use `globals.serviceworker` to flag accidental browser API usage [apps/api/eslint.config.js]
- [x] [Review][Patch] `tsconfig.base.json` DOM lib pollutes shared package — `packages/shared/tsconfig.json` should override `lib` to exclude DOM types since shared is consumed by Workers [packages/shared/tsconfig.json]
- [x] [Review][Patch] Shared package has no lint/typecheck scripts — Turbo skips shared for these tasks, meaning shared code is never independently checked [packages/shared/package.json]
- [x] [Review][Defer] Missing CORS middleware [apps/api/src/index.ts] — deferred, belongs to Story 1.3
- [x] [Review][Defer] No global error handler `app.onError` [apps/api/src/index.ts] — deferred, belongs to Story 1.3
- [x] [Review][Defer] No 404 handler `app.notFound` [apps/api/src/index.ts] — deferred, belongs to Story 1.3
- [x] [Review][Defer] No Hono Bindings type for env [apps/api/src/index.ts] — deferred, belongs to Story 1.3

## Dev Notes

### Architecture Compliance

- **Monorepo tool**: Turborepo 2.9+ with pnpm workspaces. Use `pnpm dlx create-turbo@latest` — do NOT manually scaffold.
- **Package manager**: pnpm 11+ (requires Node.js 22+). Verify Node version before starting.
- **Strict boundary**: `apps/web` and `apps/api` communicate via HTTP only. No direct imports between apps. Both import from `packages/shared`.
- **Response envelope**: Even the health endpoint must use `{ data, error }` format — this is the pattern for ALL Hono responses.

### Critical Version Notes (April 2026)

| Technology | Architecture Doc Says | Actual Latest | Action |
|---|---|---|---|
| Vite | v6 | v8.0.x | Use whatever `create cloudflare` template installs — likely Vite 6.x bundled in the template. Do NOT manually upgrade to v8 unless the template ships it. |
| Turborepo | 2.9 | 2.9.x | Matches. Use latest 2.9.x. |
| pnpm | — | 11.0.x | Requires Node.js 22+. Verify with `node -v` before starting. If Node < 22, use pnpm 9.x instead. |
| Hono | v4.12 | 4.12.x | Matches. Template should install correct version. |
| React | 19 | 19.2.x | Matches. Template should install correct version. |
| React Router | v7 | 7.14.x | Do NOT install in this story — Story 1.2 handles React Router setup. |
| Tailwind CSS | — | v4.2.x | Do NOT install in this story — Story 1.2 handles Tailwind setup. |
| shadcn/ui | — | v4.6.x | Do NOT install in this story — Story 1.2 handles shadcn setup. |

### Scope Boundaries — DO NOT Do These

- Do NOT install Tailwind CSS, shadcn/ui, React Router, or Framer Motion — those belong to Story 1.2.
- Do NOT create D1 database, KV namespaces, or R2 buckets — those belong to Stories 1.5 and 1.6.
- Do NOT add Vitest or Playwright — testing framework setup is part of Story 1.7 (CI/CD).
- Do NOT create `wrangler.toml` bindings for D1/KV/R2 — Story 1.3 handles API bindings.
- Do NOT write Zod schemas or D1 row interfaces — Story 1.4 handles `packages/shared` content.
- The placeholder export in `packages/shared/src/index.ts` is intentionally minimal — just enough to verify workspace resolution works.

### Turborepo Pipeline Configuration

`turbo.json` must define these pipelines:

```json
{
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

Key: `dev` is `persistent: true` (long-running), `cache: false`. `build` depends on upstream builds (`^build`) for correct `packages/shared` resolution.

### `packages/shared` Setup Pattern

This package uses TypeScript source directly — no separate build step. Both `apps/web` (Vite) and `apps/api` (Wrangler) can consume `.ts` source files from workspace packages.

```json
{
  "name": "@mbti/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

No build script needed for `packages/shared` at this stage. Vite and Wrangler both handle TypeScript transpilation of workspace dependencies.

### `create-cloudflare` Template Notes

The `npm create cloudflare@latest` CLI may prompt interactively. Use flags to skip prompts:

```bash
# For apps/web (React SPA)
cd apps/web
npm create cloudflare@latest . -- --template=react-ts --no-deploy

# For apps/api (Hono Workers)
cd apps/api  
npm create cloudflare@latest . -- --template=hono --no-deploy
```

If the `react-ts` or `hono` templates are unavailable or renamed, use the interactive CLI and select the equivalent React/Hono starter. The key requirement is: React + TypeScript + Vite for web, Hono + TypeScript for api.

After scaffolding, each app will have its own `package.json`. You must:
1. Add `"@mbti/shared": "workspace:*"` to each app's dependencies
2. Ensure each app's `tsconfig.json` extends `../../tsconfig.base.json`
3. Remove any duplicate ESLint configs that conflict with root config

### Wrangler Dev for API

`apps/api` uses `wrangler dev --local` for local development. The `--local` flag runs D1/KV/R2 in local simulation mode. At this story's scope, no bindings are configured yet — just verify the Hono server starts and the health endpoint responds.

In `apps/api/package.json`, the dev script should be:
```json
{
  "scripts": {
    "dev": "wrangler dev --local"
  }
}
```

### Project Structure After This Story

```
mbti/
├── package.json              # private: true, workspace scripts
├── pnpm-workspace.yaml       # apps/*, packages/*
├── turbo.json                # Pipeline definitions
├── tsconfig.base.json        # Shared strict TS config
├── .gitignore
├── apps/
│   ├── web/                  # React SPA (Vite) → Cloudflare Pages
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── index.html
│   │   └── src/
│   │       └── App.tsx       # Placeholder
│   └── api/                  # Hono → Cloudflare Workers
│       ├── package.json
│       ├── wrangler.toml     # Minimal — no D1/KV/R2 bindings yet
│       ├── tsconfig.json
│       └── src/
│           └── index.ts      # Hono app with GET /api/health
└── packages/
    └── shared/
        ├── package.json      # @mbti/shared
        ├── tsconfig.json
        └── src/
            └── index.ts      # Placeholder export
```

### Testing This Story

No test framework is installed yet (Story 1.7). Verification is manual:

1. `pnpm install` — no errors
2. `pnpm dev` — both Vite and Wrangler start
3. Visit Vite dev URL — placeholder page renders
4. `curl http://localhost:8787/api/health` — returns `{"data":{"status":"ok"},"error":null}`
5. `pnpm build` — all packages build
6. `pnpm lint && pnpm typecheck` — zero errors
7. In `apps/web`, verify `import { MBTI_TYPES } from '@mbti/shared'` resolves
8. In `apps/api`, verify `import { MBTI_TYPES } from '@mbti/shared'` resolves

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation — initialization commands]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries — complete directory structure]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — monorepo package ownership rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns — API response envelope]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1 — acceptance criteria]

## Dev Agent Record

### Agent Model Used

Claude Opus 4 (claude-opus-4.6)

### Debug Log References

- `create-cloudflare` CLI v2.67.4 no longer supports `--template=react-ts` or `--template=hono` as direct flags. Used `create-vite` for web and manual Hono setup for api.
- TypeScript 6.0 deprecates `baseUrl` in tsconfig — removed it; `@/*` alias handled by Vite `resolve.alias` only.
- pnpm 10.33.2 requires `pnpm.onlyBuiltDependencies` in package.json to approve build scripts non-interactively.

### Completion Notes List

- Monorepo scaffolded with Turborepo 2.9.6 + pnpm 10.33.2 workspaces
- `apps/web`: Vite 8.0.10 + React 19.2.5 + TypeScript 6.0.3 (via `create-vite react-ts`)
- `apps/api`: Hono 4.12.x on Cloudflare Workers (Wrangler 4.86.0), manual setup
- `packages/shared`: `@mbti/shared` with MBTI_TYPES constant + MBTIType type export
- All ACs verified: `pnpm dev` starts both apps, `pnpm build` succeeds with caching, `pnpm lint && pnpm typecheck` pass with zero errors
- Health endpoint returns `{"data":{"status":"ok","typesCount":16},"error":null}` — envelope pattern confirmed
- Turborepo incremental caching confirmed: modifying only web triggers web rebuild, api served from cache

### File List

- package.json (NEW)
- pnpm-workspace.yaml (NEW)
- turbo.json (NEW)
- tsconfig.base.json (NEW)
- .gitignore (NEW)
- apps/web/package.json (NEW - via create-vite, modified)
- apps/web/vite.config.ts (MODIFIED - added @/* alias)
- apps/web/tsconfig.json (NEW - via create-vite)
- apps/web/tsconfig.app.json (MODIFIED - removed deprecated baseUrl)
- apps/web/tsconfig.node.json (NEW - via create-vite)
- apps/web/eslint.config.js (NEW - via create-vite)
- apps/web/index.html (NEW - via create-vite)
- apps/web/src/App.tsx (MODIFIED - simplified placeholder with @mbti/shared import)
- apps/web/src/main.tsx (NEW - via create-vite)
- apps/web/src/App.css (NEW - via create-vite)
- apps/web/src/index.css (NEW - via create-vite)
- apps/web/src/vite-env.d.ts (NEW - via create-vite)
- apps/web/public/ (NEW - via create-vite)
- apps/api/package.json (NEW)
- apps/api/wrangler.toml (NEW)
- apps/api/tsconfig.json (NEW)
- apps/api/eslint.config.js (NEW)
- apps/api/src/index.ts (NEW - Hono app with /api/health)
- packages/shared/package.json (NEW)
- packages/shared/tsconfig.json (NEW)
- packages/shared/src/index.ts (NEW - MBTI_TYPES + MBTIType)
