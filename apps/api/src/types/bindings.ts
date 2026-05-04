export type Bindings = {
  // Cloudflare bindings (Story 1.3 / 1.5 / 1.6)
  DB: D1Database;
  KV: KVNamespace;
  ASSETS_BUCKET: R2Bucket;
  RATE_LIMITER: RateLimit;

  // Worker secrets (Story 1.6) — set via `wrangler secret put` in production,
  // or via apps/api/.dev.vars in local dev.
  ANTHROPIC_API_KEY: string;
  PAYOS_API_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  ADMIN_PASSWORD_HASH: string;
};

export type Variables = {
  userId: string;
};
