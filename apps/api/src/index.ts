import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import type { Bindings, Variables } from './types/bindings';
import { corsMiddleware } from './middleware/cors';
import ssr from './routes/ssr';
import sessions from './routes/sessions';
import tests from './routes/tests';
import insights from './routes/insights';
import og from './routes/og';
import invites from './routes/invites';
import social from './routes/social';
import payments from './routes/payments';
import reports from './routes/reports';
import content from './routes/content';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use('*', corsMiddleware);

// SSR: landing page HTML at GET /
app.route('/', ssr);

// API routes
app.route('/api/sessions', sessions);
app.route('/api/tests', tests);
app.route('/api/results', insights);
app.route('/api/insights', insights);
app.route('/api/og', og);
app.route('/api/invites', invites);
app.route('/api/social', social);
app.route('/api/payments', payments);
app.route('/api/reports', reports);
app.route('/api/content', content);

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
