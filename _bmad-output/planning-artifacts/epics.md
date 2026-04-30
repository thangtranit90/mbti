---
stepsCompleted: ['step-01-extract-requirements', 'step-01-confirmed', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
status: complete
createdAt: '2026-04-29'
completedAt: '2026-04-29'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# MBTI - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for MBTI, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Personality Assessment**
FR1: Visitors can begin a personality assessment without creating an account
FR2: Users can declare their expected MBTI type before the assessment begins
FR3: The system can adaptively select subsequent questions based on prior responses (Computer Adaptive Testing)
FR4: Users can complete the personality assessment in a single uninterrupted session
FR5: The system can calculate an MBTI type classification from a completed set of assessment responses
FR6: The system can generate a unique, persistent, shareable URL for each completed assessment result

**AI Insight Generation**
FR7: The system can generate behavioral insight copy derived from a user's specific response patterns, not from generic type descriptions; the system must also support serving pre-written (manually curated) insight copy as a fallback when AI-generated quality does not meet the accuracy threshold
FR8: The system can assign a persona name to each assessment result
FR9: The system can generate a list of three MBTI types most likely to create friction with the user's type ("3 Villains"), with explanatory context
FR10: The system can serve multiple insight copy variants per type for comparison testing
FR11: Administrators can review, edit, and approve insight copy variants (both AI-generated and manually curated) before they are served to users

**Result & Sharing**
FR12: Users can view their calculated MBTI type, persona name, behavioral insight, and "3 Villains" on a result page
FR13: Users can see a comparison of their self-declared type versus their calculated type (reverse mechanic reveal)
FR14: Users can download or share their result as an image formatted for social media Stories (9:16 ratio)
FR15: The system can generate dynamic Open Graph preview images for result page URLs, populated with the user's persona name and type
FR16: Users can access their result page via a unique URL without authentication
FR17: Users can initiate the "Test Your Friends" social loop from the result page

**Social Perception Loop**
FR18: Users can generate a personalized invite link pre-loaded with their profile, shareable via any messaging channel
FR19: Invitees can access and complete the perception voting flow without creating an account
FR20: Invitees can answer behavioral questions describing the inviting user's observable behavior
FR21: Invitees can complete their own personality assessment immediately after submitting perception votes
FR22: Users can view a side-by-side comparison of their self-perception versus how others perceive them
FR23: Users can see a teaser summary of the self vs. social perception gap without purchasing
FR24: Users can track how many friends have responded to their invite link

**Monetization**
FR25: Users can purchase a compatibility report as a shared two-person transaction (Couple/Friend Pack)
FR26: The system can generate a full MBTI compatibility report for two assessed users
FR27: Purchasers can access their compatibility report via a shared link without re-authentication
FR28: Users can unlock the full self vs. social perception gap report via a one-time payment (Gap Report)
FR29: The system can process payments via an integrated payment provider

**Content & Retention**
FR30: Users can browse a curated feed of articles relevant to their MBTI type
FR31: Users can read full article content within the platform
FR32: Users can receive in-app notifications (polling-based, not push) when friends complete perception voting on their profile; browser push notifications are explicitly out of scope for MVP
FR33: The system can surface unresolved social loop status (pending friend responses) when users return to the platform
FR34: Administrators can create, edit, and publish articles assigned to specific MBTI types
FR35: Administrators can set and monitor minimum article thresholds per type, with alerts when thresholds are not met

**User & Privacy Management**
FR36: Users can provide explicit consent to data collection before beginning the assessment
FR37: Users can view the platform's privacy policy before providing consent
FR38: Users can request complete deletion of their personal data
FR39: The system can automatically purge data for users who have been inactive beyond a defined retention period
FR40: The system can display an AI-generated content disclaimer during onboarding and on the result page
FR41: The system can enforce a minimum age confirmation (18+) before assessment access is granted

**Platform Administration & Analytics**
FR42: The system can capture and store interaction events including test step completion, result views, share clicks, and invite link clicks
FR43: Administrators can view key metrics including test completion rate by type, share rate by result card variant, and viral propagation data
FR44: Administrators can compare performance across result card and insight copy variants
FR45: Administrators can monitor platform infrastructure health and receive alerts on threshold breaches

### NonFunctional Requirements

**Performance**
NFR1: Public pages (landing, content articles, result page) achieve Largest Contentful Paint ≤3 seconds on mobile 4G connections
NFR2: Test flow interactions (question transitions, answer selection) complete in ≤500ms perceived response time
NFR3: AI-generated result insights render on the result page within 3 seconds of test completion
NFR4: Shareable result card image generates and is available for download within 5 seconds of result page load
NFR5: Open Graph preview images for result URLs generate within 3 seconds to ensure social share previews display correctly

**Security**
NFR6: All client-server data transmission uses TLS 1.2 or higher
NFR7: User assessment responses and personal data are encrypted at rest
NFR8: Payment card data is never stored or processed by the platform; all payment processing is delegated to a PCI DSS-compliant third-party provider
NFR9: Invite links expire after 30 days to prevent stale social loop data accumulation
NFR10: Admin dashboard access is restricted to authenticated administrators; no admin functionality is accessible to regular users
NFR11: User data deletion requests are processed within 30 days of submission (PDPA compliance)

**Scalability**
NFR12: The platform supports a minimum of 500 concurrent users without measurable performance degradation at MVP launch
NFR13: Infrastructure can scale to handle 10x baseline traffic load within 15 minutes (viral spike response window)
NFR14: The AI insight generation pipeline scales independently from the front-end and test engine (no coupled scaling bottleneck)
NFR15: Database schema and data models support multi-region deployment without structural redesign (prerequisite for SEA expansion)

**Reliability**
NFR16: Platform uptime ≥99% measured on a rolling monthly basis, excluding scheduled maintenance windows
NFR17: If the AI insight generation service is unavailable, the system automatically falls back to serving pre-written (manually curated) insights within the same response time SLA — no user-visible failure
NFR18: If a user's session is interrupted during the test flow, their progress is preserved for at least 24 hours to allow completion without restarting

**Integration**
NFR19: Payment provider integration supports Vietnamese-market payment methods (VNPay, MoMo, or international cards) at MVP launch
NFR20: Analytics event tracking can be extended with new event types without requiring a full platform redeploy
NFR21: Social share metadata (Open Graph) renders correctly on Instagram, Facebook, Zalo, and TikTok — the four primary share surfaces for the Vietnam target market

### Additional Requirements

Technical requirements from Architecture (Cloudflare-native stack) that affect implementation:

- **Monorepo scaffold first**: First story must initialize Turborepo + pnpm workspaces, then scaffold `apps/web` (React SPA via `npm create cloudflare@latest . -- --template=react-ts`, Tailwind CSS, shadcn/ui) and `apps/api` (Hono v4.12 via `npm create cloudflare@latest . -- --template=hono`) and `packages/shared` (Zod schemas + D1 row interfaces)
- **Cloudflare D1 before any user flow**: D1 database creation (`wrangler d1 create mbti`), schema migrations (`migrations/0001_initial_schema.sql` through `0004_pdpa_soft_delete.sql`), and seed data (`seed.sql`) must be applied before any endpoint can persist data; local dev runs via `wrangler dev --local`
- **packages/shared Zod schemas + D1 row interfaces before API contracts**: All Zod schemas and D1 TypeScript row interfaces in `packages/shared/src/` must be defined before `apps/web` or `apps/api` implement any API endpoint
- **KV session token before test flow**: Cloudflare KV namespace must be provisioned and `apps/api/src/lib/kv.ts` session helpers must be implemented before any user flow can persist progress — anonymous session token (UUID, 30-day TTL) issued on first visit, stored in `localStorage` client-side, sent as `X-Session-Token` header on all authenticated requests
- **R2 bucket before OG/card generation**: Cloudflare R2 bucket (`mbti-assets`) must be provisioned and bound in `wrangler.toml` before OG image or result card generation can be implemented
- **PayOS + Stripe before payment flow**: Payment gateway integration (PayOS as primary VN gateway for VNPay/MoMo, Stripe for international) with webhook handler must be in `apps/api/src/lib/payment.ts` before Couple Pack or Gap Report purchase flows go live
- **Admin auth isolated from user flow**: Admin auth uses `POST /api/admin/login` → bcrypt compare against `ADMIN_PASSWORD_HASH` Worker secret → KV admin session token (24h TTL); admin token is separate from user session token; Hono middleware guards all `/api/admin/*` routes; React Router admin route guard on client
- **All Hono responses in `{ data, error }` envelope**: `{ data: {...}, error: null }` for success; `{ data: null, error: { code, message } }` for errors — no exceptions across all routes
- **PostHog for analytics (not GA)**: PostHog server-side SDK in Workers + client-side in React SPA; all event names `snake_case` (`test_started`, `test_completed`, `result_shared`, `invite_generated`, `payment_completed`); all event properties `camelCase`
- **Zustand `persist` middleware mandatory for NFR18**: `useTestStore` must use `zustand/middleware` `persist` with `name: 'mbti-test-progress'` in `localStorage` to preserve 24-hour test progress across browser closes
- **Satori + resvg-wasm for image generation**: OG images and result cards generated in dedicated Hono Worker route (`GET /api/og/:resultId`) using Satori + resvg-wasm; cached to Cloudflare R2 after first generation; subsequent requests served from R2
- **TanStack Query polling for social loop**: `useSocialStatus` hook uses `refetchInterval: 3 * 60 * 1000` (3 minutes) + `refetchOnWindowFocus: true` for on-app-open social loop status updates — polling only, no WebSocket at MVP
- **GitHub Actions CI/CD**: `pnpm lint` + `pnpm typecheck` + `pnpm test` (Vitest) must pass before deploy; `wrangler deploy` for Workers; `wrangler pages deploy` for React SPA
- **Sentry via `@sentry/cloudflare` (not `@sentry/node`)**: Error monitoring in Cloudflare Workers requires `@sentry/cloudflare` package specifically
- **D1 raw SQL via typed helpers only**: All D1 queries go through typed helper functions in `apps/api/src/lib/db.ts` using prepared statements — never raw `c.env.DB` calls in route handlers, never string interpolation in SQL
- **KV access via typed helpers only**: All KV reads/writes go through typed helpers in `apps/api/src/lib/kv.ts` — never raw `c.env.KV` calls in route handlers
- **SSR for SEO pages via Hono Worker**: Landing page, article pages, and MBTI type pages are server-rendered via `apps/api/src/routes/ssr.ts` Hono routes (not part of the React SPA build); all interactive flows (test, result, social loop, admin) are CSR
- **Invitee-to-test flow**: `/invite/:token` → ConsentGate + AiDisclaimer → PerceptionVoting (3 questions about inviting user) → `POST /api/social/vote` → redirect to `/test?inviteSource={token}` → test completes → result page auto-shows GapVisualization (inviter's result linked via `inviteSource` param)
- **D1 timestamps as ISO 8601 TEXT**: D1/SQLite has no native `timestamptz`; all timestamp columns use `TEXT` storing ISO 8601 strings; expiry checks use `WHERE expired_at > datetime('now')`
- **Worker secrets**: `ANTHROPIC_API_KEY`, `PAYOS_API_KEY`, `PAYOS_CLIENT_ID`, `PAYOS_CHECKSUM_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_PASSWORD_HASH` — all set via `wrangler secret put`, never in code or `wrangler.toml`

### UX Design Requirements

UX-DR1: Implement "The Stage" dark design direction — near-black base surface (`#0D0F1A` for result pages, `#161929` for cards) as foundational background; test flow uses light surface (`#F8F9FC`) for readability; type-specific accent colors (16 palettes) via CSS custom properties (`data-type="INFP"` attribute on page root)
UX-DR2: Define and implement all Tailwind design tokens before building any component — 16 MBTI type palettes (primary accent + gradient-start per type), semantic colors (`cta-primary: #6366F1`, `success: #10B981`, `error: #EF4444`), spacing scale (4px base grid, 12 defined levels), and motion tokens (`reveal-entrance: 600ms ease-out`, `card-transition: 300ms ease-in-out`, `earned-pause: 1200ms`)
UX-DR3: Self-host Clash Display (display/persona names 64px+) and Inter (UI/body 16px+) fonts in `apps/web/public/fonts/` — both must fully support Vietnamese diacritics; line-height minimum 1.6 for body text
UX-DR4: Build QuestionCard custom component — full-screen one-question-per-card layout, situational scenario text + 2–4 tappable answer cards, tap-to-select with 150ms visual feedback → 300ms auto-advance slide transition (Framer Motion), 12-dot progress indicator (not percentage bar), `role="radio"` `aria-checked` on each option, no back button during test
UX-DR5: Build TypeSelector custom component — 4×4 grid of 16 MBTI type chips with group headers (Analysts/Diplomats/Sentinels/Explorers), selected state dims others to 40% opacity, `role="radiogroup"` container + `role="radio"` per chip
UX-DR6: Build EarnedPauseTransition custom component — 1200ms hardcoded (not skippable, no user control), particle coalescing animation on near-black full screen, no text/spinner/progress bar; `prefers-reduced-motion`: show plain dark screen with glow only (1200ms delay preserved)
UX-DR7: Build ResultCard custom component — sequential 4-beat Framer Motion reveal: Beat 1 (0ms, 600ms fade) persona name in Clash Display 64px; Beat 2 (800ms delay, 400ms slide-up+fade) behavioral insight; Beat 3 (1400ms delay, 300ms fade) 4-letter type code secondary; Beat 4 (2000ms delay) scroll chevron pulses; 16 type themes via CSS custom properties; persona name has `role="heading"` `aria-level="1"`; full result text in DOM from start for screen readers
UX-DR8: Build ShareCard custom component — 9:16 1080×1920px canvas rendered via `html-to-image`, near-black + type-specific glow, persona name dominant center, 1-line insight teaser, type code bottom, social hook text ("3 types most likely to clash with me →"); begins rendering in background when user scrolls past Beat 3; Web Share API with file share + fallback to image download
UX-DR9: Build GapVisualization custom component — two-panel horizontal layout (self-perception left, friend-perceived right), 3 behavioral descriptor tags per panel, 4 states (`teaser`: right panel blurred + lock icon; `partial-unlock`; `unlocked`; `empty`: invite CTA), swipe between panels on mobile for full-screen view
UX-DR10: Build LoopStatus custom component — friend avatar row with initials + type color, progress as "N/3 người đã vote" near-win framing (not deficit), thin accent progress bar, two CTAs always present (free: "Mời thêm người" + paid: "Mở khóa ngay"), `aria-label="N of 3 friends have responded"`
UX-DR11: Implement linear navigation flow — no back button available during test questions 2–12, earned pause non-skippable, result reveal is one-way; back navigation available only from expanded result page, Gap Status, Payment, and Content Article screens
UX-DR12: Implement deep-link return behavior — all notification and re-entry links bypass homepage and land directly on the specific promised content (Gap Status screen, not content feed); back button in header navigates one level up, never exits app
UX-DR13: Implement bottom sheet overlay pattern using Shadcn Sheet component — share options, invite generation, payment options; drag handle visible; backdrop tap dismisses; Escape key dismisses; max height 80vh; modal Dialog for payment confirmation (explicit × close, cannot dismiss by backdrop tap during payment)
UX-DR14: Verify WCAG 2.1 AA compliance for all 16 type palettes — 4.5:1 minimum contrast for text, 3:1 for UI elements; provide fallback text color on failing gradient combinations; minimum 44×44px touch targets for all tappable elements; minimum 16px body text (13px caption minimum); visible focus rings (Shadcn/ui provides, customize color to type palette)
UX-DR15: Implement `prefers-reduced-motion` support via Framer Motion's `useReducedMotion()` hook — all animations fall back to instant state changes; EarnedPauseTransition preserves 1200ms timing but removes particle animation (plain dark screen with glow only)
UX-DR16: Implement all required ARIA patterns — progress dots container: `aria-label="Question N of 12"`; TypeSelector: `role="radiogroup"`; answer options: `role="radio"` `aria-checked`; toast/Sonner notifications: `role="status"` `aria-live="polite"`; loading/result-ready states: `aria-live="polite"` region; ShareCard image: `alt="{persona name} — {type} · MBTI Platform"`; `lang="vi"` on `<html>` element, `lang="en"` span on type codes (INFP, ENTJ etc.)
UX-DR17: Implement responsive breakpoint strategy — core flows (test/result/social) always at full-width on mobile and 480px centered column on md+ with dark flanks; content feed 1-column mobile → 2-column md+, max-width 960px; GapVisualization stacked+swipe on mobile → side-by-side md+; admin: redirect mobile to desktop notice, simplified tablet, full multi-column lg+
UX-DR18: Implement PWA manifest (`display: standalone`, `orientation: portrait`, `theme_color: #050507`, `background_color: #050507`) in `public/manifest.json` from day one; viewport meta with `viewport-fit=cover` for iOS notch/Dynamic Island; safe area insets (`env(safe-area-inset-bottom/top)`) on all bottom-anchored CTAs
UX-DR19: Enforce 3-tier button hierarchy across all screens — Primary: indigo `#6366F1`, full-width on mobile (max-width 480px on desktop), min-height 48px, exactly 1 per screen, disabled state 40% opacity + `aria-disabled="true"`, loading state label→spinner with width locked; Secondary: outlined border `#1E2A3A`; Ghost/Text: no border, underline or arrow only
UX-DR20: Implement Sonner toast feedback system — success toast (green left border, 3s), info toast (indigo left border, 4s), error toast (red left border, persistent + dismiss + retry action); skeleton screens for AI result generation >1s and content feed load; custom spinner for share card generation and payment processing overlay (blocks interaction during payment)
UX-DR21: Implement axe-core accessibility automated testing in CI pipeline — block deploy on WCAG AA violations; Lighthouse accessibility score target ≥90; manual checklist per release (keyboard-only flow, VoiceOver iOS, TalkBack Android, 200% zoom, `prefers-reduced-motion`, PWA install, Vietnamese diacritic rendering)

### FR Coverage Map

FR1: Epic 2 — Visitors begin assessment without account (KV anonymous session token)
FR2: Epic 2 — Declare expected MBTI type before test (reverse mechanic)
FR3: Epic 2 — Adaptive question selection based on prior responses (CAT engine)
FR4: Epic 2 — Complete assessment in single uninterrupted session
FR5: Epic 2 — Calculate MBTI type from completed responses
FR6: Epic 2 — Generate persistent shareable result URL
FR7: Epic 3 — AI-generated behavioral insight with D1 curated fallback
FR8: Epic 3 — Assign persona name to result
FR9: Epic 3 — Generate "3 Villains" list with context
FR10: Deferred — Multiple insight variants for A/B testing (Phase 2)
FR11: Deferred → Epic 7 — Admin insight approval workflow (post-MVP admin feature)
FR12: Epic 3 — Full result page display (type, persona, insight, villains)
FR13: Epic 3 — Reverse mechanic reveal (declared vs calculated)
FR14: Epic 3 — Download/share 9:16 Stories-format result card
FR15: Epic 3 — Dynamic Open Graph preview image generation (Satori + R2)
FR16: Epic 3 — Result page accessible via URL without authentication
FR17: Epic 4 — Initiate "Test Your Friends" social loop from result page
FR18: Epic 4 — Generate personalized invite link pre-loaded with profile
FR19: Epic 4 — Invitee accesses perception voting without account (invite token as credential)
FR20: Epic 4 — Invitee answers 3 behavioral questions about sender
FR21: Epic 4 — Invitee completes own test after submitting votes
FR22: Epic 4 — Side-by-side self vs social perception comparison
FR23: Epic 4 — Gap teaser visible without purchasing
FR24: Epic 4 — Track friend response count
FR25: Epic 5 — Purchase Couple/Friend Pack (two-person transaction)
FR26: Epic 5 — Generate full MBTI compatibility report
FR27: Epic 5 — Access compatibility report via shared link without re-auth
FR28: Epic 5 — Unlock Gap Report via one-time payment
FR29: Epic 5 — Process payments via PayOS (VNPay/MoMo) + Stripe
FR30: Epic 6 — Browse curated per-type article feed
FR31: Epic 6 — Read full article content within platform
FR32: Epic 4 — In-app polling notifications when friends vote (TanStack Query polling)
FR33: Epic 4 — Surface unresolved social loop status on return
FR34: Epic 7 — Admin create/edit/publish articles per MBTI type
FR35: Epic 7 — Admin monitor minimum article thresholds with alerts
FR36: Epic 2 — Explicit PDPA consent before assessment begins
FR37: Epic 2 — Privacy policy viewable before consent
FR38: Epic 7 — User requests complete data deletion (PDPA / D1 soft delete)
FR39: Epic 7 — Automatic data purge after inactivity period (PDPA)
FR40: Epic 2 — AI content disclaimer at onboarding and result page
FR41: Epic 2 — Age gate (18+) before assessment access
FR42: Epic 4 — Capture interaction events (PostHog: test steps, shares, invites)
FR43: Epic 7 — Admin view key metrics (completion rate, share rate, K-factor)
FR44: Epic 7 — Admin compare result card and insight variant performance
FR45: Epic 7 — Admin monitor infrastructure health and receive alerts

> **Scope Note:** FR10 (multi-variant A/B serving engine) deferred to Phase 2 — FR44 covers manual variant comparison in admin dashboard. All 44 remaining FRs covered across 7 epics.

## Epic List

### Epic 1: Project Foundation & Infrastructure
Developer can scaffold, deploy, and run the complete platform — Turborepo monorepo initialized, React SPA on Cloudflare Pages, Hono Workers API with KV session auth, Cloudflare D1 schema applied, R2/KV provisioned, CI/CD pipeline live. This epic has no direct user-facing FRs but is the prerequisite for all subsequent epics.
**FRs covered:** None directly (enables all MVP FRs)

### Epic 2: Test (Simple)
Users can access the platform without an account, complete a 12-question personality test with the reverse mechanic (declaring their expected type first), give PDPA consent, and receive a unique shareable result URL — with 24-hour session persistence via Zustand localStorage persist.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR36, FR37, FR40, FR41

### Epic 3: Result (Curated + Light AI)
Users receive a cinematic result reveal with persona name, curated behavioral insight enhanced by Anthropic Claude API (with transparent D1 fallback), "3 Villains", reverse mechanic comparison — with a downloadable 9:16 Stories-format share card and dynamic Open Graph images cached to Cloudflare R2.
**FRs covered:** FR7, FR8, FR9, FR12, FR13, FR14, FR15, FR16

### Epic 4: Social Loop (Core)
Users can invite friends via a zero-friction token-based link, friends vote on the user's behavior and take their own test, and both parties see a gap visualization teaser — with polling-based in-app notifications that bring users back when friends respond.
**FRs covered:** FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR32, FR33, FR42

### Epic 5: Payment & Paid Reports
Users can purchase a Couple/Friend Pack compatibility report as a shared two-person transaction, or unlock the full Gap Report via one-time payment — processed through PayOS (VNPay/MoMo) and Stripe, with no card data stored on platform, completed in under 30 seconds.
**FRs covered:** FR25, FR26, FR27, FR28, FR29

### Epic 6: Content Feed
Users can browse a curated feed of articles relevant to their MBTI type and read full articles within the platform — served via Hono Worker SSR for SEO on public article pages.
**FRs covered:** FR30, FR31

### Epic 7: Admin, Analytics & Compliance
Administrators can manage article content, review AI insight variants, monitor key viral metrics, and respond to infrastructure alerts — while the platform enforces PDPA compliance (D1 soft delete, data deletion pipeline, inactivity purge).
**FRs covered:** FR11, FR34, FR35, FR38, FR39, FR43, FR44, FR45

---

## Epic 1: Project Foundation & Infrastructure

Developer can scaffold, deploy, and run the complete platform — Turborepo monorepo initialized, React SPA on Cloudflare Pages, Hono Workers API, Cloudflare D1 database, KV session store, R2 asset bucket, and CI/CD pipeline all operational.

### Story 1.1: Monorepo Scaffold with Turborepo and pnpm Workspaces

As a developer,
I want a fully configured Turborepo monorepo with pnpm workspaces containing `apps/web`, `apps/api`, and `packages/shared`,
So that I can develop, build, and deploy each app independently with shared task caching and a single `pnpm dev` command.

**Acceptance Criteria:**

**Given** the repo is cloned and `pnpm install` is run
**When** the developer runs `pnpm dev`
**Then** Turborepo starts both `apps/web` (Vite dev server) and `apps/api` (`wrangler dev --local`) in parallel with a single command
**And** `packages/shared` is available as an importable workspace package (`@mbti/shared`) to both apps without any additional build step

**Given** a file changes in `apps/web` only
**When** `pnpm build` is run
**Then** Turborepo only rebuilds `apps/web` and `packages/shared`; `apps/api` build is served from cache

**Given** the monorepo root
**When** `pnpm lint` and `pnpm typecheck` are run
**Then** ESLint and TypeScript strict checks pass across all packages without errors on a clean scaffold

**And** `turbo.json` defines `dev`, `build`, `lint`, `typecheck`, and `test` pipeline tasks; `pnpm-workspace.yaml` declares all three workspaces

---

### Story 1.2: React SPA with Vite and Cloudflare Pages Adapter

As a developer,
I want `apps/web` scaffolded as a React 19 SPA (Vite 6) with the official Cloudflare React template, Tailwind CSS, shadcn/ui, and React Router v7 initialized,
So that the frontend builds for Cloudflare Pages and the design system foundation is ready for feature development.

**Acceptance Criteria:**

**Given** the developer runs `pnpm dev` in the monorepo
**When** they navigate to the `apps/web` local Vite dev server URL
**Then** a placeholder landing page renders with Tailwind styles applied and no console errors

**Given** the developer runs `pnpm build` on `apps/web`
**When** the build completes
**Then** output in `dist/` is Cloudflare Pages-compatible (static assets + optional Worker for SSR-adjacent routes) with no Node.js-only API usage

**Given** `apps/web` with shadcn/ui initialized
**When** the developer adds a shadcn component (`npx shadcn@latest add button`)
**Then** the component installs into `src/components/ui/` and renders correctly with Tailwind styles

**And** the following are committed: `public/manifest.json` (PWA manifest, `display: standalone`, `theme_color: #050507`), `public/fonts/` directory (for Clash Display + Inter), `src/router.tsx` (React Router v7 route definitions), `src/main.tsx` (app entry with provider tree), `@/*` import alias configured in `vite.config.ts`

---

### Story 1.3: Hono v4.12 API Workers with KV Session Auth and Response Envelope

As a developer,
I want `apps/api` scaffolded as a Hono v4.12 app on Cloudflare Workers with KV-backed anonymous session authentication middleware and the standard `{ data, error }` response envelope,
So that all API routes are consistently formatted, user sessions are anonymous-by-default, and the API is ready for feature route implementation.

**Acceptance Criteria:**

**Given** `wrangler dev --local` is running for `apps/api`
**When** the developer calls `GET /api/health`
**Then** the response is `{ "data": { "status": "ok" }, "error": null }` with HTTP 200

**Given** a request with a valid KV session token in `X-Session-Token: {token}` header
**When** processed by the auth middleware (`apps/api/src/middleware/auth.ts`)
**Then** the KV lookup resolves the session data, attaches `userId` to `c.var`, and the route handler proceeds normally

**Given** a request to a protected route with no `X-Session-Token` header (or an invalid/expired token)
**When** processed
**Then** the response is `{ "data": null, "error": { "code": "UNAUTHORIZED", "message": "..." } }` with HTTP 401

**Given** a Zod validation error thrown in any route handler
**When** the global `app.onError` middleware catches it
**Then** the response is `{ "data": null, "error": { "code": "VALIDATION_ERROR", "message": "..." } }` with HTTP 400

**And** `wrangler.toml` declares bindings: `[[d1_databases]]` (`DB`), `[[kv_namespaces]]` (`KV`), `[[r2_buckets]]` (`ASSETS_BUCKET`), and `[[unsafe.bindings]]` for the Rate Limiter; route handlers never call `c.env.DB` or `c.env.KV` directly — only via helpers in `lib/db.ts` and `lib/kv.ts`

---

### Story 1.4: Shared Package with Zod Schemas, D1 Row Interfaces, and Query Key Factories

As a developer,
I want `packages/shared` to export all Zod schemas, D1 TypeScript row interfaces, MBTI constants, and TanStack Query key factories,
So that `apps/web` and `apps/api` share a single source of truth for all contracts without any direct cross-app imports.

**Acceptance Criteria:**

**Given** `packages/shared` is built as a workspace package
**When** `apps/web` imports `import { TestSubmitSchema, MBTI_TYPES, queryKeys } from '@mbti/shared'`
**Then** all three resolve correctly with full TypeScript inference and no build errors

**Given** `packages/shared/src/constants.ts`
**When** imported
**Then** `MBTI_TYPES` is a readonly array of all 16 MBTI type codes, `PERSONA_NAMES` maps each type to its persona name, and `VILLAINS_MAP` maps each type to its 3 friction types with explanation strings

**Given** `packages/shared/src/queryKeys.ts`
**When** imported in `apps/web`
**Then** `queryKeys.testResult(id)`, `queryKeys.socialStatus(userId)`, and `queryKeys.feed(mbtiType)` return typed `as const` tuples

**Given** `packages/shared/src/db/rows.ts`
**When** imported in `apps/api`
**Then** TypeScript interfaces `TestResultRow`, `InviteLinkRow`, `PerceptionVoteRow`, `CuratedInsightRow`, and `ArticleRow` are available with all D1 column types as `string | number | null` — no Supabase or ORM types

**And** initial Zod schemas exist for: `TestSubmitSchema`, `TestResultSchema`, `InviteGenerateSchema`, `PerceptionVoteSchema`, `InsightResponseSchema` — all importable from `@mbti/shared`

---

### Story 1.5: Cloudflare D1 Database Setup with Schema Migrations and Seed Data

As a developer,
I want Cloudflare D1 database created, version-controlled SQL migrations applied, and seed data loaded for local development,
So that the data layer is operational and all user tables, curated insights, and article data exist before feature implementation begins.

**Acceptance Criteria:**

**Given** the developer runs `wrangler d1 execute mbti --local --file=./migrations/0001_initial_schema.sql`
**When** it completes
**Then** tables exist in the local D1 database: `test_results`, `invite_links`, `perception_votes`, `curated_insights`, `articles` — all with `snake_case` column names, `created_at`/`updated_at` as `TEXT` (ISO 8601), and boolean columns prefixed with `is_` or `has_`

**Given** migration `0002_curated_insights.sql` is applied
**When** the developer queries `SELECT COUNT(*) FROM curated_insights WHERE mbti_type = 'INFP'`
**Then** at least one row is returned — `curated_insights` is seeded with at least one insight per MBTI type

**Given** migration `0004_pdpa_soft_delete.sql` is applied
**When** the schema is inspected
**Then** all user-data tables (`test_results`, `invite_links`, `perception_votes`) have a `deleted_at TEXT` column defaulting to `NULL` for PDPA soft-delete support

**Given** `wrangler d1 migrations apply mbti --remote`
**When** run against production D1
**Then** all pending migrations apply without errors and the production schema matches local

**And** `wrangler d1 create mbti` output (database ID) is documented in `wrangler.toml` under the `[[d1_databases]]` binding

---

### Story 1.6: Cloudflare R2, KV Namespaces, and Environment Secrets Configuration

As a developer,
I want Cloudflare R2 bucket, KV namespaces, and all Worker secrets configured for local dev (`.dev.vars`) and production (Wrangler secrets),
So that generated assets (OG images, result cards, reports) can be stored/retrieved and no secrets appear in code or config files.

**Acceptance Criteria:**

**Given** a `.dev.vars` file with local secret values and `wrangler dev --local` running
**When** a route handler calls `c.env.ASSETS_BUCKET.put('test-key', 'value')` via `lib/r2.ts`
**Then** the file is stored in local R2 simulation and retrievable via `lib/r2.ts` get helper without errors

**Given** a route handler calls `await setSession(c.env.KV, token, sessionData)` via `lib/kv.ts`
**When** processed
**Then** the session data is stored in local KV simulation with the 30-day TTL and retrievable via `getSession(c.env.KV, token)`

**Given** production deployment via `wrangler deploy`
**When** the Worker handles a request
**Then** `c.env.ANTHROPIC_API_KEY`, `c.env.PAYOS_API_KEY`, `c.env.STRIPE_SECRET_KEY`, `c.env.STRIPE_WEBHOOK_SECRET`, and `c.env.ADMIN_PASSWORD_HASH` are all available (set via `wrangler secret put`)

**And** `.dev.vars.example` with placeholder values is committed; `.dev.vars` is in `.gitignore` and never committed; `lib/kv.ts` exports typed `getSession`, `setSession`, `deleteSession` helpers that are the only way KV is accessed across the codebase

---

### Story 1.7: CI/CD Pipeline with GitHub Actions

As a developer,
I want a GitHub Actions CI pipeline that enforces lint, typecheck, and Vitest tests on every PR, and deploys both apps to Cloudflare on merge to main,
So that no breaking changes reach production and every PR generates a Cloudflare Pages preview URL.

**Acceptance Criteria:**

**Given** a PR is opened against `main`
**When** `.github/workflows/ci.yml` runs
**Then** `pnpm lint`, `pnpm typecheck`, and `pnpm test` (Vitest) all execute and the PR is blocked from merging if any step fails

**Given** all CI checks pass and the PR is merged to `main`
**When** `.github/workflows/deploy.yml` runs
**Then** `wrangler deploy` deploys `apps/api` to Cloudflare Workers and `wrangler pages deploy dist` deploys `apps/web` to Cloudflare Pages successfully

**Given** a PR is opened
**When** Cloudflare Pages CI integration processes it
**Then** a unique preview URL for `apps/web` is posted to the PR within 5 minutes

**And** `wrangler d1 migrations apply mbti --remote` runs as part of the deploy workflow before the Worker is deployed, ensuring schema is always up-to-date before code

---

## Epic 2: Test (Simple)

Users can access the platform without an account, complete a 12-question personality test with the reverse mechanic, give PDPA consent, and receive a unique shareable result URL — with 24-hour session persistence.

### Story 2.1: Landing Page & Anonymous User Session

As a visitor arriving from a social share link,
I want to see the product hook immediately and be assigned an anonymous session without any sign-up,
So that I can start the test with zero friction in under 2 clicks.

**Acceptance Criteria:**

**Given** a visitor opens the platform URL
**When** the landing page loads (SSR via `apps/api/src/routes/ssr.ts` Hono Worker route)
**Then** it renders within LCP ≤3s on mobile 4G with the following copy hierarchy — no navigation menu, no sign-up wall, no onboarding modal:
- Social proof ticker (13px, slate-500, subtle pulse): *"Hơn 12,000 người tại Việt Nam đã làm bài này tuần này"*
- Headline (64px Clash Display): *"Bạn bè bạn đang so sánh kiểu tính cách với nhau. Bạn chưa có kết quả."*
- Subtext (16px Inter, slate-400): *"Không phải trắc nghiệm. Không có kiểu người đúng hay sai. Chỉ có một tấm gương — chính xác đến mức khó chịu."*
- Primary CTA (indigo `#6366F1`, full-width): *"Xem tôi thuộc kiểu người nào →"*
- Micro-copy below CTA (13px, slate-500): *"Miễn phí · Không cần đăng ký · Kết quả ngay"*

**Given** the visitor's first visit (no session token in `localStorage`)
**When** the React SPA initializes via `SessionProvider`
**Then** `POST /api/sessions/init` is called, the server generates a UUID session token, stores it in KV with 30-day TTL, and returns the token; the token is then stored in `localStorage` under key `mbti-session-token`
**And** subsequent page loads read the token from `localStorage` and attach it as `X-Session-Token` header on all API requests — no re-initialization occurs

**Given** the visitor taps "Xem tôi thuộc kiểu người nào →"
**When** the navigation occurs
**Then** React Router navigates directly to `/consent` with no intermediate page

---

### Story 2.2: Consent Gate, Privacy Policy, Age Gate & AI Disclaimer

As a visitor about to take the test,
I want to see a clear, friendly consent screen before I begin,
So that I can make an informed choice about data collection without feeling tracked or blocked.

**Acceptance Criteria:**

**Given** the visitor reaches the `/consent` screen
**When** it renders
**Then** it shows: (1) one-line AI disclaimer ("Đây là công cụ tự phản chiếu — không phải đánh giá lâm sàng"), (2) 18+ age confirmation checkbox, (3) PDPA consent checkbox with a privacy policy link, (4) "Bắt đầu" primary CTA disabled (`aria-disabled="true"`) until both checkboxes are checked

**Given** the visitor attempts to proceed without checking both checkboxes
**When** they tap "Bắt đầu"
**Then** the button remains `aria-disabled="true"` and inline red text appears directly below the unchecked checkbox — no toast, no modal

**Given** the visitor taps the privacy policy link
**When** activated
**Then** the privacy policy opens in a new browser tab without leaving the consent screen

**Given** both checkboxes are checked and "Bắt đầu" is tapped
**When** processed
**Then** `PATCH /api/sessions/consent` is called (session token in header) recording consent in the D1 `test_results` row, and the user is navigated to `/declare` (TypeSelector)

---

### Story 2.3: Reverse Mechanic — Declare Expected MBTI Type

As a user about to take the test,
I want to declare which MBTI type I think I am before seeing any questions — even if I don't know MBTI well,
So that I feel personally invested and the platform can reveal whether my self-perception was accurate.

**Acceptance Criteria:**

**Given** the user reaches `/declare`
**When** the `TypeSelector` component renders in Phase 1
**Then** it shows headline *"Trước khi bắt đầu — bạn hay bị nhận xét là người như thế nào?"* (22px Inter) and 4 full-width group cards, each displaying: Vietnamese group name, group descriptor, and type codes; below all cards a Ghost-tier link *"Tôi không chắc — bỏ qua bước này →"* is always visible without scrolling

**Given** the user taps a group card (e.g., "Người đồng cảm")
**When** the tap registers
**Then** a slide-right transition renders Phase 2: a 2×2 grid of 4 type cards for that group, each showing type code (type-specific accent color), Vietnamese type name (16px bold), a horizontal rule, and a 1-line recognition phrase (13px, slate-400); a back arrow (`←`) in the header returns to Phase 1

**Given** the user taps a type card in Phase 2
**When** the selection registers
**Then** the selected card's border highlights with its type-specific accent within 150ms, others dim to 40% opacity; a scale pulse animation fires (300ms); `declaredType` is stored in Zustand `useTestStore` (persist middleware, `name: 'mbti-test-progress'`); user navigates to `/test`

**Given** the user taps *"Tôi không chắc — bỏ qua bước này →"*
**When** the action fires
**Then** `declaredType: null` is stored in Zustand `useTestStore` and the user navigates directly to `/test` — no Phase 2 is shown; on the result page the `ReverseReveal` component is hidden when `declaredType === null`

**And** all 16 type selections are accepted without validation — there is no "correct" expected type

---

### Story 2.4: Test Question Flow with 12 Questions and Earned Pause

As a user taking the MBTI test,
I want to answer 12 situational questions one at a time with instant visual feedback and smooth card transitions,
So that the test feels like a natural conversation completed in under 5 minutes.

**Acceptance Criteria:**

**Given** the user enters the `/test` flow
**When** Question 1 renders via `QuestionCard`
**Then** the full screen shows: a 12-dot progress indicator (not a percentage bar), question text (≥20px Inter bold, light `#F8F9FC` background), and 2–4 tappable answer option cards — no header nav, no back button

**Given** the user taps an answer option
**When** the tap registers
**Then** the selected option's border highlights within 150ms with the `cta-primary` indigo accent, then the `QuestionCard` auto-advances after a 300ms delay with a Framer Motion slide-left/slide-right transition — no "Next" button required

**Given** the Zustand `useTestStore` with `persist` middleware (localStorage key: `'mbti-test-progress'`)
**When** the user closes the browser mid-test and returns within 24 hours
**Then** the test resumes from the last answered question with all previous answers preserved (NFR18)

**Given** the user answers Question 12
**When** the final answer is stored in Zustand
**Then** `EarnedPauseTransition` renders for exactly 1200ms — full-screen near-black (`#0D0F1A`) with a particle coalescing Framer Motion animation, no text, no spinner, no skip control

**And** the CAT engine (`apps/api/src/lib/cat.ts`) selects each question to maximize information on the most uncertain MBTI dimension based on prior answers; questions are fetched from D1 `questions` table via `getNextQuestion(db, answers)` helper in `lib/cat.ts`

---

### Story 2.5: Test Submission, MBTI Type Calculation & Shareable Result URL

As a user who has completed all 12 questions,
I want my responses submitted and a unique result URL created instantly,
So that I can access and share my result without any login.

**Acceptance Criteria:**

**Given** the `EarnedPauseTransition` completes its 1200ms animation
**When** the animation ends
**Then** `POST /api/tests/submit` is called automatically with the answers array and declared type from Zustand; the `X-Session-Token` header is attached by the API client

**Given** the API receives a valid test submission
**When** processed in `apps/api/src/routes/tests.ts`
**Then** the MBTI type is calculated from 12 responses via `lib/cat.ts`, a UUID `result_id` is generated, and a `test_results` row is inserted in D1 via `createTestResult(db, { userId, mbtiType, declaredType, answers, resultId })` in `lib/db.ts` — no raw `c.env.DB` calls in the route handler

**Given** the API responds with `{ data: { resultId, mbtiType }, error: null }`
**When** the React client receives it
**Then** the user is navigated to `/result/{resultId}` and the Zustand test store is cleared (`reset()`)

**Given** any user visits `/result/{resultId}` directly with no session token (fresh browser, different device)
**When** the page loads
**Then** result data loads via `GET /api/tests/{resultId}` (public route, no auth middleware) and displays correctly — no login prompt, no redirect (FR16)

---

## Epic 3: Result (Curated + Light AI)

Users receive a cinematic result reveal with persona name, curated behavioral insight enhanced by Anthropic Claude API (with transparent D1 fallback), "3 Villains", reverse mechanic comparison, a downloadable 9:16 share card, and dynamic OG images cached to Cloudflare R2.

### Story 3.1: Curated Insight System, Persona Names & Villains

As a user who has just completed the test,
I want to receive a persona name, a behavioral insight, and a list of 3 conflict types specific to my MBTI type,
So that I experience a result that feels substantive and personally meaningful before AI enhancement is applied.

**Acceptance Criteria:**

**Given** a `test_results` D1 row with a calculated `mbti_type`
**When** the result page loads and calls `GET /api/results/{resultId}/insight`
**Then** the response includes `personaName` (from `PERSONA_NAMES` constant in `@mbti/shared`), `insight` (from `curated_insights` D1 table via `getCuratedInsight(db, mbtiType)` in `lib/db.ts`), and `villains` (from `VILLAINS_MAP` constant in `@mbti/shared`) — all in `{ data: {...}, error: null }` envelope

**Given** the `curated_insights` D1 table seeded via `migrations/0002_curated_insights.sql`
**When** `getCuratedInsight(db, mbtiType)` is called for any of the 16 MBTI types
**Then** at least one row is returned with `mbti_type`, `content` (behavioral description string), `source: 'curated'`

**Given** the `PERSONA_NAMES` and `VILLAINS_MAP` constants in `packages/shared/src/constants.ts`
**When** imported in the API route
**Then** every MBTI type maps to exactly one persona name string and exactly three villain type codes with explanation strings

**And** if `curated_insights` has no row for a type (edge case), the API returns a safe default insight string rather than a 500 error — the route handler throws a fallback, not raw null access

---

### Story 3.2: Light AI Insight Enhancement with Transparent D1 Fallback

As a user viewing my result,
I want the behavioral insight to feel specific to my actual responses — not just my type label,
So that the "uncomfortably accurate" delight moment is achieved, while the platform degrades gracefully if AI is unavailable.

**Acceptance Criteria:**

**Given** `POST /api/insights/generate` is called with `{ resultId, mbtiType, declaredType, answers }`
**When** the Anthropic Claude API (`claude-sonnet-4-6`) responds within 2500ms
**Then** the response includes an AI-generated insight referencing behavioral patterns from the user's specific answers, returned as `{ data: { content, source: 'ai' }, error: null }`

**Given** the Anthropic API call exceeds 2500ms or throws any error
**When** the `Promise.race` timeout fires in `apps/api/src/lib/ai.ts`
**Then** the system immediately falls back to `getCuratedInsight(db, mbtiType)` from D1 — same response shape `{ data: { content, source: 'curated' }, error: null }` — with no user-visible failure (NFR17)

**Given** the insight is served (AI or curated)
**When** the result page renders
**Then** a subtle "AI-generated for self-reflection" `Badge` component appears when `source === 'ai'`; no badge when `source === 'curated'` — difference is transparent, not prominent

**And** total time from test submission to insight rendered on result page is ≤3 seconds (NFR3) on both AI and curated paths; PostHog captures `insight_served` with `{ source: 'ai' | 'curated', mbtiType }` for monitoring fallback rate

---

### Story 3.3: Result Page — Mirror Reveal Experience

As a user arriving at my result page,
I want to experience a cinematic reveal sequence — persona name first, then insight, then type code, then the full result — with the reverse mechanic comparison visible,
So that I pause and absorb the result rather than skim it, triggering the share impulse.

**Acceptance Criteria:**

**Given** the user arrives at `/result/{resultId}`
**When** result data loads and the `ResultCard` reveal sequence starts
**Then** Beat 1 (0ms delay, 600ms Framer Motion fade-in): persona name in Clash Display 64px, type-specific color radial glow from top-right
**And** Beat 2 (800ms delay, 400ms slide-up + fade): behavioral insight at 16px Inter, slate-400 color
**And** Beat 3 (1400ms delay, 300ms fade): 4-letter type code at 14px in secondary muted color with a horizontal rule in type-specific accent
**And** Beat 4 (2000ms delay): scroll chevron pulses indicating more content below

**Given** the user scrolls below Beat 4
**When** the full result content is revealed
**Then** the "3 Villains" section displays three villain types with friction explanations, and `ReverseReveal` shows declared type vs. calculated type side-by-side (FR13); if declared === calculated, copy celebrates confirmation; if different, copy frames it as discovery

**Given** `prefers-reduced-motion` is active in the OS
**When** the result page loads
**Then** `useReducedMotion()` from Framer Motion returns `true`; all beats render immediately with no delays; full result content is visible at once; `EarnedPauseTransition` still waits 1200ms but shows plain dark screen + glow only (no particle animation)

**And** all result text is present in the DOM from initial render regardless of animation state — screen readers receive the full content immediately via the in-DOM text block with `aria-live="polite"` announcing when each beat completes

---

### Story 3.4: Share Card Generation & OG Image for Social Previews

As a user viewing my result,
I want to share a beautiful 9:16 card to Instagram/Zalo Stories and have my result URL generate a rich social preview,
So that my share draws others to the platform and the viral loop begins.

**Acceptance Criteria:**

**Given** the user taps the "Chia sẻ" (Share) button on the result page
**When** tapped
**Then** the `ShareCard` (1080×1920px, near-black + type-specific glow, persona name dominant, 1-line insight teaser, social hook text "3 types most likely to clash with me →") is available within 5 seconds (NFR4)
**And** `navigator.share({ files: [cardFile] })` is called if `navigator.canShare({ files: [cardFile] })` returns true; otherwise the card is downloaded as `mbti-{type}-result.png`

**Given** the `ShareCard` component begins rendering (via `html-to-image`) when the user scrolls past Beat 3
**When** the user taps "Chia sẻ"
**Then** the card is already pre-rendered in the background — no additional generation wait after tapping

**Given** a result URL is shared on Instagram, Facebook, Zalo, or TikTok
**When** the platform's crawler fetches the URL's OG metadata
**Then** `GET /api/og/{resultId}` is called on the Hono Worker; Satori + resvg-wasm generates an OG image within 3 seconds (NFR5); the image is cached to Cloudflare R2 at `r2://og/{resultId}.png` after first generation; subsequent fetches are served directly from R2 (NFR21)

**And** the OG image includes: persona name (dominant text), MBTI 4-letter code, platform name, and type-specific background gradient; OG `<meta>` tags on the result page point to `https://api-domain/api/og/{resultId}`

---

## Epic 4: Social Loop (Core)

Users can invite friends via a zero-friction token-based link, friends vote on the user's behavior and take their own test, both parties see a gap visualization teaser, and users receive named in-app notifications via polling when friends respond.

### Story 4.1: Invite Link Generation & "Test Your Friends" CTA

As a user viewing my result,
I want to generate a one-tap invite link pre-loaded with my profile,
So that I can share it on Zalo or Instagram DM and my friend sees my type before answering questions about me.

**Acceptance Criteria:**

**Given** the user is on the result page and scrolls past the share card section
**When** the "Test Your Friends" CTA is visible
**Then** it renders below the share action with copy "Xem bạn bè thấy bạn thế nào →" as a Ghost/Text tier button

**Given** the user taps "Test Your Friends"
**When** processed
**Then** `POST /api/invites/generate` is called (session token in header); `generateInviteLink(db, { userId, resultId })` in `lib/db.ts` creates an `invite_links` D1 row with UUID token, `user_id`, `result_id`, `expired_at` = ISO 8601 string 30 days from now, `has_completed: 0` (NFR9)
**And** response is `{ data: { inviteUrl: 'https://.../invite/{token}' }, error: null }`

**Given** the invite URL is generated
**When** displayed to the user
**Then** a Shadcn `Sheet` (bottom sheet) opens with the invite URL pre-populated, a "Copy Link" button (copies to clipboard + success Sonner toast "Đã sao chép link!"), and direct share options (Zalo, Instagram DM) via `navigator.share()`

---

### Story 4.2: Invitee Perception Voting Flow

As a friend who received an invite link,
I want to answer 3 behavioral questions about the person who sent me the link — without creating an account — and then take my own test,
So that they can see how I perceive them compared to how they perceive themselves.

**Acceptance Criteria:**

**Given** a friend opens `/invite/{token}`
**When** the page loads
**Then** `GET /api/invites/{token}` is called (no auth required — invite token IS the credential); `getInviteLink(db, token)` in `lib/db.ts` checks `expired_at > datetime('now')` — if expired or not found, the page shows "Link này đã hết hạn" with no other action; if valid, the sender's persona name and MBTI type are shown immediately

**Given** the token is valid and the invitee sees the invite landing screen
**When** they proceed (after `ConsentGate` + `AiDisclaimer`)
**Then** 3 behavioral questions about the sender render one-at-a-time via the same `QuestionCard` component (adapted prompt text: "Người này thường..." instead of "Bạn thường..."), with no account or sign-up required from the invitee

**Given** the invitee answers all 3 perception questions
**When** they tap "Gửi"
**Then** `POST /api/social/vote` is called with `{ inviteToken, voteAnswers }` (no session token required — invite token in request body); `createPerceptionVote(db, { inviteToken, voteAnswers })` inserts a `perception_votes` D1 row; the invitee is redirected to `/test?inviteSource={token}` to take their own full 12-question test

**And** during the invitee's test flow at `/test?inviteSource={token}`, the `inviteSource` query param is stored in Zustand `useTestStore` so that on test submission the `inviteSource` token is sent to `POST /api/tests/submit`, linking the invitee's `test_results` row to the inviter's social graph

---

### Story 4.3: Gap Visualization Teaser & Loop Status

As a user who sent invite links,
I want to see who has voted and a teaser of how they perceive me versus how I perceive myself,
So that I'm curious enough to invite more friends or eventually unlock the full report.

**Acceptance Criteria:**

**Given** the user returns to `/result/{resultId}` or navigates to `/compare/{userId}`
**When** at least one friend has submitted a perception vote
**Then** the `GapVisualization` component renders in `teaser` state: left panel ("Bạn thấy bạn") shows 3 self-description behavioral tags (visible), right panel ("Người thân thấy bạn") shows friend-perceived tags blurred with a lock icon overlay and "Mở khóa" CTA

**Given** the `LoopStatus` component renders
**When** N friends have responded
**Then** it shows "N/3 người đã vote" in near-win framing (not "X người còn lại"), a thin type-accent progress bar, friend avatar initials row (initial + type color), and two always-visible CTAs: "Mời thêm người" (free path, secondary button) and "Mở khóa ngay" (paid path, primary button wired to Epic 5 paywall)

**Given** `useSocialStatus` TanStack Query hook with `queryKey: queryKeys.socialStatus(userId)`, `queryFn: () => fetchSocialStatus(userId)`, `refetchInterval: 3 * 60 * 1000`, `refetchOnWindowFocus: true`
**When** a friend completes a vote while the user has the app open
**Then** within 3 minutes the `LoopStatus` count updates automatically without a full page reload

**And** `LoopStatus` progress region has `aria-label="N of 3 friends have responded"` (updated dynamically via `aria-live="polite"`)

---

### Story 4.4: Social Return Notifications (Polling-Based In-App)

As a user who sent invite links and left the platform,
I want to see a named in-app notification when I return that tells me a specific friend voted,
So that I'm pulled back by genuine social curiosity — not a generic reminder.

**Acceptance Criteria:**

**Given** the user returns to the platform (any page) after a friend has voted since their last session
**When** `useSocialStatus` `refetchOnWindowFocus` fires on window focus
**Then** `GET /api/social/status/{userId}` returns `{ data: { voterCount, newVotesSinceLastVisit: true, latestVoterName: 'Minh' }, error: null }`; a Sonner info toast appears: "Minh vừa vote về cách bạn hành xử — xem ngay" with a "Xem" action button

**Given** the user taps the "Xem" action in the toast
**When** navigated
**Then** React Router navigates directly to `/compare/{userId}` (Gap Status screen) — not to the landing page or content feed (UX-DR12)

**Given** FR42 analytics requirement
**When** a friend completes a vote and the notification is shown
**Then** PostHog captures `social_notification_shown` with `{ resultId, voterCount }` (server-side from `POST /api/social/vote` handler)
**And** PostHog captures `social_notification_tapped` with `{ resultId }` (client-side when toast action is tapped)

**And** browser push notifications are NOT implemented — all notifications are in-app polling only; no `Notification.requestPermission()` call occurs anywhere in the codebase (explicitly out of MVP scope per PRD)

---

## Epic 5: Payment & Paid Reports

Users can purchase a Couple/Friend Pack compatibility report or unlock the full Gap Report — processed through PayOS (VNPay/MoMo) and Stripe, with no card data stored on platform.

### Story 5.1: Payment Gateway Integration (PayOS + Stripe)

As a developer,
I want PayOS (VNPay/MoMo) as the primary Vietnam payment gateway and Stripe for international cards integrated in `apps/api/src/lib/payment.ts`,
So that payment processing is PCI DSS-compliant, no card data is stored on the platform, and webhook-based confirmation is reliable.

**Acceptance Criteria:**

**Given** `apps/api/src/lib/payment.ts` with a gateway-agnostic interface
**When** `POST /api/payments/checkout` is called (session token required) with `{ productType: 'couple_pack' | 'gap_report', resultId }`
**Then** the API creates a checkout session with PayOS (primary for VNPay/MoMo) or Stripe (international cards) and returns `{ data: { checkoutUrl }, error: null }`; no card data is collected or stored by the Worker

**Given** the user completes payment on the PayOS/Stripe hosted checkout page
**When** the payment provider sends a webhook to `POST /api/payments/webhook`
**Then** the webhook signature is validated (PayOS HMAC checksum via `PAYOS_CHECKSUM_KEY`, or Stripe signature via `STRIPE_WEBHOOK_SECRET`); a `payments` D1 row is inserted via `lib/db.ts` (`user_id`, `product_type`, `amount`, `status: 'completed'`); report generation is triggered

**Given** a webhook arrives with an invalid signature
**When** processed
**Then** the request is rejected with HTTP 400 and `{ data: null, error: { code: 'INVALID_WEBHOOK_SIGNATURE', message: '...' } }` — no D1 writes occur (NFR8)

**And** Worker secrets `PAYOS_API_KEY`, `PAYOS_CLIENT_ID`, `PAYOS_CHECKSUM_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` are available via `c.env.*` (set via `wrangler secret put`), never in code or `wrangler.toml`

---

### Story 5.2: Couple/Friend Pack Purchase & Compatibility Report

As a user who wants to see a full compatibility report with a friend or partner,
I want to purchase the Couple/Friend Pack as a shared two-person transaction and both receive the report via a shared link,
So that we can read our compatibility breakdown without either person needing to re-authenticate.

**Acceptance Criteria:**

**Given** the user is on the result page or gap visualization screen
**When** they tap "Mua Couple Pack"
**Then** the `CouplePack` Shadcn `Dialog` renders showing: two-person purchase framing, price (79,000đ), and "Thanh toán" primary CTA that calls `POST /api/payments/checkout` with `{ productType: 'couple_pack', resultId }` and opens the returned `checkoutUrl`

**Given** the payment webhook confirms `product_type: 'couple_pack'`
**When** `generateCompatibilityReport(db, r2, { inviterResultId, inviteeResultId })` in `lib/payment.ts` is called
**Then** a compatibility report is generated for the two linked `test_results` rows (inviter + invitee via `invite_links` join) and stored in Cloudflare R2 at `r2://reports/{reportId}.json`; a `reports` D1 row is created with `report_id`, `inviter_user_id`, `invitee_user_id`, `r2_key`

**Given** the report is generated
**When** both users (inviter or invitee) access `/report/{reportId}` via the shared link
**Then** `GET /api/reports/{reportId}` returns report data without any session token requirement (FR27); the `CompatibilityReport` component renders the full compatibility breakdown

**And** PostHog captures `payment_completed` with `{ productType: 'couple_pack', amount: 79000 }` server-side from the webhook handler

---

### Story 5.3: Gap Report Paywall & Unlock

As a user who has seen the gap teaser and wants to see what friends actually said about me,
I want to unlock the full Gap Report with a one-time payment,
So that I can see the complete self vs. social perception comparison at the peak of my curiosity.

**Acceptance Criteria:**

**Given** the user is viewing `GapVisualization` in `teaser` state
**When** they tap "Mở khóa ngay"
**Then** the `GapReportUnlock` paywall overlay renders directly over the blurred right panel — price (49,000đ) and "Thanh toán" CTA visible; the teaser content remains visible behind; no modal interrupts flow

**Given** payment webhook confirms `product_type: 'gap_report'`
**When** processed in the webhook handler
**Then** `updatePaymentStatus(db, { userId, productType: 'gap_report', status: 'completed' })` in `lib/db.ts` updates the `payments` table; `GET /api/social/status/{userId}` now returns `{ hasUnlockedGapReport: true }` in its response

**Given** `hasUnlockedGapReport: true` is returned by `useSocialStatus`
**When** `GapVisualization` re-renders
**Then** it transitions from `teaser` state to `unlocked` state — right panel blur removed, all friend-perceived behavioral tags visible, swipe between panels available

**Given** the user refreshes the page after unlocking
**When** `GET /api/social/status/{userId}` is called
**Then** `hasUnlockedGapReport: true` is returned and `GapVisualization` renders in `unlocked` state immediately — no re-purchase required

---

## Epic 6: Content Feed

Users can browse a curated feed of articles relevant to their MBTI type and read full articles within the platform — with article pages SSR-rendered by the Hono Worker for SEO.

### Story 6.1: Per-Type Article Feed

As a user who has received my result,
I want to browse a feed of articles curated for my MBTI type,
So that I can explore type-specific content that deepens my understanding and gives me reasons to return.

**Acceptance Criteria:**

**Given** the user is on their result page and scrolls past the social loop CTAs
**When** the content feed section renders
**Then** `GET /api/content/feed/{mbtiType}` is called (public, no auth) via `getArticlesByType(db, mbtiType)` in `lib/db.ts`; response includes a list of articles, each with `title`, `slug`, `summary`, `readTimeMinutes`, `mbtiType`

**Given** the articles list renders in the `ArticleFeed` component
**When** displayed
**Then** `ArticleCard` components show: article title, 1-line summary, read time badge, and a type-specific accent color tag — 1-column list on mobile, 2-column grid on `md:` and above (max-width 960px)

**Given** the `/feed` page is accessed directly (e.g., user bookmarks it)
**When** the user's MBTI type is known (from `localStorage` or URL query param `?type=INFP`)
**Then** the feed filters to that type's articles automatically; if type is unknown, a compact type-selector grid is shown before the feed

**And** article list pages (`GET /api/content/feed/:mbtiType`) are served as SSR HTML via `apps/api/src/routes/ssr.ts` for SEO with full `<meta>` tags; LCP ≤3s on mobile 4G (NFR1)

---

### Story 6.2: Full Article Reader

As a user who tapped an article card,
I want to read the full article within the platform without leaving to an external site,
So that I stay engaged with the platform and can easily return to my result or feed.

**Acceptance Criteria:**

**Given** the user taps an `ArticleCard`
**When** navigated to `/feed/{slug}`
**Then** `GET /api/content/articles/{slug}` returns full article content via `getArticleBySlug(db, slug)` in `lib/db.ts`; the `ArticleContent` component renders: `<h1>` title, body text (≥16px Inter, 1.6 line-height for Vietnamese diacritics), estimated read time, and MBTI type tag

**Given** the user is reading an article
**When** they tap the back button (`←` top-left header)
**Then** React Router navigates back to the content feed (`/feed`), not to the landing page

**Given** an article URL is shared on social media
**When** the platform's crawler fetches OG metadata
**Then** the article page is SSR-rendered via `apps/api/src/routes/ssr.ts` with article-specific `<title>` and `<meta name="description">` tags — no dynamic image generation needed (static OG sufficient for articles)

---

## Epic 7: Admin, Analytics & Compliance

Administrators can manage content, review AI insights, monitor metrics, and ensure PDPA compliance via D1 soft delete and data deletion pipeline.

### Story 7.1: Admin Authentication & Dashboard Shell

As an administrator,
I want to log in with a username/password (separate from user session tokens) and access a protected dashboard,
So that I can monitor platform health and access all admin capabilities without any overlap with the public user flow.

**Acceptance Criteria:**

**Given** an admin navigates to `/admin` in the React SPA
**When** they have no valid admin session token in `localStorage`
**Then** the React Router admin route guard redirects them to `/admin/login` — anonymous user session tokens grant no access whatsoever (NFR10)

**Given** the admin submits their credentials on `/admin/login`
**When** `POST /api/admin/login` is called with `{ username, password }`
**Then** the Hono route runs `bcrypt.compare(password, c.env.ADMIN_PASSWORD_HASH)`; on success, a UUID admin session token is stored in KV with 24h TTL and returned as `{ data: { adminToken }, error: null }`; the React client stores `adminToken` in `localStorage` separately from the user session token

**Given** the admin is logged in and navigates to `/admin`
**When** the dashboard renders
**Then** metric tiles display: test completion rate (total), 7-day share rate, total completed tests, and active invite links count — all fetched from `GET /api/admin/metrics` with `X-Admin-Token` header validated by Hono admin auth middleware

**And** all `GET/POST/PATCH /api/admin/*` routes validate `X-Admin-Token` via KV lookup in `middleware/auth.ts`; invalid or missing token returns `{ data: null, error: { code: 'FORBIDDEN' } }` with HTTP 403 to all non-admin requests

---

### Story 7.2: Content Management — Article CRUD & Threshold Alerts

As an administrator,
I want to create, edit, publish, and manage articles assigned to specific MBTI types, with alerts when any type falls below the minimum threshold,
So that the content feed always has adequate content for all 16 types.

**Acceptance Criteria:**

**Given** the admin is on `/admin/content`
**When** the page renders
**Then** `GET /api/admin/articles` (admin token required) returns all articles; `ArticleEditor` list shows each article's title, type tag, publish status, and edit/delete actions; types with fewer than 3 articles are highlighted with an amber warning badge (FR35)

**Given** the admin taps "New Article" and fills in title, body, MBTI type, and slug
**When** they tap "Publish"
**Then** `POST /api/admin/articles` (admin token required) calls `createArticle(db, { title, body, mbtiType, slug, status: 'published' })` in `lib/db.ts`; the article is immediately returned by `GET /api/content/feed/{mbtiType}` on the next request — no redeploy required

**Given** the admin edits an existing article and saves
**When** `PATCH /api/admin/articles/{id}` is called
**Then** `updateArticle(db, id, { title, body, mbtiType })` in `lib/db.ts` updates the D1 row via a prepared statement; the updated content appears in the public feed on the next fetch

**And** `GET /api/admin/metrics` response includes `articleCountPerType`: an object mapping all 16 type codes to their current article count, enabling the threshold alert UI in `ThresholdAlerts.tsx`

---

### Story 7.3: AI Insight Review & Approval

As an administrator,
I want to review AI-generated insight variants and curated insights before they are served to users,
So that no low-quality or inaccurate insight reaches the "uncomfortably accurate" delight moment.

**Acceptance Criteria:**

**Given** the admin is on `/admin/insights`
**When** the page renders
**Then** `GET /api/admin/insights` (admin token required) returns all `curated_insights` D1 rows grouped by `mbti_type`, each showing `content`, `source` (`ai` | `curated`), and `status` (`pending` | `approved` | `rejected`)

**Given** the admin reviews an insight and taps "Approve"
**When** `PATCH /api/admin/insights/{id}` is called with `{ status: 'approved' }`
**Then** `updateInsightStatus(db, id, 'approved')` in `lib/db.ts` updates the `curated_insights` row; the insight is now eligible to be served by `getCuratedInsight(db, mbtiType)` (which filters `WHERE status = 'approved'`)

**Given** the admin taps "Reject" on a low-quality AI insight
**When** `PATCH /api/admin/insights/{id}` is called with `{ status: 'rejected' }`
**Then** the insight is marked `status: 'rejected'` in D1 and excluded from the serving pool — the next approved curated insight for that type serves instead

**And** admins can edit the `content` of any curated insight inline via `PATCH /api/admin/insights/{id}` with `{ content: '...' }` — `updateInsightContent(db, id, content)` in `lib/db.ts` uses a prepared statement; no string interpolation in SQL

---

### Story 7.4: Analytics Event Capture & PDPA Compliance Pipeline

As an administrator and as a user who wants to delete my data,
I want the platform to capture all required analytics events and process data deletion requests within 30 days,
So that product decisions are data-driven and user privacy rights are respected (NFR11, NFR20).

**Acceptance Criteria:**

**Given** a user completes a test and the result page loads
**When** `POST /api/tests/submit` processes the submission
**Then** PostHog captures `test_completed` server-side with `{ resultType: mbtiType, questionCount: 12, declaredType }` — event name is `snake_case`, properties are `camelCase` (NFR20: PostHog `capture()` schema-free, no redeploy needed for new events)

**Given** a user taps the share button
**When** the Web Share API is invoked or the download fallback fires
**Then** PostHog captures `result_shared` client-side with `{ shareChannel: 'instagram' | 'zalo' | 'copy_link' | 'download', resultId }`

**Given** the admin is on `/admin/analytics`
**When** the page renders
**Then** variant comparison data from PostHog (via `GET /api/admin/analytics`) is displayed — share rate grouped by result card variant and insight source (`ai` vs `curated`) (FR44)

**Given** a user submits a data deletion request via `DELETE /api/privacy/delete-me` (with their `X-Session-Token` header)
**When** processed in `apps/api/src/routes/privacy.ts`
**Then** `softDeleteUserData(db, userId)` in `lib/db.ts` sets `deleted_at = datetime('now')` on all rows in `test_results`, `invite_links`, and `perception_votes` where `user_id = ?` (prepared statement); `deleteSession(kv, sessionToken)` removes the KV session; response is `{ data: { deleted: true }, error: null }` — total processing within the same request, well within 30-day PDPA requirement (NFR11)

**And** `POST /api/privacy/purge` (admin token required, scheduled via Cloudflare Cron Trigger) runs `purgeInactiveUsers(db)` in `lib/db.ts` which hard-deletes rows where `deleted_at IS NOT NULL AND deleted_at < datetime('now', '-30 days')` — enforcing PDPA inactivity purge (FR39)
