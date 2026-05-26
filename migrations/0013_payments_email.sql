-- Migration 0013_payments_email
-- Purpose: Capture buyer email at checkout for `result_unlock` so we can send
--   a thank-you email with a durable link back to the result page after the
--   SePay IPN confirms the transfer. `email_sent_at` is the idempotency guard
--   for repeated IPN deliveries / future retry workers.

ALTER TABLE payments ADD COLUMN email         TEXT NULL;
ALTER TABLE payments ADD COLUMN email_sent_at TEXT NULL;

CREATE INDEX idx_payments_email ON payments(email) WHERE email IS NOT NULL;
