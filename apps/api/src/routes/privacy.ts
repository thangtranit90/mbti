import { Hono } from 'hono';
import type { Bindings, Variables } from '../types/bindings';
import { requireSession, requireAdmin } from '../middleware/auth';
import { withDb, softDeleteUserData, purgeInactiveUsers } from '../lib/db';
import { deleteSession } from '../lib/kv';

const privacy = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * Story 7.4 — PDPA right to erasure (NFR11). Soft-deletes all user-owned rows
 * and clears the KV session in the same request, well within the 30-day SLA.
 */
privacy.delete('/delete-me', requireSession, async (c) => {
  const db = withDb(c);
  const userId = c.get('userId');
  await softDeleteUserData(db, userId);
  const token = c.req.header('X-Session-Token')?.trim();
  if (token) await deleteSession(c.env.KV, token);
  return c.json({ data: { deleted: true }, error: null });
});

/**
 * Story 7.4 — PDPA inactivity purge (FR39). Admin-token protected and also
 * invoked by the Cloudflare Cron Trigger (see scheduled() in index.ts).
 */
privacy.post('/purge', requireAdmin, async (c) => {
  const db = withDb(c);
  const result = await purgeInactiveUsers(db);
  return c.json({ data: result, error: null });
});

export default privacy;
