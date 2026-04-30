export type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  ASSETS_BUCKET: R2Bucket;
  RATE_LIMITER: RateLimit;
};

export type Variables = {
  userId: string;
};
