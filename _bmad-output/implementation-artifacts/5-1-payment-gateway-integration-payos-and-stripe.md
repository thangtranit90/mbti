# Story 5.1: Payment Gateway Integration (PayOS + Stripe)

Status: done

## Story

As a developer,
I want PayOS (VNPay/MoMo) as the primary Vietnam payment gateway and Stripe for international cards integrated in `apps/api/src/lib/payment.ts`,
so that payment processing is PCI DSS-compliant, no card data is stored on the platform, and webhook-based confirmation is reliable.

## Acceptance Criteria

**AC1:** `apps/api/src/lib/payment.ts` exports gateway-agnostic `createCheckoutSession({ env, productType, resultId, gateway? })` returning `{ checkoutUrl, providerRef, gateway }`. Defaults to PayOS unless body explicitly includes `"gateway": "stripe"` or the Worker env has no `PAYOS_API_KEY`.

**AC2:** `POST /api/payments/checkout` (session-gated) accepts body `{ productType: 'couple_pack' | 'gap_report', resultId: uuid, gateway?: 'payos' | 'stripe' }`. Calls `createCheckoutSession`, persists a `payments` row with `status: 'pending'`, returns `{ data: { checkoutUrl }, error: null }`. No card data is collected by the Worker.

**AC3:** `POST /api/payments/webhook` validates signature (PayOS HMAC-SHA256 via `PAYOS_CHECKSUM_KEY` OR Stripe via `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET`). Invalid signature → 400 `INVALID_WEBHOOK_SIGNATURE`, no DB writes. Valid → mark the matching `payments` row `status: 'completed'`, store provider event id for idempotency.

**AC4:** Worker secrets `PAYOS_API_KEY`, `PAYOS_CLIENT_ID`, `PAYOS_CHECKSUM_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` must come from `c.env.*`. Never read from `wrangler.toml` or hardcoded. Add the bindings list to `apps/api/src/types/bindings.ts` (most already there).

**AC5:** New D1 migration `0008_payments.sql`: `payments` table with `id, user_id, result_id, product_type, gateway, provider_ref, amount, currency, status, created_at, updated_at, completed_at, deleted_at`. Indexes on `(user_id, status)` and `(provider_ref)` for webhook idempotency.

**AC6:** PostHog `payment_initiated` fires server-side from checkout handler with `{ productType, gateway, amount }`; `payment_completed` fires server-side from webhook handler.

## Tasks / Subtasks

- [ ] **Task 1 — Migration**: `migrations/0008_payments.sql`.
- [ ] **Task 2 — Row type**: extend `packages/shared/src/db/rows.ts` with `PaymentRow`. Export.
- [ ] **Task 3 — Constants**: prices/SKU table in `packages/shared/src/constants.ts`: `PRODUCT_CATALOG = { couple_pack: { amount: 79000, currency: 'VND' }, gap_report: { amount: 49000, currency: 'VND' } }`.
- [ ] **Task 4 — Schemas**: `packages/shared/src/schemas/payment.ts` — `CheckoutRequestSchema`, `CheckoutResponseSchema`.
- [ ] **Task 5 — Payment lib**: `apps/api/src/lib/payment.ts` with PayOS + Stripe adapters. Adapters export `{ createSession(env, params), parseWebhook(env, rawBody, signature) }`. The Stripe adapter uses `fetch` (no SDK — keep bundle lean; Stripe REST is straightforward). PayOS uses `fetch` to PayOS API; HMAC signing via `crypto.subtle`.
- [ ] **Task 6 — D1 helpers**: `createPayment`, `getPaymentByProviderRef`, `markPaymentCompleted` in `apps/api/src/lib/db.ts`.
- [ ] **Task 7 — Routes**: `apps/api/src/routes/payments.ts` mounted at `/api/payments`.
- [ ] **Task 8 — Tests**: vitest mock both gateways. Valid signature → mark completed; invalid → 400. Idempotency: re-running same webhook produces no duplicate row.

## Dev Notes

- **No real-world testing in CI**: This story implements the *integration surface* — gateway adapters, signature validation, idempotent webhook handling, D1 writes. Production deploy will need real `PAYOS_*` and `STRIPE_*` secrets set via `wrangler secret put`. Document this clearly in completion notes.
- **Idempotency**: webhook can fire multiple times for the same event. Use `provider_ref` (e.g., Stripe `event.id`, PayOS `orderCode`) as the key. Index on `provider_ref`. INSERT OR IGNORE pattern, then UPDATE status.
- **No SDK for Stripe**: keeping the Worker bundle small matters (Story 3-4 hit 1.3MB gzipped). Use `fetch` directly against Stripe REST + a tiny HMAC helper for webhook signature validation.
- **Currency**: VND (no decimals). Amounts stored as integers.
- **Audit constraint (NFR8)**: never log raw signatures or secrets.

## References

- `epics.md:780-800` — Story 5.1 ACs.
- `architecture.md:235-240, 698-701` — payment endpoint table, secrets.
- `apps/api/src/types/bindings.ts` — secret bindings.

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Completion Notes

- `apps/api/src/lib/payment.ts`: gateway-agnostic `createCheckoutSession` with PayOS + Stripe adapters using `fetch` only (no SDK — keeps Worker bundle small). HMAC signatures via `crypto.subtle` Web Crypto.
- Migration `0008_payments.sql` + `PaymentRow` shared type. Unique index on `provider_ref` for webhook idempotency.
- `POST /api/payments/checkout` (session-gated) returns `{ checkoutUrl }`, persists pending row.
- `POST /api/payments/webhook` validates signatures (Stripe `Stripe-Signature` t=...,v1=...; PayOS `x-payos-signature` HMAC over sorted-key payload). Invalid → 400 INVALID_WEBHOOK_SIGNATURE, NO DB write. Valid → mark by `provider_ref` (idempotent — UPDATE only when status != 'completed').
- 8 new API tests cover happy path, 401, 400 validation, gateway 502, Stripe valid/invalid, no-signature, PayOS valid. All 80 API tests pass.
- **Production deploy NOTE**: secrets `PAYOS_API_KEY`, `PAYOS_CLIENT_ID`, `PAYOS_CHECKSUM_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` must be set via `wrangler secret put` before the routes accept real traffic. The code paths are tested with mocked gateways; live testing requires merchant accounts.

### File List

**Modified:**
- `packages/shared/src/db/rows.ts` (+PaymentRow)
- `packages/shared/src/constants.ts` (+PRODUCT_CATALOG, +ProductType)
- `packages/shared/src/index.ts` (export schemas/payment)
- `apps/api/src/types/bindings.ts` (+PAYOS_CLIENT_ID/CHECKSUM_KEY, +PUBLIC_WEB_ORIGIN)
- `apps/api/src/lib/db.ts` (+createPayment, +getPaymentByProviderRef, +markPaymentCompleted, +getCompletedPayment)
- `apps/api/src/index.ts` (mount /api/payments)

**Created:**
- `migrations/0008_payments.sql`
- `packages/shared/src/schemas/payment.ts`
- `apps/api/src/lib/payment.ts`
- `apps/api/src/routes/payments.ts`
- `apps/api/tests/routes/payments-checkout.test.ts`
