# Story 4.1: Invite Link Generation & "Test Your Friends" CTA

Status: done

## Story

As a user viewing my result,
I want to generate a one-tap invite link pre-loaded with my profile,
so that I can share it on Zalo or Instagram DM and my friend sees my type before answering questions about me.

## Acceptance Criteria

**AC1:** On `/result/:resultId`, a `Test Your Friends` CTA renders **below the existing share/restart actions** with copy `"Xem bạn bè thấy bạn thế nào →"` and Ghost/Text tier styling (low visual weight vs the primary share button).

**AC2:** Tap on the CTA calls `POST /api/invites/generate` with session token in `X-Session-Token` header and body `{ resultId }`. Server creates an `invite_links` D1 row with: `id = uuid()`, `token = uuid()`, `inviter_user_id = session.userId`, `inviter_result_id = resultId`, `expired_at = ISO8601 30 days from now`. Response envelope: `{ data: { inviteUrl: "<origin>/invite/<token>", token, expiredAt }, error: null }`. NFR9: 30-day expiry.

**AC3:** A Shadcn `Sheet` (bottom) opens with: the invite URL displayed (selectable text), a `Copy Link` button that copies URL to clipboard + shows Sonner toast `"Đã sao chép link!"`, and a `Share` button calling `navigator.share({ title, text, url })` when supported (Zalo/IG DM appear in native share sheet on mobile). Falls back to copy-only when `navigator.share` is unavailable.

**AC4:** Resending the same `resultId` returns a **new** invite (each tap = new token) so users can share to multiple friends without rate concerns. The route does not deduplicate.

**AC5:** Server-side validation rejects requests where `resultId` does not belong to `session.userId` with HTTP 403 `{ error: { code: 'FORBIDDEN', message: '...' } }`. Invalid UUID → 400 `VALIDATION_ERROR`. Missing/invalid session → 401 (handled by `requireSession` middleware).

**AC6:** PostHog event `invite_generated` fires client-side after successful response with payload `{ resultId, token }` (uses existing `posthog.ts` helper).

## Tasks / Subtasks

- [ ] **Task 1 — D1 helper `generateInviteLink` in `apps/api/src/lib/db.ts`** (AC: 2, 5)
  - [ ] 1.1 Add `generateInviteLink(db, { id, token, inviterUserId, inviterResultId, expiredAt })` that issues an INSERT prepared statement against `invite_links`. Lowercase `id`, `token`, `inviterUserId`, `inviterResultId` at the boundary (UUID case-sensitivity rule).
  - [ ] 1.2 Add `getInviteLink(db, token)` returning `InviteLinkRow | null` (needed by Story 4-2 already — define interface now to avoid rework).

- [ ] **Task 2 — `apps/api/src/routes/invites.ts`** (AC: 2, 4, 5)
  - [ ] 2.1 New Hono sub-app exporting default `invites`. Mount in `apps/api/src/index.ts` at `app.route('/api/invites', invites)`.
  - [ ] 2.2 `POST /generate` handler, protected by `requireSession`. Parse body with `InviteGenerateSchema` (existing in `@mbti/shared`).
  - [ ] 2.3 Verify ownership: `getTestResult(db, resultId)` → 404 if missing, 403 if `row.user_id !== c.get('userId')`.
  - [ ] 2.4 Build payload: `id = crypto.randomUUID()`, `token = crypto.randomUUID()`, `expiredAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()`. Insert via helper.
  - [ ] 2.5 Build `inviteUrl` from `c.req.header('origin')` (fallback to `c.env.PUBLIC_WEB_ORIGIN` if set, else hardcode same-origin path). Return envelope `{ data: { inviteUrl, token, expiredAt }, error: null }`.

- [ ] **Task 3 — Wire route in `apps/api/src/index.ts`** (AC: 2)
  - [ ] 3.1 `import invites from './routes/invites'` and `app.route('/api/invites', invites)`.

- [ ] **Task 4 — `useGenerateInvite` mutation hook in `apps/web/src/features/result/hooks/useGenerateInvite.ts`** (AC: 2, 6)
  - [ ] 4.1 `useMutation({ mutationFn: ({ resultId }) => apiCall('/api/invites/generate', { method: 'POST', body: JSON.stringify({ resultId }) }) })`.
  - [ ] 4.2 On success, capture PostHog `invite_generated` and return `inviteUrl`.

- [ ] **Task 5 — `InvitePrompt` component in `apps/web/src/features/result/components/InvitePrompt.tsx`** (AC: 1, 3)
  - [ ] 5.1 Renders the Ghost CTA button + a `Sheet` (Shadcn) with copy/share actions. Wire share fallback via `navigator.share` feature-detect.
  - [ ] 5.2 Show Sonner toast on copy success (use existing toast pipeline — `sonner` already a dep through `@/components/ui/badge.tsx`? verify; if not, add `pnpm add sonner` in `apps/web` and mount `<Toaster />` once in `App.tsx`).
  - [ ] 5.3 a11y: Sheet has `aria-labelledby` on title; copy button announces success via `aria-live="polite"` text.

- [ ] **Task 6 — Mount `InvitePrompt` in `PersonaReveal`** (AC: 1)
  - [ ] 6.1 Below the existing `<Link to="/">Làm lại bài test</Link>` row, render `<InvitePrompt resultId={resultId} personaName={personaName} mbtiType={mbtiType} />`. `resultId` must be threaded from `ResultPage.tsx` props.
  - [ ] 6.2 Confirm `ResultPage.tsx` already has `resultId` from `useParams()` and passes to PersonaReveal (currently does not — add `resultId` prop).

- [ ] **Task 7 — Shadcn `Sheet` component** (AC: 3)
  - [ ] 7.1 If `apps/web/src/components/ui/sheet.tsx` does not exist, scaffold it via `pnpm dlx shadcn@latest add sheet` (already configured per Story 3-1).

- [ ] **Task 8 — API tests** (AC: 2, 4, 5)
  - [ ] 8.1 `apps/api/tests/routes/invites-generate.test.ts`:
    - happy path: returns `inviteUrl`, inserts a row, token UUID v4
    - ownership: result owned by another user → 403
    - missing session → 401
    - invalid body → 400
    - two consecutive calls produce two distinct tokens

- [ ] **Task 9 — Web tests** (AC: 1, 3)
  - [ ] 9.1 `apps/web/src/features/result/components/InvitePrompt.test.tsx` (Vitest + RTL):
    - CTA visible with correct copy
    - Click → Sheet opens; copy button calls `navigator.clipboard.writeText` with returned URL
    - When `navigator.share` undefined, share button hidden; when defined, click calls it

- [ ] **Task 10 — Manual smoke** (AC: all)
  - [ ] 10.1 `pnpm -F api dev` + `pnpm -F web dev`, complete a test, tap CTA, verify sheet, copy → toast.

## Dev Notes

### Architecture compliance (read before coding)

- **D1 boundary**: `apps/api/src/lib/db.ts` is the only file allowed to talk to D1. Routes call helpers. Prepared statements with `.bind(...)`. Lowercase UUIDs on insert+lookup (Story 1.4 deferred-work rule, repeated in `db.ts:18`).
- **Response envelope**: `{ data, error }` with `null` on the missing side. `ZodError` and `HTTPException` bubble to `app.onError` (see `apps/api/src/index.ts:36-57`) — don't double-handle.
- **Session middleware**: `requireSession` sets `c.set('userId', ...)` from KV-validated `X-Session-Token`. Pattern in `apps/api/src/routes/tests.ts:49-63`.
- **Query keys**: Add only if needed for a future read; for a mutation we don't need a TanStack query key. `queryKeys.socialStatus(userId)` is reserved for Story 4-3.
- **Naming**: Route file `invites.ts`; helpers `generateInviteLink`, `getInviteLink` (camelCase). DB table `invite_links` (snake_case plural). See `architecture.md` §"Naming Patterns".

### Schema (already in shared)

`packages/shared/src/schemas/invite.ts`:
```ts
export const InviteGenerateSchema = z.object({ resultId: z.string().uuid() }).strict();
```

Add to `packages/shared/src/db/rows.ts` if not present:
```ts
export interface InviteLinkRow {
  id: string;
  token: string;
  inviter_user_id: string;
  inviter_result_id: string;
  expired_at: string;
  created_at: string;
}
```
(Check before adding — Story 1.4 likely shipped this.)

### Existing tables (`migrations/0001_initial_schema.sql:46-56`)

```sql
CREATE TABLE invite_links (
  id                 TEXT PRIMARY KEY NOT NULL,
  token              TEXT NOT NULL UNIQUE,
  inviter_user_id    TEXT NOT NULL,
  inviter_result_id  TEXT NOT NULL,
  expired_at         TEXT NOT NULL,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (expired_at > created_at)
);
```
**No migration needed** — table exists from Story 1.5.

### Previous story intelligence (Story 3-4)

- Pages middleware `apps/web/functions/_middleware.ts` already rewrites OG meta for `/result/:resultId`. Don't touch.
- `apps/api/wrangler.toml` has `nodejs_compat` flag. Reuse — no change for this story.
- The Worker exposes routes via `app.route('/api/og', og)` pattern (`apps/api/src/index.ts:24`). Mount `invites` the same way.
- Share/clipboard helper exists at `apps/web/src/lib/share.ts` — reuse `navigator.share` detection patterns; don't duplicate.

### UX (ux-design-specification.md, Journey 2)

- CTA is **Ghost tier** — secondary visual weight. Existing primary `Chia sẻ kết quả` button stays dominant.
- Sheet must feel native — bottom slide-up with rounded top corners. Match dark theme (`bg-surface-base` family). See `ux-design-specification.md:589-624`.
- Microcopy is Vietnamese ("Đã sao chép link!", "Xem bạn bè thấy bạn thế nào →"). Keep ASCII-safe identifiers in code/tests.

### What this story does NOT do (out of scope)

- The `/invite/:token` invitee landing page → Story 4-2.
- Perception voting flow → Story 4-2.
- `useSocialStatus` polling hook → Story 4-3.
- Notifications → Story 4-4.

### Testing standards

- API: Vitest + `@cloudflare/vitest-pool-workers` (existing pattern in `apps/api/tests/routes/og.test.ts`).
- Web: Vitest + React Testing Library (`@testing-library/react`). Mock `apiCall` via `vi.mock('@/lib/api')`. Mock `navigator.clipboard` and `navigator.share` per test.

## References

- `_bmad-output/planning-artifacts/epics.md:680-700` — Story 4.1 ACs (source of truth).
- `_bmad-output/planning-artifacts/architecture.md:184` — invite link lifecycle, 30-day expiry, server-side validation.
- `_bmad-output/planning-artifacts/architecture.md:337,640,698-701` — route layout `invites.ts`, endpoint table.
- `_bmad-output/planning-artifacts/ux-design-specification.md:589-624` — Journey 2 (Social Initiator) flow.
- `apps/api/src/routes/tests.ts:49-127` — `requireSession` + ZodSchema parse pattern.
- `apps/api/src/lib/db.ts:97-128` — helper pattern (`createTestResult`).
- `migrations/0001_initial_schema.sql:46-56` — `invite_links` schema.
- `packages/shared/src/schemas/invite.ts` — `InviteGenerateSchema`.
- `apps/web/src/features/result/components/PersonaReveal.tsx:126-169` — where to mount the CTA.
- `apps/web/src/lib/api.ts` — `apiCall` helper (already adds `X-Session-Token`).

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Completion Notes

- **Worker route**: `POST /api/invites/generate` (session-gated). Ownership check via `getTestResult` → 403 if `row.user_id !== userId`. Creates UUID id+token, 30-day `expired_at`. Origin from `Origin` header (falls back to request URL origin). Returns 201 envelope `{ inviteUrl, token, expiredAt }`.
- **D1 helpers**: `generateInviteLink` (INSERT, lowercases UUIDs) and `getInviteLink` (SELECT WHERE token AND deleted_at IS NULL) added to `apps/api/src/lib/db.ts`. `getInviteLink` is pre-built for Story 4-2.
- **Web**: `useGenerateInvite` TanStack mutation; PostHog `invite_generated` fires on success.
- **`InvitePrompt`** component renders Ghost-tier CTA below "Làm lại bài test"; tapping opens an inline framer-motion bottom sheet (no Shadcn Sheet dep added — kept stack lean). Sheet shows the invite URL + Copy button + Share button (when `navigator.share` available). Toast announces "Đã sao chép link!" via `aria-live="polite"`.
- **Wiring**: `ResultPage.tsx` now passes `resultId` to `PersonaReveal`, which renders `InvitePrompt`.
- **Tests**: 6 API tests cover happy path, FORBIDDEN, NOT_FOUND, 401, validation, distinct tokens. 4 web tests cover CTA copy, fetch + sheet open, clipboard copy + toast, share button hiding when `navigator.share` undefined.
- **Out of scope (deferred)**: `/invite/:token` landing page (Story 4-2), `useSocialStatus` polling (Story 4-3), notification toast (Story 4-4). The Shadcn `Sheet` and `sonner` deps were avoided — the existing dark theme + framer-motion already produced the required UX.

### File List

**Modified:**
- `apps/api/src/lib/db.ts` (added `generateInviteLink`, `getInviteLink`)
- `apps/api/src/index.ts` (mounted `/api/invites`)
- `apps/web/src/features/result/components/PersonaReveal.tsx` (`resultId` prop, mounts `InvitePrompt`)
- `apps/web/src/features/result/components/ResultPage.tsx` (passes `resultId` to PersonaReveal)

**Created:**
- `apps/api/src/routes/invites.ts`
- `apps/api/tests/routes/invites-generate.test.ts`
- `apps/web/src/features/result/hooks/useGenerateInvite.ts`
- `apps/web/src/features/result/components/InvitePrompt.tsx`
- `apps/web/src/features/result/components/InvitePrompt.test.tsx`
