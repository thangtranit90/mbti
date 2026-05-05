# Story 2.1: Landing Page & Anonymous User Session

Status: done

## Story

As a visitor arriving from a social share link,
I want to see the product hook immediately and be assigned an anonymous session without any sign-up,
so that I can start the test with zero friction in under 2 clicks.

## Acceptance Criteria

1. **Given** a visitor opens the platform URL — **When** the landing page loads (SSR via `apps/api/src/routes/ssr.ts` Hono Worker route) — **Then** it renders within LCP ≤3s on mobile 4G with the following copy hierarchy — no navigation menu, no sign-up wall, no onboarding modal:
   - Social proof ticker (13px Inter, `slate-500`, subtle pulse): *"Hơn 12,000 người tại Việt Nam đã làm bài này tuần này"*
   - Headline (64px Clash Display, white, 3 lines): *"Bạn bè bạn đang so sánh kiểu tính cách với nhau. Bạn chưa có kết quả."*
   - Subtext (16px Inter, `slate-400`): *"Không phải trắc nghiệm. Không có kiểu người đúng hay sai. Chỉ có một tấm gương — chính xác đến mức khó chịu."*
   - Primary CTA (indigo `#6366F1`, full-width, 48px min-height): *"Xem tôi thuộc kiểu người nào →"*
   - Micro-copy below CTA (13px Inter, `slate-500`): *"Miễn phí · Không cần đăng ký · Kết quả ngay"*

2. **Given** the visitor's first visit (no session token in `localStorage`) — **When** the React SPA initializes via `SessionProvider` — **Then** `POST /api/sessions/init` is called, the server generates a UUID session token, stores it in KV with 30-day TTL, and returns the token; the token is stored in `localStorage` under key `mbti-session-token` — **And** subsequent page loads read the token from `localStorage` and attach it as `X-Session-Token` header on all API requests — no re-initialization occurs.

3. **Given** a returning visitor with a valid token in `localStorage` — **When** `SessionProvider` initializes — **Then** no `POST /api/sessions/init` call is made; the existing token is read and used.

4. **Given** the visitor taps "Xem tôi thuộc kiểu người nào →" — **When** the navigation occurs — **Then** React Router navigates directly to `/consent` with no intermediate page.

## Tasks / Subtasks

- [x] Task 1: Shared session schema (AC: 2)
  - [x] 1.1 Create `packages/shared/src/schemas/session.ts` — `SessionInitResponseSchema`
  - [x] 1.2 Export from `packages/shared/src/index.ts`

- [x] Task 2: API — session init endpoint (AC: 2, 3)
  - [x] 2.1 Create `apps/api/src/routes/sessions.ts` — `POST /api/sessions/init`
  - [x] 2.2 Mount sessions route in `apps/api/src/index.ts`
  - [x] 2.3 Write vitest test `apps/api/tests/routes/sessions.test.ts`

- [x] Task 3: API — SSR landing page route (AC: 1)
  - [x] 3.1 Create `apps/api/src/routes/ssr.ts` — `GET /` returns HTML with inline landing copy + SPA bundle ref
  - [x] 3.2 Mount ssr route in `apps/api/src/index.ts` (before the catch-all error handler)

- [x] Task 4: Frontend — session management layer (AC: 2, 3)
  - [x] 4.1 Create `apps/web/src/lib/session.ts` — `getSessionToken()`, `setSessionToken()`, `SESSION_KEY` constant
  - [x] 4.2 Create `apps/web/src/lib/api.ts` — typed fetch wrapper that injects `X-Session-Token` header
  - [x] 4.3 Create `apps/web/src/components/providers/QueryProvider.tsx` — TanStack Query client wrapper
  - [x] 4.4 Create `apps/web/src/components/providers/SessionProvider.tsx` — calls init on first visit, provides token via context

- [x] Task 5: Frontend — provider tree (AC: 2, 3)
  - [x] 5.1 Update `apps/web/src/main.tsx` — wrap router with `QueryProvider → SessionProvider` (order matters: Query wraps Session so Session can use `useMutation`)

- [x] Task 6: Frontend — Landing page and routing (AC: 1, 4)
  - [x] 6.1 Create `apps/web/src/pages/Landing.tsx` — full landing page UI with all copy, layout, pulse animation, PostHog events
  - [x] 6.2 Update `apps/web/src/router.tsx` — `/` → `<Landing>`, add `/consent` route stub (renders `<div>Consent placeholder</div>` for now)
  - [x] 6.3 Add `errorElement` on root route to address deferred item from Story 1.2

- [x] Task 7: Design tokens, fonts, and SEO (AC: 1)
  - [x] 7.1 Update `apps/web/src/index.css` (Tailwind v4 — no tailwind.config.ts; tokens added via `@theme inline` CSS vars)
  - [x] 7.2 Add Clash Display via fontshare CDN in `index.html` + `@font-face` in `index.css` (local path for when font binary is self-hosted); Inter added via `@fontsource-variable/inter`
  - [x] 7.3 Update `apps/web/index.html` — add `<meta name="description">` and fontshare CDN link (lang, viewport, theme-color were already present)

- [x] Task 8: PWA manifest (deferred from Story 1.2) (AC: 1)
  - [x] 8.1 Update `apps/web/public/manifest.json` — added `description`, `scope`, `lang`, `id`

### Review Findings

- [x] [Review][Patch] SSR pre-hydration CTA bypasses React Router → AC-4 risk + lost analytics [apps/api/src/routes/ssr.ts:39] — change `<button onclick="window.location.href='/consent'">` to `<a href="/consent" class="cta">` styled as button
- [x] [Review][Patch] `apiCall` has no error handling — non-2xx + non-JSON throws SyntaxError [apps/web/src/lib/api.ts:11-13] — add `if (!res.ok) throw ApiError(...)` and try/catch around `res.json()`
- [x] [Review][Patch] `SessionInitResponseSchema` declared but never validated at runtime [apps/web/src/components/providers/SessionProvider.tsx:21-26] — apply `SessionInitResponseSchema.parse(...)` at the boundary
- [x] [Review][Patch] Schema permits impossible state `{data:null, error:null}` [packages/shared/src/schemas/session.ts:3-6] — refactor to discriminated union (`success xor error`)
- [x] [Review][Patch] StrictMode double-invokes session init useEffect → duplicate KV writes [apps/web/src/components/providers/SessionProvider.tsx:30-34] — add `useRef` guard; do not eslint-disable exhaustive-deps
- [x] [Review][Patch] `API_BASE` falls back to `localhost:8787` for production builds [apps/web/src/lib/api.ts:3] — change fallback to empty string (same-origin) or fail build when missing
- [x] [Review][Patch] Test missing assertion that KV key contains the returned `sessionToken` [apps/api/tests/routes/sessions.test.ts:36-41] — assert `putCall[0]` includes `body.data.sessionToken`
- [x] [Review][Patch] `catch` block in sessions route swallows error without logging [apps/api/src/routes/sessions.ts:16] — add `console.error('session init failed:', err)` for ops visibility
- [x] [Review][Patch] CTA missing `size="lg"` variant [apps/web/src/pages/Landing.tsx] — add prop per spec UX requirements
- [x] [Review][Patch] Font preload `<link rel="preload">` missing per spec [apps/web/index.html, apps/api/src/routes/ssr.ts] — add preload hint for `/fonts/ClashDisplay-Variable.woff2`
- [x] [Review][Patch] No `preconnect` for fontshare CDN — render-blocking on critical path [apps/web/index.html, apps/api/src/routes/ssr.ts] — add `<link rel="preconnect" href="https://api.fontshare.com" crossorigin>`
- [x] [Review][Patch] `/consent` stub uses hardcoded `#050507` — token bypassed [apps/web/src/router.tsx:14-18] — replace with `bg-surface-deep` Tailwind class (token now exists in `index.css`)
- [x] [Review][Patch] Active state same color as hover → no tactile feedback on mobile [apps/web/src/pages/Landing.tsx CTA] — change `active:bg-[#4F46E5]` to `active:bg-[#3730A3]` or remove
- [x] [Review][Patch] `QueryClient` instantiated at module scope, breaks tests/HMR [apps/web/src/components/providers/QueryProvider.tsx:3-7] — wrap in `useState(() => new QueryClient())` inside provider
- [x] [Review][Patch] Landing headline inline `fontFamily` ignores `--font-clash` token [apps/web/src/pages/Landing.tsx:31-39] — use Tailwind utility class for the new `--font-clash` token
- [x] [Review][Patch] localStorage throws in private mode / disabled / quota exceeded [apps/web/src/lib/session.ts:3-5] — wrap in `try/catch`; return `null` on read failure, swallow on write
- [x] [Review][Patch] Session init mutation has no `onError` handler; server `error` envelope unread [apps/web/src/components/providers/SessionProvider.tsx:21-28] — add `onError` (log + retry) and check `res.error` branch
- [x] [Review][Patch] Misleading SSR mount comment "must come before /api/*" — Hono routes by prefix, not registration order [apps/api/src/index.ts] — fix or remove the comment
- [x] [Review][Defer] PostHog server-side `session_initiated` event missing — same scope-boundary as posthog-js (deferred to PostHog wiring story)
- [x] [Review][Defer] Clash Display font binary not present in `apps/web/public/fonts/` — manual download required from fontshare.com (already in completion notes)
- [x] [Review][Defer] localStorage XSS-readable token — architecture-level decision per `architecture.md#Authentication & Security`; revisit if XSS surface grows
- [x] [Review][Defer] No rate limit on `POST /api/sessions/init` — RATE_LIMITER cleanup deferred to first feature story that uses it
- [x] [Review][Defer] Token validation against KV expiry not implemented — needs `/api/sessions/validate` endpoint, belongs to Story 2.4+
- [x] [Review][Defer] `/consent` route stub lacks `errorElement` — Story 2.2 owns the real consent page
- [x] [Review][Defer] `apiCall` Headers spread doesn't handle `Headers` instance — no current caller uses that form; revisit when needed
- [x] [Review][Defer] Test asserts TTL via out-of-diff `setSession` helper — TTL is correctly set in `lib/kv.ts`; not actionable

## Dev Notes

### Current Codebase State (READ BEFORE TOUCHING ANYTHING)

**Existing files you WILL modify:**
- `apps/web/src/main.tsx` — 12-line React StrictMode + Router setup. Currently no providers. **Must add `QueryProvider` and `SessionProvider` wrappers.**
- `apps/web/src/router.tsx` — 21 lines. Route `/` → `<App />`, route `*` → 404 in Vietnamese. **Must replace `<App />` with `<Landing />` and add `/consent` stub.**
- `apps/web/src/App.tsx` — Placeholder that renders the MBTI title and one CTA button inline. **DO NOT delete this file — but it becomes unused after routing to `Landing.tsx`. Leave it in place; do not remove.**
- `apps/api/src/index.ts` — Hono entry with health check at `GET /api/health`, CORS middleware, Zod + HTTPException error handlers. **Must mount sessions and ssr routes.**
- `packages/shared/src/index.ts` — Re-exports constants, queryKeys, db/rows, schemas. **Must add session schema export.**

**Existing files you will READ (do NOT modify):**
- `apps/api/src/lib/kv.ts` — Has `getSession()`, `setSession()`, `deleteSession()`, `SessionData: { userId: string; createdAt: string }`, TTL = `60 * 60 * 24 * 30`. **Use these helpers exactly as written. Never call `c.env.KV` directly.**
- `apps/api/src/middleware/auth.ts` — `requireSession` middleware reads `X-Session-Token`, calls `getSession`, sets `c.var.userId`. Sessions init endpoint does NOT use this middleware.
- `apps/api/src/types/bindings.ts` — Defines `Bindings` (DB, KV, ASSETS_BUCKET, RATE_LIMITER, secrets) and `Variables: { userId: string }`.
- `apps/web/src/lib/utils.ts` — Has `cn()` utility. Reuse in Landing component.
- `apps/web/src/components/ui/button.tsx` — shadcn/ui Button using `@base-ui/react/button`. **Use this component for the CTA button — do NOT create a new button component.**

**Files to create (do NOT create anything else):**
- `packages/shared/src/schemas/session.ts`
- `apps/api/src/routes/sessions.ts`
- `apps/api/src/routes/ssr.ts`
- `apps/api/tests/routes/sessions.test.ts`
- `apps/web/src/lib/session.ts`
- `apps/web/src/lib/api.ts`
- `apps/web/src/components/providers/QueryProvider.tsx`
- `apps/web/src/components/providers/SessionProvider.tsx`
- `apps/web/src/pages/Landing.tsx`

---

### Session Init Endpoint — Exact Contract

**Route:** `POST /api/sessions/init`  
**Auth:** NONE — public endpoint, no `requireSession` middleware  
**Request body:** Empty (no body required)

**Server logic:**
```
sessionToken = crypto.randomUUID()
userId       = crypto.randomUUID()   // separate UUID from token
await setSession(c.env.KV, sessionToken, { userId, createdAt: new Date().toISOString() })
PostHog server-side event: 'session_initiated' (best-effort, non-blocking)
return c.json({ data: { sessionToken }, error: null })
```

**Success response (200):**
```json
{ "data": { "sessionToken": "<uuid>" }, "error": null }
```

**Error response (500 — KV write failure):**
```json
{ "data": null, "error": { "code": "SESSION_CREATE_FAILED", "message": "Unable to create session. Please refresh and try again." } }
```

**KV key pattern:** The existing `setSession` helper uses the raw token as the key (no prefix). Do not add a `session:` prefix — that would break `getSession` in `auth.ts`.

---

### SSR Route — What to Build

The `ssr.ts` Hono route handles `GET /` and returns an HTML response with:
1. Inline landing page content (for LCP — browsers paint this immediately without waiting for JS)
2. Proper SEO meta tags (title, description, OG, viewport)
3. Reference to the React SPA bundle

**Why SSR matters for LCP:** If the HTML only contains `<div id="root"></div>`, LCP fires after the JS bundle loads and React renders. Inlining the headline and CTA in the HTML means the browser can paint them immediately on first byte.

**SSR HTML structure (minimum required):**
```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#050507">
  <title>MBTI Platform — Khám phá kiểu tính cách của bạn</title>
  <meta name="description" content="Bài trắc nghiệm tính cách chuẩn xác, không cần đăng ký. Nhận kết quả ngay.">
  <meta property="og:title" content="MBTI Platform">
  <meta property="og:description" content="Bài trắc nghiệm tính cách — chính xác đến mức khó chịu">
  <meta property="og:type" content="website">
  <link rel="manifest" href="/manifest.json">
  [font preload links for Clash Display]
  [Tailwind CSS link or inline critical CSS for above-the-fold content]
</head>
<body style="background:#050507;margin:0">
  <div id="root">
    <!-- SSR shell for LCP — React will hydrate this -->
    [Inline the headline, CTA, social proof ticker as static HTML with Tailwind classes]
  </div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

**Important:** In the Cloudflare Pages + Workers setup, the Worker's `ssr.ts` serves the HTML entry point. The React SPA bundle at `/src/main.tsx` is resolved by Vite in dev mode and by the built asset URL in production. For now, keep the script src as `/src/main.tsx` — this works in development (Vite dev server) and will be updated in a later story when production build URL resolution is configured.

**The Hono route signature:**
```typescript
// apps/api/src/routes/ssr.ts
import { Hono } from 'hono'
import type { Bindings } from '../types/bindings'

const ssr = new Hono<{ Bindings: Bindings }>()
ssr.get('/', (c) => c.html(landingPageHtml))
export default ssr
```

Mount in `index.ts` BEFORE the `/api/*` routes:
```typescript
import ssr from './routes/ssr'
app.route('/', ssr)        // must come BEFORE /api/* routes
app.route('/api/sessions', sessions)
```

---

### Frontend Session Management — Exact Patterns

**`apps/web/src/lib/session.ts`:**
```typescript
export const SESSION_KEY = 'mbti-session-token'
export const getSessionToken = (): string | null => localStorage.getItem(SESSION_KEY)
export const setSessionToken = (token: string): void => localStorage.setItem(SESSION_KEY, token)
```

**`apps/web/src/lib/api.ts`** — typed fetch wrapper:
```typescript
// Base URL from env var — falls back to localhost for dev
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

export async function apiCall<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getSessionToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'X-Session-Token': token } : {}),
    ...init?.headers,
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  return res.json() as Promise<T>
}
```

**`apps/web/src/components/providers/SessionProvider.tsx`:**
- Wraps children, calls `POST /api/sessions/init` on mount if `getSessionToken()` returns null
- Uses TanStack Query `useMutation` for the init call (NOT `useEffect` + `fetch` — use the query client)
- Stores the returned token via `setSessionToken(token)`
- Provides the token via React Context so child components can read it if needed
- While the init call is in-flight: render children anyway (do not block render on session init — session init failure should not prevent the user from seeing the landing page)

**`apps/web/src/main.tsx` provider order:**
```tsx
<StrictMode>
  <RouterProvider router={...}>
    <QueryProvider>       {/* TanStack Query client — wraps everything */}
      <SessionProvider>  {/* calls /api/sessions/init if no token */}
        {children}
      </SessionProvider>
    </QueryProvider>
  </RouterProvider>
</StrictMode>
```

Wait — React Router v7's `RouterProvider` is the outermost component and takes a `router` prop. The providers need to be inside a layout route. Correct pattern for React Router v7 with providers:

```tsx
// main.tsx
const router = createBrowserRouter([...routes])
root.render(
  <StrictMode>
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  </StrictMode>
)
```

And `SessionProvider` goes INSIDE the router as a layout component (in `router.tsx`) so it has access to router context. OR, put it outside the router (SessionProvider doesn't need router context).

Simplest correct approach: both `QueryProvider` and `SessionProvider` OUTSIDE `RouterProvider` in `main.tsx`:
```tsx
root.render(
  <StrictMode>
    <QueryProvider>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </QueryProvider>
  </StrictMode>
)
```

---

### Landing Page Component — UX Requirements

**File:** `apps/web/src/pages/Landing.tsx`

**Background color:** `#050507` (The Stage design direction — near-black, NOT `#0D0F1A`)

**Visual hierarchy (mobile, single column, centered):**
```
[padding-top: 60px mobile]
[social proof ticker — 13px, slate-500, pulse animation]
[spacing: 32px]
[headline — 64px Clash Display, white, line-height 1.1]
[spacing: 16px]
[subtext — 16px Inter, slate-400, line-height 1.6]
[spacing: 32px]
[CTA button — #6366F1 fill, full-width, 48px min-height, white text]
[spacing: 8px]
[micro-copy — 13px, slate-500]
```

**Desktop:** 480px centered column, dark flanks (`#050507` fills remaining width)

**CTA button:** Use the existing `Button` component from `apps/web/src/components/ui/button.tsx`. Pass `className` to override the color to `#6366F1` background with white text, hover state `#4F46E5`. Use the `lg` size variant.

**Social proof ticker pulse animation** — use a CSS keyframe animation `pulse` that alternates opacity between 1 and 0.6, 2-second cycle. Tailwind's `animate-pulse` is acceptable if available; otherwise add a custom animation in `index.css`.

**PostHog events (client-side, fire on component mount):**
```typescript
posthog.capture('landing_page_viewed')
```
On CTA click (BEFORE navigation):
```typescript
posthog.capture('cta_tapped', { buttonText: 'Xem tôi thuộc kiểu người nào →' })
```
Note: PostHog is NOT yet wired up in the provider tree (that's deferred). Use `window.posthog?.capture(...)` pattern for now so it's a no-op until PostHog is added. Do NOT install `posthog-js` in this story — that belongs to a later story.

**Accessibility requirements:**
- `<html lang="vi">` already set in `index.html` (Task 7.3)
- CTA button: min 44×44px touch target (48px height satisfies this)
- WCAG 2.1 AA contrast: `#6366F1` on `#050507` — verify passes 3:1 for UI elements
- The 4-letter MBTI type codes (not displayed on landing page) would get `lang="en"` spans — not applicable here

**Router navigation on CTA click:**
```typescript
import { useNavigate } from 'react-router-dom'
const navigate = useNavigate()
// onClick: navigate('/consent')
```

---

### TanStack Query Setup

Install is already done from Story 1.7 baseline? **No — check the current `package.json`.** TanStack Query (`@tanstack/react-query`) is referenced in `architecture.md` as a required dependency but may not be installed yet. Run `pnpm --filter @mbti/web add @tanstack/react-query` if not present.

`QueryProvider.tsx`:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } }
})
export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

---

### Shared Schema — `packages/shared/src/schemas/session.ts`

```typescript
import { z } from 'zod'

export const SessionInitResponseSchema = z.object({
  data: z.object({ sessionToken: z.string().uuid() }).nullable(),
  error: z.object({ code: z.string(), message: z.string() }).nullable(),
})

export type SessionInitResponse = z.infer<typeof SessionInitResponseSchema>
```

Add `queryKeys.session = () => ['session'] as const` to `packages/shared/src/queryKeys.ts` if not present.

---

### Design Tokens — `tailwind.config.ts`

Add the following to `apps/web/tailwind.config.ts`:
```typescript
theme: {
  extend: {
    colors: {
      'surface-base': '#0D0F1A',
      'surface-deep': '#050507',    // The Stage landing page background
      'surface-elevated': '#161929',
      'surface-light': '#F8F9FC',
      'cta-primary': '#6366F1',
      'cta-hover': '#4F46E5',
    },
    fontFamily: {
      display: ['Clash Display', 'sans-serif'],
      sans: ['Inter', 'sans-serif'],
    },
  }
}
```

---

### Font Self-Hosting

**Clash Display:**
- Source: https://www.fontshare.com/fonts/clash-display (free for commercial use)
- Download the variable font: `ClashDisplay-Variable.woff2`
- Place in `apps/web/public/fonts/ClashDisplay-Variable.woff2`
- Add to `apps/web/src/index.css`:
```css
@font-face {
  font-family: 'Clash Display';
  src: url('/fonts/ClashDisplay-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
}
```

**Inter:**
- Inter is already commonly bundled with Tailwind/shadcn setups; verify it's being loaded.
- If not: download from https://rsms.me/inter/ (Inter.var.woff2), place in `public/fonts/`, add `@font-face`.
- Inter must include Vietnamese Unicode range (the full Inter variable font does).

**Add preload hints in `index.html`:**
```html
<link rel="preload" href="/fonts/ClashDisplay-Variable.woff2" as="font" type="font/woff2" crossorigin>
```

---

### Testing Requirements

**Vitest test for `POST /api/sessions/init`** (`apps/api/tests/routes/sessions.test.ts`):
- Uses the same test pattern as existing smoke tests (see `apps/api/tests/smoke.test.ts`)
- Cloudflare Workers runtime globals are NOT available in Vitest's Node env — mock `c.env.KV` with an in-memory object that satisfies the `setSession` interface
- Test assertions:
  1. Returns 200 with `{ data: { sessionToken: <uuid-string> }, error: null }`
  2. `sessionToken` passes `z.string().uuid()` validation
  3. KV `put` was called once with the token and 30-day TTL
  4. A second call returns a DIFFERENT token (idempotency not required — always creates new)

**Note on Cloudflare Workers in Vitest:** The Story 1.7 deferred-work notes that adding `@cloudflare/vitest-pool-workers` is the correct solution for testing Workers code. For now, mock the KV binding in the test. The mock shape:
```typescript
const mockKv = {
  put: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue(null),
}
```

---

### Previous Story Intelligence (Story 1.7 → 2.1)

**From Story 1.7 dev notes:**
- `compatibility_date` in `apps/api/wrangler.toml` was bumped to `2026-04-01` — do not touch
- CORS is configured in `apps/api/src/middleware/cors.ts` to allow `https://mbti.thanghost.io.vn` and `https://mbti-web.pages.dev`. This story does NOT change CORS.
- `pnpm run check:wrangler` is the predeploy guard — run it after any `wrangler.toml` changes
- `pnpm exec turbo run lint typecheck test` must stay green — verify before marking story done
- `apps/web/src/components/ui/button.tsx` uses `@base-ui/react/button` (NOT Radix UI) — architecture doc was outdated; shadcn v4 migrated to Base UI

**What's already wired:**
- `SessionData` in `kv.ts` has `userId: string` — this is what `auth.ts` reads as `c.var.userId`. When init creates a session, the `userId` UUID stored in KV is what all future authenticated routes use to identify this anonymous user.
- The `Variables` type in `bindings.ts` already has `userId: string` — no type changes needed

**Deferred items this story RESOLVES:**
- "No React Error Boundary or `errorElement` on routes" → add in Task 6.3
- "No `<meta name="description">` in `index.html`" → add in Task 7.3
- "Hardcoded hex colors bypass theme system" → add design tokens in Task 7.1

---

### Scope Boundaries — DO NOT Do These

- **Do NOT create a `ConsentGate.tsx` or any consent logic** — that is Story 2.2. The `/consent` route in this story is a placeholder stub only.
- **Do NOT install `posthog-js`** — PostHog wiring is a later story. Use `window.posthog?.capture()` no-op pattern.
- **Do NOT install `framer-motion`** — animations in this story use CSS only (the social proof ticker pulse).
- **Do NOT implement the full CAT algorithm or any test state** — that is Story 2.4.
- **Do NOT add `@cloudflare/vitest-pool-workers`** — it's deferred per Story 1.7 notes. Mock the KV binding instead.
- **Do NOT change CORS configuration** — it's already correct.
- **Do NOT add staging/production environment separation to `wrangler.toml`** — that's a later epic.
- **Do NOT remove `App.tsx`** — leave it even though it becomes unused via routing; removing unused files is outside this story's scope.
- **Do NOT modify the D1 schema or migration files** — this story does not read/write D1.
- **Do NOT add `useTestStore` or Zustand** — that's Story 2.4 (test flow). This story has no Zustand dependency.
- **Do NOT add `posthog-react` or `PostHogProvider`** — not in scope.

---

### Architecture Compliance Checklist

Before marking tasks done, verify:
- [ ] All KV access goes through `getSession()`/`setSession()` helpers — never `c.env.KV.put()` directly
- [ ] All API responses use `{ data, error }` envelope — no exceptions
- [ ] `SessionProvider` does NOT block render on session init (users must see the landing page even if KV is slow)
- [ ] `Landing.tsx` renders `#050507` background (The Stage direction), NOT `#0D0F1A`
- [ ] CTA button reuses `Button` from `ui/button.tsx` — no new button component created
- [ ] `tailwind.config.ts` uses `extend` not replacement — existing Tailwind defaults preserved
- [ ] `pnpm run check:wrangler` exits 0 after all changes
- [ ] `pnpm exec turbo run lint typecheck test` passes all 3 packages

---

### Project Structure Notes

**New files go exactly here:**
```
packages/shared/src/schemas/session.ts        ← schema only
apps/api/src/routes/sessions.ts               ← POST /api/sessions/init
apps/api/src/routes/ssr.ts                    ← GET / HTML
apps/api/tests/routes/sessions.test.ts        ← vitest test
apps/web/src/lib/session.ts                   ← localStorage helpers
apps/web/src/lib/api.ts                       ← fetch wrapper
apps/web/src/components/providers/QueryProvider.tsx
apps/web/src/components/providers/SessionProvider.tsx
apps/web/src/pages/Landing.tsx
apps/web/public/fonts/ClashDisplay-Variable.woff2   ← binary, download manually
```

**No new directories needed** — all directories already exist per the architecture structure established in Stories 1.1–1.7.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1 — Landing Page & Anonymous User Session — full BDD ACs]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security — KV session pattern, SessionData type, 30-day TTL]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure — apps/web/src/components/providers/, apps/web/src/lib/session.ts, apps/web/src/lib/api.ts]
- [Source: _bmad-output/planning-artifacts/architecture.md#SSR strategy — Hono Worker routes for landing page and articles; CSR for interactive flows]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns — KV typed helper anti-pattern; response envelope format]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Phase 1 Initiation — landing page copy hierarchy, 64px Clash Display, indigo CTA #6366F1]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Direction 4 The Stage — #050507 background, near-black base]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Color System — cta-primary #6366F1, cta-hover #4F46E5, semantic colors]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Typography System — Clash Display display, Inter body, type scale]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Responsive Strategy — mobile-first, 480px centered column desktop]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility Strategy — WCAG 2.1 AA, 44×44px touch targets, lang="vi"]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#PWA manifest — display:standalone, theme_color:#050507]
- [Source: _bmad-output/implementation-artifacts/1-7-ci-cd-pipeline-with-github-actions.md#Completion Notes — @base-ui/react (not Radix); pnpm run check:wrangler; turbo run lint typecheck test]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md#1-2 — Error Boundary, meta description, hex colors deferred to Story 2.1]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md#1-3 — CORS hardcoded; Variables.userId non-optional design tension]
- [Source: apps/api/src/lib/kv.ts — SessionData type, TTL constant, getSession/setSession/deleteSession signatures]
- [Source: apps/api/src/types/bindings.ts — Bindings.KV, Variables.userId]
- [Source: apps/web/src/components/ui/button.tsx — existing Button component API]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (claude-sonnet-4-6)

### Debug Log References

- **kv.ts key prefix discovery:** Actual `kv.ts` uses internal `session:` prefix via `sessionKey()` helper — story dev notes incorrectly stated "raw token as key". Callers still pass raw tokens; the prefix is applied internally. No impact on implementation.
- **Tailwind v4 — no tailwind.config.ts:** Project uses Tailwind v4 CSS-based config (`@theme inline` in `index.css`), not a JS config file. Task 7.1 updated accordingly — design tokens added as CSS variables.
- **index.html already complete:** `lang="vi"`, `viewport-fit=cover`, `theme-color`, manifest link were all present from Story 1.2. Only added `<meta name="description">` and fontshare CDN link.
- **Clash Display not on npm fontsource:** `@fontsource-variable/clash-display` and `@fontsource/clash-display` both return 404. Used fontshare CDN `<link>` in `index.html` + `@font-face` CSS pointing to `/fonts/ClashDisplay-Variable.woff2` for future self-hosting. Font binary must be manually downloaded from https://www.fontshare.com/fonts/clash-display.
- **`@tanstack/react-query` + `@fontsource-variable/inter` installed:** Both were missing; installed via `pnpm --filter @mbti/web add`.
- **`providers/` and `pages/` directories did not exist:** Story claimed "all directories already exist" — incorrect. Created both directories.
- **react-refresh lint on SessionProvider:** `useSession` hook co-exported with provider component triggers `react-refresh/only-export-components`. Suppressed with per-line eslint-disable (standard pattern for hook+provider co-location).
- **react-refresh lint on router.tsx:** `RootError` component defined in same file as non-component `router` export. Fixed by extracting `RootError` to `apps/web/src/pages/RootError.tsx`.
- **Session test pattern:** Used Hono's `app.request(path, init, env)` signature — third arg is bindings mock. All 4 tests pass.
- **Full pipeline green:** `pnpm exec turbo run lint typecheck test` → 9/9 successful. `pnpm run check:wrangler` → 0 errors, 1 known warning (RATE_LIMITER pre-existing).

### Completion Notes List

- **AC 1 ✅** — SSR route at `apps/api/src/routes/ssr.ts` returns HTML with full landing copy inline (headline, subtext, CTA, social proof ticker), SEO meta tags, and React bundle reference. Inline CSS ensures LCP-critical content paints before JS loads.
- **AC 2 ✅** — `POST /api/sessions/init` generates UUID `sessionToken` + UUID `userId`, stores in KV via `setSession()` with 30-day TTL, returns `{ data: { sessionToken }, error: null }`. `SessionProvider` calls this on first mount when no token in `localStorage`; stores result under key `mbti-session-token`.
- **AC 3 ✅** — `SessionProvider` reads `getSessionToken()` on init; only calls `/api/sessions/init` if null. Returning visitors skip the call.
- **AC 4 ✅** — CTA `onClick` calls `navigate('/consent')` via `useNavigate`. `/consent` route renders a placeholder stub.
- **Design tokens** added to `index.css` via `@theme inline`: `--color-surface-deep`, `--color-surface-base`, `--color-surface-elevated`, `--color-cta-primary`, `--color-cta-hover`, `--font-clash`.
- **Inter Variable** added as `@fontsource-variable/inter`, swapped into `--font-sans` ahead of Geist fallback.
- **Deferred items resolved:** error boundary (1.2) → `RootError` + `errorElement` on `/`; `<meta name="description">` (1.2) → added to `index.html`; design token system (1.2) → CSS variables in `index.css`.
- **Clash Display font binary** NOT included (cannot download binaries programmatically). Font loads from fontshare CDN until self-hosted. To self-host: download `ClashDisplay-Variable.woff2` from https://www.fontshare.com/fonts/clash-display → place in `apps/web/public/fonts/`.

### File List

- `packages/shared/src/schemas/session.ts` (NEW)
- `packages/shared/src/index.ts` (MODIFIED — added session schema export)
- `packages/shared/src/queryKeys.ts` (MODIFIED — added `session` key)
- `apps/api/src/routes/sessions.ts` (NEW)
- `apps/api/src/routes/ssr.ts` (NEW)
- `apps/api/src/index.ts` (MODIFIED — mounted ssr and sessions routes)
- `apps/api/tests/routes/sessions.test.ts` (NEW)
- `apps/web/src/lib/session.ts` (NEW)
- `apps/web/src/lib/api.ts` (NEW — `apiCall` typed fetch wrapper + `ApiError` class)
- `apps/web/src/components/providers/QueryProvider.tsx` (NEW)
- `apps/web/src/components/providers/SessionProvider.tsx` (NEW)
- `apps/web/src/pages/Landing.tsx` (NEW)
- `apps/web/src/pages/RootError.tsx` (NEW)
- `apps/web/src/main.tsx` (MODIFIED — added QueryProvider + SessionProvider wrappers)
- `apps/web/src/router.tsx` (MODIFIED — Landing route, /consent stub, RootError errorElement)
- `apps/web/src/index.css` (MODIFIED — @fontsource/inter import, @font-face Clash Display, @theme tokens)
- `apps/web/index.html` (MODIFIED — meta description, fontshare CDN link, title update)
- `apps/web/public/manifest.json` (MODIFIED — added id, scope, lang, description)
- `apps/web/package.json` (MODIFIED — @tanstack/react-query, @fontsource-variable/inter added)
- `pnpm-lock.yaml` (MODIFIED — lockfile updated for new deps)

### Change Log

- 2026-05-05: Story 2.1 created — comprehensive context engine analysis completed; 8 tasks documented.
- 2026-05-05: Story 2.1 implemented — all 4 ACs satisfied; 9/9 turbo tasks (lint + typecheck + test) green; 5 API tests passing; predeploy guard 0 errors. Story → review.
- 2026-05-05: Code review applied — 18 patches resolved across 11 files (security/error handling: schema discriminated union, runtime Zod validation, fetch error handling, ApiError class, console.error in catch; robustness: localStorage try/catch, StrictMode ref guard, mutation onError, QueryClient inside provider; UX/spec: SSR anchor instead of button, font preload, fontshare preconnect, Tailwind token classes, size="lg", darker active state, font-clash class; tests: KV key assertion). 9/9 turbo tasks green. 8 findings deferred to `deferred-work.md`. Story → done.
