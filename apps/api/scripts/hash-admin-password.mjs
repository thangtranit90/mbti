#!/usr/bin/env node
/**
 * Generate an ADMIN_PASSWORD_HASH value (PBKDF2-SHA256) for Story 7.1 admin auth.
 *
 * Usage (does NOT leak the password to shell history):
 *   node apps/api/scripts/hash-admin-password.mjs
 *   # then type the password at the hidden prompt
 *
 * Paste the printed line into apps/api/.dev.vars (local) and set production via:
 *   npx wrangler secret put ADMIN_PASSWORD_HASH   (working dir: apps/api)
 */
import { webcrypto as crypto } from 'node:crypto';
import readline from 'node:readline';

// Cloudflare Workers crypto.subtle PBKDF2 hard-caps iterations at 100_000.
// Generating above this makes production login throw on every attempt.
const ITERATIONS = 100_000;

function readHidden(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const stdout = process.stdout;
    rl._writeToOutput = (s) => {
      if (s.includes('\n') || s.includes('\r')) stdout.write(s);
    };
    rl.question(prompt, (answer) => {
      rl.close();
      stdout.write('\n');
      resolve(answer);
    });
  });
}

function bytesToBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

const password = process.env.ADMIN_PW ?? (await readHidden('Admin password: '));
if (!password) {
  console.error('Empty password — aborted.');
  process.exit(1);
}

const salt = crypto.getRandomValues(new Uint8Array(16));
const keyMaterial = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(password),
  { name: 'PBKDF2' },
  false,
  ['deriveBits'],
);
const bits = await crypto.subtle.deriveBits(
  { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
  keyMaterial,
  256,
);

const hash = `pbkdf2$${ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`;
console.log('\nADMIN_PASSWORD_HASH=' + hash);
