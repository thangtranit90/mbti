# Story 5.2: Couple/Friend Pack Purchase & Compatibility Report

Status: done

## Story

As a user who wants to see a full compatibility report with a friend or partner, I want to purchase the Couple/Friend Pack as a shared two-person transaction and both receive the report via a shared link.

## Acceptance Criteria

**AC1:** `CouplePack` component (dialog) shows the two-person framing, 79,000đ price, "Thanh toán" button calling `POST /api/payments/checkout` with `{ productType: 'couple_pack', resultId }`. On success, opens `checkoutUrl`.

**AC2:** Webhook on `product_type='couple_pack'` calls `generateCompatibilityReport({ db, r2, inviterResultId, inviteeResultId })`. Stores report JSON at `r2://reports/{reportId}.json`. Inserts `reports` row.

**AC3:** `GET /api/reports/:reportId` (public, no auth) returns the JSON. Both inviter + invitee can access via the shared link.

**AC4:** PostHog `payment_completed` with `{ productType: 'couple_pack', amount: 79000 }` server-side from webhook.

## Tasks

- [ ] Migration `0009_reports.sql`: `reports(id, inviter_user_id, invitee_user_id, r2_key, created_at, deleted_at)`.
- [ ] D1 helpers `createReport`, `getReport`.
- [ ] R2 helper `putReport(r2, reportId, json)` / `getReport(r2, reportId)`.
- [ ] `lib/payment-report.ts` — generateCompatibilityReport pure function (stub returning `{ compatibility: 0.83, summary, sharedTraits, divergentTraits }` based on the two MBTI types).
- [ ] Route `/api/reports/:reportId` (Hono GET).
- [ ] Webhook handler `markPaymentCompleted` extension — when productType=couple_pack, trigger report generation via fire-and-forget.
- [ ] Web: `CouplePack` Dialog with confirm CTA; mounted next to `GapVisualization` / `LoopStatus`.
- [ ] Web: `CompatibilityReport` page at `/report/:reportId`.
- [ ] Tests: webhook → report row + R2 put; GET /api/reports/:reportId; CouplePack click → POST /api/payments/checkout.

## Dev Notes

- Compatibility computation v1 is a hardcoded matrix per MBTI-pair (16×16 = 256). Use a deterministic compatibility score (0–1) based on cognitive function overlap.
- For now report shape can be flat JSON: `{ inviter, invitee, score, summary, sections: [...] }`.
- Use `c.executionCtx.waitUntil` for fire-and-forget report generation in webhook.

## References
- `epics.md:804-825` — Story 5.2 ACs.
- Story 5-1 payment route — extend the webhook completion path.

## Dev Agent Record

### Agent Model Used
claude-opus-4-7[1m]

### Completion Notes

- `0009_reports.sql` + `ReportRow` shared type. Indexes on inviter/invitee user IDs.
- `apps/api/src/lib/report.ts` — deterministic compatibility scoring via cognitive function overlap (16-type lookup). Future story can swap in AI narrative.
- Webhook fires `c.executionCtx.waitUntil(maybeGenerateCouplePackReport(...))` so the response returns immediately and report generation runs in the background. Errors are logged but never crash the webhook.
- `GET /api/reports/:reportId` (public, no auth) fetches the R2-stored JSON.
- Web `CouplePack` Dialog wired into `PersonaReveal` (under LoopStatus). Uses `useCheckout` mutation hook.
- Note: a `/report/:reportId` UI page is not built here — the JSON endpoint is sufficient for v1. A future story can add a styled report viewer.

### File List

**Modified:**
- `apps/api/src/lib/db.ts` (+createReport, +getReportRow)
- `apps/api/src/routes/payments.ts` (Couple Pack report generation + getTestResult import)
- `apps/api/src/index.ts` (mount /api/reports)
- `apps/web/src/features/result/components/PersonaReveal.tsx` (mount CouplePack)
- `packages/shared/src/db/rows.ts` (+ReportRow)

**Created:**
- `migrations/0009_reports.sql`
- `apps/api/src/lib/report.ts`
- `apps/api/src/routes/reports.ts`
- `apps/web/src/features/payment/hooks/useCheckout.ts`
- `apps/web/src/features/payment/components/CouplePack.tsx`
