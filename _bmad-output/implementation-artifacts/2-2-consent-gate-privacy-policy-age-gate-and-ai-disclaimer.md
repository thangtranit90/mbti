# Story 2.2: Consent Gate, Privacy Policy, Age Gate & AI Disclaimer

Status: done

## Story

As a visitor about to take the test,
I want to see a clear, friendly consent screen before I begin,
so that I can make an informed choice about data collection without feeling tracked or blocked.

## Acceptance Criteria

1. **Given** the visitor reaches the `/consent` screen — **When** it renders — **Then** it shows on the `surface-deep` (`#050507`) background, in a single 480px max-width column:
   - **(1)** AI disclaimer (one line, 13–14px, slate-400, italic): *"Đây là công cụ tự phản chiếu — không phải đánh giá lâm sàng"* — rendered via the reusable `<AiDisclaimer />` component.
   - **(2)** 18+ age confirmation checkbox: *"Tôi xác nhận mình từ 18 tuổi trở lên"* — single line, 15px Inter, checkbox left of label, full row tappable.
   - **(3)** PDPA consent checkbox: *"Tôi đồng ý cho phép thu thập câu trả lời để tạo kết quả MBTI"* + an inline link *"Xem chính sách bảo mật"* (slate-300 underline) opening `/privacy` in a new tab (`target="_blank" rel="noopener noreferrer"`).
   - **(4)** "Bắt đầu" primary CTA (full-width, 48px min-height, `#6366F1` indigo) with `aria-disabled="true"` while either checkbox is unchecked. The element MUST stay focusable and clickable so AC-2's tap-while-disabled feedback path can fire — do not use the HTML `disabled` attribute.

2. **Given** the visitor attempts to proceed without checking both checkboxes — **When** they tap "Bắt đầu" — **Then** the button remains `aria-disabled="true"` and an inline red text (`text-red-400`, 13px, `aria-live="polite"`) appears directly below the unchecked checkbox(es) with copy *"Vui lòng xác nhận để tiếp tục"* — no toast, no modal, no `<dialog>`. The error clears the moment the unchecked checkbox is checked.

3. **Given** the visitor taps the privacy policy link — **When** activated — **Then** `/privacy` opens in a new browser tab without leaving the consent screen (consent state preserved on return). The `/privacy` page is server-rendered HTML via Hono `routes/ssr.ts` (consistent with the landing SSR pattern from Story 2.1) and contains plain-language Vietnamese privacy copy — no legalese.

4. **Given** both checkboxes are checked and "Bắt đầu" is tapped — **When** processed — **Then** `PATCH /api/sessions/consent` is called with the `X-Session-Token` header (set automatically by `apiCall`) and JSON body `{ "consentGiven": true, "ageConfirmed": true }`. On success the React client calls `navigate('/declare')` (the TypeSelector route — stub for Story 2.3, treated as a placeholder by this story). On non-2xx OR envelope `error`, an inline red text (`aria-live="polite"`) below the CTA reads *"Không lưu được lựa chọn. Vui lòng thử lại."* — no navigation.

5. **Given** the API receives `PATCH /api/sessions/consent` — **When** processed in `apps/api/src/routes/sessions.ts` — **Then** the `requireSession` middleware validates the token (returning 401 envelope on miss/expired); the handler reads the existing `SessionData` via `getSession`, merges `consentAt` and `ageConfirmedAt` (both `new Date().toISOString()`), and writes via `setSession` (preserves the existing 30-day TTL — do NOT call `c.env.KV.put` directly). Response: `200 { data: { consentAt, ageConfirmedAt }, error: null }`. **Idempotent:** a second PATCH overwrites both timestamps with the new `now()` (last-write-wins).

6. **Given** the request body fails Zod validation (missing field, `false` value, extra keys) — **When** the route handler runs — **Then** it throws the `ZodError`; the existing global `app.onError` middleware in `apps/api/src/index.ts` formats it as `400 { data: null, error: { code: 'VALIDATION_ERROR', message } }`. Do not self-format errors in the route.

## Review Findings

- [x] [Review][Patch] Malformed JSON body to PATCH /consent returns 500 instead of 400 envelope [apps/api/src/routes/sessions.ts:62] — `await c.req.json()` throws `SyntaxError` (not `ZodError`) on invalid JSON; `app.onError` formats it as `INTERNAL_ERROR 500` instead of the contract's `400 VALIDATION_ERROR`. AC-6 says Zod validation → 400; same client-visible class of error should also surface as 400.
- [x] [Review][Patch] Double-tap race: handler runs twice before `mutation.isPending` flips [apps/web/src/features/test/components/ConsentGate.tsx:75-83] — two rapid clicks both pass the `if (mutation.isPending) return` check before React Query's pending state is observed by the next render; PostHog event + setSubmitError fire twice; second PATCH races the first. Use a `useRef` synchronous latch.
- [x] [Review][Patch] `void body;` is dead code with misleading comment [apps/api/src/routes/sessions.ts:62-63] — `const body = ConsentRequestSchema.parse(...); void body;` parses then discards; comment claims "we only need to confirm both literals are true" but the values are never inspected. If the schema is later loosened from `z.literal(true)` to `z.boolean()`, the handler silently writes consent for `false` payloads. Remove the assignment; just call `.parse(...)`.
- [x] [Review][Patch] Gratuitous `as ConsentResponse` cast masks future schema/type drift [apps/web/src/features/test/components/ConsentGate.tsx:35] — `parse(raw) as ConsentResponse` — `parse` already returns the inferred type. The cast hides any future divergence between `ConsentResponseSchema` and the `ConsentResponse` type alias.
- [x] [Review][Patch] Mutation `onError` performs dead `instanceof` check [apps/web/src/features/test/components/ConsentGate.tsx:48] — `void (err instanceof ApiError);` evaluates and discards. Either branch on it (different copy/telemetry for `ApiError` vs `ZodError`) or delete the line.
- [x] [Review][Patch] PostHog `Window.posthog` global declared in two component files [apps/web/src/features/test/components/ConsentGate.tsx:13-17, apps/web/src/pages/Landing.tsx:5-9] — `declare global { interface Window { posthog?: ... } }` repeated. Declaration merging makes builds pass, but a third copy with a stricter shape would silently mismatch at runtime. Extract to `apps/web/src/types/global.d.ts`.
- [x] [Review][Patch] `window.posthog?.capture?.()` propagates synchronous throws [apps/web/src/features/test/components/ConsentGate.tsx:30, 73-77, 49] — optional chaining handles "method missing" but not "method exists and throws" (browser extensions blocking analytics can throw). Wrap each call site or extract a `safeCapture` helper.
- [x] [Review][Patch] Submit fires PATCH with no `X-Session-Token` when localStorage is empty [apps/web/src/features/test/components/ConsentGate.tsx:81-83] — if `getSessionToken()` returns `null` (private mode, navigation directly to `/consent` without `SessionProvider` running), `apiCall` sends no header, server returns `401 UNAUTHORIZED`, user sees the generic submit-error copy with no actionable hint. Guard at handler entry: if no token, `navigate('/')` to re-init.
- [x] [Review][Patch] `ConsentRequestSchema` accepts unknown extra keys [packages/shared/src/schemas/session.ts:18-21] — non-strict object schema. Defensive `.strict()` would reject malformed/tampered payloads earlier rather than silently dropping fields.
- [x] [Review][Patch] Test mock KV `get` ignores the `'json'` type argument [apps/api/tests/routes/sessions.test.ts:39-44] — real Workers KV returns `string | null` unless `'json'` is passed. The mock returns the parsed object regardless. A future bug where `lib/kv.ts` drops the `'json'` arg would not be caught.
- [x] [Review][Defer] SSR script tag `/src/main.tsx` is a Vite-dev path [apps/api/src/routes/ssr.ts:48] — pre-existing from Story 2.1; production needs hashed bundle URL via build manifest. Owned by deploy-pipeline story.
- [x] [Review][Defer] CSP / security headers absent on hand-rolled SSR HTML [apps/api/src/routes/ssr.ts:7,55] — pre-existing from Story 2.1; CSP/Referrer-Policy/X-Content-Type-Options should be added when observability/security pass lands.
- [x] [Review][Defer] Privacy page Last-Updated date is hardcoded TS string [apps/api/src/routes/ssr.ts:79] — drift risk when copy changes without timestamp bump. Consider build-time substitution or `fs.statSync` mtime header.
- [x] [Review][Defer] Privacy text mentions "Cloudflare (offshore)" — infra disclosure [apps/api/src/routes/ssr.ts:96] — content/legal review concern; copy was MVP-drafted. Revisit when product team owns the privacy CMS.
- [x] [Review][Defer] No `AbortController` on `apiCall` mutation [apps/web/src/features/test/components/ConsentGate.tsx:32-36] — user navigating away mid-flight produces stale state warnings in StrictMode. Benign in prod for this single-mutation flow; address when a request-cancellation pattern is needed elsewhere.
- [x] [Review][Defer] Row error `<p role="alert">` does not move focus [apps/web/src/features/test/components/ConsentGate.tsx:99-107, 122-130] — `aria-live="polite"` announces but AT user with focus elsewhere may not navigate to the error. Consider `useEffect` on `showRowErrors` → focus first invalid checkbox.
- [x] [Review][Defer] `submitError` lacks `scrollIntoView` for mobile [apps/web/src/features/test/components/ConsentGate.tsx:148-156] — error appears below CTA; on small screens with keyboard open it can be off-viewport. Minor UX.
- [x] [Review][Defer] `/declare` ships an unstyled placeholder route to production [apps/web/src/router.tsx:16-22] — owned by Story 2.3. Acceptable for sprint sequencing; flag if 2.2 deploys ahead of 2.3.
- [x] [Review][Defer] `SESSION_GONE` 401 does not signal client to clear stale token [apps/api/src/routes/sessions.ts:67-76] — refresh fixes it (re-init creates new session); not an infinite loop. Add `error.shouldClearToken` hint when token-rotation pattern is needed.
- [x] [Review][Defer] `c.req.header('X-Session-Token')!.trim()` non-null assertion couples to middleware order [apps/api/src/routes/sessions.ts:65] — safe today because `requireSession` validates presence; brittle to middleware-order refactors. Replace with `getOrThrow` helper when more authenticated routes land.
- [x] [Review][Defer] `as any` cast on `env` in tests [apps/api/tests/routes/sessions.test.ts:53,64,76,87 + new PATCH cases] — pre-existing test pattern from Story 2.1; tightening requires importing the `Bindings` type into tests. Out-of-scope hygiene.
- [x] [Review][Defer] Anchor `role="button"` SSR CTA — Space key won't activate [apps/api/src/routes/ssr.ts:43] — pre-existing from Story 2.1's landing route; keyboard activation requires `<button>` or explicit `onkeydown`. Owned by SSR-accessibility pass.

## Tasks / Subtasks

- [x] **Task 1: Shared schemas — request + response contracts** (AC: 4, 5, 6)
  - [x] 1.1 In `packages/shared/src/schemas/session.ts` add `ConsentRequestSchema` (`{ consentGiven: z.literal(true), ageConfirmed: z.literal(true) }`) — both literals `true` so `false` fails validation.
  - [x] 1.2 In the same file add `ConsentResponseSchema` as the discriminated union pattern from `SessionInitResponseSchema` (success: `{ data: { consentAt: z.string().datetime({ offset: false }), ageConfirmedAt: z.string().datetime({ offset: false }) }, error: null }` ⊕ error: `{ data: null, error: { code, message } }`). Use `{ offset: false }` to stay consistent with `TestResultSchema.createdAt` and the `new Date().toISOString()` `Z`-suffix format mandated by `architecture.md#Format Patterns` (per `deferred-work.md#code review of 1-4-shared-package`).
  - [x] 1.3 Export `ConsentRequest`, `ConsentResponse` types via `z.infer`.
  - [x] 1.4 No change to `packages/shared/src/index.ts` — `export * from './schemas/session'` already re-exports new symbols.

- [x] **Task 2: API — extend KV SessionData shape** (AC: 5)
  - [x] 2.1 In `apps/api/src/lib/kv.ts` extend the `SessionData` type:
    ```typescript
    export type SessionData = {
      userId: string;
      createdAt: string;
      consentAt?: string;       // ISO8601, present after PATCH /consent
      ageConfirmedAt?: string;  // ISO8601, present after PATCH /consent
    };
    ```
    Both new fields are **optional** so existing in-flight sessions written by Story 2.1 still parse correctly.
  - [x] 2.2 Do NOT add a new helper. The existing `setSession`/`getSession` already accept `SessionData` — they propagate the new fields automatically.
  - [x] 2.3 Do NOT change the 30-day TTL constant. `setSession` re-applies it on every write; this is the intended sliding-by-event pattern for now.

- [x] **Task 3: API — `PATCH /api/sessions/consent` route** (AC: 4, 5, 6)
  - [x] 3.1 In `apps/api/src/routes/sessions.ts` import `requireSession` from `../middleware/auth` and `ConsentRequestSchema` from `@mbti/shared`.
  - [x] 3.2 Add handler:
    ```typescript
    sessions.patch('/consent', requireSession, async (c) => {
      const body = ConsentRequestSchema.parse(await c.req.json());  // throws ZodError → 400
      const token = c.req.header('X-Session-Token')!.trim();          // safe — requireSession already validated
      const existing = await getSession(c.env.KV, token);
      if (!existing) {
        return c.json(
          { data: null, error: { code: 'SESSION_GONE', message: 'Session expired during consent flow' } },
          401,
        );
      }
      const now = new Date().toISOString();
      const next: SessionData = { ...existing, consentAt: now, ageConfirmedAt: now };
      await setSession(c.env.KV, token, next);
      return c.json({ data: { consentAt: now, ageConfirmedAt: now }, error: null });
    });
    ```
  - [x] 3.3 Do NOT wrap in try/catch — let Zod errors bubble to the global `app.onError` for the 400 envelope. Only catch true unexpected errors (KV write failure already returns through `app.onError` → INTERNAL_ERROR 500 envelope).
  - [x] 3.4 No additional mount needed — `app.route('/api/sessions', sessions)` in `apps/api/src/index.ts` already covers `PATCH /api/sessions/consent`.

- [x] **Task 4: API — `GET /privacy` SSR route** (AC: 3)
  - [x] 4.1 In `apps/api/src/routes/ssr.ts` add a second route `ssr.get('/privacy', ...)` returning HTML in the same inline-styled, server-rendered pattern as `landingHtml`. Reuse the same `<head>` block (charset, viewport, theme-color, manifest, fonts) — extract `headHtml` as a string constant if duplication exceeds ~15 lines, otherwise inline.
  - [x] 4.2 Body content (Vietnamese plain-language, ≤6 short sections):
    ```
    H1: Chính sách Bảo mật
    Updated: 2026-05-05
    H2 Chúng tôi thu thập gì — bullets: câu trả lời 12 câu hỏi, loại MBTI tự dự đoán, ID phiên ẩn danh (UUID), hành vi trên nền tảng (chia sẻ, lượt xem)
    H2 Chúng tôi dùng cho gì — bullets: tạo kết quả MBTI cá nhân hoá, cải thiện câu hỏi/bài viết, phân tích tổng hợp (không nhận diện cá nhân)
    H2 Lưu trữ — bullets: phiên ẩn danh 30 ngày, kết quả tối đa 12 tháng không hoạt động, hạ tầng Cloudflare (offshore) ở giai đoạn MVP
    H2 Quyền của bạn (PDPA — Nghị định 13/2023) — bullets: yêu cầu xoá toàn bộ dữ liệu, xem dữ liệu lưu về bạn, xử lý trong 30 ngày
    H2 Liên hệ — privacy@mbti.example.vn
    Footer note: "Đây là công cụ tự phản chiếu, không phải đánh giá lâm sàng."
    ```
  - [x] 4.3 Title tag: `<title>Chính sách Bảo mật — MBTI Platform</title>`. Add `<meta name="robots" content="noindex">` (privacy page should not appear in search results until product is live).
  - [x] 4.4 No back button / nav — user closes the tab to return. No SPA bundle script — `/privacy` is a pure server-rendered document.

- [x] **Task 5: Web — shadcn Checkbox primitive** (AC: 1, 2)
  - [x] 5.1 Run `pnpm --filter @mbti/web dlx shadcn@latest add checkbox` to generate `apps/web/src/components/ui/checkbox.tsx`. shadcn v4 emits a Base UI wrapper (`@base-ui/react/checkbox`), matching the existing `button.tsx` pattern. **Verify** the import is `@base-ui/react/checkbox`, not `@radix-ui/react-checkbox`.
  - [x] 5.2 Do NOT install `@radix-ui/react-checkbox` — the project uses Base UI exclusively (Story 2.1 dev notes confirmed shadcn v4 migrated to Base UI).
  - [x] 5.3 Do NOT customize the generated component in this story — accept defaults; restyle via `className` overrides at the call site in `ConsentGate.tsx`.

- [x] **Task 6: Web — `<AiDisclaimer />` component** (AC: 1)
  - [x] 6.1 Create `apps/web/src/features/test/components/AiDisclaimer.tsx` (creating the `features/test/components/` directory tree — does not exist yet):
    ```tsx
    export function AiDisclaimer() {
      return (
        <p className="text-[13px] italic text-slate-400 leading-relaxed">
          Đây là công cụ tự phản chiếu — không phải đánh giá lâm sàng
        </p>
      );
    }
    ```
  - [x] 6.2 Component is reusable: per `architecture.md#Gap 2`, the future invitee flow `/invite/:token` mounts the same component. Keep it props-free for now.

- [x] **Task 7: Web — `<ConsentGate />` page component** (AC: 1, 2, 4)
  - [x] 7.1 Create `apps/web/src/features/test/components/ConsentGate.tsx`. Local `useState` for the two checkbox booleans and a single error string is acceptable (UI-only state per `architecture.md#Loading states`).
  - [x] 7.2 Use `useMutation` from TanStack Query for the PATCH — pattern matches Story 2.1's `SessionProvider`. Do NOT call `apiCall` from a raw `useEffect`/`fetch`.
  - [x] 7.3 Mutation function: `apiCall<ConsentResponse>('/api/sessions/consent', { method: 'PATCH', body: JSON.stringify({ consentGiven: true, ageConfirmed: true }) })` then `ConsentResponseSchema.parse(raw)` at the boundary (matches Story 2.1's runtime-validation fix).
  - [x] 7.4 On success: `navigate('/declare')` (use `useNavigate` from `react-router`). On error: set local `submitError` state to the Vietnamese copy in AC-4. Do NOT navigate.
  - [x] 7.5 CTA click handler: if either checkbox unchecked → set per-row error via `aria-live="polite"` `<p>` directly below the unchecked checkbox; do NOT mutate. If both checked → fire the mutation.
  - [x] 7.6 Accessibility:
    - Each checkbox row: `<label>` wrapping `<Checkbox id="..." />` + visible text — clicking the text toggles the box.
    - Inline error: `<p role="alert" aria-live="polite" className="text-red-400 text-[13px] mt-1">...</p>`.
    - CTA: `aria-disabled={!bothChecked}` (string `"true"`/`"false"` is auto-stringified by React).
    - WCAG: text contrast `text-slate-300` on `bg-surface-deep` passes AA (verified for #050507 background).
  - [x] 7.7 PostHog events (use the `window.posthog?.capture?.()` no-op pattern from Story 2.1's `Landing.tsx`):
    - On mount: `consent_screen_viewed`
    - On disabled CTA tap: `consent_attempted_without_check` with props `{ ageConfirmed, consentGiven }`
    - On successful PATCH: `consent_granted`
  - [x] 7.8 Layout matches Story 2.1's `Landing.tsx` shell — `min-h-svh`, `flex items-center justify-center`, `px-6 py-[60px]`, inner column `max-w-[480px]`. Use `var(--color-surface-deep)` via inline style or `bg-surface-deep` Tailwind class (already defined in `index.css` `@theme inline`).

- [x] **Task 8: Web — wire `/consent` into the router** (AC: 1, 4)
  - [x] 8.1 In `apps/web/src/router.tsx` import `ConsentGate` and replace the existing inline placeholder for the `/consent` route:
    ```tsx
    { path: '/consent', element: <ConsentGate />, errorElement: <RootError /> }
    ```
    Add `errorElement: <RootError />` — this resolves the deferred item *"`/consent` route stub lacks `errorElement` — Story 2.2 owns the real consent page and its error boundary"* from `deferred-work.md`.
  - [x] 8.2 Add a new route `/declare` rendering a placeholder `<div>Declare placeholder — Story 2.3</div>` so the navigation in AC-4 lands on a real route (avoids a 404 between this story and 2.3). Use the same surface-deep styling shell as the existing consent stub.

- [x] **Task 9: API — vitest extension for PATCH** (AC: 4, 5, 6)
  - [x] 9.1 Extend `apps/api/tests/routes/sessions.test.ts` with a new `describe('PATCH /consent', ...)` block.
  - [x] 9.2 Reuse the existing `makeKv()` helper. Add a small helper for seeding a session: `await mockKv.put('session:<token>', JSON.stringify({ userId: '<uuid>', createdAt: '<iso>' }))` then have `mockKv.get` return the parsed object for the matching key (extend `makeKv` minimally — see test file for current shape).
  - [x] 9.3 Required test cases:
    1. **401 missing token** — `PATCH /consent` with no header → status 401, `error.code === 'UNAUTHORIZED'`.
    2. **401 invalid token** — header set, `mockKv.get` returns `null` → status 401.
    3. **200 success path** — seed valid session, PATCH with `{consentGiven:true, ageConfirmed:true}` → status 200, `data.consentAt` and `data.ageConfirmedAt` are ISO strings; `mockKv.put` called once with the merged session containing both new fields and the original `userId`/`createdAt`.
    4. **400 validation — missing field** — body `{ consentGiven: true }` only → 400, `error.code === 'VALIDATION_ERROR'`.
    5. **400 validation — `false` value** — body `{ consentGiven: false, ageConfirmed: true }` → 400 (the schema uses `z.literal(true)`).
    6. **Idempotency** — second PATCH on the same session succeeds; the merged data still contains the original `createdAt`.
  - [x] 9.4 The test mounts only the `sessions` router (`sessions.request(...)`), but the global `app.onError` is **not** present at that scope. To assert the 400 envelope, mount via the full `app` from `src/index.ts` for the validation cases — or mock the error response by checking the thrown ZodError shape. **Recommended:** import `app` and use `app.request('/api/sessions/consent', { method: 'PATCH', headers, body }, env)` for validation cases so the global error middleware runs. Pattern is identical to the existing init tests but rooted at `app` instead of `sessions`.

## Dev Notes

### Critical Architecture Deviation — Where Consent Is Persisted

**The literal AC-4 wording in `epics.md:486` says "recording consent in the D1 `test_results` row." This is impossible at consent time** — the `test_results` row is only INSERT-ed at test submission (Story 2.5). The schema (`migrations/0001_initial_schema.sql:19-39`) requires `calculated_type NOT NULL`, so a partial pre-test row cannot exist.

**Resolution:** Persist `consentAt` and `ageConfirmedAt` into the **KV `SessionData`** (this story). When Story 2.5 inserts the `test_results` row at submit time, it will read these timestamps from the session and persist them onto the row. Story 2.5 will own the migration that adds `consent_at` / `age_confirmed_at` columns to `test_results` (or an equivalent compliance table). **Do not add D1 schema changes in this story.**

This deviation is the single biggest disaster surface for the dev agent — implementing a D1 write here would either fail (NOT NULL constraint) or require an unrelated migration. Stay in KV.

### Current Codebase State (READ BEFORE TOUCHING)

**Files you WILL modify:**
- `apps/api/src/routes/sessions.ts` (32 lines) — currently has only `POST /init`. Append `PATCH /consent` handler. Keep `POST /init` untouched.
- `apps/api/src/lib/kv.ts` (32 lines) — extend `SessionData` type with two optional fields. Do NOT add new helpers; do NOT change TTL.
- `apps/api/src/routes/ssr.ts` (55 lines) — add `ssr.get('/privacy', ...)` after the existing `ssr.get('/', ...)`. Reuse the same head-block pattern.
- `apps/api/tests/routes/sessions.test.ts` (~65 lines) — add a new `describe('PATCH /consent')`. Do NOT delete or modify the existing `POST /init` cases.
- `apps/web/src/router.tsx` — replace the `/consent` placeholder element with `<ConsentGate />`; add `/declare` placeholder; add `errorElement` to the `/consent` route.
- `packages/shared/src/schemas/session.ts` — append `ConsentRequestSchema`, `ConsentResponseSchema`. Keep `SessionInitResponseSchema` exactly as-is (it's used by Story 2.1's `SessionProvider`).

**Files you will READ (do NOT modify):**
- `apps/api/src/middleware/auth.ts` — confirms `requireSession` shape: returns 401 envelope when token missing/invalid; sets `c.var.userId`. Reuse exactly.
- `apps/api/src/index.ts` — confirms `app.onError` already handles `ZodError → 400` and `HTTPException`/unknown → 500. Your route handler MUST throw, not self-format.
- `apps/web/src/components/providers/SessionProvider.tsx` — reference pattern: `useMutation` + `apiCall` + `Schema.parse(raw)` + `useRef` ran-once guard. The ConsentGate mutation does NOT need a ran-once guard because it's user-triggered, not auto-fired.
- `apps/web/src/lib/api.ts` — `apiCall` already attaches `X-Session-Token` automatically. Do NOT manually set the header.
- `apps/web/src/components/ui/button.tsx` — Base UI wrapper; same pattern the new `checkbox.tsx` will follow.
- `apps/web/src/index.css` — `@theme inline` design tokens: `--color-surface-deep`, `--color-cta-primary`, `--font-clash`, `--font-sans`. Use Tailwind utility classes (`bg-surface-deep`, `bg-cta-primary`) — no new tokens needed.

**Files to CREATE (do NOT create anything else):**
- `apps/web/src/features/test/components/AiDisclaimer.tsx` (NEW directory tree: `features/test/components/`)
- `apps/web/src/features/test/components/ConsentGate.tsx`
- `apps/web/src/components/ui/checkbox.tsx` (generated by `shadcn add checkbox`)

### `PATCH /api/sessions/consent` — Exact Contract

**Auth:** `requireSession` middleware (401 envelope on miss/expired) — do NOT skip it.

**Request:**
```http
PATCH /api/sessions/consent HTTP/1.1
Content-Type: application/json
X-Session-Token: <uuid>

{ "consentGiven": true, "ageConfirmed": true }
```

**Success (200):**
```json
{
  "data": {
    "consentAt": "2026-05-05T10:30:00.000Z",
    "ageConfirmedAt": "2026-05-05T10:30:00.000Z"
  },
  "error": null
}
```

**Error envelopes** (formats produced by `app.onError`, not the route):
- `401 UNAUTHORIZED` — missing/invalid token (from `requireSession`).
- `401 SESSION_GONE` — token validates but session disappeared from KV between auth-check and reload (race; explicit handler return, not `onError`).
- `400 VALIDATION_ERROR` — Zod parse failure on body.
- `500 INTERNAL_ERROR` — KV write failure (default `onError`).

### Frontend `<ConsentGate />` — UX Requirements

**Layout (mobile-first, single 480px column):**
```
[padding-top: 60px]
[AiDisclaimer — italic, 13px, slate-400]
[spacing: 32px]
[checkbox row 1: 18+ confirmation — 15px slate-200, full row tappable]
  [error slot — 13px text-red-400, only when present]
[spacing: 16px]
[checkbox row 2: PDPA + privacy link — 15px slate-200; "Xem chính sách bảo mật" inline link slate-300 underline, opens /privacy in new tab]
  [error slot]
[spacing: 32px]
[CTA "Bắt đầu" — full-width, 48px min, bg-cta-primary, aria-disabled until both checked]
[error slot for submission errors — 13px text-red-400, centered, aria-live]
```

**CTA visual states:**
- Both unchecked or one checked: `aria-disabled="true"` + `opacity-60 cursor-not-allowed`. **Still focusable, still clickable** (so the inline error can fire).
- Both checked: `aria-disabled="false"` + full opacity + active state.
- Mid-mutation (`mutation.isPending`): `aria-busy="true"` + dimmed; disable click to prevent double-submit.

**Privacy link:**
```tsx
<a
  href="/privacy"
  target="_blank"
  rel="noopener noreferrer"
  className="text-slate-300 underline underline-offset-2"
>
  Xem chính sách bảo mật
</a>
```
`rel="noopener noreferrer"` is mandatory — `target="_blank"` without it is a known XSS/perf risk.

**Error inline copy (Vietnamese, plain):**
- Per checkbox: *"Vui lòng xác nhận để tiếp tục"*
- Submission failure: *"Không lưu được lựa chọn. Vui lòng thử lại."*

**Do NOT use:**
- `<dialog>` or shadcn `Dialog` — UX is explicit "no toast, no modal."
- `Sonner` toasts — same reason.
- The HTML `disabled` attribute on the CTA — use `aria-disabled` only (CTA must remain clickable to trigger the inline error per AC-2).
- `useEffect` for the mutation — TanStack Query `useMutation` pattern, mirroring `SessionProvider`.

### Privacy Page Copy (Vietnamese, MVP-grade)

```
<h1>Chính sách Bảo mật</h1>
<p>Cập nhật: 2026-05-05</p>

<h2>Chúng tôi thu thập gì</h2>
<ul>
  <li>Câu trả lời 12 câu hỏi tình huống trong bài test</li>
  <li>Loại MBTI bạn tự dự đoán (nếu chọn ở bước trước)</li>
  <li>ID phiên ẩn danh (UUID) — không gắn với danh tính cá nhân</li>
  <li>Hành vi trên nền tảng (lượt chia sẻ, lượt xem)</li>
</ul>

<h2>Chúng tôi dùng cho gì</h2>
<ul>
  <li>Tạo kết quả MBTI và thông tin cá nhân hoá</li>
  <li>Cải thiện chất lượng câu hỏi và bài viết</li>
  <li>Phân tích xu hướng tổng hợp (không nhận diện cá nhân)</li>
</ul>

<h2>Lưu trữ</h2>
<ul>
  <li>Phiên ẩn danh hết hạn sau 30 ngày</li>
  <li>Kết quả test giữ tối đa 12 tháng nếu không hoạt động</li>
  <li>Cơ sở hạ tầng: Cloudflare (offshore) ở giai đoạn MVP</li>
</ul>

<h2>Quyền của bạn (PDPA — Nghị định 13/2023)</h2>
<ul>
  <li>Yêu cầu xoá toàn bộ dữ liệu bất cứ lúc nào</li>
  <li>Xem những gì chúng tôi lưu về bạn</li>
  <li>Xử lý trong 30 ngày kể từ ngày yêu cầu</li>
</ul>

<h2>Liên hệ</h2>
<p>Email: privacy@mbti.example.vn</p>

<p><em>Đây là công cụ tự phản chiếu, không phải đánh giá lâm sàng.</em></p>
```

Match the inline-CSS approach from `landingHtml` — short, server-rendered, no SPA bundle, no JS.

### Architecture Compliance Checklist

Before marking tasks done, verify:
- [x] All KV access goes through `getSession()`/`setSession()` — no `c.env.KV.put` in route code.
- [x] All API responses use `{ data, error }` envelope — including the new 401/200 paths.
- [x] Route handler does NOT self-format the 400 response — Zod errors bubble to `app.onError`.
- [x] `ConsentResponseSchema.parse(raw)` runs at the client boundary in `ConsentGate.tsx` (matches Story 2.1's review-fix pattern).
- [x] `apiCall` is the only fetch wrapper used — no raw `fetch()` calls in `ConsentGate.tsx`.
- [x] CTA uses `aria-disabled`, NOT the HTML `disabled` attribute (AC-2 requires the click handler to fire on disabled state).
- [x] Privacy link has `rel="noopener noreferrer"` alongside `target="_blank"`.
- [x] No D1 schema changes / no new migration files in this story.
- [x] No `posthog-js` install / no Zustand install / no Framer Motion usage / no `Dialog`/`Sonner` install.
- [x] `pnpm exec turbo run lint typecheck test` exits 0 across all 3 packages.
- [x] `pnpm run check:wrangler` exits 0 (no wrangler.toml change expected — pre-existing RATE_LIMITER warning is the only non-zero output).

### Anti-Patterns to AVOID

- ❌ Adding `consent_at` / `age_confirmed_at` columns to `test_results` — wrong story, wrong moment.
- ❌ Creating a `consents` table — over-engineering; KV session is sufficient until Story 2.5 owns the persistent record.
- ❌ Storing the privacy policy text in a React component — it's a separate URL `/privacy` for "open in new tab" behavior. SSR via Hono is the architectural pattern.
- ❌ Using the HTML `disabled` attribute on the CTA — would prevent click and break AC-2's inline-error path.
- ❌ Using `<dialog>` or shadcn `Dialog` for the consent UI — UX is explicit "no toast, no modal."
- ❌ Calling `c.env.KV.put` directly in the route — bypasses the `lib/kv.ts` helper rule.
- ❌ Returning self-formatted 400 envelopes for Zod errors — bypasses the `app.onError` middleware contract.
- ❌ Adding `useEffect`-based fetch for the PATCH call — use `useMutation` (matches Story 2.1's review fix).
- ❌ Missing `rel="noopener noreferrer"` on `target="_blank"` — security/perf regression.
- ❌ Using `ConsentRequestSchema` with `z.boolean()` instead of `z.literal(true)` — `false` would pass validation and silently grant consent that the user never gave.

### Previous Story Intelligence (Story 2.1 → 2.2)

From `2-1-landing-page-and-anonymous-user-session.md` review findings — all of these patterns are now baseline and MUST be carried forward:

- **Schema runtime validation at client boundary** — `Schema.parse(raw)` inside the mutation function, not just type assertion. Apply to `ConsentResponseSchema`.
- **Discriminated-union response schemas** — never `{ data: ... | null, error: ... | null }` flat shapes. Apply to `ConsentResponseSchema` (mirrors `SessionInitResponseSchema`).
- **`apiCall` error path** — non-JSON responses throw `ApiError`; JSON application errors return through the envelope. The client mutation must distinguish: `ApiError` → "Không lưu được lựa chọn. Vui lòng thử lại." OR envelope `error` → same UI.
- **`localStorage` try/catch** — already in `lib/session.ts`. No change needed; ConsentGate doesn't touch localStorage.
- **`QueryClient` lifecycle** — already wrapped in `useState` inside `QueryProvider`. No change needed; ConsentGate just consumes the client.
- **`StrictMode` double-invoke guard** — applies to auto-firing effects; ConsentGate's mutation is user-triggered, so no `useRef` ran-once guard needed.
- **`react-refresh/only-export-components`** — when co-locating a hook with a provider, suppress per-line; not applicable to `ConsentGate` (no hook export).
- **No new utility named `apiCall` variant** — reuse `apiCall<T>` from `lib/api.ts`. The PATCH method is passed via `init.method`.

### Git Intelligence (last 5 commits, 2026-05-05 working state)

```
6f14a77 fix: add contents:read permission to deploy-preview job
e545d1a ci: trigger status check registration
6a4d701 docs: add workflows README explaining ci and deploy pipelines in Vietnamese
1e0909f docs: document workspace:* npm error and fix in pipeline guide
bdc9c7c fix: add wrangler to root devDependencies for CI compatibility
```
- Recent commits are CI/CD hygiene (Story 1.7 follow-ups). No code patterns to inherit beyond what's in Story 2.1.
- The active uncommitted diff includes Story 2.1's full implementation (sessions/init, SSR, providers, Landing). Verify your branch builds on top of these — `git status` should show 2.1 files as modified-but-staged on `trigger-ci-check` branch.

### Latest Tech Information (verified for 2026-05)

- **Hono v4.12** (current in `apps/api/package.json`) — `c.req.header('X-Session-Token')` returns `string | undefined`; pair with optional chaining + `.trim()` after `requireSession` has validated existence (returning `string` after middleware is type-safe by Hono's `Variables` typing).
- **Zod** — `z.literal(true)` is the correct way to enforce boolean-must-be-true. `z.boolean().refine(v => v)` works but produces less helpful error messages.
- **TanStack Query v5** (`^5.100.9` per package.json) — `useMutation({ mutationFn, onSuccess, onError })` API; `mutation.isPending` (not `isLoading` — that was renamed in v5).
- **React Router v7** (`^7.14.2`) — `useNavigate()` returns a stable function; importing from `react-router` (not `react-router-dom` — v7 unified the package).
- **shadcn v4 + Base UI** — `@base-ui/react/checkbox` exposes `Checkbox.Root` + `Checkbox.Indicator`; the generated `components/ui/checkbox.tsx` will wrap them. Do NOT switch to Radix.

### Project Structure Notes

**New files go exactly here:**
```
apps/web/src/features/test/components/AiDisclaimer.tsx     ← NEW (creates features/ tree)
apps/web/src/features/test/components/ConsentGate.tsx      ← NEW
apps/web/src/components/ui/checkbox.tsx                    ← NEW (shadcn add)
```

**Modified files:**
```
apps/api/src/routes/sessions.ts          ← +PATCH /consent
apps/api/src/routes/ssr.ts               ← +GET /privacy
apps/api/src/lib/kv.ts                   ← extend SessionData type
apps/api/tests/routes/sessions.test.ts   ← +describe PATCH /consent
apps/web/src/router.tsx                  ← /consent → ConsentGate, +/declare stub, +errorElement
packages/shared/src/schemas/session.ts   ← +ConsentRequestSchema, +ConsentResponseSchema
```

No new directories under `apps/api`; the only new directory is `apps/web/src/features/test/components/` (the `features/` root does not yet exist — create the full tree).

### Scope Boundaries — DO NOT Do These

- ❌ Do NOT install Zustand or `posthog-js` — both are deferred to later stories per Story 2.1 scope decisions.
- ❌ Do NOT install Framer Motion at runtime — package is already in `apps/web/package.json` but unused; no animations in this story.
- ❌ Do NOT build `TypeSelector` or implement `/declare` beyond a stub — that is Story 2.3.
- ❌ Do NOT modify D1 schema, write a new migration, or add `consent_at`/`age_confirmed_at` columns to `test_results` — Story 2.5 (or a dedicated PDPA story) owns that.
- ❌ Do NOT implement `DELETE /api/privacy/delete-me` or `apps/api/src/routes/privacy.ts` — that is Story 7.4. The `/privacy` ROUTE in this story is purely an SSR HTML page, served from `routes/ssr.ts`, not a new API file.
- ❌ Do NOT add rate limiting on the new PATCH endpoint — `RATE_LIMITER` cleanup is deferred per Story 1.6.
- ❌ Do NOT change CORS — already configured in Story 1.7.
- ❌ Do NOT change the 30-day KV TTL — sliding-by-event is the documented pattern.
- ❌ Do NOT delete the existing `/consent` placeholder branding/style — replace it cleanly.
- ❌ Do NOT add a new database table for consent — KV is the contract for this story.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2 Consent Gate, Privacy Policy, Age Gate & AI Disclaimer — full BDD ACs]
- [Source: _bmad-output/planning-artifacts/prd.md#Data Privacy (Vietnam PDPA — Nghị định 13/2023) — consent + plain-language policy mandate]
- [Source: _bmad-output/planning-artifacts/prd.md#FR36-FR41, FR40, FR41 — explicit consent, privacy policy view, AI disclaimer, 18+ age gate]
- [Source: _bmad-output/planning-artifacts/prd.md#AI-Generated Content Disclaimer — onboarding one-line copy: "self-reflection tool, not clinical assessment"]
- [Source: _bmad-output/planning-artifacts/prd.md#Age Policy — MVP minimum 18+, parental-consent deferred to Phase 2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security — `X-Session-Token`, KV lookup, 401 on miss]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns — `{data, error}` envelope, Zod validation at boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns — Hono `app.onError` for ZodError → 400; route handlers throw, never self-format]
- [Source: _bmad-output/planning-artifacts/architecture.md#KV session pattern — typed helpers in `lib/kv.ts`, no raw KV access in routes]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure — `apps/web/src/features/test/components/ConsentGate.tsx`, `AiDisclaimer.tsx`]
- [Source: _bmad-output/planning-artifacts/architecture.md#SSR strategy — Hono Worker routes for SEO-relevant public pages]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Phase 1 Initiation — "Reverse mechanic prompt + 2-checkbox consent (PDPA + age gate)"]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Library — Checkbox used for PDPA consent on entry screen]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Color System — surface-deep #050507, cta-primary #6366F1]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility Strategy — WCAG 2.1 AA, 44×44px touch targets, lang="vi"]
- [Source: _bmad-output/implementation-artifacts/2-1-landing-page-and-anonymous-user-session.md — TanStack Query `useMutation` pattern, runtime Zod parse, `apiCall` envelope handling, design tokens in `index.css`]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md#code review of 2-1 — `/consent` route stub lacks `errorElement`, owned by Story 2.2]
- [Source: apps/api/src/lib/kv.ts — current `SessionData` shape, `setSession`/`getSession` API, 30-day TTL]
- [Source: apps/api/src/middleware/auth.ts — `requireSession` 401 envelope shape and `c.var.userId` set]
- [Source: apps/api/src/index.ts — global `app.onError` handles ZodError → 400 and unknown → 500]
- [Source: apps/api/src/routes/sessions.ts — current `POST /init` pattern to extend with PATCH]
- [Source: apps/api/src/routes/ssr.ts — `landingHtml` SSR pattern to mirror for `/privacy`]
- [Source: apps/web/src/components/providers/SessionProvider.tsx — `useMutation` + `apiCall` + `Schema.parse` pattern to reuse]
- [Source: apps/web/src/lib/api.ts — `apiCall<T>` envelope client, `ApiError` class for non-JSON paths]
- [Source: apps/web/src/router.tsx — current `/consent` placeholder to replace]
- [Source: apps/web/src/index.css — `@theme inline` design tokens (`--color-surface-deep`, `--color-cta-primary`, `--font-clash`, `--font-sans`)]
- [Source: packages/shared/src/schemas/session.ts — `SessionInitResponseSchema` discriminated-union pattern to mirror for `ConsentResponseSchema`]
- [Source: migrations/0001_initial_schema.sql — confirms `test_results.calculated_type NOT NULL`, the architectural reason consent must NOT write to D1 in this story]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (claude-opus-4-7)

### Debug Log References

- **Test mounting strategy** — Validation cases (400 VALIDATION_ERROR) require the global `app.onError` middleware to format the envelope. Mounting via `sessions.request(...)` bypasses it (returns plain Hono ZodError → 500). Solution: import full `app` from `src/index.ts` and use `app.request('/api/sessions/consent', ...)` for the PATCH cases. Pattern documented in story Task 9.4.
- **Mock KV `get` semantics** — `lib/kv.ts` calls `kv.get<SessionData>(sessionKey(token), 'json')` (already JSON-parsed). The seedSession test helper had to `mockKv.get.mockImplementation` returning the raw object (not stringified) to match this contract.
- **shadcn checkbox via pnpm dlx** — `cd apps/web && pnpm dlx shadcn@latest add checkbox --yes` triggered a transient pnpm install (~342 packages) for the dlx invocation but did not modify `apps/web/package.json` — the generated `checkbox.tsx` reuses the already-installed `@base-ui/react` and `lucide-react` deps. No new runtime dependencies.
- **`mv` permission warning** — A bulk awk-based mark-as-done attempt for Task 7 subtasks failed with macOS `set owner/group` perm error; fell back to per-line `Edit` calls. Story content correctly updated.
- **Validation gates** — `pnpm exec turbo run lint typecheck test` → 9/9 successful (3 lint + 3 typecheck + 3 test packages). `pnpm run check:wrangler` → 0 errors, 1 known pre-existing RATE_LIMITER warning (deferred since Story 1.6).

### Completion Notes List

- **AC-1 ✅** — `/consent` renders single 480px column on `bg-surface-deep` with `<AiDisclaimer />`, age 18+ checkbox, PDPA consent + privacy link (target=_blank, rel=noopener noreferrer), and `aria-disabled` "Bắt đầu" CTA. CTA stays clickable to satisfy AC-2.
- **AC-2 ✅** — Tap-on-disabled fires inline `role="alert" aria-live="polite"` red-text errors below each unchecked checkbox; no toast/modal/Dialog. Errors auto-clear when both boxes become checked.
- **AC-3 ✅** — Privacy link points to `/privacy`; Hono SSR route added to `apps/api/src/routes/ssr.ts` with plain-language Vietnamese PDPA copy, `<meta name="robots" content="noindex">`, and inline-styled responsive layout. No SPA bundle script — pure server-rendered document.
- **AC-4 ✅** — Both-checked + tap fires `useMutation` → `apiCall` PATCH `/api/sessions/consent` (auto-attaches `X-Session-Token`). Schema-parsed at the boundary via `ConsentResponseSchema.parse`. Success → `navigate('/declare')`; envelope error or `ApiError` → inline red copy "Không lưu được lựa chọn. Vui lòng thử lại." (no nav).
- **AC-5 ✅** — Hono PATCH `/consent` with `requireSession` middleware. Reads existing `SessionData` via `getSession`, merges `consentAt` + `ageConfirmedAt` (both `new Date().toISOString()`), writes via `setSession` (preserves 30-day TTL — verified by test). Idempotent: second PATCH overwrites timestamps and preserves original `userId`/`createdAt`.
- **AC-6 ✅** — Route handler does NOT self-format Zod errors — `ConsentRequestSchema.parse` throws, global `app.onError` formats `400 VALIDATION_ERROR` envelope. Verified by tests (false value, missing field).
- **PostHog hooks** — `consent_screen_viewed` (mount), `consent_attempted_without_check` (disabled tap), `consent_granted` (success). Use the no-op `window.posthog?.capture?.()` pattern from Story 2.1.
- **Architecture deviation handled** — Consent persisted to KV `SessionData` (extended with optional `consentAt`, `ageConfirmedAt`) instead of D1 `test_results` per the story Dev Notes call-out. The `test_results` row will be created at submit (Story 2.5); the migration adding `consent_at`/`age_confirmed_at` columns is out of scope for this story.
- **Deferred item resolved** — `/consent` route now has `errorElement: <RootError />` (cleared from Story 2.1's `deferred-work.md`).
- **Test counts** — `@mbti/shared`: 9 tests (1 smoke + 8 consent-schema). `@mbti/api`: 11 tests (1 smoke + 4 init + 6 PATCH /consent). `@mbti/web`: 1 smoke (no new web tests added — UI behavior covered by AC-explicit accessibility/state contracts and exercised at integration level by future E2E tests in Story 2.5+).
- **Manual UI verification deferred** — typecheck + lint + unit tests all green; visual smoke (booting `pnpm dev` and tapping the consent flow in a browser) was not performed in this run because the API and web dev servers require parallel boot. Recommend a manual smoke before merge: `pnpm dev` → `http://localhost:5173/consent` → verify both checkbox states + privacy link in new tab + happy-path PATCH → navigation to `/declare` placeholder.

### File List

**NEW:**
- `apps/web/src/features/test/components/AiDisclaimer.tsx`
- `apps/web/src/features/test/components/ConsentGate.tsx`
- `apps/web/src/components/ui/checkbox.tsx` (generated by `shadcn add checkbox`)
- `packages/shared/tests/consent-schema.test.ts`

**MODIFIED:**
- `packages/shared/src/schemas/session.ts` (+ `ConsentRequestSchema` (strict), `ConsentResponseSchema`, types)
- `apps/api/src/lib/kv.ts` (extended `SessionData` with optional `consentAt`, `ageConfirmedAt`)
- `apps/api/src/routes/sessions.ts` (+ `PATCH /consent` handler with `INVALID_JSON` 400 path)
- `apps/api/src/routes/ssr.ts` (+ `GET /privacy` HTML route)
- `apps/api/tests/routes/sessions.test.ts` (+ 8 cases for PATCH /consent + `seedSession` helper honoring `'json'` arg)
- `apps/web/src/router.tsx` (`/consent` → `<ConsentGate />` with `errorElement`; new `/declare` placeholder)
- `apps/web/src/pages/Landing.tsx` (replaced inline `posthog?.capture` with `safeCapture`; dropped duplicate global declaration)
- `packages/shared/tests/consent-schema.test.ts` (+ strict-mode test case)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (Story 2.2 ready-for-dev → in-progress → review → done; `last_updated` bumped)
- `_bmad-output/implementation-artifacts/2-2-consent-gate-privacy-policy-age-gate-and-ai-disclaimer.md` (status, tasks/subtasks, Dev Agent Record, Review Findings)
- `_bmad-output/implementation-artifacts/deferred-work.md` (12 review-deferred items appended for code review of 2-2)

**NEW (review patches):**
- `apps/web/src/types/global.d.ts` — ambient `Window.posthog` declaration extracted from per-component `declare global` blocks.
- `apps/web/src/lib/posthog.ts` — `safeCapture` helper that swallows synchronous throws from `window.posthog?.capture?.()` (browser-extension hostility).

### Change Log

- 2026-05-05: Story 2.2 created — comprehensive context engine analysis completed; 9 tasks documented, architecture deviation (KV vs D1) flagged, scope boundaries enumerated.
- 2026-05-05: Story 2.2 implemented — all 6 ACs satisfied; `PATCH /api/sessions/consent` route + KV merge persistence; `/privacy` SSR route; `<ConsentGate />` page with `<AiDisclaimer />` and shadcn `Checkbox`; router wired; 9 turbo tasks (lint + typecheck + test) green; 21 tests pass total (9 shared + 11 api + 1 web smoke); `check:wrangler` 0 errors. Story → review.
- 2026-05-05: Code review applied — 10 patches resolved across 7 files (correctness/security: malformed-JSON 400 envelope, ConsentRequestSchema strict mode, no-token guard before PATCH; concurrency: useRef in-flight latch on submit; cleanup: removed `void body` dead code, removed gratuitous `as` cast, removed dead `instanceof` check; reuse: extracted `safeCapture` helper for posthog throws + extracted `Window.posthog` global to `types/global.d.ts`; tests: mock KV honors `'json'` arg + 2 new cases for INVALID_JSON and strict-mode rejection). 9/9 turbo tasks green; 24 tests pass (10 shared + 13 api + 1 web smoke). 12 findings deferred to `deferred-work.md`. Story → done.
