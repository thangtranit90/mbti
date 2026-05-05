import { cors } from 'hono/cors';

// Allow localhost (dev), the project's custom domain, and any Cloudflare Pages
// preview/production subdomain (*.pages.dev covers all branch preview URLs).
function isAllowedOrigin(origin: string): string | null {
  if (
    origin === 'http://localhost:5173' ||
    origin === 'https://mbti.thanghost.io.vn' ||
    origin.endsWith('.pages.dev') ||
    origin.endsWith('.workers.dev')
  ) {
    return origin;
  }
  return null;
}

export const corsMiddleware = cors({
  origin: isAllowedOrigin,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-Session-Token'],
});
