import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import type { Bindings, Variables } from './types/bindings';
import { corsMiddleware } from './middleware/cors';
import ssr from './routes/ssr';
import sessions from './routes/sessions';
import tests from './routes/tests';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use('*', corsMiddleware);

// SSR: landing page HTML at GET /
app.route('/', ssr);

// API routes
app.route('/api/sessions', sessions);
app.route('/api/tests', tests);

app.get('/api/health', (c) => c.json({ data: { status: 'ok' }, error: null }));

app.notFound((c) => {
  console.warn('Route not found:', c.req.method, c.req.path);
  return c.json(
    { data: null, error: { code: 'NOT_FOUND', message: 'Route not found' } },
    404,
  );
});

app.onError((err, c) => {
  if (err instanceof ZodError) {
    return c.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: err.message } },
      400,
    );
  }
  if (err instanceof HTTPException) {
    return c.json(
      {
        data: null,
        error: { code: `HTTP_${err.status}`, message: err.message },
      },
      err.status,
    );
  }
  console.error('Unexpected error in handler:', err);
  return c.json(
    { data: null, error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } },
    500,
  );
});

export default app;
