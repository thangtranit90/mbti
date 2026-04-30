import type { MiddlewareHandler } from 'hono';
import type { Bindings, Variables } from '../types/bindings';
import { getSession } from '../lib/kv';

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
