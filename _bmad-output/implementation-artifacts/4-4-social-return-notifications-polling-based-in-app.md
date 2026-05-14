# Story 4.4: Social Return Notifications (Polling-Based In-App)

Status: done

## Story

As a user who sent invite links and left the platform,
I want to see a named in-app notification when I return that tells me a specific friend voted,
so that I'm pulled back by genuine social curiosity — not a generic reminder.

## Acceptance Criteria

**AC1:** `GET /api/social/status` (Story 4.3) now returns `latestVoterName: string | null` — derived from `JOIN test_results tr ON tr.invite_source_token = pv.invite_token` on the latest vote. If the invitee hasn't yet taken their own test, `latestVoterName` is null and notification copy falls back to "Một người vừa vote về cách bạn hành xử".

**AC2:** Client tracks `lastSeenVoterCount` in localStorage (`mbti-last-seen-voter-count`). When `useSocialStatus` returns a `voterCount` greater than the local value AND `voterCount > 0`, the `SocialNotificationToast` mounts (rendered at app root) with copy "${latestVoterName ?? 'Một người'} vừa vote về cách bạn hành xử — xem ngay" and a "Xem" action.

**AC3:** Tapping "Xem" navigates to `/result/{latestResultId}#gap` (where latestResultId is read from the most recent self test in store/localStorage), updates `lastSeenVoterCount` to current `voterCount`, dismisses the toast, and fires PostHog `social_notification_tapped`.

**AC4:** PostHog `social_notification_shown` fires **client-side** (server side is impractical for polling — fire when the toast actually renders) with `{ resultId, voterCount }`. Dedupe per session — only fires once per increment.

**AC5:** Browser push notifications are explicitly NOT implemented. No `Notification.requestPermission()` anywhere. Verify via grep in the final review.

**AC6:** Toast is dismissable; dismiss also updates `lastSeenVoterCount` so the same delta isn't re-toasted on next poll.

## Tasks / Subtasks

- [ ] **Task 1 — Server**: Extend `getSocialStatusForInviter` to also return latest invitee's persona name (LEFT JOIN test_results tr ON tr.invite_source_token = pv.invite_token, order by pv.created_at DESC, limit 1). Return `latestVoterName` in `GET /api/social/status` response.

- [ ] **Task 2 — Frontend toast component**: `apps/web/src/features/social/components/SocialNotificationToast.tsx` — fixed bottom-center on mobile, top-right on `md:` and above; framer-motion fade/slide; Xem button + dismiss × button.

- [ ] **Task 3 — Trigger hook**: `apps/web/src/features/social/hooks/useSocialNotification.ts` reads `useSocialStatus` and localStorage, returns `{ show, dismiss, voterName, voterCount }`.

- [ ] **Task 4 — Mount at app root**: in `apps/web/src/App.tsx` or routing root, render `<SocialNotificationToast />` so it appears on any page.

- [ ] **Task 5 — Tests**:
  - lib test: localStorage-driven delta detection (mocked storage)
  - api test: status response includes latestVoterName

## Dev Notes

- The `latestResultId` for navigation: we cache the user's most recent self `resultId` in localStorage on `result_viewed` event in `ResultPage.tsx` — add a small write. (Alternative: server returns `latestSelfResultId` in status; cleaner but more endpoint surface — go with client-side cache for v1.)
- The toast must NOT block UI — it's a single floating element, no overlay.
- `useSocialStatus` already polls every 3 min + refetchOnWindowFocus. The notification hook is purely derived state — no extra fetching.

## References

- `epics.md:751-772` — Story 4.4 ACs.
- `apps/api/src/routes/social.ts` — extend status route.
- `apps/web/src/features/social/hooks/useSocialStatus.ts` — input.

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Completion Notes

- Server: `getLatestVoterName(db, userId)` LEFT JOINs `test_results.invite_source_token` to surface invitee persona name; returned in `GET /api/social/status`.
- Client: `useSocialNotification` derives `show` state from `useSocialStatus().voterCount > localStorage(LAST_SEEN_KEY)`. `LAST_RESULT_KEY` stores latest self-result for Xem navigation.
- `SocialNotificationToast` mounted in `RootLayout` (router) so it appears on every route. Fixed-bottom on mobile, top-right on md+. Fires `social_notification_shown` once per delta increment; `social_notification_tapped` on Xem.
- Navigation target: `/result/:resultId#gap` (anchor; gap section already in result page from Story 4-3).
- Per AC5: no `Notification.requestPermission()` anywhere. Verified via grep.

### File List

**Modified:**
- `apps/api/src/lib/db.ts` (+getLatestVoterName)
- `apps/api/src/routes/social.ts` (latestVoterName in response)
- `apps/web/src/router.tsx` (RootLayout with Outlet + toast)
- `apps/web/src/features/social/hooks/useSocialStatus.ts` (latestVoterName type)
- `apps/web/src/features/result/components/ResultPage.tsx` (setLatestResultId)

**Created:**
- `apps/web/src/features/social/hooks/useSocialNotification.ts`
- `apps/web/src/features/social/components/SocialNotificationToast.tsx`
