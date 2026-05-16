import { Hono } from 'hono';
import type { Bindings, Variables } from '../types/bindings';
import {
  withDb,
  getInviteLink,
  getPerceptionVote,
  createPerceptionVote,
  getLatestTestResultForUser,
  getSocialStatusForInviter,
  getLatestVoterName,
  getCompletedPayment,
} from '../lib/db';
import { getSession } from '../lib/kv';
import { requireSession } from '../middleware/auth';
import { PerceptionVoteSchema, FREE_UNLOCK_VOTER_THRESHOLD } from '@mbti/shared';
import {
  aggregateFriendAnswers,
  deriveFriendTags,
  deriveSelfTags,
} from '../lib/social';

type SelfAnswer = { questionId: string; value: number };

const social = new Hono<{ Bindings: Bindings; Variables: Variables }>();

social.post('/vote', async (c) => {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } },
      400,
    );
  }

  const { inviteToken, answers } = PerceptionVoteSchema.parse(payload);
  const db = withDb(c);

  const invite = await getInviteLink(db, inviteToken);
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

  // Resolve optional voter session — anonymous voters won't have one and
  // cannot be deduped.
  let voterSessionId: string | null = null;
  const sessionToken = c.req.header('X-Session-Token')?.trim();
  if (sessionToken) {
    const session = await getSession(c.env.KV, sessionToken);
    if (session?.userId) {
      voterSessionId = session.userId;
      const existing = await getPerceptionVote(db, inviteToken, voterSessionId);
      if (existing) {
        return c.json(
          {
            data: null,
            error: { code: 'ALREADY_VOTED', message: 'You have already voted on this invite' },
          },
          409,
        );
      }
    }
  }

  const id = crypto.randomUUID();
  await createPerceptionVote(db, {
    id,
    inviteToken,
    inviterUserId: invite.inviter_user_id,
    voterSessionId,
    behavioralAnswers: answers,
  });

  return c.json({ data: { voteId: id }, error: null }, 201);
});

// Story 4.3 — Aggregated social status for the calling user (no :userId in URL;
// session is the source of truth). Used by the polling Gap Visualization hook.
social.get('/status', requireSession, async (c) => {
  const userId = c.get('userId');
  const db = withDb(c);

  const { voterCount, latestVotes } = await getSocialStatusForInviter(db, userId);
  let selfTags: string[] = [];
  let friendTags: string[] = [];
  let latestVoterName: string | null = null;
  if (voterCount > 0) {
    friendTags = deriveFriendTags(aggregateFriendAnswers(latestVotes));
    latestVoterName = await getLatestVoterName(db, userId);
  }
  const self = await getLatestTestResultForUser(db, userId);
  if (self) {
    try {
      const parsed = JSON.parse(self.answers) as SelfAnswer[];
      selfTags = deriveSelfTags(parsed);
    } catch {
      // Corrupt answers — render empty self tags instead of crashing.
    }
  }

  const unlocked = await getCompletedPayment(db, userId, 'gap_report');
  // Share-to-unlock: getting FREE_UNLOCK_VOTER_THRESHOLD friends to engage via
  // the shared invite link (each leaves a perception vote) unlocks the Gap
  // Report for free. Otherwise the 25k payment is the fallback.
  const unlockedByShare = voterCount >= FREE_UNLOCK_VOTER_THRESHOLD;

  return c.json({
    data: {
      voterCount,
      latestVoterName,
      latestVotes: latestVotes.map((v) => ({
        id: v.id,
        createdAt: v.created_at,
      })),
      hasUnlockedGapReport: unlockedByShare || unlocked !== null,
      selfTags,
      friendTags,
    },
    error: null,
  });
});

export default social;
