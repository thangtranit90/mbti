#!/usr/bin/env node
// Predeploy guard: rejects placeholder IDs in apps/api/wrangler.toml.
// Story 1.7 AC-5.

import { readFileSync, appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOML_PATH = resolve(__dirname, '..', 'apps', 'api', 'wrangler.toml');
const toml = readFileSync(TOML_PATH, 'utf8');

let errors = 0;
let warnings = 0;

// 1. D1 database_id — must not be all zeros (UUID or bare hex format).
//    Uses matchAll to validate every [[d1_databases]] block, not just the first.
const d1Matches = [...toml.matchAll(/database_id\s*=\s*"([^"]+)"/g)];
if (d1Matches.length === 0) {
  console.error(`✗ ${TOML_PATH}: no [[d1_databases]].database_id found`);
  errors++;
} else {
  for (const m of d1Matches) {
    if (/^0+$|^00000000-0000-0000-0000-000000000000$/.test(m[1])) {
      console.error(
        `✗ ${TOML_PATH}: D1 database_id is a placeholder ("${m[1]}") — ` +
          `run \`wrangler d1 create mbti\` and paste the real id into wrangler.toml.`,
      );
      errors++;
    }
  }
}

// 2. KV id — must not be 32 zero hex or UUID-format zeros.
//    \b before `id` prevents matching `preview_id`.
const kvMatches = [...toml.matchAll(/\[\[kv_namespaces\]\][\s\S]*?\bid\s*=\s*"([^"]+)"/g)];
if (kvMatches.length === 0) {
  console.error(`✗ ${TOML_PATH}: no [[kv_namespaces]].id found`);
  errors++;
} else {
  for (const m of kvMatches) {
    if (/^0+$|^00000000-0000-0000-0000-000000000000$/.test(m[1])) {
      console.error(
        `✗ ${TOML_PATH}: KV id is a placeholder ("${m[1]}") — ` +
          `run \`wrangler kv namespace create <BINDING>\` and paste the real id.`,
      );
      errors++;
    }
  }
}

// 3. RATE_LIMITER namespace_id — round-number "1001" is a known placeholder
//    (Story 1.3 deferred-work). Warning only — first feature story to use
//    rate limiting owns the cleanup.
const rlMatch = toml.match(/\[\[unsafe\.bindings\]\][\s\S]*?namespace_id\s*=\s*"([^"]+)"/);
if (rlMatch && rlMatch[1] === '1001') {
  const msg =
    `RATE_LIMITER namespace_id is the round-number placeholder "1001" — ` +
    `collision risk on the same Cloudflare account. ` +
    `First feature story that wires rate limiting owns the cleanup.`;
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `> ⚠️ **wrangler.toml predeploy guard:** ${msg}\n`);
  }
  console.warn(`⚠ ${TOML_PATH}: ${msg}`);
  warnings++;
}

if (errors > 0) {
  console.error(`\n✗ wrangler.toml predeploy guard: ${errors} error(s).`);
  process.exit(1);
}

console.log(
  `✓ wrangler.toml predeploy guard: 0 errors, ${warnings} warning(s).`,
);
