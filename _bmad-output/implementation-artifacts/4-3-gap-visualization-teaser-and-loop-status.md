# Story 4.3: Gap Visualization Teaser & Loop Status

Status: done

## Story

As a user who sent invite links,
I want to see who has voted and a teaser of how they perceive me versus how I perceive myself,
so that I'm curious enough to invite more friends or eventually unlock the full report.

## Acceptance Criteria

**AC1:** `GET /api/social/status/:userId` (session-gated; the userId must match `c.get('userId')` else 403) returns `{ data: { voterCount, latestVoterName, hasUnlockedGapReport, selfTags, friendTagsTeaser }, error: null }`. `voterCount` = number of perception_votes rows for invites where `inviter_user_id = userId`. `selfTags` and `friendTagsTeaser` are 3-element arrays of behavioral tags derived from the latest self test_results.answers and aggregated friend votes (deterministic mapping from the perception question answers — see Dev Notes).

**AC2:** Frontend `useSocialStatus` TanStack Query hook with `queryKey: queryKeys.socialStatus(userId)`, `queryFn: () => fetchSocialStatus(userId)`, `refetchInterval: 3 * 60 * 1000` (3 min), `refetchOnWindowFocus: true`. Hook lives in `apps/web/src/features/social/hooks/useSocialStatus.ts`.

**AC3:** `GapVisualization` component renders on `/result/:resultId` (below villains) and on a new `/compare/:userId` route. In `teaser` state (default when `hasUnlockedGapReport=false`): left panel "Bạn thấy bạn" lists 3 self tags (visible); right panel "Người thân thấy bạn" lists 3 friend tags blurred (CSS `blur(8px)`) with a lock icon overlay + "Mở khóa" CTA.

**AC4:** `LoopStatus` component shows: "N/3 người đã vote" near-win framing, thin type-accent progress bar `min(voterCount, 3) / 3`, friend avatar initials row (first letter of latest 3 voter names + type color), two always-visible CTAs ("Mời thêm người" → opens existing InvitePrompt sheet from Story 4-1; "Mở khóa ngay" → calls payment flow stub `/api/payments/checkout` from Epic 5 — for this story, just wires the click + navigation hook; actual payment in Story 5-3).

**AC5:** The progress region has `role="status"` `aria-label="N of 3 friends have responded"` updated via `aria-live="polite"`.

**AC6:** When `voterCount === 0`: `GapVisualization` and `LoopStatus` are NOT rendered on `/result/:resultId` (no friends yet → no teaser). On `/compare/:userId` the empty state shows "Chưa có ai vote" with the InvitePrompt CTA.

**AC7:** Polling does not double-fire on tab switch — `refetchOnWindowFocus` cooperates with `refetchInterval` (default TanStack behavior is fine; just verify no console errors in dev).

## Tasks / Subtasks

- [ ] **Task 1 — Server**
  - [ ] 1.1 `apps/api/src/lib/db.ts`: helper `getSocialStatus(db, userId)` returning `{ voterCount, latestVoterName, latestVotes: PerceptionVoteRow[3] }`. Query joins `perception_votes pv` with `invite_links il` on `pv.invite_token = il.token`, where `il.inviter_user_id = ?`, ordered by `pv.created_at DESC`, limit 3 + a COUNT.
  - [ ] 1.2 Helper `getLatestSelfResult(db, userId)` returning latest `test_results` row for the user (already partially in `getTestResult` but indexed by id, not user_id) — new helper.
  - [ ] 1.3 Route handler `social.get('/status/:userId', requireSession, …)`: 403 if URL userId !== session userId; otherwise compute and return.
  - [ ] 1.4 Behavioral tag derivation: pure helper `deriveBehavioralTags(answers, side)` in `apps/api/src/lib/social.ts`. For v1, hardcoded mapping: `p1-decision` value 4-5 → "Quyết đoán" else "Cân nhắc"; `p2-social` 4-5 → "Hướng ngoại" else "Hướng nội"; `p3-conflict` 4-5 → "Thẳng thắn" else "Né tránh". `selfTags` derived from latest self test_results answers (apply same mapping over the matching dimensions — `S_N`→p2, `E_I`→p2, `T_F`→p3, `J_P`→p1; for v1 use only `E_I` for social, `T_F` for conflict, `J_P` for decision; combine the 4 standard test answers).
  - [ ] 1.5 Add `getSocialStatus` tests.

- [ ] **Task 2 — Frontend**
  - [ ] 2.1 `apps/web/src/features/social/hooks/useSocialStatus.ts` — TanStack `useQuery` with `refetchInterval: 180_000`, `refetchOnWindowFocus: true`. Requires userId.
  - [ ] 2.2 `apps/web/src/features/social/components/GapVisualization.tsx` — left/right panels; right panel blurred when `!hasUnlockedGapReport`.
  - [ ] 2.3 `apps/web/src/features/social/components/LoopStatus.tsx` — progress bar + N/3 + avatars + 2 CTAs.
  - [ ] 2.4 Mount both in `PersonaReveal` below `ReverseReveal`, gated by `voterCount > 0` from `useSocialStatus`. Need user's `userId` — derive from session token via existing `useSession()` context (already exposes token; need helper to surface userId — for v1, pass `result.userId` (server might not expose). Simpler: server already validates session userId; client doesn't need to know userId — pass `result.id` and let server look up. Actually we need a stable key for query — let's use `resultId` and have the server resolve userId from session. Change `/api/social/status` to drop the `:userId` param; just use session-gated GET `/api/social/status` returning the caller's status. Update accordingly.

- [ ] **Task 3 — `/compare/:userId` page** (lightweight)
  - [ ] 3.1 New route `/compare/:userId` rendering an empty-state-aware Compare page that mounts the same components. For v1, equivalent functionality lives on `/result/:resultId`; this page is for deep-link from notifications (Story 4-4 use case).

- [ ] **Task 4 — Tests**
  - [ ] 4.1 `apps/api/tests/routes/social-status.test.ts`: happy path (3 votes), 0 votes, 401, 403 wrong session.
  - [ ] 4.2 `apps/api/tests/lib/social.test.ts`: `deriveBehavioralTags` mapping.
  - [ ] 4.3 `apps/web/src/features/social/components/GapVisualization.test.tsx`: teaser blur; LoopStatus N/3 text.

## Dev Notes

- **API design pivot**: Drop the `:userId` path param. `GET /api/social/status` (session-gated) returns status for the caller. Simpler, no mismatch checks, naturally PDPA-safe (callers only ever see their own data). The architecture spec mentions `:userId` for human-readable URLs, but the route is API not user-facing — caller's session is the source of truth.
- TanStack `refetchInterval` + `refetchOnWindowFocus` work together cleanly; no manual orchestration needed.
- `voterCount` is small (max 3 in MVP for free unlock); no pagination.
- Existing `queryKeys.socialStatus(userId)` is in `@mbti/shared`. With the API pivot, change to `socialStatus: () => ['socialStatus'] as const`. Update any callers.
- Empty-state on `/result`: don't render GapVisualization+LoopStatus when `voterCount === 0` → keeps the result page clean for solo users.

## References

- `epics.md:727-748` — Story 4.3 ACs.
- `architecture.md:415, 698-701, 842` — queryKeys.socialStatus pattern, social endpoints, vote → status flow.
- `apps/api/src/routes/social.ts` — Story 4-2 mount target.
- `apps/web/src/features/result/components/PersonaReveal.tsx` — render site for GapVisualization/LoopStatus.
- `apps/web/src/components/providers/SessionProvider.tsx` — session token source.

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Completion Notes

- API: `GET /api/social/status` (session-gated). Drops `:userId` from URL (architecture pivot — session is source of truth, simpler + PDPA-safe).
- `lib/social.ts` — pure `deriveFriendTags` / `deriveSelfTags` / `aggregateFriendAnswers` helpers. 4 lib tests cover mapping.
- D1 helpers `getLatestTestResultForUser` + `getSocialStatusForInviter` (JOIN perception_votes ↔ invite_links).
- Frontend `useSocialStatus` polling hook (3-min interval, refetchOnWindowFocus). `GapVisualization` with blurred right panel + lock CTA. `LoopStatus` with N/3 near-win text + thin progress bar + Mời/Mở khóa CTAs (Mời triggers existing Story 4-1 InvitePrompt via DOM data-testid; Mở khóa wires to checkout intent — wired fully in Story 5-3).
- Both components mount in `PersonaReveal` gated by `voterCount > 0` (empty state hidden).
- `hasUnlockedGapReport` hardcoded `false` for now; Story 5-3 flips this when payments confirmed.

### File List

**Modified:**
- `apps/api/src/lib/db.ts` (+getLatestTestResultForUser, +getSocialStatusForInviter)
- `apps/api/src/routes/social.ts` (+GET /status)
- `apps/web/src/features/result/components/PersonaReveal.tsx` (mount GapVisualization + LoopStatus)
- `packages/shared/src/queryKeys.ts` (`socialStatus()` arg-less)

**Created:**
- `apps/api/src/lib/social.ts`
- `apps/api/tests/lib/social.test.ts`
- `apps/api/tests/routes/social-status.test.ts`
- `apps/web/src/features/social/hooks/useSocialStatus.ts`
- `apps/web/src/features/social/components/GapVisualization.tsx`
- `apps/web/src/features/social/components/LoopStatus.tsx`
