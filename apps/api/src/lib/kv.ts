export type SessionData = {
  userId: string;
  createdAt: string;
  // Optional so sessions written before Story 2.2 (PATCH /consent) still parse.
  consentAt?: string;
  ageConfirmedAt?: string;
};

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

// --- Admin sessions (Story 7.1) — fully separate keyspace from user sessions ---
export type AdminSessionData = {
  username: string;
  createdAt: string;
};

const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24; // 24h (Story 7.1 AC)
const ADMIN_KEY_PREFIX = 'admin:';

const adminKey = (token: string): string => `${ADMIN_KEY_PREFIX}${token}`;

export async function getAdminSession(
  kv: KVNamespace,
  token: string,
): Promise<AdminSessionData | null> {
  try {
    return await kv.get<AdminSessionData>(adminKey(token), 'json');
  } catch {
    return null;
  }
}

export async function setAdminSession(
  kv: KVNamespace,
  token: string,
  data: AdminSessionData,
): Promise<void> {
  await kv.put(adminKey(token), JSON.stringify(data), {
    expirationTtl: ADMIN_SESSION_TTL_SECONDS,
  });
}

export async function deleteAdminSession(
  kv: KVNamespace,
  token: string,
): Promise<void> {
  await kv.delete(adminKey(token));
}
