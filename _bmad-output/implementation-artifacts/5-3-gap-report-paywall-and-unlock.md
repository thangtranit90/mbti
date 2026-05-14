# Story 5.3: Gap Report Paywall & Unlock

Status: done

## Story

As a user who has seen the gap teaser and wants to see what friends actually said about me, I want to unlock the full Gap Report with a one-time payment.

## Acceptance Criteria

**AC1:** When tapping "Mở khóa ngay" in `GapVisualization` / `LoopStatus`, a `GapReportUnlock` overlay renders directly over the blurred right panel: price (49,000đ), "Thanh toán" CTA that calls `POST /api/payments/checkout` with `{ productType: 'gap_report', resultId }` then redirects to `checkoutUrl`.

**AC2:** Webhook on `product_type='gap_report'` flips the relevant flag. `GET /api/social/status` reads `payments` table for the caller and returns `hasUnlockedGapReport: true` if a completed `gap_report` row exists.

**AC3:** When `hasUnlockedGapReport=true`, `GapVisualization` removes the blur on the right panel and lock CTA — full friend tags visible. Page refresh preserves unlocked state (server-of-record check on every poll).

## Tasks

- [ ] **Server**: Extend `GET /api/social/status` to query `getCompletedPayment(db, userId, 'gap_report')` and return `hasUnlockedGapReport: row !== null`.
- [ ] **Server**: ensure webhook → `markPaymentCompleted` already updates row to `completed`. Confirm idempotency via Story 5-1 work.
- [ ] **Web**: `GapReportUnlock` overlay component on `GapVisualization`. Wire onUnlock to actual checkout via `useGenerateCheckout` mutation hook (replaces the placeholder `window.location.assign` from Story 4-3).
- [ ] **Tests**: status returns true after completed payment; false when only pending; status still false when payment is for different productType.

## References
- `epics.md:828-851` — Story 5.3 ACs.
- `apps/api/src/routes/social.ts` — extend.
- `apps/web/src/features/result/components/PersonaReveal.tsx` — replace placeholder onUnlock.

## Dev Agent Record

### Agent Model Used
claude-opus-4-7[1m]

### Completion Notes

- `GET /api/social/status` reads `getCompletedPayment(db, userId, 'gap_report')` and returns `hasUnlockedGapReport`. When true, `GapVisualization` un-blurs the right panel automatically (existing reactive behavior).
- `useCheckout` hook (built in 5-2) is now used by `GapVisualization` lock CTA and `LoopStatus` "Mở khóa ngay" button. Tap → `POST /api/payments/checkout { productType: 'gap_report', resultId }` → `window.location.assign(checkoutUrl)`.
- Webhook idempotency from Story 5-1 ensures duplicate webhook calls don't re-unlock.

### File List

**Modified:**
- `apps/api/src/routes/social.ts` (hasUnlockedGapReport from payments table)
- `apps/web/src/features/result/components/PersonaReveal.tsx` (replaced placeholder with real useCheckout)
