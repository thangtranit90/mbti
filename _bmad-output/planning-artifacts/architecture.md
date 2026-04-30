---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'revised'
completedAt: '2026-04-28'
revisedAt: '2026-04-29'
revisionNote: 'Full revision 2026-04-29 — All 6 sections updated: React SPA + Cloudflare D1/KV/R2 replaces Next.js + Supabase across stack, patterns, structure, and validation'
inputDocuments: ['_bmad-output/planning-artifacts/prd.md']
workflowType: 'architecture'
project_name: 'MBTI'
user_name: 'Thangtranit90'
date: '2026-04-28'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

45 FRs organized into 7 capability groups:
- **Personality Assessment (FR1–FR6):** CAT engine with reverse mechanic, anonymous entry, persistent shareable result URLs
- **AI Insight Generation (FR7–FR11):** Behavioral-specific AI copy with manual fallback, type variants, admin approval workflow
- **Result & Sharing (FR12–FR17):** Dynamic OG image generation, 9:16 Stories card, social share flow
- **Social Perception Loop (FR18–FR24):** Anonymous invite links (30-day expiry), bidirectional perception voting, self vs social gap visualization
- **Monetization (FR25–FR29):** Couple/Friend Pack (two-person purchase), Gap Report paywall, VNPay/MoMo/card payment integration
- **Content & Retention (FR30–FR35):** Per-type article feed, polling-based notifications, admin CMS with article thresholds
- **Privacy & Administration (FR36–FR45):** PDPA consent, data deletion pipeline, age gate, event analytics, admin dashboard

**Non-Functional Requirements:**

| Category | Key Constraints |
|---|---|
| **Performance** | LCP ≤3s mobile 4G; AI result render ≤3s; OG image ≤3s; card generation ≤5s; test interactions ≤500ms |
| **Security** | TLS 1.2+; data encrypted at rest; zero card data on platform; invite links expire 30 days |
| **Scalability** | 500 concurrent users at launch; 10x (5,000 users) within 15 minutes; AI pipeline scales independently |
| **Reliability** | 99% uptime; AI fallback to curated insights; 24h test session preservation for anonymous users |
| **Integration** | VNPay/MoMo/international cards; OG rendering on Instagram/Facebook/Zalo/TikTok; extensible analytics |

**Scale & Complexity:**

- Primary domain: Full-stack consumer web application
- Complexity level: **Medium-High** — AI pipeline, social graph mechanics, viral acquisition, payment, content management, PDPA compliance
- Estimated architectural components: 10–12 major components
- Team: 1 product + 1 fullstack developer (small team → managed infrastructure priority)
- Timeline: Greenfield, 3–4 week MVP

### Technical Constraints & Dependencies

- **Framework:** React SPA (Vite) + Cloudflare-native stack — specified in PRD (updated 2026-04-29)
- **Deployment:** Cloudflare Pages (SPA) + Cloudflare Workers (API) — single target at MVP, globally distributed by default
- **Payment:** Third-party PCI DSS provider (PayOS for VN market, Stripe for international) — no card data on platform
- **Storage:** Cloudflare D1 + KV + R2 — architecture designed for Phase 2 migration to Supabase PostgreSQL without schema redesign
- **AI:** Insight generation must degrade gracefully to D1 curated fallback with zero user-visible failure
- **Mobile-first:** Portrait primary, PWA manifest from day 1

### Cross-Cutting Concerns Identified

1. **Anonymous session management** — test progress, result access, invite flow — all without forcing account creation
2. **AI fallback orchestration** — transparent switching between AI-generated and curated insight copy
3. **Dynamic asset generation** — OG images and shareable result cards must be server-generated on demand at speed
4. **Invite link lifecycle** — generation, tracking, expiry (30 days), completion status aggregation
5. **PDPA compliance pipeline** — consent capture, data deletion queue, retention purge automation
6. **Analytics event bus** — extensible without redeploy; tracks completion, share, invite, purchase events
7. **Payment flow isolation** — redirect to PCI DSS provider, webhook-based confirmation, report delivery
8. **Admin access control** — separate auth layer for admin dashboard; zero overlap with public user flow

## Starter Template Evaluation

### Primary Technology Domain

React SPA + Cloudflare-native stack, based on project requirements analysis (PRD specifies React SPA + Cloudflare Pages + Workers + D1 + KV).

### Starter Options Considered

- **Cloudflare Official React Template (`npm create cloudflare@latest -- --template=react-ts`):** Vite-based React + TypeScript, Cloudflare Pages adapter pre-configured, `wrangler.toml` included. Minimum setup overhead for a 1-developer team targeting Cloudflare Pages.
- **Vite + manual Cloudflare Pages config:** Maximum flexibility but requires manual adapter setup, Pages build integration, and `wrangler.toml` from scratch — unnecessary friction on a 3–4 week MVP timeline.

### Selected Starter: Cloudflare React Template + Hono Workers

**Rationale for Selection:**
KV-based anonymous session is the core architectural constraint — every user flow (test, result, social loop, invite) must work without account creation. The Cloudflare-native stack satisfies this via KV session tokens validated in Workers, with D1 for structured relational data. The official Cloudflare React template eliminates Pages adapter configuration overhead. No Supabase at MVP — D1 + KV cover all data requirements; Supabase PostgreSQL is a documented Phase 2 pivot if relational complexity demands RLS or realtime subscriptions.

**Initialization Commands:**

```bash
# Monorepo scaffold
pnpm dlx create-turbo@latest mbti --package-manager pnpm

# Web app (React SPA → Cloudflare Pages)
cd apps/web
npm create cloudflare@latest . -- --template=react-ts
pnpm add react-router-dom@7
npx shadcn@latest init

# API (Hono → Cloudflare Workers)
cd apps/api
npm create cloudflare@latest . -- --template=hono
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript (strict mode), React 19, Vite 6; Hono v4.12 for Workers API

**Routing:**
React Router v7 — client-side SPA routing; all routes declared in `src/router.tsx`

**Styling Solution:**
Tailwind CSS (from Vite template) + shadcn/ui (Radix UI primitives, Vite-compatible)

**Build Tooling:**
Vite (development + production), Cloudflare Pages preview deployments per branch via Wrangler

**Testing Framework:**
Not included in starter — to be added: Vitest (unit), Playwright (E2E)

**Code Organization:**
Turborepo 2.9 + pnpm workspaces monorepo; `src/` directory, `@/*` import alias, feature-based structure

**Development Experience:**
ESLint, TypeScript strict, Vite HMR, Cloudflare Pages preview URLs per branch

**Backend & Data Layer:**
- Cloudflare D1 (SQLite) — structured relational data: test results, social graph, content, articles
- Cloudflare KV — session tokens (30-day TTL), invite link state, edge key-value caching
- Cloudflare R2 — generated assets (OG images, result cards, compatibility reports)
- No Supabase at MVP; D1 + KV cover all data requirements; Supabase PostgreSQL is a documented Phase 2 pivot if RLS or realtime subscriptions are required

**Note:** Project initialization using the above commands should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Cloudflare-first deployment model (Pages + Workers + D1 + KV + R2)
- Monorepo structure (Turborepo + pnpm workspaces)
- Session model: KV-backed anonymous session token (main user) + invite token (invitee guest)
- Worker-based admin auth: hashed credential → KV admin session
- Cloudflare D1 as primary relational data store
- Cloudflare KV as session and state store
- Hono v4.12 as API framework

**Important Decisions (Shape Architecture):**
- Satori + resvg-wasm for OG/card generation in Workers
- TanStack Query (server state) + Zustand with `persist` (client state)
- React Router v7 for client-side routing
- Anthropic Claude API + curated fallback (D1) for AI insights
- PostHog for extensible analytics
- Zod as shared validation layer (`packages/shared`)
- Feature-based directory structure

**Deferred Decisions (Post-MVP):**
- Supabase PostgreSQL pivot (Phase 2 — if RLS or realtime subscriptions needed)
- Cloudflare Durable Objects for stateful social graph sessions (Phase 3 if needed)
- Multi-region D1 read replicas (Phase 3 SEA expansion)
- Native mobile app (Phase 3)

### Data Architecture

| Decision | Choice | Rationale |
|---|---|---|
| **Database** | Cloudflare D1 (SQLite) | Structured relational data; Workers-native binding; no HTTP overhead; `wrangler d1 migrations apply` for schema versioning |
| **Session / state storage** | Cloudflare KV | Anonymous session tokens (30-day TTL), invite link state, edge caching; sub-millisecond global reads |
| **Data access** | D1 binding raw SQL + TypeScript row interfaces in `packages/shared` | No ORM overhead for MVP; type-safe via hand-written interfaces; Workers-idiomatic |
| **Validation** | Zod (in `packages/shared`) | Shared schemas between `web` and `api` packages; runtime validation at all API boundaries |
| **Migrations** | Wrangler CLI (`wrangler d1 migrations apply`) | Version-controlled SQL files; local dev via `wrangler dev` |
| **Caching** | Cloudflare Cache API (HTTP responses) + KV (persistent key-value) | Cache API for OG images and public content; KV for session tokens and invite metadata |
| **Asset storage** | Cloudflare R2 | Workers-native binding; zero egress fees; OG images, result cards, compatibility reports |

### Authentication & Security

| Decision | Choice | Rationale |
|---|---|---|
| **Main user (anonymous session)** | UUID session token generated on first visit → stored in KV with 30-day TTL → session ID persisted in `localStorage` client-side | Zero account creation friction (FR1); session ties all test/result/social data per user; Workers validate via KV lookup on each request |
| **Invitee (guest)** | UUID invite token stored in D1 `invite_links` table; 30-day `expired_at` expiry; token IS the credential | No session required for invitee flow (FR19); expiry checked server-side on every `/api/invites/:token` access |
| **Admin auth** | `POST /api/admin/login` → bcrypt compare against `ADMIN_PASSWORD_HASH` Worker secret → issue KV-backed admin session token with 24h TTL | Sufficient for 1 admin at MVP; no external dependency; admin token checked in Hono middleware for all `/api/admin/*` routes |
| **Session validation in Workers** | Hono auth middleware reads `X-Session-Token` header → KV lookup → attach user context to `c.var` | Consistent pattern for all authenticated routes; KV miss = 401 |
| **Invite links** | UUID token in D1 `invite_links`; `expired_at` checked on every access | NFR9 (30-day expiry); server-side verification; no client trust |
| **Rate limiting** | Cloudflare Workers Rate Limiting API (Durable Objects-backed) | Native, no external service; applied at Workers edge before request logic |
| **Data encryption** | D1 data encrypted at rest by Cloudflare (AES-256) + TLS 1.2+ in transit (Cloudflare terminates) | NFR6, NFR7 satisfied by platform defaults |

### API & Communication Patterns

| Decision | Choice | Rationale |
|---|---|---|
| **API framework** | Hono v4.12 on Cloudflare Workers | Ultra-lightweight, Web Standards-based, TypeScript-native, Workers idiomatic |
| **API style** | REST-style routes in Hono | Clean REST sufficient for MVP client-server boundary |
| **Shared types** | `packages/shared` — Zod schemas + inferred TypeScript types + D1 row interfaces | Single source of truth for request/response contracts and database row shapes |
| **Error handling** | Hono middleware — consistent JSON error envelope `{ error: { code, message } }` | Predictable client error handling; Zod parse errors normalized to 400 responses |
| **AI provider** | Anthropic Claude API (`claude-sonnet-4-6`) from Hono Workers | HTTP API call, Workers-compatible; behavioral specificity is core product bet |
| **AI fallback** | Curated insights stored in D1 `curated_insights` table | NFR17: transparent fallback within same response time SLA; no user-visible failure |
| **OG/Card generation** | Satori + resvg-wasm in dedicated Hono Worker route (`/api/og/:resultId`) | Edge-native image generation; cached to R2 after first generation; subsequent requests served from R2 |
| **Payment** | PayOS (VN market, supports VNPay + MoMo) + Stripe (international) | PCI DSS delegated; NFR8 satisfied; webhooks confirm payment → report delivery |
| **Analytics** | PostHog server-side in Workers + client-side in React SPA | NFR20: new event types without redeploy; PostHog handles schema evolution |

### Frontend Architecture

| Decision | Choice | Rationale |
|---|---|---|
| **Routing** | React Router v7 (client-side SPA) | Standard, familiar, no file-system coupling; all routes declared in `src/router.tsx` |
| **Server state** | TanStack Query | Data fetching, caching, polling for social loop status (`refetchInterval`); `refetchOnWindowFocus` for on-app-open check (FR32, FR33) |
| **Client state** | Zustand with `persist` middleware | Test flow state persisted to `localStorage`; 24h preservation on browser close (NFR18) |
| **Component structure** | Feature-based (`src/features/`) | Encapsulates domain logic; clear ownership per feature; reduces cross-feature coupling |
| **Performance** | `React.lazy` + `Suspense` for heavy components; explicit `width`/`height` on all images; route-based code splitting via React Router | NFR bundle size constraint; test engine and result components lazy-loaded |
| **PWA** | Manual `public/manifest.json` | No framework plugin needed; maintained manually at MVP |
| **SSR strategy** | Landing page and article pages rendered via dedicated Hono Worker routes — not part of the React SPA | PRD rendering strategy: SSR via Workers for SEO-critical pages; CSR for all interactive flows (test, result, social loop, admin) |

**Feature directory structure:**
```
apps/web/src/
  features/
    test/          # CAT engine, question flow, reverse mechanic
    result/        # Result card, share flow, OG link
    social/        # Invite links, perception voting, gap visualization
    payment/       # Couple Pack, Gap Report purchase flow
    feed/          # Article content, per-type feed
    admin/         # Dashboard, CMS, analytics views
  components/      # Shared UI (shadcn/ui wrappers, layout)
  lib/             # Session helpers, API client, utilities
  router.tsx       # React Router v7 route definitions
  main.tsx         # App entry point
```

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|---|---|---|
| **Frontend hosting** | Cloudflare Pages | Edge-native CDN, preview deployments per branch, zero config with official template |
| **API hosting** | Cloudflare Workers | V8 isolates, instant global scale for viral spikes (NFR13); independent scaling from frontend (NFR14) |
| **Database** | Cloudflare D1 | SQLite at edge; Workers-native binding; no connection pooling overhead |
| **Session / cache** | Cloudflare KV | Global low-latency reads; session tokens, invite state, edge cache |
| **Asset storage** | Cloudflare R2 | Zero egress; OG images, result cards, compatibility reports |
| **Monorepo** | Turborepo 2.9 + pnpm workspaces | Task caching; clean workspace boundaries; `turbo deploy` per service |
| **CI/CD** | GitHub Actions + Wrangler CLI + Cloudflare Pages CLI | `wrangler deploy` for Workers; `wrangler pages deploy` for SPA; lint + typecheck + Vitest before deploy |
| **Monitoring** | Sentry (`@sentry/cloudflare`) + Cloudflare Analytics | Error alerting; LCP tracking (NFR1); Worker error tracing |
| **Environment config** | `.dev.vars` (dev) → Cloudflare environment variables + secrets (staging/prod) | Worker secrets via `wrangler secret put`; no secret values in code or `wrangler.toml` |

**Cloudflare Workers bindings (`apps/api/wrangler.toml`):**
```toml
[[d1_databases]]
binding = "DB"
database_name = "mbti"
database_id = "..."

[[kv_namespaces]]
binding = "KV"
id = "..."

[[r2_buckets]]
binding = "ASSETS_BUCKET"
bucket_name = "mbti-assets"

[[unsafe.bindings]]
name = "RATE_LIMITER"
type = "ratelimit"
namespace_id = "..."
simple = { limit = 100, period = 60 }
```

**Worker secrets:** `ANTHROPIC_API_KEY`, `PAYOS_API_KEY`, `STRIPE_SECRET_KEY`, `ADMIN_PASSWORD_HASH`

### Decision Impact Analysis

**Implementation Sequence:**
1. Monorepo scaffold (Turborepo + pnpm workspaces)
2. `apps/web` — React SPA + Vite + Tailwind + shadcn/ui + React Router v7
3. `apps/api` — Hono v4.12 Workers scaffold + D1 + KV + R2 bindings
4. `packages/shared` — Zod schemas + D1 row type interfaces
5. D1 database setup — schema migrations, local dev via `wrangler dev`
6. KV namespaces + R2 bucket provisioning
7. Feature implementation in order: test → result → social → payment → feed → admin

**Cross-Component Dependencies:**
- `packages/shared` Zod schemas and D1 row interfaces must be defined before `web` or `api` implement any API contract
- KV session token generation must be wired before test flow can persist progress
- R2 bucket must be provisioned before OG image generation can be implemented
- PayOS webhook handler in Workers must be implemented before Couple Pack purchase flow is live
- `ADMIN_PASSWORD_HASH` Worker secret must be set before any admin routes are accessible
- SSR routes (landing, articles, type pages) are separate Hono routes in `apps/api` — not part of the React SPA build

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**8 critical conflict points identified** where AI agents could make different choices without explicit rules: naming conventions, structural ownership, API response format, date handling, analytics events, state management, error handling, and D1/KV client access in Workers.

### Naming Patterns

**Database (Cloudflare D1 — SQLite):**
- Tables: `snake_case`, plural → `users`, `test_results`, `invite_links`, `curated_insights`
- Columns: `snake_case` → `user_id`, `created_at`, `mbti_type`
- Foreign keys: `{table_singular}_id` → `user_id`, `result_id`
- Booleans: `is_` or `has_` prefix → `is_expired`, `has_completed`
- Timestamps: TEXT columns storing ISO 8601 strings → `created_at`, `updated_at`, `expired_at`

**API Endpoints (Hono):**
- Kebab-case, plural resources: `/api/test-results`, `/api/invite-links`
- Resource + action pattern: `POST /api/tests/submit`, `POST /api/invites/generate`
- Path params: `:id` (Hono convention) → `/api/results/:resultId`
- Query params: `camelCase` → `?mbtiType=INFP&page=1`

**Code:**
- React components: `PascalCase` → `ResultCard`, `TestFlow`
- Component files: `PascalCase.tsx` → `ResultCard.tsx`
- Utility/hook files: `camelCase.ts` → `useTestFlow.ts`, `session.ts`
- Functions: `camelCase` → `generateInviteLink()`, `validateSessionToken()`
- Zod schemas: `PascalCase` + `Schema` suffix → `TestSubmitSchema`, `InviteLinkSchema`
- Zustand stores: `use` + `PascalCase` + `Store` → `useTestStore`
- TanStack Query keys: `camelCase` array → `['testResult', resultId]`

### Structure Patterns

**Monorepo package ownership (strict):**
- `packages/shared` — Zod schemas, shared TypeScript types, D1 row interfaces, constants (`MBTI_TYPES`, query key factories)
- `apps/web` — all UI components, React Router pages, client-side logic
- `apps/api` — all server business logic, D1/KV queries, external API calls

**Rule:** `apps/web` ↔ `apps/api` communicate via HTTP only — no direct imports between apps. Both import from `packages/shared`.

**Test placement:**
- Unit tests: co-located `*.test.ts` / `*.test.tsx` alongside source file
- E2E tests: `apps/web/tests/e2e/` (Playwright)
- Test factories/fixtures: `apps/api/src/tests/factories/`

**Hono route organization:**
```
apps/api/src/
  routes/
    tests.ts       # POST /api/tests/submit, GET /api/tests/:id
    insights.ts    # POST /api/insights/generate
    invites.ts     # POST /api/invites/generate, GET /api/invites/:token
    payments.ts    # POST /api/payments/checkout, POST /api/payments/webhook
    og.ts          # GET /api/og/:resultId
    ssr.ts         # GET / + /mbti/:type + /feed/:slug — SSR HTML for SEO pages
    admin.ts       # Admin-only routes (require admin session token)
  middleware/
    auth.ts        # KV session token validation (user + admin)
    rateLimit.ts   # Cloudflare Rate Limiting binding
  lib/
    db.ts          # D1 query helpers — typed prepared statement wrappers
    kv.ts          # KV helpers — session token CRUD, invite state
    ai.ts          # Anthropic client + fallback orchestration
    r2.ts          # R2 storage helpers
```

### Format Patterns

**API Response Envelope — all Hono responses without exception:**
```typescript
// Success
{ "data": { ... }, "error": null }

// Error
{ "data": null, "error": { "code": "INVITE_EXPIRED", "message": "..." } }
```
`data` and `error` are never both non-null at the same time.

**HTTP Status Codes:**
- `200` — successful GET
- `201` — successful POST creating a resource
- `400` — Zod validation error
- `401` — missing or invalid session token
- `403` — authenticated but unauthorized
- `404` — resource not found
- `429` — rate limit exceeded
- `500` — unexpected server error

**Date format:** ISO 8601 strings everywhere — in D1 TEXT columns and in all API responses (`"2026-04-28T10:30:00.000Z"`). D1 does not have a native timestamptz type; store dates as TEXT. Frontend display via `Intl.DateTimeFormat` only.

**JSON field naming:** D1 columns are `snake_case`; API responses transform to `camelCase` in the Hono response layer (`{ mbtiType, resultId, createdAt }`).

### Communication Patterns

**PostHog Analytics Events:**
- Naming: `{noun}_{verb}`, `snake_case` only
- Properties: always `camelCase`

```typescript
posthog.capture('test_started', { declaredType: 'INFJ' })
posthog.capture('test_completed', { resultType: 'INFP', questionCount: 12 })
posthog.capture('result_shared', { shareChannel: 'instagram' })
posthog.capture('invite_generated', { resultId })
posthog.capture('payment_completed', { productType: 'couple_pack', amount: 79000 })
```

**Zustand store pattern — state and actions co-located, with `persist` middleware (mandatory):**
```typescript
import { persist } from 'zustand/middleware'

const useTestStore = create<TestState>()(
  persist(
    (set) => ({
      answers: [],
      currentIndex: 0,
      declaredType: null,
      submitAnswer: (answer) => set((s) => ({ answers: [...s.answers, answer] })),
      reset: () => set({ answers: [], currentIndex: 0, declaredType: null }),
    }),
    { name: 'mbti-test-progress' }
  )
)
```
`persist` is mandatory — required for NFR18 (24h test progress preservation across browser close).

**TanStack Query key factory (defined in `packages/shared`, never inline):**
```typescript
export const queryKeys = {
  testResult: (id: string) => ['testResult', id] as const,
  socialStatus: (userId: string) => ['socialStatus', userId] as const,
  feed: (mbtiType: string) => ['feed', mbtiType] as const,
}
```

### Process Patterns

**Error handling in Hono — route handlers throw, middleware formats:**
```typescript
app.onError((err, c) => {
  if (err instanceof ZodError) {
    return c.json({ data: null, error: { code: 'VALIDATION_ERROR', message: err.message }}, 400)
  }
  return c.json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' }}, 500)
})
```
Route handlers never return error responses directly — always `throw`. Only the error middleware formats responses.

**AI fallback pattern — transparent, no user-visible failure:**
```typescript
async function generateInsight(responses: Response[], mbtiType: MBTIType, env: Env) {
  try {
    // 2500ms budget to stay within 3s NFR3 SLA
    const result = await Promise.race([
      anthropic.messages.create({ ... }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
    ])
    return { source: 'ai' as const, content: result }
  } catch {
    const row = await env.DB.prepare(
      'SELECT content FROM curated_insights WHERE mbti_type = ? LIMIT 1'
    ).bind(mbtiType).first<{ content: string }>()
    return { source: 'curated' as const, content: row!.content }
  }
}
```

**D1 query pattern — always use prepared statements via `lib/db.ts`, never raw calls in route handlers:**
```typescript
// ✅ Correct — apps/api/src/lib/db.ts
export async function getTestResult(db: D1Database, resultId: string) {
  return db.prepare('SELECT * FROM test_results WHERE id = ?')
    .bind(resultId)
    .first<TestResultRow>()
}
// In route handler: const result = await getTestResult(c.env.DB, resultId)

// ❌ Anti-pattern — SQL injection risk + bypasses typed helpers
const result = await c.env.DB.exec(`SELECT * FROM test_results WHERE id = '${resultId}'`)
```

**KV session pattern — always use typed helpers in `lib/kv.ts`, never raw KV calls in route handlers:**
```typescript
// ✅ Correct — apps/api/src/lib/kv.ts
export async function getSession(kv: KVNamespace, token: string) {
  return kv.get<SessionData>(token, 'json')
}
export async function setSession(kv: KVNamespace, token: string, data: SessionData) {
  return kv.put(token, JSON.stringify(data), { expirationTtl: 60 * 60 * 24 * 30 })
}
// In route handler: const session = await getSession(c.env.KV, token)

// ❌ Anti-pattern — raw KV access leaks session logic across route handlers
const raw = await c.env.KV.get(token)
```

**Loading states — TanStack Query status, not local useState:**
```typescript
// ✅ Correct
const { data, isPending, isError } = useQuery({ queryKey: queryKeys.testResult(id), ... })
if (isPending) return <Skeleton />

// ❌ Anti-pattern — never for server data
const [loading, setLoading] = useState(false)
```
Local `useState` for loading is only acceptable for UI-only states (e.g., button animation during form submit).

### Enforcement Guidelines

**All AI agents MUST:**
- Wrap all Hono responses in `{ data, error }` envelope — no exceptions
- Use `snake_case` for D1 columns, `camelCase` for API response fields
- Import shared types, D1 row interfaces, and query key factories from `packages/shared` — never redefine locally
- Access D1 via typed helper functions in `apps/api/src/lib/db.ts` — never raw `c.env.DB` calls in route handlers
- Access KV via typed helper functions in `apps/api/src/lib/kv.ts` — never raw `c.env.KV` in route handlers
- Use TanStack Query `queryKeys` factory from `packages/shared`
- Implement AI calls with 2500ms timeout and automatic D1 fallback to `curated_insights`
- Throw errors in Hono route handlers — never self-format error responses
- Use prepared statements for all D1 queries — never string interpolation

**Pattern violations requiring review:**
- Any `useState(false)` used for server data loading
- Any raw `c.env.DB` access outside `lib/db.ts`
- Any raw `c.env.KV` access outside `lib/kv.ts`
- Any error response not following envelope format
- Any direct import between `apps/web` and `apps/api`
- Any PostHog event name not in `snake_case`
- Any D1 query using string interpolation instead of prepared statements

## Project Structure & Boundaries

### Complete Project Directory Structure

```
mbti/                                    # Monorepo root
├── package.json                         # private: true, workspaces config
├── pnpm-workspace.yaml
├── turbo.json                           # Turborepo pipeline definitions
├── tsconfig.base.json                   # Shared TS config extended by apps/packages
├── .gitignore
├── .github/
│   └── workflows/
│       ├── ci.yml                       # lint + typecheck + test on PR
│       └── deploy.yml                   # wrangler deploy on merge to main
├── migrations/                          # Cloudflare D1 SQL migrations (version-controlled)
│   ├── 0001_initial_schema.sql          # test_results, invite_links, perception_votes, articles
│   ├── 0002_curated_insights.sql        # 16 types × curated insight variants
│   ├── 0003_content.sql                 # articles table with mbti_type, slug, content
│   ├── 0004_pdpa_soft_delete.sql        # deleted_at + retention_flag on all user tables
│   └── seed.sql                         # Dev seed: MBTI types, curated insights, sample articles
│
├── apps/
│   ├── web/                             # React SPA (Vite) → Cloudflare Pages
│   │   ├── package.json
│   │   ├── vite.config.ts               # Vite build config + Cloudflare Pages adapter
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── wrangler.toml                # Cloudflare Pages deployment config
│   │   ├── index.html                   # SPA entry HTML
│   │   ├── .env.local                   # VITE_API_URL=http://localhost:8787
│   │   ├── .env.example
│   │   ├── public/
│   │   │   ├── manifest.json            # PWA manifest (day 1)
│   │   │   ├── icons/                   # PWA icons (192, 512)
│   │   │   └── fonts/                   # Self-hosted Vietnamese-friendly fonts
│   │   ├── src/
│   │   │   ├── main.tsx                 # App entry: provider tree (QueryProvider, PostHog, Session)
│   │   │   ├── router.tsx               # React Router v7 route definitions (all routes declared here)
│   │   │   ├── features/
│   │   │   │   ├── test/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── TestFlow.tsx           # Orchestrator — question sequence (FR3–FR4)
│   │   │   │   │   │   ├── QuestionCard.tsx        # Single question display + answer
│   │   │   │   │   │   ├── TypeDeclaration.tsx     # Reverse mechanic entry (FR2)
│   │   │   │   │   │   ├── ProgressBar.tsx
│   │   │   │   │   │   ├── ConsentGate.tsx         # PDPA consent + 18+ age gate (FR36–FR37, FR41)
│   │   │   │   │   │   └── AiDisclaimer.tsx        # AI-generated content notice (FR40)
│   │   │   │   │   └── hooks/
│   │   │   │   │       └── useTestFlow.ts          # CAT state machine (Zustand + persist)
│   │   │   │   ├── result/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── ResultPage.tsx
│   │   │   │   │   │   ├── PersonaReveal.tsx       # Persona name reveal animation (FR8)
│   │   │   │   │   │   ├── InsightCard.tsx         # Behavioral insight display (FR7)
│   │   │   │   │   │   ├── VillainsSection.tsx     # 3 Villains (FR9)
│   │   │   │   │   │   ├── ReverseReveal.tsx       # Declared vs calculated comparison (FR13)
│   │   │   │   │   │   ├── ShareCard.tsx           # 9:16 Stories-format card (FR14)
│   │   │   │   │   │   └── ShareActions.tsx        # Copy link, IG Stories, Zalo (FR14)
│   │   │   │   │   └── hooks/
│   │   │   │   │       └── useResultData.ts        # TanStack Query — fetches result
│   │   │   │   ├── social/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── InvitePrompt.tsx        # "Test Your Friends" CTA (FR17)
│   │   │   │   │   │   ├── InviteeLanding.tsx      # Invitee entry point (FR19)
│   │   │   │   │   │   ├── PerceptionVoting.tsx    # 3 behavioral questions (FR20)
│   │   │   │   │   │   ├── GapVisualization.tsx    # Side-by-side gap (FR22)
│   │   │   │   │   │   ├── GapTeaser.tsx           # Teaser + paywall prompt (FR23)
│   │   │   │   │   │   └── FriendStatusTracker.tsx # N friends responded (FR24)
│   │   │   │   │   └── hooks/
│   │   │   │   │       └── useSocialStatus.ts      # Polling — refetchInterval 3min (FR32)
│   │   │   │   ├── payment/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── CouplePack.tsx          # Couple Pack purchase UI (FR25)
│   │   │   │   │   │   ├── GapReportUnlock.tsx     # Gap Report paywall (FR28)
│   │   │   │   │   │   ├── CompatibilityReport.tsx # Delivered report view (FR26–FR27)
│   │   │   │   │   │   └── PaymentSuccess.tsx
│   │   │   │   │   └── hooks/
│   │   │   │   │       └── usePayment.ts
│   │   │   │   ├── feed/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── ArticleFeed.tsx         # Per-type list (FR30)
│   │   │   │   │   │   ├── ArticleCard.tsx
│   │   │   │   │   │   └── ArticleContent.tsx      # Full reader (FR31)
│   │   │   │   │   └── index.ts
│   │   │   │   └── admin/
│   │   │   │       └── components/
│   │   │   │           ├── MetricsDashboard.tsx    # Completion rate, share rate (FR43)
│   │   │   │           ├── ArticleEditor.tsx       # Create/edit articles (FR34)
│   │   │   │           ├── ThresholdAlerts.tsx     # Min articles per type (FR35)
│   │   │   │           ├── InsightApproval.tsx     # Review AI variants (FR11)
│   │   │   │           ├── VariantComparison.tsx   # A/B insight analytics (FR44)
│   │   │   │           └── InfraStatus.tsx         # Health alerts (FR45)
│   │   │   ├── components/
│   │   │   │   ├── ui/                            # shadcn/ui component re-exports
│   │   │   │   ├── layout/
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   └── PageWrapper.tsx
│   │   │   │   └── providers/
│   │   │   │       ├── QueryProvider.tsx          # TanStack Query client
│   │   │   │       ├── PostHogProvider.tsx
│   │   │   │       └── SessionProvider.tsx        # KV session token init + context
│   │   │   ├── lib/
│   │   │   │   ├── session.ts                     # Read/write session token in localStorage
│   │   │   │   ├── api.ts                         # Typed fetch wrapper (attaches X-Session-Token header)
│   │   │   │   ├── posthog.ts
│   │   │   │   └── utils.ts                       # cn(), formatDate(), MBTI helpers
│   │   │   └── types/
│   │   │       └── global.d.ts
│   │   └── tests/
│   │       └── e2e/
│   │           ├── test-flow.spec.ts              # FR1–FR6
│   │           ├── social-loop.spec.ts             # FR18–FR24
│   │           └── payment.spec.ts                # FR25–FR29
│   │
│   └── api/                             # Hono v4.12 → Cloudflare Workers
│       ├── package.json
│       ├── wrangler.toml                # D1, KV, R2, Rate Limiter bindings + secrets refs
│       ├── tsconfig.json
│       ├── .dev.vars                    # Local secrets (gitignored)
│       ├── .dev.vars.example
│       └── src/
│           ├── index.ts                 # Hono app entry — mounts all routes
│           ├── routes/
│           │   ├── tests.ts             # POST /api/tests/submit (FR5), GET /api/tests/:id (FR6)
│           │   ├── insights.ts          # POST /api/insights/generate (FR7–FR10)
│           │   ├── invites.ts           # POST /api/invites/generate (FR18), GET /api/invites/:token (FR19)
│           │   ├── social.ts            # POST /api/social/vote (FR20), GET /api/social/status/:userId (FR24, FR32)
│           │   ├── payments.ts          # POST /api/payments/checkout (FR25, FR28–FR29), POST /api/payments/webhook
│           │   ├── og.ts                # GET /api/og/:resultId — OG image generation (FR15, NFR5)
│           │   ├── content.ts           # GET /api/content/feed/:mbtiType (FR30), GET /api/content/articles/:slug (FR31)
│           │   ├── privacy.ts           # DELETE /api/privacy/delete-me (FR38), POST /api/privacy/purge (FR39)
│           │   ├── ssr.ts               # GET / + GET /mbti/:type + GET /feed/:slug — SSR HTML for SEO (NFR1)
│           │   └── admin.ts             # Admin CRUD: articles (FR34), insights (FR11), metrics (FR43–FR44)
│           ├── middleware/
│           │   ├── auth.ts              # KV session token validation (user + admin roles)
│           │   ├── rateLimit.ts         # Cloudflare Rate Limiting binding wrapper
│           │   └── cors.ts              # Origin whitelist for web app domain
│           ├── lib/
│           │   ├── db.ts                # D1 query helpers: typed prepared statement wrappers
│           │   ├── kv.ts                # KV helpers: session token CRUD, invite state
│           │   ├── ai.ts                # Anthropic client + 2500ms timeout + D1 curated fallback (FR7, NFR17)
│           │   ├── r2.ts                # R2 bucket helpers: put, get, getSignedUrl
│           │   ├── og.ts                # Satori + resvg-wasm OG/card renderer (FR15, NFR5)
│           │   ├── cat.ts               # Computer Adaptive Testing algorithm (FR3)
│           │   └── payment.ts           # PayOS + Stripe clients + webhook validation (FR29)
│           ├── types/
│           │   └── bindings.ts          # Env interface: D1Database, KVNamespace, R2Bucket, RateLimiter, secrets
│           └── tests/
│               ├── routes/
│               │   ├── tests.test.ts
│               │   ├── invites.test.ts
│               │   └── payments.test.ts
│               └── lib/
│                   ├── ai.test.ts       # Fallback logic unit tests
│                   └── cat.test.ts      # CAT algorithm unit tests
│
└── packages/
    └── shared/                          # Cross-app type contracts
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── schemas/
            │   ├── test.ts              # TestSubmitSchema, TestResultSchema, QuestionSchema
            │   ├── invite.ts            # InviteLinkSchema, PerceptionVoteSchema
            │   ├── insight.ts           # InsightSchema, InsightVariantSchema
            │   ├── payment.ts           # CheckoutSchema, WebhookEventSchema, ReportSchema
            │   ├── content.ts           # ArticleSchema, FeedItemSchema
            │   └── admin.ts             # AdminMetricsSchema, VariantComparisonSchema
            ├── db/
            │   └── rows.ts              # D1 row TypeScript interfaces (TestResultRow, InviteLinkRow, etc.)
            ├── queryKeys.ts             # TanStack Query key factories
            ├── constants.ts             # MBTI_TYPES[], PERSONA_NAMES{}, VILLAINS_MAP{}
            └── index.ts                 # Barrel re-exports
```

### Architectural Boundaries

**API Boundary (apps/web ↔ apps/api):**

| Client call | Hono route | Auth |
|---|---|---|
| Submit test answers | `POST /api/tests/submit` | Session token (KV) |
| Generate AI insight | `POST /api/insights/generate` | Session token (KV) |
| Create invite link | `POST /api/invites/generate` | Session token (KV) |
| Access invite | `GET /api/invites/:token` | None (invite token is credential) |
| Submit perception vote | `POST /api/social/vote` | None (invite token-gated) |
| Get social status | `GET /api/social/status/:userId` | Session token (KV) |
| Checkout | `POST /api/payments/checkout` | Session token (KV) |
| PayOS/Stripe webhook | `POST /api/payments/webhook` | Provider signature |
| OG image | `GET /api/og/:resultId` | None (public) |
| Article feed | `GET /api/content/feed/:mbtiType` | None (public) |
| Data deletion | `DELETE /api/privacy/delete-me` | Session token (KV) |
| Admin operations | `/api/admin/*` | Admin session token (KV) |

**Data Boundary:**
- `apps/api` owns all D1 writes — `apps/web` never accesses D1 directly
- `apps/web` reads session token from `localStorage` via `lib/session.ts`; all data fetches go through Hono API
- All business data flows through Hono Workers API

**Storage Boundary (apps/api ↔ R2):**
- OG images: generated once → cached at `r2://og/{resultId}.png`
- Result cards: generated on demand → cached at `r2://cards/{resultId}.png`
- Compatibility reports: generated post-payment → stored at `r2://reports/{reportId}.pdf`

### Requirements to Structure Mapping

| FR Group | Web Feature | API Route | Shared Schema |
|---|---|---|---|
| FR1–FR6 (Assessment) | `features/test/` | `routes/tests.ts`, `lib/cat.ts` | `schemas/test.ts` |
| FR7–FR11 (AI Insight) | `features/result/InsightCard` | `routes/insights.ts`, `lib/ai.ts` | `schemas/insight.ts` |
| FR12–FR17 (Result/Share) | `features/result/` | `routes/og.ts`, `lib/og.ts` | `schemas/test.ts` |
| FR18–FR24 (Social Loop) | `features/social/` | `routes/invites.ts`, `routes/social.ts` | `schemas/invite.ts` |
| FR25–FR29 (Payment) | `features/payment/` | `routes/payments.ts`, `lib/payment.ts` | `schemas/payment.ts` |
| FR30–FR35 (Content) | `features/feed/` | `routes/content.ts`, `routes/ssr.ts` | `schemas/content.ts` |
| FR36–FR41 (Privacy) | `features/test/ConsentGate` | `routes/privacy.ts` | — |
| FR42–FR45 (Admin) | `features/admin/` | `routes/admin.ts` | `schemas/admin.ts` |

**Cross-cutting concerns:**
- Anonymous session lifecycle → `apps/web/src/lib/session.ts` (client) + `apps/api/src/lib/kv.ts` + `middleware/auth.ts`
- AI fallback orchestration → `apps/api/src/lib/ai.ts` exclusively
- Analytics event capture → `apps/web/.../PostHogProvider.tsx` (client) + inline in Hono routes (server)
- PDPA data deletion → `apps/api/src/routes/privacy.ts` + D1 `deleted_at` soft delete in `migrations/0004_pdpa_soft_delete.sql`

### Data Flow

```
User → Cloudflare Pages (React SPA, Vite)
  → Session token generated on first visit → stored in localStorage
  → Hono Workers API (X-Session-Token header)
    → KV session lookup (auth validation)
    → Cloudflare D1 (prepared SQL queries via Workers binding)
    → Anthropic Claude API (2500ms timeout + D1 curated fallback)
    → Cloudflare R2 (generated assets: OG, cards, reports)
  → TanStack Query cache (client-side)
  → PostHog (analytics events)
```

### Development Workflow

**Local dev:**
```bash
pnpm dev          # turbo run dev — starts web (vite dev) + api (wrangler dev --local) in parallel
# D1 local dev is handled by wrangler dev --local (no separate database process needed)
# Apply migrations locally: wrangler d1 execute mbti --local --file=./migrations/0001_initial_schema.sql
```

**Deploy:**
```bash
pnpm build                       # turbo run build — type-check + build all packages
wrangler deploy                  # apps/api → Cloudflare Workers
wrangler pages deploy dist       # apps/web → Cloudflare Pages (Vite outputs to dist/)
wrangler d1 migrations apply mbti --remote  # apply pending D1 migrations to production
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are mutually compatible. React 19 + Vite 6 works with shadcn/ui (Vite-compatible build). Cloudflare D1 binding is Workers-native — no HTTP overhead, no connection pooling. KV reads are sub-millisecond globally — session validation adds no perceptible latency. Satori + resvg-wasm runs in Workers with no Node.js dependencies. TanStack Query + Zustand work correctly in React SPA. Turborepo + pnpm workspaces support the two-app, one-package monorepo structure.

**Note:** Sentry in Cloudflare Workers requires `@sentry/cloudflare` package (not `@sentry/node`).

**Pattern Consistency:**
snake_case D1 columns → camelCase API responses → camelCase React props is consistent throughout the full stack. API response envelope, AI fallback with 2500ms timeout, D1 prepared statements via `lib/db.ts`, and KV session helpers via `lib/kv.ts` are coherent patterns that don't conflict.

**Structure Alignment:**
Feature-based directory structure maps directly to the 7 FR groups. `packages/shared` boundary prevents contract drift. `migrations/` at monorepo root matches Wrangler D1 CLI expectations. SSR routes in `apps/api/src/routes/ssr.ts` cleanly separate SEO rendering from the React SPA without needing a separate deployment.

### Requirements Coverage Validation ✅

**Functional Requirements: 45/45 covered**

All FR groups have explicit architectural support:
- FR1–FR6 (Assessment): CAT engine in `lib/cat.ts`, KV session token (no account required), shareable `/result/:resultId` React Router route
- FR7–FR11 (AI Insight): `lib/ai.ts` with 2500ms timeout + D1 curated fallback, `InsightVariantSchema`, `InsightApproval.tsx`
- FR12–FR17 (Result/Share): ShareCard.tsx (9:16 Stories), OG image Worker → R2 cache pipeline
- FR18–FR24 (Social Loop): UUID invite tokens in D1, PerceptionVoting.tsx, GapVisualization.tsx, polling via TanStack Query
- FR25–FR29 (Payment): PayOS (VN market) + Stripe (international), webhook handler, reports → R2
- FR30–FR35 (Content): `routes/ssr.ts` for SSR article pages, ArticleEditor.tsx, ThresholdAlerts.tsx
- FR36–FR41 (Privacy): ConsentGate.tsx, D1 soft delete migration, DELETE /api/privacy/delete-me
- FR42–FR45 (Admin): MetricsDashboard.tsx, PostHog capture, Sentry + Cloudflare Analytics

**Non-Functional Requirements: 21/21 covered**

| NFR | Architectural Solution |
|---|---|
| NFR1 LCP ≤3s | SSR via `routes/ssr.ts` at Cloudflare edge + global CDN for static SPA assets |
| NFR2 test ≤500ms | Zustand client-side state — zero server round-trips mid-test |
| NFR3 AI ≤3s | 2500ms budget with immediate D1 curated fallback |
| NFR4 card ≤5s | Satori Workers + R2 cache |
| NFR5 OG ≤3s | `/api/og` edge Worker + R2 cache after first generation |
| NFR6 TLS 1.2+ | Cloudflare terminates TLS by default |
| NFR7 data encrypted at rest | Cloudflare D1 AES-256 at rest (platform default) |
| NFR8 no card data | PayOS + Stripe own all card data; platform receives payment status only |
| NFR9 invite link expiry | `expired_at` TEXT column checked on every `/api/invites/:token` access |
| NFR10 admin auth | KV admin session token (24h TTL); Hono middleware guards `/api/admin/*`; React Router guard on admin routes |
| NFR11 deletion within 30d | DELETE /api/privacy/delete-me + D1 soft delete + KV session purge |
| NFR12 500 concurrent | Cloudflare Workers + D1 handle natively — no connection pool limits |
| NFR13 10x in 15min | Cloudflare Workers instant scale via V8 isolates — no cold start bottleneck |
| NFR14 AI scales independently | Hono Workers deployed separately from Cloudflare Pages SPA |
| NFR15 multi-region ready | D1 schema designed for migration to Supabase PostgreSQL in Phase 2 without structural redesign |
| NFR16 99% uptime | Cloudflare Workers + D1 platform SLAs |
| NFR17 AI fallback | `lib/ai.ts` transparent D1 fallback — same response time SLA, no user-visible failure |
| NFR18 24h session preserve | Zustand `persist` middleware (localStorage) for test flow state |
| NFR19 VN payment methods | PayOS (VNPay + MoMo + domestic cards) as primary VN gateway |
| NFR20 extensible analytics | PostHog schema-free `capture()` — new events without redeploy |
| NFR21 OG on 4 platforms | `/api/og` generates correct OG meta for Instagram, Facebook, Zalo, TikTok |

### Gap Analysis Results

**Critical Gaps — Resolved:**

**Gap 1 (NFR18): Zustand persist middleware required**
Zustand `useTestStore` must use `persist` middleware with localStorage to survive browser close mid-test.
```typescript
// Required pattern in apps/web/src/features/test/hooks/useTestFlow.ts
import { persist } from 'zustand/middleware'
const useTestStore = create<TestState>()(
  persist((set) => ({ ... }), { name: 'mbti-test-progress' })
)
```

**Gap 2 (FR21): Invitee-to-test transition flow specified**
```
/invite/:token → ConsentGate + AiDisclaimer
  → PerceptionVoting (3 questions about inviting user)
  → POST /api/social/vote
  → Redirect to /test?inviteSource={token}
  → Test flow completes
  → Result page → auto-show GapVisualization (inviter's result linked)
```
React Router `/test` route accepts `?inviteSource` query param to link invitee result with inviter's social graph.

**Gap 3 (NFR19): Payment gateway for Vietnam market — Resolved**
Stripe does not natively support MoMo in Vietnam as of mid-2025. **PayOS** is the primary gateway for Vietnam market (supports VNPay + MoMo + domestic cards in one integration). Stripe retained for international card support. Both are abstracted behind `apps/api/src/lib/payment.ts`.

**Gap 4 (D1 SQLite date handling): TEXT timestamps required**
D1/SQLite has no native `timestamptz`. All timestamp columns must use TEXT storing ISO 8601 strings. Queries comparing timestamps use SQLite string comparison (ISO 8601 sorts lexicographically). Expiry checks: `WHERE expired_at > datetime('now')`.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (45 FRs, 21 NFRs from PRD)
- [x] Scale and complexity assessed (Medium-High, greenfield, 1-developer team)
- [x] Technical constraints identified (edge runtime, KV sessions, D1 SQLite, AI fallback, viral scaling)
- [x] 8 cross-cutting concerns mapped to specific architectural components

**✅ Architectural Decisions**
- [x] Full Cloudflare-native stack specified (Pages + Workers + D1 + KV + R2)
- [x] All technology versions verified (Hono 4.12, Turborepo 2.9, React 19, Vite 6, React Router v7)
- [x] Integration patterns defined (KV session flow, D1 query helpers, R2 caching, polling upgrade path)
- [x] All NFRs addressed with specific architectural solutions

**✅ Implementation Patterns**
- [x] Naming conventions established (D1 snake_case, API camelCase, code conventions)
- [x] Monorepo package ownership rules defined (no cross-app imports)
- [x] Communication patterns specified (PostHog events, Zustand stores, TanStack Query key factory)
- [x] 5 process patterns documented with code examples and anti-patterns (D1/KV patterns replacing Supabase)

**✅ Project Structure**
- [x] Complete directory structure defined — all files and directories specified
- [x] All 45 FRs mapped to specific files/directories
- [x] API boundary table with 12 endpoints, auth requirements (KV session tokens), and route ownership
- [x] Data flow diagram from user to Cloudflare edge to D1/KV

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High**

**Key Strengths:**
- Fully Cloudflare-native — D1 + KV + R2 + Workers with zero external dependencies at MVP
- KV-based anonymous session elegantly solves the no-account-required constraint across all flows (test, result, social loop, invite)
- D1 SQLite is sufficient for MVP data model; Phase 2 Supabase pivot path is documented and requires no schema redesign
- AI fallback in `lib/ai.ts` satisfies NFR17 with D1 curated_insights — no additional infrastructure
- R2 caching for OG images ensures NFR5 holds under viral spike traffic
- `packages/shared` Zod schemas + D1 row interfaces prevent contract drift between web and API

**Areas for Future Enhancement (Post-MVP):**
- Phase 2: Replace polling in `useSocialStatus.ts` with Cloudflare Durable Objects or Supabase Realtime after D1 → Supabase pivot
- Phase 2: `@sentry/cloudflare` source maps integration for better Worker error tracing
- Phase 2: Migrate D1 → Supabase PostgreSQL if RLS or realtime subscriptions are required
- Phase 3: Multi-region D1 read replicas or Supabase multi-region when SEA expansion begins
- Phase 3: `apps/api/src/lib/payment.ts` extended for additional SEA payment gateways

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented — do not introduce new libraries without explicit decision
- Use `packages/shared` Zod schemas and D1 row interfaces as the single source of truth for all contracts
- Respect the `apps/web` ↔ `apps/api` HTTP-only boundary — no direct imports
- Access D1 only via typed helpers in `lib/db.ts` — never raw `c.env.DB` in route handlers
- Access KV only via typed helpers in `lib/kv.ts` — never raw `c.env.KV` in route handlers
- Wrap all Hono responses in `{ data, error }` envelope — no exceptions
- Use prepared statements for all D1 queries — never string interpolation
- Add `persist` middleware to `useTestStore` — required for NFR18
- Store all D1 timestamps as ISO 8601 TEXT strings; use `datetime('now')` for SQLite expiry comparisons

**First Implementation Story:**
```bash
# Step 1: Monorepo scaffold
pnpm dlx create-turbo@latest mbti --package-manager pnpm

# Step 2: Web app (React SPA → Cloudflare Pages)
cd apps/web
npm create cloudflare@latest . -- --template=react-ts
pnpm add react-router-dom@7 && npx shadcn@latest init

# Step 3: API Workers
cd apps/api
npm create cloudflare@latest . -- --template=hono

# Step 4: Shared package + D1 migration setup
mkdir -p packages/shared/src && cd packages/shared
# Add Zod schemas + D1 row interfaces
cd ../../ && mkdir migrations
# Write 0001_initial_schema.sql
wrangler d1 create mbti
wrangler d1 migrations apply mbti --local
```
