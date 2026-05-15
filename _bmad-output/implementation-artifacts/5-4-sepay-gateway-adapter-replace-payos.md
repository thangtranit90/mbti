# Story 5.4: SePay Gateway Adapter (replace PayOS)

Status: done

## Story

As the product owner, I want SePay (VietQR bank-transfer reconciliation) as the
primary Vietnam payment gateway instead of PayOS, so that we can accept payments
via any Vietnamese bank app QR without a merchant card-gateway contract.

## Context

PayOS/Stripe use *hosted checkout + HMAC webhook*. SePay uses *VietQR transfer +
IPN authenticated by `Authorization: Apikey` header*. PayOS is being fully
replaced; Stripe stays for international cards.

## Acceptance Criteria

**AC1:** `Gateway` type = `'sepay' | 'stripe'` (PayOS removed everywhere). Default
gateway is `sepay` when SePay env present, else `stripe`.

**AC2:** `POST /api/payments/checkout` for `gateway=sepay` returns
`{ data: { gateway:'sepay', paymentId, qrUrl, transferContent, amount, bankAccount, bankName }, error:null }`.
`qrUrl` is a SePay VietQR image URL of the form
`https://qr.sepay.vn/img?acc=<acc>&bank=<bankCode>&amount=<amount>&des=<transferContent>`.
A `payments` row is inserted (`gateway='sepay'`, `provider_ref=<transferContent>`, `status='pending'`).

**AC3:** New `POST /api/payments/sepay-ipn` (public). Validates
`Authorization: Apikey <SEPAY_IPN_API_KEY>` — mismatch/missing → HTTP 401
`{"success":false}` and NO DB write. Valid → only `transferType==='in'` processed;
matches our `provider_ref` against SePay `code` first then `content`; calls
`markPaymentCompleted`; triggers couple-pack report if applicable. Returns HTTP 200
`{"success":true}` (SePay-required body shape — NOT the `{data,error}` envelope).

**AC4:** IPN is idempotent — `markPaymentCompleted` only updates rows where
`status != 'completed'`; replays are safe and still return `{"success":true}`.

**AC5:** Migration `0010` rebuilds `payments.gateway` CHECK to `IN ('sepay','stripe')`,
preserving existing rows + indexes.

**AC6:** `GET /api/payments/:paymentId/status` (session-gated, owner-checked)
returns `{ data: { status: 'pending'|'completed'|'failed' }, error:null }` so the
frontend QR screen can poll for completion.

**AC7:** Frontend: `useCheckout` branches — `stripe` redirects (unchanged);
`sepay` opens a `PaymentQR` modal showing the QR image, bank account, amount,
transfer content, and polls `GET /api/payments/:paymentId/status` every 4s; on
`completed` it closes and refreshes social status. Wired into `CouplePack` +
gap-report unlock.

**AC8:** `bindings.ts`: remove `PAYOS_*`; add `SEPAY_IPN_API_KEY`,
`SEPAY_BANK_ACCOUNT`, `SEPAY_BANK_CODE`, `SEPAY_BANK_NAME`. Keep `STRIPE_*`.

**AC9:** Secrets/PCI: never log the Authorization header or SePay keys. Verify
before write. No card/bank credential stored in code or `wrangler.toml`.

## Tasks / Subtasks

- [ ] **Task 1 — shared** (AC1, AC2)
  - [ ] `Gateway` → `'sepay'|'stripe'`; `CheckoutRequestSchema.gateway` enum updated.
  - [ ] Add `SePayCheckoutDataSchema` / response types.
- [ ] **Task 2 — bindings** (AC8)
- [ ] **Task 3 — migration `0010_payments_sepay_gateway.sql`** (AC5) — table rebuild.
- [ ] **Task 4 — `lib/payment.ts`** (AC1, AC2, AC3)
  - [ ] Replace `createPayOSSession`→`createSePayCheckout` (pure URL build, no external API).
  - [ ] Remove `verifyPayOSSignature`; add `verifySePayApiKey(env, authHeader)`.
  - [ ] `pickGateway` sepay/stripe; `CheckoutSession` extended fields.
- [ ] **Task 5 — `routes/payments.ts`** (AC2, AC3, AC4, AC6)
  - [ ] checkout returns SePay data shape; remove PayOS webhook branch.
  - [ ] `POST /sepay-ipn` handler (apikey auth, in-only, match, idempotent, `{"success":true}`).
  - [ ] `GET /:paymentId/status` session-gated owner check.
  - [ ] D1 helper `getPaymentById` (owner-scoped).
- [ ] **Task 6 — web** (AC7)
  - [ ] `useCheckout` branch; `PaymentQR.tsx`; poll hook; wire CouplePack + unlock.
- [ ] **Task 7 — tests**
  - [ ] Rewrite `payments-checkout.test.ts` (sepay replaces payos).
  - [ ] New `sepay-ipn.test.ts`: bad apikey→401 no write; valid in→completed; out ignored; replay idempotent; `{"success":true}` shape.
  - [ ] `payment-status` test.

## Dev Notes

- SePay IPN JSON fields: `id, gateway, transactionDate, accountNumber, code, content, transferType('in'|'out'), transferAmount, description`. Match our `provider_ref` (a short alnum like `QM<base36>`) against `code` exact, else substring in `content`/`description`.
- SePay requires response within 30s, body `{"success":true}`, status 200/201, else retries (Fibonacci, ≤7, ≤5h). The `/sepay-ipn` route MUST return that literal shape — bypass the global `{data,error}` envelope.
- `provider_ref` doubles as the VietQR `des`. Keep it ≤ ~20 chars, `[A-Za-z0-9]` only (bank content constraints).
- SQLite cannot ALTER a CHECK; migration 0010 = rename→create→copy→drop→reindex.
- `markPaymentCompleted` already idempotent (`WHERE status != 'completed'`).

## References

- `docs/payment-setup-sepay-and-secrets.md` — operator guide (already written).
- SePay webhook docs: payload + `Authorization: Apikey` auth + `{"success":true}` contract.
- `apps/api/src/lib/payment.ts`, `apps/api/src/routes/payments.ts` (Story 5.1).
- `migrations/0008_payments.sql` — schema being amended.

## Dev Agent Record

### Agent Model Used
claude-opus-4-7[1m]

### Completion Notes

- PayOS fully removed (lib, route branch, bindings, schema enum, db type, tests). Stripe kept for international.
- `lib/payment.ts`: `createSePayCheckout` builds a VietQR URL (`https://qr.sepay.vn/img?...`) — no outbound API call. `verifySePayApiKey` (length-checked constant-time compare of `Apikey <key>`). `extractProviderRef` regex-pulls the `QM<base36>` token from `code`/`content`/`description`.
- `POST /api/payments/sepay-ipn`: apikey auth → 401 `{"success":false}` no DB write on fail; only `transferType==='in'`; matches provider_ref; idempotent via `markPaymentCompleted` (`WHERE status != 'completed'`); always returns `{"success":true}` 200 on authenticated requests (SePay contract — bypasses `{data,error}` envelope). Couple-pack report still fires via `waitUntil`.
- `GET /api/payments/:paymentId/status` (session-gated, owner-checked) for the QR polling screen.
- Migration `0010` rebuilds `payments` (SQLite can't ALTER CHECK) with `gateway IN ('sepay','stripe')`, remapping any legacy `payos` rows → `sepay`, preserving indexes.
- Web: `useCheckout` returns discriminated data; Stripe redirects, SePay opens `PaymentQR` modal. `usePaymentStatus` polls every 4s, stops on terminal status. `PaymentQR` shows VietQR image + bank/amount/content (copy button) + live "đang chờ" → success state. Wired into `CouplePack` and gap-report unlock in `PersonaReveal`.
- Tests: API 93/93 (rewrote payments-checkout for SePay/Stripe; added sepay-ipn 6 cases, payment-status 3 cases, lib/payment 7 cases). Web 30/30. Typecheck + lint clean both packages.

### File List

**Modified:**
- `packages/shared/src/schemas/payment.ts` (gateway enum sepay/stripe, discriminated checkout response, PaymentStatusResponseSchema)
- `apps/api/src/types/bindings.ts` (−PAYOS_*, +SEPAY_*)
- `apps/api/src/lib/payment.ts` (SePay adapter replaces PayOS)
- `apps/api/src/lib/db.ts` (+getPaymentById, gateway type sepay)
- `apps/api/src/routes/payments.ts` (sepay-ipn, payment status, removed PayOS webhook branch)
- `apps/api/src/tests/lib/ai.test.ts` (bindings fixture SEPAY_*)
- `apps/api/tests/routes/payments-checkout.test.ts` (rewritten for SePay/Stripe + status)
- `apps/web/src/features/payment/hooks/useCheckout.ts` (discriminated data, no auto-redirect for sepay)
- `apps/web/src/features/payment/components/CouplePack.tsx` (PaymentQR wiring)
- `apps/web/src/features/result/components/PersonaReveal.tsx` (PaymentQR for gap unlock)

**Created:**
- `migrations/0010_payments_sepay_gateway.sql`
- `apps/api/tests/routes/sepay-ipn.test.ts`
- `apps/api/tests/lib/payment.test.ts`
- `apps/web/src/features/payment/hooks/usePaymentStatus.ts`
- `apps/web/src/features/payment/components/PaymentQR.tsx`

**Deleted (logical — code removed):**
- PayOS adapter + `verifyPayOSSignature` + PAYOS_* bindings
