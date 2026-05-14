-- Story 5.1 / Migration 0008_payments
-- Purpose: Track payment lifecycle for Couple Pack + Gap Report unlocks.
-- Status flow: pending → completed | failed; never mutated to non-terminal once completed.

CREATE TABLE payments (
  id            TEXT PRIMARY KEY NOT NULL,
  user_id       TEXT NOT NULL,
  result_id     TEXT NULL,
  product_type  TEXT NOT NULL CHECK (product_type IN ('couple_pack','gap_report')),
  gateway       TEXT NOT NULL CHECK (gateway IN ('payos','stripe')),
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

CREATE INDEX idx_payments_user_status ON payments(user_id, status);
CREATE INDEX idx_payments_provider_ref ON payments(provider_ref) WHERE provider_ref IS NOT NULL;
