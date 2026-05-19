-- Story 7.x / Migration 0012_result_unlock_product
-- Purpose: Add the `result_unlock` product (2.000đ paywall in front of the
--   basic personality result). SQLite cannot ALTER a CHECK constraint, so
--   rebuild `payments` with product_type CHECK IN
--   ('couple_pack','gap_report','result_unlock'), preserving all existing rows
--   and indexes. Schema is otherwise byte-identical to migration 0010.

ALTER TABLE payments RENAME TO payments_old;

CREATE TABLE payments (
  id            TEXT PRIMARY KEY NOT NULL,
  user_id       TEXT NOT NULL,
  result_id     TEXT NULL,
  product_type  TEXT NOT NULL
    CHECK (product_type IN ('couple_pack','gap_report','result_unlock')),
  gateway       TEXT NOT NULL CHECK (gateway IN ('sepay','stripe')),
  provider_ref  TEXT NULL UNIQUE,
  amount        INTEGER NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'VND',
  status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','completed','failed')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at  TEXT NULL,
  deleted_at    TEXT NULL
);

INSERT INTO payments
  (id, user_id, result_id, product_type, gateway, provider_ref, amount,
   currency, status, created_at, updated_at, completed_at, deleted_at)
SELECT
  id, user_id, result_id, product_type, gateway, provider_ref, amount,
  currency, status, created_at, updated_at, completed_at, deleted_at
FROM payments_old;

DROP TABLE payments_old;

CREATE INDEX idx_payments_user_status ON payments(user_id, status);
CREATE INDEX idx_payments_provider_ref ON payments(provider_ref) WHERE provider_ref IS NOT NULL;
