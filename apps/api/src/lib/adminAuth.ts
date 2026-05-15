/**
 * Admin password verification using Web Crypto PBKDF2-SHA256.
 *
 * Why not bcryptjs: deferred-work.md:130 — pure-JS bcrypt at cost 12 takes
 * hundreds of ms and risks the Cloudflare Workers CPU budget. PBKDF2 via the
 * native `crypto.subtle` is Workers-native, dependency-free, and fast.
 *
 * Stored secret format (`ADMIN_PASSWORD_HASH`):
 *   pbkdf2$<iterations>$<saltBase64>$<hashBase64>
 *
 * Generate a hash without leaking the password to shell history:
 *   node apps/api/scripts/hash-admin-password.mjs
 */

const KEY_LEN_BYTES = 32;

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_LEN_BYTES * 8,
  );
  return new Uint8Array(bits);
}

/**
 * Verify a plaintext password against a stored `pbkdf2$iter$salt$hash` string.
 * Returns false (never throws) on any malformed input — deterministic deny.
 */
export async function verifyAdminPassword(
  password: string,
  storedHash: string | undefined,
): Promise<boolean> {
  try {
    if (!storedHash) return false;
    // Secret stores (wrangler / .dev.vars) can introduce surrounding
    // whitespace or a trailing newline; normalize before parsing so a
    // well-formed hash is not rejected on a stray \n.
    const parts = storedHash.trim().split('$');
    if (parts.length !== 4) return false;
    const [scheme, iterStr, saltB64, hashB64] = parts as [
      string,
      string,
      string,
      string,
    ];
    if (scheme !== 'pbkdf2') return false;
    const iterations = Number.parseInt(iterStr, 10);
    if (!Number.isFinite(iterations) || iterations < 1) return false;
    const salt = base64ToBytes(saltB64.replace(/\s/g, ''));
    const expected = base64ToBytes(hashB64.replace(/\s/g, ''));
    const actual = await derive(password, salt, iterations);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Helper used by the offline hash-generation script (not called at runtime).
 * NOTE: Cloudflare Workers' `crypto.subtle` PBKDF2 hard-caps iterations at
 * 100_000 (`NotSupportedError` above that). Do NOT raise this default beyond
 * 100_000 or production verification throws and every login fails.
 */
export async function hashAdminPassword(
  password: string,
  iterations = 100_000,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, iterations);
  return `pbkdf2$${iterations}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`;
}
