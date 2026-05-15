import { describe, it, expect } from 'vitest';
import { hashAdminPassword, verifyAdminPassword } from '../../src/lib/adminAuth';

describe('adminAuth PBKDF2 (Story 7.1)', () => {
  it('verifies a correct password against its generated hash', async () => {
    const hash = await hashAdminPassword('s3cret-pw', 50_000);
    expect(hash.startsWith('pbkdf2$50000$')).toBe(true);
    expect(await verifyAdminPassword('s3cret-pw', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashAdminPassword('correct', 50_000);
    expect(await verifyAdminPassword('wrong', hash)).toBe(false);
  });

  it('default iteration count stays within the Cloudflare Workers PBKDF2 cap (<=100000)', async () => {
    // Workers crypto.subtle throws NotSupportedError above 100000 iterations,
    // which would make every production admin login fail. Guard the default.
    const hash = await hashAdminPassword('pw');
    const iterations = Number(hash.split('$')[1]);
    expect(iterations).toBeLessThanOrEqual(100_000);
    expect(await verifyAdminPassword('pw', hash)).toBe(true);
  });

  it('returns false (never throws) on malformed or missing hash', async () => {
    expect(await verifyAdminPassword('x', undefined)).toBe(false);
    expect(await verifyAdminPassword('x', '')).toBe(false);
    expect(await verifyAdminPassword('x', 'not-a-hash')).toBe(false);
    expect(await verifyAdminPassword('x', 'pbkdf2$abc$bad$bad')).toBe(false);
    expect(await verifyAdminPassword('x', 'bcrypt$12$xyz$abc')).toBe(false);
  });
});
