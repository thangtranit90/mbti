import { Hono } from 'hono';
import type { Bindings, Variables } from '../types/bindings';
import { requireSession } from '../middleware/auth';
import {
  withDb,
  generateInviteLink,
  getInviteLink,
  getTestResult,
} from '../lib/db';
import { InviteGenerateSchema } from '@mbti/shared';

const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const invites = new Hono<{ Bindings: Bindings; Variables: Variables }>();

invites.post('/generate', requireSession, async (c) => {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } },
      400,
    );
  }

  const { resultId } = InviteGenerateSchema.parse(payload);
  const userId = c.get('userId');
  const db = withDb(c);

  const row = await getTestResult(db, resultId);
  if (!row) {
    return c.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Result not found' } },
      404,
    );
  }
  if (row.user_id !== userId.toLowerCase()) {
    return c.json(
      {
        data: null,
        error: { code: 'FORBIDDEN', message: 'Result does not belong to current session' },
      },
      403,
    );
  }

  const id = crypto.randomUUID();
  const token = crypto.randomUUID();
  const expiredAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  await generateInviteLink(db, {
    id,
    token,
    inviterUserId: userId,
    inviterResultId: resultId,
    expiredAt,
  });

  // Origin resolution: prefer the request's Origin header (browser request);
  // fall back to current URL origin (e.g. SSR/curl). Workers always have c.req.url.
  const origin = c.req.header('origin') ?? new URL(c.req.url).origin;
  const inviteUrl = `${origin}/invite/${token}`;

  return c.json({ data: { inviteUrl, token, expiredAt }, error: null }, 201);
});

// AC1 (Story 4.2): public read of an invite. Returns inviter info if alive,
// otherwise 404 / 410. No auth — the token IS the credential.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

invites.get('/:token', async (c) => {
  const token = c.req.param('token');
  if (!UUID_RE.test(token)) {
    return c.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Invite not found' } },
      404,
    );
  }
  const db = withDb(c);
  const invite = await getInviteLink(db, token);
  if (!invite) {
    return c.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Invite not found' } },
      404,
    );
  }
  if (new Date(invite.expired_at).getTime() <= Date.now()) {
    return c.json(
      { data: null, error: { code: 'INVITE_EXPIRED', message: 'Invite has expired' } },
      410,
    );
  }
  const inviter = await getTestResult(db, invite.inviter_result_id);
  if (!inviter) {
    return c.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Inviter result not found' } },
      404,
    );
  }
  return c.json({
    data: {
      inviteToken: invite.token,
      inviterPersonaName: inviter.persona_name,
      inviterMbtiType: inviter.calculated_type,
      expiredAt: invite.expired_at,
    },
    error: null,
  });
});

export default invites;
