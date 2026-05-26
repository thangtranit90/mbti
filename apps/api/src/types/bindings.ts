export type Bindings = {
  // Cloudflare bindings (Story 1.3 / 1.5 / 1.6)
  DB: D1Database;
  KV: KVNamespace;
  ASSETS_BUCKET: R2Bucket;
  RATE_LIMITER: RateLimit;

  // Worker secrets (Story 1.6 / 5.1) — set via `wrangler secret put` in production,
  // or via apps/api/.dev.vars in local dev.
  ANTHROPIC_API_KEY: string;
  // SePay (primary VN gateway — VietQR bank-transfer reconciliation, Story 5.4)
  SEPAY_IPN_API_KEY: string;
  SEPAY_BANK_ACCOUNT: string;
  SEPAY_BANK_CODE: string;
  SEPAY_BANK_NAME: string;
  // Stripe (international cards)
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  ADMIN_PASSWORD_HASH: string;
  PUBLIC_WEB_ORIGIN?: string;
  // Resend (Story — result_unlock thank-you email). Set via
  // `wrangler secret put RESEND_API_KEY`. When unset, the email send is a
  // logged no-op so the IPN webhook keeps acking 200 to SePay.
  RESEND_API_KEY?: string;
  // PostHog server-side analytics (Story 7.4). Optional — analytics is a
  // silent no-op when unset so deploys never block on PostHog credentials.
  POSTHOG_API_KEY?: string;
  POSTHOG_HOST?: string;
};

export type Variables = {
  userId: string;
  // Story 7.1 — set by requireAdmin middleware.
  adminUsername: string;
};
