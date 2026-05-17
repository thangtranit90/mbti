import { Hono } from 'hono';
import type { Bindings, Variables } from '../types/bindings';
import { withDb, getTestResult } from '../lib/db';
import { PERSONA_NAMES, MBTI_TYPES, type MBTIType } from '@mbti/shared';
import { generateOGPng, generateBrandOGPng } from '../lib/og';

const og = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TRANSPARENT_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
  0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44,
  0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d,
  0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
  0x60, 0x82,
]);

function isValidMbtiType(t: unknown): t is MBTIType {
  return typeof t === 'string' && (MBTI_TYPES as readonly string[]).includes(t);
}

// Brand OG card for the homepage (index.html og:image / twitter:image).
// Registered BEFORE /:resultId so "brand" isn't treated as a result id.
og.get('/brand', async (c) => {
  // v2: latin-only font → English copy (Vietnamese rendered as tofu). Bump
  // the key to invalidate any previously cached broken render.
  const key = 'og/brand-v2.png';
  const bucket = c.env.ASSETS_BUCKET;
  try {
    const cached = await bucket.get(key);
    if (
      cached &&
      cached.size > 0 &&
      (cached.httpMetadata?.contentType ?? '').includes('image/png')
    ) {
      return new Response(cached.body, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }
  } catch (e) {
    console.error('brand og r2 get failed:', e);
  }
  try {
    const png = await generateBrandOGPng();
    c.executionCtx.waitUntil(
      bucket
        .put(key, png, { httpMetadata: { contentType: 'image/png' } })
        .catch((e) => console.error('brand og r2 put failed:', e)),
    );
    return new Response(png, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (e) {
    console.error('brand og generation failed:', e);
    return new Response(TRANSPARENT_PNG, {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
    });
  }
});

og.get('/:resultId', async (c) => {
  const resultId = c.req.param('resultId');
  if (!UUID_RE.test(resultId)) {
    return c.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid resultId' } },
      400,
    );
  }
  const key = `og/${resultId.toLowerCase()}.png`;
  const bucket = c.env.ASSETS_BUCKET;

  // Try R2 cache first — but verify the cached object is a valid, non-empty PNG.
  try {
    const cached = await bucket.get(key);
    if (
      cached &&
      cached.size > 0 &&
      (cached.httpMetadata?.contentType ?? '').includes('image/png')
    ) {
      return new Response(cached.body, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
  } catch (e) {
    console.error('og r2 get failed:', e);
  }

  // Fetch test result; 404 if unknown.
  const db = withDb(c);
  const row = await getTestResult(db, resultId);
  if (!row) {
    return c.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Result not found' } },
      404,
    );
  }

  if (!isValidMbtiType(row.calculated_type)) {
    return new Response(TRANSPARENT_PNG, {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
    });
  }

  const mbtiType = row.calculated_type;
  const personaName = PERSONA_NAMES[mbtiType];

  try {
    const png = await generateOGPng(personaName, mbtiType);
    // Cache to R2 (fire-and-forget; surface put errors to logs).
    c.executionCtx.waitUntil(
      bucket
        .put(key, png, { httpMetadata: { contentType: 'image/png' } })
        .catch((e) => console.error('og r2 put failed:', e)),
    );
    return new Response(png, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    console.error('og generation failed:', e);
    return new Response(TRANSPARENT_PNG, {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
    });
  }
});

export default og;
