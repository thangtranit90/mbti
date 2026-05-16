import { describe, it, expect } from 'vitest';
import { app } from '../../src/index';

// Regression: Epic 7 added the `X-Admin-Token` header for all /api/admin/*
// requests. The CORS preflight MUST advertise it in Access-Control-Allow-Headers
// or every admin request from the custom domain is blocked by the browser
// (login still works because it only sends Content-Type).
describe('CORS preflight (Story 7.1)', () => {
  it('allows X-Admin-Token from the production custom domain', async () => {
    const res = await app.request('/api/admin/metrics', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://mbti.thanghost.io.vn',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'x-admin-token',
      },
    });
    const allowed = res.headers.get('access-control-allow-headers') ?? '';
    expect(allowed.toLowerCase()).toContain('x-admin-token');
    expect(res.headers.get('access-control-allow-origin')).toBe(
      'https://mbti.thanghost.io.vn',
    );
  });

  it('still allows X-Session-Token (no regression for user routes)', async () => {
    const res = await app.request('/api/tests/submit', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://mbti.thanghost.io.vn',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'x-session-token',
      },
    });
    const allowed = res.headers.get('access-control-allow-headers') ?? '';
    expect(allowed.toLowerCase()).toContain('x-session-token');
  });
});
