/**
 * Optional-chained `window.posthog?.capture?.()` handles the "method missing"
 * case but not the "method exists and throws" case (browser extensions blocking
 * analytics, hostile proxies). `safeCapture` swallows synchronous throws so a
 * failing analytics call cannot crash the user-facing flow.
 */
export function safeCapture(event: string, props?: Record<string, unknown>): void {
  try {
    window.posthog?.capture?.(event, props);
  } catch (err) {
    // Analytics failures must never block the UX. Log for debugging only.
    console.warn('posthog capture failed:', event, err);
  }
}
