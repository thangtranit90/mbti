import { Hono } from 'hono';
import { ConsentRequestSchema } from '@mbti/shared';
import type { Bindings, Variables } from '../types/bindings';
import { getSession, setSession, type SessionData } from '../lib/kv';
import { requireSession } from '../middleware/auth';

const sessions = new Hono<{ Bindings: Bindings; Variables: Variables }>();

sessions.post('/init', async (c) => {
  try {
    const sessionToken = crypto.randomUUID();
    const userId = crypto.randomUUID();
    await setSession(c.env.KV, sessionToken, {
      userId,
      createdAt: new Date().toISOString(),
    });
    return c.json({ data: { sessionToken }, error: null });
  } catch (err) {
    console.error('session init failed:', err);
    return c.json(
      {
        data: null,
        error: {
          code: 'SESSION_CREATE_FAILED',
          message: 'Unable to create session. Please refresh and try again.',
        },
      },
      500,
    );
  }
});

sessions.patch('/consent', requireSession, async (c) => {
  // Malformed JSON throws SyntaxError (not ZodError); surface as the same 400 envelope clients expect for body errors.
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json(
      {
        data: null,
        error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' },
      },
      400,
    );
  }
  // ZodError bubbles to global app.onError → 400 VALIDATION_ERROR envelope.
  ConsentRequestSchema.parse(payload);

  const token = c.req.header('X-Session-Token')!.trim();
  const existing = await getSession(c.env.KV, token);
  if (!existing) {
    // Race: token validated by middleware, then session evaporated from KV.
    return c.json(
      {
        data: null,
        error: { code: 'SESSION_GONE', message: 'Session expired during consent flow' },
      },
      401,
    );
  }

  const now = new Date().toISOString();
  const next: SessionData = { ...existing, consentAt: now, ageConfirmedAt: now };
  await setSession(c.env.KV, token, next);
  return c.json({ data: { consentAt: now, ageConfirmedAt: now }, error: null });
});

export default sessions;
