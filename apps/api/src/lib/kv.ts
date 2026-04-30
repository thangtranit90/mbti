export type SessionData = { userId: string; createdAt: string };

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const SESSION_KEY_PREFIX = 'session:';

const sessionKey = (token: string): string => `${SESSION_KEY_PREFIX}${token}`;

export async function getSession(
  kv: KVNamespace,
  token: string,
): Promise<SessionData | null> {
  try {
    return await kv.get<SessionData>(sessionKey(token), 'json');
  } catch {
    return null;
  }
}

export async function setSession(
  kv: KVNamespace,
  token: string,
  data: SessionData,
): Promise<void> {
  await kv.put(sessionKey(token), JSON.stringify(data), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
}

export async function deleteSession(kv: KVNamespace, token: string): Promise<void> {
  await kv.delete(sessionKey(token));
}
