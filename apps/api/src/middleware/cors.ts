import { cors } from 'hono/cors';

// TODO Story 1.7: read allowed origins from env per environment (dev, staging, prod).
const ALLOWED_ORIGINS = ['http://localhost:5173'];

export const corsMiddleware = cors({
  origin: ALLOWED_ORIGINS,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-Session-Token'],
});
