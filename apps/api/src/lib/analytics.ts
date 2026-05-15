/**
 * Story 7.4 — server-side PostHog capture via fetch-based ingest.
 *
 * No `posthog-node` dependency (Workers-safe, deferred-work.md:40). A failure
 * or missing credentials must NEVER throw into the request path — mirror the
 * client `safeCapture` resilience. Callers should pass the promise to
 * `c.executionCtx.waitUntil()` so analytics never blocks the response.
 *
 * Event names: snake_case. Property keys: camelCase (NFR20).
 */
import type { Bindings } from '../types/bindings';

export async function captureServer(
  env: Bindings,
  event: string,
  distinctId: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  try {
    const apiKey = env.POSTHOG_API_KEY;
    if (!apiKey) return; // silent no-op without credentials
    const host = (env.POSTHOG_HOST ?? 'https://us.i.posthog.com').replace(/\/$/, '');
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        distinct_id: distinctId,
        properties,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.warn('captureServer failed:', event, err);
  }
}
