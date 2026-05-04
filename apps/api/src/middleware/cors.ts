import { cors } from 'hono/cors';

// Env-driven CORS config is deferred — see deferred-work.md.
// For now: localhost (dev) + production domain + default pages.dev fallback.
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://mbti.thanghost.io.vn',
  'https://mbti-web.pages.dev',
];

export const corsMiddleware = cors({
  origin: ALLOWED_ORIGINS,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-Session-Token'],
});
