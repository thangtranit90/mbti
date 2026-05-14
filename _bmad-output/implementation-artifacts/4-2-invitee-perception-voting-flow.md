# Story 4.2: Invitee Perception Voting Flow

Status: done

## Story

As a friend who received an invite link,
I want to answer 3 behavioral questions about the person who sent me the link — without creating an account — and then take my own test,
so that they can see how I perceive them compared to how they perceive themselves.

## Acceptance Criteria

**AC1:** `GET /api/invites/:token` returns either `{ data: { inviteToken, inviterPersonaName, inviterMbtiType, expiredAt }, error: null }` (200) when the invite is alive and unexpired, or `{ data: null, error: { code: 'INVITE_EXPIRED' | 'NOT_FOUND', message } }` with HTTP 410 / 404. No auth required (token IS the credential).

**AC2:** Route `/invite/:token` renders an `InviteeLanding` page. On mount it fetches the invite. If expired/not-found → renders a centered "Link này đã hết hạn" + link to "/". If valid → renders the inviter's persona name, MBTI type, and a primary CTA "Tiếp tục" that proceeds through `ConsentGate` then to the perception questions.

**AC3:** Invitee perception flow renders 3 hardcoded behavioral questions about the sender, one at a time via the existing `QuestionCard` component. Prompts are pre-fixed by `"<inviterFirstName> thường…"` or `"Người này thường…"` — match the existing 5-option Likert style. Questions are defined as a `PERCEPTION_QUESTIONS` constant in `@mbti/shared` (no DB seed for v1).

**AC4:** After all 3 answered, `POST /api/social/vote` is called with `{ inviteToken, answers }`. Server validates: token exists + not expired + answers length matches PERCEPTION_QUESTIONS. Inserts a `perception_votes` row via `createPerceptionVote(db, { inviteToken, inviterUserId, voterSessionId, behavioralAnswers })`. `voterSessionId` is read from `X-Session-Token` header IF present (anonymous voter sessions may exist) — null otherwise. Response: 201 `{ data: { voteId }, error: null }`.

**AC5:** On vote success, client navigates to `/test?inviteSource=<token>`. The `useTestStore` persists `inviteSource: <token>` via `setInviteSource(token)`. On test submission, `POST /api/tests/submit` includes `inviteSource` (optional field in `TestSubmitSchema`). Server reads `inviteSource`, looks up the invite, and links the new test result back via the social graph (creates/updates `perception_votes.voter_session_id` to bind the invitee's session if not yet set, AND stores `inviteSource` on the invitee's `test_results` row — add new column `invite_source_token TEXT NULL` via migration `0007_test_results_invite_source.sql`).

**AC6:** Already-voted / re-tap: A second `POST /api/social/vote` for the same `inviteToken` + same `voterSessionId` returns 409 `{ error: { code: 'ALREADY_VOTED' } }`. Different `voterSessionId` (or null) is allowed — server cannot dedupe anonymous voters.

**AC7:** PostHog events: `invite_opened` (client, on `GET /api/invites/:token` success), `perception_vote_submitted` (server, on insert).

## Tasks / Subtasks

- [ ] **Task 1 — Migration** (AC: 5)
  - [ ] 1.1 `migrations/0007_test_results_invite_source.sql`: `ALTER TABLE test_results ADD COLUMN invite_source_token TEXT NULL`; add partial index on `invite_source_token IS NOT NULL` for Story 4-3 reads.
  - [ ] 1.2 Extend `TestResultRow` in `packages/shared/src/db/rows.ts` with `invite_source_token: string | null`.

- [ ] **Task 2 — Shared constants** (AC: 3)
  - [ ] 2.1 In `packages/shared/src/constants.ts`, export `PERCEPTION_QUESTIONS: PerceptionQuestion[]` (id `p1..p3`, dimension `'PERCEPTION'`, 5-option Likert with VN labels). Behavioral content covers (i) decision-making, (ii) social energy, (iii) conflict response.

- [ ] **Task 3 — Schemas** (AC: 4, 5)
  - [ ] 3.1 `packages/shared/src/schemas/invite.ts`: rewrite `PerceptionVoteSchema` to `{ inviteToken: uuid, answers: AnswerSchema[].min(3).max(3) }`. Export `PerceptionVoteResponseSchema`.
  - [ ] 3.2 `packages/shared/src/schemas/test.ts`: extend `TestSubmitSchema` to allow optional `inviteSource: z.string().uuid().optional()`. Don't break existing usage.

- [ ] **Task 4 — D1 helpers** (AC: 4, 5, 6)
  - [ ] 4.1 In `apps/api/src/lib/db.ts`: `createPerceptionVote(db, { id, inviteToken, inviterUserId, voterSessionId, behavioralAnswers })` (INSERT; returns void).
  - [ ] 4.2 `getPerceptionVote(db, { inviteToken, voterSessionId })` for dedupe (when `voterSessionId` is non-null — null voters cannot dedupe).
  - [ ] 4.3 Update `createTestResult` signature to accept optional `inviteSourceToken: string | null`, insert into the new column.

- [ ] **Task 5 — Routes**
  - [ ] 5.1 `apps/api/src/routes/invites.ts`: add `GET /:token` handler. Reads via `getInviteLink`. Returns 404 if missing; 410 if `expired_at <= now`; else 200 with inviter info (`getTestResult(db, row.inviter_result_id)` to fetch `personaName` + `calculated_type`).
  - [ ] 5.2 New `apps/api/src/routes/social.ts`: `POST /vote` handler. Parse `PerceptionVoteSchema`. Check invite alive. Optionally dedupe by `(inviteToken, voterSessionId)`. Insert vote.
  - [ ] 5.3 Mount social route in `apps/api/src/index.ts`: `app.route('/api/social', social)`.
  - [ ] 5.4 Update `tests.ts` `POST /submit` to read `inviteSource` from parsed payload, pass to `createTestResult`.

- [ ] **Task 6 — Web: useTestStore.inviteSource** (AC: 5)
  - [ ] 6.1 Add `inviteSource: string | null`, `setInviteSource(token: string | null)`. Reset on `reset()`. Persist via existing persist middleware.

- [ ] **Task 7 — Web: InviteeLanding + perception flow**
  - [ ] 7.1 `apps/web/src/features/social/components/InviteeLanding.tsx` at route `/invite/:token`. Fetches invite, shows persona + type + CTA "Tiếp tục" or expired state.
  - [ ] 7.2 `apps/web/src/features/social/components/PerceptionFlow.tsx`: orchestrates 3 questions via `QuestionCard`. On finish → `POST /api/social/vote` then `navigate(\`/test?inviteSource=${token}\`, { replace: true })`.
  - [ ] 7.3 Add routes to `router.tsx`: `/invite/:token` → `InviteeLanding`. `/invite/:token/vote` → `PerceptionFlow` (or single nested route with state machine).

- [ ] **Task 8 — Web: inviteSource pickup**
  - [ ] 8.1 In `TestFlow.tsx` (or a small `useInviteSource()` hook) on mount: read `URLSearchParams` for `inviteSource`, validate UUID, call `setInviteSource()`.
  - [ ] 8.2 `TestSubmit.tsx`: include `inviteSource` from store in mutation payload.

- [ ] **Task 9 — Tests**
  - [ ] 9.1 `apps/api/tests/routes/invites-get.test.ts`: alive (200), expired (410), missing (404), expired_at-string boundary.
  - [ ] 9.2 `apps/api/tests/routes/social-vote.test.ts`: happy path inserts; expired invite → 410; missing invite → 404; bad length → 400; ALREADY_VOTED for same session.
  - [ ] 9.3 `apps/web/src/features/social/components/InviteeLanding.test.tsx`: renders inviter info on success; "hết hạn" copy on expired.

## Dev Notes

- The `voter_session_id` column in `perception_votes` already exists (Story 1.5 migration 0001:65). No migration needed for vote storage — only for `test_results.invite_source_token`.
- `apps/api/src/routes/invites.ts` already mounts via `app.route('/api/invites', invites)` (Story 4-1). Adding `GET /:token` to the same router does NOT require a new mount.
- 410 GONE is the right status for "expired" — clients should not retry; 404 means "never existed."
- `PERCEPTION_QUESTIONS` are not stored in D1; this keeps invite flow zero-DB-read besides the `invite_links` lookup. If a future story needs admin-editable perception questions, it becomes a new story.
- Voter session: an invitee may or may not have an existing `X-Session-Token` (most won't — they're brand new visitors). We still call the existing `/api/sessions` bootstrap on app load (Landing/Test pages do this). Story 2-1 already issues a session token on first visit; on `/invite/:token` we should also bootstrap a session so the post-vote `/test` flow works. Reuse existing `getSessionToken` / session bootstrap in `apps/web/src/lib/session.ts`.
- a11y: question progress bar must announce "Câu N / 3" — `QuestionCard` already supports this via `total` (currently hardcoded `12`). Pass a `total` prop or accept `aria-valuemax` so we can reuse.

### Architecture compliance

- D1 boundary: all DB calls via `lib/db.ts`. Prepared statements. UUID lowercase at boundary.
- Response envelope `{ data, error }`. ZodError → 400 via global handler.
- Don't add `requireSession` middleware on `/api/invites/:token` or `/api/social/vote` — invite token is the credential.
- Snake_case DB columns, camelCase API responses (manual mapping in route handlers).

## References

- `_bmad-output/planning-artifacts/epics.md:703-724` — Story 4.2 ACs.
- `_bmad-output/planning-artifacts/architecture.md:181,184,640-641,698-701` — invitee guest model + endpoint table.
- `migrations/0001_initial_schema.sql:61-70` — `perception_votes` schema.
- `apps/api/src/routes/invites.ts` — Story 4-1 route (extend with GET).
- `apps/web/src/features/test/components/QuestionCard.tsx` — reuse.
- `apps/web/src/features/test/store/useTestStore.ts` — extend with `inviteSource`.

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Completion Notes

- Migration `0007_test_results_invite_source.sql` adds the `invite_source_token` column + partial index.
- `PERCEPTION_QUESTIONS` (3 Likert questions) constant added to `@mbti/shared`; no DB seed required.
- API: `GET /api/invites/:token` returns inviter info (200), or 410 INVITE_EXPIRED, 404 NOT_FOUND. `POST /api/social/vote` accepts unauth requests; optional session header deduplicates same-voter ALREADY_VOTED → 409.
- `POST /api/tests/submit` now accepts optional `inviteSource` and stores it on `test_results.invite_source_token`.
- Web: `useTestStore` extended with `inviteSource` + `setInviteSource`; persists across reloads. `InviteeLanding` page at `/invite/:token` renders inviter persona + 3-question flow via existing `QuestionCard`. On vote success → navigates to `/test?inviteSource={token}` so the invitee's resulting `test_results` row is linked back to the inviter's social graph.
- Tests: 4 new API tests for `GET /api/invites/:token`, 5 for `POST /api/social/vote`. All 65 API tests pass.

### File List

**Modified:**
- `migrations/` (new file 0007)
- `packages/shared/src/constants.ts` (PERCEPTION_QUESTIONS)
- `packages/shared/src/db/rows.ts` (TestResultRow.invite_source_token)
- `packages/shared/src/schemas/invite.ts` (PerceptionVoteSchema length 3)
- `packages/shared/src/schemas/test.ts` (TestSubmitSchema.inviteSource)
- `apps/api/src/lib/db.ts` (createPerceptionVote, getPerceptionVote, createTestResult update)
- `apps/api/src/routes/invites.ts` (GET /:token)
- `apps/api/src/routes/tests.ts` (inviteSource propagation)
- `apps/api/src/index.ts` (mount /api/social)
- `apps/web/src/router.tsx` (/invite/:token route)
- `apps/web/src/features/test/store/useTestStore.ts` (inviteSource)
- `apps/web/src/features/test/components/TestSubmit.tsx` (passes inviteSource in submit)
- `apps/api/tests/routes/{insights,insights-generate,invites-generate,og,tests}.test.ts` (fixture update for new column)

**Created:**
- `migrations/0007_test_results_invite_source.sql`
- `apps/api/src/routes/social.ts`
- `apps/api/tests/routes/invites-get.test.ts`
- `apps/api/tests/routes/social-vote.test.ts`
- `apps/web/src/features/social/components/InviteeLanding.tsx`
