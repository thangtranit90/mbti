import type { Context } from 'hono';
import type { Bindings, Variables } from '../types/bindings';

/**
 * R2 access boundary.
 *
 * Rules (architecture.md#Enforcement Guidelines, Story 1.6 AC-6):
 *  - Route handlers MUST NOT call `c.env.ASSETS_BUCKET` directly. Always
 *    go through `withR2(c)` or one of the typed helpers exported here.
 *  - Key prefix conventions (architecture.md#Storage Boundary):
 *    - `og/{resultId}.png`     — OG preview images (Story 3.4)
 *    - `cards/{resultId}.png`  — share cards (Story 3.4)
 *    - `reports/{reportId}.pdf` — compatibility / gap reports (Story 5.2)
 *  - Keys MUST be derived from server-issued UUIDs or static prefixes —
 *    never from raw user input. Validation is route-handler responsibility.
 *  - This file scaffolds the minimum surface needed by the planned
 *    consumers. Feature stories add domain-specific helpers
 *    (`cacheOgImage`, `getReport`, etc.) as they land — do NOT pre-add
 *    helpers here.
 *  - Presigned URL helper is intentionally OUT OF SCOPE for this story.
 *    R2 binding does not natively support presigned URLs; that requires
 *    the S3-compat API + `aws4fetch` (or `@aws-sdk/client-s3`). Defer
 *    until a feature story actually needs it.
 */

export function withR2(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
): R2Bucket {
  if (!c.env.ASSETS_BUCKET) {
    throw new Error(
      'R2 binding "ASSETS_BUCKET" is not configured on this Worker',
    );
  }
  return c.env.ASSETS_BUCKET;
}

/**
 * Write `body` to R2 under `key`. Returns the resulting R2Object metadata.
 *
 * Caveats:
 *  - Conditional puts via `R2PutOptions.onlyIf` / `onlyIfMatch` are NOT
 *    supported by this helper — when a precondition fails, `bucket.put()`
 *    resolves to `null`, and this helper treats `null` as a misconfig
 *    signal and throws. If you need optimistic-concurrency semantics, call
 *    `bucket.put(key, body, { onlyIf })` directly and inspect the `null`
 *    return yourself, or extend the helper surface in a feature story.
 *  - Passing `body = null` writes a zero-byte object — it does NOT delete
 *    the key. Use `bucket.delete(key)` for deletion (no helper exported in
 *    this story; add one in the feature story that first needs it).
 */
export async function putAsset(
  bucket: R2Bucket,
  key: string,
  body:
    | ArrayBuffer
    | ArrayBufferView
    | ReadableStream
    | string
    | Blob
    | null,
  options?: R2PutOptions,
): Promise<R2Object> {
  const result = await bucket.put(key, body, options);
  if (result === null) {
    throw new Error(`putAsset: R2 returned null for key "${key}"`);
  }
  return result;
}

export async function getAsset(
  bucket: R2Bucket,
  key: string,
): Promise<R2ObjectBody | null> {
  return bucket.get(key);
}
