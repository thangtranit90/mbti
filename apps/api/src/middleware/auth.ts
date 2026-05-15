import type { MiddlewareHandler } from 'hono';
import type { Bindings, Variables } from '../types/bindings';
import { getSession, getAdminSession } from '../lib/kv';

export const requireSession: MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> = async (c, next) => {
  const token = c.req.header('X-Session-Token')?.trim();
  if (!token) {
    return c.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Missing session token' } },
      401,
    );
  }
  const session = await getSession(c.env.KV, token);
  if (!session || typeof session.userId !== 'string') {
    return c.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session' } },
      401,
    );
  }
  c.set('userId', session.userId);
  await next();
};

/**
 * Story 7.1 — admin route guard. Validates `X-Admin-Token` against the KV
 * `admin:` keyspace. Returns FORBIDDEN/403 (not 401) per AC for ALL
 * `/api/admin/*` and admin-only privacy routes. User session tokens grant
 * zero access here — separate keyspace, separate header (NFR10).
 */
export const requireAdmin: MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> = async (c, next) => {
  const token = c.req.header('X-Admin-Token')?.trim();
  if (!token) {
    return c.json(
      { data: null, error: { code: 'FORBIDDEN', message: 'Missing admin token' } },
      403,
    );
  }
  const session = await getAdminSession(c.env.KV, token);
  if (!session || typeof session.username !== 'string') {
    return c.json(
      { data: null, error: { code: 'FORBIDDEN', message: 'Invalid or expired admin session' } },
      403,
    );
  }
  c.set('adminUsername', session.username);
  await next();
};
